'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/hooks/useUser'
import { useAdminSite } from '@/hooks/useAdminSite'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TrendingUp, CheckCircle, Clock, AlertTriangle, Target, BarChart3 } from 'lucide-react'
import { AdminNav } from '@/components/admin/AdminNav'

interface ComplianceMetrics {
  totalTasks: number
  completedOnTime: number
  completedLate: number
  completedEarly: number
  skipped: number
  complianceScore: number
}

interface DayMetrics extends ComplianceMetrics {
  date: string
  shiftType: string
}

interface TaskAnalytics {
  taskTitle: string
  totalAttempts: number
  lateCount: number
  skippedCount: number
  latePercentage: number
  isCritical: boolean
}

interface TimePattern {
  hour: number
  completionRate: number
  avgDelay: number
  taskCount: number
}

interface CompletionTimeStats {
  avgMinutesEarly: number
  avgMinutesLate: number
  fastestTask: string
  slowestTask: string
}

interface TrendComparison {
  thisWeekAvg: number
  lastWeekAvg: number
  thisMonthAvg: number
  lastMonthAvg: number
  weekChange: number
  monthChange: number
}

interface Insight {
  type: 'warning' | 'success' | 'info'
  title: string
  description: string
  action?: string
}

export default function AnalyticsPage() {
  const { user, profile, loading: userLoading, isAdmin } = useUser()
  const { selectedSiteId } = useAdminSite()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'yesterday' | 'week' | 'month'>('week')
  const [todayMetrics, setTodayMetrics] = useState<ComplianceMetrics | null>(null)
  const [yesterdayMetrics, setYesterdayMetrics] = useState<ComplianceMetrics | null>(null)
  const [weekMetrics, setWeekMetrics] = useState<DayMetrics[]>([])
  const [monthMetrics, setMonthMetrics] = useState<DayMetrics[]>([])
  const [avgScore, setAvgScore] = useState(0)
  const [totalTasksMonth, setTotalTasksMonth] = useState(0)
  const [taskAnalytics, setTaskAnalytics] = useState<TaskAnalytics[]>([])
  const [criticalTaskScore, setCriticalTaskScore] = useState(0)
  const [insights, setInsights] = useState<Insight[]>([])
  const [timePatterns, setTimePatterns] = useState<TimePattern[]>([])
  const [completionStats, setCompletionStats] = useState<CompletionTimeStats | null>(null)
  const [trendComparison, setTrendComparison] = useState<TrendComparison | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (selectedSiteId) {
      loadAnalytics()
    }
  }, [selectedSiteId])

  const loadAnalytics = async () => {
    if (!selectedSiteId) {
      console.log('Analytics: No selectedSiteId, skipping load')
      return
    }

    console.log('Analytics: Loading for site:', selectedSiteId)
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      const weekAgo = new Date(today)
      weekAgo.setDate(weekAgo.getDate() - 7)

      const monthAgo = new Date(today)
      monthAgo.setDate(monthAgo.getDate() - 30)

      const [todayData, yesterdayData, weekData, monthData] = await Promise.all([
        calculateMetrics(today, new Date()),
        calculateMetrics(yesterday, today),
        loadWeekData(weekAgo, new Date()),
        loadWeekData(monthAgo, new Date())
      ])

      console.log('Analytics: Data loaded successfully')
      setTodayMetrics(todayData)
      setYesterdayMetrics(yesterdayData)
      setWeekMetrics(weekData)
      setMonthMetrics(monthData)
      
      const avgMonthScore = monthData.reduce((sum, day) => sum + day.complianceScore, 0) / (monthData.length || 1)
      setAvgScore(Math.round(avgMonthScore))
      
      const totalTasks = monthData.reduce((sum, day) => sum + day.totalTasks, 0)
      setTotalTasksMonth(totalTasks)
      
      // Load detailed analytics
      const [taskStats, criticalScore, generatedInsights, patterns, compStats, trends] = await Promise.all([
        loadTaskAnalytics(monthAgo, new Date()),
        loadCriticalTaskScore(monthAgo, new Date()),
        generateInsights(monthData, avgMonthScore),
        loadTimePatterns(monthAgo, new Date()),
        loadCompletionTimeStats(monthAgo, new Date()),
        calculateTrendComparisons(monthData)
      ])
      
      setTaskAnalytics(taskStats)
      setCriticalTaskScore(criticalScore)
      setInsights(generatedInsights)
      setTimePatterns(patterns)
      setCompletionStats(compStats)
      setTrendComparison(trends)
      
      setLoading(false)
    } catch (error) {
      console.error('Analytics: Error loading data:', error)
      setLoading(false)
    }
  }

  const calculateMetrics = async (startDate: Date, endDate: Date): Promise<ComplianceMetrics> => {
    const { data: sessions } = await supabase
      .from('shift_sessions')
      .select(`
        id,
        started_at,
        checklist_instances (
          id,
          checklist_results (
            id,
            status,
            completed_at,
            template_item_id,
            template_items (
              due_time,
              grace_period_minutes,
              is_critical
            )
          )
        )
      `)
      .eq('site_id', selectedSiteId)
      .gte('started_at', startDate.toISOString())
      .lt('started_at', endDate.toISOString())

    let totalTasks = 0
    let completedOnTime = 0
    let completedLate = 0
    let completedEarly = 0
    let skipped = 0

    sessions?.forEach((session: Record<string, unknown>) => {
      const instances = session.checklist_instances as Record<string, unknown>[] | undefined
      instances?.forEach((instance: Record<string, unknown>) => {
        const results = instance.checklist_results as Record<string, unknown>[] | undefined
        results?.forEach((result: Record<string, unknown>) => {
          totalTasks++

          if (result.status === 'skipped') {
            skipped++
            return
          }

          if (result.status !== 'completed' || !result.completed_at) return

          const templateItem = result.template_items as Record<string, unknown> | undefined
          const dueTimeStr = templateItem?.due_time as string | undefined
          if (!dueTimeStr) {
            completedOnTime++
            return
          }

          const sessionDate = new Date(session.started_at as string)
          const [hours, minutes] = dueTimeStr.split(':').map(Number)
          const dueTime = new Date(sessionDate)
          dueTime.setHours(hours, minutes, 0, 0)

          const graceTime = new Date(dueTime)
          graceTime.setMinutes(graceTime.getMinutes() + ((templateItem?.grace_period_minutes as number) || 0))

          const completedTime = new Date(result.completed_at as string)

          if (completedTime <= dueTime) {
            completedEarly++
          } else if (completedTime <= graceTime) {
            completedOnTime++
          } else {
            completedLate++
          }
        })
      })
    })

    const onTimeCount = completedEarly + completedOnTime
    const complianceScore = totalTasks > 0 
      ? Math.round(((onTimeCount / totalTasks) * 100))
      : 100

    return {
      totalTasks,
      completedOnTime,
      completedLate,
      completedEarly,
      skipped,
      complianceScore
    }
  }

  const loadWeekData = async (startDate: Date, endDate: Date): Promise<DayMetrics[]> => {
    const days: DayMetrics[] = []
    const current = new Date(startDate)

    while (current < endDate) {
      const dayStart = new Date(current)
      const dayEnd = new Date(current)
      dayEnd.setDate(dayEnd.getDate() + 1)

      const { data: sessions } = await supabase
        .from('shift_sessions')
        .select('shift_type')
        .eq('site_id', selectedSiteId)
        .gte('started_at', dayStart.toISOString())
        .lt('started_at', dayEnd.toISOString())
        .limit(1)

      const metrics = await calculateMetrics(dayStart, dayEnd)
      
      days.push({
        ...metrics,
        date: dayStart.toISOString().split('T')[0],
        shiftType: (sessions?.[0] as Record<string, unknown>)?.shift_type as string || 'No shift'
      })

      current.setDate(current.getDate() + 1)
    }

    return days.reverse()
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 75) return 'text-amber-600'
    return 'text-red-600'
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 90) return 'bg-green-50'
    if (score >= 75) return 'bg-amber-50'
    return 'bg-red-50'
  }

  const loadTaskAnalytics = async (startDate: Date, endDate: Date): Promise<TaskAnalytics[]> => {
    const { data: sessions } = await supabase
      .from('shift_sessions')
      .select(`
        checklist_instances (
          checklist_results (
            status,
            template_items (
              title,
              is_critical
            )
          )
        )
      `)
      .eq('site_id', selectedSiteId || '')
      .gte('started_at', startDate.toISOString())
      .lt('started_at', endDate.toISOString())

    const taskMap = new Map<string, { total: number; late: number; skipped: number; isCritical: boolean }>()

    sessions?.forEach((session: any) => {
      session.checklist_instances?.forEach((instance: any) => {
        instance.checklist_results?.forEach((result: any) => {
          const title = result.template_items?.title || 'Unknown'
          const isCritical = result.template_items?.is_critical || false
          
          if (!taskMap.has(title)) {
            taskMap.set(title, { total: 0, late: 0, skipped: 0, isCritical })
          }
          
          const stats = taskMap.get(title)!
          stats.total++
          
          if (result.status === 'skipped') stats.skipped++
          if (result.status === 'completed_late') stats.late++
        })
      })
    })

    return Array.from(taskMap.entries())
      .map(([taskTitle, stats]) => ({
        taskTitle,
        totalAttempts: stats.total,
        lateCount: stats.late,
        skippedCount: stats.skipped,
        latePercentage: Math.round((stats.late + stats.skipped) / stats.total * 100),
        isCritical: stats.isCritical
      }))
      .filter(t => t.totalAttempts >= 3)
      .sort((a, b) => b.latePercentage - a.latePercentage)
      .slice(0, 10)
  }

  const loadCriticalTaskScore = async (startDate: Date, endDate: Date): Promise<number> => {
    const { data: sessions } = await supabase
      .from('shift_sessions')
      .select(`
        checklist_instances (
          checklist_results (
            status,
            template_items (
              is_critical
            )
          )
        )
      `)
      .eq('site_id', selectedSiteId || '')
      .gte('started_at', startDate.toISOString())
      .lt('started_at', endDate.toISOString())

    let criticalTotal = 0
    let criticalOnTime = 0

    sessions?.forEach((session: any) => {
      session.checklist_instances?.forEach((instance: any) => {
        instance.checklist_results?.forEach((result: any) => {
          if (result.template_items?.is_critical) {
            criticalTotal++
            if (result.status === 'completed' || result.status === 'completed_early') {
              criticalOnTime++
            }
          }
        })
      })
    })

    return criticalTotal > 0 ? Math.round((criticalOnTime / criticalTotal) * 100) : 100
  }

  const generateInsights = async (monthData: DayMetrics[], avgScore: number): Promise<Insight[]> => {
    const insights: Insight[] = []

    // Trend analysis
    if (monthData.length >= 7) {
      const recentWeek = monthData.slice(0, 7)
      const previousWeek = monthData.slice(7, 14)
      const recentAvg = recentWeek.reduce((sum, d) => sum + d.complianceScore, 0) / 7
      const previousAvg = previousWeek.reduce((sum, d) => sum + d.complianceScore, 0) / 7
      
      if (recentAvg > previousAvg + 5) {
        insights.push({
          type: 'success',
          title: 'Improving Trend',
          description: `Compliance up ${Math.round(recentAvg - previousAvg)}% this week vs last week`,
          action: 'Keep up the great work!'
        })
      } else if (recentAvg < previousAvg - 5) {
        insights.push({
          type: 'warning',
          title: 'Declining Performance',
          description: `Compliance down ${Math.round(previousAvg - recentAvg)}% this week`,
          action: 'Review recent changes and address issues'
        })
      }
    }

    // Overall performance
    if (avgScore >= 95) {
      insights.push({
        type: 'success',
        title: 'Excellent Compliance',
        description: '30-day average above 95% - outstanding performance',
        action: 'Consider this as benchmark for other sites'
      })
    } else if (avgScore < 75) {
      insights.push({
        type: 'warning',
        title: 'Below Target',
        description: '30-day average below 75% - immediate attention needed',
        action: 'Schedule team meeting to identify blockers'
      })
    }

    // Consistency check
    const variance = monthData.reduce((sum, d) => sum + Math.abs(d.complianceScore - avgScore), 0) / monthData.length
    if (variance > 15) {
      insights.push({
        type: 'info',
        title: 'Inconsistent Performance',
        description: 'Large day-to-day variation in compliance scores',
        action: 'Review shift handover procedures and staffing levels'
      })
    }

    return insights
  }

  const loadTimePatterns = async (startDate: Date, endDate: Date): Promise<TimePattern[]> => {
    const { data: sessions } = await supabase
      .from('shift_sessions')
      .select(`
        started_at,
        checklist_instances (
          checklist_results (
            completed_at,
            status,
            template_items (
              due_time,
              grace_period_minutes
            )
          )
        )
      `)
      .eq('site_id', selectedSiteId || '')
      .gte('started_at', startDate.toISOString())
      .lt('started_at', endDate.toISOString())

    const hourMap = new Map<number, { total: number; late: number }>()

    sessions?.forEach((session: any) => {
      session.checklist_instances?.forEach((instance: any) => {
        instance.checklist_results?.forEach((result: any) => {
          if (!result.completed_at) return
          
          const completedTime = new Date(result.completed_at)
          const hour = completedTime.getHours()
          
          if (!hourMap.has(hour)) {
            hourMap.set(hour, { total: 0, late: 0 })
          }
          
          const stats = hourMap.get(hour)!
          stats.total++
          
          if (result.status === 'completed_late' || result.status === 'skipped') {
            stats.late++
          }
        })
      })
    })

    return Array.from(hourMap.entries())
      .map(([hour, stats]) => ({
        hour,
        completionRate: Math.round((1 - stats.late / stats.total) * 100),
        avgDelay: stats.late,
        taskCount: stats.total
      }))
      .filter(p => p.taskCount >= 5)
      .sort((a, b) => a.hour - b.hour)
  }

  const loadCompletionTimeStats = async (startDate: Date, endDate: Date): Promise<CompletionTimeStats> => {
    const { data: sessions } = await supabase
      .from('shift_sessions')
      .select(`
        started_at,
        checklist_instances (
          checklist_results (
            completed_at,
            status,
            template_items (
              title,
              due_time,
              grace_period_minutes
            )
          )
        )
      `)
      .eq('site_id', selectedSiteId || '')
      .gte('started_at', startDate.toISOString())
      .lt('started_at', endDate.toISOString())

    let totalEarlyMinutes = 0
    let earlyCount = 0
    let totalLateMinutes = 0
    let lateCount = 0
    const taskTimes = new Map<string, number[]>()

    sessions?.forEach((session: any) => {
      const sessionDate = new Date(session.started_at)
      
      session.checklist_instances?.forEach((instance: any) => {
        instance.checklist_results?.forEach((result: any) => {
          if (!result.completed_at || !result.template_items?.due_time) return
          
          const taskTitle = result.template_items.title
          const [hours, minutes] = result.template_items.due_time.split(':').map(Number)
          const dueTime = new Date(sessionDate)
          dueTime.setHours(hours, minutes, 0, 0)
          
          const completedTime = new Date(result.completed_at)
          const diffMinutes = (completedTime.getTime() - dueTime.getTime()) / 60000
          
          if (!taskTimes.has(taskTitle)) {
            taskTimes.set(taskTitle, [])
          }
          taskTimes.get(taskTitle)!.push(diffMinutes)
          
          if (diffMinutes < 0) {
            totalEarlyMinutes += Math.abs(diffMinutes)
            earlyCount++
          } else if (diffMinutes > (result.template_items.grace_period_minutes || 0)) {
            totalLateMinutes += diffMinutes
            lateCount++
          }
        })
      })
    })

    let fastestTask = 'N/A'
    let slowestTask = 'N/A'
    let minAvg = Infinity
    let maxAvg = -Infinity

    taskTimes.forEach((times, task) => {
      const avg = times.reduce((sum, t) => sum + t, 0) / times.length
      if (avg < minAvg) {
        minAvg = avg
        fastestTask = task
      }
      if (avg > maxAvg) {
        maxAvg = avg
        slowestTask = task
      }
    })

    return {
      avgMinutesEarly: earlyCount > 0 ? Math.round(totalEarlyMinutes / earlyCount) : 0,
      avgMinutesLate: lateCount > 0 ? Math.round(totalLateMinutes / lateCount) : 0,
      fastestTask,
      slowestTask
    }
  }

  const calculateTrendComparisons = async (monthData: DayMetrics[]): Promise<TrendComparison> => {
    if (monthData.length < 14) {
      return {
        thisWeekAvg: 0,
        lastWeekAvg: 0,
        thisMonthAvg: 0,
        lastMonthAvg: 0,
        weekChange: 0,
        monthChange: 0
      }
    }

    const thisWeek = monthData.slice(0, 7)
    const lastWeek = monthData.slice(7, 14)
    const thisMonth = monthData.slice(0, 15)
    const lastMonth = monthData.slice(15, 30)

    const thisWeekAvg = Math.round(thisWeek.reduce((sum, d) => sum + d.complianceScore, 0) / 7)
    const lastWeekAvg = Math.round(lastWeek.reduce((sum, d) => sum + d.complianceScore, 0) / 7)
    const thisMonthAvg = Math.round(thisMonth.reduce((sum, d) => sum + d.complianceScore, 0) / thisMonth.length)
    const lastMonthAvg = lastMonth.length > 0 ? Math.round(lastMonth.reduce((sum, d) => sum + d.complianceScore, 0) / lastMonth.length) : 0

    return {
      thisWeekAvg,
      lastWeekAvg,
      thisMonthAvg,
      lastMonthAvg,
      weekChange: thisWeekAvg - lastWeekAvg,
      monthChange: thisMonthAvg - lastMonthAvg
    }
  }

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user || !profile || !isAdmin) {
    router.push('/')
    return null
  }

  const currentMetrics = selectedPeriod === 'today' ? todayMetrics : 
                        selectedPeriod === 'yesterday' ? yesterdayMetrics : 
                        selectedPeriod === 'week' ? null :
                        selectedPeriod === 'month' ? null : null

  return (
    <div className="min-h-screen pb-20 bg-gray-50">
      <AdminNav title="Analytics & Compliance" userName={profile?.full_name} />

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="py-4">
            <h3 className="font-semibold text-navy mb-2">📊 Comprehensive Analytics</h3>
            <p className="text-sm text-gray-700">
              Track compliance scores, task completion patterns, and performance trends over time. Use these insights to identify areas for improvement and maintain high standards.
            </p>
          </CardContent>
        </Card>
        <div className="flex gap-2">
          <Button
            variant={selectedPeriod === 'today' ? 'default' : 'outline'}
            onClick={() => setSelectedPeriod('today')}
          >
            Today
          </Button>
          <Button
            variant={selectedPeriod === 'yesterday' ? 'default' : 'outline'}
            onClick={() => setSelectedPeriod('yesterday')}
          >
            Yesterday
          </Button>
          <Button
            variant={selectedPeriod === 'week' ? 'default' : 'outline'}
            onClick={() => setSelectedPeriod('week')}
          >
            Last 7 Days
          </Button>
          <Button
            variant={selectedPeriod === 'month' ? 'default' : 'outline'}
            onClick={() => setSelectedPeriod('month')}
          >
            Last 30 Days
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading analytics...</p>
          </div>
        ) : selectedPeriod === 'week' || selectedPeriod === 'month' ? (
          <div className="space-y-4">
            {selectedPeriod === 'month' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
                  <CardContent className="py-6">
                    <p className="text-sm text-gray-600 mb-1">30-Day Average Score</p>
                    <p className={`text-4xl font-bold ${getScoreColor(avgScore)}`}>{avgScore}%</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-green-50 to-green-100">
                  <CardContent className="py-6">
                    <p className="text-sm text-gray-600 mb-1">Total Tasks Completed</p>
                    <p className="text-4xl font-bold text-green-700">{totalTasksMonth}</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
                  <CardContent className="py-6">
                    <p className="text-sm text-gray-600 mb-1">Days Tracked</p>
                    <p className="text-4xl font-bold text-purple-700">{monthMetrics.length}</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {selectedPeriod === 'month' && insights.length > 0 && (
              <Card className="border-l-4 border-l-blue-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-600" />
                    Key Insights & Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {insights.map((insight, idx) => (
                      <div key={idx} className={`p-4 rounded-lg ${
                        insight.type === 'success' ? 'bg-green-50 border border-green-200' :
                        insight.type === 'warning' ? 'bg-amber-50 border border-amber-200' :
                        'bg-blue-50 border border-blue-200'
                      }`}>
                        <h4 className="font-semibold text-navy mb-1">
                          {insight.type === 'success' ? '✅' : insight.type === 'warning' ? '⚠️' : 'ℹ️'} {insight.title}
                        </h4>
                        <p className="text-sm text-gray-700 mb-2">{insight.description}</p>
                        {insight.action && (
                          <p className="text-sm font-medium text-gray-900">→ {insight.action}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {selectedPeriod === 'month' && taskAnalytics.length > 0 && (
              <Card className="border-l-4 border-l-red-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    Problem Tasks (Most Frequently Late/Skipped)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {taskAnalytics.map((task, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-navy">
                            {task.isCritical && <span className="text-red-600 mr-1">🔴</span>}
                            {task.taskTitle}
                          </p>
                          <p className="text-xs text-gray-600">
                            {task.totalAttempts} attempts • {task.lateCount} late • {task.skippedCount} skipped
                          </p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                          task.latePercentage >= 50 ? 'bg-red-100 text-red-700' :
                          task.latePercentage >= 25 ? 'bg-amber-100 text-amber-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {task.latePercentage}% issues
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    🔴 = Critical task requiring immediate attention
                  </p>
                </CardContent>
              </Card>
            )}

            {selectedPeriod === 'month' && trendComparison && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-l-4 border-l-purple-500">
                  <CardHeader>
                    <CardTitle className="text-base">Week-over-Week Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">This Week</p>
                        <p className="text-3xl font-bold text-navy">{trendComparison.thisWeekAvg}%</p>
                      </div>
                      <div className="text-center px-4">
                        <p className={`text-2xl font-bold ${
                          trendComparison.weekChange > 0 ? 'text-green-600' :
                          trendComparison.weekChange < 0 ? 'text-red-600' :
                          'text-gray-600'
                        }`}>
                          {trendComparison.weekChange > 0 ? '↑' : trendComparison.weekChange < 0 ? '↓' : '→'}
                          {Math.abs(trendComparison.weekChange)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Last Week</p>
                        <p className="text-3xl font-bold text-gray-400">{trendComparison.lastWeekAvg}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-indigo-500">
                  <CardHeader>
                    <CardTitle className="text-base">Month-over-Month Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">This Period</p>
                        <p className="text-3xl font-bold text-navy">{trendComparison.thisMonthAvg}%</p>
                      </div>
                      <div className="text-center px-4">
                        <p className={`text-2xl font-bold ${
                          trendComparison.monthChange > 0 ? 'text-green-600' :
                          trendComparison.monthChange < 0 ? 'text-red-600' :
                          'text-gray-600'
                        }`}>
                          {trendComparison.monthChange > 0 ? '↑' : trendComparison.monthChange < 0 ? '↓' : '→'}
                          {Math.abs(trendComparison.monthChange)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Previous Period</p>
                        <p className="text-3xl font-bold text-gray-400">{trendComparison.lastMonthAvg}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {selectedPeriod === 'month' && completionStats && (
              <Card className="border-l-4 border-l-teal-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-teal-600" />
                    Task Timing Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Avg Early By</p>
                      <p className="text-2xl font-bold text-green-700">{completionStats.avgMinutesEarly}m</p>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Avg Late By</p>
                      <p className="text-2xl font-bold text-red-700">{completionStats.avgMinutesLate}m</p>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Fastest Task</p>
                      <p className="text-xs font-medium text-blue-700 truncate">{completionStats.fastestTask}</p>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Slowest Task</p>
                      <p className="text-xs font-medium text-orange-700 truncate">{completionStats.slowestTask}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {selectedPeriod === 'month' && timePatterns.length > 0 && (
              <Card className="border-l-4 border-l-yellow-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-yellow-600" />
                    Performance by Time of Day
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {timePatterns.map((pattern) => (
                      <div key={pattern.hour} className="flex items-center gap-3">
                        <div className="w-16 text-sm font-medium text-gray-700">
                          {pattern.hour.toString().padStart(2, '0')}:00
                        </div>
                        <div className="flex-1">
                          <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                            <div
                              className={`h-full flex items-center justify-end pr-2 text-xs font-bold text-white ${
                                pattern.completionRate >= 90 ? 'bg-green-500' :
                                pattern.completionRate >= 75 ? 'bg-amber-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${pattern.completionRate}%` }}
                            >
                              {pattern.completionRate}%
                            </div>
                          </div>
                        </div>
                        <div className="w-20 text-xs text-gray-600 text-right">
                          {pattern.taskCount} tasks
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    Shows compliance rate by hour - identify problem times
                  </p>
                </CardContent>
              </Card>
            )}

            {selectedPeriod === 'month' && criticalTaskScore > 0 && (
              <Card className="bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-red-600" />
                    Critical Task Compliance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <p className={`text-5xl font-bold mb-2 ${
                      criticalTaskScore >= 95 ? 'text-green-600' :
                      criticalTaskScore >= 85 ? 'text-amber-600' :
                      'text-red-600'
                    }`}>
                      {criticalTaskScore}%
                    </p>
                    <p className="text-sm text-gray-700">
                      {criticalTaskScore >= 95 ? '🎉 Excellent! All critical tasks on track' :
                       criticalTaskScore >= 85 ? '⚠️ Good, but room for improvement on critical tasks' :
                       '🚨 Critical tasks need immediate attention'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
            
            <Card>
              <CardHeader>
                <CardTitle>{selectedPeriod === 'month' ? '30-Day Overview' : 'Weekly Overview'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(selectedPeriod === 'month' ? monthMetrics : weekMetrics).map((day) => (
                    <div key={day.date} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-navy">
                          {new Date(day.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </p>
                        <p className="text-sm text-gray-600">{day.shiftType}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Tasks</p>
                          <p className="font-medium">{day.totalTasks}</p>
                        </div>
                        <div className={`text-right px-4 py-2 rounded-lg ${getScoreBgColor(day.complianceScore)}`}>
                          <p className="text-sm text-gray-600">Score</p>
                          <p className={`text-2xl font-bold ${getScoreColor(day.complianceScore)}`}>
                            {day.complianceScore}%
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : currentMetrics ? (
          <>
            <Card className={`${getScoreBgColor(currentMetrics.complianceScore)}`}>
              <CardContent className="py-8">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2">Compliance Score</p>
                  <p className={`text-6xl font-bold ${getScoreColor(currentMetrics.complianceScore)}`}>
                    {currentMetrics.complianceScore}%
                  </p>
                  <p className="text-sm text-gray-600 mt-4">
                    {currentMetrics.complianceScore >= 90 ? '🎉 Excellent performance!' :
                     currentMetrics.complianceScore >= 75 ? '👍 Good work, room for improvement' :
                     '⚠️ Needs attention'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                    <div>
                      <p className="text-sm text-gray-600">On Time</p>
                      <p className="text-2xl font-bold text-navy">
                        {currentMetrics.completedEarly + currentMetrics.completedOnTime}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <Clock className="h-8 w-8 text-amber-600" />
                    <div>
                      <p className="text-sm text-gray-600">Late</p>
                      <p className="text-2xl font-bold text-navy">{currentMetrics.completedLate}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-8 w-8 text-teal-600" />
                    <div>
                      <p className="text-sm text-gray-600">Early</p>
                      <p className="text-2xl font-bold text-navy">{currentMetrics.completedEarly}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-8 w-8 text-red-600" />
                    <div>
                      <p className="text-sm text-gray-600">Skipped</p>
                      <p className="text-2xl font-bold text-navy">{currentMetrics.skipped}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Performance Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Total Tasks</span>
                      <span className="text-sm font-bold">{currentMetrics.totalTasks}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div className="flex h-full">
                        <div 
                          className="bg-teal-500" 
                          style={{ width: `${(currentMetrics.completedEarly / currentMetrics.totalTasks) * 100}%` }}
                        />
                        <div 
                          className="bg-green-500" 
                          style={{ width: `${(currentMetrics.completedOnTime / currentMetrics.totalTasks) * 100}%` }}
                        />
                        <div 
                          className="bg-amber-500" 
                          style={{ width: `${(currentMetrics.completedLate / currentMetrics.totalTasks) * 100}%` }}
                        />
                        <div 
                          className="bg-red-500" 
                          style={{ width: `${(currentMetrics.skipped / currentMetrics.totalTasks) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex justify-between mt-2 text-xs">
                      <span className="text-teal-600">Early: {currentMetrics.completedEarly}</span>
                      <span className="text-green-600">On Time: {currentMetrics.completedOnTime}</span>
                      <span className="text-amber-600">Late: {currentMetrics.completedLate}</span>
                      <span className="text-red-600">Skipped: {currentMetrics.skipped}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-gray-500">No data available for this period</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
