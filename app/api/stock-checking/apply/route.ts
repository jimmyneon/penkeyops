import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { session_id } = await request.json()

    if (!session_id) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    // Get all counts for this session
    const { data: counts, error: countsError } = await supabase
      .from('stock_counts')
      .select(`
        *,
        items!inner(*)
      `)
      .eq('session_id', session_id)

    if (countsError) throw countsError

    // Update stock_current for each item
    for (const count of counts || []) {
      const item = (count.items as any)
      
      const updateData: any = {
        updated_at: new Date().toISOString()
      }

      if (item.is_freezer_item) {
        if (count.freezer_count !== null) updateData.freezer_count = count.freezer_count
        if (count.service_count !== null) updateData.service_count = count.service_count
      } else {
        if (count.service_count !== null) updateData.service_count = count.service_count
      }

      await supabase
        .from('stock_current')
        .upsert({
          item_id: count.item_id,
          ...updateData
        }, { onConflict: 'item_id' })
    }

    // Calculate outputs
    const outputs = await calculateOutputs(session_id)

    // Update session status
    await supabase
      .from('stock_sessions')
      .update({ status: 'applied' })
      .eq('session_id', session_id)

    return NextResponse.json({
      success: true,
      ...outputs
    })

  } catch (error: any) {
    console.error('Apply error:', error)
    return NextResponse.json({
      error: error.message || 'Failed to apply stock'
    }, { status: 500 })
  }
}

async function calculateOutputs(sessionId: string) {
  // Get all items with current stock and par levels
  const { data: items } = await supabase
    .from('items')
    .select(`
      *,
      stock_current(freezer_count, service_count)
    `)
    .eq('active', true)

  const tonightPull: any[] = []
  const morningPull: any[] = []
  const prepList: any[] = []
  const orderList: any[] = []
  const bulkPrep: any[] = []

  for (const item of items || []) {
    const current = (item.stock_current as any)?.[0] || { freezer_count: 0, service_count: 0 }
    const freezerCount = current.freezer_count || 0
    const serviceCount = current.service_count || 0

    // Pull lists (for freezer items)
    if (item.is_freezer_item) {
      const pullRequired = Math.max(0, item.service_par_tomorrow - serviceCount)
      const pullQty = Math.min(pullRequired, freezerCount)

      if (pullQty > 0) {
        const pullItem = {
          item_id: item.item_id,
          name: item.name,
          pull_qty: pullQty,
          warning: freezerCount < pullRequired ? 'Insufficient freezer stock' : null
        }

        if (item.pull_timing === 'night_before') {
          tonightPull.push(pullItem)
        } else {
          morningPull.push(pullItem)
        }
      }
    }

    // Prep list
    if (serviceCount < item.service_par_tomorrow) {
      prepList.push({
        item_id: item.item_id,
        name: item.name,
        current: serviceCount,
        target: item.service_par_tomorrow,
        prep_needed: item.service_par_tomorrow - serviceCount
      })
    }

    // Order list
    const totalOnHand = freezerCount + serviceCount
    const orderNeeded = Math.max(0, item.order_par - totalOnHand)
    
    if (orderNeeded > 0) {
      orderList.push({
        item_id: item.item_id,
        name: item.name,
        supplier: item.supplier || 'Unknown',
        order_qty: orderNeeded,
        unit: item.unit
      })
    }

    // Bulk prep triggers
    if (item.is_freezer_item && freezerCount < item.bulk_trigger_level) {
      const batchesNeeded = Math.ceil((item.bulk_trigger_level - freezerCount) / Math.max(1, item.batch_yield))
      bulkPrep.push({
        item_id: item.item_id,
        name: item.name,
        current_freezer: freezerCount,
        trigger_level: item.bulk_trigger_level,
        batches_needed: batchesNeeded,
        batch_yield: item.batch_yield
      })
    }
  }

  // Group orders by supplier
  const ordersBySupplier: Record<string, any[]> = {}
  for (const order of orderList) {
    if (!ordersBySupplier[order.supplier]) {
      ordersBySupplier[order.supplier] = []
    }
    ordersBySupplier[order.supplier].push(order)
  }

  return {
    tonight_pull: tonightPull,
    morning_pull: morningPull,
    prep_list: prepList,
    orders_by_supplier: ordersBySupplier,
    bulk_prep: bulkPrep
  }
}
