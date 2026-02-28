import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from './useUser'

interface Site {
  id: string
  name: string
}

export function useAdminSite() {
  const { profile, isAdmin } = useUser()
  const [sites, setSites] = useState<Site[]>([])
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadSites()
  }, [profile, isAdmin])

  const loadSites = async () => {
    if (!profile) {
      setLoading(false)
      return
    }

    // If user has a site_id assigned, use that
    if (profile.site_id) {
      setSelectedSiteId(profile.site_id)
      setLoading(false)
      return
    }

    // If admin without site_id, load all sites
    if (isAdmin) {
      const { data } = await supabase
        .from('sites')
        .select('id, name')
        .eq('is_active', true)
        .order('name')

      if (data && data.length > 0) {
        const typedSites = data as Site[]
        setSites(typedSites)
        setSelectedSiteId(typedSites[0].id)
      }
    }
    
    setLoading(false)
  }

  return {
    sites,
    selectedSiteId,
    setSelectedSiteId,
    loading,
    hasSite: !!selectedSiteId
  }
}
