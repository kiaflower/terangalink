import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

/**
 * /dashboard — smart redirect based on role.
 * Never shows any UI; always redirects immediately.
 */
export default async function DashboardRootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'super_admin') {
    redirect('/dashboard/super-admin')
  }

  redirect('/dashboard/restaurant')
}
