import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    console.log('Testing items table access...')
    
    // Test query
    const { data: items, error } = await supabase
      .from('items')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true })

    console.log('Query result:', { itemCount: items?.length, error })

    if (error) {
      return NextResponse.json({ 
        success: false,
        error: error.message,
        details: error
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      itemCount: items?.length || 0,
      items: items || []
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
