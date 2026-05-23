// src/app/api/admin/edit-restaurant/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PUT(request: NextRequest) {
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
      id, name, slug, description, city, address,
      whatsapp_number, latitude, longitude,
      delivery_zones, opening_hours,
      primary_color, background_color,
      logo_url, banner_url,
      plan,
    } = body

    if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

    const { error: rErr } = await supabase
      .from('restaurants')
      .update({
        name, slug, description, city, address,
        whatsapp_number,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        delivery_zones: delivery_zones || [],
        opening_hours: opening_hours || {},
        primary_color: primary_color || '#F97316',
        background_color: background_color || '#0F0F0F',
        logo_url,
        banner_url,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (rErr) throw rErr

    if (plan) {
      await supabase
        .from('subscriptions')
        .update({ plan, updated_at: new Date().toISOString() })
        .eq('restaurant_id', id)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('edit-restaurant error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
