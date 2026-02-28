'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Home, Menu, User, LogOut, Mail, Building, Shield } from 'lucide-react'
import { SidebarMenu } from '@/components/shared/SidebarMenu'
import { useUser } from '@/hooks/useUser'

export default function ProfilePage() {
  const router = useRouter()
  const { user, profile, loading: userLoading } = useUser()
  const [showMenu, setShowMenu] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const supabase = createClient()

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await supabase.auth.signOut()
      router.push('/auth/login')
    } catch (error) {
      console.error('Error logging out:', error)
      alert('Failed to log out')
    } finally {
      setLoggingOut(false)
    }
  }

  if (userLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!user) {
    router.push('/auth/login')
    return null
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
            <User className="h-6 w-6 text-primary" />
            <h1 className="text-lg font-bold text-foreground">Profile</h1>
          </div>
          <button
            onClick={() => router.push('/')}
            className="p-2 hover:bg-muted rounded-xl transition-colors"
          >
            <Home className="h-6 w-6 text-foreground" />
          </button>
        </div>
      </header>

      <main className="p-4 max-w-2xl mx-auto">
        {/* Profile Card */}
        <div className="bg-card rounded-2xl p-6 shadow-sm mb-4">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center">
              <User className="h-10 w-10 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-foreground mb-1">
                {profile?.full_name || 'User'}
              </h2>
              <p className="text-sm text-muted-foreground capitalize">
                {profile?.role || 'Staff'} Member
              </p>
            </div>
          </div>

          {/* User Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-xl">
              <Mail className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">Email</p>
                <p className="text-sm font-medium text-foreground">{user.email}</p>
              </div>
            </div>

            {profile?.site_id && (
              <div className="flex items-center gap-3 p-3 bg-muted rounded-xl">
                <Building className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">Site</p>
                  <p className="text-sm font-medium text-foreground">
                    {profile.site_id}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 p-3 bg-muted rounded-xl">
              <Shield className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">Role</p>
                <p className="text-sm font-medium text-foreground capitalize">
                  {profile?.role || 'Staff'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Account Status */}
        <div className="bg-card rounded-2xl p-6 shadow-sm mb-4">
          <h3 className="text-lg font-bold text-foreground mb-4">Account Status</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Active</p>
              <p className="text-xs text-muted-foreground">
                {profile?.is_active ? 'Your account is active' : 'Account inactive'}
              </p>
            </div>
            <div className={`w-3 h-3 rounded-full ${profile?.is_active ? 'bg-teal-500' : 'bg-red-500'}`} />
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full bg-red-500 text-white py-4 rounded-2xl font-bold hover:bg-red-600 transition-all shadow-lg flex items-center justify-center gap-3 disabled:opacity-50"
        >
          <LogOut className="h-5 w-5" />
          {loggingOut ? 'Logging out...' : 'Log Out'}
        </button>

        {/* App Info */}
        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            Penkey Ops v1.0
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            © 2026 Penkey. All rights reserved.
          </p>
        </div>
      </main>

      <SidebarMenu showMenu={showMenu} setShowMenu={setShowMenu} />
    </div>
  )
}
