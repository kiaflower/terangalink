import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { RestaurantSidebar } from '@/components/layout/RestaurantSidebar'
import { MobileSidebar } from '@/components/layout/MobileSidebar'
import { OnboardingWrapper } from '@/components/onboarding/OnboardingWrapper'

export default async function RestaurantLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role, restaurant_id').eq('id', user.id).single()
  if (profile?.role === 'super_admin') redirect('/dashboard/super-admin')

  // Récupérer le slug pour le bouton "Voir mon site"
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
    <div className="flex min-h-screen bg-surface">
      {/* Desktop sidebar */}
      <div className="hidden lg:block flex-shrink-0">
        <div className="sticky top-0 h-screen overflow-y-auto">
          <RestaurantSidebar />
        </div>
      </div>

      {/* Mobile burger button + drawer */}
      <MobileSidebar>
        <RestaurantSidebar mobile />
      </MobileSidebar>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-y-auto pt-16 lg:pt-0">
        {children}
      </main>

      {/* Guide de démarrage — flottant en bas à droite */}
      <OnboardingWrapper restaurantSlug={restaurantSlug} />
    </div>
  )
}
