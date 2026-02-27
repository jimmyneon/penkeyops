import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { processOfflineQueue, getQueueCount } from '@/lib/offline-queue'

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(true)
  const [queueCount, setQueueCount] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine)
      if (navigator.onLine) {
        syncQueue()
      }
    }

    setIsOnline(navigator.onLine)
    setQueueCount(getQueueCount())

    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [])

  const syncQueue = async () => {
    if (syncing) return
    
    setSyncing(true)
    const result = await processOfflineQueue(async (action) => {
      try {
        switch (action.type) {
          case 'complete_task':
            await supabase
              .from('checklist_results')
              .update({
                status: 'completed',
                completed_at: action.data.completed_at,
                completed_by: action.data.completed_by,
                evidence_data: action.data.evidence_data,
                notes: action.data.notes
              })
              .eq('id', action.data.id)
            return true

          case 'block_task':
            await supabase
              .from('checklist_results')
              .update({
                status: 'blocked',
                blocked_reason: action.data.blocked_reason,
                notes: action.data.notes
              })
              .eq('id', action.data.id)
            return true

          case 'log_temperature':
          case 'log_delivery':
          case 'log_waste':
            await supabase.from('log_entries').insert(action.data)
            return true

          case 'log_incident':
            await supabase.from('incidents').insert(action.data)
            return true

          default:
            return false
        }
      } catch (error) {
        console.error('Sync error:', error)
        return false
      }
    })

    setQueueCount(getQueueCount())
    setSyncing(false)

    if (result.processed > 0) {
      console.log(`Synced ${result.processed} queued actions`)
    }
  }

  return {
    isOnline,
    queueCount,
    syncing,
    syncQueue
  }
}
