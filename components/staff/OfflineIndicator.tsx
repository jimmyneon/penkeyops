'use client'

import { useOfflineSync } from '@/hooks/useOfflineSync'
import { WifiOff, Wifi, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function OfflineIndicator() {
  const { isOnline, queueCount, syncing, syncQueue } = useOfflineSync()

  if (isOnline && queueCount === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white rounded-xl shadow-lg p-4 max-w-sm">
        <div className="flex items-center gap-3">
          {isOnline ? (
            <Wifi className="h-5 w-5 text-green-600" />
          ) : (
            <WifiOff className="h-5 w-5 text-red-600" />
          )}
          <div className="flex-1">
            <p className="font-medium text-sm">
              {isOnline ? 'Back Online' : 'Offline Mode'}
            </p>
            {queueCount > 0 && (
              <p className="text-xs text-gray-600">
                {queueCount} action{queueCount !== 1 ? 's' : ''} queued
              </p>
            )}
          </div>
          {isOnline && queueCount > 0 && (
            <Button
              size="sm"
              onClick={syncQueue}
              disabled={syncing}
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
