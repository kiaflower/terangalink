import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { RestaurantSidebar } from '@/components/layout/RestaurantSidebar'
import { MobileSidebar } from '@/components/layout/MobileSidebar'
import { OnboardingWrapper } from '@/components/onboarding/OnboardingWrapper'
import { SmartCards } from '@/components/dashboard/SmartCards'

export default async function RestaurantLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role, restaurant_id').eq('id', user.id).single()
  if (profile?.role === 'super_admin') redirect('/dashboard/super-admin')

  let restaurantSlug: string | undefined
  if (profile?.restaurant_id) {
    const { data: resto } = await supabase
      .from('restaurants')
      .select('slug')
      .eq('id', profile.restaurant_id)
      .single()
    restaurantSlug = resto?.slug ?? undefined
  }

  return (
    // theme-dark : force le fond sombre uniquement sur le dashboard
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
