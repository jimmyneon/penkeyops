'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Trophy, Target, Zap } from 'lucide-react'

interface ProgressTrackerProps {
  sessionId: string
}

export function ProgressTracker({ sessionId }: ProgressTrackerProps) {
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    critical: 0,
    criticalDone: 0,
  })
  const supabase = createClient()

  useEffect(() => {
    loadStats()

    const channel = supabase
      .channel('progress_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'checklist_results' }, () => {
        loadStats()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId])

  const loadStats = async () => {
    const { data: instances } = await supabase
      .from('checklist_instances')
      .select(`
        checklist_results (
          status,
          template_items (
            is_critical
          )
        )
      `)
      .eq('shift_session_id', sessionId)
      .single()

    if (instances?.checklist_results) {
      const tasks = instances.checklist_results as any[]
      const completed = tasks.filter((t: any) => t.status === 'completed').length
      const critical = tasks.filter((t: any) => t.template_items.is_critical).length
      const criticalDone = tasks.filter(
        (t: any) => t.template_items.is_critical && t.status === 'completed'
      ).length

      setStats({
        total: tasks.length,
        completed,
        critical,
        criticalDone,
      })
    }
  }

  const percentage = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
  const criticalPercentage = stats.critical > 0 ? Math.round((stats.criticalDone / stats.critical) * 100) : 0

  return (
    <div className="bg-card rounded-2xl p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Your Progress
        </h3>
        <span className="text-2xl font-bold text-primary">{percentage}%</span>
      </div>

      {/* Overall Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Overall</span>
          <span>{stats.completed} of {stats.total} tasks</span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Critical Tasks Progress */}
      {stats.critical > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3 text-destructive" />
              Critical Tasks
            </span>
            <span>{stats.criticalDone} of {stats.critical}</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-destructive transition-all duration-500"
              style={{ width: `${criticalPercentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Achievement Messages */}
      {percentage === 100 && (
        <div className="bg-accent/10 border-2 border-accent rounded-xl p-3 flex items-center gap-3">
          <Trophy className="h-8 w-8 text-accent" />
          <div>
            <p className="font-bold text-accent">Perfect Shift!</p>
            <p className="text-xs text-accent/80">All tasks completed</p>
          </div>
        </div>
      )}
      {percentage >= 75 && percentage < 100 && (
        <div className="bg-blue-50 rounded-xl p-3 flex items-center gap-3">
          <Target className="h-6 w-6 text-blue-600" />
          <p className="text-sm font-medium text-blue-900">Almost there! Keep going</p>
        </div>
      )}
      {percentage >= 50 && percentage < 75 && (
        <div className="bg-orange-50 rounded-xl p-3 flex items-center gap-3">
          <Zap className="h-6 w-6 text-orange-600" />
          <p className="text-sm font-medium text-orange-900">Great progress!</p>
        </div>
      )}
    </div>
  )
}
