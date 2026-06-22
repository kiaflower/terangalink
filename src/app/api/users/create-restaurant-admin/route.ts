import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { slugify } from '@/lib/utils'
import { normalizePlan, PLAN_LABELS } from '@/lib/plans'
import nodemailer from 'nodemailer'

async function findUserByEmail(adminClient: ReturnType<typeof createAdminClient>, email: string) {
  const target = email.toLowerCase()
  let page = 1
  while (page <= 20) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    const users = data?.users || []
    const found = users.find(u => (u.email || '').toLowerCase() === target)
    if (found) return found
    if (users.length < 1000) break
    page += 1
  }
  return null
}

async function sendWelcomeEmail(params: {
  to_email: string
  restaurant_name: string
  admin_name: string
  password: string
  plan: string
  platformUrl: string
}) {
  const planLabel = PLAN_LABELS[normalizePlan(params.plan)]
  const subject = `Bienvenue sur TerangaLink — ${params.restaurant_name} est en ligne !`
  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0A0A0A;font-family:Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;background:#F97316;border-radius:12px;padding:10px 16px;">
        <span style="color:white;font-weight:900;font-size:18px;">TerangaLink</span>
      </div>
    </div>
    <div style="background:#141414;border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:32px;">
      <h1 style="color:#FFFFFF;font-size:22px;font-weight:700;margin:0 0 8px;">Bienvenue, ${params.admin_name} ! 👋</h1>
      <p style="color:#A3A3A3;font-size:15px;margin:0 0 24px;line-height:1.6;">
        Votre restaurant <strong style="color:#FFFFFF;">${params.restaurant_name}</strong> est maintenant sur TerangaLink.
      </p>
      <div style="background:#1C1C1C;border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:20px;margin-bottom:24px;">
        <p style="color:#6B6B6B;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 12px;">Vos identifiants</p>
        <div style="margin-bottom:10px;">
          <span style="color:#6B6B6B;font-size:13px;">Email : </span>
          <span style="color:#FFFFFF;font-size:13px;font-weight:600;">${params.to_email}</span>
        </div>
        <div style="margin-bottom:10px;">
          <span style="color:#6B6B6B;font-size:13px;">Mot de passe : </span>
          <span style="color:#F97316;font-size:13px;font-weight:700;font-family:monospace;">${params.password}</span>
        </div>
        <div>
          <span style="color:#6B6B6B;font-size:13px;">Plan : </span>
          <span style="color:#FFFFFF;font-size:13px;font-weight:600;">${planLabel}</span>
        </div>
      </div>
      <a href="${params.platformUrl}/login" style="display:block;background:#F97316;color:white;text-align:center;padding:14px 24px;border-radius:12px;font-weight:700;font-size:15px;text-decoration:none;margin-bottom:16px;">
        Accéder à mon tableau de bord →
      </a>
      <p style="color:#6B6B6B;font-size:13px;text-align:center;margin:0;">Besoin d'aide ? Contactez-nous sur WhatsApp.</p>
    </div>
    <p style="color:#444;font-size:12px;text-align:center;margin-top:24px;">© 2026 TerangaLink · Dakar, Sénégal</p>
  </div>
</body>
</html>`

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 465,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  })

  await transporter.sendMail({
    from: `"TerangaLink" <${process.env.SMTP_USER}>`,
    to: params.to_email,
    subject,
    html,
  })
  console.log(`[EMAIL] ✅ Bienvenue envoyé à ${params.to_email}`)
}

export async function POST(request: NextRequest) {
  try {
    const callerClient = await createClient()
    const { data: { user: caller } } = await callerClient.auth.getUser()
    if (!caller) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: callerProfile } = await callerClient
      .from('profiles').select('role').eq('id', caller.id).single()
    if (callerProfile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await request.json()
    const {
      full_name, email, password, restaurant_name,
      restaurant_city, restaurant_phone, restaurant_address,
      cuisine_type, plan = 'starter',
    } = body

    if (!full_name || !email || !password || !restaurant_name) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
    }

    const normalizedPlan = normalizePlan(plan)
    const adminClient = createAdminClient()

    // Récupérer platformUrl
    const { data: settingsData } = await callerClient.from('platform_settings').select('key, value')
    const settingsMap: Record<string, string> = {}
    for (const row of settingsData ?? []) settingsMap[row.key] = row.value
    const platformUrl = settingsMap.platform_url || process.env.NEXT_PUBLIC_APP_URL || 'https://terangalink.sn'

    let userId: string | null = null
    let createdUserId: string | null = null

    const existing = await findUserByEmail(adminClient, String(email))
    if (existing) {
      userId = existing.id
    } else {
      const { data: newUser, error: userError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name, role: 'restaurant_admin' },
      })
      if (userError || !newUser.user) {
        return NextResponse.json({ error: userError?.message || 'Erreur création utilisateur' }, { status: 500 })
      }
      userId = newUser.user.id
      createdUserId = newUser.user.id
    }

    const slug = slugify(restaurant_name)
    const { data: restaurant, error: restaurantError } = await adminClient
      .from('restaurants')
      .insert({
        name: restaurant_name, slug,
        city: restaurant_city || 'Dakar',
        phone: restaurant_phone || null,
        address: restaurant_address || null,
        cuisine_type: cuisine_type || null,
        owner_id: userId,
        is_active: true,
        is_verified: false,
      })
      .select().single()

    if (restaurantError || !restaurant) {
      if (createdUserId) await adminClient.auth.admin.deleteUser(createdUserId)
      return NextResponse.json({ error: restaurantError?.message || 'Erreur création restaurant' }, { status: 500 })
    }

    const { error: profileUpsertError } = await adminClient.from('profiles').upsert({
      id: userId, email, full_name,
      role: 'restaurant_admin',
      restaurant_id: restaurant.id,
      updated_at: new Date().toISOString(),
    })

    if (profileUpsertError) {
      await adminClient.from('restaurants').delete().eq('id', restaurant.id)
      if (createdUserId) await adminClient.auth.admin.deleteUser(createdUserId)
      return NextResponse.json({ error: 'Restaurant créé mais liaison admin incomplète' }, { status: 500 })
    }

    const { error: subError } = await adminClient.from('subscriptions').insert({
      restaurant_id: restaurant.id,
      plan: normalizedPlan,
      status: 'trial',
    })

    if (subError) {
      await adminClient.from('restaurants').delete().eq('id', restaurant.id)
      if (createdUserId) await adminClient.auth.admin.deleteUser(createdUserId)
      return NextResponse.json({ error: subError.message || 'Erreur création abonnement' }, { status: 500 })
    }

    // Email avec timeout pour ne pas bloquer si SMTP lent
    let emailError: string | null = null
    try {
      const emailTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('SMTP timeout (5s)')), 5000)
      )
      await Promise.race([
        sendWelcomeEmail({
          to_email: email,
          restaurant_name: restaurant.name,
          admin_name: full_name,
          password,
          plan: normalizedPlan,
          platformUrl,
        }),
        emailTimeout,
      ])
    } catch (emailErr) {
      emailError = emailErr instanceof Error ? emailErr.message : 'Erreur inconnue'
      console.error('[EMAIL] ❌ Erreur envoi:', emailErr)
    }

    return NextResponse.json({
      success: true,
      data: { user_id: userId, restaurant_id: restaurant.id, restaurant_name: restaurant.name, email },
      email_sent: !emailError,
      email_error: emailError,
    })
  } catch (error) {
    console.error('Create restaurant admin error:', error)
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 })
  }
}
