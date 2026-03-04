'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Moon, Sun, ChefHat, ShoppingCart, AlertTriangle, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'

type Tab = 'tonight' | 'morning' | 'prep' | 'orders' | 'bulk'

export default function ResultsPage() {
  const router = useRouter()
  const params = useParams()
  const sessionId = params.session_id as string
  const supabase = createClient()

  const [activeTab, setActiveTab] = useState<Tab>('tonight')
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadResults()
  }, [])

  const loadResults = async () => {
    const response = await fetch('/api/stock-checking/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId })
    })

    const data = await response.json()
    setResults(data)
    setLoading(false)
  }

  const confirmPull = async (itemId: string, qty: number, timing: 'tonight' | 'morning') => {
    try {
      // Record movement
      const { data: { user } } = await supabase.auth.getUser()
      
      await supabase.from('stock_movements').insert({
        session_id: sessionId,
        item_id: itemId,
        from_bucket: 'freezer',
        to_bucket: 'service',
        qty: qty,
        created_by: user?.id,
        note: `${timing === 'tonight' ? 'Night before' : 'Morning'} pull`
      })

      // Update stock_current
      const { data: current } = await supabase
        .from('stock_current')
        .select('*')
        .eq('item_id', itemId)
        .single()

      if (current) {
        await supabase
          .from('stock_current')
          .update({
            freezer_count: Math.max(0, (current.freezer_count || 0) - qty),
            service_count: (current.service_count || 0) + qty
          })
          .eq('item_id', itemId)
      }

      // Reload results
      loadResults()
    } catch (error) {
      console.error('Error confirming pull:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading results...</p>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'tonight' as Tab, label: 'Tonight', icon: Moon, count: results?.tonight_pull?.length || 0 },
    { id: 'morning' as Tab, label: 'Morning', icon: Sun, count: results?.morning_pull?.length || 0 },
    { id: 'prep' as Tab, label: 'Prep', icon: ChefHat, count: results?.prep_list?.length || 0 },
    { id: 'orders' as Tab, label: 'Orders', icon: ShoppingCart, count: Object.keys(results?.orders_by_supplier || {}).length },
    { id: 'bulk' as Tab, label: 'Bulk Prep', icon: AlertTriangle, count: results?.bulk_prep?.length || 0 },
  ]

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="bg-card px-4 py-3 shadow-sm sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/ops/stock-checking')}
            className="p-2 hover:bg-muted rounded-xl transition-colors"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div className="text-center">
            <h1 className="text-lg font-bold">Stock Check Results</h1>
            <p className="text-xs text-muted-foreground">Session: {sessionId}</p>
          </div>
          <div className="w-10" />
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-card border-b border-border overflow-x-auto">
        <div className="flex gap-1 p-2 min-w-max">
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-primary text-white'
                    : 'bg-muted text-foreground hover:bg-muted/80'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {tab.count > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    activeTab === tab.id ? 'bg-white text-primary' : 'bg-primary text-white'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <main className="p-4 max-w-2xl mx-auto">
        {/* Tonight Pull */}
        {activeTab === 'tonight' && (
          <div className="space-y-3">
            {results?.tonight_pull?.length === 0 ? (
              <div className="bg-card rounded-2xl p-8 text-center">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
                <p className="font-semibold">No items to pull tonight</p>
              </div>
            ) : (
              results?.tonight_pull?.map((item: any) => (
                <div key={item.item_id} className="bg-card rounded-xl p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{item.name}</h3>
                      <p className="text-sm text-muted-foreground">Pull {item.pull_qty} from freezer</p>
                    </div>
                    {item.warning && (
                      <div className="flex items-center gap-1 text-amber-600 text-xs">
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  {item.warning && (
                    <p className="text-xs text-amber-600 mb-3">{item.warning}</p>
                  )}
                  <button
                    onClick={() => confirmPull(item.item_id, item.pull_qty, 'tonight')}
                    className="w-full bg-primary text-white py-2 rounded-lg font-medium hover:opacity-90 transition-all"
                  >
                    Confirm Pulled
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Morning Pull */}
        {activeTab === 'morning' && (
          <div className="space-y-3">
            {results?.morning_pull?.length === 0 ? (
              <div className="bg-card rounded-2xl p-8 text-center">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
                <p className="font-semibold">No items to pull in the morning</p>
              </div>
            ) : (
              results?.morning_pull?.map((item: any) => (
                <div key={item.item_id} className="bg-card rounded-xl p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{item.name}</h3>
                      <p className="text-sm text-muted-foreground">Pull {item.pull_qty} from freezer</p>
                    </div>
                    {item.warning && (
                      <div className="flex items-center gap-1 text-amber-600 text-xs">
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  {item.warning && (
                    <p className="text-xs text-amber-600 mb-3">{item.warning}</p>
                  )}
                  <button
                    onClick={() => confirmPull(item.item_id, item.pull_qty, 'morning')}
                    className="w-full bg-primary text-white py-2 rounded-lg font-medium hover:opacity-90 transition-all"
                  >
                    Confirm Pulled
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Prep List */}
        {activeTab === 'prep' && (
          <div className="space-y-3">
            {results?.prep_list?.length === 0 ? (
              <div className="bg-card rounded-2xl p-8 text-center">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
                <p className="font-semibold">All items at target levels</p>
              </div>
            ) : (
              results?.prep_list?.map((item: any) => (
                <div key={item.item_id} className="bg-card rounded-xl p-4 shadow-sm">
                  <h3 className="font-semibold mb-2">{item.name}</h3>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Current: {item.current}</span>
                    <span className="text-muted-foreground">Target: {item.target}</span>
                  </div>
                  <div className="mt-2 bg-muted rounded-lg p-3">
                    <p className="text-sm font-medium">Prep needed: <span className="text-primary font-bold">+{item.prep_needed}</span></p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Orders */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {Object.keys(results?.orders_by_supplier || {}).length === 0 ? (
              <div className="bg-card rounded-2xl p-8 text-center">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
                <p className="font-semibold">No orders needed</p>
              </div>
            ) : (
              Object.entries(results?.orders_by_supplier || {}).map(([supplier, items]: [string, any]) => (
                <div key={supplier} className="bg-card rounded-xl p-4 shadow-sm">
                  <h3 className="font-bold text-lg mb-3 capitalize">{supplier}</h3>
                  <div className="space-y-2">
                    {items.map((item: any) => (
                      <div key={item.item_id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <span className="font-medium">{item.name}</span>
                        <span className="text-primary font-bold">{item.order_qty} {item.unit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Bulk Prep */}
        {activeTab === 'bulk' && (
          <div className="space-y-3">
            {results?.bulk_prep?.length === 0 ? (
              <div className="bg-card rounded-2xl p-8 text-center">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
                <p className="font-semibold">No bulk prep needed</p>
              </div>
            ) : (
              results?.bulk_prep?.map((item: any) => (
                <div key={item.item_id} className="bg-card rounded-xl p-4 shadow-sm border-2 border-amber-500/50">
                  <div className="flex items-start gap-3 mb-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold">{item.name}</h3>
                      <p className="text-sm text-muted-foreground">Freezer stock low</p>
                    </div>
                  </div>
                  <div className="bg-muted rounded-lg p-3 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Current freezer:</span>
                      <span className="font-medium">{item.current_freezer}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Trigger level:</span>
                      <span className="font-medium">{item.trigger_level}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-border">
                      <span className="font-semibold">Batches needed:</span>
                      <span className="text-primary font-bold">{item.batches_needed} × {item.batch_yield}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  )
}
