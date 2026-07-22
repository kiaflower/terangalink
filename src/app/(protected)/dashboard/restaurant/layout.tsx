import type { Metadata, Viewport } from 'next'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { RestaurantSidebar } from '@/components/layout/RestaurantSidebar'
import { RestaurantSessionGuard } from '@/components/dashboard/RestaurantSessionGuard'
import { InstallPwaBanner } from '@/components/dashboard/InstallPwaBanner'
import { RegisterServiceWorker } from '@/components/dashboard/RegisterServiceWorker'

export const dynamic = 'force-dynamic'

// Manifest servi par une route API (pas un fichier statique) car il doit
// varier selon le restaurant connectée — voir src/app/api/pwa/manifest/route.ts.
export const metadata: Metadata = {
  manifest: '/api/pwa/manifest',
  icons: { apple: '/api/pwa/icon/180' },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'TerangaLink',
  },
  other: { 'mobile-web-app-capable': 'yes' },
}

export const viewport: Viewport = {
  themeColor: '#F97316',
}

export default async function RestaurantDashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const cookieStore = cookies()
  const impersonateCookie = cookieStore.get('sa_impersonate')?.value

  // Only ever trust the impersonation cookie if the currently logged-in user
  // is actually a super_admin — otherwise a stale cookie (left over from a
  // previous super-admin session on the same browser) would silently put a
  // regular restaurant owner into impersonation mode for someone else's restaurant.
  const { data: profile } = await supabase.from('profiles').select('*, restaurant:restaurants(*)').eq('id', user.id).single()
  const isSuperAdmin = (profile as { role?: string } | null)?.role === 'super_admin'
  const impersonating = isSuperAdmin && !!impersonateCookie

  let restaurant = null

  if (impersonating) {
    // Use admin client to bypass RLS when super-admin impersonates
    const admin = createAdminClient()
    const { data: b } = await admin.from('restaurants').select('*').eq('id', impersonateCookie!).single()
    restaurant = b
  } else {
    restaurant = (profile as { restaurant?: typeof restaurant })?.restaurant ?? null
  }

  return (
    <RestaurantSidebar
      restaurantName={(restaurant as { name: string } | null)?.name}
      impersonating={impersonating}
    >
      <RestaurantSessionGuard />
      <RegisterServiceWorker />
      <InstallPwaBanner variant="restaurant" />
      {children}
    </RestaurantSidebar>
  )
}
