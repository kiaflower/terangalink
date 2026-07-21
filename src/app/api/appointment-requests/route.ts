import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const admin = createAdminClient()
  const { data } = await admin.from('appointment_requests').select('*').order('created_at', { ascending: false }).limit(100)
  return NextResponse.json({ appointments: data ?? [] })
}

export async function POST(request: NextRequest) {
  try {
    const { name, phone, subject, requested_date, requested_time, slot_id } = await request.json()
    if (!name || !phone || !requested_date || !requested_time) {
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 })
    }
    const admin = createAdminClient()
    const { error } = await admin.from('appointment_requests').insert({
      name, phone, subject, requested_date, requested_time, status: 'pending',
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    // Mark slot as taken if provided
    if (slot_id) {
      await admin.from('rdv_slots').update({ is_available: false }).eq('id', slot_id)
    }
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { id, status } = await request.json()
    if (!id || !status) return NextResponse.json({ error: 'id and status required' }, { status: 400 })

    const admin = createAdminClient()
    const { error } = await admin.from('appointment_requests').update({ status }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
