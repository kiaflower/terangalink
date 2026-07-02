'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/Badge'
import { SkeletonRow, EmptyState } from '@/components/ui/Loading'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ShoppingBag, Phone, ChevronDown, MessageCircle, CheckCircle, Package } from 'lucide-react'
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/lib/types'
import type { Order, OrderStatus } from '@/lib/types'

export default function OrdersPage() {
  const supabase = createClient()
  const searchParams = useSearchParams()

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [restaurantName, setRestaurantName] = useState('Restaurant')
  const [waveNumber, setWaveNumber] = useState('')
  const [orangeMoneyNumber, setOrangeMoneyNumber] = useState('')

  const fetchOrders = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('restaurant_id')
      .eq('id', user.id)
      .single()

    if (!profile?.restaurant_id) {
      setLoading(false)
      return
    }

    const [{ data: orderData }, { data: restaurant }] = await Promise.all([
      supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', profile.restaurant_id)
        .order('created_at', { ascending: false }),
      supabase
        .from('restaurants')
        .select('name, phone, wave_number, orange_money_number')
        .eq('id', profile.restaurant_id)
        .single(),
    ])

    setOrders((orderData as Order[]) ?? [])
    setRestaurantName(restaurant?.name || 'Restaurant')
    setWaveNumber(restaurant?.wave_number || restaurant?.phone || '')
    setOrangeMoneyNumber(restaurant?.orange_money_number || restaurant?.phone || '')
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchOrders()

    const channel = supabase
      .channel('orders-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
      }, () => { fetchOrders() })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchOrders, supabase])

  useEffect(() => {
    const targetOrderId = searchParams.get('order')
    if (targetOrderId) setExpandedId(targetOrderId)
  }, [searchParams])

  // Build WhatsApp confirmation URL (pre-filled message for new orders)
  function buildConfirmationUrl(order: Order) {
    const phone = (order.customer_phone || '').replace(/\D/g, '')
    if (!phone) return null

    const items = (order.items as { name: string; quantity: number; price?: number }[])
      .map(i => `• ${i.name} x${i.quantity}`)
      .join('\n')

    const message = encodeURIComponent(
      `Bonjour ${order.customer_name || ''}, votre commande a bien été validée par ${restaurantName}.\n` +
      `Temps de préparation estimé : 25 min.\n` +
      `Paiement Wave : ${waveNumber || 'À confirmer'}\n` +
      `Paiement Orange Money : ${orangeMoneyNumber || 'À confirmer'}\n\n` +
      `${items ? `Résumé :\n${items}\n\n` : ''}` +
      `Merci 🙏`
    )

    return `https://wa.me/${phone}?text=${message}`
  }

  // Build WhatsApp URL to open existing conversation (no pre-filled message)
  function buildCheckPaymentUrl(order: Order) {
    const phone = (order.customer_phone || '').replace(/\D/g, '')
    if (!phone) return null
    return `https://wa.me/${phone}`
  }

  async function updateStatus(orderId: string, status: OrderStatus, extra?: Record<string, unknown>) {
    const payload: Record<string, unknown> = { status, ...extra }
    await supabase.from('orders').update(payload).eq('id', orderId)
    setOrders(prev => prev.map(o =>
      o.id === orderId ? { ...o, status, ...extra } : o
    ))
  }

  async function marquerPaye(orderId: string) {
    await updateStatus(orderId, 'paid', { paid_at: new Date().toISOString() })
  }

  async function marquerLivre(orderId: string) {
    await updateStatus(orderId, 'delivered')
  }

  async function annulerCommande(orderId: string) {
    if (!confirm('Annuler cette commande ?')) return
    await updateStatus(orderId, 'cancelled')
  }

  const pendingCount = orders.filter(o => o.status === 'pending').length

  return (
    <div className="p-6 sm:p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            Commandes
            {pendingCount > 0 && (
              <span className="bg-brand-orange text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {pendingCount} nouvelle{pendingCount > 1 ? 's' : ''}
              </span>
            )}
          </h1>
          <p className="text-gray-500 text-sm mt-1">{orders.length} commande(s) au total</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}</div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="w-7 h-7" />}
          title="Aucune commande"
          description="Les commandes reçues via WhatsApp apparaîtront ici."
        />
      ) : (
        <div className="space-y-3">
          {orders.map(order => {
            const confirmUrl = buildConfirmationUrl(order)
            const checkPaymentUrl = buildCheckPaymentUrl(order)
            const isActive = order.status !== 'delivered' && order.status !== 'cancelled'

            return (
              <div key={order.id} className="bg-surface-50 border border-surface-200 rounded-2xl overflow-hidden">
                <div
                  className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-surface-100 transition-colors"
                  onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white font-semibold text-sm">{order.customer_name || 'Client anonyme'}</p>
                      <Badge variant={ORDER_STATUS_COLORS[order.status] as 'success' | 'warning' | 'info' | 'danger' | 'orange' | 'default'}>
                        {ORDER_STATUS_LABELS[order.status]}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <p className="text-brand-orange text-sm font-bold">{formatCurrency(order.total)}</p>
                      <p className="text-gray-600 text-xs">{formatDate(order.created_at)}</p>
                      {order.customer_phone && (
                        <a
                          href={`tel:${order.customer_phone}`}
                          onClick={e => e.stopPropagation()}
                          className="flex items-center gap-1 text-gray-500 hover:text-white text-xs transition-colors"
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
                  <div className="border-t border-surface-200 px-5 py-4 space-y-4">
                    {/* Items */}
                    <div className="space-y-2">
                      {(order.items as { name: string; quantity: number; price: number }[]).map((item, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-gray-300">{item.name} × {item.quantity}</span>
                          <span className="text-white">{formatCurrency(item.price * item.quantity)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-sm pt-1 border-t border-surface-200">
                        <span className="text-gray-400 font-medium">Total</span>
                        <span className="text-white font-bold">{formatCurrency(order.total)}</span>
                      </div>
                    </div>

                    {order.notes && (
                      <div className="bg-surface-100 rounded-xl p-3 text-sm text-gray-400">
                        <span className="text-gray-500">Note :</span> {order.notes}
                      </div>
                    )}

                    {/* Payment info if paid */}
                    {order.status === 'paid' && order.paid_at && (
                      <div className="flex items-center gap-2 bg-brand-orange/10 border border-brand-orange/20 rounded-xl px-3 py-2">
                        <CheckCircle className="w-4 h-4 text-brand-orange flex-shrink-0" />
                        <span className="text-brand-orange text-xs font-medium">
                          Paiement confirmé le {formatDate(order.paid_at)}
                        </span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-1">

                      {/* ── Vérifier paiement (WhatsApp direct, sans message) ── */}
                      {isActive && checkPaymentUrl && (
                        <a
                          href={checkPaymentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 bg-surface-100 hover:bg-surface-200 border border-surface-300 text-gray-300 text-xs font-medium px-3 py-2 rounded-lg transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
                          Vérifier paiement
                        </a>
                      )}

                      {/* ── Pending : Payé + Annuler ── */}
                      {order.status === 'pending' && (
                        <>
                          <button
                            onClick={() => marquerPaye(order.id)}
                            className="flex items-center gap-1.5 bg-brand-orange hover:bg-brand-orange-dark text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Payé
                          </button>
                          <button
                            onClick={() => annulerCommande(order.id)}
                            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
                          >
                            Annuler
                          </button>
                        </>
                      )}

                      {/* ── Paid : Livré + Annuler ── */}
                      {order.status === 'paid' && (
                        <>
                          <button
                            onClick={() => marquerLivre(order.id)}
                            className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
                          >
                            <Package className="w-3.5 h-3.5" />
                            Livré
                          </button>
                          <button
                            onClick={() => annulerCommande(order.id)}
                            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
                          >
                            Annuler
                          </button>
                        </>
                      )}

                      {/* ── Confirmer au client (message WhatsApp pré-rempli, commandes pending seulement) ── */}
                      {order.status === 'pending' && confirmUrl && (
                        <a
                          href={confirmUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 bg-[#25D366] hover:bg-[#1ebe5d] text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          Confirmer au client
                        </a>
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
