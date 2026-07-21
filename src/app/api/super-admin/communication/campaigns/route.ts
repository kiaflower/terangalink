import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sanitizeBlocks } from '@/lib/newsletter/blocks'
import type { NewsletterCampaignRow } from '@/lib/types/database'

export const dynamic = 'force-dynamic'

async function requireSuperAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }) }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return { error: NextResponse.json({ error: 'Accès refusé' }, { status: 403 }) }
  return { error: null, userId: user.id }
}

// Liste des campagnes avec compteurs agrégés (envoyés/ouverts/cliqués/échecs) calculés à la volée.
export async function GET() {
  try {
    const { error: authError } = await requireSuperAdmin()
    if (authError) return authError

    const admin = createAdminClient()
    const { data: campaigns, error } = await admin
      .from('newsletter_campaigns')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const rows = (campaigns ?? []) as NewsletterCampaignRow[]
    const ids = rows.map(c => c.id)

    let statusByCampaign = new Map<string, Record<string, number>>()
    if (ids.length > 0) {
      const { data: recipients } = await admin
        .from('newsletter_recipients')
        .select('campaign_id, status')
        .in('campaign_id', ids)

      const grouped = new Map<string, Record<string, number>>()
      for (const r of (recipients ?? []) as { campaign_id: string; status: string }[]) {
        const bucket = grouped.get(r.campaign_id) ?? {}
        bucket[r.status] = (bucket[r.status] ?? 0) + 1
        grouped.set(r.campaign_id, bucket)
      }
      statusByCampaign = grouped
    }

    const campaignsWithStats = rows.map(c => {
      const counts = statusByCampaign.get(c.id) ?? {}
      const sent = (counts.sent ?? 0) + (counts.opened ?? 0) + (counts.clicked ?? 0)
      const opened = (counts.opened ?? 0) + (counts.clicked ?? 0)
      const clicked = counts.clicked ?? 0
      const failed = counts.failed ?? 0
      const total = Object.values(counts).reduce((sum, n) => sum + n, 0)
      return { ...c, stats: { total, sent, opened, clicked, failed } }
    })

    return NextResponse.json({ campaigns: campaignsWithStats })
  } catch (err) {
    console.error('communication/campaigns GET error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// Crée un brouillon, optionnellement pré-rempli à partir d'un template choisi dans l'UI.
export async function POST(request: NextRequest) {
  try {
    const { error: authError, userId } = await requireSuperAdmin()
    if (authError) return authError

    const body = await request.json().catch(() => ({}))
    const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : 'Nouvelle campagne'
    const subject = typeof body.subject === 'string' ? body.subject : ''
    const blocks = sanitizeBlocks(body.blocks)

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('newsletter_campaigns')
      .insert({ name, subject, blocks, created_by: userId ?? null })
      .select('id')
      .single()

    if (error || !data) return NextResponse.json({ error: error?.message || 'Erreur création campagne' }, { status: 500 })

    return NextResponse.json({ id: data.id })
  } catch (err) {
    console.error('communication/campaigns POST error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
