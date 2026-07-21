import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendCampaignBatch, enqueueCampaignRecipients } from '@/lib/newsletter/send'
import { resolveSegmentRecipients } from '@/lib/newsletter/segments'
import { BATCH_SIZE } from '@/lib/newsletter/config'
import type { NewsletterCampaignRow } from '@/lib/types/database'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Appelée par Vercel Cron (filet de sécurité quotidien, voir vercel.json) et,
// idéalement, par un déclencheur externe (ex: cron-job.org) toutes les 5-10
// min pour un envoi programmé/progressif réaliste sur le plan Vercel Hobby.
// Authentification identique à /api/cron/generate-invoices.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const admin = createAdminClient()

    // 1. Bascule en "sending" les campagnes programmées dont l'heure est passée.
    const { data: due } = await admin
      .from('newsletter_campaigns')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_at', new Date().toISOString())

    for (const campaign of (due ?? []) as NewsletterCampaignRow[]) {
      const recipients = await resolveSegmentRecipients(admin, campaign.segment)
      if (recipients.length > 0) await enqueueCampaignRecipients(admin, campaign.id, recipients)
      await admin.from('newsletter_campaigns').update({ status: 'sending' }).eq('id', campaign.id)
    }

    // 2. Traite un lot pour chaque campagne actuellement en cours d'envoi.
    const { data: sending } = await admin.from('newsletter_campaigns').select('id').eq('status', 'sending')
    const results = []
    for (const campaign of sending ?? []) {
      const result = await sendCampaignBatch(admin, campaign.id, BATCH_SIZE)
      results.push({ campaignId: campaign.id, ...result })
    }

    return NextResponse.json({ success: true, results })
  } catch (err) {
    console.error('cron/process-newsletter-queue error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
