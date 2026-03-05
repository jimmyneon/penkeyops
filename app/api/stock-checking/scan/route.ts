import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const getOpenAIClient = () => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is not set')
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
}

const SYSTEM_PROMPT = `You are reading a printed stock-check form for 'Penki Ops - Daily Stock Check'.
Each row has a NUMBER (1, 2, 3...), an item name, and handwritten counts in boxes labeled 'F:' (Freezer), 'S:' (Service), or 'Qty:'.
Return ONLY valid JSON. No markdown. No extra text.

Schema:
{
  "session_id": string,
  "confidence": number,
  "counts": {
     "FREEZER": { [item_number:string]: number },
     "SERVICE": { [item_number:string]: number }
  },
  "row_confidence": {
     "FREEZER": { [item_number:string]: number },
     "SERVICE": { [item_number:string]: number }
  },
  "issues": Array<{ "item_number": string, "bucket": "FREEZER"|"SERVICE", "reason": string }>
}

Rules:
- Use the item NUMBER (1, 2, 3...) as the key, not the item name
- Extract integers only from handwritten boxes
- If blank: issue reason='blank'
- If unclear: row_confidence < 0.7 and issue reason='uncertain'
- If scan quality poor: confidence < 0.5 and include issue with item_number='0'
- For items with F: and S: boxes, extract both counts
- For items with only Qty: box, put value in SERVICE bucket`

export async function POST(request: NextRequest) {
  try {
    const { session_id, image_base64 } = await request.json()

    if (!session_id || !image_base64) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get items in same order as PDF (sorted by sort_order)
    const { data: items } = await supabase
      .from('items')
      .select('item_id, name, location')
      .eq('active', true)
      .order('sort_order', { ascending: true })

    if (!items || items.length === 0) {
      return NextResponse.json({
        error: 'No active items found in database'
      }, { status: 400 })
    }

    // Build item list for prompt
    const itemList = items.map((item, index) => 
      `${index + 1}. ${item.name} (${item.location})`
    ).join('\n')

    // Call OpenAI Vision API with full item context
    const openai = getOpenAIClient()
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
              text: `Parse this stock check sheet for session ${session_id}.

EXPECTED ITEMS (in order):
${itemList}

Match the handwritten counts to these item numbers. Return strict JSON only.`
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

    // Create mapping: item number (1,2,3...) -> item_id
    const numberToItemId: { [key: string]: string } = {}
    items.forEach((item, index) => {
      numberToItemId[(index + 1).toString()] = item.item_id
    })

    // Map item numbers to item_ids
    const countsToInsert = []

    for (const [itemNumber, count] of Object.entries(parsed.counts.FREEZER || {})) {
      const itemId = numberToItemId[itemNumber]
      if (!itemId) {
        console.warn(`Unknown item number: ${itemNumber}`)
        continue
      }
      countsToInsert.push({
        session_id,
        item_id: itemId,
        freezer_count: count as number,
        source: 'scan',
        confidence: parsed.row_confidence.FREEZER?.[itemNumber] || 1.0
      })
    }

    for (const [itemNumber, count] of Object.entries(parsed.counts.SERVICE || {})) {
      const itemId = numberToItemId[itemNumber]
      if (!itemId) {
        console.warn(`Unknown item number: ${itemNumber}`)
        continue
      }
      const existing = countsToInsert.find(c => c.item_id === itemId)
      if (existing) {
        existing.service_count = count as number
      } else {
        countsToInsert.push({
          session_id,
          item_id: itemId,
          service_count: count as number,
          source: 'scan',
          confidence: parsed.row_confidence.SERVICE?.[itemNumber] || 1.0
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
