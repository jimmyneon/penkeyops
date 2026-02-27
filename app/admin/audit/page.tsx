'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/hooks/useUser'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Search } from 'lucide-react'
import { formatDateTime } from '@/utils/date'
import { Database } from '@/types/database'

type AuditEntry = Database['public']['Tables']['audit_trail']['Row']

export default function AuditTrailPage() {
  const { user, profile, loading: userLoading, isAdmin } = useUser()
  const router = useRouter()
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterAction, setFilterAction] = useState<string>('all')
  const supabase = createClient()

  useEffect(() => {
    if (profile?.site_id) {
      loadAuditTrail()
    }
  }, [profile, filterAction])

  const loadAuditTrail = async () => {
    if (!profile?.site_id) return

    let query = supabase
      .from('audit_trail')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (filterAction !== 'all') {
      query = query.eq('action', filterAction)
    }

    const { data } = await query

    setEntries(data || [])
    setLoading(false)
  }

  const filteredEntries = entries.filter(entry => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      entry.table_name?.toLowerCase().includes(search) ||
      entry.action?.toLowerCase().includes(search) ||
      JSON.stringify(entry.new_data).toLowerCase().includes(search)
    )
  })

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
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-navy">Audit Trail</h1>
              <p className="text-sm text-gray-600">Complete history of all actions</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => router.push('/admin/reports')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <Card>
          <CardContent className="py-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search audit trail..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              >
                <option value="all">All Actions</option>
                <option value="INSERT">Inserts</option>
                <option value="UPDATE">Updates</option>
                <option value="DELETE">Deletes</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading audit trail...</p>
          </div>
        ) : filteredEntries.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-gray-500">No audit entries found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredEntries.map((entry) => (
              <Card key={entry.id}>
                <CardContent className="py-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 text-xs rounded font-medium ${
                          entry.action === 'INSERT' ? 'bg-teal-50 text-teal-700' :
                          entry.action === 'UPDATE' ? 'bg-primary-50 text-primary-700' :
                          'bg-red-50 text-red-700'
                        }`}>
                          {entry.action}
                        </span>
                        <span className="text-sm font-medium text-navy">
                          {entry.table_name}
                        </span>
                        <span className="text-xs text-gray-500">
                          ID: {entry.record_id}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">
                        {formatDateTime(entry.created_at)} by {entry.user_id}
                      </p>
                      {entry.new_data && (
                        <details className="mt-2">
                          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                            View data
                          </summary>
                          <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-x-auto">
                            {JSON.stringify(entry.new_data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
