import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { RestaurantSidebar } from '@/components/layout/RestaurantSidebar'

export default async function RestaurantLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'super_admin') {
    redirect('/dashboard/super-admin')
  }

  return (
    <div className="flex min-h-screen bg-surface">
      <div className="hidden lg:block">
        <RestaurantSidebar />
      </div>
      <main className="flex-1 min-w-0 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
