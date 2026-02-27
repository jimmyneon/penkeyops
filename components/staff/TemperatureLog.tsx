'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Thermometer } from 'lucide-react'

interface TemperatureLogProps {
  sessionId: string
  userId: string
}

export function TemperatureLog({ sessionId, userId }: TemperatureLogProps) {
  const [logType, setLogType] = useState<'fridge_temp' | 'hot_holding' | 'probe_calibration'>('fridge_temp')
  const [temperature, setTemperature] = useState('')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const data: any = {
        temperature: parseFloat(temperature),
        location,
      }

      if (logType === 'fridge_temp') {
        data.acceptable_range = { min: 0, max: 5 }
        data.is_compliant = parseFloat(temperature) >= 0 && parseFloat(temperature) <= 5
      } else if (logType === 'hot_holding') {
        data.acceptable_range = { min: 63, max: 100 }
        data.is_compliant = parseFloat(temperature) >= 63
      }

      await supabase.from('log_entries').insert({
        shift_session_id: sessionId,
        log_type: logType,
        recorded_by: userId,
        data,
        notes: notes || null,
      })

      setTemperature('')
      setLocation('')
      setNotes('')
      alert('Temperature logged successfully')
    } catch (error) {
      console.error('Error logging temperature:', error)
      alert('Failed to log temperature')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Thermometer className="mr-2 h-5 w-5" />
          Temperature Log
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Log Type
            </label>
            <select
              value={logType}
              onChange={(e) => setLogType(e.target.value as any)}
              className="w-full px-4 py-3 bg-white rounded-xl shadow-sm focus:ring-2 focus:ring-primary outline-none"
            >
              <option value="fridge_temp">Fridge Temperature (0-5°C)</option>
              <option value="hot_holding">Hot Holding (≥63°C)</option>
              <option value="probe_calibration">Probe Calibration</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location / Equipment
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
              className="w-full px-4 py-3 bg-white rounded-xl shadow-sm focus:ring-2 focus:ring-primary outline-none"
              placeholder="e.g., Main fridge, Display cabinet"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Temperature (°C)
            </label>
            <input
              type="number"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              required
              className="w-full px-4 py-3 bg-white rounded-xl shadow-sm focus:ring-2 focus:ring-primary outline-none text-2xl font-semibold text-center"
              placeholder="0.0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-3 bg-white rounded-xl shadow-sm focus:ring-2 focus:ring-primary outline-none"
              rows={2}
              placeholder="Any observations..."
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Logging...' : 'Log Temperature'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
