import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generatePassword, rotateRestaurantPassword, getPrincipalAdmin } from '@/lib/auth/restaurantAdmin'
import { sendMail } from '@/lib/email/send'
import { supportResetEmail } from '@/lib/email/templates'

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

    const { restaurant_id } = await request.json()
    if (!restaurant_id) return NextResponse.json({ error: 'restaurant_id requis' }, { status: 400 })

    const admin = createAdminClient()
    const { data: restaurantData } = await admin.from('restaurants').select('name').eq('id', restaurant_id).single()
    if (!restaurantData) return NextResponse.json({ error: 'Restaurant introuvable' }, { status: 404 })

    const newPassword = generatePassword()
    // actingUserId: null — le super-admin n'a pas de session restaurant à préserver,
    // et son impersonation ne dépend jamais de password_version.
    await rotateRestaurantPassword(admin, restaurant_id, newPassword, null)

    const principal = await getPrincipalAdmin(admin, restaurant_id)
    if (principal) {
      await sendMail({ to: principal.email, ...supportResetEmail(restaurantData.name, principal.email, newPassword) })
    }

    return NextResponse.json({ ok: true, sent_to: principal?.email ?? null })
  } catch (err) {
    console.error('reset-restaurant-password error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
