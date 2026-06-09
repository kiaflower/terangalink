import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import nodemailer from 'nodemailer'
import { PLAN_LABELS, normalizePlan } from '@/lib/plans'

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
    const planLabel = PLAN_LABELS[normalizePlan(plan)]

    const { data: settingsData } = await caller.from('platform_settings').select('key, value')
    const settingsMap: Record<string, string> = {}
    for (const row of settingsData ?? []) settingsMap[row.key] = row.value
    const platformUrl = settingsMap.platform_url || 'https://terangalink.sn'

    if (!to_email || !restaurant_name) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
    }

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
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;background:#F97316;border-radius:12px;padding:10px 16px;">
        <span style="color:white;font-weight:900;font-size:18px;letter-spacing:-0.5px;">TerangaLink</span>
      </div>
    </div>
    <div style="background:#141414;border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:32px;">
      <h1 style="color:#FFFFFF;font-size:22px;font-weight:700;margin:0 0 8px;">
        Bienvenue, ${admin_name || restaurant_name} ! 👋
      </h1>
      <p style="color:#A3A3A3;font-size:15px;margin:0 0 24px;line-height:1.6;">
        Votre restaurant <strong style="color:#FFFFFF;">${restaurant_name}</strong> est maintenant sur TerangaLink.
      </p>
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
          <span style="color:#FFFFFF;font-size:13px;font-weight:600;">${planLabel}</span>
        </div>
      </div>
      <a href="${platformUrl}/login"
        style="display:block;background:#F97316;color:white;text-align:center;padding:14px 24px;border-radius:12px;font-weight:700;font-size:15px;text-decoration:none;margin-bottom:16px;">
        Accéder à mon tableau de bord →
      </a>
      <p style="color:#6B6B6B;font-size:13px;text-align:center;margin:0;">
        Besoin d'aide ? Contactez-nous sur WhatsApp.
      </p>
    </div>
    <p style="color:#444;font-size:12px;text-align:center;margin-top:24px;">
      © 2026 TerangaLink · Dakar, Sénégal
    </p>
  </div>
</body>
</html>`.trim()

    // ✅ Connexion SMTP via LWS
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 465,
      secure: Number(process.env.SMTP_PORT) === 465, // true pour 465, false pour 587
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })

    // ✅ Envoi de l'email
    await transporter.sendMail({
      from: `"TerangaLink" <${process.env.SMTP_USER}>`,
      to: to_email,
      subject,
      html: htmlBody,
    })

    console.log(`[WELCOME EMAIL] ✅ Envoyé à ${to_email}`)

    return NextResponse.json({
      success: true,
      message: `Email de bienvenue envoyé à ${to_email}`,
    })

  } catch (err) {
    console.error('Welcome email error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}