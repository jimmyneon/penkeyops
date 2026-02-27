'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Clock, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react'

interface Task {
  id: string
  template_item_id: string
  status: string
  template_items: {
    title: string
    description: string | null
    priority: string
    is_critical: boolean
    due_time: string | null
  }
}

interface WhatsNextProps {
  sessionId: string
  userId: string
}

export function WhatsNext({ sessionId, userId }: WhatsNextProps) {
  const [nextTask, setNextTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadNextTask()

    const channel = supabase
      .channel('task_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'checklist_results' }, () => {
        loadNextTask()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId])

  const loadNextTask = async () => {
    const { data: instances } = await supabase
      .from('checklist_instances')
      .select(`
        id,
        checklist_results (
          id,
          template_item_id,
          status,
          template_items (
            title,
            description,
            priority,
            is_critical,
            due_time,
            sort_order
          )
        )
      `)
      .eq('shift_session_id', sessionId)
      .single()

    if (instances?.checklist_results) {
      const tasks = instances.checklist_results as any[]
      
      // Find next pending task, prioritizing:
      // 1. Critical tasks
      // 2. Overdue tasks
      // 3. Tasks due soon
      // 4. Highest priority
      const pending = tasks
        .filter((t: any) => t.status === 'pending')
        .sort((a: any, b: any) => {
          // Critical first
          if (a.template_items.is_critical !== b.template_items.is_critical) {
            return a.template_items.is_critical ? -1 : 1
          }
          // Then by priority
          if (a.template_items.priority !== b.template_items.priority) {
            return a.template_items.priority.localeCompare(b.template_items.priority)
          }
          // Then by sort order
          return a.template_items.sort_order - b.template_items.sort_order
        })

      setNextTask(pending[0] || null)
    }
    setLoading(false)
  }

  const completeTask = async () => {
    if (!nextTask) return

    await supabase
      .from('checklist_results')
      .update({
        status: 'completed',
        completed_by: userId,
        completed_at: new Date().toISOString(),
      })
      .eq('id', nextTask.id)

    loadNextTask()
  }

  if (loading) return null

  if (!nextTask) {
    return (
      <div className="bg-accent rounded-2xl p-6 mb-4 text-center">
        <CheckCircle2 className="h-12 w-12 text-white mx-auto mb-3" />
        <h2 className="text-2xl font-bold text-white mb-2">All Done!</h2>
        <p className="text-white/90">You&apos;ve completed all your tasks for this shift</p>
      </div>
    )
  }

  const isOverdue = nextTask.template_items.due_time && 
    new Date().toTimeString().slice(0, 5) > nextTask.template_items.due_time.slice(0, 5)

  const getPriorityColor = () => {
    if (nextTask.template_items.is_critical) return 'bg-red-500'
    if (nextTask.template_items.priority === 'P1') return 'bg-orange-500'
    if (nextTask.template_items.priority === 'P2') return 'bg-yellow-500'
    return 'bg-blue-500'
  }

  return (
    <div className={`${getPriorityColor()} rounded-2xl p-6 mb-4 text-white`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          {isOverdue ? (
            <AlertCircle className="h-6 w-6" />
          ) : (
            <Clock className="h-6 w-6" />
          )}
          <div>
            <p className="text-sm text-white/80 font-medium">
              {isOverdue ? 'OVERDUE' : 'WHAT&apos;S NEXT'}
            </p>
            {nextTask.template_items.due_time && (
              <p className="text-xs text-white/70">
                Due: {nextTask.template_items.due_time.slice(0, 5)}
              </p>
            )}
          </div>
        </div>
        {nextTask.template_items.is_critical && (
          <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold">
            CRITICAL
          </span>
        )}
      </div>

      <h2 className="text-2xl font-bold mb-2">{nextTask.template_items.title}</h2>
      {nextTask.template_items.description && (
        <p className="text-white/90 mb-4">{nextTask.template_items.description}</p>
      )}

      <button
        onClick={completeTask}
        className="w-full bg-white text-gray-900 px-6 py-4 rounded-xl font-bold hover:bg-white/90 transition-colors flex items-center justify-center gap-2"
      >
        Mark Complete
        <ArrowRight className="h-5 w-5" />
      </button>
    </div>
  )
}
