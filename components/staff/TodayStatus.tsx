'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, Clock, Circle } from 'lucide-react'

interface PhaseStatus {
  phase: string
  label: string
  status: 'complete' | 'in_progress' | 'pending'
}

interface TodayStatusProps {
  sessionId: string | null
}

export function TodayStatus({ sessionId }: TodayStatusProps) {
  const [phases, setPhases] = useState<PhaseStatus[]>([
    { phase: 'opening', label: 'Opening', status: 'pending' },
    { phase: 'safety', label: 'Safety', status: 'pending' },
    { phase: 'closing', label: 'Closing', status: 'pending' }
  ])
  const supabase = createClient()

  useEffect(() => {
    if (!sessionId) return

    loadPhaseStatus()

    const channel = supabase
      .channel('phase_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'checklist_results' }, () => {
        loadPhaseStatus()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId])

  const loadPhaseStatus = async () => {
    if (!sessionId) return

    const { data: results } = await supabase
      .from('checklist_results')
      .select(`
        status,
        template_items!inner(
          linked_group_id,
          is_critical
        ),
        checklist_instances!inner(
          shift_session_id
        )
      `)
      .eq('checklist_instances.shift_session_id', sessionId)

    if (!results) return

    const updated = phases.map(phase => {
      const phaseTasks = results.filter((r: any) => 
        r.template_items?.linked_group_id?.toLowerCase().includes(phase.phase)
      )
      
      if (phaseTasks.length === 0) return phase

      const allComplete = phaseTasks.every((t: any) => t.status === 'completed')
      const anyInProgress = phaseTasks.some((t: any) => t.status === 'in_progress')

      return {
        ...phase,
        status: allComplete ? 'complete' : anyInProgress ? 'in_progress' : 'pending'
      }
    })

    setPhases(updated)
  }

  if (!sessionId) return null

  return (
    <div className="bg-card rounded-xl p-3 mb-4 shadow-sm">
      <div className="flex items-center justify-center gap-6">
        {phases.map((phase) => (
          <div key={phase.phase} className="flex items-center gap-2">
            {phase.status === 'complete' ? (
              <CheckCircle2 className="h-5 w-5 text-accent" />
            ) : phase.status === 'in_progress' ? (
              <Clock className="h-5 w-5 text-primary" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground" />
            )}
            <span className={`text-sm font-medium ${
              phase.status === 'complete' ? 'text-accent' :
              phase.status === 'in_progress' ? 'text-primary' :
              'text-muted-foreground'
            }`}>
              {phase.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
