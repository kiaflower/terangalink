import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToBoutique } from '@/lib/push/sendPush'
import { getBoutiqueNotificationSettings } from '@/lib/push/notificationSettings'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { boutique_id, order_id, customer_name, rating, comment } = body

    if (!boutique_id || !rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
    }

    const admin = createAdminClient()

    if (order_id) {
      const { data: existing } = await admin
        .from('reviews')
        .select('id')
        .eq('order_id', order_id)
        .limit(1)
        .single()

      if (existing) {
        return NextResponse.json({ error: 'Un avis existe déjà pour cette commande' }, { status: 409 })
      }
    }

    const { error } = await admin.from('reviews').insert({
      boutique_id,
      order_id: order_id || null,
      customer_name: customer_name || null,
      rating,
      comment: comment || null,
      is_visible: true,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    try {
      const settings = await getBoutiqueNotificationSettings(admin, boutique_id)
      if (settings.review_received_enabled) {
        const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating)
        await sendPushToBoutique(admin, boutique_id, {
          type: 'review_received',
          title: 'Nouvel avis client',
          body: comment ? `${stars} — "${comment}"` : `${stars}${customer_name ? ` de ${customer_name}` : ''}`,
          url: '/dashboard/boutique/orders',
        })
      }
    } catch (err) {
      console.error('review_received push error:', err)
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const boutiqueId = searchParams.get('boutique_id')
  const orderId = searchParams.get('order_id')
  if (!boutiqueId && !orderId) return NextResponse.json({ error: 'boutique_id ou order_id requis' }, { status: 400 })

  const admin = createAdminClient()

  if (orderId) {
    const { data, error } = await admin
      .from('reviews')
      .select('id, customer_name, rating, comment, created_at')
      .eq('order_id', orderId)
      .limit(1)
      .maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }

  const { data, error } = await admin
    .from('reviews')
    .select('id, customer_name, rating, comment, created_at')
    .eq('boutique_id', boutiqueId!)
    .eq('is_visible', true)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
