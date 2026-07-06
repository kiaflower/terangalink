import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

function toSlug(name: string) {
  return name.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

function generatePassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let pwd = 'TL-'
  for (let i = 0; i < 8; i++) pwd += chars[Math.floor(Math.random() * chars.length)]
  return pwd + '!'
}

const EARLY_ACCESS_PRICE = 12900

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { registration_id } = await req.json()
  if (!registration_id) return NextResponse.json({ error: 'registration_id requis' }, { status: 400 })

  const admin = createAdminClient()

  const { data: reg, error: regErr } = await admin
    .from('early_access_registrations')
    .select('*')
    .eq('id', registration_id)
    .single()

  if (regErr || !reg) return NextResponse.json({ error: 'Inscription introuvable' }, { status: 404 })
  if (reg.restaurant_id) return NextResponse.json({ error: 'Cette inscription a déjà une boutique créée' }, { status: 400 })

  const tempPassword = generatePassword()

  try {
    let slug = toSlug(reg.restaurant_name)
    const { count } = await admin.from('restaurants').select('id', { count: 'exact', head: true }).eq('slug', slug)
    if (count && count > 0) slug = slug + '-' + Date.now().toString(36)

    const syntheticEmail = `${slug}@earlyaccess.teranga-link.com`

    const { data: authData, error: authErr } = await admin.auth.admin.createUser({
      email: syntheticEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: reg.admin_name },
    })
    if (authErr) return NextResponse.json({ error: `Erreur création compte: ${authErr.message}` }, { status: 500 })
    const newUserId = authData.user.id

    const hasCustomColors = reg.color_choice === 'custom' && reg.primary_color

    const { data: resto, error: restoErr } = await admin.from('restaurants').insert({
      name: reg.restaurant_name,
      slug,
      city: reg.city,
      address: reg.address,
      neighborhood: reg.neighborhood,
      logo_url: reg.logo_url,
      cover_url: reg.banner_url,
      banner_url: reg.banner_url,
      phone: reg.phone,
      whatsapp_number: reg.whatsapp,
      wave_number: reg.wave_number,
      orange_money_number: reg.orange_money_number,
      facebook_url: reg.facebook_url,
      instagram_url: reg.instagram_url,
      tiktok_url: reg.tiktok_url,
      snapchat_url: reg.snapchat_url,
      is_active: false,
      is_demo: false,
      is_founder: true,
      theme_mode: 'dark',
      ...(hasCustomColors && {
        primary_color: reg.primary_color,
        background_color: reg.secondary_color ?? null,
        button_color: reg.primary_color,
      }),
    }).select('id').single()
    if (restoErr) throw restoErr

    const { error: profileErr } = await admin.from('profiles').insert({
      id: newUserId,
      email: syntheticEmail,
      full_name: reg.admin_name,
      role: 'restaurant_admin',
      restaurant_id: resto.id,
    })
    if (profileErr) throw profileErr

    const trialEnd = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString()
    await admin.from('subscriptions').insert({
      restaurant_id: resto.id,
      plan: 'pro',
      status: 'trial',
      trial_end_date: trialEnd,
      legacy_price: EARLY_ACCESS_PRICE,
    })

    await admin.from('early_access_registrations')
      .update({ status: 'accepted', restaurant_id: resto.id, updated_at: new Date().toISOString() })
      .eq('id', registration_id)

    return NextResponse.json({
      ok: true,
      tempPassword,
      slug,
      restaurant_id: resto.id,
      whatsapp: reg.whatsapp,
      admin_name: reg.admin_name,
      restaurant_name: reg.restaurant_name,
    })
  } catch (err: unknown) {
    console.error('early-access accept error:', err)
    const msg = err instanceof Error ? err.message : 'Erreur serveur'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
