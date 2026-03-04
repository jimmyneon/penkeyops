'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Edit2, Trash2, Save, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Item {
  id: string
  item_id: string
  name: string
  location: 'freezer' | 'fridge' | 'dry'
  unit: string
  supplier: string | null
  active: boolean
  sort_order: number
  service_par_tomorrow: number
  order_par: number
  freezer_low_threshold: number
  service_low_threshold: number
  bulk_trigger_level: number
  batch_yield: number
  pull_timing: 'night_before' | 'morning'
  is_freezer_item: boolean
}

export default function AdminItemsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Item>>({})
  const [showNewForm, setShowNewForm] = useState(false)

  useEffect(() => {
    loadItems()
  }, [])

  const loadItems = async () => {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error loading items:', error)
      return
    }

    setItems(data || [])
    setLoading(false)
  }

  const startEdit = (item: Item) => {
    setEditingId(item.id)
    setEditForm(item)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({})
  }

  const saveEdit = async () => {
    if (!editingId) return

    const { error } = await supabase
      .from('items')
      .update(editForm)
      .eq('id', editingId)

    if (!error) {
      loadItems()
      cancelEdit()
    }
  }

  const createNew = async () => {
    const { error } = await supabase
      .from('items')
      .insert(editForm)

    if (!error) {
      loadItems()
      setShowNewForm(false)
      setEditForm({})
    }
  }

  const deleteItem = async (id: string) => {
    if (!confirm('Delete this item?')) return

    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', id)

    if (!error) {
      loadItems()
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
            <h1 className="text-lg font-bold">Manage Items</h1>
            <p className="text-xs text-muted-foreground">{items.length} items</p>
          </div>
          <button
            onClick={() => setShowNewForm(true)}
            className="p-2 bg-primary text-white rounded-xl hover:opacity-90 transition-colors"
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>
      </header>

      <main className="p-4 max-w-4xl mx-auto">
        {/* New Item Form */}
        {showNewForm && (
          <div className="bg-card rounded-2xl p-6 mb-4 shadow-lg border-2 border-primary">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">New Item</h2>
              <button onClick={() => setShowNewForm(false)} className="p-2 hover:bg-muted rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>
            <ItemForm form={editForm} setForm={setEditForm} />
            <div className="flex gap-3 mt-4">
              <button
                onClick={createNew}
                className="flex-1 bg-primary text-white py-3 rounded-xl font-medium hover:opacity-90"
              >
                Create Item
              </button>
              <button
                onClick={() => setShowNewForm(false)}
                className="flex-1 bg-muted text-foreground py-3 rounded-xl font-medium hover:bg-muted/80"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Items List */}
        <div className="space-y-3">
          {items.map(item => (
            <div
              key={item.id}
              className={`bg-card rounded-xl p-4 shadow-sm ${!item.active ? 'opacity-50' : ''}`}
            >
              {editingId === item.id ? (
                <>
                  <ItemForm form={editForm} setForm={setEditForm} />
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={saveEdit}
                      className="flex-1 bg-primary text-white py-2 rounded-lg font-medium hover:opacity-90 flex items-center justify-center gap-2"
                    >
                      <Save className="h-4 w-4" />
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="flex-1 bg-muted text-foreground py-2 rounded-lg font-medium hover:bg-muted/80"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-lg">{item.name}</h3>
                      <p className="text-sm text-muted-foreground font-mono">{item.item_id}</p>
                      <div className="flex gap-2 mt-1">
                        <span className="text-xs bg-muted px-2 py-1 rounded capitalize">{item.location}</span>
                        {item.is_freezer_item && (
                          <span className="text-xs bg-blue-500/20 text-blue-600 px-2 py-1 rounded">Freezer Item</span>
                        )}
                        {!item.active && (
                          <span className="text-xs bg-destructive/20 text-destructive px-2 py-1 rounded">Inactive</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(item)}
                        className="p-2 bg-muted rounded-lg hover:bg-muted/80"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="p-2 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Service Par</p>
                      <p className="font-semibold">{item.service_par_tomorrow}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Order Par</p>
                      <p className="font-semibold">{item.order_par}</p>
                    </div>
                    {item.is_freezer_item && (
                      <>
                        <div>
                          <p className="text-muted-foreground">Pull Timing</p>
                          <p className="font-semibold capitalize">{item.pull_timing.replace('_', ' ')}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Batch Yield</p>
                          <p className="font-semibold">{item.batch_yield}</p>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

function ItemForm({ form, setForm }: { form: Partial<Item>, setForm: (f: Partial<Item>) => void }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium mb-1 block">Item ID</label>
          <input
            type="text"
            value={form.item_id || ''}
            onChange={e => setForm({ ...form, item_id: e.target.value })}
            className="w-full px-3 py-2 bg-muted rounded-lg"
            placeholder="FRZ_ITEM_NAME"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Name</label>
          <input
            type="text"
            value={form.name || ''}
            onChange={e => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2 bg-muted rounded-lg"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-sm font-medium mb-1 block">Location</label>
          <select
            value={form.location || 'fridge'}
            onChange={e => setForm({ ...form, location: e.target.value as any })}
            className="w-full px-3 py-2 bg-muted rounded-lg"
          >
            <option value="freezer">Freezer</option>
            <option value="fridge">Fridge</option>
            <option value="dry">Dry</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Unit</label>
          <input
            type="text"
            value={form.unit || ''}
            onChange={e => setForm({ ...form, unit: e.target.value })}
            className="w-full px-3 py-2 bg-muted rounded-lg"
            placeholder="portions"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Supplier</label>
          <input
            type="text"
            value={form.supplier || ''}
            onChange={e => setForm({ ...form, supplier: e.target.value })}
            className="w-full px-3 py-2 bg-muted rounded-lg"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium mb-1 block">Service Par Tomorrow</label>
          <input
            type="number"
            value={form.service_par_tomorrow || 0}
            onChange={e => setForm({ ...form, service_par_tomorrow: parseInt(e.target.value) || 0 })}
            className="w-full px-3 py-2 bg-muted rounded-lg"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Order Par</label>
          <input
            type="number"
            value={form.order_par || 0}
            onChange={e => setForm({ ...form, order_par: parseInt(e.target.value) || 0 })}
            className="w-full px-3 py-2 bg-muted rounded-lg"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.is_freezer_item || false}
            onChange={e => setForm({ ...form, is_freezer_item: e.target.checked })}
            className="w-4 h-4"
          />
          <span className="text-sm font-medium">Freezer Item</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.active !== false}
            onChange={e => setForm({ ...form, active: e.target.checked })}
            className="w-4 h-4"
          />
          <span className="text-sm font-medium">Active</span>
        </label>
      </div>

      {form.is_freezer_item && (
        <div className="grid grid-cols-2 gap-3 p-3 bg-muted/50 rounded-lg">
          <div>
            <label className="text-sm font-medium mb-1 block">Pull Timing</label>
            <select
              value={form.pull_timing || 'morning'}
              onChange={e => setForm({ ...form, pull_timing: e.target.value as any })}
              className="w-full px-3 py-2 bg-background rounded-lg"
            >
              <option value="night_before">Night Before</option>
              <option value="morning">Morning</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Batch Yield</label>
            <input
              type="number"
              value={form.batch_yield || 0}
              onChange={e => setForm({ ...form, batch_yield: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 bg-background rounded-lg"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Freezer Low Threshold</label>
            <input
              type="number"
              value={form.freezer_low_threshold || 0}
              onChange={e => setForm({ ...form, freezer_low_threshold: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 bg-background rounded-lg"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Bulk Trigger Level</label>
            <input
              type="number"
              value={form.bulk_trigger_level || 0}
              onChange={e => setForm({ ...form, bulk_trigger_level: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 bg-background rounded-lg"
            />
          </div>
        </div>
      )}

      <div>
        <label className="text-sm font-medium mb-1 block">Sort Order</label>
        <input
          type="number"
          value={form.sort_order || 0}
          onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
          className="w-full px-3 py-2 bg-muted rounded-lg"
        />
      </div>
    </div>
  )
}
