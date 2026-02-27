'use client'

import { useState } from 'react'
import { useUser } from '@/hooks/useUser'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Plus, GripVertical, Trash2 } from 'lucide-react'

interface TemplateItem {
  id: string
  title: string
  description: string
  priority: 'P1' | 'P2' | 'P3'
  is_critical: boolean
  due_time: string
  grace_period_minutes: number
  evidence_type: 'none' | 'note' | 'numeric' | 'photo'
  sort_order: number
}

export default function NewTemplatePage() {
  const { user, profile, isAdmin } = useUser()
  const router = useRouter()
  const supabase = createClient()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [templateType, setTemplateType] = useState<'opening' | 'closing' | 'cleaning' | 'safety'>('opening')
  const [items, setItems] = useState<TemplateItem[]>([])
  const [saving, setSaving] = useState(false)

  const addItem = () => {
    const newItem: TemplateItem = {
      id: `temp-${Date.now()}`,
      title: '',
      description: '',
      priority: 'P2',
      is_critical: false,
      due_time: '',
      grace_period_minutes: 0,
      evidence_type: 'none',
      sort_order: items.length,
    }
    setItems([...items, newItem])
  }

  const updateItem = (id: string, field: keyof TemplateItem, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item))
  }

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id))
  }

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newItems = [...items]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= newItems.length) return

    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]]
    newItems.forEach((item, idx) => item.sort_order = idx)
    setItems(newItems)
  }

  const saveTemplate = async () => {
    if (!user || !profile?.site_id || !name) return

    setSaving(true)
    try {
      const { data: template, error: templateError } = await supabase
        .from('templates')
        .insert({
          site_id: profile.site_id,
          name,
          description,
          template_type: templateType,
          created_by: user.id,
        })
        .select()
        .single()

      if (templateError) throw templateError

      if (template && items.length > 0) {
        const templateItems = items.map(item => ({
          template_id: template.id,
          title: item.title,
          description: item.description,
          priority: item.priority,
          is_critical: item.is_critical,
          due_time: item.due_time || null,
          grace_period_minutes: item.grace_period_minutes,
          evidence_type: item.evidence_type,
          sort_order: item.sort_order,
        }))

        const { error: itemsError } = await supabase
          .from('template_items')
          .insert(templateItems)

        if (itemsError) throw itemsError
      }

      router.push('/admin/templates')
    } catch (error) {
      console.error('Error saving template:', error)
      alert('Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  if (!user || !profile || !isAdmin) {
    router.push('/')
    return null
  }

  return (
    <div className="min-h-screen pb-20">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-navy">New Template</h1>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => router.push('/admin/templates')}>
                <ArrowLeft className="h-5 w-5 mr-2" />
                Cancel
              </Button>
              <Button onClick={saveTemplate} disabled={saving || !name}>
                {saving ? 'Saving...' : 'Save Template'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Template Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Template Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                placeholder="e.g., Morning Opening Checklist"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                rows={2}
                placeholder="Brief description of this template"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Template Type
              </label>
              <select
                value={templateType}
                onChange={(e) => setTemplateType(e.target.value as any)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              >
                <option value="opening">Opening</option>
                <option value="closing">Closing</option>
                <option value="cleaning">Cleaning</option>
                <option value="safety">Safety</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Checklist Items</CardTitle>
              <Button onClick={addItem} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No items yet. Click "Add Item" to get started.
              </div>
            ) : (
              items.map((item, index) => (
                <div key={item.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col gap-1 pt-2">
                      <button
                        onClick={() => moveItem(index, 'up')}
                        disabled={index === 0}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      >
                        ▲
                      </button>
                      <GripVertical className="h-5 w-5 text-gray-400" />
                      <button
                        onClick={() => moveItem(index, 'down')}
                        disabled={index === items.length - 1}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      >
                        ▼
                      </button>
                    </div>

                    <div className="flex-1 space-y-3">
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => updateItem(item.id, 'title', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                        placeholder="Task title"
                      />

                      <textarea
                        value={item.description}
                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                        rows={2}
                        placeholder="Task description (optional)"
                      />

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
                          <select
                            value={item.priority}
                            onChange={(e) => updateItem(item.id, 'priority', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          >
                            <option value="P1">P1 (High)</option>
                            <option value="P2">P2 (Medium)</option>
                            <option value="P3">P3 (Low)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Evidence Type</label>
                          <select
                            value={item.evidence_type}
                            onChange={(e) => updateItem(item.id, 'evidence_type', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          >
                            <option value="none">None</option>
                            <option value="note">Note</option>
                            <option value="numeric">Numeric</option>
                            <option value="photo">Photo</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Due Time</label>
                          <input
                            type="time"
                            value={item.due_time}
                            onChange={(e) => updateItem(item.id, 'due_time', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Grace (mins)</label>
                          <input
                            type="number"
                            value={item.grace_period_minutes}
                            onChange={(e) => updateItem(item.id, 'grace_period_minutes', parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            min="0"
                          />
                        </div>
                      </div>

                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={item.is_critical}
                          onChange={(e) => updateItem(item.id, 'is_critical', e.target.checked)}
                          className="w-4 h-4 text-primary rounded"
                        />
                        <span className="text-sm font-medium text-gray-700">
                          Critical (blocks shift completion)
                        </span>
                      </label>
                    </div>

                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-red-500 hover:text-red-700 p-2"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
