import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

const SYSTEM_PROMPT = `You are reading a printed stock-check form for 'Pen-Key Déli-caf'.
Each row contains an item name, an ITEM ID in square brackets like [FRZ_HOG_PORK_PORT], and a handwritten integer in a boxed field labeled 'Count' or 'Freezer'/'Service'.
Return ONLY valid JSON. No markdown. No extra text.

Schema:
{
  "session_id": string,
  "confidence": number,
  "counts": {
     "FREEZER": { [item_id:string]: number },
     "SERVICE": { [item_id:string]: number }
  },
  "row_confidence": {
     "FREEZER": { [item_id:string]: number },
     "SERVICE": { [item_id:string]: number }
  },
  "issues": Array<{ "item_id": string, "bucket": "FREEZER"|"SERVICE", "reason": string }>
}

Rules:
- Extract integers only, no units.
- If blank: issue reason='blank'
- If unclear: row_confidence < 0.7 and issue reason='uncertain'
- If scan quality poor (blur/dark/glare): confidence < 0.5 and include issue with item_id='__SCAN__'
- Do not invent item_ids not present on the sheet.
- For items with both Freezer and Service columns, extract both counts.
- For items with only Count column, put value in SERVICE bucket.`

export async function POST(request: NextRequest) {
  try {
    const { session_id, image_base64 } = await request.json()

    if (!session_id || !image_base64) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Call OpenAI Vision API
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Parse this stock check sheet for session ${session_id}. Return strict JSON only.`
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${image_base64}`
              }
            }
          ]
        }
      ],
      response_format: { type: 'json_object' },
      store: false, // Do NOT store images
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from OpenAI')
    }

    // Parse JSON response
    const parsed = JSON.parse(content)

    // Validate item_ids exist in database
    const { data: validItems } = await supabase
      .from('items')
      .select('item_id')
      .eq('active', true)

    const validItemIds = new Set(validItems?.map(i => i.item_id) || [])

    // Check for invalid item_ids
    const allItemIds = [
      ...Object.keys(parsed.counts.FREEZER || {}),
      ...Object.keys(parsed.counts.SERVICE || {})
    ]

    const invalidIds = allItemIds.filter(id => !validItemIds.has(id))
    if (invalidIds.length > 0) {
      return NextResponse.json({
        error: `Invalid item IDs found: ${invalidIds.join(', ')}. Please rescan.`
      }, { status: 400 })
    }

    // Store counts in database
    const countsToInsert = []

    for (const [itemId, count] of Object.entries(parsed.counts.FREEZER || {})) {
      countsToInsert.push({
        session_id,
        item_id: itemId,
        freezer_count: count as number,
        source: 'scan',
        confidence: parsed.row_confidence.FREEZER?.[itemId] || 1.0
      })
    }

    for (const [itemId, count] of Object.entries(parsed.counts.SERVICE || {})) {
      const existing = countsToInsert.find(c => c.item_id === itemId)
      if (existing) {
        existing.service_count = count as number
      } else {
        countsToInsert.push({
          session_id,
          item_id: itemId,
          service_count: count as number,
          source: 'scan',
          confidence: parsed.row_confidence.SERVICE?.[itemId] || 1.0
        })
      }
    }

    // Upsert counts
    const { error: upsertError } = await supabase
      .from('stock_counts')
      .upsert(countsToInsert, { onConflict: 'session_id,item_id' })

    if (upsertError) throw upsertError

    // Update session status
    await supabase
      .from('stock_sessions')
      .update({ status: 'scanned' })
      .eq('session_id', session_id)

    return NextResponse.json({
      success: true,
      confidence: parsed.confidence,
      issues: parsed.issues,
      counts_parsed: countsToInsert.length
    })

  } catch (error: any) {
    console.error('Scan error:', error)
    return NextResponse.json({
      error: error.message || 'Failed to scan image'
    }, { status: 500 })
  }
}
