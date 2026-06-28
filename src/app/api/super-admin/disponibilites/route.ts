import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

async function checkSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'super_admin'
}

// GET — créneaux d'une semaine + tous les appointments
export async function GET(req: NextRequest) {
  if (!await checkSuperAdmin()) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const type = searchParams.get('type') // 'slots' | 'appointments'

  const admin = createAdminClient()

  if (type === 'appointments') {
    const { data, error } = await admin
      .from('appointments')
      .select('*, slot:availability_slots(*)')
      .order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  // Par défaut : créneaux de la semaine
  const query = admin.from('availability_slots').select('*').order('start_time')
  if (from) query.gte('date', from)
  if (to) query.lte('date', to)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST — créer un créneau ou bloquer une journée
export async function POST(req: NextRequest) {
  if (!await checkSuperAdmin()) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const body = await req.json()
  const admin = createAdminClient()
  const { data, error } = await admin.from('availability_slots').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE — supprimer un créneau
export async function DELETE(req: NextRequest) {
  if (!await checkSuperAdmin()) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { id } = await req.json()
  const admin = createAdminClient()
  const { error } = await admin.from('availability_slots').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// PATCH — mettre à jour le statut d'un appointment ou notes
export async function PATCH(req: NextRequest) {
  if (!await checkSuperAdmin()) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { id, table, ...fields } = await req.json()
  const admin = createAdminClient()
  const t = table === 'appointments' ? 'appointments' : 'availability_slots'
  const { error } = await admin.from(t).update(fields).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
