import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { slugify } from '@/lib/utils'
import { normalizePlan, PLAN_LABELS } from '@/lib/plans'
import nodemailer from 'nodemailer'

// ─── SMTP helper ──────────────────────────────────────────────────────────────
function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 465,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
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

  await createTransporter().sendMail({
    from: `"TerangaLink" <${process.env.SMTP_USER}>`,
    to: params.to_email,
    subject,
    html,
  })
  console.log(`[EMAIL] ✅ Bienvenue envoyé à ${params.to_email}`)
}

async function sendAdminInviteEmail(params: {
  to_email: string
  admin_name: string
  restaurant_name: string
  password: string
  platformUrl: string
}) {
  const subject = `Vous avez été ajouté comme administrateur — ${params.restaurant_name}`
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
      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-size:40px;margin-bottom:12px;">🎉</div>
        <h1 style="color:#FFFFFF;font-size:20px;font-weight:700;margin:0 0 8px;">Bonjour ${params.admin_name} !</h1>
        <p style="color:#A3A3A3;font-size:15px;margin:0;line-height:1.6;">
          Vous avez été ajouté comme <strong style="color:#FFFFFF;">administrateur</strong>
          du restaurant <strong style="color:#F97316;">${params.restaurant_name}</strong> sur TerangaLink.
        </p>
      </div>
      <div style="background:#1C1C1C;border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:20px;margin-bottom:24px;">
        <p style="color:#6B6B6B;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 14px;">Vos identifiants de connexion</p>
        <div style="margin-bottom:10px;">
          <span style="color:#6B6B6B;font-size:13px;">Email : </span>
          <span style="color:#FFFFFF;font-size:13px;font-weight:600;">${params.to_email}</span>
        </div>
        <div style="margin-bottom:10px;">
          <span style="color:#6B6B6B;font-size:13px;">Mot de passe : </span>
          <span style="color:#F97316;font-size:14px;font-weight:700;font-family:monospace;">${params.password}</span>
        </div>
        <div style="margin-top:14px;padding-top:14px;border-top:1px solid rgba(255,255,255,0.06);">
          <p style="color:#6B6B6B;font-size:12px;margin:0;">🔒 Pensez à changer votre mot de passe après votre première connexion.</p>
        </div>
      </div>
      <a href="${params.platformUrl}/login" style="display:block;background:#F97316;color:white;text-align:center;padding:14px 24px;border-radius:12px;font-weight:700;font-size:15px;text-decoration:none;margin-bottom:16px;">
        Accéder à mon tableau de bord →
      </a>
      <p style="color:#6B6B6B;font-size:13px;text-align:center;margin:0;">Une question ? Contactez votre super administrateur TerangaLink.</p>
    </div>
    <p style="color:#444;font-size:12px;text-align:center;margin-top:24px;">© 2026 TerangaLink · Dakar, Sénégal</p>
  </div>
</body>
</html>`

  await createTransporter().sendMail({
    from: `"TerangaLink" <${process.env.SMTP_USER}>`,
    to: params.to_email,
    subject,
    html,
  })
  console.log(`[EMAIL] ✅ Invitation admin envoyée à ${params.to_email}`)
}

// ─── Main route ───────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const caller = await createClient()
    const { data: { user } } = await caller.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: callerProfile } = await caller
      .from('profiles').select('role').eq('id', user.id).single()
    if (callerProfile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await request.json()
    const { full_name, email, password, restaurant_id, create_restaurant, restaurant_name, plan } = body

    if (!full_name || !email || !password) {
      return NextResponse.json({ error: 'Nom, email et mot de passe requis' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Mot de passe trop court (minimum 8 caractères)' }, { status: 400 })
    }

    const normalizedPlan = normalizePlan(plan || 'starter')
    const admin = createAdminClient()

    // Récupérer la platformUrl depuis platform_settings
    const { data: settingsData } = await caller.from('platform_settings').select('key, value')
    const settingsMap: Record<string, string> = {}
    for (const row of settingsData ?? []) settingsMap[row.key] = row.value
    const platformUrl = settingsMap.platform_url || process.env.NEXT_PUBLIC_APP_URL || 'https://terangalink.sn'

    // ─── Step 1: Create auth user ──────────────────────────────────────────
    const { data: newUser, error: userError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role: 'restaurant_admin' },
    })

    if (userError || !newUser.user) {
      return NextResponse.json(
        { error: userError?.message || 'Erreur création compte' },
        { status: 500 }
      )
    }

    const userId = newUser.user.id

    // ─── Step 2: Determine restaurant ─────────────────────────────────────
    let finalRestaurantId = restaurant_id
    let finalRestaurantName = restaurant_name

    if (create_restaurant && restaurant_name) {
      const slug = slugify(restaurant_name)
      const { data: restaurant, error: restaurantError } = await admin
        .from('restaurants')
        .insert({
          name: restaurant_name,
          slug,
          city: 'Dakar',
          owner_id: userId,
          is_active: true,
          is_verified: false,
        })
        .select()
        .single()

      if (restaurantError || !restaurant) {
        await admin.auth.admin.deleteUser(userId)
        return NextResponse.json(
          { error: restaurantError?.message || 'Erreur création restaurant' },
          { status: 500 }
        )
      }

      finalRestaurantId = restaurant.id
      finalRestaurantName = restaurant.name

      await admin.from('subscriptions').insert({
        restaurant_id: restaurant.id,
        plan: normalizedPlan,
        status: 'active',
      })
    } else if (restaurant_id && !create_restaurant) {
      const { data: existingRestaurant } = await admin
        .from('restaurants')
        .select('name')
        .eq('id', restaurant_id)
        .single()
      finalRestaurantName = existingRestaurant?.name || 'votre restaurant'
    }

    // ─── Step 3: Update or create profile ─────────────────────────────────
    const { data: existingProfile } = await admin
      .from('profiles').select('id').eq('id', userId).single()

    if (existingProfile) {
      await admin.from('profiles').update({
        full_name,
        role: 'restaurant_admin',
        restaurant_id: finalRestaurantId || null,
      }).eq('id', userId)
    } else {
      await admin.from('profiles').insert({
        id: userId,
        email,
        full_name,
        role: 'restaurant_admin',
        restaurant_id: finalRestaurantId || null,
      })
    }

    // ─── Step 4: Envoi email DIRECTEMENT (pas de fetch inter-routes) ───────
    try {
      if (create_restaurant) {
        await sendWelcomeEmail({
          to_email: email,
          restaurant_name: finalRestaurantName,
          admin_name: full_name,
          password,
          plan: normalizedPlan,
          platformUrl,
        })
      } else {
        await sendAdminInviteEmail({
          to_email: email,
          admin_name: full_name,
          restaurant_name: finalRestaurantName,
          password,
          platformUrl,
        })
      }
    } catch (emailErr) {
      // L'email ne bloque pas la création du compte
      console.error('[EMAIL] ❌ Erreur envoi:', emailErr)
    }

    return NextResponse.json({
      success: true,
      data: { user_id: userId, restaurant_id: finalRestaurantId, email },
    })

  } catch (err) {
    console.error('Create admin error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
