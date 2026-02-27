'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Home, Menu, AlertTriangle, Plus, X } from 'lucide-react'
import { SidebarMenu } from '@/components/shared/SidebarMenu'
import { useUser } from '@/hooks/useUser'

interface Incident {
  id: string
  title: string
  description: string
  incident_type: string
  severity: string
  reported_by: string
  created_at: string
  status: string
}

export default function IncidentsPage() {
  const router = useRouter()
  const { user } = useUser()
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    incident_type: 'safety',
    severity: 'medium'
  })
  const [submitting, setSubmitting] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadIncidents()
  }, [])

  const loadIncidents = async () => {
    try {
      const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setIncidents(data || [])
    } catch (error) {
      console.error('Error loading incidents:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setSubmitting(true)
    try {
      const { error } = await supabase
        .from('incidents')
        .insert({
          ...formData,
          reported_by: user.id,
          status: 'open'
        })

      if (error) throw error

      setFormData({ title: '', description: '', incident_type: 'safety', severity: 'medium' })
      setShowForm(false)
      loadIncidents()
    } catch (error) {
      console.error('Error creating incident:', error)
      alert('Failed to create incident')
    } finally {
      setSubmitting(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-50 border-red-200'
      case 'high': return 'bg-orange-50 border-orange-200'
      case 'medium': return 'bg-yellow-50 border-yellow-200'
      default: return 'bg-gray-50 border-gray-200'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card px-4 py-3 shadow-sm sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowMenu(true)}
            className="p-2 hover:bg-muted rounded-xl transition-colors"
          >
            <Menu className="h-6 w-6 text-foreground" />
          </button>
          <div className="flex items-center gap-2 absolute left-1/2 transform -translate-x-1/2">
            <AlertTriangle className="h-6 w-6 text-primary" />
            <h1 className="text-lg font-bold text-foreground">Incidents</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowForm(true)}
              className="p-2 bg-primary text-white rounded-xl hover:opacity-90 transition-all"
            >
              <Plus className="h-6 w-6" />
            </button>
            <button
              onClick={() => router.push('/')}
              className="p-2 hover:bg-muted rounded-xl transition-colors"
            >
              <Home className="h-6 w-6 text-foreground" />
            </button>
          </div>
        </div>
      </header>

      <main className="p-4 max-w-4xl mx-auto">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading incidents...</p>
          </div>
        ) : incidents.length === 0 ? (
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">No incidents reported</p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-primary text-white px-6 py-3 rounded-xl font-semibold hover:opacity-90 transition-all"
            >
              Report Incident
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {incidents.map((incident) => (
              <div
                key={incident.id}
                className={`rounded-xl p-4 shadow-sm border ${getSeverityColor(incident.severity)}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-bold text-foreground text-lg">{incident.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{formatDate(incident.created_at)}</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="inline-block bg-white px-3 py-1 rounded-full text-xs font-semibold capitalize">
                      {incident.incident_type.replace('_', ' ')}
                    </span>
                    <span className="inline-block bg-white px-3 py-1 rounded-full text-xs font-semibold capitalize">
                      {incident.severity}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-700 mt-3">{incident.description}</p>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Incident Report Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Report Incident</h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-1 hover:bg-muted rounded-xl transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  placeholder="Brief description"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Type *
                </label>
                <select
                  value={formData.incident_type}
                  onChange={(e) => setFormData({ ...formData, incident_type: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                >
                  <option value="safety">Safety</option>
                  <option value="equipment_failure">Equipment Failure</option>
                  <option value="supplier_issue">Supplier Issue</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Severity *
                </label>
                <select
                  value={formData.severity}
                  onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
                  placeholder="Detailed description of the incident..."
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 bg-muted text-foreground py-3 rounded-xl text-sm font-bold hover:bg-muted/80 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-primary text-white py-3 rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-lg disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <SidebarMenu showMenu={showMenu} setShowMenu={setShowMenu} />
    </div>
  )
}
