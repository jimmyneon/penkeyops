'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Circle, AlertCircle, Clock } from 'lucide-react'
import { formatTime } from '@/utils/date'

interface Task {
  id: string
  template_item_id: string
  status: string
  completed_at: string | null
  template_items: {
    title: string
    description: string | null
    priority: string
    is_critical: boolean
    due_time: string | null
    evidence_type: string
  }
}

interface TaskListProps {
  sessionId: string
  userId: string
}

export function TaskList({ sessionId, userId }: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadTasks()

    const channel = supabase
      .channel('checklist_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'checklist_results',
        },
        () => {
          loadTasks()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId])

  const loadTasks = async () => {
    const { data: instances } = await supabase
      .from('checklist_instances')
      .select('id')
      .eq('shift_session_id', sessionId)

    if (!instances) return

    const instanceIds = instances.map((i) => i.id)

    const { data } = await supabase
      .from('checklist_results')
      .select(`
        *,
        template_items (
          title,
          description,
          priority,
          is_critical,
          due_time,
          evidence_type
        )
      `)
      .in('checklist_instance_id', instanceIds)
      .order('created_at')

    setTasks(data || [])
    setLoading(false)
  }

  const completeTask = async (taskId: string, evidenceText?: string) => {
    await supabase
      .from('checklist_results')
      .update({
        status: 'completed',
        completed_by: userId,
        completed_at: new Date().toISOString(),
        evidence_text: evidenceText || null,
      })
      .eq('id', taskId)

    setSelectedTask(null)
    loadTasks()
  }

  const blockTask = async (taskId: string, reason: string) => {
    await supabase
      .from('checklist_results')
      .update({
        status: 'blocked',
        blocked_reason: reason,
      })
      .eq('id', taskId)

    setSelectedTask(null)
    loadTasks()
  }

  const pendingTasks = tasks.filter((t) => t.status === 'pending')
  const completedTasks = tasks.filter((t) => t.status === 'completed')
  const overdueTasks = pendingTasks.filter((t) => {
    if (!t.template_items.due_time) return false
    const now = new Date()
    const dueTime = new Date()
    const [hours, minutes] = t.template_items.due_time.split(':')
    dueTime.setHours(parseInt(hours), parseInt(minutes), 0)
    return now > dueTime
  })

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'P1':
        return 'text-red-600 bg-red-50'
      case 'P2':
        return 'text-orange-600 bg-orange-50'
      case 'P3':
        return 'text-teal-600 bg-teal-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading tasks...</div>
  }

  return (
    <div className="space-y-6">
      {overdueTasks.length > 0 && (
        <div className="bg-destructive/10 rounded-2xl p-4">
          <h3 className="text-lg font-bold text-destructive flex items-center mb-4">
            <AlertCircle className="mr-2 h-5 w-5" />
            Overdue Tasks ({overdueTasks.length})
          </h3>
          <div className="space-y-3">
            {overdueTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onComplete={completeTask}
                onBlock={blockTask}
                getPriorityColor={getPriorityColor}
              />
            ))}
          </div>
        </div>
      )}

      <div className="bg-card rounded-2xl p-4">
        <h3 className="text-lg font-bold text-foreground mb-4">Pending Tasks ({pendingTasks.length - overdueTasks.length})</h3>
        {pendingTasks.length === overdueTasks.length ? (
          <p className="text-muted-foreground text-center py-8">All tasks completed!</p>
        ) : (
          <div className="space-y-3">
            {pendingTasks
              .filter((t) => !overdueTasks.includes(t))
              .map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onComplete={completeTask}
                  onBlock={blockTask}
                  getPriorityColor={getPriorityColor}
                />
              ))}
          </div>
        )}
      </div>

      {completedTasks.length > 0 && (
        <div className="bg-accent/10 rounded-2xl p-4">
          <h3 className="text-lg font-bold text-accent mb-4">
            Completed ({completedTasks.length})
          </h3>
          <div className="space-y-2">
            {completedTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 p-3 bg-white rounded-xl"
              >
                <CheckCircle2 className="h-5 w-5 text-accent shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-accent line-through">
                    {task.template_items.title}
                  </p>
                  {task.completed_at && (
                    <p className="text-sm text-accent/80">
                      {formatTime(task.completed_at)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function TaskItem({
  task,
  onComplete,
  onBlock,
  getPriorityColor,
}: {
  task: Task
  onComplete: (id: string, evidence?: string) => void
  onBlock: (id: string, reason: string) => void
  getPriorityColor: (priority: string) => string
}) {
  const [showDetails, setShowDetails] = useState(false)
  const [evidence, setEvidence] = useState('')
  const [blockReason, setBlockReason] = useState('')

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full p-4 text-left hover:bg-muted transition-colors"
      >
        <div className="flex items-start gap-3">
          <Circle className="h-6 w-6 text-gray-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium text-navy">{task.template_items.title}</p>
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(
                  task.template_items.priority
                )}`}
              >
                {task.template_items.priority}
              </span>
              {task.template_items.is_critical && (
                <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                  Critical
                </span>
              )}
            </div>
            {task.template_items.description && (
              <p className="text-sm text-gray-600 mt-1">
                {task.template_items.description}
              </p>
            )}
            {task.template_items.due_time && (
              <p className="text-sm text-gray-500 mt-1 flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                Due by {task.template_items.due_time}
              </p>
            )}
          </div>
        </div>
      </button>

      {showDetails && (
        <div className="p-4 bg-muted space-y-3">
          {task.template_items.evidence_type === 'note' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (optional)
              </label>
              <textarea
                value={evidence}
                onChange={(e) => setEvidence(e.target.value)}
                className="w-full px-3 py-2 bg-white rounded-lg shadow-sm focus:ring-2 focus:ring-primary outline-none"
                rows={2}
                placeholder="Add any notes..."
              />
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={() => onComplete(task.id, evidence)}
              className="flex-1"
              size="sm"
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Complete
            </Button>
            <Button
              onClick={() => {
                const reason = prompt('Why is this task blocked?')
                if (reason) onBlock(task.id, reason)
              }}
              variant="outline"
              size="sm"
            >
              Block
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
