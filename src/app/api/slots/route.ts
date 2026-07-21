import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  // Public — les prospects doivent pouvoir voir les créneaux disponibles
  const admin = createAdminClient()
  const today = new Date().toISOString().slice(0, 10)

  const { data, error } = await admin
    .from('availability_slots')
    .select('*')
    .eq('is_booked', false)
    .eq('is_blocked', false)
    .gte('date', today)
    .order('date')
    .order('start_time')
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  // Public — les prospects réservent un appel sans être connectés
  const body = await req.json()
  const { slot_id, boutique_id, boutique_name, owner_name, email, whatsapp } = body

  if (!slot_id || !owner_name || !boutique_name) {
    return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: slot } = await admin
    .from('availability_slots')
    .select('id, is_booked, is_blocked, date, start_time, end_time')
    .eq('id', slot_id)
    .single()

  if (!slot || slot.is_booked || slot.is_blocked) {
    return NextResponse.json({ error: 'Créneau non disponible' }, { status: 409 })
  }

  const { error: apptErr } = await admin.from('appointments').insert({
    slot_id,
    boutique_id: boutique_id ?? null,
    boutique_name,
    owner_name,
    email: email ?? null,
    whatsapp: whatsapp ?? null,
    status: 'upcoming',
    date: slot.date,
    start_time: slot.start_time,
    end_time: slot.end_time,
  })
  if (apptErr) return NextResponse.json({ error: apptErr.message }, { status: 500 })

  const { error: slotErr } = await admin
    .from('availability_slots')
    .update({ is_booked: true })
    .eq('id', slot_id)
  if (slotErr) return NextResponse.json({ error: slotErr.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
