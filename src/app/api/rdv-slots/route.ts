import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

interface Slot { id: string; date: string; start_time: string; label: string | null; duration_minutes?: number }

// Public: get available slots — merges manually-created one-off slots with
// occurrences generated from the super-admin's weekly recurring slots.
export async function GET() {
  const admin = createAdminClient()
  const today = new Date().toISOString().split('T')[0]

  const [{ data: manualSlots }, { data: recurring }, { data: settings }, { data: booked }] = await Promise.all([
    admin.from('rdv_slots').select('id, date, start_time, label').eq('is_available', true).gte('date', today).order('date').order('start_time').limit(30),
    admin.from('recurring_slots').select('id, weekday, start_time, duration_minutes').eq('is_active', true),
    admin.from('availability_settings').select('blocked_dates').limit(1).maybeSingle(),
    admin.from('appointment_requests').select('requested_date, requested_time').neq('status', 'cancelled'),
  ])

  const generated: Slot[] = []
  const bookedSet = new Set((booked ?? []).map(b => `${b.requested_date}_${b.requested_time}`))
  const blockedSet = new Set(((settings?.blocked_dates ?? []) as string[]))
  const now = new Date()

  for (let dayOffset = 0; dayOffset < 14 && generated.length < 60; dayOffset++) {
    const d = new Date(now)
    d.setDate(d.getDate() + dayOffset)
    const dow = (d.getDay() + 6) % 7 // 0 = Lundi ... 6 = Dimanche
    const dateStr = d.toISOString().split('T')[0]
    if (blockedSet.has(dateStr)) continue

    for (const slot of recurring ?? []) {
      if (slot.weekday !== dow) continue
      const timeStr = String(slot.start_time).slice(0, 8)
      const key = `${dateStr}_${timeStr}`
      const slotDateTime = new Date(`${dateStr}T${timeStr}`)
      if (slotDateTime > now && !bookedSet.has(key)) {
        generated.push({ id: `rec_${slot.id}_${dateStr}`, date: dateStr, start_time: timeStr, label: null, duration_minutes: slot.duration_minutes })
      }
    }
  }

  const all = [...(manualSlots ?? []), ...generated]
    .sort((a, b) => (a.date + a.start_time).localeCompare(b.date + b.start_time))
    .slice(0, 60)

  return NextResponse.json({ slots: all })
}

// Super-admin: create a slot
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { date, start_time, label } = await req.json()
  if (!date || !start_time) return NextResponse.json({ error: 'date et start_time requis' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin.from('rdv_slots').insert({
    date, start_time, label: label || null, is_available: true,
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ slot: data })
}

// Super-admin: delete a slot
export async function DELETE(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { id } = await req.json()
  const admin = createAdminClient()
  await admin.from('rdv_slots').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
