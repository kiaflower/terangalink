import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizePlan } from '@/lib/plans'
import { DEFAULT_BUTTON_COLOR, DEFAULT_DARK_BACKGROUND, DEFAULT_PRIMARY_COLOR } from '@/lib/theme'

async function updateRestaurant(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase as any).from('profiles').select('role').eq('id', user.id).single()
    const p = profile as { role: string } | null
    if (p?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await request.json()
    const {
      id,
      latitude,
      longitude,
      banner_url,
      cover_url,
      plan,
      primary_color,
      background_color,
      button_color,
      theme_mode,
      facebook_url,
      instagram_url,
      tiktok_url,
      snapchat_url,
      sub_id,
      sub_status,
      ...rest
    } = body

    if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

    const normalizedPlan = plan ? normalizePlan(String(plan)) : null
    // Thème personnalisé et réseaux sociaux disponibles pour Pro ET Premium
    const hasAdvancedTheme = normalizedPlan === 'pro' || normalizedPlan === 'premium'

    // Payload de base
    const corePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    const coreFields = ['name', 'slug', 'description', 'city', 'neighborhood', 'address', 'cuisine_type', 'is_active', 'opening_hours', 'delivery_fee', 'show_delivery_fee']
    for (const field of coreFields) {
      if (field in rest) corePayload[field] = rest[field]
    }
    if ('phone' in rest) corePayload.phone = rest.phone || null
    if ('whatsapp_number' in rest) corePayload.whatsapp_number = rest.whatsapp_number || null
    if ('logo_url' in rest) corePayload.logo_url = rest.logo_url || null

    if (typeof latitude !== 'undefined') corePayload.latitude = latitude ? parseFloat(latitude) : null
    if (typeof longitude !== 'undefined') corePayload.longitude = longitude ? parseFloat(longitude) : null

    if (typeof banner_url !== 'undefined' || typeof cover_url !== 'undefined') {
      const resolvedBanner = banner_url ?? cover_url ?? null
      corePayload.banner_url = resolvedBanner
      corePayload.cover_url = resolvedBanner
    }

    // Thème : sauvegardé pour Pro ET Premium, remis par défaut pour Starter
    if (normalizedPlan) {
      if (hasAdvancedTheme) {
        corePayload.primary_color = primary_color || DEFAULT_PRIMARY_COLOR
        corePayload.background_color = background_color || DEFAULT_DARK_BACKGROUND
        corePayload.button_color = button_color || primary_color || DEFAULT_BUTTON_COLOR
        corePayload.theme_mode = theme_mode || 'dark'
        corePayload.facebook_url = facebook_url || null
        corePayload.instagram_url = instagram_url || null
        corePayload.tiktok_url = tiktok_url || null
        corePayload.snapchat_url = snapchat_url || null
      } else {
        // Starter : valeurs TerangaLink par défaut
        corePayload.primary_color = DEFAULT_PRIMARY_COLOR
        corePayload.background_color = DEFAULT_DARK_BACKGROUND
        corePayload.button_color = DEFAULT_BUTTON_COLOR
        corePayload.theme_mode = 'dark'
        corePayload.facebook_url = null
        corePayload.instagram_url = null
        corePayload.tiktok_url = null
        corePayload.snapchat_url = null
      }
    }

    // Client admin pour bypasser le RLS (super admin modifie n'importe quel restaurant)
    const adminClient = createAdminClient()

    // Mise à jour du restaurant
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: rErr } = await (adminClient as any)
      .from('restaurants')
      .update(corePayload)
      .eq('id', id)

    if (rErr) {
      // Si l'erreur vient de colonnes manquantes, réessayer avec seulement les colonnes de base
      if (rErr.code === 'PGRST204' && rErr.message?.includes('column')) {
        console.warn('Extended columns missing, saving core fields only:', rErr.message)

        const safePayload: Record<string, unknown> = { updated_at: new Date().toISOString() }
        const safeFields = ['name', 'slug', 'description', 'city', 'address', 'is_active', 'phone', 'whatsapp_number', 'logo_url']
        for (const field of safeFields) {
          if (field in corePayload) safePayload[field] = corePayload[field]
          else if (field in rest) safePayload[field] = rest[field]
        }
        if (typeof banner_url !== 'undefined' || typeof cover_url !== 'undefined') {
          const resolvedBanner = banner_url ?? cover_url ?? null
          safePayload.cover_url = resolvedBanner
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: safeErr } = await (adminClient as any)
          .from('restaurants')
          .update(safePayload)
          .eq('id', id)

        if (safeErr) throw safeErr

        return NextResponse.json({
          success: true,
          warning: 'Informations de base sauvegardées. Exécutez la migration SQL pour activer la personnalisation complète.',
        })
      }
      throw rErr
    }

    // Mise à jour ou création de l'abonnement via admin client (bypasse RLS)
    if (normalizedPlan) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existingSub } = await (adminClient as any)
        .from('subscriptions')
        .select('id')
        .eq('restaurant_id', id)
        .single()

      const subUpdate: Record<string, unknown> = {
        plan: normalizedPlan,
        updated_at: new Date().toISOString(),
      }
      // Mettre à jour le statut si fourni
      if (sub_status) subUpdate.status = sub_status

      if (existingSub) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (adminClient as any)
          .from('subscriptions')
          .update(subUpdate)
          .eq('restaurant_id', id)
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (adminClient as any)
          .from('subscriptions')
          .insert({ restaurant_id: id, plan: normalizedPlan, status: sub_status || 'active' })
      }
    } else if (sub_id && sub_status) {
      // Mise à jour du statut uniquement (sans changement de plan)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (adminClient as any)
        .from('subscriptions')
        .update({ status: sub_status, updated_at: new Date().toISOString() })
        .eq('id', sub_id)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('edit-restaurant error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return updateRestaurant(request)
}

export async function PUT(request: NextRequest) {
  return updateRestaurant(request)
}
