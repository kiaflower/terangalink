import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

async function requireSuperAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }) }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return { error: NextResponse.json({ error: 'Accès refusé' }, { status: 403 }) }
  return { error: null }
}

// Super-admin: list all recurring slots
export async function GET() {
  const { error } = await requireSuperAdmin()
  if (error) return error

  const admin = createAdminClient()
  const { data, error: dbError } = await admin
    .from('recurring_slots')
    .select('id, weekday, start_time, duration_minutes, is_active')
    .order('weekday')
    .order('start_time')
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json({ slots: data ?? [] })
}

// Super-admin: create a recurring slot for a given weekday
export async function POST(req: NextRequest) {
  const { error } = await requireSuperAdmin()
  if (error) return error

  const { weekday, start_time, duration_minutes } = await req.json()
  if (weekday == null || weekday < 0 || weekday > 6 || !start_time || !duration_minutes) {
    return NextResponse.json({ error: 'weekday, start_time et duration_minutes requis' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error: dbError } = await admin
    .from('recurring_slots')
    .insert({ weekday, start_time, duration_minutes, is_active: true })
    .select()
    .single()
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json({ slot: data })
}

// Super-admin: delete a recurring slot
export async function DELETE(req: NextRequest) {
  const { error } = await requireSuperAdmin()
  if (error) return error

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  const admin = createAdminClient()
  const { error: dbError } = await admin.from('recurring_slots').delete().eq('id', id)
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
