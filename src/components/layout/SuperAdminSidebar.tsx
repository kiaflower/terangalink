'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LayoutDashboard, Store, Users, Settings, LogOut, CreditCard, Tag, LayoutGrid, ClipboardList, Calendar } from 'lucide-react'
import { useAuth } from '@/lib/hooks/useAuth'

const navItems = [
  { label: "Vue d'ensemble", href: '/dashboard/super-admin', icon: LayoutDashboard, exact: true, badgeKey: null },
  { label: 'Restaurants', href: '/dashboard/super-admin/restaurants', icon: Store, badgeKey: null },
  { label: 'Inscriptions', href: '/dashboard/super-admin/inscriptions', icon: ClipboardList, badgeKey: 'pendingApplications' as const },
  { label: 'Annuaire', href: '/dashboard/super-admin/annuaire', icon: LayoutGrid, badgeKey: null },
  { label: 'Abonnements', href: '/dashboard/super-admin/subscriptions', icon: CreditCard, badgeKey: null },
  { label: 'Utilisateurs', href: '/dashboard/super-admin/users', icon: Users, badgeKey: null },
  { label: 'Disponibilités', href: '/dashboard/super-admin/disponibilites', icon: Calendar, badgeKey: 'pendingAppointments' as const },
  { label: 'Codes promo', href: '/dashboard/super-admin/promo-codes', icon: Tag, badgeKey: null },
  { label: 'Paramètres', href: '/dashboard/super-admin/settings', icon: Settings, badgeKey: null },
]

interface Counters {
  pendingApplications: number
  pendingAppointments: number
}

export function SuperAdminSidebar({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const [counters, setCounters] = useState<Counters>({ pendingApplications: 0, pendingAppointments: 0 })

  useEffect(() => {
    fetch('/api/super-admin/counters')
      .then(r => r.json())
      .then(data => { if (!data.error) setCounters(data) })
      .catch(() => {})
  }, [])

  const inner = (
    <>
      {!mobile && (
        <div className="p-6" style={{ borderBottom: '1px solid #E5E7EB' }}>
          <Link href="/dashboard/super-admin" className="flex items-center gap-2.5">
            <img src="/logo-terangalink.jpg" alt="TerangaLink" className="w-8 h-8 rounded-lg object-cover" />
            <span className="font-bold text-lg" style={{ color: '#111111' }}>TerangaLink</span>
          </Link>
          <span className="mt-2 inline-block text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ color: '#F97316', backgroundColor: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)' }}>
            Super Admin
          </span>
        </div>
      )}

      <nav className="flex-1 p-4 space-y-0.5">
        {navItems.map((item) => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)
          const badgeCount = item.badgeKey ? counters[item.badgeKey] : 0
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
              style={{
                backgroundColor: isActive ? 'rgba(249,115,22,0.08)' : 'transparent',
                color: isActive ? '#F97316' : '#6B7280',
              }}
              onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.backgroundColor = '#F9FAFB'; (e.currentTarget as HTMLElement).style.color = '#111111' } }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = isActive ? 'rgba(249,115,22,0.08)' : 'transparent'; (e.currentTarget as HTMLElement).style.color = isActive ? '#F97316' : '#6B7280' }}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {badgeCount > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: '#F97316' }}>
                  {badgeCount > 99 ? '99+' : badgeCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="p-4" style={{ borderTop: '1px solid #E5E7EB' }}>
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-gray-900"
            style={{ backgroundColor: '#F97316' }}>
            {user?.full_name?.charAt(0).toUpperCase() || 'A'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: '#111111' }}>{user?.full_name || 'Admin'}</p>
            <p className="text-xs truncate" style={{ color: '#9CA3AF' }}>{user?.email}</p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
          style={{ color: '#6B7280' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#FEF2F2'; (e.currentTarget as HTMLElement).style.color = '#EF4444' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#6B7280' }}
        >
          <LogOut className="w-4 h-4" />
          Déconnexion
        </button>
      </div>
    </>
  )

  if (mobile) return <div className="flex flex-col h-full">{inner}</div>
  return (
    <aside className="w-64 min-h-screen flex flex-col" style={{ backgroundColor: '#FFFFFF', borderRight: '1px solid #E5E7EB' }}>
      {inner}
    </aside>
  )
}
