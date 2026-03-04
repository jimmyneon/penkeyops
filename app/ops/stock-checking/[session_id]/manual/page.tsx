'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Save } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface ManualCount {
  item_id: string
  name: string
  is_freezer_item: boolean
  freezer_count: number
  service_count: number
}

export default function ManualEntryPage() {
  const router = useRouter()
  const params = useParams()
  const sessionId = params.session_id as string
  const supabase = createClient()

  const [items, setItems] = useState<ManualCount[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadItems()
  }, [])

  const loadItems = async () => {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error loading items:', error)
      return
    }

    setItems(data?.map(item => ({
      item_id: item.item_id,
      name: item.name,
      is_freezer_item: item.is_freezer_item,
      freezer_count: 0,
      service_count: 0
    })) || [])

    setLoading(false)
  }

  const updateCount = (itemId: string, field: 'freezer_count' | 'service_count', value: number) => {
    setItems(items.map(item =>
      item.item_id === itemId ? { ...item, [field]: value } : item
    ))
  }

  const saveAll = async () => {
    setSaving(true)

    try {
      const countsToInsert = items.map(item => ({
        session_id: sessionId,
        item_id: item.item_id,
        freezer_count: item.is_freezer_item ? item.freezer_count : null,
        service_count: item.service_count,
        source: 'manual',
        confidence: 1.0
      }))

      const { error } = await supabase
        .from('stock_counts')
        .upsert(countsToInsert, { onConflict: 'session_id,item_id' })

      if (error) throw error

      await supabase
        .from('stock_sessions')
        .update({ status: 'scanned' })
        .eq('session_id', sessionId)

      router.push(`/ops/stock-checking/${sessionId}/review`)
    } catch (error) {
      console.error('Error saving:', error)
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading items...</p>
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
            <h1 className="text-lg font-bold">Manual Entry</h1>
            <p className="text-xs text-muted-foreground">Session: {sessionId}</p>
          </div>
          <div className="w-10" />
        </div>
      </header>

      <main className="p-4 max-w-2xl mx-auto">
        <div className="bg-card rounded-2xl p-4 mb-4 shadow-sm">
          <p className="text-sm text-muted-foreground">
            Enter stock counts manually. This is a fallback if scanning doesn't work.
          </p>
        </div>

        <div className="space-y-3">
          {items.map(item => (
            <div key={item.item_id} className="bg-card rounded-xl p-4 shadow-sm">
              <h3 className="font-semibold mb-3">{item.name}</h3>
              <div className="grid grid-cols-2 gap-3">
                {item.is_freezer_item && (
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Freezer</label>
                    <input
                      type="number"
                      value={item.freezer_count}
                      onChange={e => updateCount(item.item_id, 'freezer_count', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-muted rounded-lg text-center font-bold text-lg"
                      min="0"
                    />
                  </div>
                )}
                <div className={item.is_freezer_item ? '' : 'col-span-2'}>
                  <label className="text-xs text-muted-foreground mb-1 block">Service</label>
                  <input
                    type="number"
                    value={item.service_count}
                    onChange={e => updateCount(item.item_id, 'service_count', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-muted rounded-lg text-center font-bold text-lg"
                    min="0"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Save Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent">
        <button
          onClick={saveAll}
          disabled={saving}
          className="w-full max-w-2xl mx-auto bg-primary text-white py-6 rounded-2xl text-xl font-bold shadow-lg hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
        >
          <Save className="h-6 w-6" />
          {saving ? 'Saving...' : 'Save All Counts'}
        </button>
      </div>
    </div>
  )
}
