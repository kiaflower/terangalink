import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { OrderItem, PaymentMethod } from '@/lib/types'

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: 'Espèces',
  wave: 'Wave',
  orange_money: 'Orange Money',
}

function cleanPhone(phone: string | null | undefined) {
  const digits = (phone || '').replace(/\D/g, '')
  if (digits.length === 9 && digits.startsWith('7')) return `221${digits}`
  return digits
}

function formatOrderTime(value: string) {
  return new Intl.DateTimeFormat('fr-SN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Dakar',
  }).format(new Date(value))
}

function buildOwnerMessage(params: {
  restaurantName: string
  orderId: string
  customerName: string
  items: OrderItem[]
  total: number
  paymentMethod: PaymentMethod
  createdAt: string
  dashboardUrl: string
}) {
  const itemLines = params.items
    .map(item => `• ${item.quantity}× ${item.name} — ${(item.price * item.quantity).toLocaleString('fr-SN')} FCFA`)
    .join('\n')

  return encodeURIComponent(
    `Nouvelle commande — ${params.restaurantName}\n\n` +
    `Client : ${params.customerName}\n` +
    `Commande :\n${itemLines}\n\n` +
    `Total : ${params.total.toLocaleString('fr-SN')} FCFA\n` +
    `Paiement : ${PAYMENT_LABELS[params.paymentMethod]}\n` +
    `Heure : ${formatOrderTime(params.createdAt)}\n\n` +
    `🔗 Gérer la commande :\n${params.dashboardUrl}`
  )
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { restaurant_id, customer_name, customer_phone, items, total, notes } = body
    const payment_method: PaymentMethod = ['cash', 'wave', 'orange_money'].includes(body.payment_method)
      ? body.payment_method
      : 'cash'

    if (!restaurant_id || !customer_name?.trim() || !customer_phone?.trim() || !items?.length || !total) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    const { data: restaurant, error: restaurantError } = await adminClient
      .from('restaurants')
      .select('name, phone, whatsapp_number')
      .eq('id', restaurant_id)
      .eq('is_active', true)
      .single()

    if (restaurantError || !restaurant) {
      return NextResponse.json({ error: 'Restaurant introuvable' }, { status: 404 })
    }

    const ownerPhone = cleanPhone(restaurant.whatsapp_number || restaurant.phone)
    if (!ownerPhone) {
      return NextResponse.json({ error: 'Numéro WhatsApp du restaurant non configuré' }, { status: 400 })
    }

    let { data, error } = await adminClient
      .from('orders')
      .insert({
        restaurant_id,
        customer_name: customer_name.trim(),
        customer_phone: customer_phone.trim(),
        items,
        total,
        payment_method,
        notes: notes || null,
        status: 'pending',
      })
      .select()
      .single()

    if (error && error.message.includes('payment_method')) {
      const fallback = await adminClient
        .from('orders')
        .insert({
          restaurant_id,
          customer_name: customer_name.trim(),
          customer_phone: customer_phone.trim(),
          items,
          total,
          notes: notes || null,
          status: 'pending',
        })
        .select()
        .single()

      data = fallback.data
      error = fallback.error
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const dashboardUrl = new URL(`/dashboard/restaurant/orders?order=${data.id}`, request.nextUrl.origin).toString()
    const whatsappMessage = buildOwnerMessage({
      restaurantName: restaurant.name,
      orderId: data.id,
      customerName: data.customer_name || customer_name.trim(),
      items: data.items as OrderItem[],
      total: data.total,
      paymentMethod: (data as { payment_method?: PaymentMethod }).payment_method || payment_method,
      createdAt: data.created_at,
      dashboardUrl,
    })

    return NextResponse.json({
      success: true,
      data,
      dashboard_url: dashboardUrl,
      whatsapp_url: `https://wa.me/${ownerPhone}?text=${whatsappMessage}`,
    })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
