'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, Save, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Appliance {
  id: string
  name: string
  type: 'fridge' | 'freezer'
  is_active: boolean
  sort_order: number
}

export function ApplianceManager() {
  const [appliances, setAppliances] = useState<Appliance[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [newAppliance, setNewAppliance] = useState({ name: '', type: 'fridge' as 'fridge' | 'freezer' })
  const [showAdd, setShowAdd] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadAppliances()
  }, [])

  const loadAppliances = async () => {
    try {
      const { data, error } = await supabase
        .from('appliances')
        .select('*')
        .order('type')
        .order('sort_order')

      if (error) throw error
      setAppliances(data || [])
    } catch (error) {
      console.error('Error loading appliances:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!newAppliance.name.trim()) return

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('site_id')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single()

      if (!profile?.site_id) return

      const maxOrder = Math.max(...appliances.filter(a => a.type === newAppliance.type).map(a => a.sort_order), 0)

      const { error } = await supabase
        .from('appliances')
        .insert({
          site_id: profile.site_id,
          name: newAppliance.name,
          type: newAppliance.type,
          sort_order: maxOrder + 1
        })

      if (error) throw error

      setNewAppliance({ name: '', type: 'fridge' })
      setShowAdd(false)
      loadAppliances()
    } catch (error) {
      console.error('Error adding appliance:', error)
      alert('Failed to add appliance')
    }
  }

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return

    try {
      const { error } = await supabase
        .from('appliances')
        .update({ name: editName })
        .eq('id', id)

      if (error) throw error

      setEditingId(null)
      setEditName('')
      loadAppliances()
    } catch (error) {
      console.error('Error updating appliance:', error)
      alert('Failed to update appliance')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this appliance?')) return

    try {
      const { error } = await supabase
        .from('appliances')
        .delete()
        .eq('id', id)

      if (error) throw error
      loadAppliances()
    } catch (error) {
      console.error('Error deleting appliance:', error)
      alert('Failed to delete appliance')
    }
  }

  const toggleActive = async (id: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from('appliances')
        .update({ is_active: !currentActive })
        .eq('id', id)

      if (error) throw error
      loadAppliances()
    } catch (error) {
      console.error('Error toggling appliance:', error)
    }
  }

  if (loading) {
    return <div className="p-4">Loading appliances...</div>
  }

  const fridges = appliances.filter(a => a.type === 'fridge')
  const freezers = appliances.filter(a => a.type === 'freezer')

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-foreground">Appliance Management</h2>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl font-medium hover:opacity-90 transition-all"
        >
          <Plus className="h-5 w-5" />
          Add Appliance
        </button>
      </div>

      {showAdd && (
        <div className="bg-muted rounded-xl p-4 mb-6">
          <h3 className="font-semibold mb-3">New Appliance</h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={newAppliance.name}
              onChange={(e) => setNewAppliance({ ...newAppliance, name: e.target.value })}
              placeholder="Appliance name"
              className="flex-1 px-3 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-primary"
            />
            <select
              value={newAppliance.type}
              onChange={(e) => setNewAppliance({ ...newAppliance, type: e.target.value as 'fridge' | 'freezer' })}
              className="px-3 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="fridge">Fridge</option>
              <option value="freezer">Freezer</option>
            </select>
            <button
              onClick={handleAdd}
              className="bg-primary text-white px-4 py-2 rounded-lg font-medium hover:opacity-90"
            >
              Add
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="bg-muted text-foreground px-4 py-2 rounded-lg font-medium hover:bg-muted/80"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Fridges */}
        <div>
          <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            Fridges ({fridges.length})
          </h3>
          <div className="space-y-2">
            {fridges.map((appliance) => (
              <div
                key={appliance.id}
                className={`bg-white rounded-xl p-3 border ${appliance.is_active ? 'border-gray-200' : 'border-gray-300 opacity-50'}`}
              >
                {editingId === appliance.id ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 px-2 py-1 rounded border border-gray-200 outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button onClick={() => handleUpdate(appliance.id)} className="p-1 hover:bg-muted rounded">
                      <Save className="h-4 w-4 text-green-600" />
                    </button>
                    <button onClick={() => setEditingId(null)} className="p-1 hover:bg-muted rounded">
                      <X className="h-4 w-4 text-gray-600" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{appliance.name}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleActive(appliance.id, appliance.is_active)}
                        className={`text-xs px-2 py-1 rounded ${appliance.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}
                      >
                        {appliance.is_active ? 'Active' : 'Inactive'}
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(appliance.id)
                          setEditName(appliance.name)
                        }}
                        className="p-1 hover:bg-muted rounded"
                      >
                        <Edit2 className="h-4 w-4 text-gray-600" />
                      </button>
                      <button onClick={() => handleDelete(appliance.id)} className="p-1 hover:bg-muted rounded">
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Freezers */}
        <div>
          <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
            <div className="w-3 h-3 bg-cyan-500 rounded-full"></div>
            Freezers ({freezers.length})
          </h3>
          <div className="space-y-2">
            {freezers.map((appliance) => (
              <div
                key={appliance.id}
                className={`bg-white rounded-xl p-3 border ${appliance.is_active ? 'border-gray-200' : 'border-gray-300 opacity-50'}`}
              >
                {editingId === appliance.id ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 px-2 py-1 rounded border border-gray-200 outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button onClick={() => handleUpdate(appliance.id)} className="p-1 hover:bg-muted rounded">
                      <Save className="h-4 w-4 text-green-600" />
                    </button>
                    <button onClick={() => setEditingId(null)} className="p-1 hover:bg-muted rounded">
                      <X className="h-4 w-4 text-gray-600" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{appliance.name}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleActive(appliance.id, appliance.is_active)}
                        className={`text-xs px-2 py-1 rounded ${appliance.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}
                      >
                        {appliance.is_active ? 'Active' : 'Inactive'}
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(appliance.id)
                          setEditName(appliance.name)
                        }}
                        className="p-1 hover:bg-muted rounded"
                      >
                        <Edit2 className="h-4 w-4 text-gray-600" />
                      </button>
                      <button onClick={() => handleDelete(appliance.id)} className="p-1 hover:bg-muted rounded">
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
