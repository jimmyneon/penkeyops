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

    const { data, error } = await supabase
      .from('shift_sessions')
      .select('*')
      .eq('site_id', siteId)
      .eq('is_complete', false)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Error loading shift session:', error)
    }

    setSession(data)
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
