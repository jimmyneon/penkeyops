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

  const loadUpcoming = async () => {
    if (!sessionId) return

    const { data, error } = await supabase.rpc('get_coming_up_tasks', {
      p_session_id: sessionId,
      p_limit: 4
    })

    if (error) {
      console.error('Error loading upcoming tasks:', error)
      return
    }

    setUpcomingTasks(data || [])
  }

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
      setIsAnimating(true)
      setTimeout(() => setIsAnimating(false), 300)
    }
    setIsExpanded(!isExpanded)
  }

  if (!sessionId || upcomingTasks.length === 0) {
    return null
  }

  const getTaskUrgencyColor = (task: any) => {
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
        className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide transition-all duration-500 cursor-grab active:cursor-grabbing"
        style={{
          maxHeight: isExpanded ? '400px' : '120px',
          flexWrap: isExpanded ? 'wrap' : 'nowrap'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {upcomingTasks.map((task, index) => (
          <div
            key={task.task_id}
            className={`rounded-xl p-3 shadow-sm border transition-all duration-300 ${
              isAnimating ? 'animate-multiply' : ''
            } ${
              isExpanded 
                ? 'w-[180px] h-[180px] flex flex-col justify-center hover:scale-110 cursor-pointer' 
                : 'min-w-[200px] shrink-0 hover:scale-105 cursor-pointer'
            } ${getTaskUrgencyColor(task)}`}
            style={{
              animationDelay: isAnimating ? `${index * 0.03}s` : '0s'
            }}
          >
            {isExpanded ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className={`w-16 h-16 rounded-full mb-2 flex items-center justify-center ${
                  task.is_critical ? 'bg-primary' : 'bg-accent'
                }`}>
                  <Clock className="h-8 w-8 text-white" />
                </div>
                <p className={`text-xs font-bold line-clamp-2 mb-1 ${
                  task.is_critical ? 'text-primary' : 'text-foreground'
                }`}>
                  {task.title}
                </p>
                {task.due_time && (
                  <p className="text-xs text-muted-foreground font-medium">
                    {task.due_time.slice(0, 5)}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex items-start gap-2 mb-1">
                <Clock className={`h-4 w-4 mt-0.5 shrink-0 ${
                  task.is_critical ? 'text-primary' : 'text-muted-foreground'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium line-clamp-2 ${
                    task.is_critical ? 'text-primary' : 'text-foreground'
                  }`}>
                    {task.title}
                  </p>
                  {task.due_time && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {task.due_time.slice(0, 5)}
                    </p>
                  )}
                </div>
              </div>
            )}
            {!isExpanded && task.is_critical && (
              <span className="inline-block bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full font-medium mt-1">
                Critical
              </span>
            )}
          </div>
        ))}
      </div>
      
      <p className="text-center text-xs text-muted-foreground mt-3">
        {isExpanded ? 'Drag to scroll • Click header to collapse' : 'Drag to scroll • Click header to expand'}
      </p>
    </div>
  )
}
