import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { slugify } from '@/lib/utils'
import { registerReferral } from '@/lib/referral'
import { encryptSecret, decryptSecret } from '@/lib/crypto'
import { sendMail } from '@/lib/email/send'
import { welcomeEmail } from '@/lib/email/templates'
import { NextRequest, NextResponse } from 'next/server'
import { sendPushToSuperAdmins } from '@/lib/push/sendPush'
import { getAdminNotificationSettings } from '@/lib/push/adminNotificationSettings'

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
  return `TL-${random}`
}

// The inscription form stores images as base64 data URIs (to survive the wizard's
// multi-step client state). Storing that raw string in restaurants.logo_url/cover_url
// would ship megabytes of base64 on every restaurants query — upload to Storage instead
// and keep only the short public URL.
async function uploadBase64Image(
  admin: ReturnType<typeof createAdminClient>,
  dataUri: unknown,
  path: string
): Promise<string | null> {
  if (typeof dataUri !== 'string' || !dataUri.startsWith('data:')) {
    return typeof dataUri === 'string' ? dataUri : null
  }
  const match = dataUri.match(/^data:(.+);base64,(.*)$/)
  if (!match) return null
  const [, contentType, base64Data] = match
  const buffer = Buffer.from(base64Data, 'base64')
  const { error } = await admin.storage.from('restaurant-images').upload(path, buffer, { contentType, upsert: true })
  if (error) return null
  const { data } = admin.storage.from('restaurant-images').getPublicUrl(path)
  return data.publicUrl
}

// Public: submit inscription form
export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') ?? ''
  let body: Record<string, unknown> = {}

  if (contentType.includes('application/json')) {
    body = await req.json()
  } else {
    const form = await req.formData()
    const id = form.get('id') as string
    const action = form.get('action') as string

    // Admin action (approve/reject)
    if (id && action) {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (profile?.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

      if (action === 'reject') {
        await supabase.from('inscriptions').update({ status: 'rejected' }).eq('id', id)
        return NextResponse.json({ ok: true })
      }

      if (action === 'approve') {
        const admin = createAdminClient()

        // Fetch inscription details
        const { data: ins } = await admin.from('inscriptions').select('*').eq('id', id).single()
        if (!ins) return NextResponse.json({ error: 'Inscription introuvable' }, { status: 404 })

        // Auto-create restaurant
        const slug = slugify((ins as Record<string, unknown>).restaurant_name as string || 'restaurant')
        // Le mot de passe choisi par le demandeur à l'inscription (chiffré)
        // est utilisé s'il existe ; sinon (anciennes inscriptions avant ce
        // champ) on retombe sur un mot de passe généré aléatoirement.
        const chosenPasswordEnc = (ins as Record<string, unknown>).chosen_password_enc as string | null
        const adminPassword = chosenPasswordEnc ? decryptSecret(chosenPasswordEnc) : generatePassword()

        // Check slug uniqueness
        const { data: existing } = await admin.from('restaurants').select('id').eq('slug', slug).maybeSingle()
        const finalSlug = existing ? `${slug}-${Date.now().toString(36)}` : slug

        // Generate referral code
        let referral_code = generateReferralCode()
        for (let i = 0; i < 5; i++) {
          const { data: rc } = await admin.from('restaurants').select('id').eq('referral_code', referral_code).maybeSingle()
          if (!rc) break
          referral_code = generateReferralCode()
        }

        const r = ins as Record<string, unknown>

        const [logo_url, cover_url] = await Promise.all([
          uploadBase64Image(admin, r.logo_base64, `restaurants/${finalSlug}/logo-${Date.now()}.jpg`),
          uploadBase64Image(admin, r.cover_base64, `restaurants/${finalSlug}/cover-${Date.now()}.jpg`),
        ])

        // Create restaurant
        const { data: restaurant, error: restaurantError } = await admin.from('restaurants').insert({
          name: r.restaurant_name,
          slug: finalSlug,
          description: r.description || r.message || null,
          whatsapp_number: r.whatsapp_number,
          phone: r.phone || null,
          cuisine_type: r.cuisine_type || null,
          city: r.city || null,
          facebook_url: r.facebook_url || null,
          instagram_url: r.instagram_url || null,
          tiktok_url: r.tiktok_url || null,
          snapchat_url: r.snapchat_url || null,
          is_active: true,
          is_demo: false,
          is_verified: false,
          // Custom colors and theme are a Pro feature — Starter always keeps TerangaLink's defaults
          primary_color: r.plan === 'pro' ? (r.primary_color || '#F97316') : '#F97316',
          theme: r.plan === 'pro' ? ((r.theme as string) || 'light') : 'light',
          logo_url,
          cover_url,
          referral_code,
          referred_by_code: (r.referral_code as string) || null,
          newsletter_opt_in: r.consent_marketing === true,
          password_version: 1,
          admin_password_enc: encryptSecret(adminPassword),
        }).select().single()

        if (restaurantError || !restaurant) {
          console.error('auto-create restaurant error:', restaurantError)
          return NextResponse.json({ error: restaurantError?.message || 'Erreur lors de la création du restaurant' }, { status: 500 })
        }

        // Create auth user
        const { data: newUser, error: userError } = await admin.auth.admin.createUser({
          email: r.email as string,
          password: adminPassword,
          email_confirm: true,
          user_metadata: { full_name: r.owner_name, role: 'restaurant_admin' },
        })

        if (userError || !newUser.user) {
          await admin.from('restaurants').delete().eq('id', restaurant.id)
          console.error('auto-create user error:', userError)
          return NextResponse.json({ error: userError?.message || 'Erreur lors de la création du compte' }, { status: 500 })
        }

        const userId = newUser.user.id

        // Create profile
        const { error: profileError } = await admin.from('profiles').upsert({
          id: userId,
          email: r.email,
          full_name: r.owner_name,
          role: 'restaurant_admin',
          restaurant_id: restaurant.id,
          admin_role: 'principal',
        }, { onConflict: 'id' })

        if (profileError) {
          await admin.auth.admin.deleteUser(userId)
          await admin.from('restaurants').delete().eq('id', restaurant.id)
          console.error('auto-create profile error:', profileError)
          return NextResponse.json({ error: profileError.message }, { status: 500 })
        }

        // Create subscription. Tous les plans sont actifs immédiatement, sans
        // période d'essai (retiré — Starter/Pro avaient auparavant 8 jours).
        const plan = (r.plan as string) || 'starter'
        const startedAt = new Date()
        await admin.from('subscriptions').insert({
          restaurant_id: restaurant.id,
          plan,
          status: 'active',
          started_at: startedAt.toISOString(),
          ends_at: null,
        })

        // Record the referral relationship — the discount only kicks in once
        // this restaurant actually pays, see triggerReferralRewardIfDue
        await registerReferral(admin, restaurant.id, r.referral_code as string | null)

        // Everything succeeded — only now mark the inscription as approved
        await admin.from('inscriptions').update({
          status: 'approved',
          created_restaurant_id: restaurant.id,
          created_admin_password: adminPassword,
        } as Record<string, unknown>).eq('id', id)

        await sendMail({ to: r.email as string, ...welcomeEmail(restaurant.name, r.email as string, adminPassword) })

        return NextResponse.json({ ok: true, restaurant_id: restaurant.id })
      }
    }
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }

  const {
    restaurant_name, owner_name, email, password, phone, whatsapp_number,
    cuisine_type, city, description, message,
    plan, primary_color, theme, facebook_url, instagram_url, tiktok_url,
    snapchat_url, referral_code, logo_base64, cover_base64,
    want_verified_badge, partner_offer_type, partner_offer_custom,
    consent_images, consent_annuaire, consent_marketing,
  } = body as Record<string, unknown>

  if (!restaurant_name || !owner_name || !email || !phone || !whatsapp_number) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (typeof password !== 'string' || password.length < 8) {
    return NextResponse.json({ error: 'Mot de passe requis (8 caractères min)' }, { status: 400 })
  }
  if (plan && !['free', 'starter', 'pro'].includes(plan as string)) {
    return NextResponse.json({ error: 'Plan invalide' }, { status: 400 })
  }

  // Public, unauthenticated flow (visitors submitting the form aren't logged in) —
  // bypass RLS the same way /api/orders does for its public insert.
  const admin = createAdminClient()
  const { error } = await admin.from('inscriptions').insert({
    restaurant_name, owner_name, email, phone, whatsapp_number,
    chosen_password_enc: encryptSecret(password),
    cuisine_type: cuisine_type || null,
    city: city || null,
    description: description || null,
    message: message || null,
    plan: plan || 'starter',
    primary_color: primary_color || '#F97316',
    theme: theme || 'light',
    facebook_url: facebook_url || null,
    instagram_url: instagram_url || null,
    tiktok_url: tiktok_url || null,
    snapchat_url: snapchat_url || null,
    referral_code: referral_code || null,
    logo_base64: logo_base64 || null,
    cover_base64: cover_base64 || null,
    want_verified_badge: want_verified_badge || false,
    partner_offer_type: partner_offer_type || null,
    partner_offer_custom: partner_offer_custom || null,
    consent_images: consent_images || false,
    consent_annuaire: consent_annuaire || false,
    consent_marketing: consent_marketing || false,
  } as Record<string, unknown>)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Alerte le super admin qu'une demande attend sa revue/approbation — pas
  // au moment où lui-même l'approuve (il le sait déjà à ce moment-là).
  try {
    const settings = await getAdminNotificationSettings(admin)
    if (settings.new_signup_enabled) {
      await sendPushToSuperAdmins(admin, {
        type: 'admin_new_signup',
        title: 'Nouvelle demande d\'inscription',
        body: `${restaurant_name} (${owner_name}) vient de demander à rejoindre TerangaLink.`,
        url: '/dashboard/super-admin/inscriptions',
      })
    }
  } catch (err) {
    console.error('new_signup push error:', err)
  }

  return NextResponse.json({ ok: true })
}
