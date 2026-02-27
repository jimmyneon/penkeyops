'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Package } from 'lucide-react'

interface DeliveryCheckProps {
  sessionId: string
  userId: string
  onClose: () => void
}

export function DeliveryCheck({ sessionId, userId, onClose }: DeliveryCheckProps) {
  const [supplier, setSupplier] = useState('')
  const [temperature, setTemperature] = useState('')
  const [packagingCondition, setPackagingCondition] = useState<'good' | 'acceptable' | 'poor'>('good')
  const [itemsReceived, setItemsReceived] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const data = {
        supplier,
        temperature: temperature ? parseFloat(temperature) : null,
        packaging_condition: packagingCondition,
        items_received: itemsReceived,
        checked_at: new Date().toISOString(),
      }

      await supabase.from('log_entries').insert({
        shift_session_id: sessionId,
        log_type: 'delivery',
        recorded_by: userId,
        data,
        notes: notes || null,
      })

      alert('Delivery check logged successfully')
      onClose()
    } catch (error) {
      console.error('Error logging delivery:', error)
      alert('Failed to log delivery check')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Package className="mr-2 h-5 w-5" />
          Delivery Check
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Supplier *
            </label>
            <input
              type="text"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              required
              className="w-full px-4 py-3 bg-white rounded-xl shadow-sm focus:ring-2 focus:ring-primary outline-none"
              placeholder="Supplier name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Temperature (°C) - if applicable
            </label>
            <input
              type="number"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              className="w-full px-4 py-3 bg-white rounded-xl shadow-sm focus:ring-2 focus:ring-primary outline-none"
              placeholder="Temperature of chilled/frozen items"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Packaging Condition
            </label>
            <select
              value={packagingCondition}
              onChange={(e) => setPackagingCondition(e.target.value as any)}
              className="w-full px-4 py-3 bg-white rounded-xl shadow-sm focus:ring-2 focus:ring-primary outline-none"
            >
              <option value="good">Good</option>
              <option value="acceptable">Acceptable</option>
              <option value="poor">Poor (rejected)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Items Received
            </label>
            <textarea
              value={itemsReceived}
              onChange={(e) => setItemsReceived(e.target.value)}
              className="w-full px-4 py-3 bg-white rounded-xl shadow-sm focus:ring-2 focus:ring-primary outline-none"
              rows={3}
              placeholder="List of items received..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-3 bg-white rounded-xl shadow-sm focus:ring-2 focus:ring-primary outline-none"
              rows={2}
              placeholder="Any additional notes..."
            />
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Logging...' : 'Log Delivery'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
