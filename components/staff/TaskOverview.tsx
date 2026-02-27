'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Clock, CheckCircle2, Circle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Task {
  task_id: string
  title: string
  due_time: string | null
  priority: string
  is_critical: boolean
  status: string
  sort_order: number
}

interface TaskOverviewProps {
  sessionId: string
  onClose: () => void
  initialTaskId?: string
}

export function TaskOverview({ sessionId, onClose, initialTaskId }: TaskOverviewProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    loadAllTasks()
  }, [sessionId])

  useEffect(() => {
    if (tasks.length > 0 && !selectedTask) {
      const initial = initialTaskId 
        ? tasks.find(t => t.task_id === initialTaskId) 
        : tasks.find(t => t.status === 'pending')
      setSelectedTask(initial || tasks[0])
    }
  }, [tasks, initialTaskId, selectedTask])

  const loadAllTasks = async () => {
    const { data, error } = await supabase
      .from('checklist_results')
      .select(`
        id,
        status,
        template_item:template_items (
          title,
          due_time,
          priority,
          is_critical,
          sort_order
        )
      `)
      .eq('checklist_instance_id', (
        await supabase
          .from('checklist_instances')
          .select('id')
          .eq('shift_session_id', sessionId)
          .single()
      ).data?.id)
      .order('template_item(sort_order)')

    if (error) {
      console.error('Error loading tasks:', error)
      return
    }

    const formattedTasks = data?.map((item: any) => ({
      task_id: item.id,
      title: item.template_item.title,
      due_time: item.template_item.due_time,
      priority: item.template_item.priority,
      is_critical: item.template_item.is_critical,
      status: item.status,
      sort_order: item.template_item.sort_order
    })) || []

    setTasks(formattedTasks)

    // Find initial task index
    if (initialTaskId) {
      const index = formattedTasks.findIndex((t: Task) => t.task_id === initialTaskId)
      if (index !== -1) setCurrentIndex(index)
    }
  }

  // Mouse drag handlers
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

  const handleMouseLeave = () => {
    setIsDragging(false)
  }

  const getTaskColor = (task: Task) => {
    if (task.status === 'completed') return 'bg-teal-500'
    if (task.is_critical) return 'bg-primary'
    if (task.priority === 'P1') return 'bg-orange-400'
    if (task.priority === 'P2') return 'bg-amber-400'
    return 'bg-gray-400'
  }

  const getStatusIcon = (task: Task) => {
    if (task.status === 'completed') {
      return <CheckCircle2 className="h-6 w-6 text-white" />
    }
    return <Circle className="h-6 w-6 text-white" />
  }

  if (tasks.length === 0 || !selectedTask) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-gray-900 to-black z-50 flex flex-col animate-bubble-expand">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/30 backdrop-blur-sm border-b border-white/10">
        <div className="text-white">
          <p className="text-lg font-bold">Today&apos;s Timeline</p>
          <p className="text-sm opacity-75">{tasks.length} tasks • {tasks.filter(t => t.status === 'completed').length} completed</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded-xl transition-colors"
        >
          <X className="h-6 w-6 text-white" />
        </button>
      </div>

      {/* Timeline - Horizontal scrollable bubbles */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-x-auto overflow-y-hidden px-8 py-12 cursor-grab active:cursor-grabbing"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <div className="flex items-center gap-4 min-w-max">
          {tasks.map((task, index) => {
            const isSelected = task.task_id === selectedTask.task_id
            const size = isSelected ? 'w-32 h-32' : 'w-20 h-20'
            
            return (
              <div
                key={task.task_id}
                className="flex flex-col items-center gap-2 animate-float"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div
                  className={`${size} ${getTaskColor(task)} rounded-full shadow-2xl flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-110 ${
                    isSelected ? 'ring-4 ring-white/50 scale-110' : ''
                  }`}
                  onClick={() => setSelectedTask(task)}
                >
                  {getStatusIcon(task)}
                </div>
                {task.due_time && (
                  <div className="text-white/70 text-xs font-medium">
                    {task.due_time.slice(0, 5)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Selected task detail card */}
      <div className="bg-white rounded-t-3xl p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-12 h-12 ${getTaskColor(selectedTask)} rounded-full flex items-center justify-center`}>
            {getStatusIcon(selectedTask)}
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-foreground">{selectedTask.title}</h3>
            {selectedTask.due_time && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <Clock className="h-4 w-4" />
                <span>Due: {selectedTask.due_time.slice(0, 5)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedTask.is_critical && (
            <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">
              CRITICAL
            </span>
          )}
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
            selectedTask.priority === 'P1' ? 'bg-orange-100 text-orange-700' :
            selectedTask.priority === 'P2' ? 'bg-amber-100 text-amber-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {selectedTask.priority}
          </span>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
            selectedTask.status === 'completed' ? 'bg-teal-100 text-teal-700' :
            selectedTask.status === 'pending' ? 'bg-blue-100 text-blue-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {selectedTask.status.toUpperCase()}
          </span>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Click bubbles or drag timeline to browse
        </p>
      </div>
    </div>
  )
}
