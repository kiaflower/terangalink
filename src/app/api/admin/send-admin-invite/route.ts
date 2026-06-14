import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import nodemailer from 'nodemailer'

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

    const { to_email, admin_name, restaurant_name, password } = await request.json()

    if (!to_email || !admin_name || !restaurant_name) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
    }

    const { data: settingsData } = await caller.from('platform_settings').select('key, value')
    const settingsMap: Record<string, string> = {}
    for (const row of settingsData ?? []) settingsMap[row.key] = row.value
    const platformUrl = settingsMap.platform_url || 'https://terangalink.sn'

    const subject = `Vous avez été ajouté comme administrateur — ${restaurant_name}`

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
      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-size:40px;margin-bottom:12px;">🎉</div>
        <h1 style="color:#FFFFFF;font-size:20px;font-weight:700;margin:0 0 8px;">
          Bonjour ${admin_name} !
        </h1>
        <p style="color:#A3A3A3;font-size:15px;margin:0;line-height:1.6;">
          Vous avez été ajouté comme <strong style="color:#FFFFFF;">administrateur</strong>
          du restaurant <strong style="color:#F97316;">${restaurant_name}</strong> sur TerangaLink.
        </p>
      </div>

      <div style="background:#1C1C1C;border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:20px;margin-bottom:24px;">
        <p style="color:#6B6B6B;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 14px;">
          Vos identifiants de connexion
        </p>
        <div style="margin-bottom:10px;">
          <span style="color:#6B6B6B;font-size:13px;">Email : </span>
          <span style="color:#FFFFFF;font-size:13px;font-weight:600;">${to_email}</span>
        </div>
        ${password ? `
        <div style="margin-bottom:10px;">
          <span style="color:#6B6B6B;font-size:13px;">Mot de passe : </span>
          <span style="color:#F97316;font-size:14px;font-weight:700;font-family:monospace;letter-spacing:0.05em;">${password}</span>
        </div>
        ` : ''}
        <div style="margin-top:14px;padding-top:14px;border-top:1px solid rgba(255,255,255,0.06);">
          <p style="color:#6B6B6B;font-size:12px;margin:0;">
            🔒 Pensez à changer votre mot de passe après votre première connexion.
          </p>
        </div>
      </div>

      <div style="background:#1C1C1C;border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:16px;margin-bottom:24px;">
        <p style="color:#6B6B6B;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 10px;">
          Vos accès
        </p>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
          <span style="color:#F97316;font-size:14px;">✓</span>
          <span style="color:#D4D4D4;font-size:13px;">Gestion du menu et des catégories</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
          <span style="color:#F97316;font-size:14px;">✓</span>
          <span style="color:#D4D4D4;font-size:13px;">Suivi et gestion des commandes</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
          <span style="color:#F97316;font-size:14px;">✓</span>
          <span style="color:#D4D4D4;font-size:13px;">Paramètres du restaurant</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="color:#F97316;font-size:14px;">✓</span>
          <span style="color:#D4D4D4;font-size:13px;">Génération de QR codes et reçus</span>
        </div>
      </div>

      <a href="${platformUrl}/login"
        style="display:block;background:#F97316;color:white;text-align:center;padding:14px 24px;border-radius:12px;font-weight:700;font-size:15px;text-decoration:none;margin-bottom:16px;">
        Accéder à mon tableau de bord →
      </a>

      <p style="color:#6B6B6B;font-size:13px;text-align:center;margin:0;">
        Une question ? Contactez votre super administrateur TerangaLink.
      </p>
    </div>

    <p style="color:#444;font-size:12px;text-align:center;margin-top:24px;">
      © 2026 TerangaLink · Dakar, Sénégal
    </p>
  </div>
</body>
</html>`.trim()

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 465,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })

    await transporter.sendMail({
      from: `"TerangaLink" <${process.env.SMTP_USER}>`,
      to: to_email,
      subject,
      html: htmlBody,
    })

    console.log(`[ADMIN INVITE EMAIL] ✅ Envoyé à ${to_email} pour ${restaurant_name}`)

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('Admin invite email error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
