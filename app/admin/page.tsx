'use client'

import { useUser } from '@/hooks/useUser'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ClipboardList, Users, FileText, ArrowLeft } from 'lucide-react'

export default function AdminDashboard() {
  const { user, profile, loading, isAdmin } = useUser()
  const router = useRouter()

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
    <div className="min-h-screen pb-20">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-navy">Admin Dashboard</h1>
              <p className="text-sm text-gray-600">{profile.full_name}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/')}
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Staff View
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/admin/templates')}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ClipboardList className="mr-2 h-6 w-6 text-primary" />
                Templates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Create and manage checklist templates for opening, closing, and other routines.</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/admin/users')}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="mr-2 h-6 w-6 text-primary" />
                Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Manage staff accounts, roles, and site assignments.</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/admin/reports')}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-6 w-6 text-primary" />
                Reports
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Export compliance data, view audit trails, and generate reports.</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
