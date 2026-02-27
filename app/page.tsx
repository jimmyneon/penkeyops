'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/hooks/useUser'
import { useShiftSession } from '@/hooks/useShiftSession'
import { NowCard } from '@/components/staff/NowCard'
import { ComingUp } from '@/components/staff/ComingUp'
import { GroupChecklist } from '@/components/staff/GroupChecklist'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Menu, X, ClipboardList, Thermometer, Trash2, Package, AlertTriangle, User } from 'lucide-react'

export default function Home() {
  const { user, profile, loading, isAdmin } = useUser()
  const { session: activeSession, refreshSession } = useShiftSession(profile?.site_id || null)
  const router = useRouter()
  const supabase = createClient()
  const [showGroupChecklist, setShowGroupChecklist] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<{ id: string; name: string } | null>(null)
  const [showMenu, setShowMenu] = useState(false)
  const [autoStarting, setAutoStarting] = useState(false)

  useEffect(() => {
    if (!loading && (!user || !profile)) {
      router.push('/auth/login')
    }
  }, [loading, user, profile, router])

  // Auto-create shift if none exists
  useEffect(() => {
    const autoStartShift = async () => {
      if (!user || !profile?.site_id || activeSession || autoStarting || loading) return
      
      setAutoStarting(true)
      try {
        const shiftType = getShiftType()
        
        const { data: session, error: sessionError } = await supabase
          .from('shift_sessions')
          .insert({
            site_id: profile.site_id,
            started_at: new Date().toISOString(),
            started_by: user.id,
            shift_type: shiftType,
          })
          .select()
          .single()

        if (sessionError) throw sessionError

        const { data: template } = await supabase
          .from('templates')
          .select('id')
          .eq('template_type', shiftType)
          .single()

        if (template) {
          await supabase.rpc('create_checklist_from_template', {
            p_shift_session_id: session.id,
            p_template_id: template.id
          })
        }
        
        refreshSession()
      } catch (error) {
        console.error('Error auto-starting shift:', error)
      } finally {
        setAutoStarting(false)
      }
    }

    autoStartShift()
  }, [user, profile, activeSession, autoStarting, loading, supabase, refreshSession])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

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

  if (!user || !profile) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header with burger menu */}
      <header className="bg-card px-4 py-3 shadow-sm sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-muted rounded-xl transition-colors"
            aria-label="Menu"
          >
            <Menu className="h-6 w-6 text-foreground" />
          </button>
          <div className="text-center">
            <h1 className="text-lg font-bold text-foreground">Penkey Ops</h1>
            <p className="text-xs text-muted-foreground">{profile.full_name}</p>
          </div>
          <div className="w-10" />
        </div>
      </header>

      {/* Slide-out menu */}
      {showMenu && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowMenu(false)}
          />
          <div className="fixed inset-y-0 left-0 w-80 bg-card shadow-2xl z-50 overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-foreground">Menu</h2>
                <button
                  onClick={() => setShowMenu(false)}
                  className="p-2 hover:bg-muted rounded-xl transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => {
                    router.push('/')
                    setShowMenu(false)
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors text-left"
                >
                  <ClipboardList className="h-5 w-5 text-primary" />
                  <span className="font-medium">Dashboard</span>
                </button>

                <button
                  onClick={() => {
                    router.push('/completed')
                    setShowMenu(false)
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors text-left"
                >
                  <ClipboardList className="h-5 w-5 text-primary" />
                  <span className="font-medium">Completed Tasks</span>
                </button>

                <button
                  onClick={() => {
                    router.push('/incidents')
                    setShowMenu(false)
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors text-left"
                >
                  <AlertTriangle className="h-5 w-5 text-primary" />
                  <span className="font-medium">Incidents</span>
                </button>

                <button
                  onClick={() => {
                    router.push('/logs/temperature')
                    setShowMenu(false)
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors text-left"
                >
                  <Thermometer className="h-5 w-5 text-primary" />
                  <span className="font-medium">Temperature Logs</span>
                </button>

                <button
                  onClick={() => {
                    router.push('/logs/waste')
                    setShowMenu(false)
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors text-left"
                >
                  <Trash2 className="h-5 w-5 text-primary" />
                  <span className="font-medium">Waste Logs</span>
                </button>

                <button
                  onClick={() => {
                    router.push('/logs/delivery')
                    setShowMenu(false)
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors text-left"
                >
                  <Package className="h-5 w-5 text-primary" />
                  <span className="font-medium">Delivery Logs</span>
                </button>

                <div className="border-t border-border my-4" />

                <button
                  onClick={() => {
                    router.push('/profile')
                    setShowMenu(false)
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors text-left"
                >
                  <User className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Profile</span>
                </button>

                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-destructive/10 text-destructive transition-colors text-left"
                >
                  <X className="h-5 w-5" />
                  <span className="font-medium">Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <main className="p-4 max-w-2xl mx-auto">
        {!activeSession ? (
          <div className="h-[60vh] flex items-center justify-center p-6">
            <div className="text-center max-w-md">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground text-lg">Starting your shift...</p>
            </div>
          </div>
        ) : (
          <>
            {/* NOW Card - 70% of screen */}
            <NowCard 
              sessionId={activeSession.id}
              onEndShift={async () => {
                try {
                  await supabase
                    .from('shift_sessions')
                    .update({
                      completed_by: user.id,
                      completed_at: new Date().toISOString(),
                      is_complete: true,
                    })
                    .eq('id', activeSession.id)
                  refreshSession()
                } catch (error) {
                  console.error('Error completing shift:', error)
                }
              }}
              onTaskAction={(taskId, groupId, actionType) => {
                if (actionType === 'group' && groupId) {
                  setSelectedGroup({ id: groupId, name: 'Task Group' })
                  setShowGroupChecklist(true)
                }
                // Regular tasks are now completed inline in NowCard
              }}
            />

            {/* Coming Up Strip */}
            <ComingUp sessionId={activeSession.id} />
          </>
        )}

        {/* Group Checklist Modal */}
        {showGroupChecklist && selectedGroup && activeSession && (
          <GroupChecklist
            sessionId={activeSession.id}
            groupId={selectedGroup.id}
            groupName={selectedGroup.name}
            onClose={() => {
              setShowGroupChecklist(false)
              setSelectedGroup(null)
            }}
          />
        )}
      </main>
    </div>
  )

  function getShiftType(): 'opening' | 'mid' | 'closing' {
    const hour = new Date().getHours()
    if (hour < 9) return 'opening'
    if (hour < 16) return 'mid'
    return 'closing'
  }
}
