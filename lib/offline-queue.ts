interface QueuedAction {
  id: string
  type: 'complete_task' | 'block_task' | 'log_temperature' | 'log_incident' | 'log_delivery' | 'log_waste'
  data: any
  timestamp: number
}

const QUEUE_KEY = 'penkey_offline_queue'

export function addToOfflineQueue(type: QueuedAction['type'], data: any): void {
  const queue = getOfflineQueue()
  const action: QueuedAction = {
    id: `${Date.now()}-${Math.random()}`,
    type,
    data,
    timestamp: Date.now()
  }
  queue.push(action)
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

export function getOfflineQueue(): QueuedAction[] {
  if (typeof window === 'undefined') return []
  const stored = localStorage.getItem(QUEUE_KEY)
  return stored ? JSON.parse(stored) : []
}

export function removeFromQueue(id: string): void {
  const queue = getOfflineQueue()
  const filtered = queue.filter(item => item.id !== id)
  localStorage.setItem(QUEUE_KEY, JSON.stringify(filtered))
}

export function clearOfflineQueue(): void {
  localStorage.removeItem(QUEUE_KEY)
}

export async function processOfflineQueue(
  processor: (action: QueuedAction) => Promise<boolean>
): Promise<{ processed: number; failed: number }> {
  const queue = getOfflineQueue()
  let processed = 0
  let failed = 0

  for (const action of queue) {
    try {
      const success = await processor(action)
      if (success) {
        removeFromQueue(action.id)
        processed++
      } else {
        failed++
      }
    } catch (error) {
      console.error('Error processing queued action:', error)
      failed++
    }
  }

  return { processed, failed }
}

export function getQueueCount(): number {
  return getOfflineQueue().length
}
