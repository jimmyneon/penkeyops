'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Home, Menu, Trash2, Calendar, Plus, X } from 'lucide-react'
import { SidebarMenu } from '@/components/shared/SidebarMenu'
import { useUser } from '@/hooks/useUser'

interface WasteLog {
  id: string
  item_name: string
  quantity: number
  unit: string
  reason: string
  notes: string | null
  recorded_at: string
  recorded_by: string
}

interface Item {
  id: string
  name: string
  unit: string
}

export default function WasteLogsPage() {
  const router = useRouter()
  const { user } = useUser()
  const [logs, setLogs] = useState<WasteLog[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [items, setItems] = useState<Item[]>([])
  const [filteredItems, setFilteredItems] = useState<Item[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [formData, setFormData] = useState({
    item_name: '',
    quantity: '',
    unit: 'kg',
    reason: 'expired',
    notes: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadLogs()
    loadItems()
  }, [])

  const loadItems = async () => {
    try {
      const { data, error } = await supabase
        .from('items')
        .select('id, name, unit')
        .order('usage_count', { ascending: false })
        .limit(100)

      if (error) throw error
      setItems(data || [])
    } catch (error) {
      console.error('Error loading items:', error)
    }
  }

  const handleItemNameChange = (value: string) => {
    setFormData({ ...formData, item_name: value })
    
    if (value.length > 0) {
      const filtered = items.filter(item => 
        item.name.toLowerCase().includes(value.toLowerCase())
      )
      setFilteredItems(filtered)
      setShowSuggestions(true)
    } else {
      setShowSuggestions(false)
    }
  }

  const selectItem = (item: Item) => {
    setFormData({ ...formData, item_name: item.name, unit: item.unit })
    setShowSuggestions(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setSubmitting(true)
    try {
      const { error } = await supabase
        .from('waste_logs')
        .insert({
          item_name: formData.item_name,
          quantity: parseFloat(formData.quantity),
          unit: formData.unit,
          reason: formData.reason,
          notes: formData.notes || null,
          recorded_by: user.id
        })

      if (error) throw error

      // Update or create item in items table
      const { data: existingItem } = await supabase
        .from('items')
        .select('id, usage_count')
        .eq('name', formData.item_name)
        .single()

      if (existingItem) {
        await supabase
          .from('items')
          .update({ usage_count: existingItem.usage_count + 1 })
          .eq('id', existingItem.id)
      } else {
        await supabase
          .from('items')
          .insert({
            name: formData.item_name,
            unit: formData.unit,
            usage_count: 1
          })
      }

      setFormData({ item_name: '', quantity: '', unit: 'kg', reason: 'expired', notes: '' })
      setShowForm(false)
      loadLogs()
      loadItems()
    } catch (error) {
      console.error('Error creating waste log:', error)
      alert('Failed to create waste log')
    } finally {
      setSubmitting(false)
    }
  }

  const loadLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('waste_logs')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(100)

      if (error) throw error
      setLogs(data || [])
    } catch (error) {
      console.error('Error loading waste logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getReasonColor = (reason: string) => {
    switch (reason.toLowerCase()) {
      case 'expired':
        return 'bg-red-50 border-red-200'
      case 'damaged':
        return 'bg-orange-50 border-orange-200'
      case 'spoiled':
        return 'bg-yellow-50 border-yellow-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card px-4 py-3 shadow-sm sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowMenu(true)}
            className="p-2 hover:bg-muted rounded-xl transition-colors"
          >
            <Menu className="h-6 w-6 text-foreground" />
          </button>
          <div className="flex items-center gap-2 absolute left-1/2 transform -translate-x-1/2">
            <Trash2 className="h-6 w-6 text-primary" />
            <h1 className="text-lg font-bold text-foreground">Waste Logs</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowForm(true)}
              className="p-2 bg-primary text-white rounded-xl hover:opacity-90 transition-all"
            >
              <Plus className="h-6 w-6" />
            </button>
            <button
              onClick={() => router.push('/')}
              className="p-2 hover:bg-muted rounded-xl transition-colors"
            >
              <Home className="h-6 w-6 text-foreground" />
            </button>
          </div>
        </div>
      </header>

      <main className="p-4 max-w-4xl mx-auto">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12">
            <Trash2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No waste logs yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className={`rounded-xl p-4 shadow-sm border ${getReasonColor(log.reason)}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-bold text-foreground text-lg">
                      {log.item_name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(log.recorded_at)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">
                      {log.quantity} {log.unit}
                    </div>
                  </div>
                </div>
                <div className="mt-2">
                  <span className="inline-block bg-white px-3 py-1 rounded-full text-xs font-semibold text-gray-700 border border-gray-200">
                    {log.reason}
                  </span>
                </div>
                {log.notes && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-sm text-gray-700">{log.notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Waste Log Entry Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Log Waste</h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-1 hover:bg-muted rounded-xl transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Item Name *
                </label>
                <input
                  type="text"
                  value={formData.item_name}
                  onChange={(e) => handleItemNameChange(e.target.value)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  onFocus={() => formData.item_name && setShowSuggestions(true)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  placeholder="Start typing..."
                  autoComplete="off"
                />
                {showSuggestions && filteredItems.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => selectItem(item)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-medium text-sm">{item.name}</div>
                        <div className="text-xs text-muted-foreground">Unit: {item.unit}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Unit *
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  >
                    <option value="kg">kg</option>
                    <option value="L">L</option>
                    <option value="units">units</option>
                    <option value="portions">portions</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Reason *
                </label>
                <select
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                >
                  <option value="expired">Expired</option>
                  <option value="damaged">Damaged</option>
                  <option value="spoiled">Spoiled</option>
                  <option value="overproduction">Overproduction</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Notes (optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
                  placeholder="Additional details..."
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 bg-muted text-foreground py-3 rounded-xl text-sm font-bold hover:bg-muted/80 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-primary text-white py-3 rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-lg disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Log Waste'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <SidebarMenu showMenu={showMenu} setShowMenu={setShowMenu} />
    </div>
  )
}
