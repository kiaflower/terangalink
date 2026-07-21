'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, Package, ShoppingBag, Building2, BarChart2,
  Percent, Settings, QrCode, Gift, Megaphone, Circle,
  LogOut, ExternalLink, ArrowLeft, Menu, X,
} from 'lucide-react'
import { Logo } from '@/components/ui/Logo'

const navItems = [
  { href: '/dashboard/boutique', label: 'Tableau de bord', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/boutique/catalogue', label: 'Catalogue', icon: Package },
  { href: '/dashboard/boutique/stories', label: 'Stories', icon: Circle },
  { href: '/dashboard/boutique/orders', label: 'Commandes', icon: ShoppingBag },
  { href: '/dashboard/boutique/promotions', label: 'Promotions', icon: Percent },
  { href: '/dashboard/boutique/banners', label: 'Bannières', icon: Megaphone },
  { href: '/dashboard/boutique/analytics', label: 'Analytiques', icon: BarChart2 },
  { href: '/dashboard/boutique/qrcode', label: 'QR Code', icon: QrCode },
  { href: '/dashboard/boutique/parrainage', label: 'Parrainage', icon: Gift },
  { href: '/dashboard/boutique/profile', label: 'Profil boutique', icon: Building2 },
  { href: '/dashboard/boutique/settings', label: 'Paramètres', icon: Settings },
]

interface BoutiqueSidebarProps {
  children: React.ReactNode
  boutiqueName?: string | null
  impersonating?: boolean
}

export function BoutiqueSidebar({ children, boutiqueName, impersonating }: BoutiqueSidebarProps) {
  const pathname = usePathname()
  const supabase = createClient()
  const [slug, setSlug] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [fullName, setFullName] = useState<string | null>(null)
  const [siteOrigin, setSiteOrigin] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    setSiteOrigin(window.location.origin)
    // Use /api/auth/me which handles impersonation correctly
    fetch('/api/auth/me').then(r => r.json()).then(async (me) => {
      const boutiqueId = me.boutique_id
      if (boutiqueId) {
        const { data: b } = await supabase.from('boutiques').select('slug').eq('id', boutiqueId).single()
        if (b) setSlug(b.slug)
      }
    })
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setEmail(user.email ?? null)
      supabase.from('profiles').select('full_name').eq('id', user.id).single()
        .then(({ data: profile }) => { if (profile?.full_name) setFullName(profile.full_name) })
    })
  }, [supabase])

  useEffect(() => { setMobileOpen(false) }, [pathname])

  async function handleSignOut() {
    await supabase.auth.signOut()
    // Clear any leftover impersonation cookie so the next login on this
    // browser (super-admin or regular boutique owner) starts clean.
    await fetch('/api/super-admin/impersonate', { method: 'DELETE' }).catch(() => {})
    window.location.href = '/'
  }

  return (
    <div className="flex flex-col lg:flex-row h-dvh bg-white">
      {/* Mobile topbar — sticky pour rester visible pendant le scroll du contenu */}
      <div className="lg:hidden sticky top-0 z-30 flex items-center gap-3 px-4 py-3 flex-shrink-0 bg-white" style={{ borderBottom: '1px solid #E5E7EB' }}>
        <button onClick={() => setMobileOpen(true)} aria-label="Ouvrir le menu" className="p-2 -ml-2 text-gray-700">
          <Menu className="w-6 h-6" />
        </button>
        <Link href="/dashboard/boutique">
          <Logo iconClassName="w-7 h-7" textClassName="font-bold text-lg" textStyle={{ color: '#111111' }} />
        </Link>
      </div>

      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileOpen(false)} />
      )}

      {/* h-dvh (pas min-h-*) : quand les onglets dépassent la hauteur visible, seul le
          <nav> interne (flex-1 overflow-y-auto) scrolle — le logo en haut et le bloc
          compte/déconnexion en bas restent fixes, dans le tiroir mobile comme en desktop. */}
      <aside
        className={`w-64 h-dvh flex flex-col fixed lg:static inset-y-0 left-0 z-50 transition-transform duration-200 lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ backgroundColor: '#FFFFFF', borderRight: '1px solid #E5E7EB' }}
      >

        <div className="p-6 flex items-center justify-between flex-shrink-0" style={{ borderBottom: '1px solid #E5E7EB' }}>
          <div>
            <Link href="/dashboard/boutique">
              <Logo textClassName="font-bold text-lg" textStyle={{ color: '#111111' }} />
            </Link>
            {boutiqueName && (
              <p className="text-xs mt-1 truncate" style={{ color: '#9CA3AF' }}>{boutiqueName}</p>
            )}
          </div>
          <button onClick={() => setMobileOpen(false)} aria-label="Fermer le menu" className="lg:hidden p-1 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
                style={isActive
                  ? { backgroundColor: 'rgba(124,58,237,0.08)', color: '#7C3AED' }
                  : { backgroundColor: 'transparent', color: '#6B7280' }
                }
                onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.backgroundColor = '#F9FAFB'; (e.currentTarget as HTMLElement).style.color = '#7C3AED' } }}
                onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#6B7280' } }}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </Link>
            )
          })}

          {slug && (
            <a
              href={`${siteOrigin}/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 mx-0 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors mt-2"
              style={{ color: '#7C3AED', border: '1px solid rgba(124,58,237,0.2)' }}
            >
              <ExternalLink className="w-4 h-4 flex-shrink-0" />
              Voir mon site
            </a>
          )}
        </nav>

        <div className="p-4 flex-shrink-0" style={{ borderTop: '1px solid #E5E7EB' }}>
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-white"
              style={{ backgroundColor: '#7C3AED' }}>
              {fullName?.charAt(0).toUpperCase() || 'B'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: '#111111' }}>{fullName || 'Boutique'}</p>
              <p className="text-xs truncate" style={{ color: '#9CA3AF' }}>{email}</p>
            </div>
          </div>
          {impersonating && (
            <Link href="/dashboard/super-admin/boutiques"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-amber-600 hover:bg-amber-50 transition-colors mb-1">
              <ArrowLeft className="w-4 h-4" />
              Retour super-admin
            </Link>
          )}
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
            style={{ color: '#6B7280' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#FEF2F2'; (e.currentTarget as HTMLElement).style.color = '#EF4444' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#6B7280' }}
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-white">
        {impersonating && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2 text-xs text-amber-600 flex items-center justify-between">
            <span>Mode impersonation — vous gérez une boutique en tant que super-admin</span>
            <Link href="/dashboard/super-admin/boutiques" className="font-semibold hover:underline">Quitter</Link>
          </div>
        )}
        <div className="p-6 sm:p-8 max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  )
}
