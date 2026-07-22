import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderCampaignHtml } from '@/lib/newsletter/render'
import { sanitizeBlocks } from '@/lib/newsletter/blocks'
import { getSiteUrl } from '@/lib/site-url'
import { getSmtpTransporter } from '@/lib/email/smtp'

export const dynamic = 'force-dynamic'

async function requireSuperAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }) }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return { error: NextResponse.json({ error: 'Accès refusé' }, { status: 403 }) }
  return { error: null }
}

// Envoie l'état courant du composeur (pas la version enregistrée) à une adresse de test.
// Pas de tracking (recipientId=null) pour ne pas polluer les statistiques de la campagne.
export async function POST(request: NextRequest) {
  try {
    const { error: authError } = await requireSuperAdmin()
    if (authError) return authError

    const body = await request.json().catch(() => ({}))
    const email = typeof body.email === 'string' ? body.email.trim() : ''
    if (!email) return NextResponse.json({ error: 'Adresse email requise' }, { status: 400 })

    const subject = typeof body.subject === 'string' && body.subject.trim() ? body.subject.trim() : '(sans objet)'
    const fromName = typeof body.from_name === 'string' && body.from_name.trim() ? body.from_name.trim() : 'TerangaLink'
    const previewText = typeof body.preview_text === 'string' ? body.preview_text : null
    const blocks = sanitizeBlocks(body.blocks)

    const transporter = getSmtpTransporter()
    const from = process.env.SMTP_USER
    if (!transporter || !from) {
      return NextResponse.json({ error: 'SMTP non configuré côté serveur' }, { status: 500 })
    }

    const html = await renderCampaignHtml(
      { blocks, preview_text: previewText },
      { siteUrl: getSiteUrl(), recipientId: null, restaurantId: null }
    )

    await transporter.sendMail({ from: `${fromName} <${from}>`, to: email, subject: `[TEST] ${subject}`, html })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('communication/campaigns/[id]/send-test error:', err)
    return NextResponse.json({ error: 'Échec de l\'envoi du test' }, { status: 500 })
  }
}
