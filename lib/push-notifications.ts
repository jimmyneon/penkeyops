import { createClient } from '@/lib/supabase/client'

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications')
    return false
  }

  if (Notification.permission === 'granted') {
    return true
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }

  return false
}

export async function subscribeToPushNotifications(userId: string): Promise<boolean> {
  try {
    const hasPermission = await requestNotificationPermission()
    if (!hasPermission) {
      return false
    }

    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported')
      return false
    }

    const registration = await navigator.serviceWorker.ready
    
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapidPublicKey) {
      console.error('VAPID public key not configured')
      return false
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource
    })

    const supabase = createClient()
    await supabase.from('push_subscriptions').upsert({
      user_id: userId,
      subscription: subscription.toJSON(),
      is_active: true
    })

    return true
  } catch (error) {
    console.error('Error subscribing to push notifications:', error)
    return false
  }
}

export async function unsubscribeFromPushNotifications(userId: string): Promise<void> {
  try {
    if (!('serviceWorker' in navigator)) return

    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    
    if (subscription) {
      await subscription.unsubscribe()
    }

    const supabase = createClient()
    await supabase
      .from('push_subscriptions')
      .update({ is_active: false })
      .eq('user_id', userId)
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error)
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function addJitter(minutes: number): number {
  const jitterRange = Math.min(5, Math.floor(minutes * 0.1))
  const jitter = Math.floor(Math.random() * (jitterRange * 2 + 1)) - jitterRange
  return minutes + jitter
}
