import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { slugify } from '@/lib/utils'
import { registerReferral } from '@/lib/referral'
import { encryptSecret } from '@/lib/crypto'
import { sendMail } from '@/lib/email/send'
import { welcomeEmail } from '@/lib/email/templates'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const caller = createClient()
    const { data: { user } } = await caller.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: callerProfile } = await caller.from('profiles').select('role').eq('id', user.id).single()
    if (callerProfile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await request.json()
    const {
      name, slug: rawSlug, cuisine_type, city, description, whatsapp_number, phone,
      facebook_url, instagram_url, tiktok_url, snapchat_url,
      wave_number, orange_money_number, delivery_info,
      admin_full_name, admin_email, admin_password, plan,
      primary_color, theme, logo_url, cover_url, referred_by_code,
    } = body

    if (!name || !whatsapp_number || !admin_full_name || !admin_email || !admin_password) {
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 })
    }
    if (admin_password.length < 8) {
      return NextResponse.json({ error: 'Le mot de passe doit contenir au moins 8 caractères' }, { status: 400 })
    }

    const finalPlan = plan === 'pro' || plan === 'free' ? plan : 'starter'
    const slug = rawSlug ? slugify(rawSlug) : slugify(name)

    const generateReferralCode = (): string => {
      const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
      const random = Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
      return `TS-${random}`
    }
    const uniqueReferralCode = async (): Promise<string> => {
      for (let i = 0; i < 10; i++) {
        const code = generateReferralCode()
        const { data } = await admin.from('restaurants').select('id').eq('referral_code', code).maybeSingle()
        if (!data) return code
      }
      return generateReferralCode()
    }

    const admin = createAdminClient()

    // Check slug uniqueness
    const { data: existingRestaurant } = await admin.from('restaurants').select('id').eq('slug', slug).maybeSingle()
    if (existingRestaurant) {
      return NextResponse.json({ error: 'Ce slug est déjà utilisé par une autre restaurant' }, { status: 400 })
    }

    const referral_code = await uniqueReferralCode()

    // Step 1: Create restaurant
    const { data: restaurant, error: restaurantError } = await admin
      .from('restaurants')
      .insert({
        name,
        slug,
        description: description || null,
        whatsapp_number,
        phone: phone || null,
        cuisine_type: cuisine_type || null,
        city: city || null,
        facebook_url: facebook_url || null,
        instagram_url: instagram_url || null,
        tiktok_url: tiktok_url || null,
        snapchat_url: snapchat_url || null,
        wave_number: wave_number || null,
        orange_money_number: orange_money_number || null,
        delivery_info: delivery_info || null,
        show_delivery_info: !!delivery_info,
        is_active: true,
        is_demo: false,
        is_verified: false,
        // Custom colors/theme are a Pro feature — Starter always keeps TerangaLink's defaults
        primary_color: finalPlan === 'pro' ? (primary_color || '#F97316') : '#F97316',
        theme: finalPlan === 'pro' ? (theme || 'light') : 'light',
        logo_url: logo_url || null,
        cover_url: cover_url || null,
        referral_code,
        referred_by_code: referred_by_code || null,
        password_version: 1,
        admin_password_enc: encryptSecret(admin_password),
      })
      .select()
      .single()

    if (restaurantError || !restaurant) {
      return NextResponse.json({ error: restaurantError?.message || 'Erreur création restaurant' }, { status: 500 })
    }

    // Step 2: Create auth user
    const { data: newUser, error: userError } = await admin.auth.admin.createUser({
      email: admin_email,
      password: admin_password,
      email_confirm: true,
      user_metadata: { full_name: admin_full_name, role: 'restaurant_admin' },
    })

    if (userError || !newUser.user) {
      // Rollback restaurant
      await admin.from('restaurants').delete().eq('id', restaurant.id)
      return NextResponse.json({ error: userError?.message || 'Erreur création compte admin' }, { status: 500 })
    }

    const userId = newUser.user.id

    // Step 3: Create/update profile (a DB trigger may already have inserted a
    // bare profiles row on auth.users creation, so upsert instead of insert).
    const { error: profileError } = await admin.from('profiles').upsert({
      id: userId,
      email: admin_email,
      full_name: admin_full_name,
      role: 'restaurant_admin',
      restaurant_id: restaurant.id,
      admin_role: 'principal',
    }, { onConflict: 'id' })

    if (profileError) {
      await admin.auth.admin.deleteUser(userId)
      await admin.from('restaurants').delete().eq('id', restaurant.id)
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    // Step 4: Create subscription. Free est actif immédiatement (pas d'essai,
    // jamais de facture) ; Starter/Pro gardent l'essai de 8 jours existant.
    const startedAt = new Date()
    const endsAt = finalPlan === 'free' ? null : new Date(startedAt.getTime() + 8 * 24 * 60 * 60 * 1000)

    const { error: subError } = await admin.from('subscriptions').insert({
      restaurant_id: restaurant.id,
      plan: finalPlan,
      status: finalPlan === 'free' ? 'active' : 'trial',
      started_at: startedAt.toISOString(),
      ends_at: endsAt ? endsAt.toISOString() : null,
    })

    if (subError) {
      console.error('create-restaurant: subscription insert failed', subError)
    }

    // Record the referral relationship — the discount only kicks in once
    // this restaurant actually pays, see triggerReferralRewardIfDue
    await registerReferral(admin, restaurant.id, referred_by_code || null)

    await sendMail({ to: admin_email, ...welcomeEmail(restaurant.name, admin_email, admin_password) })

    return NextResponse.json({
      success: true,
      restaurant: { id: restaurant.id, name: restaurant.name, slug: restaurant.slug },
      credentials: { email: admin_email, password: admin_password },
    })
  } catch (err) {
    console.error('create-restaurant error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
