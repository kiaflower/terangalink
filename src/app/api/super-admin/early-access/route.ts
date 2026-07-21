import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { slugify } from '@/lib/utils'
import { registerReferral } from '@/lib/referral'
import { encryptSecret } from '@/lib/crypto'
import { sendMail } from '@/lib/email/send'
import { welcomeEmail } from '@/lib/email/templates'
import { NextRequest, NextResponse } from 'next/server'
import type { EarlyAccessApplicationRow } from '@/lib/types/database'

export const dynamic = 'force-dynamic'

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  let p = ''
  for (let i = 0; i < 12; i++) p += chars[Math.floor(Math.random() * chars.length)]
  return p
}

function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  const random = Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `TS-${random}`
}

// Confirming an Early Access application creates the boutique straight away —
// same pattern as approving a normal inscription (/api/super-admin/inscriptions).
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { id } = await req.json().catch(() => ({}))
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  const admin = createAdminClient()
  const { data: app } = await admin.from('early_access_applications').select('*').eq('id', id).single()
  if (!app) return NextResponse.json({ error: 'Candidature introuvable' }, { status: 404 })
  const application = app as EarlyAccessApplicationRow

  // Idempotent — clicking "Confirmer" twice must not create a second boutique.
  if (application.created_boutique_id) {
    return NextResponse.json({ ok: true, boutique_id: application.created_boutique_id, already_created: true })
  }

  // Defensive fallback: if a previous attempt created the boutique/account but failed
  // to persist created_boutique_id (e.g. the tracking update below errored), reuse it
  // instead of creating a duplicate boutique + a duplicate auth account for the same email.
  const { data: existingProfile } = await admin.from('profiles').select('boutique_id').eq('email', application.email).maybeSingle()
  if (existingProfile?.boutique_id) {
    await admin.from('early_access_applications').update({
      status: 'confirmed',
      created_boutique_id: existingProfile.boutique_id,
    }).eq('id', id)
    return NextResponse.json({ ok: true, boutique_id: existingProfile.boutique_id, already_created: true })
  }

  const slug = slugify(application.boutique_name || 'boutique')
  const adminPassword = generatePassword()

  const { data: existing } = await admin.from('boutiques').select('id').eq('slug', slug).maybeSingle()
  const finalSlug = existing ? `${slug}-${Date.now().toString(36)}` : slug

  let referral_code = generateReferralCode()
  for (let i = 0; i < 5; i++) {
    const { data: rc } = await admin.from('boutiques').select('id').eq('referral_code', referral_code).maybeSingle()
    if (!rc) break
    referral_code = generateReferralCode()
  }

  const { data: boutique, error: boutiqueError } = await admin.from('boutiques').insert({
    name: application.boutique_name,
    slug: finalSlug,
    description: application.description || null,
    whatsapp_number: application.whatsapp_number,
    phone: application.phone || null,
    shop_category: application.shop_category || null,
    city: application.city || null,
    facebook_url: application.facebook_url || null,
    instagram_url: application.instagram_url || null,
    tiktok_url: application.tiktok_url || null,
    snapchat_url: application.snapchat_url || null,
    wave_number: application.wave_number || null,
    orange_money_number: application.orange_money_number || null,
    logo_url: application.logo_url || null,
    cover_url: application.cover_url || null,
    is_active: true,
    is_demo: false,
    is_verified: true, // Badge Vérifié offert — avantage Early Access
    primary_color: application.plan === 'pro' ? (application.primary_color || '#7C3AED') : '#7C3AED',
    theme: application.plan === 'pro' ? (application.theme || 'light') : 'light',
    referral_code,
    referred_by_code: application.referral_code || null,
    newsletter_opt_in: application.consent_marketing === true,
    password_version: 1,
    admin_password_enc: encryptSecret(adminPassword),
  }).select().single()

  if (boutiqueError || !boutique) {
    console.error('early-access auto-create boutique error:', boutiqueError)
    return NextResponse.json({ error: boutiqueError?.message || 'Erreur lors de la création de la boutique' }, { status: 500 })
  }

  const { data: newUser, error: userError } = await admin.auth.admin.createUser({
    email: application.email,
    password: adminPassword,
    email_confirm: true,
    user_metadata: { full_name: application.owner_name, role: 'boutique_admin' },
  })

  if (userError || !newUser.user) {
    await admin.from('boutiques').delete().eq('id', boutique.id)
    console.error('early-access auto-create user error:', userError)
    return NextResponse.json({ error: userError?.message || 'Erreur lors de la création du compte' }, { status: 500 })
  }

  const userId = newUser.user.id

  const { error: profileError } = await admin.from('profiles').upsert({
    id: userId,
    email: application.email,
    full_name: application.owner_name,
    role: 'boutique_admin',
    boutique_id: boutique.id,
    admin_role: 'principal',
  }, { onConflict: 'id' })

  if (profileError) {
    await admin.auth.admin.deleteUser(userId)
    await admin.from('boutiques').delete().eq('id', boutique.id)
    console.error('early-access auto-create profile error:', profileError)
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  const startedAt = new Date()
  const endsAt = new Date(startedAt.getTime() + 8 * 24 * 60 * 60 * 1000)
  await admin.from('subscriptions').insert({
    boutique_id: boutique.id,
    plan: application.plan || 'starter',
    status: 'trial',
    started_at: startedAt.toISOString(),
    ends_at: endsAt.toISOString(),
  })

  await registerReferral(admin, boutique.id, application.referral_code)

  const { error: trackingError } = await admin.from('early_access_applications').update({
    status: 'confirmed',
    created_boutique_id: boutique.id,
    created_admin_password: adminPassword,
  }).eq('id', id)

  if (trackingError) {
    console.error('early-access confirm tracking update error:', trackingError)
    return NextResponse.json({
      error: `Boutique créée, mais impossible d'enregistrer la confirmation (${trackingError.message}). Vérifiez que la migration 0009 a bien été exécutée sur Supabase.`,
      boutique_id: boutique.id,
    }, { status: 500 })
  }

  await sendMail({ to: application.email, ...welcomeEmail(boutique.name, application.email, adminPassword) })

  return NextResponse.json({ ok: true, boutique_id: boutique.id })
}
