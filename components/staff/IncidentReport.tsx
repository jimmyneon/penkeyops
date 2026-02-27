'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

interface IncidentReportProps {
  sessionId: string | null
  siteId: string
  userId: string
  onClose: () => void
}

export function IncidentReport({ sessionId, siteId, userId, onClose }: IncidentReportProps) {
  const [incidentType, setIncidentType] = useState<'equipment_failure' | 'supplier_issue' | 'safety' | 'other'>('equipment_failure')
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await supabase.from('incidents').insert({
        site_id: siteId,
        shift_session_id: sessionId,
        reported_by: userId,
        incident_type: incidentType,
        title,
        description,
        severity,
      })

      alert('Incident reported successfully')
      onClose()
    } catch (error) {
      console.error('Error reporting incident:', error)
      alert('Failed to report incident')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <AlertTriangle className="mr-2 h-5 w-5 text-red-600" />
          Report Incident
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Incident Type
            </label>
            <select
              value={incidentType}
              onChange={(e) => setIncidentType(e.target.value as any)}
              className="w-full px-4 py-3 bg-white rounded-xl shadow-sm focus:ring-2 focus:ring-primary outline-none"
            >
              <option value="equipment_failure">Equipment Failure</option>
              <option value="supplier_issue">Supplier Issue</option>
              <option value="safety">Safety Concern</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Severity
            </label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as any)}
              className="w-full px-4 py-3 bg-white rounded-xl shadow-sm focus:ring-2 focus:ring-primary outline-none"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-3 bg-white rounded-xl shadow-sm focus:ring-2 focus:ring-primary outline-none"
              placeholder="Brief summary of the incident"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="w-full px-4 py-3 bg-white rounded-xl shadow-sm focus:ring-2 focus:ring-primary outline-none"
              rows={4}
              placeholder="Detailed description of what happened..."
            />
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Reporting...' : 'Report Incident'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
