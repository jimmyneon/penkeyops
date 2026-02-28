'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Menu, X, Home, BarChart3, ListChecks, Package, Users, FileText, ClipboardList } from 'lucide-react'

interface AdminNavProps {
  title: string
  userName?: string
}

export function AdminNav({ title, userName }: AdminNavProps) {
  const [showMenu, setShowMenu] = useState(false)
  const router = useRouter()

  return (
    <>
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
            <h1 className="text-lg font-bold text-foreground">{title}</h1>
            {userName && <p className="text-xs text-muted-foreground">{userName}</p>}
          </div>
          <button
            onClick={() => router.push('/admin')}
            className="p-2 hover:bg-muted rounded-xl transition-colors"
            aria-label="Home"
          >
            <Home className="h-6 w-6 text-foreground" />
          </button>
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
                <h2 className="text-xl font-bold text-foreground">Admin Menu</h2>
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
                    router.push('/admin')
                    setShowMenu(false)
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors text-left"
                >
                  <Home className="h-5 w-5 text-primary" />
                  <span className="font-medium">Dashboard</span>
                </button>

                <button
                  onClick={() => {
                    router.push('/admin/analytics')
                    setShowMenu(false)
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors text-left"
                >
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <span className="font-medium">Analytics & Compliance</span>
                </button>

                <button
                  onClick={() => {
                    router.push('/admin/tasks')
                    setShowMenu(false)
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors text-left"
                >
                  <ListChecks className="h-5 w-5 text-primary" />
                  <span className="font-medium">Task Management</span>
                </button>

                <button
                  onClick={() => {
                    router.push('/admin/templates')
                    setShowMenu(false)
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors text-left"
                >
                  <ClipboardList className="h-5 w-5 text-primary" />
                  <span className="font-medium">Templates</span>
                </button>

                <button
                  onClick={() => {
                    router.push('/admin/food-items')
                    setShowMenu(false)
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors text-left"
                >
                  <Package className="h-5 w-5 text-primary" />
                  <span className="font-medium">Food Items Database</span>
                </button>

                <button
                  onClick={() => {
                    router.push('/admin/users')
                    setShowMenu(false)
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors text-left"
                >
                  <Users className="h-5 w-5 text-primary" />
                  <span className="font-medium">User Management</span>
                </button>

                <button
                  onClick={() => {
                    router.push('/admin/reports')
                    setShowMenu(false)
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors text-left"
                >
                  <FileText className="h-5 w-5 text-primary" />
                  <span className="font-medium">Reports & Export</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
