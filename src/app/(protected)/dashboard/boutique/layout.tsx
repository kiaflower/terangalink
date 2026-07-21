import type { Metadata, Viewport } from 'next'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { BoutiqueSidebar } from '@/components/layout/BoutiqueSidebar'
import { BoutiqueSessionGuard } from '@/components/dashboard/BoutiqueSessionGuard'
import { InstallPwaBanner } from '@/components/dashboard/InstallPwaBanner'
import { RegisterServiceWorker } from '@/components/dashboard/RegisterServiceWorker'

// Manifest servi par une route API (pas un fichier statique) car il doit
// varier selon la boutique connectée — voir src/app/api/pwa/manifest/route.ts.
export const metadata: Metadata = {
  manifest: '/api/pwa/manifest',
  icons: { apple: '/api/pwa/icon/180' },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'TerangaSpot',
  },
  other: { 'mobile-web-app-capable': 'yes' },
}

export const viewport: Viewport = {
  themeColor: '#7C3AED',
}

export default async function BoutiqueDashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const cookieStore = cookies()
  const impersonateCookie = cookieStore.get('sa_impersonate')?.value

  // Only ever trust the impersonation cookie if the currently logged-in user
  // is actually a super_admin — otherwise a stale cookie (left over from a
  // previous super-admin session on the same browser) would silently put a
  // regular boutique owner into impersonation mode for someone else's boutique.
  const { data: profile } = await supabase.from('profiles').select('*, boutique:boutiques(*)').eq('id', user.id).single()
  const isSuperAdmin = (profile as { role?: string } | null)?.role === 'super_admin'
  const impersonating = isSuperAdmin && !!impersonateCookie

  let boutique = null

  if (impersonating) {
    // Use admin client to bypass RLS when super-admin impersonates
    const admin = createAdminClient()
    const { data: b } = await admin.from('boutiques').select('*').eq('id', impersonateCookie!).single()
    boutique = b
  } else {
    boutique = (profile as { boutique?: typeof boutique })?.boutique ?? null
  }

  return (
    <BoutiqueSidebar
      boutiqueName={(boutique as { name: string } | null)?.name}
      impersonating={impersonating}
    >
      <BoutiqueSessionGuard />
      <RegisterServiceWorker />
      <InstallPwaBanner variant="boutique" />
      {children}
    </BoutiqueSidebar>
  )
}
