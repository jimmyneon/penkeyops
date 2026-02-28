'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ShiftControlsProps {
  siteId: string
  userId: string
  activeSession: any
  onSessionChange: () => void
}

export function ShiftControls({ siteId, userId, activeSession, onSessionChange }: ShiftControlsProps) {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const getShiftType = (): 'opening' | 'closing' | 'mid' => {
    const hour = new Date().getHours()
    if (hour < 14) return 'opening'
    if (hour < 18) return 'mid'
    return 'closing'
  }

  const startShift = async () => {
    setLoading(true)
    const shiftType = getShiftType()
    try {
      const { data: session, error } = await supabase
        .from('shift_sessions')
        .insert({
          site_id: siteId,
          started_by: userId,
          shift_type: shiftType,
        })
        .select()
        .single()

      if (error) throw error

      if (session) {
        const { data: templates } = await supabase
          .from('templates')
          .select('id')
          .eq('template_type', shiftType)
          .eq('is_active', true)
          .or(`site_id.eq.${siteId},site_id.is.null`)

        if (templates && templates.length > 0) {
          console.log(`Creating checklists for ${templates.length} templates`)
          for (const template of templates) {
            console.log('Calling create_checklist_from_template with:', {
              session_id: session.id,
              template_id: template.id
            })
            const { data, error } = await supabase.rpc('create_checklist_from_template', {
              p_shift_session_id: session.id,
              p_template_id: template.id,
            })
            if (error) {
              console.error('RPC Error creating checklist:', error)
            } else {
              console.log('Checklist created successfully:', data)
            }
          }
        } else {
          console.log('No templates found for shift type:', shiftType)
        }
      }

      onSessionChange()
    } catch (error) {
      console.error('Error starting shift:', error)
    } finally {
      setLoading(false)
    }
  }

  const completeShift = async () => {
    if (!activeSession) return

    setLoading(true)
    try {
      const { data: canComplete } = await supabase.rpc('can_complete_shift', {
        session_id: activeSession.id,
      })

      if (!canComplete) {
        alert('Cannot complete shift - critical tasks are still incomplete')
        setLoading(false)
        return
      }

      await supabase
        .from('shift_sessions')
        .update({
          completed_by: userId,
          completed_at: new Date().toISOString(),
          is_complete: true,
        })
        .eq('id', activeSession.id)

      onSessionChange()
    } catch (error) {
      console.error('Error completing shift:', error)
    } finally {
      setLoading(false)
    }
  }

  if (activeSession) {
    return (
      <button 
        onClick={completeShift}
        disabled={loading}
        className="aspect-square bg-green-500 hover:bg-green-600 active:bg-green-700 rounded-xl p-2 lg:p-1.5 flex flex-col items-center justify-center transition-colors disabled:opacity-50"
      >
        <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse mb-1" />
        <p className="text-xs lg:text-[9px] font-bold text-white capitalize">{activeSession.shift_type}</p>
        <p className="text-[10px] lg:text-[8px] text-white/80 mt-0.5">
          {new Date(activeSession.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </button>
    )
  }

  const currentShiftType = getShiftType()
  
  return (
    <button
      type="button"
      onClick={startShift}
      disabled={loading}
      className="aspect-square bg-primary hover:bg-primary/90 active:bg-primary/80 rounded-xl p-2 lg:p-1.5 flex flex-col items-center justify-center transition-colors disabled:opacity-50"
    >
      <p className="text-xs lg:text-[9px] font-bold text-primary-foreground capitalize">{currentShiftType}</p>
      <p className="text-[10px] lg:text-[8px] text-primary-foreground/80 mt-0.5">Start</p>
    </button>
  )
}
