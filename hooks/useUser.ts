import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { Database } from '@/types/database'

type UserProfile = Database['public']['Tables']['users']['Row']

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    let cancelled = false
    
    async function loadUser() {
      try {
        console.log('Loading user...')
        const { data: { user } } = await supabase.auth.getUser()
        console.log('Got user:', user?.email)
        
        if (cancelled) return
        setUser(user)

        if (user) {
          console.log('Loading profile for user:', user.id)
          const { data: profile, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single()
          
          console.log('Got profile:', profile, 'Error:', error)
          if (cancelled) return
          setProfile(profile)
        }
      } catch (error) {
        console.error('Error loading user:', error)
      } finally {
        if (!cancelled) {
          console.log('Setting loading to false')
          setLoading(false)
        }
      }
    }

    loadUser()

    return () => {
      cancelled = true
    }
  }, [])

  return { user, profile, loading, isAdmin: profile?.role === 'admin' }
}
