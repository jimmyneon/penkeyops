'use client'

import { useState, useEffect } from 'react'
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
  const [foodItems, setFoodItems] = useState<Array<{ id: string; name: string; unit: string }>>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [filteredItems, setFilteredItems] = useState<Array<{ id: string; name: string; unit: string }>>([])
  const supabase = createClient()

  useEffect(() => {
    loadFoodItems()
  }, [])

  const loadFoodItems = async () => {
    const { data } = await supabase
      .from('items')
      .select('id, name, unit')
      .eq('is_active', true)
      .order('usage_count', { ascending: false })
    
    if (data) {
      setFoodItems(data)
    }
  }

  const handleItemNameChange = (value: string) => {
    setItemName(value)
    
    if (value.length > 0) {
      const filtered = foodItems.filter(item => 
        item.name.toLowerCase().includes(value.toLowerCase())
      )
      setFilteredItems(filtered)
      setShowSuggestions(filtered.length > 0)
    } else {
      setShowSuggestions(false)
    }
  }

  const selectItem = (item: { name: string; unit: string }) => {
    setItemName(item.name)
    setShowSuggestions(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Check if item exists in food items database
      const existingItem = foodItems.find(
        item => item.name.toLowerCase() === itemName.toLowerCase()
      )

      // If item doesn't exist, add it to the database
      if (!existingItem) {
        console.log('Creating new food item:', itemName)
        const { data: newItem, error: createError } = await supabase
          .from('items')
          .insert({
            name: itemName,
            category: 'Wastage',
            unit: 'portion',
            is_active: true
          })
          .select()
          .single()

        if (!createError && newItem) {
          console.log('New food item created:', newItem)
          // Reload food items for next time
          loadFoodItems()
        }
      }

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

      alert('✅ Waste logged successfully')
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
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Item Name *
            </label>
            <input
              type="text"
              value={itemName}
              onChange={(e) => handleItemNameChange(e.target.value)}
              onFocus={() => itemName && setShowSuggestions(filteredItems.length > 0)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              required
              className="w-full px-4 py-3 bg-white rounded-xl shadow-sm focus:ring-2 focus:ring-primary outline-none"
              placeholder="Start typing... (e.g., Chicken, Milk)"
              autoComplete="off"
            />
            {showSuggestions && filteredItems.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectItem(item)}
                    className="w-full px-4 py-2 text-left hover:bg-orange-50 flex items-center justify-between"
                  >
                    <span className="font-medium text-gray-900">{item.name}</span>
                    <span className="text-xs text-gray-500">{item.unit}</span>
                  </button>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">
              💡 Type to search existing items, or enter a new one to add it automatically
            </p>
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
