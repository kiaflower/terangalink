import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SuperAdminSidebar } from '@/components/layout/SuperAdminSidebar'
import { MobileSidebar } from '@/components/layout/MobileSidebar'

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') redirect('/dashboard/restaurant')

  return (
    // theme-dark : fond sombre uniquement pour le dashboard
    <div className="flex min-h-screen" style={{ backgroundColor: '#F9FAFB' }}>
      <div className="hidden lg:block flex-shrink-0">
        <div className="sticky top-0 h-screen overflow-y-auto">
          <SuperAdminSidebar />
        </div>
      </div>
      <MobileSidebar>
        <SuperAdminSidebar mobile />
      </MobileSidebar>
      <main className="flex-1 min-w-0 overflow-y-auto pt-16 lg:pt-0">
        {children}
      </main>
    </div>
  )
}
