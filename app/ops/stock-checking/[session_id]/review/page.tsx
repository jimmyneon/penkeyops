'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, CheckCircle, AlertTriangle, Edit2, Plus, Minus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'

interface StockCount {
  id: string
  item_id: string
  freezer_count: number | null
  service_count: number | null
  confidence: number
  item_name: string
  is_freezer_item: boolean
}

export default function ReviewPage() {
  const router = useRouter()
  const params = useParams()
  const sessionId = params.session_id as string
  const supabase = createClient()

  const [counts, setCounts] = useState<StockCount[]>([])
  const [showFlaggedOnly, setShowFlaggedOnly] = useState(true)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    loadCounts()
  }, [])

  const loadCounts = async () => {
    const { data, error } = await supabase
      .from('stock_counts')
      .select(`
        *,
        items!inner(name, is_freezer_item)
      `)
      .eq('session_id', sessionId)

    if (error) {
      console.error('Error loading counts:', error)
      return
    }

    const formatted = data?.map(d => ({
      id: d.id,
      item_id: d.item_id,
      freezer_count: d.freezer_count,
      service_count: d.service_count,
      confidence: d.confidence || 1.0,
      item_name: (d.items as any).name,
      is_freezer_item: (d.items as any).is_freezer_item
    })) || []

    setCounts(formatted)
    setLoading(false)
  }

  const updateCount = async (id: string, field: 'freezer_count' | 'service_count', value: number) => {
    const { error } = await supabase
      .from('stock_counts')
      .update({ [field]: value })
      .eq('id', id)

    if (!error) {
      setCounts(counts.map(c => c.id === id ? { ...c, [field]: value } : c))
    }
  }

  const applyChanges = async () => {
    setApplying(true)

    try {
      const response = await fetch('/api/stock-checking/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId })
      })

      if (!response.ok) throw new Error('Failed to apply changes')

      router.push(`/ops/stock-checking/${sessionId}/results`)
    } catch (error) {
      console.error('Error applying:', error)
      setApplying(false)
    }
  }

  const flaggedCounts = counts.filter(c => c.confidence < 0.75)
  const displayCounts = showFlaggedOnly ? flaggedCounts : counts

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading counts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="bg-card px-4 py-3 shadow-sm sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/ops/stock-checking')}
            className="p-2 hover:bg-muted rounded-xl transition-colors"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div className="text-center">
            <h1 className="text-lg font-bold">Review Counts</h1>
            <p className="text-xs text-muted-foreground">Session: {sessionId}</p>
          </div>
          <div className="w-10" />
        </div>
      </header>

      <main className="p-4 max-w-2xl mx-auto">
        {/* Summary Card */}
        <div className="bg-card rounded-2xl p-4 mb-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-muted-foreground">Items Scanned</p>
              <p className="text-2xl font-bold">{counts.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Flagged</p>
              <p className="text-2xl font-bold text-amber-600">{flaggedCounts.length}</p>
            </div>
          </div>

          {/* Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowFlaggedOnly(true)}
              className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                showFlaggedOnly ? 'bg-primary text-white' : 'bg-muted text-foreground'
              }`}
            >
              Flagged Only
            </button>
            <button
              onClick={() => setShowFlaggedOnly(false)}
              className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                !showFlaggedOnly ? 'bg-primary text-white' : 'bg-muted text-foreground'
              }`}
            >
              Show All
            </button>
          </div>
        </div>

        {/* Items List */}
        <div className="space-y-3">
          {displayCounts.length === 0 ? (
            <div className="bg-card rounded-2xl p-8 text-center shadow-sm">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
              <p className="font-semibold mb-1">All Clear!</p>
              <p className="text-sm text-muted-foreground">
                {showFlaggedOnly ? 'No flagged items to review.' : 'No items found.'}
              </p>
            </div>
          ) : (
            displayCounts.map(count => (
              <div
                key={count.id}
                className={`bg-card rounded-xl p-4 shadow-sm border-2 ${
                  count.confidence < 0.75 ? 'border-amber-500/50' : 'border-transparent'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold">{count.item_name}</h3>
                    <p className="text-xs text-muted-foreground font-mono">{count.item_id}</p>
                  </div>
                  {count.confidence < 0.75 && (
                    <div className="flex items-center gap-1 text-amber-600 text-xs">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Low confidence</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Freezer Count */}
                  {count.is_freezer_item && (
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Freezer</label>
                      {editingId === count.id ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateCount(count.id, 'freezer_count', Math.max(0, (count.freezer_count || 0) - 1))}
                            className="p-2 bg-muted rounded-lg hover:bg-muted/80"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <input
                            type="number"
                            value={count.freezer_count || 0}
                            onChange={(e) => updateCount(count.id, 'freezer_count', parseInt(e.target.value) || 0)}
                            className="flex-1 px-3 py-2 bg-muted rounded-lg text-center font-bold text-lg"
                            min="0"
                          />
                          <button
                            onClick={() => updateCount(count.id, 'freezer_count', (count.freezer_count || 0) + 1)}
                            className="p-2 bg-muted rounded-lg hover:bg-muted/80"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="text-2xl font-bold">{count.freezer_count || 0}</div>
                      )}
                    </div>
                  )}

                  {/* Service Count */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Service</label>
                    {editingId === count.id ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateCount(count.id, 'service_count', Math.max(0, (count.service_count || 0) - 1))}
                          className="p-2 bg-muted rounded-lg hover:bg-muted/80"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <input
                          type="number"
                          value={count.service_count || 0}
                          onChange={(e) => updateCount(count.id, 'service_count', parseInt(e.target.value) || 0)}
                          className="flex-1 px-3 py-2 bg-muted rounded-lg text-center font-bold text-lg"
                          min="0"
                        />
                        <button
                          onClick={() => updateCount(count.id, 'service_count', (count.service_count || 0) + 1)}
                          className="p-2 bg-muted rounded-lg hover:bg-muted/80"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="text-2xl font-bold">{count.service_count || 0}</div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setEditingId(editingId === count.id ? null : count.id)}
                  className="mt-3 w-full flex items-center justify-center gap-2 py-2 bg-muted rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors"
                >
                  <Edit2 className="h-4 w-4" />
                  {editingId === count.id ? 'Done Editing' : 'Edit Count'}
                </button>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Apply Button - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent">
        <button
          onClick={applyChanges}
          disabled={applying}
          className="w-full max-w-2xl mx-auto bg-primary text-white py-6 rounded-2xl text-xl font-bold shadow-lg hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
        >
          <CheckCircle className="h-6 w-6" />
          {applying ? 'Applying...' : 'Confirm & Apply Stock'}
        </button>
      </div>
    </div>
  )
}
