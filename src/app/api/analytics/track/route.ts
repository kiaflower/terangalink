import { createClient } from '@/lib/supabase/server'
import { isOwnerVisit } from '@/lib/analytics/isOwnerVisit'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { boutique_id, event_type, item_id, item_name, session_id } = body
  if (!boutique_id || !event_type) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const supabase = createClient()
  // Exclut le propriétaire de la boutique (ou un super-admin qui l'impersonne)
  // du comptage — évite de fausser add_to_cart/whatsapp_click/product_view.
  if (await isOwnerVisit(supabase, boutique_id)) {
    return NextResponse.json({ ok: true, skipped: true })
  }
  await supabase.from('analytics_events').insert({ boutique_id, event_type, item_id, item_name, session_id })
  return NextResponse.json({ ok: true })
}
