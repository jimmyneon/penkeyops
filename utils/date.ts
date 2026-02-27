import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from 'date-fns'

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'PPp')
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'PP')
}

export function formatTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'p')
}

export function formatRelative(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  
  if (isToday(d)) {
    return `Today at ${format(d, 'p')}`
  }
  
  if (isYesterday(d)) {
    return `Yesterday at ${format(d, 'p')}`
  }
  
  return formatDistanceToNow(d, { addSuffix: true })
}

export function addJitter(minutes: number, minJitter = 3, maxJitter = 12): number {
  const jitter = Math.floor(Math.random() * (maxJitter - minJitter + 1)) + minJitter
  return minutes + jitter
}
