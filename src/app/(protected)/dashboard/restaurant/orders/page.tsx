'use client'

import { Suspense, useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatPrice, formatDate } from '@/lib/utils'
import type { Order } from '@/lib/types'
import { ClipboardList, MessageCircle, Star } from 'lucide-react'
import { ReceiptGenerator } from '@/components/orders/ReceiptGenerator'
import type { PlanKey } from '@/lib/plans'

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'Toutes' },
  { value: 'pending', label: 'En attente' },
  { value: 'confirmed', label: 'Confirmées' },
  { value: 'in_delivery', label: 'En livraison' },
  { value: 'delivered', label: 'Livrées' },
  { value: 'cancelled', label: 'Annulées' },
]

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  in_delivery: 'En livraison',
  delivered: 'Livrée',
  cancelled: 'Annulée',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700',
  confirmed: 'bg-blue-50 text-blue-700',
  in_delivery: 'bg-cyan-50 text-cyan-700',
  delivered: 'bg-green-50 text-green-700',
  cancelled: 'bg-red-50 text-red-700',
}

type RestaurantInfo = {
  name: string
  slug: string
  address: string | null
  phone: string | null
  primary_color: string
  wave_number: string | null
  orange_money_number: string | null
}

type OrderItem = {
  name: string
  quantity: number
  price: number
  variants?: Record<string, string>
  isPreorder?: boolean
  preorderDeliveryDate?: string
}

function waLink(phone: string, message?: string) {
  const digits = phone.replace(/\D/g, '')
  return message ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}` : `https://wa.me/${digits}`
}

function OrdersPageInner() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const [orders, setOrders] = useState<Order[]>([])
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [restaurantInfo, setRestaurantInfo] = useState<RestaurantInfo | null>(null)
  const [selected, setSelected] = useState<Order | null>(null)
  const [hasReview, setHasReview] = useState<boolean | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [newOrdersMsg, setNewOrdersMsg] = useState<string | null>(null)
  const knownOrderIds = useRef<Set<string> | null>(null)
  const preselectedId = searchParams.get('id')
  const didPreselect = useRef(false)
  const [plan, setPlan] = useState<PlanKey>('starter')

  const load = useCallback(async (bid: string, notifyNew = false) => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('restaurant_id', bid)
      .order('created_at', { ascending: false })
      .limit(50)
    const fresh = data ?? []
    if (notifyNew && knownOrderIds.current) {
      const newCount = fresh.filter(o => !knownOrderIds.current!.has(o.id)).length
      if (newCount > 0) {
        setNewOrdersMsg(`${newCount} nouvelle${newCount > 1 ? 's' : ''} commande${newCount > 1 ? 's' : ''} reçue${newCount > 1 ? 's' : ''} !`)
        setTimeout(() => setNewOrdersMsg(null), 6000)
      }
    }
    knownOrderIds.current = new Set(fresh.map(o => o.id))
    setOrders(fresh)
  }, [supabase])

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(async d => {
      if (d.restaurant_id) {
        setRestaurantId(d.restaurant_id)
        load(d.restaurant_id)
        const { data: restaurant } = await supabase
          .from('restaurants')
          .select('name, slug, address, phone, primary_color, wave_number, orange_money_number')
          .eq('id', d.restaurant_id)
          .single()
        if (restaurant) setRestaurantInfo(restaurant)
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('plan')
          .eq('restaurant_id', d.restaurant_id)
          .single()
        if (subscription?.plan) setPlan(subscription.plan as PlanKey)
      }
    })
  }, [load, supabase])

  // Auto-open the order referenced by ?id= (e.g. from the client's WhatsApp message link)
  useEffect(() => {
    if (preselectedId && orders.length > 0 && !didPreselect.current) {
      const order = orders.find(o => o.id === preselectedId)
      if (order) {
        setSelected(order)
        didPreselect.current = true
      }
    }
  }, [preselectedId, orders])

  // Fetch whether a review already exists for the selected order
  useEffect(() => {
    if (!selected) { setHasReview(null); return }
    setHasReview(null)
    fetch(`/api/reviews?order_id=${selected.id}`)
      .then(r => r.json())
      .then(d => setHasReview(!!d.data))
      .catch(() => setHasReview(null))
  }, [selected])

  // Poll for new orders every 30s
  useEffect(() => {
    if (!restaurantId) return
    const interval = setInterval(() => load(restaurantId, true), 30000)
    return () => clearInterval(interval)
  }, [restaurantId, load])

  function trackingUrl(order: Order): string {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://teranga-link.com'
    return `${origin}/c/${restaurantInfo?.slug}/${order.order_number}`
  }

  async function updateStatus(orderId: string, status: string) {
    setUpdatingStatus(true)
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok && restaurantId) await load(restaurantId)
    if (selected?.id === orderId) setSelected(prev => prev ? { ...prev, status: status as Order['status'] } : null)
    setUpdatingStatus(false)
  }

  async function confirmOrder(order: Order) {
    // Ouvrir l'onglet tout de suite (synchrone, dans le geste utilisateur) pour éviter
    // que le navigateur bloque le popup après les await ci-dessous.
    const waWindow = order.customer_phone ? window.open('', '_blank') : null
    await updateStatus(order.id, 'confirmed')
    if (!order.customer_phone || !restaurantInfo) return
    const orderItems = (order.items as OrderItem[]) ?? []
    const hasPreorder = orderItems.some(i => i.isPreorder)
    const deliveryDates = Array.from(new Set(orderItems.filter(i => i.isPreorder && i.preorderDeliveryDate).map(i => i.preorderDeliveryDate as string)))
    const hasWave = !!restaurantInfo.wave_number
    const hasOrangeMoney = !!restaurantInfo.orange_money_number
    const showPaymentInfo = hasPreorder || (order.payment_method !== 'Cash' && (hasWave || hasOrangeMoney))
    const lines = [
      `Bonjour ${order.customer_name},`,
      hasPreorder
        ? `Votre précommande ${order.order_number} chez ${restaurantInfo.name} a été confirmée !`
        : `Votre commande ${order.order_number} chez ${restaurantInfo.name} a été confirmée !`,
    ]
    if (hasPreorder) {
      lines.push('', '📦 Ceci est une PRÉCOMMANDE.')
      if (deliveryDates.length > 0) lines.push(`Date de livraison prévue : ${deliveryDates.join(', ')}`)
    }
    lines.push('', `Montant total : ${formatPrice(order.total)}`)
    if (showPaymentInfo) {
      lines.push('', `Pour finaliser votre ${hasPreorder ? 'précommande' : 'commande'}, merci d'effectuer le paiement :`)
      if (hasWave) lines.push(`Wave : ${restaurantInfo.wave_number}`)
      if (hasOrangeMoney) lines.push(`Orange Money : ${restaurantInfo.orange_money_number}`)
      lines.push('', `Une fois le paiement effectué, envoyez-nous la capture d'écran de votre transfert pour valider ${hasPreorder ? 'la précommande' : 'le paiement'}.`)
    }
    lines.push('', 'Suivez votre commande ici :', trackingUrl(order))
    const waUrl = waLink(order.customer_phone, lines.join('\n'))
    if (waWindow) waWindow.location.href = waUrl
    else window.open(waUrl, '_blank')
  }

  async function markPaymentReceived(order: Order) {
    const waWindow = order.customer_phone ? window.open('', '_blank') : null
    await updateStatus(order.id, 'in_delivery')
    if (!order.customer_phone) return
    const message = [
      `Bonjour ${order.customer_name}, nous avons bien reçu votre paiement pour la commande ${order.order_number}.`,
      'Votre commande est maintenant en cours de livraison.',
      `Suivez votre commande ici : ${trackingUrl(order)}`,
    ].join('\n')
    const waUrl = waLink(order.customer_phone, message)
    if (waWindow) waWindow.location.href = waUrl
    else window.open(waUrl, '_blank')
  }

  function requestReview(order: Order) {
    if (!order.customer_phone || !restaurantInfo) return
    const message = [
      `Bonjour ${order.customer_name}, votre commande ${order.order_number} a bien été livrée.`,
      `Nous espérons que vous êtes satisfait(e) de votre achat chez ${restaurantInfo.name}.`,
      `Laissez-nous un avis ici : ${trackingUrl(order)}`,
    ].join('\n')
    window.open(waLink(order.customer_phone, message), '_blank')
  }

  const filteredOrders = statusFilter === 'all' ? orders : orders.filter(o => o.status === statusFilter)

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Commandes</h1>

      {newOrdersMsg && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-sm font-medium px-4 py-3 rounded-xl">
          {newOrdersMsg}
        </div>
      )}

      <div className="flex gap-2 flex-wrap mb-6">
        {STATUS_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              statusFilter === f.value ? 'bg-brand-orange text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {f.label} {f.value !== 'all' ? `(${orders.filter(o => o.status === f.value).length})` : `(${orders.length})`}
          </button>
        ))}
      </div>

      {filteredOrders.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <ClipboardList className="w-10 h-10 mx-auto mb-4 text-gray-300" />
          <p>Aucune commande {statusFilter !== 'all' ? 'dans ce statut' : 'reçue pour le moment'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map(order => (
            <div
              key={order.id}
              onClick={() => setSelected(order)}
              className="bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:border-brand-orange/30 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-900 font-medium text-sm">{order.order_number}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{order.customer_name} · {formatDate(order.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className="text-brand-orange font-bold text-sm">{formatPrice(order.total)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${STATUS_COLORS[order.status]}`}>
                    {STATUS_LABELS[order.status]}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Order detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">{selected.order_number}</h2>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-700 text-xl">×</button>
            </div>
            {restaurantInfo && (
              <div className="flex flex-wrap gap-2 mb-4">
                <ReceiptGenerator order={selected} restaurant={restaurantInfo} plan={plan} />
              </div>
            )}
            <div className="space-y-2 mb-6">
              <p className="text-sm text-gray-400">Client : <span className="text-gray-900">{selected.customer_name}</span></p>
              <p className="text-sm text-gray-400">Téléphone : <span className="text-gray-900">{selected.customer_phone}</span></p>
              {selected.customer_address && <p className="text-sm text-gray-400">Adresse : <span className="text-gray-900">{selected.customer_address}</span></p>}
              <p className="text-sm text-gray-400">Date : <span className="text-gray-900">{formatDate(selected.created_at)}</span></p>
              {selected.notes && <p className="text-sm text-gray-400">Notes : <span className="text-gray-900">{selected.notes}</span></p>}
            </div>
            <div className="border-t border-gray-200 py-4 mb-4">
              <h3 className="text-sm font-medium text-gray-400 mb-3">Plats</h3>
              <div className="space-y-2">
                {((selected.items as OrderItem[]) ?? []).map((item, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">{item.name} ×{item.quantity}</span>
                      <span className="text-gray-900 font-medium">{formatPrice(item.price * item.quantity)}</span>
                    </div>
                    {item.isPreorder && (
                      <p className="text-xs text-amber-600 font-medium mt-0.5">
                        Précommande{item.preorderDeliveryDate ? ` — livraison prévue : ${item.preorderDeliveryDate}` : ''}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              {selected.discount_amount > 0 && (
                <div className="flex justify-between mt-3 text-sm text-green-600">
                  <span>Réduction</span>
                  <span>-{formatPrice(selected.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between mt-4 pt-3 border-t border-gray-200">
                <span className="text-gray-900 font-bold">Total</span>
                <span className="text-brand-orange font-bold">{formatPrice(selected.total)}</span>
              </div>
            </div>

            {/* Status-specific actions */}
            <div className="space-y-2">
              {selected.status === 'pending' && (
                <>
                  <button
                    onClick={() => confirmOrder(selected)}
                    disabled={updatingStatus}
                    className="w-full py-3 rounded-xl font-bold text-sm text-white bg-green-600 hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    Confirmer la commande
                  </button>
                  <button
                    onClick={() => updateStatus(selected.id, 'cancelled')}
                    disabled={updatingStatus}
                    className="w-full py-3 rounded-xl font-bold text-sm text-red-600 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    Annuler
                  </button>
                </>
              )}

              {selected.status === 'confirmed' && (
                <>
                  {selected.customer_phone && (
                    <a
                      href={waLink(selected.customer_phone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-sm text-green-700 bg-green-50 border border-green-200 hover:bg-green-100 transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" /> Vérifier le paiement
                    </a>
                  )}
                  <button
                    onClick={() => markPaymentReceived(selected)}
                    disabled={updatingStatus}
                    className="w-full py-3 rounded-xl font-bold text-sm text-white bg-brand-orange hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    Paiement reçu
                  </button>
                  <button
                    onClick={() => updateStatus(selected.id, 'cancelled')}
                    disabled={updatingStatus}
                    className="w-full py-3 rounded-xl font-bold text-sm text-red-600 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    Annuler
                  </button>
                </>
              )}

              {selected.status === 'in_delivery' && (
                <>
                  <button
                    onClick={() => updateStatus(selected.id, 'delivered')}
                    disabled={updatingStatus}
                    className="w-full py-3 rounded-xl font-bold text-sm text-white bg-cyan-600 hover:bg-cyan-700 transition-colors disabled:opacity-50"
                  >
                    Marquer comme Livré
                  </button>
                  {hasReview === false && (
                    <button
                      onClick={() => requestReview(selected)}
                      className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <Star className="w-4 h-4" /> Demande d&apos;avis
                    </button>
                  )}
                </>
              )}

              {selected.status === 'delivered' && (
                hasReview === false ? (
                  <button
                    onClick={() => requestReview(selected)}
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <Star className="w-4 h-4" /> Demande d&apos;avis
                  </button>
                ) : hasReview === true ? (
                  <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-sm text-gray-700">
                    Le client a laissé un avis sur cette commande.
                  </div>
                ) : null
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function OrdersPage() {
  return (
    <Suspense fallback={null}>
      <OrdersPageInner />
    </Suspense>
  )
}
