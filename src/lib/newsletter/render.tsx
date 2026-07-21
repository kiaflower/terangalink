import { render } from '@react-email/render'
import { CampaignEmail } from './emails/CampaignEmail'
import { sign } from './token'
import type { NewsletterBlock, NewsletterCampaignRow } from '@/lib/types/database'

interface RenderOptions {
  siteUrl: string
  /** null pour un envoi de test — désactive tracking pixel/clic/désabonnement. */
  recipientId: string | null
  boutiqueId: string | null
}

function trackClickUrl(siteUrl: string, recipientId: string, targetUrl: string): string {
  const u = Buffer.from(targetUrl, 'utf8').toString('base64url')
  const token = sign(`${recipientId}|${u}`)
  return `${siteUrl}/api/newsletter/track/click?r=${recipientId}&u=${u}&t=${token}`
}

function resolveBlockLinks(blocks: NewsletterBlock[], siteUrl: string, recipientId: string | null): NewsletterBlock[] {
  if (!recipientId) return blocks
  return blocks.map(b => {
    if (b.type === 'button' && b.url) return { ...b, url: trackClickUrl(siteUrl, recipientId, b.url) }
    if (b.type === 'image' && b.linkUrl) return { ...b, linkUrl: trackClickUrl(siteUrl, recipientId, b.linkUrl) }
    return b
  })
}

export async function renderCampaignHtml(
  campaign: Pick<NewsletterCampaignRow, 'blocks' | 'preview_text'>,
  opts: RenderOptions
): Promise<string> {
  const blocks = resolveBlockLinks(campaign.blocks, opts.siteUrl, opts.recipientId)

  const unsubscribeUrl = opts.boutiqueId && opts.recipientId
    ? `${opts.siteUrl}/api/newsletter/unsubscribe?b=${opts.boutiqueId}&r=${opts.recipientId}&t=${sign(opts.boutiqueId)}`
    : null

  const pixelUrl = opts.recipientId
    ? `${opts.siteUrl}/api/newsletter/track/open?r=${opts.recipientId}&t=${sign(opts.recipientId)}`
    : null

  return render(
    <CampaignEmail
      blocks={blocks}
      previewText={campaign.preview_text ?? undefined}
      unsubscribeUrl={unsubscribeUrl}
      pixelUrl={pixelUrl}
      logoUrl={`${opts.siteUrl}/logo.jpg`}
    />,
    { pretty: false }
  )
}
