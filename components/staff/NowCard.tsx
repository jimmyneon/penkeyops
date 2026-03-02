'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Clock, AlertCircle, CheckCircle2 } from 'lucide-react'
import { TemperatureModal } from './TemperatureModal'

interface NowAction {
  action_type: 'task' | 'group' | 'start_opening'
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
  never_goes_red?: boolean
}

interface EndDayStatus {
  can_end_day: boolean
  incomplete_count: number
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
  const [shouldWobble, setShouldWobble] = useState(false)
  const [endDayStatus, setEndDayStatus] = useState<EndDayStatus>({ can_end_day: false, incomplete_count: 0 })
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
        checkEndDayStatus()
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

  // Force re-render every 30 seconds to update color states in real-time
  const [, forceUpdate] = useState({})
  useEffect(() => {
    const colorUpdateInterval = setInterval(() => {
      forceUpdate({}) // Create new object to force re-render
    }, 30000) // 30 seconds

    return () => clearInterval(colorUpdateInterval)
  }, [])

  const checkEndDayStatus = async () => {
    if (!sessionId) return

    const { data, error } = await supabase.rpc('can_end_day', {
      p_session_id: sessionId
    })

    if (!error && data !== null) {
      // Count incomplete required/critical tasks
      const { count } = await supabase
        .from('checklist_results')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .in('template_item_id', 
          supabase
            .from('template_items')
            .select('id')
            .or('is_required.eq.true,is_critical.eq.true')
        )

      setEndDayStatus({ can_end_day: data, incomplete_count: count || 0 })
    }
  }

  const loadNowAction = async () => {
    if (!sessionId) return

    console.log('Loading NOW action for session:', sessionId)
    
    const { data, error } = await supabase.rpc('resolve_now_action', {
      p_session_id: sessionId
    })

    if (error) {
      console.error('Error loading NOW action:', error)
      setLoading(false)
      return
    }

    console.log('NOW action data:', data)
    setNowAction(data?.[0] || null)
    
    // Also check if we can end the day
    await checkEndDayStatus()
    
    setLoading(false)
  }

  const getUrgencyColor = () => {
    if (!nowAction) return 'bg-green-500'
    
    // Recurring rhythm tasks (never_goes_red flag) always stay green
    // Normal tasks (tick, data_entry, group) will still go red when overdue
    if (nowAction.never_goes_red) return 'bg-green-500'
    
    // Calculate minutes until due in real-time (client-side)
    const minutesUntilDue = nowAction.due_time ? calculateMinutesUntilDue(nowAction.due_time) : null
    
    // Overdue (negative minutes) - red
    if (minutesUntilDue !== null && minutesUntilDue < 0) {
      return nowAction.is_critical ? 'bg-red-600 animate-pulse' : 'bg-red-500'
    }
    
    // Due very soon (<15 min) - yellow with subtle pulse
    if (minutesUntilDue !== null && minutesUntilDue < 15) return 'bg-yellow-500 animate-pulse-slow'
    // Due soon (15-30 min) - amber
    if (minutesUntilDue !== null && minutesUntilDue < 30) return 'bg-amber-500'
    
    // On time - green (clear, positive, no anxiety)
    return 'bg-green-500'
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
    
    // Calculate minutes until due in real-time (client-side)
    const minutesUntilDue = calculateMinutesUntilDue(nowAction.due_time)
    
    // Red: Overdue - show "X minutes overdue"
    if (minutesUntilDue < 0) {
      const overdueMinutes = Math.abs(minutesUntilDue)
      return `${overdueMinutes} minute${overdueMinutes !== 1 ? 's' : ''} overdue`
    }
    
    // Yellow/Amber: Due soon - show "Due in X minutes" or "Due now"
    if (minutesUntilDue < 30) {
      if (minutesUntilDue === 0) return 'Due now'
      return `Due in ${minutesUntilDue} minute${minutesUntilDue !== 1 ? 's' : ''}`
    }
    
    // Green: On time - show "Due by HH:MM"
    const [hours, minutes] = nowAction.due_time.split(':').map(Number)
    const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
    return `Due by ${formattedTime}`
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

  // No tasks remaining - check if we can end the day
  if (!nowAction) {
    if (endDayStatus.can_end_day) {
      // All required/critical tasks complete - show End Day button
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-4">
          <div 
            className="bg-green-500 rounded-3xl p-8 max-w-2xl w-full shadow-2xl text-white"
          >
            <div className="text-center">
              <div className="text-6xl mb-4">✓</div>
              <h1 className="text-4xl font-bold mb-3">Ready to End Day</h1>
              <p className="text-xl opacity-90 mb-6">
                All required tasks are complete. You can now end your shift.
              </p>
              <button
                onClick={() => onEndShift?.()}
                className="w-full bg-white text-green-600 py-6 rounded-2xl text-2xl font-bold hover:bg-white/90 transition-all shadow-lg"
              >
                END DAY
              </button>
            </div>
          </div>
        </div>
      )
    } else {
      // Still have required/critical tasks - show message
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-4">
          <div 
            className="bg-amber-500 rounded-3xl p-8 max-w-2xl w-full shadow-2xl text-white"
          >
            <div className="text-center">
              <div className="text-6xl mb-4">⏳</div>
              <h1 className="text-4xl font-bold mb-3">Almost There!</h1>
              <p className="text-xl opacity-90 mb-2">
                Complete {endDayStatus.incomplete_count} remaining task{endDayStatus.incomplete_count !== 1 ? 's' : ''} to end your shift.
              </p>
              <p className="text-sm opacity-75">
                All required and critical tasks must be completed.
              </p>
            </div>
          </div>
        </div>
      )
    }
  }

  // Handle Start Opening system action
  if (nowAction.action_type === 'start_opening') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div 
          className="bg-primary rounded-3xl p-8 max-w-2xl w-full shadow-2xl text-white"
        >
          <div className="text-center">
            <div className="text-6xl mb-4">🌅</div>
            <h1 className="text-4xl font-bold mb-3">{nowAction.title}</h1>
            <p className="text-xl opacity-90 mb-6">
              {nowAction.instruction}
            </p>
            <button
              onClick={async () => {
                // Mark session as started
                await supabase
                  .from('shift_sessions')
                  .update({ started_at: new Date().toISOString() })
                  .eq('id', sessionId)
                
                // Reload to get first actual task
                loadNowAction()
              }}
              className="w-full bg-white text-primary py-6 rounded-2xl text-2xl font-bold hover:bg-white/90 transition-all shadow-lg"
            >
              START OPENING
            </button>
          </div>
        </div>
      </div>
    )
  }

  const urgencyColor = getUrgencyColor()

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-2 sm:p-4 relative overflow-hidden">
      {/* DONE Animation Overlay */}
      {showDone && (
        <div 
          className="absolute inset-0 bg-primary rounded-3xl flex items-center justify-center z-30 cursor-pointer"
          onClick={() => {
            // Skip animation immediately
            setShowDone(false)
            setSlideOut(false)
            setShouldWobble(true)
            setTimeout(() => setShouldWobble(false), 600)
          }}
        >
          <div className="text-center">
            <div className="text-6xl mb-2">✓</div>
            <div className="text-4xl font-bold text-white">DONE!</div>
          </div>
        </div>
      )}
      
      <div 
        className={`${urgencyColor} rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 max-w-2xl w-full shadow-2xl text-white ${
          slideOut ? 'opacity-0' : 'opacity-100'
        }`}
        style={{
          animation: shouldWobble ? 'wobble-scale 0.6s ease-out' : 'none',
          transition: slideOut ? 'opacity 0.3s ease-out' : 'none'
        }}
      >
        <div className="mb-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            {nowAction.is_overdue ? (
              <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8" />
            ) : (
              <Clock className="h-6 w-6 sm:h-8 sm:w-8" />
            )}
            <div className="flex-1">
              {getCountdownText() && (
                <p className="text-xl sm:text-2xl font-bold">
                  {getCountdownText()}
                </p>
              )}
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-3">
            {nowAction.title}
            {nowAction.action_type === 'group' && nowAction.task_count && (
              <span className="text-lg sm:text-2xl opacity-90"> ({nowAction.task_count} tasks)</span>
            )}
          </h1>

          {nowAction.instruction && nowAction.instruction !== nowAction.title && (
            <p className="text-base sm:text-lg opacity-90 leading-relaxed">
              {nowAction.instruction}
            </p>
          )}
        </div>

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
          className="w-full bg-white text-foreground py-4 sm:py-5 md:py-6 rounded-xl sm:rounded-2xl text-lg sm:text-xl md:text-2xl font-bold hover:bg-white/90 transition-all shadow-lg flex items-center justify-center disabled:opacity-50"
        >
          {getButtonText()}
        </button>
      </div>

      {/* Confirmation Dialog Overlay */}
      {showConfirm && (
        <div className="absolute inset-0 flex items-center justify-center z-40 rounded-3xl">
          <div className="bg-card rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-2xl max-w-md w-full mx-4 border-2 border-border">
            <p className="text-foreground text-lg sm:text-xl font-semibold mb-4 sm:mb-6 text-center">
              Mark this task as complete?
            </p>
            <div className="flex gap-3 sm:gap-4">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 bg-muted text-foreground py-3 sm:py-4 rounded-lg sm:rounded-xl text-base sm:text-lg font-bold hover:bg-muted/80 transition-all"
              >
                Cancel
              </button>
              <button
                className="flex-1 bg-primary text-white py-3 sm:py-4 rounded-lg sm:rounded-xl text-base sm:text-lg font-bold hover:bg-primary/90 transition-all"
                onClick={async () => {
                  if (completing) return
                  setCompleting(true)
                  setShowConfirm(false)
                  
                  try {
                    console.log('Marking task complete:', nowAction.task_id, nowAction.title)
                    
                    const { data: updateData, error } = await supabase
                      .from('checklist_results')
                      .update({
                        status: 'completed',
                        completed_at: new Date().toISOString()
                      })
                      .eq('id', nowAction.task_id)
                      .select()
                    
                    if (error) {
                      console.error('Error updating task:', error)
                      throw error
                    }
                    
                    console.log('Task marked complete successfully:', updateData)
                    
                    // Check if this was the End of Day task
                    const isEndOfDayTask = nowAction.title?.toLowerCase().includes('end of day') || 
                                          nowAction.title?.toLowerCase().includes('confirm end')
                    
                    if (isEndOfDayTask && onEndShift) {
                      // End of Day task completed - show performance summary
                      setShowDone(true)
                      setTimeout(() => {
                        setShowDone(false)
                        onEndShift()
                      }, 800)
                    } else {
                      // Regular task - show DONE animation and load next task
                      setShowDone(true)
                      setShouldWobble(false)
                      
                      // After 600ms, load next task
                      setTimeout(async () => {
                        setShowDone(false)
                        await loadNowAction()
                        setShouldWobble(true)
                        
                        // Reset wobble after animation
                        setTimeout(() => {
                          setShouldWobble(false)
                        }, 600)
                      }, 600)
                    }
                  } catch (error) {
                    console.error('Error completing task:', error)
                    alert('Failed to complete task')
                  } finally {
                    setCompleting(false)
                  }
                }}
                disabled={completing}
              >
                ✓ Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Temperature Modal */}
      {showTempModal && nowAction && (
        <TemperatureModal
          taskId={nowAction.task_id!}
          taskTitle={nowAction.title}
          onClose={() => setShowTempModal(false)}
          onComplete={() => {
            setShowTempModal(false)
            
            // Pre-load next task data immediately
            loadNowAction()
            
            // Show DONE animation
            setShowDone(true)
            setShouldWobble(false)
            
            setTimeout(() => {
              setSlideOut(true)
            }, 800)
            
            setTimeout(() => {
              setShowDone(false)
              setSlideOut(false)
              setShouldWobble(true)
            }, 1200)
            
            // Reset wobble state after animation completes
            setTimeout(() => {
              setShouldWobble(false)
            }, 1800)
          }}
        />
      )}
    </div>
  )
}
