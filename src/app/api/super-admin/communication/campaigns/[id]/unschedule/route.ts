import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { NewsletterCampaignRow } from '@/lib/types/database'

export const dynamic = 'force-dynamic'

async function requireSuperAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }) }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return { error: NextResponse.json({ error: 'Accès refusé' }, { status: 403 }) }
  return { error: null }
}

// Repasse une campagne "scheduled" en "draft" et vide la liste de
// destinataires déjà matérialisée — sans ça, un changement de segment après
// programmation n'aurait aucun effet sur qui reçoit réellement l'email.
export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { error: authError } = await requireSuperAdmin()
    if (authError) return authError

    const admin = createAdminClient()
    const { data: existing } = await admin.from('newsletter_campaigns').select('status').eq('id', params.id).single()
    if (!existing) return NextResponse.json({ error: 'Campagne introuvable' }, { status: 404 })
    if ((existing as NewsletterCampaignRow).status !== 'scheduled') {
      return NextResponse.json({ error: 'Seule une campagne programmée peut être repassée en brouillon' }, { status: 400 })
    }

    await admin.from('newsletter_recipients').delete().eq('campaign_id', params.id)
    await admin.from('newsletter_campaigns').update({ status: 'draft', scheduled_at: null }).eq('id', params.id)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('communication/campaigns/[id]/unschedule error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
