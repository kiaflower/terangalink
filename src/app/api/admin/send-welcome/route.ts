import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Sends a welcome email via Supabase Auth's built-in email system.
 * Supabase can send transactional emails via their SMTP settings
 * (configure in Supabase Dashboard → Authentication → Email Templates).
 *
 * For custom SMTP (Resend, Brevo, etc.), replace the body below
 * with a call to your preferred email provider's API.
 */
export async function POST(request: NextRequest) {
  try {
    const caller = await createClient()
    const { data: { user } } = await caller.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: profile } = await caller
      .from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { to_email, restaurant_name, admin_name, password, plan } = await request.json()

    // Fetch platform settings for dynamic URLs
    const { data: settingsData } = await caller.from('platform_settings').select('key, value')
    const settingsMap: Record<string, string> = {}
    for (const row of settingsData ?? []) settingsMap[row.key] = row.value
    const platformUrl = settingsMap.platform_url || 'https://terangalink.sn'
    const platformWhatsapp = settingsMap.whatsapp || '221700000000'

    if (!to_email || !restaurant_name) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
    }

    // Build email content
    const subject = `Bienvenue sur TerangaLink — ${restaurant_name} est en ligne !`

    const htmlBody = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#0A0A0A;font-family:Inter,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">

    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;background:#F97316;border-radius:12px;padding:10px 16px;">
        <span style="color:white;font-weight:900;font-size:18px;letter-spacing:-0.5px;">TerangaLink</span>
      </div>
    </div>

    <!-- Card -->
    <div style="background:#141414;border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:32px;">
      <h1 style="color:#FFFFFF;font-size:22px;font-weight:700;margin:0 0 8px;">
        Bienvenue, ${admin_name || restaurant_name} ! 👋
      </h1>
      <p style="color:#A3A3A3;font-size:15px;margin:0 0 24px;line-height:1.6;">
        Votre restaurant <strong style="color:#FFFFFF;">${restaurant_name}</strong> est maintenant sur TerangaLink.
        Vos clients peuvent déjà parcourir votre menu et commander via WhatsApp.
      </p>

      <!-- Credentials -->
      <div style="background:#1C1C1C;border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:20px;margin-bottom:24px;">
        <p style="color:#6B6B6B;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 12px;">Vos identifiants</p>
        <div style="margin-bottom:10px;">
          <span style="color:#6B6B6B;font-size:13px;">Email : </span>
          <span style="color:#FFFFFF;font-size:13px;font-weight:600;">${to_email}</span>
        </div>
        ${password ? `
        <div style="margin-bottom:10px;">
          <span style="color:#6B6B6B;font-size:13px;">Mot de passe : </span>
          <span style="color:#F97316;font-size:13px;font-weight:700;font-family:monospace;">${password}</span>
        </div>
        ` : ''}
        <div>
          <span style="color:#6B6B6B;font-size:13px;">Plan : </span>
          <span style="color:#FFFFFF;font-size:13px;font-weight:600;">${plan || 'Mensuel'}</span>
        </div>
      </div>

      <!-- CTA -->
      <a
        href="${platformUrl}/login"
        style="display:block;background:#F97316;color:white;text-align:center;padding:14px 24px;border-radius:12px;font-weight:700;font-size:15px;text-decoration:none;margin-bottom:16px;"
      >
        Accéder à mon tableau de bord →
      </a>

      <p style="color:#6B6B6B;font-size:13px;text-align:center;margin:0;">
        Besoin d&apos;aide ? Répondez à cet email ou contactez-nous sur WhatsApp.
      </p>
    </div>

    <!-- Footer -->
    <p style="color:#444;font-size:12px;text-align:center;margin-top:24px;">
      © 2026 TerangaLink · Dakar, Sénégal
    </p>
  </div>
</body>
</html>
    `.trim()

    // Option 1: Use Supabase's built-in invite (triggers welcome email template)
    // This requires setting up email templates in Supabase Dashboard
    // Option 2: Use a third-party SMTP provider
    // For now, we log and return success — plug in your SMTP below

    console.log(`[WELCOME EMAIL] To: ${to_email} | Restaurant: ${restaurant_name}`)
    console.log(`[WELCOME EMAIL] Subject: ${subject}`)

    // ── PLUG YOUR SMTP HERE ───────────────────────────────────────────────
    // Example with Resend (https://resend.com — free tier: 100 emails/day):
    //
    // const resendApiKey = process.env.RESEND_API_KEY
    // if (resendApiKey) {
    //   await fetch('https://api.resend.com/emails', {
    //     method: 'POST',
    //     headers: {
    //       'Content-Type': 'application/json',
    //       'Authorization': `Bearer ${resendApiKey}`,
    //     },
    //     body: JSON.stringify({
    //       from: 'TerangaLink <noreply@terangalink.sn>',
    //       to: [to_email],
    //       subject,
    //       html: htmlBody,
    //     }),
    //   })
    // }
    // ─────────────────────────────────────────────────────────────────────

    return NextResponse.json({
      success: true,
      message: `Email de bienvenue préparé pour ${to_email}`,
      preview: { subject, html: htmlBody },
    })

  } catch (err) {
    console.error('Welcome email error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
