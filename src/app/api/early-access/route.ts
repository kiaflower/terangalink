import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const admin = createAdminClient()
    const [{ data: config }, { count }] = await Promise.all([
      admin.from('early_access_config').select('*').single(),
      admin.from('early_access_applications')
        .select('id', { count: 'exact', head: true })
        .neq('status', 'rejected'),
    ])

    const taken = count ?? 0
    const max = config?.max_places ?? 15
    const remaining = Math.max(0, max - taken)
    const isOpen = (config?.is_open !== false) && remaining > 0

    return NextResponse.json({ remaining, max, taken, isOpen })
  } catch (err) {
    console.error('early-access GET error:', err)
    // Ne jamais bloquer l'affichage public : si la config ou la DB est
    // indisponible, on retombe sur les valeurs par défaut (15 places, ouvert).
    return NextResponse.json({ remaining: 15, max: 15, taken: 0, isOpen: true })
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = createAdminClient()

    const [{ data: config }, { count }] = await Promise.all([
      admin.from('early_access_config').select('*').single(),
      admin.from('early_access_applications')
        .select('id', { count: 'exact', head: true })
        .neq('status', 'rejected'),
    ])

    const taken = count ?? 0
    const max = config?.max_places ?? 15
    const isOpen = (config?.is_open !== false) && taken < max
    if (!isOpen) {
      return NextResponse.json({ error: 'Plus de places disponibles' }, { status: 400 })
    }

    const formData = await req.formData()

    const boutique_name = formData.get('boutique_name') as string
    const shop_category = formData.get('shop_category') as string
    const city = formData.get('city') as string
    const owner_name = formData.get('owner_name') as string
    const email = formData.get('email') as string
    const phone = formData.get('phone') as string
    const whatsapp_number = formData.get('whatsapp_number') as string
    const consent_images = formData.get('consent_images') === 'true'
    const consent_annuaire = formData.get('consent_annuaire') === 'true'

    if (!boutique_name || !shop_category || !city || !owner_name || !email || !phone || !whatsapp_number) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
    }
    if (!consent_images || !consent_annuaire) {
      return NextResponse.json({ error: 'Consentements obligatoires manquants' }, { status: 400 })
    }

    const uploadImage = async (field: string, folder: string): Promise<string | null> => {
      const file = formData.get(field) as File | null
      if (!file || file.size === 0) return null
      const buffer = Buffer.from(await file.arrayBuffer())
      const filename = `early-access/${folder}/${Date.now()}-${file.name}`
      const { error } = await admin.storage.from('boutique-images').upload(filename, buffer, {
        contentType: file.type,
        upsert: true,
      })
      if (error) return null
      const { data } = admin.storage.from('boutique-images').getPublicUrl(filename)
      return data.publicUrl
    }

    const [logo_url, cover_url] = await Promise.all([
      uploadImage('logo', 'logos'),
      uploadImage('cover', 'covers'),
    ])

    const placeNumber = taken + 1
    const { data: application, error } = await admin
      .from('early_access_applications')
      .insert({
        boutique_name,
        shop_category,
        city,
        description: (formData.get('description') as string) || null,
        owner_name,
        email,
        phone,
        whatsapp_number,
        instagram_url: (formData.get('instagram_url') as string) || null,
        facebook_url: (formData.get('facebook_url') as string) || null,
        tiktok_url: (formData.get('tiktok_url') as string) || null,
        snapchat_url: (formData.get('snapchat_url') as string) || null,
        wave_number: (formData.get('wave_number') as string) || null,
        orange_money_number: (formData.get('orange_money_number') as string) || null,
        logo_url,
        cover_url,
        plan: (formData.get('plan') as string) || 'starter',
        primary_color: (formData.get('primary_color') as string) || '#7C3AED',
        theme: (formData.get('theme') as string) || 'light',
        referral_code: (formData.get('referral_code') as string) || null,
        partner_offer_type: (formData.get('partner_offer_type') as string) || null,
        partner_offer_custom: (formData.get('partner_offer_custom') as string) || null,
        consent_images,
        consent_annuaire,
        consent_marketing: formData.get('consent_marketing') === 'true',
        status: 'pending',
        place_number: placeNumber,
      })
      .select('id, place_number')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, place_number: application.place_number })
  } catch (err) {
    console.error('early-access POST error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
