'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface AddFoodItemModalProps {
  onClose: () => void
  onSave: (itemData: {
    name: string
    category: string
    unit: string
    is_active: boolean
  }) => void
}

export function AddFoodItemModal({ onClose, onSave }: AddFoodItemModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    unit: 'kg',
    is_active: true
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      alert('Item name is required')
      return
    }

    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold text-navy">Add Food Item</CardTitle>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Item Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                placeholder="e.g., Chicken Breast, Tomatoes, Milk"
                required
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-1">
                The name of the raw ingredient or supply item
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                  placeholder="e.g., Protein, Dairy, Vegetables"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Optional - helps organize items
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit *
                </label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                  required
                >
                  <option value="kg">Kilograms (kg)</option>
                  <option value="g">Grams (g)</option>
                  <option value="litre">Litres (litre)</option>
                  <option value="ml">Millilitres (ml)</option>
                  <option value="portion">Portions (portion)</option>
                  <option value="unit">Units (unit)</option>
                  <option value="dozen">Dozen (dozen)</option>
                  <option value="box">Box (box)</option>
                  <option value="bag">Bag (bag)</option>
                  <option value="jar">Jar (jar)</option>
                  <option value="tin">Tin (tin)</option>
                  <option value="bottle">Bottle (bottle)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  How this item is measured
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                Active (available for use)
              </label>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-gray-700">
                <strong>💡 Tip:</strong> This is for raw ingredients and supplies, not menu items.
                For example, add "Chicken Breast" not "Chicken Club Sandwich".
              </p>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                Add Item
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
