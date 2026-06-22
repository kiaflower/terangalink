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
  const d = new Date(value)
  if (isNaN(d.getTime())) return new Date().toLocaleString('fr-SN', { timeZone: 'Africa/Dakar' })
  return new Intl.DateTimeFormat('fr-SN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Dakar',
  }).format(d)
}

function buildOwnerMessage(params: {
  restaurantName: string
  orderNumber: string
  customerName: string
  customerPhone: string
  customerAddress: string | null
  items: OrderItem[]
  total: number
  paymentMethod: PaymentMethod
  createdAt: string
  notes: string | null
  discountAmount: number
  shortUrl: string
  isPreorder: boolean
  deliveryDate: string | null
}) {
  const itemLines = params.items
    .map(item => {
      const variantPart = item.variant_name ? ` (${item.variant_name})` : ''
      return `• ${item.quantity}× ${item.name}${variantPart} — ${(item.price * item.quantity).toLocaleString('fr-SN')} FCFA`
    })
    .join('\n')

  const promoLine = params.discountAmount > 0
    ? `\nRéduction : −${params.discountAmount.toLocaleString('fr-SN')} FCFA`
    : ''

  const noteLine = params.notes ? `\nNote : ${params.notes}` : ''
  const addressLine = params.customerAddress ? `\nAdresse : ${params.customerAddress}` : ''

  const header = params.isPreorder
    ? `📅 Précommande ${params.orderNumber} — ${params.restaurantName}`
    : `🍽 Commande ${params.orderNumber} — ${params.restaurantName}`

  const deliveryLine = params.isPreorder && params.deliveryDate
    ? `\nLivraison : ${params.deliveryDate}`
    : ''

  return encodeURIComponent(
    `${header}\n\n` +
    `Client : ${params.customerName}\n` +
    `Tél : ${params.customerPhone}${addressLine}\n\n` +
    `Articles :\n${itemLines}${promoLine}${deliveryLine}\n\n` +
    `Total : ${params.total.toLocaleString('fr-SN')} FCFA\n` +
    `Paiement : ${PAYMENT_LABELS[params.paymentMethod]}\n` +
    `Heure : ${formatOrderTime(params.createdAt)}${noteLine}\n\n` +
    `🔗 Voir la commande :\n${params.shortUrl}`
  )
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      restaurant_id, customer_name, customer_phone, customer_address, items, total,
      notes, promo_code_id, discount_amount,
    } = body

    const payment_method: PaymentMethod = ['cash', 'wave', 'orange_money'].includes(body.payment_method)
      ? body.payment_method
      : 'cash'

    if (!restaurant_id || !customer_phone?.trim() || !items?.length || !total) {
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

    // Normaliser les items en préservant preorder_delivery_date
    const normalizedItems = (items as Array<{
      id: string; name: string; price: number; quantity: number;
      variant_id?: string | null; variant_name?: string | null;
      preorder_delivery_date?: string | null;
    }>).map(i => ({
      id: i.id,
      name: i.name,
      price: i.price,
      quantity: i.quantity,
      variant_id: i.variant_id ?? null,
      variant_name: i.variant_name ?? null,
      preorder_delivery_date: i.preorder_delivery_date ?? null,
    }))

    // Insérer la commande (le trigger SQL génère order_number automatiquement)
    let { data, error } = await adminClient
      .from('orders')
      .insert({
        restaurant_id,
        customer_name: (customer_name || '').trim() || 'Client',
        customer_phone: customer_phone.trim(),
        customer_address: (customer_address || '').trim() || null,
        items: normalizedItems,
        total,
        payment_method,
        notes: notes || null,
        status: 'pending',
        promo_code_id: promo_code_id || null,
        discount_amount: discount_amount || 0,
      })
      .select()
      .single()

    // Fallback si la colonne customer_address n'existe pas encore (migration pas appliquée)
    if (error && error.message.includes('customer_address')) {
      const fallback = await adminClient
        .from('orders')
        .insert({
          restaurant_id,
          customer_name: (customer_name || '').trim() || 'Client',
          customer_phone: customer_phone.trim(),
          items: normalizedItems,
          total,
          payment_method,
          notes: notes || null,
          status: 'pending',
          promo_code_id: promo_code_id || null,
          discount_amount: discount_amount || 0,
        })
        .select()
        .single()
      data = fallback.data
      error = fallback.error
    }

    if (error && error.message.includes('payment_method')) {
      const fallback = await adminClient
        .from('orders')
        .insert({
          restaurant_id,
          customer_name: (customer_name || '').trim() || 'Client',
          customer_phone: customer_phone.trim(),
          items: normalizedItems,
          total,
          notes: notes || null,
          status: 'pending',
          promo_code_id: promo_code_id || null,
          discount_amount: discount_amount || 0,
        })
        .select()
        .single()
      data = fallback.data
      error = fallback.error
    }

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Erreur insertion' }, { status: 500 })
    }

    const orderNumber = (data as { order_number?: string }).order_number || data.id.slice(0, 8).toUpperCase()
    const origin = request.nextUrl.origin

    // Lien court vers la commande
    const shortUrl = `${origin}/c/${orderNumber}`

    // Detect précommande
    const preorderItem = normalizedItems.find(i => i.preorder_delivery_date)
    const isPreorder = !!preorderItem
    const deliveryDate = preorderItem?.preorder_delivery_date ?? null

    const whatsappMessage = buildOwnerMessage({
      restaurantName: restaurant.name,
      orderNumber,
      customerName: data.customer_name || 'Client',
      customerPhone: customer_phone.trim(),
      customerAddress: (data as { customer_address?: string | null }).customer_address || (customer_address || '').trim() || null,
      items: data.items as OrderItem[],
      total: data.total,
      paymentMethod: (data as { payment_method?: PaymentMethod }).payment_method || payment_method,
      createdAt: data.created_at,
      notes: notes || null,
      discountAmount: discount_amount || 0,
      shortUrl,
      isPreorder,
      deliveryDate,
    })

    return NextResponse.json({
      success: true,
      data,
      order_number: orderNumber,
      short_url: shortUrl,
      whatsapp_url: `https://wa.me/${ownerPhone}?text=${whatsappMessage}`,
    })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
