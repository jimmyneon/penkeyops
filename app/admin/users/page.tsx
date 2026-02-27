'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/hooks/useUser'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { Database } from '@/types/database'

type User = Database['public']['Tables']['users']['Row']

export default function UsersPage() {
  const { user: currentUser, profile, loading: userLoading, isAdmin } = useUser()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (profile?.site_id) {
      loadUsers()
    }
  }, [profile])

  const loadUsers = async () => {
    if (!profile?.site_id) return

    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('site_id', profile.site_id)
      .order('full_name')

    setUsers(data || [])
    setLoading(false)
  }

  const toggleUserRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'staff' : 'admin'
    
    await supabase
      .from('users')
      .update({ role: newRole })
      .eq('id', userId)

    loadUsers()
  }

  const toggleUserActive = async (userId: string, isActive: boolean) => {
    await supabase
      .from('users')
      .update({ is_active: !isActive })
      .eq('id', userId)

    loadUsers()
  }

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!currentUser || !profile || !isAdmin) {
    router.push('/')
    return null
  }

  return (
    <div className="min-h-screen pb-20">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-navy">User Management</h1>
              <p className="text-sm text-gray-600">Manage staff accounts and roles</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => router.push('/admin')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading users...</p>
          </div>
        ) : users.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-gray-500">No users found</p>
            </CardContent>
          </Card>
        ) : (
          users.map((user) => (
            <Card key={user.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-navy">{user.full_name}</h3>
                    <p className="text-sm text-gray-600">{user.email}</p>
                    <div className="flex gap-2 mt-2">
                      <span className={`px-2 py-1 text-xs rounded ${
                        user.role === 'admin' 
                          ? 'bg-primary-100 text-primary-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {user.role}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded ${
                        user.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleUserRole(user.id, user.role)}
                      disabled={user.id === currentUser.id}
                    >
                      {user.role === 'admin' ? 'Make Staff' : 'Make Admin'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleUserActive(user.id, user.is_active)}
                      disabled={user.id === currentUser.id}
                    >
                      {user.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}

        <Card>
          <CardContent className="py-6">
            <p className="text-sm text-gray-600 mb-2">
              <strong>Note:</strong> New users are created automatically when they first log in via magic link.
            </p>
            <p className="text-sm text-gray-500">
              You&apos;ll need to manually add their user record to the database with their email and assign them to this site.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
