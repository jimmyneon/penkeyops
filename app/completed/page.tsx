'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Home, Menu, CheckCircle, Calendar, Edit3, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { SidebarMenu } from '@/components/shared/SidebarMenu'
import { useUser } from '@/hooks/useUser'

interface CompletedTask {
  id: string
  title: string
  completed_at: string
  completed_by: string
  priority: string
  is_critical: boolean
  notes: string | null
}

export default function CompletedTasksPage() {
  const router = useRouter()
  const { user } = useUser()
  const [tasks, setTasks] = useState<CompletedTask[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showEditRequest, setShowEditRequest] = useState(false)
  const [selectedTask, setSelectedTask] = useState<CompletedTask | null>(null)
  const [editReason, setEditReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadCompletedTasks()
  }, [selectedDate])

  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() - 1)
    setSelectedDate(newDate)
  }

  const goToNextDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + 1)
    setSelectedDate(newDate)
  }

  const isToday = () => {
    const today = new Date()
    return selectedDate.toDateString() === today.toDateString()
  }

  const formatDisplayDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const loadCompletedTasks = async () => {
    setLoading(true)
    try {
      const startOfDay = new Date(selectedDate)
      startOfDay.setHours(0, 0, 0, 0)
      
      const endOfDay = new Date(selectedDate)
      endOfDay.setHours(23, 59, 59, 999)

      console.log('Querying completed tasks for:', {
        startOfDay: startOfDay.toISOString(),
        endOfDay: endOfDay.toISOString()
      })

      const { data, error } = await supabase
        .from('checklist_results')
        .select(`
          id,
          completed_at,
          completed_by,
          status,
          evidence_text,
          template_items!inner(
            title,
            priority,
            is_critical
          )
        `)
        .eq('status', 'completed')
        .gte('completed_at', startOfDay.toISOString())
        .lte('completed_at', endOfDay.toISOString())
        .order('completed_at', { ascending: false })

      console.log('Query result:', { data, error, count: data?.length })

      if (error) {
        console.error('Supabase error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw error
      }
      
      // Transform data to match interface
      const transformedData = (data as any)?.map((item: any) => ({
        id: item.id,
        title: item.template_items?.title || 'Untitled Task',
        completed_at: item.completed_at,
        completed_by: item.completed_by,
        priority: item.template_items?.priority || 'P2',
        is_critical: item.template_items?.is_critical || false,
        notes: item.evidence_text
      })) || []
      
      setTasks(transformedData)
    } catch (error) {
      console.error('Error loading completed tasks:', error)
      if (error instanceof Error) {
        console.error('Error message:', error.message)
        console.error('Error stack:', error.stack)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRequestEdit = (task: CompletedTask) => {
    setSelectedTask(task)
    setEditReason('')
    setShowEditRequest(true)
  }

  const submitEditRequest = async () => {
    if (!editReason.trim() || !selectedTask || !user) return

    setSubmitting(true)
    try {
      const { error } = await supabase
        .from('edit_requests')
        .insert({
          task_id: selectedTask.id,
          task_title: selectedTask.title,
          requested_by: user.id,
          reason: editReason.trim(),
          status: 'pending'
        })

      if (error) throw error

      alert('Edit request submitted for admin approval')
      setShowEditRequest(false)
      setSelectedTask(null)
      setEditReason('')
    } catch (error) {
      console.error('Error submitting edit request:', error)
      alert('Failed to submit edit request')
    } finally {
      setSubmitting(false)
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card px-4 py-3 shadow-sm sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowMenu(true)}
            className="p-2 hover:bg-muted rounded-xl transition-colors"
          >
            <Menu className="h-6 w-6 text-foreground" />
          </button>
          <div className="flex items-center gap-2 absolute left-1/2 transform -translate-x-1/2">
            <CheckCircle className="h-6 w-6 text-primary" />
            <h1 className="text-lg font-bold text-foreground">Completed Tasks</h1>
          </div>
          <button
            onClick={() => router.push('/')}
            className="p-2 hover:bg-muted rounded-xl transition-colors"
          >
            <Home className="h-6 w-6 text-foreground" />
          </button>
        </div>
      </header>

      <main className="p-4 max-w-4xl mx-auto">
        {/* Date Navigation */}
        <div className="mb-4 bg-card rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <button
              onClick={goToPreviousDay}
              className="w-14 h-14 flex items-center justify-center bg-primary text-white rounded-lg hover:opacity-90 transition-all shadow-md"
            >
              <ChevronLeft className="h-7 w-7" />
            </button>
            <div className="text-center flex-1">
              <p className="text-lg font-bold text-foreground">{formatDisplayDate(selectedDate)}</p>
              {isToday() && <p className="text-xs text-primary">Today</p>}
            </div>
            <button
              onClick={goToNextDay}
              disabled={isToday()}
              className="w-14 h-14 flex items-center justify-center bg-primary text-white rounded-lg hover:opacity-90 transition-all shadow-md disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-7 w-7" />
            </button>
          </div>
        </div>

        {/* Tasks List */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading tasks...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No completed tasks on {formatDate(selectedDate.toISOString())}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground mb-3">
              {tasks.length} task{tasks.length !== 1 ? 's' : ''} completed on {formatDate(selectedDate.toISOString())}
            </p>
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`rounded-xl p-4 shadow-sm border ${
                  task.is_critical 
                    ? 'bg-orange-50 border-orange-200' 
                    : 'bg-green-50 border-green-200'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-bold text-foreground text-lg">
                      {task.title}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <Calendar className="h-3 w-3" />
                      <span>Completed at {formatTime(task.completed_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {task.is_critical && (
                      <span className="inline-block bg-primary/10 text-primary text-xs px-2 py-1 rounded-full font-medium">
                        Critical
                      </span>
                    )}
                    <button
                      onClick={() => handleRequestEdit(task)}
                      className="p-2 hover:bg-white rounded-lg transition-colors"
                      title="Request Edit"
                    >
                      <Edit3 className="h-4 w-4 text-primary" />
                    </button>
                  </div>
                </div>
                {task.notes && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-sm text-gray-700">{task.notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Edit Request Modal */}
      {showEditRequest && selectedTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Request Edit</h2>
              <button
                onClick={() => setShowEditRequest(false)}
                className="p-1 hover:bg-muted rounded-xl transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-muted-foreground mb-2">Task:</p>
              <p className="font-semibold text-foreground">{selectedTask.title}</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-foreground mb-2">
                Reason for Edit Request *
              </label>
              <textarea
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                placeholder="Explain why this task needs to be edited..."
                rows={4}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none text-sm"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowEditRequest(false)}
                className="flex-1 bg-muted text-foreground py-3 rounded-xl text-sm font-bold hover:bg-muted/80 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={submitEditRequest}
                disabled={!editReason.trim() || submitting}
                className="flex-1 bg-primary text-white py-3 rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-lg disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>

            <p className="text-xs text-muted-foreground mt-3 text-center">
              Your request will be reviewed by an admin
            </p>
          </div>
        </div>
      )}

      <SidebarMenu showMenu={showMenu} setShowMenu={setShowMenu} />
    </div>
  )
}
