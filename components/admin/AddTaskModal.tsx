'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface AddTaskModalProps {
  onClose: () => void
  onSave: (task: {
    title: string
    description: string
    priority: string
    is_critical: boolean
    due_time: string | null
    grace_period_minutes: number
    evidence_type: string
    task_type: string
    interval_minutes?: number
    active_window_start?: string
    active_window_end?: string
    max_occurrences?: number
    never_goes_red?: boolean
    no_notifications?: boolean
  }) => void
}

export function AddTaskModal({ onClose, onSave }: AddTaskModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'P2',
    is_critical: false,
    due_time: '',
    grace_period_minutes: 15,
    evidence_type: 'none',
    task_type: 'tick',
    interval_minutes: 60,
    active_window_start: '08:00',
    active_window_end: '17:00',
    max_occurrences: undefined,
    never_goes_red: false,
    no_notifications: false
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const baseData = {
      title: formData.title,
      description: formData.description,
      priority: formData.priority,
      is_critical: formData.is_critical,
      due_time: formData.due_time || null,
      grace_period_minutes: formData.grace_period_minutes,
      evidence_type: formData.evidence_type,
      task_type: formData.task_type
    }
    
    // Only include recurring fields if task_type is recurring
    if (formData.task_type === 'recurring') {
      onSave({
        ...baseData,
        interval_minutes: formData.interval_minutes,
        active_window_start: formData.active_window_start,
        active_window_end: formData.active_window_end,
        max_occurrences: formData.max_occurrences,
        never_goes_red: formData.never_goes_red,
        no_notifications: formData.no_notifications
      })
    } else {
      onSave(baseData)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-navy">Add New Task</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Task Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                placeholder="e.g., Check fridge temperature"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                rows={3}
                placeholder="Additional instructions or details..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Task Type *
              </label>
              <select
                value={formData.task_type}
                onChange={(e) => setFormData({ ...formData, task_type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
              >
                <option value="tick">Simple Task (tick to complete)</option>
                <option value="data_entry">Data Entry (requires evidence)</option>
                <option value="recurring">Recurring Task (repeats at intervals)</option>
                <option value="group">Group Task (multiple sub-tasks)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {formData.task_type === 'tick' && 'Simple completion task - just tick when done'}
                {formData.task_type === 'data_entry' && 'Requires evidence (temperature, photo, note)'}
                {formData.task_type === 'recurring' && 'Repeats automatically at set intervals (e.g., hourly temp checks)'}
                {formData.task_type === 'group' && 'Opens a checklist with multiple sub-tasks'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                >
                  <option value="P1">P1 - High</option>
                  <option value="P2">P2 - Medium</option>
                  <option value="P3">P3 - Low</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Time (optional)
                </label>
                <input
                  type="time"
                  value={formData.due_time}
                  onChange={(e) => setFormData({ ...formData, due_time: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Grace Period (minutes)
                </label>
                <input
                  type="number"
                  value={formData.grace_period_minutes}
                  onChange={(e) => setFormData({ ...formData, grace_period_minutes: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Evidence Type
                </label>
                <select
                  value={formData.evidence_type}
                  onChange={(e) => setFormData({ ...formData, evidence_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                  disabled={formData.task_type === 'data_entry'}
                >
                  <option value="none">None</option>
                  <option value="numeric">Numeric (e.g., temperature)</option>
                  <option value="note">Text Note</option>
                  <option value="photo">Photo</option>
                </select>
                {formData.task_type === 'data_entry' && (
                  <p className="text-xs text-gray-500 mt-1">Evidence type required for data entry tasks</p>
                )}
              </div>
            </div>

            {/* Recurring Task Fields */}
            {formData.task_type === 'recurring' && (
              <div className="border-t border-gray-200 pt-4 mt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Recurring Task Settings</h3>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Interval (minutes) *
                    </label>
                    <input
                      type="number"
                      value={formData.interval_minutes}
                      onChange={(e) => setFormData({ ...formData, interval_minutes: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                      min="1"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">How often task repeats (e.g., 60 for hourly)</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Occurrences (optional)
                    </label>
                    <input
                      type="number"
                      value={formData.max_occurrences ?? ''}
                      onChange={(e) => setFormData({ ...formData, max_occurrences: e.target.value ? parseInt(e.target.value) : undefined })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                      min="1"
                      placeholder="Unlimited"
                    />
                    <p className="text-xs text-gray-500 mt-1">Limit occurrences per day</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Active Window Start *
                    </label>
                    <input
                      type="time"
                      value={formData.active_window_start}
                      onChange={(e) => setFormData({ ...formData, active_window_start: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">When recurring starts</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Active Window End *
                    </label>
                    <input
                      type="time"
                      value={formData.active_window_end}
                      onChange={(e) => setFormData({ ...formData, active_window_end: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">When recurring stops</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="never_goes_red"
                      checked={formData.never_goes_red}
                      onChange={(e) => setFormData({ ...formData, never_goes_red: e.target.checked })}
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                    <label htmlFor="never_goes_red" className="text-sm font-medium text-gray-700">
                      Never goes red (rhythm task)
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="no_notifications"
                      checked={formData.no_notifications}
                      onChange={(e) => setFormData({ ...formData, no_notifications: e.target.checked })}
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                    <label htmlFor="no_notifications" className="text-sm font-medium text-gray-700">
                      No notifications for this task
                    </label>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_critical"
                checked={formData.is_critical}
                onChange={(e) => setFormData({ ...formData, is_critical: e.target.checked })}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <label htmlFor="is_critical" className="text-sm font-medium text-gray-700">
                Mark as Critical Task
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                Add Task
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
