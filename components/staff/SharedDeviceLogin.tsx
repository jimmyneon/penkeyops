'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { User, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface StaffMember {
  id: string
  full_name: string
  email: string
}

export function SharedDeviceLogin() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    loadStaff()
  }, [])

  const loadStaff = async () => {
    const { data } = await supabase
      .from('users')
      .select('id, full_name, email')
      .eq('is_active', true)
      .order('full_name')

    setStaff(data || [])
    setLoading(false)
  }

  const handleQuickLogin = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false
      }
    })

    if (error) {
      alert('Failed to send login link. Please try again.')
    } else {
      alert(`Login link sent to ${email}. Check your email to continue.`)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream p-4">
      <div className="max-w-2xl mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-navy mb-2">Penkey Ops</h1>
          <p className="text-gray-600">Tap your name to get started</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="mr-2 h-5 w-5" />
              Select Your Name
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {staff.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No active staff members found
              </p>
            ) : (
              staff.map((member) => (
                <Button
                  key={member.id}
                  variant="outline"
                  className="w-full h-16 text-lg justify-start"
                  onClick={() => handleQuickLogin(member.email)}
                >
                  <User className="mr-3 h-6 w-6" />
                  {member.full_name}
                </Button>
              ))
            )}
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="text-gray-600"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Different Account
          </Button>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>First time? You&apos;ll receive a login link via email.</p>
          <p className="mt-1">Already logged in? You&apos;ll be signed in automatically.</p>
        </div>
      </div>
    </div>
  )
}
