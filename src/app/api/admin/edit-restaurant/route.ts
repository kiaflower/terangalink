import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { normalizePlan } from '@/lib/plans'
import { DEFAULT_BUTTON_COLOR, DEFAULT_DARK_BACKGROUND, DEFAULT_PRIMARY_COLOR } from '@/lib/theme'

async function updateRestaurant(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'super_admin') {
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
      ...rest
    } = body

    if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

    const normalizedPlan = plan ? normalizePlan(String(plan)) : null
    const isPro = normalizedPlan === 'pro'

    const updatePayload: Record<string, unknown> = {
      ...rest,
      updated_at: new Date().toISOString(),
    }

    if (normalizedPlan && !isPro) {
      updatePayload.primary_color = DEFAULT_PRIMARY_COLOR
      updatePayload.background_color = DEFAULT_DARK_BACKGROUND
      updatePayload.button_color = DEFAULT_BUTTON_COLOR
      updatePayload.theme_mode = 'dark'
      updatePayload.facebook_url = null
      updatePayload.instagram_url = null
      updatePayload.tiktok_url = null
    }

    if ('phone' in rest) updatePayload.phone = rest.phone || null
    if ('whatsapp_number' in rest) updatePayload.whatsapp_number = rest.whatsapp_number || null
    if ('logo_url' in rest) updatePayload.logo_url = rest.logo_url || null

    if (typeof latitude !== 'undefined') {
      updatePayload.latitude = latitude ? parseFloat(latitude) : null
    }
    if (typeof longitude !== 'undefined') {
      updatePayload.longitude = longitude ? parseFloat(longitude) : null
    }

    if (typeof banner_url !== 'undefined' || typeof cover_url !== 'undefined') {
      const resolvedBanner = banner_url ?? cover_url ?? null
      updatePayload.banner_url = resolvedBanner
      updatePayload.cover_url = resolvedBanner
    }

    const { error: rErr } = await supabase
      .from('restaurants')
      .update(updatePayload)
      .eq('id', id)

    if (rErr) throw rErr

    if (normalizedPlan) {
      await supabase
        .from('subscriptions')
        .update({ plan: normalizedPlan, updated_at: new Date().toISOString() })
        .eq('restaurant_id', id)
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