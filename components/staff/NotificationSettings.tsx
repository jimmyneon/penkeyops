'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Bell, BellOff } from 'lucide-react'
import { subscribeToPushNotifications, unsubscribeFromPushNotifications } from '@/lib/push-notifications'

interface NotificationSettingsProps {
  userId: string
}

export function NotificationSettings({ userId }: NotificationSettingsProps) {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    checkSubscriptionStatus()
  }, [])

  const checkSubscriptionStatus = async () => {
    if ('Notification' in window) {
      setIsSubscribed(Notification.permission === 'granted')
    }
  }

  const handleSubscribe = async () => {
    setLoading(true)
    const success = await subscribeToPushNotifications(userId)
    setIsSubscribed(success)
    setLoading(false)
    
    if (success) {
      alert('Push notifications enabled! You\'ll receive reminders for overdue tasks.')
    } else {
      alert('Failed to enable notifications. Please check your browser settings.')
    }
  }

  const handleUnsubscribe = async () => {
    setLoading(true)
    await unsubscribeFromPushNotifications(userId)
    setIsSubscribed(false)
    setLoading(false)
    alert('Push notifications disabled.')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Bell className="mr-2 h-5 w-5" />
          Push Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">
          Get reminders when tasks become overdue. Notifications are sent with a random delay to avoid overwhelming you.
        </p>
        
        {isSubscribed ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-green-600">
              <Bell className="h-5 w-5" />
              <span className="font-medium">Notifications enabled</span>
            </div>
            <Button
              variant="outline"
              onClick={handleUnsubscribe}
              disabled={loading}
            >
              <BellOff className="h-4 w-4 mr-2" />
              {loading ? 'Disabling...' : 'Disable Notifications'}
            </Button>
          </div>
        ) : (
          <Button
            onClick={handleSubscribe}
            disabled={loading}
          >
            <Bell className="h-4 w-4 mr-2" />
            {loading ? 'Enabling...' : 'Enable Push Notifications'}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
