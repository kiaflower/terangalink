'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Store, Users, Settings, LogOut, Zap } from 'lucide-react'
import { useAuth } from '@/lib/hooks/useAuth'

// "Créer admin" removed — admin creation is now inside each restaurant page
const navItems = [
  { label: "Vue d'ensemble", href: '/dashboard/super-admin', icon: LayoutDashboard, exact: true },
  { label: 'Restaurants', href: '/dashboard/super-admin/restaurants', icon: Store },
  { label: 'Utilisateurs', href: '/dashboard/super-admin/users', icon: Users },
  { label: 'Paramètres', href: '/dashboard/super-admin/settings', icon: Settings },
]

export function SuperAdminSidebar({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname()
  const { user, signOut } = useAuth()

  const inner = (
    <>
      {!mobile && (
        <div className="p-6 border-b border-surface-200">
          <Link href="/dashboard/super-admin" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand-orange rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white text-lg">TerangaLink</span>
          </Link>
          <span className="mt-2 inline-block text-xs font-semibold text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded-full">
            Super Admin
          </span>
        </div>
      )}

      <nav className="flex-1 p-4 space-y-0.5">
        {navItems.map((item) => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)
          return (
            <Link key={item.href} href={item.href} className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
              isActive ? 'bg-brand-orange/10 text-brand-orange' : 'text-gray-500 hover:bg-surface-100 hover:text-white'
            )}>
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-surface-200">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 bg-brand-orange rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {user?.full_name?.charAt(0).toUpperCase() || 'A'}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.full_name || 'Admin'}</p>
            <p className="text-gray-600 text-xs truncate">{user?.email}</p>
          </div>
        </div>
        <button onClick={signOut} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-red-500/10 hover:text-red-400 transition-all duration-150">
          <LogOut className="w-4 h-4" />
          Déconnexion
        </button>
      </div>
    </>
  )

  if (mobile) return <div className="flex flex-col h-full">{inner}</div>
  return <aside className="w-64 min-h-screen bg-surface-50 border-r border-surface-200 flex flex-col">{inner}</aside>
}
