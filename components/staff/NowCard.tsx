'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Clock, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react'
import { TemperatureModal } from './TemperatureModal'

interface NowAction {
  action_type: 'task' | 'group'
  task_id: string | null
  group_id: string | null
  title: string
  instruction: string | null
  due_time: string | null
  is_overdue: boolean
  overdue_minutes: number | null
  priority: string
  is_critical: boolean
  task_count: number | null
}

interface NowCardProps {
  sessionId: string | null
  onEndShift?: () => void
  onTaskAction: (taskId: string | null, groupId: string | null, actionType: string) => void
}

export function NowCard({ sessionId, onEndShift, onTaskAction }: NowCardProps) {
  const [nowAction, setNowAction] = useState<NowAction | null>(null)
  const [loading, setLoading] = useState(true)
  const [countdown, setCountdown] = useState<string>('')
  const [completing, setCompleting] = useState(false)
  const [showDone, setShowDone] = useState(false)
  const [slideOut, setSlideOut] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showTempModal, setShowTempModal] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (!sessionId) {
      setNowAction(null)
      setLoading(false)
      return
    }

    loadNowAction()

    const channel = supabase
      .channel('now_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'checklist_results' }, () => {
        loadNowAction()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId])

  useEffect(() => {
    if (!nowAction?.due_time) return

    const updateCountdown = () => {
      const now = new Date()
      const currentTime = now.getHours() * 60 + now.getMinutes()
      const [dueHours, dueMinutes] = nowAction.due_time.split(':').map(Number)
      const dueTimeMinutes = dueHours * 60 + dueMinutes
      
      const diff = dueTimeMinutes - currentTime
      
      if (diff < 0) {
        setCountdown(`Overdue by ${Math.abs(diff)} min`)
      } else if (diff === 0) {
        setCountdown('Due now')
      } else if (diff < 60) {
        setCountdown(`Due in ${diff} min`)
      } else {
        const hours = Math.floor(diff / 60)
        const mins = diff % 60
        setCountdown(`Due in ${hours}h ${mins}m`)
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 60000)

    return () => clearInterval(interval)
  }, [nowAction])

  const loadNowAction = async () => {
    if (!sessionId) return

    const { data, error } = await supabase.rpc('resolve_now_action', {
      p_session_id: sessionId
    })

    if (error) {
      console.error('Error loading NOW action:', error)
      setLoading(false)
      return
    }

    setNowAction(data?.[0] || null)
    setLoading(false)
  }

  const getUrgencyColor = () => {
    if (!nowAction) return 'bg-primary'
    
    // Calculate minutes until due
    const minutesUntilDue = nowAction.due_time ? calculateMinutesUntilDue(nowAction.due_time) : null
    
    // Critical overdue - red with pulse
    if (nowAction.is_overdue && nowAction.is_critical) return 'bg-red-600 animate-pulse'
    // Regular overdue - red
    if (nowAction.is_overdue) return 'bg-red-500'
    
    // Due very soon (<15 min) - yellow with subtle pulse
    if (minutesUntilDue !== null && minutesUntilDue < 15) return 'bg-yellow-500 animate-pulse-slow'
    // Due soon (15-30 min) - amber
    if (minutesUntilDue !== null && minutesUntilDue < 30) return 'bg-amber-500'
    
    // On time - orange (Penkey primary)
    return 'bg-primary'
  }
  
  const calculateMinutesUntilDue = (dueTime: string) => {
    const now = new Date()
    const [hours, minutes] = dueTime.split(':').map(Number)
    const dueDate = new Date()
    dueDate.setHours(hours, minutes, 0, 0)
    
    const diffMs = dueDate.getTime() - now.getTime()
    return Math.floor(diffMs / 60000)
  }
  
  const getCountdownText = () => {
    if (!nowAction?.due_time) return null
    
    if (nowAction.is_overdue && nowAction.overdue_minutes) {
      return `${nowAction.overdue_minutes} minutes overdue`
    }
    
    const minutesUntilDue = calculateMinutesUntilDue(nowAction.due_time)
    if (minutesUntilDue < 0) return null
    
    if (minutesUntilDue < 60) {
      return `Due in ${minutesUntilDue} minutes`
    }
    
    const hours = Math.floor(minutesUntilDue / 60)
    const mins = minutesUntilDue % 60
    return `Due in ${hours}h ${mins}m`
  }

  const getButtonText = () => {
    if (!nowAction) return 'START'
    if (nowAction.action_type === 'group') return 'OPEN CHECKLIST'
    if (nowAction.instruction?.toLowerCase().includes('temp')) return 'ENTER TEMP'
    if (nowAction.instruction?.toLowerCase().includes('check')) return 'DO CHECK'
    return 'DO IT'
  }

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  // No session - loading (shift is auto-starting)
  if (!sessionId) {
    return null
  }

  // Session active but no tasks - check if can end shift
  if (!nowAction) {
    const currentHour = new Date().getHours()
    const canEndShift = currentHour >= 17 // After 5pm

    return (
      <div className="h-[60vh] flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <CheckCircle2 className="h-24 w-24 text-accent mx-auto mb-6" />
          <h1 className="text-4xl font-bold text-foreground mb-4">All Tasks Complete!</h1>
          {canEndShift ? (
            <>
              <p className="text-muted-foreground text-lg mb-8">Ready to end your shift</p>
              <button
                onClick={onEndShift}
                className="bg-accent text-white px-8 py-4 rounded-2xl text-xl font-bold hover:opacity-90 transition-opacity shadow-lg"
              >
                END SHIFT
              </button>
            </>
          ) : (
            <p className="text-muted-foreground text-lg">
              All tasks done! You can end your shift after 5:00 PM
            </p>
          )}
        </div>
      </div>
    )
  }

  const urgencyColor = getUrgencyColor()

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4 relative overflow-hidden">
      {/* DONE overlay */}
      {showDone && (
        <div className="absolute inset-0 flex items-center justify-center z-50 bg-teal-600 rounded-3xl animate-fade-in">
          <div className="text-center">
            <div className="text-8xl font-bold text-white mb-4 animate-bounce">✓</div>
            <div className="text-4xl font-bold text-white">DONE!</div>
          </div>
        </div>
      )}
      
      <div className={`${urgencyColor} rounded-3xl p-8 max-w-2xl w-full shadow-2xl text-white transition-all duration-300 ${
        slideOut ? '-translate-x-full opacity-0' : 'translate-x-0 opacity-100 animate-slide-in-right'
      }`}>
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            {nowAction.is_overdue ? (
              <AlertCircle className="h-8 w-8" />
            ) : (
              <Clock className="h-8 w-8" />
            )}
            <div className="flex-1">
              <p className="text-sm font-medium opacity-90">
                {nowAction.is_overdue ? 'OVERDUE' : 'NOW'}
              </p>
              {getCountdownText() && (
                <p className="text-lg font-bold mt-1">
                  {getCountdownText()}
                </p>
              )}
              {nowAction.due_time && (
                <p className="text-xs opacity-75">Due: {nowAction.due_time}</p>
              )}
            </div>
            {nowAction.is_critical && (
              <div className="bg-white/20 px-3 py-1 rounded-full">
                <p className="text-xs font-bold">CRITICAL</p>
              </div>
            )}
          </div>

          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            {nowAction.title}
            {nowAction.action_type === 'group' && nowAction.task_count && (
              <span className="text-2xl opacity-90"> ({nowAction.task_count} tasks)</span>
            )}
          </h1>

          {nowAction.instruction && (
            <p className="text-lg opacity-90 leading-relaxed">
              {nowAction.instruction}
            </p>
          )}
        </div>

        {/* Confirmation Dialog */}
        {showConfirm && (
          <div className="mb-6 bg-white/10 backdrop-blur-sm rounded-2xl p-6 border-2 border-white/30">
            <p className="text-white text-xl font-semibold mb-4 text-center">
              Mark this task as complete?
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 bg-white/20 text-white py-4 rounded-xl text-lg font-bold hover:bg-white/30 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (completing) return
                  setCompleting(true)
                  setShowConfirm(false)
                  
                  try {
                    const { error } = await supabase
                      .from('checklist_results')
                      .update({
                        status: 'completed',
                        completed_at: new Date().toISOString()
                      })
                      .eq('id', nowAction.task_id)
                    
                    if (error) throw error
                    
                    // Show DONE animation
                    setShowDone(true)
                    
                    // After 800ms, slide out
                    setTimeout(() => {
                      setSlideOut(true)
                    }, 800)
                    
                    // After slide out, load next task
                    setTimeout(() => {
                      setShowDone(false)
                      setSlideOut(false)
                      loadNowAction()
                    }, 1200)
                  } catch (error) {
                    console.error('Error completing task:', error)
                    alert('Failed to complete task')
                  } finally {
                    setCompleting(false)
                  }
                }}
                disabled={completing}
                className="flex-1 bg-white text-foreground py-4 rounded-xl text-lg font-bold hover:bg-white/90 transition-all shadow-lg disabled:opacity-50"
              >
                ✓ Confirm
              </button>
            </div>
          </div>
        )}

        <button
          onClick={() => {
            // Handle group tasks - open checklist
            if (nowAction.action_type === 'group' && nowAction.group_id) {
              onTaskAction(nowAction.task_id, nowAction.group_id, nowAction.action_type)
              return
            }
            
            // Check if task requires temperature logging
            const requiresTemperature = nowAction.title.toLowerCase().includes('temperature')
            
            if (requiresTemperature) {
              setShowTempModal(true)
              return
            }
            
            // Show confirmation dialog
            setShowConfirm(true)
          }}
          disabled={completing || showConfirm}
          className="w-full bg-white text-foreground py-6 rounded-2xl text-2xl font-bold hover:bg-white/90 transition-all shadow-lg flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {getButtonText()}
          <ArrowRight className="h-8 w-8" />
        </button>
      </div>

      {/* Temperature Modal */}
      {showTempModal && nowAction && (
        <TemperatureModal
          taskId={nowAction.task_id!}
          taskTitle={nowAction.title}
          onClose={() => setShowTempModal(false)}
          onComplete={() => {
            setShowTempModal(false)
            // Show DONE animation
            setShowDone(true)
            
            setTimeout(() => {
              setSlideOut(true)
            }, 800)
            
            setTimeout(() => {
              setShowDone(false)
              setSlideOut(false)
              loadNowAction()
            }, 1200)
          }}
        />
      )}
    </div>
  )
}
