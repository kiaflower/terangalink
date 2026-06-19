'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, UtensilsCrossed, BarChart3,
  QrCode, Settings, LogOut, Zap, User, ExternalLink, ShoppingBag, Tag,
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
  const baseUrl = typeof window !== 'undefined'
    ? window.location.origin
    : settings.platform_url

  useEffect(() => {
    if (!user?.restaurant_id) return
    supabase.from('restaurants').select('slug').eq('id', user.restaurant_id).single()
      .then(({ data }) => { if (data) setSlug(data.slug) })
  }, [user?.restaurant_id, supabase])

  const inner = (
    <>
      {!mobile && (
        <div className="p-6 border-b border-surface-200">
          <Link href="/dashboard/restaurant" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand-orange rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white text-lg">TerangaLink</span>
          </Link>
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

        {/* Voir mon site */}
        {slug && (
          <a
            href={`${baseUrl.replace(/\/$/, '')}/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-surface-100 hover:text-white transition-all duration-150 mt-2 border-t border-surface-200 pt-4"
          >
            <ExternalLink className="w-4 h-4 flex-shrink-0" />
            Voir mon site
          </a>
        )}
      </nav>

      <div className="p-4 border-t border-surface-200">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 bg-brand-orange/20 rounded-full flex items-center justify-center text-brand-orange text-xs font-bold flex-shrink-0">
            {user?.full_name?.charAt(0).toUpperCase() || 'R'}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.full_name || 'Restaurant'}</p>
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

  return (
    <aside className="w-64 min-h-screen bg-surface-50 border-r border-surface-200 flex flex-col">
      {inner}
    </aside>
  )
}