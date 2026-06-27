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
      restaurant_id, customer_name, customer_phone, customer_address,
      items, total, notes, promo_code_id, discount_amount,
    } = body

    const payment_method: PaymentMethod = ['cash', 'wave', 'orange_money'].includes(body.payment_method)
      ? body.payment_method
      : 'cash'

    if (!restaurant_id || !customer_phone?.trim() || !items?.length || !total) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: restaurant, error: restaurantError } = await admin
      .from('restaurants')
      .select('name, slug, phone, whatsapp_number')
      .eq('id', restaurant_id)
      .eq('is_active', true)
      .single()

    if (restaurantError || !restaurant) {
      console.error('[orders POST] restaurant error:', restaurantError)
      return NextResponse.json({ error: 'Restaurant introuvable' }, { status: 404 })
    }

    const ownerPhone = cleanPhone(restaurant.whatsapp_number || restaurant.phone)
    if (!ownerPhone) {
      return NextResponse.json({ error: 'Numéro WhatsApp du restaurant non configuré' }, { status: 400 })
    }

    // Normaliser les items — s'assurer que id est toujours un UUID simple
    const normalizedItems = (items as Array<{
      id: string; name: string; price: number; quantity: number
      variant_id?: string | null; variant_name?: string | null
      preorder_delivery_date?: string | null
    }>).map(i => ({
      id: i.id.includes('__') ? i.id.split('__')[0] : i.id, // sécurité : nettoyer si corrompu
      name: i.name,
      price: i.price,
      quantity: i.quantity,
      variant_id: i.variant_id ?? null,
      variant_name: i.variant_name ?? null,
      preorder_delivery_date: i.preorder_delivery_date ?? null,
    }))

    // Construire le payload d'insertion progressivement
    // pour gérer les colonnes qui n'existent pas encore en BDD
    const basePayload = {
      restaurant_id,
      customer_name: (customer_name || '').trim() || 'Client',
      customer_phone: customer_phone.trim(),
      items: normalizedItems,
      total,
      status: 'pending' as const,
      notes: notes || null,
    }

    // Essai complet avec toutes les colonnes optionnelles
    let { data, error } = await admin
      .from('orders')
      .insert({
        ...basePayload,
        payment_method,
        customer_address: (customer_address || '').trim() || null,
        promo_code_id: promo_code_id || null,
        discount_amount: discount_amount || 0,
      })
      .select()
      .single()

    // Fallbacks progressifs si certaines colonnes manquent en BDD
    if (error) {
      console.error('[orders POST] insert error (full):', error.message)

      if (error.message.includes('promo_code_id') || error.message.includes('discount_amount')) {
        // Sans promo
        const r = await admin.from('orders').insert({
          ...basePayload,
          payment_method,
          customer_address: (customer_address || '').trim() || null,
        }).select().single()
        data = r.data; error = r.error
        if (error) console.error('[orders POST] insert error (no promo):', error.message)
      }

      if (error && error.message.includes('customer_address')) {
        // Sans adresse
        const r = await admin.from('orders').insert({
          ...basePayload,
          payment_method,
        }).select().single()
        data = r.data; error = r.error
        if (error) console.error('[orders POST] insert error (no address):', error.message)
      }

      if (error && error.message.includes('payment_method')) {
        // Sans payment_method
        const r = await admin.from('orders').insert(basePayload).select().single()
        data = r.data; error = r.error
        if (error) console.error('[orders POST] insert error (base):', error.message)
      }
    }

    if (error || !data) {
      console.error('[orders POST] final error:', error)
      return NextResponse.json({ error: error?.message || 'Erreur insertion' }, { status: 500 })
    }

    const orderNumber = (data as { order_number?: string }).order_number || data.id.slice(0, 8).toUpperCase()
    const origin = request.nextUrl.origin
    const shortUrl = `${origin}/c/${restaurant.slug}/${orderNumber}`

    const preorderItem = normalizedItems.find(i => i.preorder_delivery_date)
    const isPreorder = !!preorderItem
    const deliveryDate = preorderItem?.preorder_delivery_date ?? null

    const whatsappMessage = buildOwnerMessage({
      restaurantName: restaurant.name,
      orderNumber,
      customerName: data.customer_name || 'Client',
      customerPhone: customer_phone.trim(),
      customerAddress: (data as { customer_address?: string | null }).customer_address || null,
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
      slug: restaurant.slug,
      whatsapp_url: `https://wa.me/${ownerPhone}?text=${whatsappMessage}`,
    })
  } catch (err) {
    console.error('[orders POST] unexpected error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
