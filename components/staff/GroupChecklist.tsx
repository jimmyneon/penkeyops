'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, Circle, X, AlertCircle } from 'lucide-react'

interface GroupTask {
  task_id: string
  title: string
  description: string | null
  is_required: boolean
  is_critical: boolean
  priority: string
  status: string
  evidence_type: string | null
}

interface GroupChecklistProps {
  sessionId: string
  groupId: string
  groupName: string
  onClose: () => void
}

export function GroupChecklist({ sessionId, groupId, groupName, onClose }: GroupChecklistProps) {
  const [tasks, setTasks] = useState<GroupTask[]>([])
  const [loading, setLoading] = useState(true)
  const [evidence, setEvidence] = useState<Record<string, string>>({})
  const supabase = createClient()

  useEffect(() => {
    loadGroupTasks()
  }, [sessionId, groupId])

  const loadGroupTasks = async () => {
    const { data, error } = await supabase.rpc('get_group_tasks', {
      p_session_id: sessionId,
      p_group_id: groupId
    })

    if (error) {
      console.error('Error loading group tasks:', error)
      return
    }

    setTasks(data || [])
    setLoading(false)
  }

  const completeTask = async (taskId: string, evidenceValue?: string) => {
    await supabase
      .from('checklist_results')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        evidence: evidenceValue || null
      })
      .eq('id', taskId)

    loadGroupTasks()
  }

  const allRequiredComplete = tasks
    .filter(t => t.is_required)
    .every(t => t.status === 'completed')

  const handleClose = () => {
    if (allRequiredComplete) {
      onClose()
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-3xl p-8 max-w-2xl w-full">
          <p className="text-center text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">{groupName}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {tasks.filter(t => t.status === 'completed').length} of {tasks.filter(t => t.is_required).length} required tasks complete
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-muted rounded-xl transition-colors"
            disabled={!allRequiredComplete}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.task_id}
              className={`bg-muted rounded-2xl p-4 ${
                task.status === 'completed' ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() => {
                    if (task.status !== 'completed') {
                      if (task.evidence_type === 'numeric') {
                        const value = prompt('Enter value:')
                        if (value) completeTask(task.task_id, value)
                      } else if (task.evidence_type === 'note') {
                        const value = prompt('Add note:')
                        if (value) completeTask(task.task_id, value)
                      } else {
                        completeTask(task.task_id)
                      }
                    }
                  }}
                  disabled={task.status === 'completed'}
                  className="mt-1"
                >
                  {task.status === 'completed' ? (
                    <CheckCircle2 className="h-8 w-8 text-accent" />
                  ) : (
                    <Circle className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors" />
                  )}
                </button>

                <div className="flex-1">
                  <div className="flex items-start gap-2 mb-1">
                    <h3 className={`font-semibold ${
                      task.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'
                    }`}>
                      {task.title}
                    </h3>
                    {task.is_critical && (
                      <AlertCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    )}
                    {!task.is_required && (
                      <span className="text-xs bg-muted-foreground/10 text-muted-foreground px-2 py-0.5 rounded-full">
                        Optional
                      </span>
                    )}
                  </div>
                  
                  {task.description && (
                    <p className="text-sm text-muted-foreground">{task.description}</p>
                  )}

                  {task.evidence_type && task.status !== 'completed' && (
                    <p className="text-xs text-primary mt-2">
                      {task.evidence_type === 'numeric' && 'Requires numeric value'}
                      {task.evidence_type === 'note' && 'Requires note'}
                      {task.evidence_type === 'photo' && 'Requires photo'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {allRequiredComplete && (
          <button
            onClick={onClose}
            className="w-full mt-6 bg-accent text-white py-4 rounded-2xl text-lg font-bold hover:opacity-90 transition-opacity shadow-lg"
          >
            Done - Return to Dashboard
          </button>
        )}
      </div>
    </div>
  )
}
