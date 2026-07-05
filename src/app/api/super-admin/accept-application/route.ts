import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildCanonical } from '@/lib/seo'
import { notifyGoogleIndexing } from '@/lib/google-indexing'

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

export async function POST(req: NextRequest) {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { application_id } = await req.json()
  if (!application_id) return NextResponse.json({ error: 'application_id requis' }, { status: 400 })

  const admin = createAdminClient()

  // 1. Lire la demande
  const { data: app, error: appErr } = await admin
    .from('restaurant_applications')
    .select('*')
    .eq('id', application_id)
    .single()

  if (appErr || !app) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })

  const tempPassword = generatePassword()

  try {
    // 2. Créer le compte Auth
    const { data: authData, error: authErr } = await admin.auth.admin.createUser({
      email: app.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: app.owner_name },
    })
    if (authErr) return NextResponse.json({ error: `Erreur création compte: ${authErr.message}` }, { status: 500 })
    const newUserId = authData.user.id

    // 3. Créer le restaurant
    let slug = toSlug(app.restaurant_name)
    // Vérifier unicité du slug
    const { count } = await admin.from('restaurants').select('id', { count: 'exact', head: true }).eq('slug', slug)
    if (count && count > 0) slug = slug + '-' + Date.now().toString(36)

    const hasCustomColors = app.color_choice === 'custom' && app.primary_color
    const { data: resto, error: restoErr } = await admin.from('restaurants').insert({
      name: app.restaurant_name,
      slug,
      description: app.description,
      city: app.city,
      address: app.address,
      neighborhood: app.neighborhood,
      cuisine_type: app.cuisine_type,
      logo_url: app.logo_url,
      cover_url: app.banner_url,
      banner_url: app.banner_url,
      facebook_url: app.facebook_url,
      instagram_url: app.instagram_url,
      tiktok_url: app.tiktok_url,
      snapchat_url: app.snapchat_url,
      opening_hours: app.opening_hours,
      whatsapp_number: app.whatsapp,
      phone: app.whatsapp,
      is_active: true,
      is_demo: false,
      theme_mode: 'dark',
      ...(hasCustomColors && {
        primary_color: app.primary_color,
        background_color: app.secondary_color ?? null,
        button_color: app.primary_color,
      }),
    }).select('id').single()
    if (restoErr) throw restoErr

    // 4. Créer le profil
    const { error: profileErr } = await admin.from('profiles').insert({
      id: newUserId,
      email: app.email,
      full_name: app.owner_name,
      role: 'restaurant_admin',
      restaurant_id: resto.id,
    })
    if (profileErr) throw profileErr

    // 5. Créer l'abonnement (trial 8 jours)
    const trialEnd = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString()
    await admin.from('subscriptions').insert({
      restaurant_id: resto.id,
      plan: app.selected_plan || 'starter',
      status: 'trial',
      trial_end_date: trialEnd,
    })

    // 6. Mettre à jour le statut de la demande
    await admin.from('restaurant_applications')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', application_id)

    // 7. Notifier Google Indexing (best-effort, ne bloque pas la réponse en cas d'échec)
    try {
      const indexingTimeout = new Promise<void>(resolve => setTimeout(resolve, 4000))
      await Promise.race([notifyGoogleIndexing(buildCanonical(slug)), indexingTimeout])
    } catch (indexingErr) {
      console.error('[google-indexing] accept-application error:', indexingErr)
    }

    return NextResponse.json({
      ok: true,
      tempPassword,
      slug,
      restaurant_id: resto.id,
      whatsapp: app.whatsapp,
      owner_name: app.owner_name,
      restaurant_name: app.restaurant_name,
      email: app.email,
    })
  } catch (err: unknown) {
    console.error('accept-application error:', err)
    const msg = err instanceof Error ? err.message : 'Erreur serveur'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
