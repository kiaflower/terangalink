import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { RestaurantSidebar } from '@/components/layout/RestaurantSidebar'
import { MobileSidebar } from '@/components/layout/MobileSidebar'
import { OnboardingWrapper } from '@/components/onboarding/OnboardingWrapper'
import { SmartCards } from '@/components/dashboard/SmartCards'
import { ImpersonationBanner } from '@/components/layout/ImpersonationBanner'

export default async function RestaurantLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role, restaurant_id').eq('id', user.id).single()

  const role = (profile as { role?: string; restaurant_id?: string } | null)?.role

  // Super-admin en mode impersonation
  if (role === 'super_admin') {
    const cookieStore = await cookies()
    const raw = cookieStore.get('sa_impersonate')?.value
    if (!raw) redirect('/dashboard/super-admin')

    let impersonation: { restaurantId: string; restaurantName: string; expiresAt: number } | null = null
    try { impersonation = JSON.parse(raw) } catch { redirect('/dashboard/super-admin') }
    if (!impersonation || impersonation.expiresAt < Date.now()) redirect('/dashboard/super-admin')

    const admin = createAdminClient()
    const { data: resto } = await admin.from('restaurants').select('slug').eq('id', impersonation.restaurantId).single()

    return (
      <div className="flex min-h-screen" style={{ backgroundColor: '#F9FAFB' }}>
        <ImpersonationBanner />
        <div className="hidden lg:block flex-shrink-0">
          <div className="sticky top-0 h-screen overflow-y-auto" style={{ paddingTop: '44px' }}>
            <RestaurantSidebar impersonatedRestaurantId={impersonation.restaurantId} />
          </div>
        </div>
        <MobileSidebar>
          <RestaurantSidebar mobile impersonatedRestaurantId={impersonation.restaurantId} />
        </MobileSidebar>
        <main className="flex-1 min-w-0 overflow-y-auto" style={{ paddingTop: '44px' }}>
          {children}
        </main>
        {resto?.slug && <OnboardingWrapper restaurantSlug={resto.slug} />}
      </div>
    )
  }

  // Accès normal restaurant
  let restaurantSlug: string | undefined
  if (profile?.restaurant_id) {
    const { data: resto } = await supabase
      .from('restaurants').select('slug').eq('id', profile.restaurant_id).single()
    restaurantSlug = resto?.slug ?? undefined
  }

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#F9FAFB' }}>
      <div className="hidden lg:block flex-shrink-0">
        <div className="sticky top-0 h-screen overflow-y-auto">
          <RestaurantSidebar />
        </div>
      </div>
      <MobileSidebar>
        <RestaurantSidebar mobile />
      </MobileSidebar>
      <main className="flex-1 min-w-0 overflow-y-auto pt-16 lg:pt-0">
        {children}
      </main>
      <OnboardingWrapper restaurantSlug={restaurantSlug} />
      <SmartCards />
    </div>
  )
}
