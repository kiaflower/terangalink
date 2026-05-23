import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { RestaurantSidebar } from '@/components/layout/RestaurantSidebar'
import { MobileSidebar } from '@/components/layout/MobileSidebar'

export default async function RestaurantLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role === 'super_admin') redirect('/dashboard/super-admin')

  return (
    <div className="flex min-h-screen bg-surface">
      {/* Desktop sidebar — sticky, full height, fixed position */}
      <div className="hidden lg:block flex-shrink-0">
        <div className="sticky top-0 h-screen overflow-y-auto">
          <RestaurantSidebar />
        </div>
      </div>

      {/* Mobile burger button + drawer */}
      <MobileSidebar>
        <RestaurantSidebar mobile />
      </MobileSidebar>

      {/* Main content — padded on mobile to account for burger button */}
      <main className="flex-1 min-w-0 overflow-y-auto pt-16 lg:pt-0">
        {children}
      </main>
    </div>
  )
}
