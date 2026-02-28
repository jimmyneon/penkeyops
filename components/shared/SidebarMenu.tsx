'use client'

import { useRouter } from 'next/navigation'
import { X, ClipboardList, AlertTriangle, Thermometer, Trash2, Package, User } from 'lucide-react'

interface SidebarMenuProps {
  showMenu: boolean
  setShowMenu: (show: boolean) => void
}

export function SidebarMenu({ showMenu, setShowMenu }: SidebarMenuProps) {
  const router = useRouter()

  return (
    <>
      {/* Overlay */}
      <div 
        className={`fixed inset-0 bg-black/50 z-50 transition-opacity duration-300 ${showMenu ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setShowMenu(false)}
      />
      
      {/* Menu Panel */}
      <div 
        className={`fixed left-0 top-0 bottom-0 w-80 bg-card shadow-2xl p-6 z-50 transform transition-transform duration-300 ease-out ${
          showMenu 
            ? 'translate-x-0' 
            : '-translate-x-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
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
        </div>
      </div>
    </>
  )
}
