'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Clock, ChevronDown, ChevronUp } from 'lucide-react'

interface UpcomingTask {
  task_id: string
  title: string
  due_time: string | null
  priority: string
  is_critical: boolean
  never_goes_red?: boolean
}

interface ComingUpProps {
  sessionId: string
}

export function ComingUp({ sessionId }: ComingUpProps) {
  const [upcomingTasks, setUpcomingTasks] = useState<UpcomingTask[]>([])
  const [isExpanded, setIsExpanded] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const loadUpcoming = async () => {
    if (!sessionId) return

    const { data, error } = await supabase.rpc('get_coming_up_tasks', {
      p_session_id: sessionId,
      p_limit: 100
    })

    if (error) {
      console.error('Error loading upcoming tasks:', error)
      return
    }

    setUpcomingTasks(data || [])
  }

  // Force re-render every 30 seconds for real-time color updates
  const [, forceUpdate] = useState({})
  useEffect(() => {
    const colorUpdateInterval = setInterval(() => {
      forceUpdate({}) // Create new object to force re-render
    }, 30000) // 30 seconds

    return () => clearInterval(colorUpdateInterval)
  }, [])

  useEffect(() => {
    if (!sessionId) {
      setUpcomingTasks([])
      return
    }

    loadUpcoming()

    const channel = supabase
      .channel('upcoming_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'checklist_results' }, () => {
        loadUpcoming()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId])

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setStartX(e.pageX - (scrollRef.current?.offsetLeft || 0))
    setScrollLeft(scrollRef.current?.scrollLeft || 0)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    e.preventDefault()
    const x = e.pageX - (scrollRef.current?.offsetLeft || 0)
    const walk = (x - startX) * 2
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollLeft - walk
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleToggleExpand = () => {
    if (!isExpanded) {
      // Expanding - trigger animation
      setIsAnimating(true)
      setTimeout(() => setIsAnimating(false), 300)
    } else {
      // Collapsing - smoothly scroll back to top first
      if (scrollRef.current) {
        scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' })
      }
    }
    setIsExpanded(!isExpanded)
  }

  if (!sessionId || upcomingTasks.length === 0) {
    return null
  }

  const getTaskUrgencyColor = (task: any) => {
    // Recurring rhythm tasks (never_goes_red flag) always stay neutral
    // Normal tasks (tick, data_entry, group) will still show urgency colors
    if (task.never_goes_red) {
      return 'bg-white border-gray-200'
    }
    
    const minutesUntilDue = task.due_time ? calculateMinutesUntilDue(task.due_time) : null
    
    if (minutesUntilDue !== null && minutesUntilDue < 15) {
      return 'bg-yellow-100 border-yellow-300'
    }
    if (minutesUntilDue !== null && minutesUntilDue < 30) {
      return 'bg-amber-100 border-amber-300'
    }
    if (task.is_critical) {
      return 'bg-orange-50 border-primary/20'
    }
    return 'bg-white border-gray-200'
  }
  
  const calculateMinutesUntilDue = (dueTime: string) => {
    const now = new Date()
    const [hours, minutes] = dueTime.split(':').map(Number)
    const dueDate = new Date()
    dueDate.setHours(hours, minutes, 0, 0)
    
    const diffMs = dueDate.getTime() - now.getTime()
    return Math.floor(diffMs / 60000)
  }

  return (
    <div className={`bg-muted rounded-2xl p-4 mb-4 transition-all duration-500 ${isExpanded ? 'pb-6' : ''}`}>
      <button
        onClick={handleToggleExpand}
        className="w-full flex items-center justify-between mb-3 hover:opacity-70 transition-opacity"
      >
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Coming Up ({upcomingTasks.length})
        </h3>
        {isExpanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
      </button>
      
      <div 
        ref={scrollRef}
        className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 scrollbar-hide transition-all duration-500 cursor-pointer"
        style={{
          maxHeight: isExpanded ? '400px' : '100px',
          flexWrap: isExpanded ? 'wrap' : 'nowrap'
        }}
        onClick={(e) => {
          // Only expand/collapse if clicking on the container, not dragging
          if (!isDragging) {
            handleToggleExpand()
          }
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {upcomingTasks.map((task, index) => {
          const minutesUntilDue = task.due_time ? calculateMinutesUntilDue(task.due_time) : null
          const isOverdue = minutesUntilDue !== null && minutesUntilDue < 0
          
          // Match NOW card urgency colors for borders
          let borderColor = 'border-green-500' // Default green (on time)
          let iconColor = 'text-green-500'
          if (isOverdue && task.is_critical) {
            borderColor = 'border-red-600'
            iconColor = 'text-red-600'
          } else if (isOverdue) {
            borderColor = 'border-red-500'
            iconColor = 'text-red-500'
          } else if (minutesUntilDue !== null && minutesUntilDue < 15) {
            borderColor = 'border-yellow-500'
            iconColor = 'text-yellow-500'
          } else if (minutesUntilDue !== null && minutesUntilDue < 30) {
            borderColor = 'border-amber-500'
            iconColor = 'text-amber-500'
          }
          
          return (
            <div
              key={task.task_id}
              className={`bg-card rounded-xl sm:rounded-2xl shadow-sm border-2 ${borderColor} transition-colors duration-300 ${
                isAnimating ? 'animate-multiply' : ''
              } ${
                isExpanded 
                  ? 'w-[140px] sm:w-[160px] md:w-[180px] h-[140px] sm:h-[160px] md:h-[180px] p-3 sm:p-4 flex flex-col justify-center' 
                  : 'min-w-[160px] sm:min-w-[180px] md:min-w-[200px] h-[80px] sm:h-[90px] md:h-[100px] p-3 sm:p-4 shrink-0 flex flex-col justify-center'
              }`}
              style={{
                animationDelay: isAnimating ? `${index * 0.03}s` : '0s'
              }}
            >
              <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                <Clock className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${iconColor} shrink-0`} />
                <h4 className="font-semibold text-xs sm:text-sm text-foreground line-clamp-2">
                  {task.title}
                </h4>
              </div>
              <div className="flex items-start gap-2 mb-2">
                <p className={`text-xs font-medium uppercase tracking-wide ${iconColor}`}>
                  {isOverdue ? 'OVERDUE' : 'COMING UP'}
                </p>
                {task.is_critical && (
                  <div className={`${borderColor.replace('border-', 'bg-')}/10 px-2 py-0.5 rounded-full`}>
                    <p className={`text-[10px] font-bold ${iconColor}`}>CRITICAL</p>
                  </div>
                )}
              </div>
              
              <h3 className="text-sm font-bold mb-2 line-clamp-2 text-foreground">
                {task.title}
              </h3>
              
              {task.due_time && (() => {
                const minutesUntilDue = calculateMinutesUntilDue(task.due_time)
                let timeText = ''
                
                if (minutesUntilDue < 0) {
                  // Red: Overdue
                  const overdueMinutes = Math.abs(minutesUntilDue)
                  timeText = `${overdueMinutes} min overdue`
                } else if (minutesUntilDue < 30) {
                  // Amber/Yellow: Due soon
                  if (minutesUntilDue === 0) {
                    timeText = 'Due now'
                  } else {
                    timeText = `Due in ${minutesUntilDue} min`
                  }
                } else {
                  // Green: On time
                  timeText = `Due by ${task.due_time.slice(0, 5)}`
                }
                
                return (
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    {timeText}
                  </p>
                )
              })()}
            </div>
          )
        })}
      </div>
      
      <p className="text-center text-xs text-muted-foreground mt-3">
        {isExpanded ? 'Reference only • Drag to scroll • Click header to collapse' : 'Drag to scroll • Click header to expand'}
      </p>
    </div>
  )
}
