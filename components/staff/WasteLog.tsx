'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'

interface WasteLogProps {
  sessionId: string
  userId: string
  onClose: () => void
}

export function WasteLog({ sessionId, userId, onClose }: WasteLogProps) {
  const [itemName, setItemName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState<'expired' | 'damaged' | 'overproduction' | 'other'>('expired')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const data = {
        item_name: itemName,
        quantity,
        reason,
        wasted_at: new Date().toISOString(),
      }

      await supabase.from('log_entries').insert({
        shift_session_id: sessionId,
        log_type: 'waste',
        recorded_by: userId,
        data,
        notes: notes || null,
      })

      alert('Waste logged successfully')
      setItemName('')
      setQuantity('')
      setReason('expired')
      setNotes('')
    } catch (error) {
      console.error('Error logging waste:', error)
      alert('Failed to log waste')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Trash2 className="mr-2 h-5 w-5" />
          Waste Log
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Item Name *
            </label>
            <input
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              required
              className="w-full px-4 py-3 bg-white rounded-xl shadow-sm focus:ring-2 focus:ring-primary outline-none"
              placeholder="What was wasted?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantity *
            </label>
            <input
              type="text"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
              className="w-full px-4 py-3 bg-white rounded-xl shadow-sm focus:ring-2 focus:ring-primary outline-none"
              placeholder="e.g., 2 sandwiches, 500ml milk"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as any)}
              className="w-full px-4 py-3 bg-white rounded-xl shadow-sm focus:ring-2 focus:ring-primary outline-none"
            >
              <option value="expired">Expired / Past Use-By</option>
              <option value="damaged">Damaged / Contaminated</option>
              <option value="overproduction">Overproduction</option>
              <option value="other">Other</option>
            </select>
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
              placeholder="Additional details..."
            />
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Logging...' : 'Log Waste'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
