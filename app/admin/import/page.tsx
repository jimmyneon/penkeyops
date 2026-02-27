'use client'

import { useState } from 'react'
import { useUser } from '@/hooks/useUser'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Upload, Download } from 'lucide-react'

export default function ImportPage() {
  const { user, profile, loading: userLoading, isAdmin } = useUser()
  const router = useRouter()
  const [importing, setImporting] = useState(false)
  const supabase = createClient()

  const handleTemplateImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile?.site_id || !user) return

    setImporting(true)
    try {
      const text = await file.text()
      const rows = text.split('\n').slice(1)
      
      for (const row of rows) {
        if (!row.trim()) continue
        
        const [name, description, type, itemsJson] = row.split(',')
        
        const { data: template } = await supabase
          .from('templates')
          .insert({
            site_id: profile.site_id,
            name: name.trim(),
            description: description?.trim() || null,
            template_type: type.trim() as any,
            created_by: user.id
          })
          .select()
          .single()

        if (template && itemsJson) {
          const items = JSON.parse(itemsJson)
          const templateItems = items.map((item: any, index: number) => ({
            template_id: template.id,
            title: item.title,
            description: item.description || null,
            priority: item.priority || 'P2',
            is_critical: item.is_critical || false,
            due_time: item.due_time || null,
            grace_period_minutes: item.grace_period_minutes || 0,
            evidence_type: item.evidence_type || 'none',
            sort_order: index
          }))

          await supabase.from('template_items').insert(templateItems)
        }
      }

      alert('Templates imported successfully!')
      router.push('/admin/templates')
    } catch (error) {
      console.error('Import error:', error)
      alert('Failed to import templates. Please check the file format.')
    } finally {
      setImporting(false)
    }
  }

  const downloadSampleCSV = () => {
    const sample = `name,description,type,items
Opening Checklist,Daily opening tasks,opening,"[{\"title\":\"Unlock doors\",\"priority\":\"P1\",\"is_critical\":true},{\"title\":\"Turn on lights\",\"priority\":\"P2\"}]"
Closing Checklist,Daily closing tasks,closing,"[{\"title\":\"Lock doors\",\"priority\":\"P1\",\"is_critical\":true},{\"title\":\"Turn off equipment\",\"priority\":\"P1\",\"is_critical\":true}]"`

    const blob = new Blob([sample], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'template-import-sample.csv'
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
              <h1 className="text-2xl font-bold text-navy">Import Data</h1>
              <p className="text-sm text-gray-600">Bulk import templates and users</p>
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
            <CardTitle>Import Templates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              Upload a CSV file to import multiple templates at once. Each template can include multiple checklist items.
            </p>
            
            <div className="flex gap-2">
              <Button onClick={downloadSampleCSV} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download Sample CSV
              </Button>
              
              <label className="flex-1">
                <Button disabled={importing} className="w-full" asChild>
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    {importing ? 'Importing...' : 'Upload CSV'}
                  </span>
                </Button>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleTemplateImport}
                  className="hidden"
                  disabled={importing}
                />
              </label>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg text-sm">
              <p className="font-medium mb-2">CSV Format:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li>Columns: name, description, type, items</li>
                <li>Type must be: opening, closing, cleaning, or safety</li>
                <li>Items must be a JSON array of task objects</li>
                <li>Each task can have: title, description, priority, is_critical, due_time, grace_period_minutes, evidence_type</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Import Users</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              User import coming soon. For now, users are created automatically when they first log in via magic link.
            </p>
            <p className="text-sm text-gray-500">
              You&apos;ll need to manually assign them to sites and set their roles in the User Management page.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
