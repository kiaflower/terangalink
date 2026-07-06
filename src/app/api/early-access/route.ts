import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const MAX_SLOTS = 15

export async function GET() {
  const admin = createAdminClient()
  const [{ count }, { data: setting }] = await Promise.all([
    admin.from('early_access_registrations').select('*', { count: 'exact', head: true }).neq('status', 'rejected'),
    admin.from('platform_settings').select('value').eq('key', 'early_access_open').maybeSingle(),
  ])

  const taken = count ?? 0
  const isOpen = setting?.value !== 'false'
  const remaining = isOpen ? Math.max(0, MAX_SLOTS - taken) : 0
  return NextResponse.json({ taken, max: MAX_SLOTS, remaining, isOpen })
}

// Liste d'attente — utilisée uniquement une fois les 15 places prises.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const prenom = typeof body?.prenom === 'string' ? body.prenom.trim() : ''
  const whatsapp = typeof body?.whatsapp === 'string' ? body.whatsapp.trim() : ''

  if (!prenom || !whatsapp) {
    return NextResponse.json({ error: 'Prénom et numéro WhatsApp requis' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin.from('early_access_leads').insert({ prenom, whatsapp, type: 'waitlist' })
  if (error) {
    return NextResponse.json({ error: "Erreur lors de l'enregistrement" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
