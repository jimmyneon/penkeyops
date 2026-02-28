'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/hooks/useUser'
import { useShiftSession } from '@/hooks/useShiftSession'
import { NowCard } from '@/components/staff/NowCard'
import { ComingUp } from '@/components/staff/ComingUp'
import { GroupChecklist } from '@/components/staff/GroupChecklist'
import { EndOfDayModal } from '@/components/staff/EndOfDayModal'
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
  const [showEndOfDay, setShowEndOfDay] = useState(false)

  useEffect(() => {
    if (!loading && (!user || !profile)) {
      router.push('/auth/login')
    }
  }, [loading, user, profile, router])

  // Auto-create session if none exists for today
  useEffect(() => {
    const autoCreateSession = async () => {
      if (!user || !profile?.site_id || activeSession || loading) return
      
      // Check if a session already exists for today (complete or incomplete)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const { data: existingSession } = await supabase
        .from('shift_sessions')
        .select('id')
        .eq('site_id', profile.site_id)
        .gte('started_at', today.toISOString())
        .limit(1)
        .maybeSingle()
      
      // If session exists for today, don't create a new one
      if (existingSession) {
        console.log('Session already exists for today, skipping auto-create')
        return
      }
      
      const shiftType = getShiftType()
      try {
        const { data: session, error } = await supabase
          .from('shift_sessions')
          .insert({
            site_id: profile.site_id,
            started_by: user.id,
            shift_type: shiftType,
          })
          .select()
          .single()

        if (error) throw error

        if (session) {
          // Load ALL active templates (Opening + Mid + Closing)
          // shift_type is for internal tracking only, not filtering
          const { data: templates } = await supabase
            .from('templates')
            .select('id')
            .eq('is_active', true)
            .or(`site_id.eq.${profile.site_id},site_id.is.null`)

          if (templates && templates.length > 0) {
            for (const template of templates) {
              await supabase.rpc('create_checklist_from_template', {
                p_shift_session_id: session.id,
                p_template_id: template.id,
              })
            }
          }
        }

        refreshSession()
      } catch (error) {
        console.error('Error auto-creating session:', error)
      }
    }

    autoCreateSession()
  }, [user, profile, activeSession, loading, supabase, refreshSession])

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
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground text-lg">Loading your shift...</p>
            </div>
          </div>
        ) : activeSession.is_complete ? (
          <div className="min-h-[80vh] flex items-center justify-center p-6">
            <div className="text-center max-w-lg">
              <div className="text-8xl mb-6">🎉</div>
              <h1 className="text-5xl font-bold text-foreground mb-4">All Done for Today!</h1>
              <p className="text-xl text-muted-foreground mb-8">
                Have a lovely evening. See you tomorrow!
              </p>
              <div className="bg-muted/30 rounded-2xl p-6 mb-6">
                <p className="text-sm text-muted-foreground">
                  Shift completed at {new Date(activeSession.completed_at || '').toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* NOW Card - 70% of screen */}
            <NowCard 
              sessionId={activeSession.id}
              onEndShift={() => setShowEndOfDay(true)}
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

        {/* End of Day Modal */}
        {showEndOfDay && activeSession && (
          <EndOfDayModal
            sessionId={activeSession.id}
            onClose={() => setShowEndOfDay(false)}
            onConfirmEnd={async () => {
              try {
                // Mark End of Day task as complete
                const { data: endOfDayTask } = await supabase
                  .from('checklist_results')
                  .select('id')
                  .eq('checklist_instance_id', (await supabase
                    .from('checklist_instances')
                    .select('id, template_items!inner(title)')
                    .eq('shift_session_id', activeSession.id)
                    .eq('template_items.title', 'End of Day')
                    .single()
                  ).data?.id || '')
                  .single()

                if (endOfDayTask) {
                  await supabase
                    .from('checklist_results')
                    .update({
                      status: 'completed',
                      completed_at: new Date().toISOString()
                    })
                    .eq('id', endOfDayTask.id)
                }

                // Mark shift as complete
                await supabase
                  .from('shift_sessions')
                  .update({
                    completed_by: user.id,
                    completed_at: new Date().toISOString(),
                    is_complete: true,
                  })
                  .eq('id', activeSession.id)
                
                setShowEndOfDay(false)
                refreshSession()
              } catch (error) {
                console.error('Error completing shift:', error)
              }
            }}
          />
        )}
      </main>
    </div>
  )

  function getShiftType(): 'opening' | 'mid' | 'closing' {
    const hour = new Date().getHours()
    // Business hours: 8:30am - 5pm
    // Opening: 8am - 10am
    // Operational (mid): 10am - 2pm
    // Closing: 2pm - 5pm
    if (hour >= 8 && hour < 10) return 'opening'
    if (hour >= 10 && hour < 14) return 'mid'
    if (hour >= 14 && hour < 17) return 'closing'
    // Outside business hours - default to closing
    return 'closing'
  }
}
