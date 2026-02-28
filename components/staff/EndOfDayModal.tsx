'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, CheckCircle2, AlertCircle, XCircle } from 'lucide-react'

interface EndOfDaySummary {
  score: number
  green_count: number
  amber_count: number
  red_count: number
  total_tasks: number
  opening_status: string
  safety_status: string
  closing_status: string
  late_tasks: Array<{
    title: string
    status: string
    priority: string
    is_critical: boolean
    due_time: string
    completed_at?: string
  }>
  shift_label: string
}

interface EndOfDayModalProps {
  sessionId: string
  onClose: () => void
  onConfirmEnd: () => void
}

export function EndOfDayModal({ sessionId, onClose, onConfirmEnd }: EndOfDayModalProps) {
  const [summary, setSummary] = useState<EndOfDaySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const loadSummary = async () => {
      const { data, error } = await supabase.rpc('get_end_of_day_summary', {
        p_session_id: sessionId
      })

      if (error) {
        console.error('Error loading summary:', error)
        setLoading(false)
        return
      }

      setSummary(data?.[0] || null)
      setLoading(false)
    }

    loadSummary()
  }, [sessionId])

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 75) return 'text-amber-600'
    return 'text-red-600'
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 90) return 'bg-green-50 border-green-200'
    if (score >= 75) return 'bg-amber-50 border-amber-200'
    return 'bg-red-50 border-red-200'
  }

  const getStatusIcon = (status: string) => {
    if (status === '✓') return <CheckCircle2 className="h-5 w-5 text-green-600" />
    if (status === '⚠️') return <AlertCircle className="h-5 w-5 text-amber-600" />
    return <XCircle className="h-5 w-5 text-red-600" />
  }

  const getTaskStatusBadge = (status: string) => {
    switch (status) {
      case 'missed':
        return <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 font-medium">Missed</span>
      case 'late':
        return <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 font-medium">Late</span>
      case 'grace':
        return <span className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-700 font-medium">Grace</span>
      case 'blocked':
        return <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700 font-medium">Blocked</span>
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8 max-w-lg w-full">
          <div className="text-center text-muted-foreground">Calculating shift summary...</div>
        </div>
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8 max-w-lg w-full">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">Unable to load summary</p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-muted text-foreground rounded-xl font-medium hover:bg-muted/80"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-lg w-full">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-2xl font-bold text-foreground">Shift Complete</h2>
          <button
            onClick={() => {
              onConfirmEnd()
              onClose()
            }}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Simple Score Display */}
        <div className="text-center">
          <div className="text-7xl mb-3">🎉</div>
          <p className="text-base text-muted-foreground mb-3">Your Shift Score</p>
          <p className={`text-7xl font-bold ${getScoreColor(summary.score)} mb-3`}>
            {summary.score}
          </p>
          <p className="text-lg text-muted-foreground">
            {summary.score >= 90 ? 'Excellent work!' : summary.score >= 75 ? 'Great job!' : 'Well done!'}
          </p>
        </div>

      </div>
    </div>
  )
}
