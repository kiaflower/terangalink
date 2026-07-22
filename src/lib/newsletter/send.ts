import type { createAdminClient } from '@/lib/supabase/admin'
import { getSmtpTransporter } from '@/lib/email/smtp'
import { getSiteUrl } from '@/lib/site-url'
import { renderCampaignHtml } from './render'
import { resolveSegmentRecipients } from './segments'
import { BATCH_SIZE, SEND_DELAY_MS } from './config'
import type { NewsletterCampaignRow, NewsletterRecipientRow } from '@/lib/types/database'

type AdminClient = ReturnType<typeof createAdminClient>

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

interface BatchResult {
  processed: number
  remaining: number
  done: boolean
}

/**
 * Traite un lot de destinataires "queued" pour une campagne : rend le HTML
 * (tracking par destinataire), envoie via le SMTP existant, marque le
 * résultat. Réutilisé par la route "envoyer maintenant" et par le cron de
 * traitement de la file — c'est le point d'appel unique pour ne pas dupliquer
 * la logique d'envoi entre les deux déclencheurs.
 */
export async function sendCampaignBatch(admin: AdminClient, campaignId: string, limit: number = BATCH_SIZE): Promise<BatchResult> {
  const { data: campaignData } = await admin.from('newsletter_campaigns').select('*').eq('id', campaignId).single()
  if (!campaignData) return { processed: 0, remaining: 0, done: true }
  const campaign = campaignData as NewsletterCampaignRow

  const { data: recipientsData } = await admin
    .from('newsletter_recipients')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('status', 'queued')
    .limit(limit)

  const queued = (recipientsData ?? []) as NewsletterRecipientRow[]
  const siteUrl = getSiteUrl()
  const transporter = getSmtpTransporter()
  const from = process.env.SMTP_USER

  for (const recipient of queued) {
    if (!transporter || !from) {
      await admin.from('newsletter_recipients').update({ status: 'failed', error_message: 'SMTP non configuré' }).eq('id', recipient.id)
      continue
    }
    try {
      const html = await renderCampaignHtml(campaign, {
        siteUrl,
        recipientId: recipient.id,
        restaurantId: recipient.restaurant_id,
      })
      await transporter.sendMail({
        from: `${campaign.from_name} <${from}>`,
        to: recipient.email,
        subject: campaign.subject,
        html,
      })
      await admin.from('newsletter_recipients').update({ status: 'sent', sent_at: new Date().toISOString(), error_message: null }).eq('id', recipient.id)
    } catch (err) {
      await admin.from('newsletter_recipients').update({
        status: 'failed',
        error_message: err instanceof Error ? err.message : 'Erreur inconnue',
      }).eq('id', recipient.id)
    }
    await sleep(SEND_DELAY_MS)
  }

  const { count: remaining } = await admin
    .from('newsletter_recipients')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .eq('status', 'queued')

  const done = (remaining ?? 0) === 0
  if (done && campaign.status !== 'sent') {
    await admin.from('newsletter_campaigns').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', campaignId)
  }

  return { processed: queued.length, remaining: remaining ?? 0, done }
}

type PrepareResult =
  | { error: string }
  | { campaign: NewsletterCampaignRow; recipientCount: number }

/**
 * Valide qu'une campagne est prête à partir, résout son segment à l'instant T
 * (pas au moment du brouillon — l'appartenance à un segment peut avoir
 * changé) et matérialise la liste de destinataires. Partagé entre
 * "programmer" et "envoyer maintenant" pour ne pas dupliquer cette logique.
 */
export async function prepareCampaignForSending(admin: AdminClient, campaignId: string): Promise<PrepareResult> {
  const { data: campaignData } = await admin.from('newsletter_campaigns').select('*').eq('id', campaignId).single()
  if (!campaignData) return { error: 'Campagne introuvable' }
  const campaign = campaignData as NewsletterCampaignRow

  if (!campaign.subject?.trim()) return { error: 'Objet manquant' }
  if (!campaign.blocks || campaign.blocks.length === 0) return { error: 'La campagne ne contient aucun bloc' }
  if (campaign.status !== 'draft' && campaign.status !== 'scheduled') return { error: 'Cette campagne a déjà été envoyée' }

  const recipients = await resolveSegmentRecipients(admin, campaign.segment)
  if (recipients.length === 0) return { error: 'Aucun destinataire pour ce segment (vérifiez le consentement newsletter des restaurants ciblés)' }

  await enqueueCampaignRecipients(admin, campaignId, recipients)
  return { campaign, recipientCount: recipients.length }
}

/** Matérialise la liste de destinataires d'une campagne à l'instant T (le segment est résolu au moment de l'envoi, pas du brouillon). */
export async function enqueueCampaignRecipients(
  admin: AdminClient,
  campaignId: string,
  recipients: { restaurant_id: string; email: string }[]
): Promise<number> {
  if (recipients.length === 0) return 0
  const rows = recipients.map(r => ({ campaign_id: campaignId, restaurant_id: r.restaurant_id, email: r.email, status: 'queued' as const }))
  const { error } = await admin.from('newsletter_recipients').upsert(rows, { onConflict: 'campaign_id,restaurant_id', ignoreDuplicates: true })
  if (error) throw new Error(error.message)
  return rows.length
}
