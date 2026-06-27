'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, UtensilsCrossed, BarChart3,
  QrCode, Settings, LogOut, User, ExternalLink, ShoppingBag, Tag, Megaphone,
} from 'lucide-react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSettings } from '@/lib/hooks/useSettings'

const navItems = [
  { label: 'Tableau de bord', href: '/dashboard/restaurant', icon: LayoutDashboard, exact: true },
  { label: 'Menu', href: '/dashboard/restaurant/menu', icon: UtensilsCrossed },
  { label: 'Commandes', href: '/dashboard/restaurant/orders', icon: ShoppingBag },
  { label: 'Promotions', href: '/dashboard/restaurant/promotions', icon: Tag },
  { label: 'Bannières', href: '/dashboard/restaurant/banners', icon: Megaphone },
  { label: 'Analytiques', href: '/dashboard/restaurant/analytics', icon: BarChart3 },
  { label: 'QR Code', href: '/dashboard/restaurant/qrcode', icon: QrCode },
  { label: 'Profil', href: '/dashboard/restaurant/profile', icon: User },
  { label: 'Paramètres', href: '/dashboard/restaurant/settings', icon: Settings },
]

export function RestaurantSidebar({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const supabase = createClient()
  const settings = useSettings()
  const [slug, setSlug] = useState<string | null>(null)
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : settings.platform_url

  useEffect(() => {
    if (!user?.restaurant_id) return
    supabase.from('restaurants').select('slug').eq('id', user.restaurant_id).single()
      .then(({ data }) => { if (data) setSlug(data.slug) })
  }, [user?.restaurant_id, supabase])

  const inner = (
    <>
      {!mobile && (
        <div className="p-6" style={{ borderBottom: '1px solid #E5E7EB' }}>
          <Link href="/dashboard/restaurant" className="flex items-center gap-2.5">
            <img src="/logo-terangalink.jpg" alt="TerangaLink" className="w-8 h-8 rounded-lg object-cover" />
            <span className="font-bold text-lg" style={{ color: '#111111' }}>TerangaLink</span>
          </Link>
        </div>
      )}

      <nav className="flex-1 p-4 space-y-0.5">
        {navItems.map((item) => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
              style={{
                backgroundColor: isActive ? 'rgba(249,115,22,0.08)' : 'transparent',
                color: isActive ? '#F97316' : '#6B7280',
              }}
              onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = '#F9FAFB'; (e.currentTarget as HTMLElement).style.color = isActive ? '#F97316' : '#111111' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = isActive ? 'rgba(249,115,22,0.08)' : 'transparent'; (e.currentTarget as HTMLElement).style.color = isActive ? '#F97316' : '#6B7280' }}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </Link>
          )
        })}

        {slug && (
          <a
            href={`${baseUrl.replace(/\/$/, '')}/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 mt-2 pt-4"
            style={{ color: '#6B7280', borderTop: '1px solid #E5E7EB' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#111111' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#6B7280' }}
          >
            <ExternalLink className="w-4 h-4 flex-shrink-0" />
            Voir mon site
          </a>
        )}
      </nav>

      <div className="p-4" style={{ borderTop: '1px solid #E5E7EB' }}>
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-gray-900"
            style={{ backgroundColor: '#F97316' }}>
            {user?.full_name?.charAt(0).toUpperCase() || 'R'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: '#111111' }}>{user?.full_name || 'Restaurant'}</p>
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
