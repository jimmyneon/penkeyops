'use client'

import { useState, useEffect } from 'react'
import { X, Thermometer } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface TemperatureModalProps {
  taskId: string
  taskTitle: string
  onClose: () => void
  onComplete: () => void
}

interface Appliance {
  id: string
  name: string
  type: string
}

interface ApplianceTemp {
  id: string
  name: string
  type: string
  temperature: string
}

export function TemperatureModal({ taskId, taskTitle, onClose, onComplete }: TemperatureModalProps) {
  const [appliances, setAppliances] = useState<ApplianceTemp[]>([])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadAppliances()
  }, [])

  const loadAppliances = async () => {
    try {
      const { data, error } = await supabase
        .from('appliances')
        .select('id, name, type')
        .eq('is_active', true)
        .order('type, sort_order')

      if (error) throw error

      // Initialize with default temps
      const appliancesWithTemps = (data || []).map(a => ({
        ...a,
        temperature: a.type === 'fridge' ? '4.0' : '-18.0'
      }))

      setAppliances(appliancesWithTemps)
    } catch (error) {
      console.error('Error loading appliances:', error)
    } finally {
      setLoading(false)
    }
  }

  const adjustTemp = (applianceId: string, delta: number) => {
    setAppliances(prev => prev.map(a => {
      if (a.id === applianceId) {
        const num = parseFloat(a.temperature) || 0
        return { ...a, temperature: (num + delta).toFixed(1) }
      }
      return a
    }))
  }

  const handleSubmit = async () => {
    setSaving(true)
    try {
      // Save temperature log for each appliance
      const logs = appliances.map(a => ({
        checklist_result_id: taskId,
        appliance_id: a.id,
        temperature: parseFloat(a.temperature),
        notes: notes || null,
        recorded_at: new Date().toISOString()
      }))

      const { error: logError } = await supabase
        .from('temperature_logs')
        .insert(logs)

      if (logError) throw logError

      // Mark task as complete
      const { error: taskError } = await supabase
        .from('checklist_results')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', taskId)

      if (taskError) throw taskError

      onComplete()
    } catch (error) {
      console.error('Error saving temperature:', error)
      alert('Failed to save temperature log')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-3xl p-8 shadow-2xl">
          <p className="text-foreground">Loading appliances...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl p-4 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Thermometer className="h-6 w-6 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Temperature Check</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded-xl transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-2 mb-4 max-h-[60vh] overflow-y-auto">
          {appliances.map((appliance) => (
            <div 
              key={appliance.id}
              className={`rounded-lg p-3 ${
                appliance.type === 'fridge' ? 'bg-blue-50' : 'bg-cyan-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-700">{appliance.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => adjustTemp(appliance.id, -0.1)}
                  className="w-10 h-10 bg-white hover:bg-gray-50 rounded-lg text-xl font-bold transition-colors flex items-center justify-center shadow-sm flex-shrink-0"
                >
                  −
                </button>
                <div className="w-24 text-center flex-shrink-0">
                  <div className="text-2xl font-bold text-primary">{appliance.temperature}°C</div>
                </div>
                <button
                  type="button"
                  onClick={() => adjustTemp(appliance.id, 0.1)}
                  className="w-10 h-10 bg-white hover:bg-gray-50 rounded-lg text-xl font-bold transition-colors flex items-center justify-center shadow-sm flex-shrink-0"
                >
                  +
                </button>
              </div>
            </div>
          ))}

          <div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (optional)..."
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none text-sm"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 bg-muted text-foreground py-3 rounded-xl text-sm font-bold hover:bg-muted/80 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 bg-primary text-white py-3 rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-lg disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save & Complete'}
          </button>
        </div>
      </div>
    </div>
  )
}
