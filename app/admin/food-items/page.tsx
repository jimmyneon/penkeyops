'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/hooks/useUser'
import { useAdminSite } from '@/hooks/useAdminSite'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Edit, Trash2, Upload, Download } from 'lucide-react'
import { AdminNav } from '@/components/admin/AdminNav'
import { ImportResultsModal } from '@/components/admin/ImportResultsModal'
import { AddFoodItemModal } from '@/components/admin/AddFoodItemModal'

interface FoodItem {
  id: string
  name: string
  category: string | null
  unit: string
  usage_count: number
  is_active: boolean
}

export default function FoodItemsPage() {
  const { user, profile, loading: userLoading, isAdmin } = useUser()
  const { selectedSiteId } = useAdminSite()
  const router = useRouter()
  const [items, setItems] = useState<FoodItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [importing, setImporting] = useState(false)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [bulkCategory, setBulkCategory] = useState('')
  const [bulkUnit, setBulkUnit] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [importResults, setImportResults] = useState<{
    success: Array<{ name: string; category: string; unit: string }>
    failed: Array<{ line: number; data: string; error: string }>
    skipped: Array<{ line: number; reason: string }>
    totalLines: number
  } | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadItems()
  }, [])

  const loadItems = async () => {
    console.log('Food Items: Loading all items')
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('usage_count', { ascending: false })

      if (error) {
        console.error('Food Items: Query error:', error)
      } else {
        console.log('Food Items: Loaded', data?.length || 0, 'items')
      }

      setItems(data || [])
      setLoading(false)
    } catch (error) {
      console.error('Food Items: Error loading:', error)
      setLoading(false)
    }
  }

  const addNewItem = async (itemData: {
    name: string
    category: string
    unit: string
    is_active: boolean
  }) => {
    // @ts-ignore - Supabase type inference issue
    const { data, error } = await supabase
      .from('items')
      .insert(itemData)
      .select()
      .single()

    if (error) {
      console.error('Add item error:', error)
      alert(`Failed to add item: ${error.message}`)
      return
    }

    if (data) {
      setItems([data, ...items])
      setShowAddModal(false)
      alert(`✅ Successfully added "${(data as any).name}"`)
    }
  }

  const deleteItem = async (itemId: string) => {
    if (!confirm('Delete this item?')) return

    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', itemId)

    if (error) {
      console.error('Delete error:', error)
      alert(`Failed to delete item: ${error.message}`)
      return
    }

    // Immediately remove from UI
    setItems(items.filter(item => item.id !== itemId))
    setSelectedItems(prev => {
      const next = new Set(prev)
      next.delete(itemId)
      return next
    })
    alert('✅ Item deleted successfully')
  }

  const bulkDelete = async () => {
    if (selectedItems.size === 0) return
    if (!confirm(`Delete ${selectedItems.size} items?`)) return

    const itemIds = Array.from(selectedItems)
    const { error } = await supabase
      .from('items')
      .delete()
      .in('id', itemIds)

    if (error) {
      alert(`Failed to delete items: ${error.message}`)
      return
    }

    setItems(items.filter(item => !selectedItems.has(item.id)))
    setSelectedItems(new Set())
    alert(`✅ Successfully deleted ${itemIds.length} items`)
  }

  const bulkUpdateCategory = async () => {
    if (selectedItems.size === 0 || !bulkCategory) return

    const itemIds = Array.from(selectedItems)
    // @ts-ignore - Supabase type inference issue
    const { error } = await supabase
      .from('items')
      .update({ category: bulkCategory })
      .in('id', itemIds)

    if (error) {
      alert(`Failed to update category: ${error.message}`)
      return
    }

    loadItems()
    setSelectedItems(new Set())
    setBulkCategory('')
    alert(`✅ Updated category for ${itemIds.length} items`)
  }

  const bulkUpdateUnit = async () => {
    if (selectedItems.size === 0 || !bulkUnit) return

    const itemIds = Array.from(selectedItems)
    // @ts-ignore - Supabase type inference issue
    const { error } = await supabase
      .from('items')
      .update({ unit: bulkUnit })
      .in('id', itemIds)

    if (error) {
      alert(`Failed to update unit: ${error.message}`)
      return
    }

    loadItems()
    setSelectedItems(new Set())
    setBulkUnit('')
    alert(`✅ Updated unit for ${itemIds.length} items`)
  }

  const toggleSelectAll = () => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(filteredItems.map(item => item.id)))
    }
  }

  const toggleSelectItem = (itemId: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev)
      if (next.has(itemId)) {
        next.delete(itemId)
      } else {
        next.add(itemId)
      }
      return next
    })
  }

  const handleMenuImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    console.log('Starting import for file:', file.name)

    setImporting(true)
    const results = {
      success: [] as Array<{ name: string; category: string; unit: string }>,
      failed: [] as Array<{ line: number; data: string; error: string }>,
      skipped: [] as Array<{ line: number; reason: string }>,
      totalLines: 0
    }

    try {
      const text = await file.text()
      console.log('File content loaded, length:', text.length)
      const lines = text.split('\n').filter(l => l.trim())
      results.totalLines = lines.length
      console.log('Total non-empty lines:', lines.length)

      // Detect format: check if first line has many columns (menu format) or few (simple format)
      const firstLine = lines[0]
      const firstParts = firstLine.split(',')
      const isMenuFormat = firstParts.length >= 4 // category,name,description,price,type...
      
      console.log('Detected format:', isMenuFormat ? 'Menu (category,name,desc,price)' : 'Simple (name,category,unit)')

      // Process each line individually to handle duplicates gracefully
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        const lineNum = i + 1
        
        // Split but preserve quoted fields
        const parts = line.match(/(?:"([^"]*)"|([^,]+))(?:,|$)/g)?.map(p => 
          p.replace(/^"(.*)",$/, '$1').replace(/,$/, '').trim()
        ) || []
        
        let name: string
        let category: string
        let unit: string

        if (isMenuFormat) {
          // Format: category, name, description, price, type, tags
          const [cat, itemName] = parts
          
          // Skip if no item name (just category header)
          if (!itemName || itemName === '') {
            results.skipped.push({ line: lineNum, reason: 'Category header (no item name)' })
            continue
          }
          
          name = itemName
          category = cat || 'Menu Item'
          unit = 'portion'
        } else {
          // Simple format: name, category, unit
          const [itemName, cat, u] = parts
          
          // Skip header row
          if (itemName && itemName.toLowerCase() === 'name' && lineNum === 1) {
            results.skipped.push({ line: lineNum, reason: 'Header row' })
            continue
          }
          
          name = itemName
          category = cat || 'Menu Item'
          unit = u || 'portion'
        }

        // Validate name
        if (!name || name === '') {
          results.failed.push({
            line: lineNum,
            data: line,
            error: 'Missing item name'
          })
          continue
        }

        // Try to insert each item individually
        const item = {
          name,
          category,
          unit
        }

        // @ts-ignore - Supabase type inference issue
        const { data, error } = await supabase
          .from('items')
          .insert(item)
          .select()
          .single()

        if (error) {
          if (error.code === '23505') {
            results.failed.push({
              line: lineNum,
              data: line,
              error: `Duplicate: "${name}" already exists`
            })
          } else {
            results.failed.push({
              line: lineNum,
              data: line,
              error: error.message
            })
          }
        } else if (data) {
          results.success.push({
            name: (data as any).name,
            category: (data as any).category,
            unit: (data as any).unit
          })
        }
      }

      console.log('Import complete:', results)
      loadItems()

      console.log('Final results:', results)
      setImportResults(results)
    } catch (error) {
      console.error('Import error:', error)
      results.failed.push({
        line: 0,
        data: 'File error',
        error: 'Failed to read file. Please check the file format.'
      })
      setImportResults(results)
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  const exportItems = () => {
    const csv = ['name,category,unit,usage_count']
    items.forEach(item => {
      csv.push(`${item.name},${item.category || ''},${item.unit},${item.usage_count}`)
    })

    const blob = new Blob([csv.join('\n')], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `food-items-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user || !profile || !isAdmin) {
    router.push('/')
    return null
  }

  return (
    <div className="min-h-screen pb-20 bg-gray-50">
      <AdminNav title="Food Items Database" userName={profile?.full_name} />

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="py-4">
            <h3 className="font-semibold text-navy mb-2">🥬 Food Items Database (Ingredients)</h3>
            <p className="text-sm text-gray-700 mb-2">
              This database stores <strong>raw ingredients and supplies</strong> used in your cafe for wastage tracking and delivery logging.
            </p>
            <div className="text-sm text-gray-700 bg-white p-3 rounded border border-blue-300">
              <p className="font-semibold mb-1">⚠️ Important: This is for INGREDIENTS, not menu items</p>
              <p className="text-xs mb-2">
                <strong>Food Items:</strong> Chicken breast, Tomatoes, Milk, Flour, Eggs<br />
                <strong>NOT Menu Items:</strong> BLT Sandwich, Chicken Club, Latte
              </p>
              <p className="text-xs">
                <strong>Import:</strong> Upload CSV with ingredients (format: name,category,unit)<br />
                <strong>Export:</strong> Download all ingredients as CSV
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <div className="flex gap-4 mb-4">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search items..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
              />
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="h-5 w-5 mr-2" />
                Add Item
              </Button>
              <Button disabled={importing} onClick={() => document.getElementById('menu-import')?.click()}>
                <Upload className="h-5 w-5 mr-2" />
                {importing ? 'Importing...' : 'Import Ingredients CSV'}
              </Button>
              <input
                id="menu-import"
                type="file"
                accept=".csv,.txt"
                onChange={handleMenuImport}
                className="hidden"
                disabled={importing}
              />
              <Button variant="outline" onClick={exportItems}>
                <Download className="h-5 w-5 mr-2" />
                Export CSV
              </Button>
            </div>

            {selectedItems.size > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="font-semibold text-navy">
                    {selectedItems.size} item{selectedItems.size > 1 ? 's' : ''} selected
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="New category"
                      value={bulkCategory}
                      onChange={(e) => setBulkCategory(e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded text-sm"
                    />
                    <Button size="sm" onClick={bulkUpdateCategory} disabled={!bulkCategory}>
                      Set Category
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="New unit"
                      value={bulkUnit}
                      onChange={(e) => setBulkUnit(e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded text-sm"
                    />
                    <Button size="sm" onClick={bulkUpdateUnit} disabled={!bulkUnit}>
                      Set Unit
                    </Button>
                  </div>

                  <Button size="sm" variant="outline" onClick={bulkDelete}>
                    Delete Selected
                  </Button>
                  
                  <Button size="sm" variant="outline" onClick={() => setSelectedItems(new Set())}>
                    Clear Selection
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Import Format</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-2">
              Upload a CSV or text file with one item per line. Format: <code className="bg-gray-100 px-2 py-1 rounded">name,category,unit</code>
            </p>
            <p className="text-xs text-gray-500">
              Example: <code className="bg-gray-100 px-2 py-1 rounded">Cappuccino,Beverages,cup</code>
            </p>
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading items...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-gray-500 mb-4">No items found</p>
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="h-5 w-5 mr-2" />
                Add First Item
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div>
            <div className="mb-4 flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedItems.size === filteredItems.length && filteredItems.length > 0}
                onChange={toggleSelectAll}
                className="h-4 w-4"
              />
              <span className="text-sm text-gray-600">
                Select All ({filteredItems.length} items)
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredItems.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  isEditing={editingItem === item.id}
                  isSelected={selectedItems.has(item.id)}
                  onToggleSelect={() => toggleSelectItem(item.id)}
                  onEdit={() => setEditingItem(item.id)}
                  onSave={async (updated) => {
                    // @ts-ignore - Supabase type inference issue
                    const { error } = await supabase
                      .from('items')
                      .update(updated)
                      .eq('id', item.id)
                    
                    if (error) {
                      alert(`❌ Failed to save: ${error.message}`)
                      return
                    }
                    
                    setEditingItem(null)
                    loadItems()
                    alert('✅ Item saved successfully')
                  }}
                  onDelete={() => deleteItem(item.id)}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {importResults && (
        <ImportResultsModal
          results={importResults}
          onClose={() => setImportResults(null)}
        />
      )}

      {showAddModal && (
        <AddFoodItemModal
          onClose={() => setShowAddModal(false)}
          onSave={addNewItem}
        />
      )}
    </div>
  )
}

interface ItemCardProps {
  item: FoodItem
  isEditing: boolean
  isSelected: boolean
  onToggleSelect: () => void
  onEdit: () => void
  onSave: (updated: Partial<FoodItem>) => void
  onDelete: () => void
}

function ItemCard({ item, isEditing, isSelected, onToggleSelect, onEdit, onSave, onDelete }: ItemCardProps) {
  const [formData, setFormData] = useState(item)

  useEffect(() => {
    setFormData(item)
  }, [item])

  if (isEditing) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggleSelect}
              className="mt-1 h-4 w-4"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="flex-1">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Category</label>
                    <input
                      type="text"
                      value={formData.category || ''}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Unit</label>
                    <input
                      type="text"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                  />
                  <label className="text-sm font-medium">Active</label>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={onEdit}>Cancel</Button>
                  <Button size="sm" onClick={() => onSave(formData)}>Save</Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`hover:shadow-md transition-shadow ${isSelected ? 'ring-2 ring-orange-400' : ''}`}>
      <CardContent className="py-3">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            className="mt-1 h-4 w-4"
          />
          <div className="flex-1 flex items-start justify-between">
            <div className="flex-1">
            <h3 className="font-medium text-navy">{item.name}</h3>
            <div className="flex gap-2 mt-1">
              {item.category && (
                <span className="px-2 py-0.5 bg-teal-50 text-teal-700 text-xs rounded">
                  {item.category}
                </span>
              )}
              <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
                {item.unit}
              </span>
              {!item.is_active && (
                <span className="px-2 py-0.5 bg-red-50 text-red-700 text-xs rounded">
                  Inactive
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">Used {item.usage_count} times</p>
          </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={onDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
