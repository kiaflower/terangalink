import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sanitizeBlocks } from '@/lib/newsletter/blocks'
import type { NewsletterCampaignRow, NewsletterSegment } from '@/lib/types/database'

export const dynamic = 'force-dynamic'

async function requireSuperAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }) }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return { error: NextResponse.json({ error: 'Accès refusé' }, { status: 403 }) }
  return { error: null }
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { error: authError } = await requireSuperAdmin()
    if (authError) return authError

    const admin = createAdminClient()
    const { data: campaign, error } = await admin.from('newsletter_campaigns').select('*').eq('id', params.id).single()
    if (error || !campaign) return NextResponse.json({ error: 'Campagne introuvable' }, { status: 404 })

    const { data: recipients } = await admin
      .from('newsletter_recipients')
      .select('id, email, status, error_message, sent_at, opened_at, click_count, unsubscribed_at')
      .eq('campaign_id', params.id)
      .order('created_at', { ascending: true })

    const counts: Record<string, number> = {}
    for (const r of recipients ?? []) counts[r.status] = (counts[r.status] ?? 0) + 1
    const total = (recipients ?? []).length
    const sent = (counts.sent ?? 0) + (counts.opened ?? 0) + (counts.clicked ?? 0)
    const opened = (counts.opened ?? 0) + (counts.clicked ?? 0)
    const clicked = counts.clicked ?? 0
    const failed = counts.failed ?? 0

    return NextResponse.json({
      campaign,
      stats: { total, sent, opened, clicked, failed },
      failedRecipients: (recipients ?? []).filter(r => r.status === 'failed'),
    })
  } catch (err) {
    console.error('communication/campaigns/[id] GET error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { error: authError } = await requireSuperAdmin()
    if (authError) return authError

    const admin = createAdminClient()
    const { data: existing } = await admin.from('newsletter_campaigns').select('status').eq('id', params.id).single()
    if (!existing) return NextResponse.json({ error: 'Campagne introuvable' }, { status: 404 })
    if ((existing as NewsletterCampaignRow).status === 'sent' || (existing as NewsletterCampaignRow).status === 'sending') {
      return NextResponse.json({ error: 'Cette campagne ne peut plus être modifiée' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (typeof body.name === 'string') update.name = body.name.trim() || 'Sans titre'
    if (typeof body.subject === 'string') update.subject = body.subject
    if (typeof body.preview_text === 'string' || body.preview_text === null) update.preview_text = body.preview_text
    if (typeof body.from_name === 'string' && body.from_name.trim()) update.from_name = body.from_name.trim()
    if (Array.isArray(body.blocks)) update.blocks = sanitizeBlocks(body.blocks)
    if (body.segment && typeof body.segment === 'object') update.segment = body.segment as NewsletterSegment

    const { error } = await admin.from('newsletter_campaigns').update(update).eq('id', params.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('communication/campaigns/[id] PATCH error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { error: authError } = await requireSuperAdmin()
    if (authError) return authError

    const admin = createAdminClient()
    const { data: existing } = await admin.from('newsletter_campaigns').select('status').eq('id', params.id).single()
    if (!existing) return NextResponse.json({ error: 'Campagne introuvable' }, { status: 404 })
    if ((existing as NewsletterCampaignRow).status !== 'draft') {
      return NextResponse.json({ error: 'Seul un brouillon peut être supprimé' }, { status: 400 })
    }

    const { error } = await admin.from('newsletter_campaigns').delete().eq('id', params.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('communication/campaigns/[id] DELETE error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
