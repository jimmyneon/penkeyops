'use client'

import { useUser } from '@/hooks/useUser'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Download } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

export default function ReportsPage() {
  const { user, profile, loading: userLoading, isAdmin } = useUser()
  const router = useRouter()
  const [exporting, setExporting] = useState(false)
  const supabase = createClient()

  const exportComplianceData = async () => {
    if (!profile?.site_id) return
    
    setExporting(true)
    try {
      const { data: sessions } = await supabase
        .from('shift_sessions')
        .select(`
          *,
          checklist_instances (
            *,
            checklist_results (
              *,
              template_items (title, priority, is_critical)
            )
          ),
          log_entries (*)
        `)
        .eq('site_id', profile.site_id)
        .order('started_at', { ascending: false })
        .limit(100)

      const csv = convertToCSV(sessions || [])
      downloadCSV(csv, `compliance-export-${new Date().toISOString().split('T')[0]}.csv`)
    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export data')
    } finally {
      setExporting(false)
    }
  }

  const convertToCSV = (data: any[]) => {
    const headers = ['Date', 'Shift Type', 'Started By', 'Completed', 'Tasks Completed', 'Logs Recorded']
    const rows = data.map(session => [
      new Date(session.started_at).toLocaleDateString(),
      session.shift_type,
      session.started_by,
      session.is_complete ? 'Yes' : 'No',
      session.checklist_instances?.reduce((acc: number, ci: any) => 
        acc + (ci.checklist_results?.filter((r: any) => r.status === 'completed').length || 0), 0) || 0,
      session.log_entries?.length || 0,
    ])
    
    return [headers, ...rows].map(row => row.join(',')).join('\n')
  }

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    window.URL.revokeObjectURL(url)
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

  return (
    <div className="min-h-screen pb-20">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-navy">Reports & Export</h1>
              <p className="text-sm text-gray-600">Compliance data and audit trails</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => router.push('/admin')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Export Compliance Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              Export shift sessions, checklist completions, and logs for EHJ inspections and compliance audits.
            </p>
            <Button onClick={exportComplianceData} disabled={exporting}>
              <Download className="h-5 w-5 mr-2" />
              {exporting ? 'Exporting...' : 'Export Last 100 Shifts (CSV)'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Audit Trail</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Complete history of all actions. No records can be deleted, only amended.
            </p>
            <p className="text-sm text-gray-500">
              Audit trail viewing interface coming soon. All actions are automatically logged in the database.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Compliance Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              View completion rates, overdue tasks, and compliance metrics.
            </p>
            <p className="text-sm text-gray-500">
              Dashboard analytics coming soon.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
