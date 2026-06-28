import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

async function checkSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'super_admin'
}

export async function GET() {
  if (!await checkSuperAdmin()) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const admin = createAdminClient()

  const [
    { count: pendingApplications },
    { count: pendingAppointments },
  ] = await Promise.all([
    admin
      .from('restaurant_applications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
    admin
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'upcoming'),
  ])

  return NextResponse.json({
    pendingApplications: pendingApplications ?? 0,
    pendingAppointments: pendingAppointments ?? 0,
  })
}
