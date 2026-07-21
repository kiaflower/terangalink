import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const admin = createAdminClient()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (id) {
    const { data } = await admin.from('inscriptions').select('*').eq('id', id).single()
    return NextResponse.json({ inscription: data ?? null })
  }

  // Exclude the base64 image blobs here — they can be several MB each and this
  // list view doesn't render images, only the fiche detail (fetched via ?id=) does.
  const { data } = await admin
    .from('inscriptions')
    .select('id, boutique_name, owner_name, email, phone, whatsapp_number, shop_category, city, description, status, created_at, plan, primary_color, theme, facebook_url, instagram_url, tiktok_url, snapchat_url, referral_code, want_verified_badge, partner_offer_type, partner_offer_custom, consent_images, consent_annuaire, consent_marketing, created_boutique_id, created_admin_password')
    .order('created_at', { ascending: false })
    .limit(100)
  return NextResponse.json({ inscriptions: data ?? [] })
}
