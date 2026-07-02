'use client'

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/Badge'
import { SkeletonRow, EmptyState } from '@/components/ui/Loading'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  ShoppingBag, Phone, ChevronDown, MessageCircle,
  Search, CheckCircle2, XCircle, AlertTriangle, RefreshCw, Calendar, Star, Banknote
} from 'lucide-react'
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/lib/types'
import type { Order, OrderStatus } from '@/lib/types'
import { ReceiptGenerator } from '@/components/orders/ReceiptGenerator'
import { canUseFeature, normalizePlan } from '@/lib/plans'

type OrderItemRaw = {
  name: string
  quantity: number
  price: number
  variant_name?: string
  preorder_delivery_date?: string | null
}

function getDeliveryDate(order: Order): string | null {
  const items = order.items as OrderItemRaw[]
  return items.find(i => i.preorder_delivery_date)?.preorder_delivery_date ?? null
}

function OrdersInner() {
  const supabase = createClient()
  const searchParams = useSearchParams()

  const [orders, setOrders] = useState<Order[]>([])
  const [reviewedOrderIds, setReviewedOrderIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [restaurantSlug, setRestaurantSlug] = useState('')
  const [restaurantName, setRestaurantName] = useState('Restaurant')
  const [restaurantPhone, setRestaurantPhone] = useState('')
  const [restaurantAddress, setRestaurantAddress] = useState('')
  const [restaurantAccent, setRestaurantAccent] = useState('#F97316')
  const [waveNumber, setWaveNumber] = useState('')
  const [orangeMoneyNumber, setOrangeMoneyNumber] = useState('')
  const [isPro, setIsPro] = useState(false)
  const [search, setSearch] = useState('')
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)
  const [markingPaid, setMarkingPaid] = useState<string | null>(null)

  const fetchOrders = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('restaurant_id')
      .eq('id', user.id)
      .single()

    let rid = profile?.restaurant_id ?? null
    if (!rid) {
      const m = document.cookie.match(/(?:^|;\s*)sa_impersonate=([^;]*)/)
      if (m) { try { const imp = JSON.parse(decodeURIComponent(m[1])); if (imp.expiresAt > Date.now()) rid = imp.restaurantId } catch { /* */ } }
    }
    if (!rid) { setLoading(false); return }

    const [ordersResult, restaurantResult, subscriptionResult] = await Promise.all([
      supabase.from('orders').select('*').eq('restaurant_id', rid).order('created_at', { ascending: false }),
      supabase.from('restaurants').select('name, slug, phone, wave_number, orange_money_number, address, city, button_color, primary_color').eq('id', rid).single(),
      supabase.from('subscriptions').select('plan').eq('restaurant_id', rid).single(),
    ])

    if (ordersResult.error) {
      console.error('fetch orders error:', ordersResult.error)
    } else {
      const clean = ((ordersResult.data as Order[]) ?? []).filter(o => o.id && !o.id.includes('__'))
      setOrders(clean)

      // Charger les avis existants pour les commandes livrées
      const deliveredIds = clean
        .filter(o => o.status === 'delivered')
        .map(o => o.id)

      if (deliveredIds.length > 0) {
        const { data: reviews } = await supabase
          .from('reviews')
          .select('order_id')
          .in('order_id', deliveredIds)
        if (reviews) {
          setReviewedOrderIds(new Set(reviews.map(r => r.order_id as string)))
        }
      }
    }

    const restaurant = restaurantResult.data
    setRestaurantName(restaurant?.name || 'Restaurant')
    setRestaurantSlug(restaurant?.slug || '')
    setRestaurantPhone(restaurant?.phone || '')
    setRestaurantAddress([restaurant?.address, restaurant?.city].filter(Boolean).join(', '))
    setRestaurantAccent(restaurant?.button_color || restaurant?.primary_color || '#F97316')
    setWaveNumber(restaurant?.wave_number || restaurant?.phone || '')
    setOrangeMoneyNumber(restaurant?.orange_money_number || restaurant?.phone || '')

    const plan = normalizePlan((subscriptionResult.data as { plan?: string } | null)?.plan || 'starter')
    setIsPro(canUseFeature(plan, 'suppressionBranding'))
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  useEffect(() => {
    const interval = setInterval(() => fetchOrders(), 15000)
    return () => clearInterval(interval)
  }, [fetchOrders])

  useEffect(() => {
    const targetOrderId = searchParams.get('order')
    if (targetOrderId) setExpandedId(targetOrderId)
  }, [searchParams])

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return orders
    return orders.filter(o =>
      ((o as unknown as { order_number?: string }).order_number || '').toLowerCase().includes(q) ||
      (o.customer_name || '').toLowerCase().includes(q) ||
      (o.customer_phone || '').toLowerCase().includes(q)
    )
  }, [orders, search])

  async function updateStatus(order: Order, newStatus: OrderStatus) {
    setUpdateError(null)
    setUpdating(order.id)

    const res = await fetch(`/api/orders/${order.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })

    setUpdating(null)

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}))
      setUpdateError(
        `Impossible de mettre à jour ${(order as unknown as { order_number?: string }).order_number || ''} : ${payload?.error || `Erreur ${res.status}`}`
      )
      return false
    }

    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: newStatus } : o))
    setTimeout(() => fetchOrders(), 1500)
    return true
  }

  function buildConfirmWhatsApp(order: Order) {
    const phone = (order.customer_phone || '').replace(/\D/g, '')
    if (!phone) return null

    const orderItems = order.items as OrderItemRaw[]
    const itemLines = orderItems.map(i => `• ${i.name} x${i.quantity}`).join('\n')
    const orderNum = (order as unknown as { order_number?: string }).order_number
    const numStr = orderNum ? ` (${orderNum})` : ''
    const deliveryDate = getDeliveryDate(order)
    const isPreorder = !!deliveryDate

    let messageText: string
    if (isPreorder) {
      messageText =
        `Bonjour ${order.customer_name || ''}${numStr}, votre précommande a bien été enregistrée par ${restaurantName} ! 🎉\n\n` +
        `📅 Date de livraison : ${deliveryDate}\n\n` +
        `${itemLines ? `Résumé :\n${itemLines}\n\n` : ''}` +
        `💳 Pour confirmer votre précommande, veuillez effectuer le paiement :\n` +
        `• Wave : ${waveNumber || 'À confirmer'}\n` +
        `• Orange Money : ${orangeMoneyNumber || 'À confirmer'}\n\n` +
        `Envoyez-nous une capture de votre paiement pour valider définitivement votre commande. Merci ! 🙏`
    } else {
      messageText =
        `Bonjour ${order.customer_name || ''}${numStr}, votre commande a bien été validée par ${restaurantName}.\n` +
        `Temps de préparation estimé : 25 min.\n` +
        `Paiement Wave : ${waveNumber || 'À confirmer'}\n` +
        `Paiement Orange Money : ${orangeMoneyNumber || 'À confirmer'}\n\n` +
        `${itemLines ? `Résumé :\n${itemLines}\n\n` : ''}` +
        `Merci 🙏`
    }

    return `https://wa.me/${phone}?text=${encodeURIComponent(messageText)}`
  }

  function buildReviewWhatsApp(order: Order) {
    const phone = (order.customer_phone || '').replace(/\D/g, '')
    if (!phone) return null

    const orderNum = (order as unknown as { order_number?: string }).order_number
    const numStr = orderNum ? ` (${orderNum})` : ''
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const trackingUrl = orderNum && restaurantSlug
      ? `${origin}/c/${restaurantSlug}/${orderNum}`
      : ''

    const messageText =
      `Bonjour ${order.customer_name || ''}${numStr} ! 😊\n\n` +
      `Nous espérons que vous avez apprécié votre commande chez ${restaurantName}.\n\n` +
      `Votre avis nous aide à nous améliorer — cela prend moins d'une minute :\n` +
      `${trackingUrl}\n\n` +
      `Merci pour votre confiance ! 🙏`

    return `https://wa.me/${phone}?text=${encodeURIComponent(messageText)}`
  }

  async function confirmerCommande(order: Order) {
    const url = buildConfirmWhatsApp(order)
    if (url) window.open(url, '_blank')
    await updateStatus(order, 'confirmed')
  }

  async function marquerPayee(order: Order) {
    setMarkingPaid(order.id)
    const res = await fetch(`/api/orders/${order.id}/paid`, { method: 'PATCH' })
    setMarkingPaid(null)
    if (res.ok) {
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, is_paid: true } : o))
    }
  }

  async function marquerLivree(order: Order) {
    await updateStatus(order, 'delivered')
  }

  function buildCheckPaymentWhatsApp(order: Order) {
    const phone = (order.customer_phone || '').replace(/\D/g, '')
    if (!phone) return null
    return `https://wa.me/${phone}`
  }

  async function annulerCommande(order: Order) {
    if (!confirm('Annuler cette commande ?')) return
    const phone = (order.customer_phone || '').replace(/\D/g, '')
    if (phone) {
      const orderNum = (order as unknown as { order_number?: string }).order_number
      const numStr = orderNum ? ` (${orderNum})` : ''
      const message = encodeURIComponent(
        `Bonjour ${order.customer_name || ''}${numStr}, nous sommes désolés mais votre commande a été annulée par ${restaurantName}.\n\nN'hésitez pas à nous recontacter. 🙏`
      )
      window.open(`https://wa.me/${phone}?text=${message}`, '_blank')
    }
    await updateStatus(order, 'cancelled')
  }

  const pendingCount = orders.filter(o => o.status === 'pending').length

  return (
    <div className="p-6 sm:p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            Commandes
            {pendingCount > 0 && (
              <span className="bg-brand-orange text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {pendingCount} nouvelle{pendingCount > 1 ? 's' : ''}
              </span>
            )}
          </h1>
          <p className="text-gray-500 text-sm mt-1">{orders.length} commande(s) au total</p>
        </div>
        <button
          onClick={() => fetchOrders()}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Actualiser
        </button>
      </div>

      {updateError && (
        <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 text-sm font-semibold">Erreur</p>
            <p className="text-red-300 text-xs mt-0.5">{updateError}</p>
          </div>
          <button onClick={() => setUpdateError(null)} className="ml-auto text-red-400 hover:text-red-300 text-xs">✕</button>
        </div>
      )}

      <div className="relative mb-5">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher par numéro, nom ou téléphone..."
          className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-orange/40"
        />
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}</div>
      ) : filteredOrders.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="w-7 h-7" />}
          title={search ? 'Aucun résultat' : 'Aucune commande'}
          description={search ? `Aucune commande correspondant à "${search}"` : 'Les commandes reçues apparaîtront ici.'}
        />
      ) : (
        <div className="space-y-3">
          {filteredOrders.map(order => {
            const orderNum = (order as unknown as { order_number?: string }).order_number
            const discountAmt = (order as unknown as { discount_amount?: number }).discount_amount
            const status = order.status
            const annulee = status === 'cancelled' || status === 'delivery_cancelled'
            const isDelivered = status === 'delivered'
            const isPending = status === 'pending'
            const isConfirmed = status === 'confirmed' || status === 'preparing' || status === 'ready'
            const isUpdating = updating === order.id
            const isMarkingPaid = markingPaid === order.id
            const deliveryDate = getDeliveryDate(order)
            const isPreorder = !!deliveryDate
            const isPaid = order.is_paid
            const hasReview = reviewedOrderIds.has(order.id)

            return (
              <div key={order.id} className="bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden">
                <div
                  className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-gray-900 font-semibold text-sm">{order.customer_name || 'Client anonyme'}</p>

                      {isPreorder && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: 'rgba(99,102,241,0.15)', color: '#A5B4FC' }}>
                          <Calendar className="w-3 h-3" />
                          Précommande
                        </span>
                      )}

                      {orderNum && (
                        <span className="text-xs font-mono text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded-full">
                          {orderNum}
                        </span>
                      )}
                      <Badge variant={ORDER_STATUS_COLORS[order.status] as 'success' | 'warning' | 'info' | 'danger' | 'default'}>
                        {ORDER_STATUS_LABELS[order.status] ?? order.status}
                      </Badge>

                      {isPaid && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: 'rgba(34,197,94,0.12)', color: '#4ADE80' }}>
                          <Banknote className="w-3 h-3" />
                          Payé
                        </span>
                      )}
                      {isDelivered && hasReview && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: 'rgba(234,179,8,0.12)', color: '#FCD34D' }}>
                          <Star className="w-3 h-3" />
                          Avis reçu
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <p className="text-brand-orange text-sm font-bold">{formatCurrency(order.total)}</p>
                      {isPreorder && deliveryDate && (
                        <p className="text-xs font-semibold" style={{ color: '#818CF8' }}>
                          📅 {deliveryDate}
                        </p>
                      )}
                      <p className="text-gray-500 text-xs">{formatDate(order.created_at)}</p>
                      {order.customer_phone && (
                        <a
                          href={`tel:${order.customer_phone}`}
                          onClick={e => e.stopPropagation()}
                          className="flex items-center gap-1 text-gray-500 hover:text-gray-900 text-xs transition-colors"
                        >
                          <Phone className="w-3 h-3" />
                          {order.customer_phone}
                        </a>
                      )}
                    </div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform flex-shrink-0 ${expandedId === order.id ? 'rotate-180' : ''}`} />
                </div>

                {expandedId === order.id && (
                  <div className="border-t border-gray-200 px-5 py-4 space-y-4">

                    {/* Bandeau précommande */}
                    {isPreorder && (
                      <div className="rounded-xl px-4 py-3"
                        style={{ backgroundColor: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)' }}>
                        <p className="text-xs font-bold" style={{ color: '#A5B4FC' }}>Précommande</p>
                        {deliveryDate && (
                          <p className="text-xs mt-0.5" style={{ color: '#818CF8' }}>
                            Livraison : <span className="font-semibold text-gray-900">{deliveryDate}</span>
                          </p>
                        )}
                      </div>
                    )}

                    {/* Articles */}
                    <div className="space-y-2">
                      {(order.items as OrderItemRaw[]).map((item, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-gray-500">
                            {item.name}{item.variant_name ? ` (${item.variant_name})` : ''} × {item.quantity}
                          </span>
                          <span className="text-gray-900">{formatCurrency(item.price * item.quantity)}</span>
                        </div>
                      ))}
                    </div>

                    {discountAmt ? (
                      <div className="flex justify-between text-sm text-green-400">
                        <span>Réduction</span>
                        <span>−{formatCurrency(discountAmt)}</span>
                      </div>
                    ) : null}

                    {order.notes && (
                      <div className="bg-gray-100 rounded-xl p-3 text-sm text-gray-500">
                        <span className="text-gray-500">Note:</span> {order.notes}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-1">
                      {isPending && (
                        <>
                          <button
                            onClick={() => confirmerCommande(order)}
                            disabled={isUpdating}
                            className="inline-flex items-center gap-1.5 bg-[#25D366] hover:bg-[#1ebe5d] text-gray-900 text-xs font-semibold px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            {isUpdating ? 'En cours...' : isPreorder ? 'Envoyer demande de paiement' : 'Confirmer au client'}
                          </button>
                          <button
                            onClick={() => annulerCommande(order)}
                            disabled={isUpdating}
                            className="bg-red-500 hover:bg-red-600 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                          >
                            Annuler
                          </button>
                        </>
                      )}

                      {isConfirmed && (
                        <>
                          {/* Vérifier paiement — ouvre la conversation WhatsApp */}
                          {order.customer_phone && (
                            <a
                              href={buildCheckPaymentWhatsApp(order) ?? '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
                              style={{ backgroundColor: 'rgba(37,211,102,0.1)', color: '#25D366', border: '1px solid rgba(37,211,102,0.3)' }}
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              Vérifier paiement
                            </a>
                          )}

                          {/* Bouton Payé */}
                          {!isPaid ? (
                            <button
                              onClick={() => marquerPayee(order)}
                              disabled={isMarkingPaid}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                              style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: '#16A34A', border: '1px solid rgba(34,197,94,0.3)' }}
                            >
                              <Banknote className="w-3.5 h-3.5" />
                              {isMarkingPaid ? 'En cours...' : 'Payé'}
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg"
                              style={{ backgroundColor: 'rgba(34,197,94,0.08)', color: '#4ADE80' }}>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Paiement reçu
                            </span>
                          )}

                          {isPaid && (
                            <button
                              onClick={() => marquerLivree(order)}
                              disabled={isUpdating}
                              className="inline-flex items-center gap-1.5 bg-brand-orange hover:bg-brand-orange/90 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {isUpdating ? 'En cours...' : 'Livré'}
                            </button>
                          )}
                          <button
                            onClick={() => annulerCommande(order)}
                            disabled={isUpdating}
                            className="inline-flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Annuler
                          </button>
                        </>
                      )}

                      {/* Bouton demande d'avis — uniquement livrées sans avis */}
                      {isDelivered && !hasReview && order.customer_phone && (
                        <button
                          onClick={() => {
                            const url = buildReviewWhatsApp(order)
                            if (url) window.open(url, '_blank')
                          }}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
                          style={{ backgroundColor: 'rgba(234,179,8,0.12)', color: '#FCD34D', border: '1px solid rgba(234,179,8,0.25)' }}
                        >
                          <Star className="w-3.5 h-3.5" />
                          Demander un avis
                        </button>
                      )}

                      {isPro && !annulee && (
                        <ReceiptGenerator
                          order={order}
                          restaurantName={restaurantName}
                          restaurantPhone={restaurantPhone}
                          restaurantAddress={restaurantAddress}
                          accentColor={restaurantAccent}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-500 text-sm">Chargement...</div>}>
      <OrdersInner />
    </Suspense>
  )
}
