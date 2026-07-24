'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, Store, ClipboardList, CreditCard, Tag,
  Users, BookOpen, LogOut, CalendarClock, Settings, Menu, X, Sparkles, Receipt, FileText, Mail, Star,
} from 'lucide-react'
import { Logo } from '@/components/ui/Logo'

interface Counts { inscriptions: number; rdv: number; earlyAccess: number }

function NavBadge({ count }: { count: number }) {
  if (!count) return null
  return (
    <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white min-w-[18px] text-center leading-tight">
      {count > 99 ? '99+' : count}
    </span>
  )
}

function NavContent({ onClose, counts }: { onClose?: () => void; counts: Counts }) {
  const pathname = usePathname()
  const navItems = [
    { href: '/dashboard/super-admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { href: '/dashboard/super-admin/restaurants', label: 'Restaurants', icon: Store },
    { href: '/dashboard/super-admin/inscriptions', label: 'Inscriptions', icon: ClipboardList, badge: counts.inscriptions },
    { href: '/dashboard/super-admin/early-access', label: 'Early Access', icon: Sparkles, badge: counts.earlyAccess },
    { href: '/dashboard/super-admin/subscriptions', label: 'Abonnements', icon: CreditCard },
    { href: '/dashboard/super-admin/invoices', label: 'Factures', icon: Receipt },
    { href: '/dashboard/super-admin/promo-codes', label: 'Codes promo', icon: Tag },
    { href: '/dashboard/super-admin/users', label: 'Utilisateurs', icon: Users },
    { href: '/dashboard/super-admin/annuaire', label: 'Annuaire', icon: BookOpen },
    { href: '/dashboard/super-admin/featured', label: 'Coups de cœur', icon: Star },
    { href: '/dashboard/super-admin/fiches', label: 'Fiches Restaurateur', icon: FileText },
    { href: '/dashboard/super-admin/communication', label: 'Communication', icon: Mail },
    { href: '/dashboard/super-admin/appointments', label: 'Rendez-vous', icon: CalendarClock, badge: counts.rdv },
    { href: '/dashboard/super-admin/settings', label: 'Paramètres', icon: Settings },
  ]

  return (
    <>
      <nav className="flex-1 p-4 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {navItems.map(({ href, label, icon: Icon, exact, badge }) => {
          const active = exact ? pathname === href : (pathname === href || pathname.startsWith(href + '/'))
          return (
            <Link key={href} href={href} onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
              style={active
                ? { backgroundColor: 'rgba(249,115,22,0.08)', color: '#F97316' }
                : { backgroundColor: 'transparent', color: '#6B7280' }
              }
              onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.backgroundColor = '#F9FAFB'; (e.currentTarget as HTMLElement).style.color = '#F97316' } }}
              onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#6B7280' } }}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
              {badge !== undefined && <NavBadge count={badge} />}
            </Link>
          )
        })}
      </nav>
      <div className="p-4" style={{ borderTop: '1px solid #E5E7EB' }}>
        <form action="/logout" method="POST">
          <button type="submit"
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
            style={{ color: '#6B7280' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#FEF2F2'; (e.currentTarget as HTMLElement).style.color = '#EF4444' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#6B7280' }}>
            <LogOut className="w-4 h-4" />
            Déconnexion
          </button>
        </form>
      </div>
    </>
  )
}

export function SuperAdminSidebar({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [counts, setCounts] = useState<Counts>({ inscriptions: 0, rdv: 0, earlyAccess: 0 })
  const supabase = createClient()

  useEffect(() => {
    async function fetchCounts() {
      const [{ count: ins }, { count: rdv }, { count: earlyAccess }] = await Promise.all([
        supabase.from('inscriptions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('appointment_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('early_access_applications').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      ])
      setCounts({ inscriptions: ins ?? 0, rdv: rdv ?? 0, earlyAccess: earlyAccess ?? 0 })
    }
    fetchCounts()

    const channel = supabase
      .channel('sidebar-counts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inscriptions' }, fetchCounts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointment_requests' }, fetchCounts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'early_access_applications' }, fetchCounts)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex h-screen bg-white">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 min-h-screen flex-col" style={{ backgroundColor: '#FFFFFF', borderRight: '1px solid #E5E7EB' }}>
        <div className="p-6" style={{ borderBottom: '1px solid #E5E7EB' }}>
          <Logo textClassName="font-bold text-lg" textStyle={{ color: '#111111' }} />
          <p className="text-xs uppercase tracking-widest mt-1" style={{ color: '#9CA3AF' }}>Super Admin</p>
        </div>
        <NavContent counts={counts} />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 flex flex-col bg-white shadow-xl">
            <div className="p-5 flex items-center justify-between" style={{ borderBottom: '1px solid #E5E7EB' }}>
              <div>
                <Logo textClassName="font-bold text-base" textStyle={{ color: '#111111' }} />
                <p className="text-xs uppercase tracking-widest mt-0.5" style={{ color: '#9CA3AF' }}>Super Admin</p>
              </div>
              <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <NavContent onClose={() => setMobileOpen(false)} counts={counts} />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-white" style={{ borderBottom: '1px solid #E5E7EB' }}>
          <button onClick={() => setMobileOpen(true)} className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <Menu className="w-5 h-5 text-gray-700" />
            {(counts.inscriptions + counts.rdv + counts.earlyAccess) > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                {counts.inscriptions + counts.rdv + counts.earlyAccess > 9 ? '9+' : counts.inscriptions + counts.rdv + counts.earlyAccess}
              </span>
            )}
          </button>
          <Logo iconClassName="w-6 h-6" textClassName="font-bold text-sm text-gray-900" />
          <span className="text-xs text-gray-400 uppercase tracking-widest">Super Admin</span>
        </header>

        <main className="flex-1 overflow-auto bg-white">
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
