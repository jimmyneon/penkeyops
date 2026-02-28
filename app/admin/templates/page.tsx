'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/hooks/useUser'
import { useAdminSite } from '@/hooks/useAdminSite'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Edit, Copy } from 'lucide-react'
import { Database } from '@/types/database'
import { AdminNav } from '@/components/admin/AdminNav'

type Template = Database['public']['Tables']['templates']['Row']

export default function TemplatesPage() {
  const { user, profile, loading: userLoading, isAdmin } = useUser()
  const { selectedSiteId } = useAdminSite()
  const router = useRouter()
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (selectedSiteId) {
      loadTemplates()
    }
  }, [selectedSiteId])

  const loadTemplates = async () => {
    if (!selectedSiteId) return

    const { data } = await supabase
      .from('templates')
      .select('*')
      .or(`site_id.eq.${selectedSiteId},site_id.is.null`)
      .order('created_at', { ascending: false })

    setTemplates(data || [])
    setLoading(false)
  }

  const createNewTemplate = () => {
    router.push('/admin/templates/new')
  }

  const editTemplate = (id: string) => {
    router.push(`/admin/templates/${id}`)
  }

  const duplicateTemplate = async (template: Template) => {
    if (!user || !selectedSiteId) return

    const { data: newTemplate } = await supabase
      .from('templates')
      .insert({
        site_id: selectedSiteId,
        name: `${template.name} (Copy)`,
        description: template.description,
        template_type: template.template_type,
        created_by: user.id,
      })
      .select()
      .single()

    if (newTemplate) {
      const { data: items } = await supabase
        .from('template_items')
        .select('*')
        .eq('template_id', template.id)
        .order('sort_order')

      if (items) {
        const newItems = items.map(item => ({
          template_id: newTemplate.id,
          title: item.title,
          description: item.description,
          priority: item.priority,
          is_critical: item.is_critical,
          due_time: item.due_time,
          grace_period_minutes: item.grace_period_minutes,
          evidence_type: item.evidence_type,
          sort_order: item.sort_order,
          metadata: item.metadata,
        }))

        await supabase.from('template_items').insert(newItems)
      }

      loadTemplates()
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

  return (
    <div className="min-h-screen pb-20">
      <AdminNav title="Templates" userName={profile?.full_name} />
      
      <div className="max-w-4xl mx-auto px-4 py-4">
        <Button onClick={createNewTemplate} className="w-full mb-4">
          <Plus className="h-5 w-5 mr-2" />
          New Template
        </Button>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="py-4">
            <h3 className="font-semibold text-navy mb-2">📋 About Templates & Tasks</h3>
            <p className="text-sm text-gray-700 mb-2">
              <strong>Templates</strong> are reusable checklists that define what needs to be done during a shift (e.g., "Opening Checklist", "Closing Checklist").
            </p>
            <p className="text-sm text-gray-700">
              Each template contains multiple <strong>Tasks</strong> - the individual items staff need to complete (e.g., "Check fridge temperature", "Clean coffee machine").
              Click "Edit" on any template to manage its tasks.
            </p>
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading templates...</p>
          </div>
        ) : templates.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-gray-500 mb-4">No templates yet</p>
              <Button onClick={createNewTemplate}>
                <Plus className="h-5 w-5 mr-2" />
                Create Your First Template
              </Button>
            </CardContent>
          </Card>
        ) : (
          templates.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle>{template.name}</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                    <div className="flex gap-2 mt-2">
                      <span className="px-2 py-1 bg-teal-100 text-teal-800 text-xs rounded capitalize">
                        {template.template_type}
                      </span>
                      {!template.site_id && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
                          Global
                        </span>
                      )}
                      {template.is_active ? (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => duplicateTemplate(template)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => editTemplate(template.id)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </main>
    </div>
  )
}
