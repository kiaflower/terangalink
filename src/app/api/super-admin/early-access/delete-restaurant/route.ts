import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { registration_id } = await req.json()
  if (!registration_id) return NextResponse.json({ error: 'registration_id requis' }, { status: 400 })

  const admin = createAdminClient()

  const { data: reg, error: regErr } = await admin
    .from('early_access_registrations')
    .select('id, restaurant_id')
    .eq('id', registration_id)
    .single()

  if (regErr || !reg) return NextResponse.json({ error: 'Inscription introuvable' }, { status: 404 })
  if (!reg.restaurant_id) return NextResponse.json({ error: 'Aucune boutique liée à cette inscription' }, { status: 400 })

  try {
    const { data: admins } = await admin
      .from('profiles')
      .select('id')
      .eq('restaurant_id', reg.restaurant_id)
      .eq('role', 'restaurant_admin')

    for (const a of admins ?? []) {
      await admin.auth.admin.deleteUser(a.id)
    }

    const { error: deleteErr } = await admin.from('restaurants').delete().eq('id', reg.restaurant_id)
    if (deleteErr) throw deleteErr

    await admin.from('early_access_registrations')
      .update({ status: 'pending', restaurant_id: null, updated_at: new Date().toISOString() })
      .eq('id', registration_id)

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    console.error('early-access delete-restaurant error:', err)
    const msg = err instanceof Error ? err.message : 'Erreur serveur'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
