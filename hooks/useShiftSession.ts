import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database'

type ShiftSession = Database['public']['Tables']['shift_sessions']['Row']

export function useShiftSession(siteId: string | null) {
  const [session, setSession] = useState<ShiftSession | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const getActiveSession = async () => {
    if (!siteId) {
      setLoading(false)
      return
    }

    // First try to get an incomplete session
    const { data: activeData, error: activeError } = await supabase
      .from('shift_sessions')
      .select('*')
      .eq('site_id', siteId)
      .eq('is_complete', false)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (activeError) {
      console.error('Error loading shift session:', activeError)
    }

    // If no active session, get the most recent completed session (for today)
    if (!activeData) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const { data: completedData, error: completedError } = await supabase
        .from('shift_sessions')
        .select('*')
        .eq('site_id', siteId)
        .eq('is_complete', true)
        .gte('started_at', today.toISOString())
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (completedError) {
        console.error('Error loading completed session:', completedError)
      }

      setSession(completedData)
    } else {
      setSession(activeData)
    }

    setLoading(false)
  }

  useEffect(() => {
    if (!siteId) {
      setLoading(false)
      return
    }

    getActiveSession()

    const channel = supabase
      .channel('shift_sessions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shift_sessions',
          filter: `site_id=eq.${siteId}`,
        },
        () => {
          getActiveSession()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [siteId])

  return { session, loading, refreshSession: getActiveSession }
}
