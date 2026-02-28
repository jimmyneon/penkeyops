'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/hooks/useUser'
import { useAdminSite } from '@/hooks/useAdminSite'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Menu, X, BarChart3, ListChecks, Package, Upload, ClipboardList, Users, FileText, TrendingUp, CheckCircle, Clock, AlertTriangle } from 'lucide-react'

interface DayMetrics {
  date: string
  totalTasks: number
  completedOnTime: number
  completedLate: number
  skipped: number
  complianceScore: number
  shiftType: string
}

export default function AdminDashboard() {
  const { user, profile, loading, isAdmin } = useUser()
  const { sites, selectedSiteId, setSelectedSiteId, loading: siteLoading, hasSite } = useAdminSite()
  const router = useRouter()
  const [showMenu, setShowMenu] = useState(false)
  const [todayMetrics, setTodayMetrics] = useState<DayMetrics | null>(null)
  const [yesterdayMetrics, setYesterdayMetrics] = useState<DayMetrics | null>(null)
  const [loadingMetrics, setLoadingMetrics] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (selectedSiteId) {
      loadDashboardMetrics()
    }
  }, [selectedSiteId])

  const loadDashboardMetrics = async () => {
    if (!selectedSiteId) {
      setLoadingMetrics(false)
      return
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const [todayData, yesterdayData] = await Promise.all([
      calculateDayMetrics(today, tomorrow),
      calculateDayMetrics(yesterday, today)
    ])

    setTodayMetrics(todayData)
    setYesterdayMetrics(yesterdayData)
    setLoadingMetrics(false)
  }

  const calculateDayMetrics = async (startDate: Date, endDate: Date): Promise<DayMetrics> => {
    const { data: sessions } = await supabase
      .from('shift_sessions')
      .select(`
        id,
        started_at,
        shift_type,
        checklist_instances (
          id,
          checklist_results (
            id,
            status,
            completed_at,
            template_item_id,
            template_items (
              due_time,
              grace_period_minutes
            )
          )
        )
      `)
      .eq('site_id', selectedSiteId!)
      .gte('started_at', startDate.toISOString())
      .lt('started_at', endDate.toISOString())

    let totalTasks = 0
    let completedOnTime = 0
    let completedLate = 0
    let skipped = 0
    let shiftType = 'No shift'

    sessions?.forEach((session: Record<string, unknown>) => {
      shiftType = session.shift_type as string || 'No shift'
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

          if (completedTime <= graceTime) {
            completedOnTime++
          } else {
            completedLate++
          }
        })
      })
    })

    const complianceScore = totalTasks > 0 
      ? Math.round(((completedOnTime / totalTasks) * 100))
      : 100

    return {
      date: startDate.toISOString().split('T')[0],
      totalTasks,
      completedOnTime,
      completedLate,
      skipped,
      complianceScore,
      shiftType
    }
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

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || !profile || !isAdmin) {
    router.push('/')
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header with burger menu */}
      <header className="bg-card px-4 py-3 shadow-sm sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-muted rounded-xl transition-colors"
            aria-label="Menu"
          >
            <Menu className="h-6 w-6 text-foreground" />
          </button>
          <div className="text-center">
            <h1 className="text-lg font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-xs text-muted-foreground">{profile.full_name}</p>
          </div>
          <div className="w-10" />
        </div>
      </header>

      {/* Slide-out menu */}
      {showMenu && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowMenu(false)}
          />
          <div className="fixed inset-y-0 left-0 w-80 bg-card shadow-2xl z-50 overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-foreground">Admin Menu</h2>
                <button
                  onClick={() => setShowMenu(false)}
                  className="p-2 hover:bg-muted rounded-xl transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => {
                    router.push('/admin')
                    setShowMenu(false)
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors text-left"
                >
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <span className="font-medium">Dashboard</span>
                </button>

                <button
                  onClick={() => {
                    router.push('/admin/analytics')
                    setShowMenu(false)
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors text-left"
                >
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <span className="font-medium">Analytics & Compliance</span>
                </button>

                <button
                  onClick={() => {
                    router.push('/admin/tasks')
                    setShowMenu(false)
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors text-left"
                >
                  <ListChecks className="h-5 w-5 text-primary" />
                  <span className="font-medium">Task Management</span>
                </button>

                <button
                  onClick={() => {
                    router.push('/admin/templates')
                    setShowMenu(false)
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors text-left"
                >
                  <ClipboardList className="h-5 w-5 text-primary" />
                  <span className="font-medium">Templates</span>
                </button>

                <button
                  onClick={() => {
                    router.push('/admin/food-items')
                    setShowMenu(false)
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors text-left"
                >
                  <Package className="h-5 w-5 text-primary" />
                  <span className="font-medium">Food Items Database</span>
                </button>

                <button
                  onClick={() => {
                    router.push('/admin/users')
                    setShowMenu(false)
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors text-left"
                >
                  <Users className="h-5 w-5 text-primary" />
                  <span className="font-medium">Users</span>
                </button>

                <button
                  onClick={() => {
                    router.push('/admin/reports')
                    setShowMenu(false)
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors text-left"
                >
                  <FileText className="h-5 w-5 text-primary" />
                  <span className="font-medium">Reports & Export</span>
                </button>

                <button
                  onClick={() => {
                    router.push('/admin/import')
                    setShowMenu(false)
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors text-left"
                >
                  <Upload className="h-5 w-5 text-primary" />
                  <span className="font-medium">Import Data</span>
                </button>

                <div className="border-t border-border my-4" />

                <button
                  onClick={() => {
                    router.push('/')
                    setShowMenu(false)
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors text-left"
                >
                  <ClipboardList className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Staff View</span>
                </button>

                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-destructive/10 text-destructive transition-colors text-left"
                >
                  <X className="h-5 w-5" />
                  <span className="font-medium">Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <main className="p-4 max-w-2xl mx-auto space-y-4">
        {siteLoading ? (
          <div className="h-[60vh] flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </div>
        ) : !hasSite ? (
          <div className="h-[60vh] flex items-center justify-center">
            <Card className="max-w-md">
              <CardContent className="py-12 text-center">
                <AlertTriangle className="h-12 w-12 text-amber-600 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-foreground mb-2">No Sites Found</h2>
                <p className="text-muted-foreground mb-4">
                  No active sites exist in the system. Create a site first to view dashboard metrics.
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            {/* Site Selector */}
            {sites.length > 1 && (
              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-foreground">Site:</label>
                    <select
                      value={selectedSiteId || ''}
                      onChange={(e) => {
                        setSelectedSiteId(e.target.value)
                        setLoadingMetrics(true)
                      }}
                      className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary outline-none"
                    >
                      {sites.map(site => (
                        <option key={site.id} value={site.id}>{site.name}</option>
                      ))}
                    </select>
                  </div>
                </CardContent>
              </Card>
            )}

            {loadingMetrics ? (
              <div className="h-[60vh] flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading dashboard...</p>
                </div>
              </div>
            ) : (
              <>
            {/* Today's Performance */}
            <div className="mb-6">
              <h2 className="text-xl font-bold text-foreground mb-3">Today</h2>
              {todayMetrics && todayMetrics.totalTasks > 0 ? (
                <>
                  <Card className={`mb-4 ${getScoreBgColor(todayMetrics.complianceScore)}`}>
                    <CardContent className="py-6">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground mb-2">Compliance Score</p>
                        <p className={`text-5xl font-bold ${getScoreColor(todayMetrics.complianceScore)}`}>
                          {todayMetrics.complianceScore}%
                        </p>
                        <p className="text-xs text-muted-foreground mt-3">
                          {todayMetrics.shiftType}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-2 gap-3">
                    <Card>
                      <CardContent className="py-4">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-7 w-7 text-green-600" />
                          <div>
                            <p className="text-xs text-muted-foreground">On Time</p>
                            <p className="text-xl font-bold text-foreground">{todayMetrics.completedOnTime}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="py-4">
                        <div className="flex items-center gap-3">
                          <Clock className="h-7 w-7 text-amber-600" />
                          <div>
                            <p className="text-xs text-muted-foreground">Late</p>
                            <p className="text-xl font-bold text-foreground">{todayMetrics.completedLate}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="py-4">
                        <div className="flex items-center gap-3">
                          <TrendingUp className="h-7 w-7 text-teal-600" />
                          <div>
                            <p className="text-xs text-muted-foreground">Total Tasks</p>
                            <p className="text-xl font-bold text-foreground">{todayMetrics.totalTasks}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="py-4">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="h-7 w-7 text-red-600" />
                          <div>
                            <p className="text-xs text-muted-foreground">Skipped</p>
                            <p className="text-xl font-bold text-foreground">{todayMetrics.skipped}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground">No shift data for today yet</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Yesterday's Performance */}
            <div>
              <h2 className="text-xl font-bold text-foreground mb-3">Yesterday</h2>
              {yesterdayMetrics && yesterdayMetrics.totalTasks > 0 ? (
                <>
                  <Card className={`mb-4 ${getScoreBgColor(yesterdayMetrics.complianceScore)}`}>
                    <CardContent className="py-6">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground mb-2">Compliance Score</p>
                        <p className={`text-5xl font-bold ${getScoreColor(yesterdayMetrics.complianceScore)}`}>
                          {yesterdayMetrics.complianceScore}%
                        </p>
                        <p className="text-xs text-muted-foreground mt-3">
                          {yesterdayMetrics.shiftType}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-2 gap-3">
                    <Card>
                      <CardContent className="py-4">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-7 w-7 text-green-600" />
                          <div>
                            <p className="text-xs text-muted-foreground">On Time</p>
                            <p className="text-xl font-bold text-foreground">{yesterdayMetrics.completedOnTime}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="py-4">
                        <div className="flex items-center gap-3">
                          <Clock className="h-7 w-7 text-amber-600" />
                          <div>
                            <p className="text-xs text-muted-foreground">Late</p>
                            <p className="text-xl font-bold text-foreground">{yesterdayMetrics.completedLate}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="py-4">
                        <div className="flex items-center gap-3">
                          <TrendingUp className="h-7 w-7 text-teal-600" />
                          <div>
                            <p className="text-xs text-muted-foreground">Total Tasks</p>
                            <p className="text-xl font-bold text-foreground">{yesterdayMetrics.totalTasks}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="py-4">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="h-7 w-7 text-red-600" />
                          <div>
                            <p className="text-xs text-muted-foreground">Skipped</p>
                            <p className="text-xl font-bold text-foreground">{yesterdayMetrics.skipped}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground">No shift data for yesterday</p>
                  </CardContent>
                </Card>
              )}
            </div>
            </>
          )}
        </>
      )}
      </main>
    </div>
  )
}
