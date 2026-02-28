'use client'

import { useUser } from '@/hooks/useUser'
import { useAdminSite } from '@/hooks/useAdminSite'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { AdminNav } from '@/components/admin/AdminNav'

export default function ReportsPage() {
  const { user, profile, loading: userLoading, isAdmin } = useUser()
  const { selectedSiteId } = useAdminSite()
  const router = useRouter()
  const [exporting, setExporting] = useState(false)
  const [exportingAudit, setExportingAudit] = useState(false)
  const [exportingTasks, setExportingTasks] = useState(false)
  const [exportingItems, setExportingItems] = useState(false)
  const supabase = createClient()

  const exportComplianceData = async () => {
    if (!selectedSiteId) return
    
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
        .eq('site_id', selectedSiteId)
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

  const exportAuditTrail = async () => {
    if (!selectedSiteId) return
    
    setExportingAudit(true)
    try {
      const { data: auditEntries } = await supabase
        .from('audit_trail')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000)

      const csv = ['timestamp,user_id,action,table_name,record_id,changes']
      auditEntries?.forEach((entry: Record<string, unknown>) => {
        const changes = JSON.stringify(entry.new_data).replace(/,/g, ';')
        csv.push(`${entry.created_at},${entry.user_id || 'system'},${entry.action},${entry.table_name},${entry.record_id},"${changes}"`)
      })

      downloadCSV(csv.join('\n'), `audit-trail-${new Date().toISOString().split('T')[0]}.csv`)
    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export audit trail')
    } finally {
      setExportingAudit(false)
    }
  }

  const exportAllTasks = async () => {
    if (!selectedSiteId) return
    
    setExportingTasks(true)
    try {
      const { data: templates } = await supabase
        .from('templates')
        .select(`
          *,
          template_items (*)
        `)
        .or(`site_id.eq.${selectedSiteId},site_id.is.null`)

      const csv = ['template_name,template_type,task_title,task_description,priority,is_critical,due_time,grace_period_minutes,evidence_type,sort_order']
      templates?.forEach((template: Record<string, unknown>) => {
        const items = template.template_items as Record<string, unknown>[] | undefined
        items?.forEach((item: Record<string, unknown>) => {
          csv.push([
            template.name,
            template.template_type,
            item.title,
            `"${item.description || ''}"`,
            item.priority,
            item.is_critical,
            item.due_time || '',
            item.grace_period_minutes,
            item.evidence_type,
            item.sort_order
          ].join(','))
        })
      })

      downloadCSV(csv.join('\n'), `all-tasks-${new Date().toISOString().split('T')[0]}.csv`)
    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export tasks')
    } finally {
      setExportingTasks(false)
    }
  }

  const exportFoodItems = async () => {
    if (!selectedSiteId) return
    
    setExportingItems(true)
    try {
      const { data: items } = await supabase
        .from('items')
        .select('*')
        .or(`site_id.eq.${selectedSiteId},site_id.is.null`)
        .order('usage_count', { ascending: false })

      const csv = ['name,category,unit,usage_count,is_active']
      items?.forEach((item: Record<string, unknown>) => {
        csv.push(`${item.name},${item.category || ''},${item.unit},${item.usage_count},${item.is_active}`)
      })

      downloadCSV(csv.join('\n'), `food-items-${new Date().toISOString().split('T')[0]}.csv`)
    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export food items')
    } finally {
      setExportingItems(false)
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
      <AdminNav title="Reports & Export" userName={profile?.full_name} />

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="py-4">
            <h3 className="font-semibold text-navy mb-2">📊 Reports & Data Export</h3>
            <p className="text-sm text-gray-700">
              Export data from this site for compliance audits, EHO inspections, and analysis. All exports are in CSV format for easy use in Excel or other tools.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Export Compliance Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              Export shift sessions, checklist completions, and logs for EHO inspections and compliance audits.
            </p>
            <Button onClick={exportComplianceData} disabled={exporting}>
              <Download className="h-5 w-5 mr-2" />
              {exporting ? 'Exporting...' : 'Export Last 100 Shifts (CSV)'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Export Audit Trail</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              Complete history of all actions. No records can be deleted, only amended. Export for compliance and regulatory requirements.
            </p>
            <div className="flex gap-2">
              <Button onClick={exportAuditTrail} disabled={exportingAudit}>
                <Download className="h-5 w-5 mr-2" />
                {exportingAudit ? 'Exporting...' : 'Export Audit Trail (CSV)'}
              </Button>
              <Button variant="outline" onClick={() => router.push('/admin/audit')}>
                View Audit Trail
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Export All Tasks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              Export all task templates and items for backup or migration to another site.
            </p>
            <Button onClick={exportAllTasks} disabled={exportingTasks}>
              <Download className="h-5 w-5 mr-2" />
              {exportingTasks ? 'Exporting...' : 'Export All Tasks (CSV)'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Export Food Items Database</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              Export the complete food items database for wastage tracking.
            </p>
            <Button onClick={exportFoodItems} disabled={exportingItems}>
              <Download className="h-5 w-5 mr-2" />
              {exportingItems ? 'Exporting...' : 'Export Food Items (CSV)'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Analytics Dashboard</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              View compliance scores, completion rates, and performance metrics.
            </p>
            <Button onClick={() => router.push('/admin/analytics')}>
              View Analytics
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
