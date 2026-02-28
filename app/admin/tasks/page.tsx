'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/hooks/useUser'
import { useAdminSite } from '@/hooks/useAdminSite'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Edit, Trash2, GripVertical, Save, Upload, Download } from 'lucide-react'
import { Database } from '@/types/database'
import { AdminNav } from '@/components/admin/AdminNav'
import { AddTaskModal } from '@/components/admin/AddTaskModal'

type TemplateItem = Database['public']['Tables']['template_items']['Row']
type Template = Database['public']['Tables']['templates']['Row']

interface TaskWithTemplate extends TemplateItem {
  template_name?: string
}

export default function TaskManagementPage() {
  const { user, profile, loading: userLoading, isAdmin } = useUser()
  const { selectedSiteId } = useAdminSite()
  const router = useRouter()
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [tasks, setTasks] = useState<TaskWithTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [editingTask, setEditingTask] = useState<string | null>(null)
  const [draggedTask, setDraggedTask] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [importing, setImporting] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (selectedSiteId) {
      loadTemplates()
    }
  }, [selectedSiteId])

  useEffect(() => {
    if (selectedTemplate) {
      loadTasks()
    }
  }, [selectedTemplate])

  const loadTemplates = async () => {
    if (!selectedSiteId) return

    const { data } = await supabase
      .from('templates')
      .select('*')
      .or(`site_id.eq.${selectedSiteId},site_id.is.null`)
      .eq('is_active', true)
      .order('name')

    setTemplates(data || [])
    if (data && data.length > 0) {
      setSelectedTemplate(data[0].id)
    }
    setLoading(false)
  }

  const loadTasks = async () => {
    if (!selectedTemplate) return

    const { data } = await supabase
      .from('template_items')
      .select('*')
      .eq('template_id', selectedTemplate)
      .order('sort_order')

    setTasks(data || [])
  }

  const handleDragStart = (taskId: string) => {
    setDraggedTask(taskId)
  }

  const handleDragOver = (e: React.DragEvent, taskId: string) => {
    e.preventDefault()
    if (!draggedTask || draggedTask === taskId) return

    const draggedIndex = tasks.findIndex(t => t.id === draggedTask)
    const targetIndex = tasks.findIndex(t => t.id === taskId)

    if (draggedIndex === -1 || targetIndex === -1) return

    const newTasks = [...tasks]
    const [removed] = newTasks.splice(draggedIndex, 1)
    newTasks.splice(targetIndex, 0, removed)

    setTasks(newTasks)
  }

  const handleDragEnd = async () => {
    if (!draggedTask) return

    const updates = tasks.map((task, index) => ({
      id: task.id,
      sort_order: index
    }))

    for (const update of updates) {
      await supabase
        .from('template_items')
        .update({ sort_order: update.sort_order })
        .eq('id', update.id)
    }

    setDraggedTask(null)
  }

  const deleteTask = async (taskId: string) => {
    if (!confirm('Delete this task?')) return

    await supabase
      .from('template_items')
      .delete()
      .eq('id', taskId)

    loadTasks()
  }

  const addNewTask = async (taskData: {
    title: string
    description: string
    priority: string
    is_critical: boolean
    due_time: string | null
    grace_period_minutes: number
    evidence_type: string
  }) => {
    if (!selectedTemplate || !user) {
      console.log('Add Task: Missing template or user', { selectedTemplate, user: !!user })
      return
    }

    console.log('Add Task: Creating new task for template', selectedTemplate)
    const maxOrder = Math.max(...tasks.map(t => t.sort_order), -1)

    const { data, error } = await supabase
      .from('template_items')
      .insert({
        template_id: selectedTemplate,
        ...taskData,
        sort_order: maxOrder + 1,
        metadata: {}
      })
      .select()
      .single()

    if (error) {
      console.error('Add Task: Error creating task', error)
      alert('Failed to create task: ' + error.message)
      return
    }

    if (data) {
      console.log('Add Task: Task created successfully', data)
      setTasks([...tasks, data])
      setShowAddModal(false)
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedTemplate) return

    setImporting(true)
    try {
      const text = await file.text()
      const lines = text.split('\n')
      const newTasks: any[] = []

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        const parts = line.split(',')
        if (parts.length >= 2) {
          newTasks.push({
            template_id: selectedTemplate,
            title: parts[0].trim(),
            description: parts[1]?.trim() || '',
            priority: parts[2]?.trim() || 'P2',
            is_critical: parts[3]?.trim().toLowerCase() === 'true',
            due_time: parts[4]?.trim() || null,
            grace_period_minutes: parseInt(parts[5]?.trim() || '15'),
            evidence_type: parts[6]?.trim() || 'none',
            sort_order: tasks.length + newTasks.length,
            metadata: {}
          })
        }
      }

      if (newTasks.length > 0) {
        await supabase.from('template_items').insert(newTasks)
        alert(`Imported ${newTasks.length} tasks`)
        loadTasks()
      }
    } catch (error) {
      console.error('Import error:', error)
      alert('Failed to import tasks')
    } finally {
      setImporting(false)
    }
  }

  const handleExport = () => {
    const csv = ['title,description,priority,is_critical,due_time,grace_period_minutes,evidence_type']
    tasks.forEach(task => {
      csv.push(`${task.title},${task.description || ''},${task.priority},${task.is_critical},${task.due_time || ''},${task.grace_period_minutes},${task.evidence_type}`)
    })

    const blob = new Blob([csv.join('\n')], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tasks-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

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
    <div className="min-h-screen pb-20">
      <AdminNav title="Task Management" userName={profile?.full_name} />

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-navy">Template:</label>
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              >
                {templates.map(template => (
                  <option key={template.id} value={template.id}>
                    {template.name} ({template.template_type})
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <label>
                  <Button disabled={importing} asChild>
                    <span>
                      <Upload className="h-5 w-5 mr-2" />
                      {importing ? 'Importing...' : 'Import CSV'}
                    </span>
                  </Button>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleImport}
                    className="hidden"
                    disabled={importing}
                  />
                </label>
                <Button variant="outline" onClick={handleExport} disabled={tasks.length === 0}>
                  <Download className="h-5 w-5 mr-2" />
                  Export CSV
                </Button>
                <Button onClick={() => setShowAddModal(true)}>
                  <Plus className="h-5 w-5 mr-2" />
                  Add Task
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading tasks...</p>
          </div>
        ) : tasks.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-gray-500 mb-4">No tasks in this template</p>
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="h-5 w-5 mr-2" />
                Add First Task
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {tasks.map((task, index) => (
              <TaskRow
                key={task.id}
                task={task}
                index={index}
                isEditing={editingTask === task.id}
                onEdit={() => setEditingTask(task.id)}
                onSave={async (updated) => {
                  await supabase
                    .from('template_items')
                    .update(updated)
                    .eq('id', task.id)
                  setEditingTask(null)
                  loadTasks()
                }}
                onDelete={() => deleteTask(task.id)}
                onDragStart={() => handleDragStart(task.id)}
                onDragOver={(e) => handleDragOver(e, task.id)}
                onDragEnd={handleDragEnd}
              />
            ))}
          </div>
        )}
      </main>

      {showAddModal && (
        <AddTaskModal
          onClose={() => setShowAddModal(false)}
          onSave={addNewTask}
        />
      )}
    </div>
  )
}

interface TaskRowProps {
  task: TemplateItem
  index: number
  isEditing: boolean
  onEdit: () => void
  onSave: (updated: Partial<TemplateItem>) => void
  onDelete: () => void
  onDragStart: () => void
  onDragOver: (e: React.DragEvent) => void
  onDragEnd: () => void
}

function TaskRow({ task, index, isEditing, onEdit, onSave, onDelete, onDragStart, onDragOver, onDragEnd }: TaskRowProps) {
  const [formData, setFormData] = useState(task)

  useEffect(() => {
    setFormData(task)
  }, [task])

  if (isEditing) {
    return (
      <Card>
        <CardContent className="py-4">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Due Time (HH:MM)</label>
                <input
                  type="time"
                  value={formData.due_time || ''}
                  onChange={(e) => setFormData({ ...formData, due_time: e.target.value || null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as 'P1' | 'P2' | 'P3' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                >
                  <option value="P1">P1 (High)</option>
                  <option value="P2">P2 (Medium)</option>
                  <option value="P3">P3 (Low)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Grace Period (min)</label>
                <input
                  type="number"
                  value={formData.grace_period_minutes}
                  onChange={(e) => setFormData({ ...formData, grace_period_minutes: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Evidence Type</label>
                <select
                  value={formData.evidence_type}
                  onChange={(e) => setFormData({ ...formData, evidence_type: e.target.value as 'none' | 'note' | 'numeric' | 'photo' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                >
                  <option value="none">None</option>
                  <option value="note">Note</option>
                  <option value="numeric">Numeric</option>
                  <option value="photo">Photo</option>
                </select>
              </div>

              <div className="flex items-end">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_critical}
                    onChange={(e) => setFormData({ ...formData, is_critical: e.target.checked })}
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                  />
                  <span className="text-sm font-medium">Critical</span>
                </label>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => onEdit()}>Cancel</Button>
              <Button onClick={() => onSave(formData)}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      className="cursor-move hover:shadow-md transition-shadow"
    >
      <CardContent className="py-3">
        <div className="flex items-center gap-4">
          <GripVertical className="h-5 w-5 text-gray-400" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-navy">{index + 1}. {task.title}</span>
              {task.is_critical && (
                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded font-medium">
                  CRITICAL
                </span>
              )}
              <span className={`px-2 py-0.5 text-xs rounded font-medium ${
                task.priority === 'P1' ? 'bg-red-50 text-red-700' :
                task.priority === 'P2' ? 'bg-amber-50 text-amber-700' :
                'bg-gray-50 text-gray-700'
              }`}>
                {task.priority}
              </span>
            </div>
            {task.description && (
              <p className="text-sm text-gray-600 mt-1">{task.description}</p>
            )}
            <div className="flex gap-4 mt-2 text-xs text-gray-500">
              {task.due_time && <span>Due: {task.due_time}</span>}
              <span>Grace: {task.grace_period_minutes}min</span>
              <span>Evidence: {task.evidence_type}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={onDelete}>
              <Trash2 className="h-4 w-4 text-red-600" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
