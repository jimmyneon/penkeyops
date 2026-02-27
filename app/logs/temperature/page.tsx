'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Home, Menu, Thermometer, Calendar, ChevronLeft, ChevronRight, Plus, X } from 'lucide-react'
import { SidebarMenu } from '@/components/shared/SidebarMenu'

interface TemperatureLog {
  id: string
  temperature: number
  notes: string | null
  recorded_at: string
  appliance: {
    name: string
    type: string
  } | null
}

export default function TemperatureLogsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [logs, setLogs] = useState<TemperatureLog[]>([])
  const [loading, setLoading] = useState(true)
  const [showMenu, setShowMenu] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [appliances, setAppliances] = useState<Array<{id: string, name: string, type: string}>>([])
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [timePeriod, setTimePeriod] = useState<'all' | 'morning' | 'afternoon' | 'evening'>('all')
  const [formData, setFormData] = useState({
    appliance_id: '',
    temperature: '',
    notes: ''
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadLogs()
    loadAppliances()
  }, [selectedDate, timePeriod])

  const loadAppliances = async () => {
    try {
      const { data, error } = await supabase
        .from('appliances')
        .select('id, name, type')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setAppliances(data || [])
    } catch (error) {
      console.error('Error loading appliances:', error)
    }
  }

  const loadLogs = async () => {
    setLoading(true)
    try {
      const startOfDay = new Date(selectedDate)
      startOfDay.setHours(0, 0, 0, 0)
      
      const endOfDay = new Date(selectedDate)
      endOfDay.setHours(23, 59, 59, 999)

      const { data, error } = await supabase
        .from('temperature_logs')
        .select(`
          id,
          temperature,
          notes,
          recorded_at,
          appliance:appliances(name, type)
        `)
        .gte('recorded_at', startOfDay.toISOString())
        .lte('recorded_at', endOfDay.toISOString())
        .order('recorded_at', { ascending: false })

      if (error) throw error
      
      let filteredData = data || []
      
      // Filter by time period
      if (timePeriod !== 'all') {
        filteredData = filteredData.filter((log: TemperatureLog) => {
          const hour = new Date(log.recorded_at).getHours()
          if (timePeriod === 'morning') return hour >= 6 && hour < 12
          if (timePeriod === 'afternoon') return hour >= 12 && hour < 18
          if (timePeriod === 'evening') return hour >= 18 || hour < 6
          return true
        })
      }
      
      setLogs(filteredData)
    } catch (error) {
      console.error('Error loading temperature logs:', error)
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

  const formatDisplayDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() - 1)
    setSelectedDate(newDate)
  }

  const goToNextDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + 1)
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    if (newDate <= today) {
      setSelectedDate(newDate)
    }
  }

  const isToday = () => {
    const today = new Date()
    return selectedDate.toDateString() === today.toDateString()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.appliance_id || !formData.temperature) return

    setSubmitting(true)
    try {
      const { error } = await supabase
        .from('temperature_logs')
        .insert({
          appliance_id: formData.appliance_id,
          temperature: parseFloat(formData.temperature),
          notes: formData.notes || null,
          recorded_at: new Date().toISOString()
        })

      if (error) throw error

      setFormData({ appliance_id: '', temperature: '', notes: '' })
      setShowForm(false)
      loadLogs()
    } catch (error) {
      console.error('Error creating temperature log:', error)
      alert('Failed to create temperature log')
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
            <Thermometer className="h-6 w-6 text-primary" />
            <h1 className="text-lg font-bold text-foreground">Temperature Logs</h1>
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
        {/* Date Navigation */}
        <div className="mb-4 bg-card rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={goToPreviousDay}
              className="w-14 h-14 flex items-center justify-center bg-primary text-white rounded-lg hover:opacity-90 transition-all shadow-md"
            >
              <ChevronLeft className="h-7 w-7" />
            </button>
            <div className="text-center flex-1">
              <p className="text-lg font-bold text-foreground">{formatDisplayDate(selectedDate)}</p>
              {isToday() && <p className="text-xs text-primary">Today</p>}
            </div>
            <button
              onClick={goToNextDay}
              disabled={isToday()}
              className="w-14 h-14 flex items-center justify-center bg-primary text-white rounded-lg hover:opacity-90 transition-all shadow-md disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-7 w-7" />
            </button>
          </div>

          {/* Time Period Selector */}
          <div className="flex gap-2">
            <button
              onClick={() => setTimePeriod('all')}
              className={`flex-1 py-3 px-3 rounded-lg text-sm font-bold transition-all shadow-sm ${
                timePeriod === 'all' 
                  ? 'bg-primary text-white shadow-md' 
                  : 'bg-muted text-foreground hover:bg-muted/80'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setTimePeriod('morning')}
              className={`flex-1 py-3 px-3 rounded-lg text-sm font-bold transition-all shadow-sm ${
                timePeriod === 'morning' 
                  ? 'bg-primary text-white shadow-md' 
                  : 'bg-muted text-foreground hover:bg-muted/80'
              }`}
            >
              Morning
            </button>
            <button
              onClick={() => setTimePeriod('afternoon')}
              className={`flex-1 py-3 px-3 rounded-lg text-sm font-bold transition-all shadow-sm ${
                timePeriod === 'afternoon' 
                  ? 'bg-primary text-white shadow-md' 
                  : 'bg-muted text-foreground hover:bg-muted/80'
              }`}
            >
              Afternoon
            </button>
            <button
              onClick={() => setTimePeriod('evening')}
              className={`flex-1 py-3 px-3 rounded-lg text-sm font-bold transition-all shadow-sm ${
                timePeriod === 'evening' 
                  ? 'bg-primary text-white shadow-md' 
                  : 'bg-muted text-foreground hover:bg-muted/80'
              }`}
            >
              Evening
            </button>
          </div>
        </div>


        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12">
            <Thermometer className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No temperature logs yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className={`rounded-xl p-4 shadow-sm border ${
                  log.appliance?.type === 'fridge' 
                    ? 'bg-blue-50 border-blue-200' 
                    : 'bg-cyan-50 border-cyan-200'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-bold text-foreground">
                      {log.appliance?.name || 'Unknown Appliance'}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(log.recorded_at)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-primary">
                      {log.temperature}°C
                    </div>
                  </div>
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

      {/* Add Temperature Log Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-xl font-bold text-foreground">Log Temperature</h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-1 hover:bg-muted rounded-xl transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Appliance *
                </label>
                <select
                  value={formData.appliance_id}
                  onChange={(e) => setFormData({ ...formData, appliance_id: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground"
                >
                  <option value="">Select appliance...</option>
                  {appliances.map((appliance) => (
                    <option key={appliance.id} value={appliance.id}>
                      {appliance.name} ({appliance.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Temperature (°C) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.temperature}
                  onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                  required
                  placeholder="e.g. 4.5"
                  className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Notes (optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any additional notes..."
                  rows={3}
                  className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
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
                  {submitting ? 'Saving...' : 'Log Temperature'}
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
