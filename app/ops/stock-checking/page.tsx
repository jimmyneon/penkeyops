'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Download, Camera, CheckCircle, RefreshCw } from 'lucide-react'

type SessionStatus = 'created' | 'printed' | 'scanned' | 'applied' | 'archived'

interface StockSession {
  id: string
  session_id: string
  status: SessionStatus
  created_at: string
  notes?: string
}

export default function StockCheckingPage() {
  const router = useRouter()
  const { user, profile } = useUser()
  const supabase = createClient()
  
  const [session, setSession] = useState<StockSession | null>(null)
  const [loading, setLoading] = useState(true)

  const loadTodaySession = async () => {
    if (!profile?.site_id) return

    const today = new Date().toISOString().split('T')[0]
    
    const { data, error } = await supabase
      .from('stock_sessions')
      .select('*')
      .eq('site_id', profile.site_id)
      .gte('created_at', `${today}T00:00:00`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Error loading session:', error)
    }

    setSession(data)
    setLoading(false)
  }

  useEffect(() => {
    loadTodaySession()
  }, [loadTodaySession])

  const createNewSession = async () => {
    if (!user || !profile?.site_id) return

    const sessionId = new Date().toISOString().split('T')[0] + '-PM'
    
    const { data, error } = await supabase
      .from('stock_sessions')
      .insert({
        session_id: sessionId,
        site_id: profile.site_id,
        created_by: user.id,
        status: 'created'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating session:', error)
      return
    }

    setSession(data)
  }

  const markPrinted = async () => {
    if (!session) return

    const { error } = await supabase
      .from('stock_sessions')
      .update({ status: 'printed' })
      .eq('id', session.id)

    if (!error) {
      setSession({ ...session, status: 'printed' })
    }
  }

  const resetSession = async () => {
    if (!session) return
    
    if (!confirm('Archive current session and start fresh?')) return

    await supabase
      .from('stock_sessions')
      .update({ status: 'archived' })
      .eq('id', session.id)

    await createNewSession()
  }

  const getButtonConfig = () => {
    if (!session) {
      return {
        text: 'Start Stock Check',
        action: createNewSession,
        icon: CheckCircle,
        color: 'bg-primary'
      }
    }

    switch (session.status) {
      case 'created':
        return {
          text: 'Download Template',
          action: () => router.push(`/ops/stock-checking/print?session_id=${session.session_id}`),
          icon: Download,
          color: 'bg-primary'
        }
      case 'printed':
        return {
          text: 'Scan Completed Sheet',
          action: () => router.push(`/ops/stock-checking/${session.session_id}/scan`),
          icon: Camera,
          color: 'bg-primary'
        }
      case 'scanned':
        return {
          text: 'Review & Confirm',
          action: () => router.push(`/ops/stock-checking/${session.session_id}/review`),
          icon: CheckCircle,
          color: 'bg-primary'
        }
      case 'applied':
        return {
          text: 'View Tonight / Morning / Orders',
          action: () => router.push(`/ops/stock-checking/${session.session_id}/results`),
          icon: CheckCircle,
          color: 'bg-green-600'
        }
      default:
        return {
          text: 'Start Stock Check',
          action: createNewSession,
          icon: CheckCircle,
          color: 'bg-primary'
        }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  const buttonConfig = getButtonConfig()
  const ButtonIcon = buttonConfig.icon

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card px-4 py-3 shadow-sm sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="p-2 hover:bg-muted rounded-xl transition-colors"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div className="text-center">
            <h1 className="text-lg font-bold">Stock Checking</h1>
            <p className="text-xs text-muted-foreground">Pen-Key Déli-caf</p>
          </div>
          <div className="w-10" />
        </div>
      </header>

      <main className="p-4 max-w-2xl mx-auto">
        {/* Session Info */}
        {session && (
          <div className="bg-card rounded-2xl p-4 mb-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm text-muted-foreground">Session ID</p>
                <p className="font-mono text-sm">{session.session_id}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-semibold capitalize">{session.status}</p>
              </div>
            </div>
            
            {/* Progress Steps */}
            <div className="flex items-center gap-2 mt-4">
              <div className={`flex-1 h-2 rounded-full ${session.status !== 'created' ? 'bg-primary' : 'bg-muted'}`} />
              <div className={`flex-1 h-2 rounded-full ${session.status === 'scanned' || session.status === 'applied' ? 'bg-primary' : 'bg-muted'}`} />
              <div className={`flex-1 h-2 rounded-full ${session.status === 'applied' ? 'bg-primary' : 'bg-muted'}`} />
            </div>
            <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
              <span>Print</span>
              <span>Scan</span>
              <span>Apply</span>
            </div>
          </div>
        )}

        {/* Instructions based on status */}
        <div className="bg-card rounded-2xl p-6 mb-6 shadow-sm">
          <h2 className="text-xl font-bold mb-3">
            {!session && 'Ready to Start'}
            {session?.status === 'created' && 'Step 1: Print Template'}
            {session?.status === 'printed' && 'Step 2: Scan Sheet'}
            {session?.status === 'scanned' && 'Step 3: Review Counts'}
            {session?.status === 'applied' && 'Complete!'}
          </h2>
          
          <p className="text-muted-foreground mb-4">
            {!session && 'Start a new stock check session. This will take about 10 minutes.'}
            {session?.status === 'created' && 'Download and print the stock check template. Fill in counts by hand.'}
            {session?.status === 'printed' && 'Use your camera to scan the completed sheet. AI will read the numbers.'}
            {session?.status === 'scanned' && 'Review the scanned counts and fix any issues before applying.'}
            {session?.status === 'applied' && 'Stock levels updated. View pull lists, prep needs, and orders.'}
          </p>

          {session?.status === 'created' && (
            <button
              onClick={markPrinted}
              className="text-sm text-primary hover:underline"
            >
              Already printed? Mark as printed →
            </button>
          )}
        </div>

        {/* Main Action Button - BIG and sticky at bottom */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent">
          <button
            onClick={buttonConfig.action}
            className={`${buttonConfig.color} text-white w-full max-w-2xl mx-auto py-6 rounded-2xl text-xl font-bold shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-3`}
          >
            <ButtonIcon className="h-6 w-6" />
            {buttonConfig.text}
          </button>
        </div>

        {/* Secondary Actions */}
        {session && (
          <div className="flex gap-3 mb-24 mt-4">
            <button
              onClick={resetSession}
              className="flex-1 bg-muted text-foreground py-3 rounded-xl font-medium hover:bg-muted/80 transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Reset
            </button>
            <button
              onClick={() => router.push(`/ops/stock-checking/${session.session_id}/manual`)}
              className="flex-1 bg-muted text-foreground py-3 rounded-xl font-medium hover:bg-muted/80 transition-colors"
            >
              Manual Entry
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
