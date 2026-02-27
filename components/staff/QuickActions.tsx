'use client'

import { Button } from '@/components/ui/button'
import { Thermometer, AlertTriangle, Package, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { TemperatureLog } from './TemperatureLog'
import { IncidentReport } from './IncidentReport'
import { DeliveryCheck } from './DeliveryCheck'
import { WasteLog } from './WasteLog'

interface QuickActionsProps {
  sessionId: string | null
  userId: string
  siteId: string
}

type ActiveView = 'menu' | 'temp' | 'incident' | 'delivery' | 'waste'

export function QuickActions({ sessionId, userId, siteId }: QuickActionsProps) {
  const [activeView, setActiveView] = useState<ActiveView>('menu')

  if (activeView === 'temp') {
    if (!sessionId) {
      return (
        <div className="bg-card rounded-2xl shadow-lg p-8 text-center border">
          <p className="text-muted-foreground">Please start a shift to log temperature readings</p>
          <Button onClick={() => setActiveView('menu')} className="mt-4">Back</Button>
        </div>
      )
    }
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setActiveView('menu')}>
          ← Back to Quick Actions
        </Button>
        <TemperatureLog sessionId={sessionId} userId={userId} />
      </div>
    )
  }

  if (activeView === 'incident') {
    if (!sessionId) {
      return (
        <div className="bg-card rounded-2xl shadow-lg p-8 text-center border">
          <p className="text-muted-foreground">Please start a shift to report incidents</p>
          <Button onClick={() => setActiveView('menu')} className="mt-4">Back</Button>
        </div>
      )
    }
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setActiveView('menu')}>
          ← Back to Quick Actions
        </Button>
        <IncidentReport 
          sessionId={sessionId} 
          siteId={siteId}
          userId={userId} 
          onClose={() => setActiveView('menu')}
        />
      </div>
    )
  }

  if (activeView === 'delivery') {
    if (!sessionId) {
      return (
        <div className="bg-card rounded-2xl shadow-lg p-8 text-center border">
          <p className="text-muted-foreground">Please start a shift to check deliveries</p>
          <Button onClick={() => setActiveView('menu')} className="mt-4">Back</Button>
        </div>
      )
    }
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setActiveView('menu')}>
          ← Back to Quick Actions
        </Button>
        <DeliveryCheck 
          sessionId={sessionId} 
          userId={userId} 
          onClose={() => setActiveView('menu')}
        />
      </div>
    )
  }

  if (activeView === 'waste') {
    if (!sessionId) {
      return (
        <div className="bg-card rounded-2xl shadow-lg p-8 text-center border">
          <p className="text-muted-foreground">Please start a shift to log waste</p>
          <Button onClick={() => setActiveView('menu')} className="mt-4">Back</Button>
        </div>
      )
    }
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setActiveView('menu')}>
          ← Back to Quick Actions
        </Button>
        <WasteLog 
          sessionId={sessionId} 
          userId={userId} 
          onClose={() => setActiveView('menu')}
        />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        onClick={() => setActiveView('temp')}
        className="bg-card rounded-xl p-4 hover:bg-muted transition-colors text-left min-h-[100px] flex flex-col justify-between"
      >
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <Thermometer className="h-6 w-6 text-primary" strokeWidth={2} />
          </div>
          <div>
            <h4 className="font-bold text-foreground mb-1">Temperature</h4>
            <p className="text-xs text-muted-foreground">Log fridge temps</p>
          </div>
        </div>
      </button>

      <button
        onClick={() => setActiveView('incident')}
        className="bg-card rounded-xl p-4 hover:bg-muted transition-colors text-left min-h-[100px] flex flex-col justify-between"
      >
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="h-6 w-6 text-destructive" strokeWidth={2} />
          </div>
          <div>
            <h4 className="font-bold text-foreground mb-1">Incident</h4>
            <p className="text-xs text-muted-foreground">Report issues</p>
          </div>
        </div>
      </button>

      <button
        onClick={() => setActiveView('delivery')}
        className="bg-card rounded-xl p-4 hover:bg-muted transition-colors text-left min-h-[100px] flex flex-col justify-between"
      >
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <Package className="h-6 w-6 text-accent" strokeWidth={2} />
          </div>
          <div>
            <h4 className="font-bold text-foreground mb-1">Delivery</h4>
            <p className="text-xs text-muted-foreground">Check stock in</p>
          </div>
        </div>
      </button>

      <button
        onClick={() => setActiveView('waste')}
        className="bg-card rounded-xl p-4 hover:bg-muted transition-colors text-left min-h-[100px] flex flex-col justify-between"
      >
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <Trash2 className="h-6 w-6 text-secondary" strokeWidth={2} />
          </div>
          <div>
            <h4 className="font-bold text-foreground mb-1">Waste</h4>
            <p className="text-xs text-muted-foreground">Log waste items</p>
          </div>
        </div>
      </button>
    </div>
  )
}
