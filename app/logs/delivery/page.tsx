'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Home, Menu, Package, Calendar, CheckCircle, XCircle, Plus, X } from 'lucide-react'
import { SidebarMenu } from '@/components/shared/SidebarMenu'
import { useUser } from '@/hooks/useUser'

interface DeliveryLog {
  id: string
  supplier_name: string
  items_received: string[]
  delivery_time: string
  received_by: string
  temperature_ok: boolean
  packaging_ok: boolean
  quality_ok: boolean
  notes: string | null
  recorded_at: string
}

export default function DeliveryLogsPage() {
  const router = useRouter()
  const { user } = useUser()
  const [logs, setLogs] = useState<DeliveryLog[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [formData, setFormData] = useState({
    supplier_name: '',
    items_received: '',
    received_by: '',
    temperature_ok: true,
    packaging_ok: true,
    quality_ok: true,
    notes: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadLogs()
  }, [])

  const loadLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('delivery_logs')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(100)

      if (error) throw error
      setLogs(data || [])
    } catch (error) {
      console.error('Error loading delivery logs:', error)
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

  const allChecksPass = (log: DeliveryLog) => {
    return log.temperature_ok && log.packaging_ok && log.quality_ok
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setSubmitting(true)
    try {
      const itemsArray = formData.items_received
        .split(',')
        .map(item => item.trim())
        .filter(item => item.length > 0)

      const { error } = await supabase
        .from('delivery_logs')
        .insert({
          supplier_name: formData.supplier_name,
          items_received: itemsArray,
          delivery_time: new Date().toISOString(),
          received_by: formData.received_by,
          temperature_ok: formData.temperature_ok,
          packaging_ok: formData.packaging_ok,
          quality_ok: formData.quality_ok,
          notes: formData.notes || null
        })

      if (error) throw error

      setFormData({
        supplier_name: '',
        items_received: '',
        received_by: '',
        temperature_ok: true,
        packaging_ok: true,
        quality_ok: true,
        notes: ''
      })
      setShowForm(false)
      loadLogs()
    } catch (error) {
      console.error('Error creating delivery log:', error)
      alert('Failed to create delivery log')
    } finally {
      setSubmitting(false)
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
            <Package className="h-6 w-6 text-primary" />
            <h1 className="text-lg font-bold text-foreground">Delivery Logs</h1>
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
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No delivery logs yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className={`rounded-xl p-4 shadow-sm border ${
                  allChecksPass(log) 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-foreground text-lg">
                      {log.supplier_name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(log.recorded_at)}</span>
                    </div>
                  </div>
                  <div>
                    {allChecksPass(log) ? (
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    ) : (
                      <XCircle className="h-8 w-8 text-red-600" />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className={`text-center p-2 rounded-lg ${log.temperature_ok ? 'bg-green-100' : 'bg-red-100'}`}>
                    <div className="text-xs font-semibold">Temperature</div>
                    <div className="text-xs">{log.temperature_ok ? '✓' : '✗'}</div>
                  </div>
                  <div className={`text-center p-2 rounded-lg ${log.packaging_ok ? 'bg-green-100' : 'bg-red-100'}`}>
                    <div className="text-xs font-semibold">Packaging</div>
                    <div className="text-xs">{log.packaging_ok ? '✓' : '✗'}</div>
                  </div>
                  <div className={`text-center p-2 rounded-lg ${log.quality_ok ? 'bg-green-100' : 'bg-red-100'}`}>
                    <div className="text-xs font-semibold">Quality</div>
                    <div className="text-xs">{log.quality_ok ? '✓' : '✗'}</div>
                  </div>
                </div>

                {log.items_received && log.items_received.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-gray-700 mb-1">Items:</p>
                    <div className="flex flex-wrap gap-1">
                      {log.items_received.map((item, idx) => (
                        <span key={idx} className="text-xs bg-white px-2 py-1 rounded border border-gray-200">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

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

      {/* Delivery Log Entry Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Log Delivery</h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-1 hover:bg-muted rounded-xl transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Supplier Name *
                </label>
                <input
                  type="text"
                  value={formData.supplier_name}
                  onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  placeholder="Supplier name"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Items Received *
                </label>
                <textarea
                  value={formData.items_received}
                  onChange={(e) => setFormData({ ...formData, items_received: e.target.value })}
                  required
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
                  placeholder="Comma-separated items (e.g., Milk, Bread, Eggs)"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Received By *
                </label>
                <input
                  type="text"
                  value={formData.received_by}
                  onChange={(e) => setFormData({ ...formData, received_by: e.target.value })}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-3">
                  Quality Checks
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={formData.temperature_ok}
                      onChange={(e) => setFormData({ ...formData, temperature_ok: e.target.checked })}
                      className="w-5 h-5 text-primary rounded focus:ring-2 focus:ring-primary"
                    />
                    <span className="text-sm font-medium">Temperature OK</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={formData.packaging_ok}
                      onChange={(e) => setFormData({ ...formData, packaging_ok: e.target.checked })}
                      className="w-5 h-5 text-primary rounded focus:ring-2 focus:ring-primary"
                    />
                    <span className="text-sm font-medium">Packaging OK</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={formData.quality_ok}
                      onChange={(e) => setFormData({ ...formData, quality_ok: e.target.checked })}
                      className="w-5 h-5 text-primary rounded focus:ring-2 focus:ring-primary"
                    />
                    <span className="text-sm font-medium">Quality OK</span>
                  </label>
                </div>
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
                  placeholder="Additional notes..."
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
                  {submitting ? 'Saving...' : 'Log Delivery'}
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
