'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/Badge'
import { SkeletonRow, EmptyState } from '@/components/ui/Loading'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ShoppingBag, Phone, ChevronDown, MessageCircle } from 'lucide-react'
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/lib/types'
import type { Order, OrderStatus } from '@/lib/types'
import { ReceiptGenerator } from '@/components/orders/ReceiptGenerator'
import { canUseFeature, normalizePlan } from '@/lib/plans'

export default function OrdersPage() {
  const supabase = createClient()
  const searchParams = useSearchParams()

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [restaurantName, setRestaurantName] = useState('Restaurant')
  const [restaurantPhone, setRestaurantPhone] = useState('')
  const [restaurantAddress, setRestaurantAddress] = useState('')
  const [restaurantAccent, setRestaurantAccent] = useState('#F97316')
  const [waveNumber, setWaveNumber] = useState('')
  const [orangeMoneyNumber, setOrangeMoneyNumber] = useState('')
  const [isPro, setIsPro] = useState(false)

  const fetchOrders = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('restaurant_id')
      .eq('id', user.id)
      .single()

    if (!profile?.restaurant_id) { setLoading(false); return }

    const [{ data: orderData }, { data: restaurant }, { data: subscription }] = await Promise.all([
      supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', profile.restaurant_id)
        .order('created_at', { ascending: false }),
      supabase
        .from('restaurants')
        .select('name, phone, wave_number, orange_money_number, address, city, button_color, primary_color')
        .eq('id', profile.restaurant_id)
        .single(),
      supabase
        .from('subscriptions')
        .select('plan')
        .eq('restaurant_id', profile.restaurant_id)
        .single(),
    ])

    setOrders((orderData as Order[]) ?? [])
    setRestaurantName(restaurant?.name || 'Restaurant')
    setRestaurantPhone(restaurant?.phone || '')
    setRestaurantAddress([restaurant?.address, restaurant?.city].filter(Boolean).join(', '))
    setRestaurantAccent(restaurant?.button_color || restaurant?.primary_color || '#F97316')
    setWaveNumber(restaurant?.wave_number || restaurant?.phone || '')
    setOrangeMoneyNumber(restaurant?.orange_money_number || restaurant?.phone || '')

    const plan = normalizePlan((subscription as { plan?: string } | null)?.plan || 'starter')
    setIsPro(canUseFeature(plan, 'suppressionBranding')) // suppressionBranding = Pro only

    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchOrders()
    const channel = supabase
      .channel('orders-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchOrders())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchOrders, supabase])

  useEffect(() => {
    const targetOrderId = searchParams.get('order')
    if (targetOrderId) setExpandedId(targetOrderId)
  }, [searchParams])

  function buildConfirmUrl(order: Order) {
    const phone = (order.customer_phone || '').replace(/\D/g, '')
    if (!phone) return null

    const items = (order.items as { name: string; quantity: number }[])
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

  // Confirmer au client = ouvrir WhatsApp + valider la commande en même temps
  async function handleConfirmAndOpen(order: Order) {
    const url = buildConfirmUrl(order)

    // Valider en DB
    await supabase.from('orders').update({ status: 'delivered' }).eq('id', order.id)
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'delivered' as OrderStatus } : o))

    // Ouvrir WhatsApp si numéro client dispo
    if (url) window.open(url, '_blank')
  }

  async function annulerCommande(orderId: string) {
    if (!confirm('Annuler cette commande ?')) return
    await supabase.from('orders').update({ status: 'cancelled' }).eq('id', orderId)
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'cancelled' as OrderStatus } : o))
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
            const dejaValidee = order.status === 'delivered'
            const annulee = order.status === 'cancelled'

            return (
              <div key={order.id} className="bg-surface-50 border border-surface-200 rounded-2xl overflow-hidden">
                <div
                  className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-surface-100 transition-colors"
                  onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white font-semibold text-sm">{order.customer_name || 'Client anonyme'}</p>
                      <Badge variant={ORDER_STATUS_COLORS[order.status] as 'success' | 'warning' | 'info' | 'danger' | 'default'}>
                        {ORDER_STATUS_LABELS[order.status]}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
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
                    <div className="space-y-2">
                      {(order.items as { name: string; quantity: number; price: number }[]).map((item, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-gray-300">{item.name} × {item.quantity}</span>
                          <span className="text-white">{formatCurrency(item.price * item.quantity)}</span>
                        </div>
                      ))}
                    </div>

                    {order.notes && (
                      <div className="bg-surface-100 rounded-xl p-3 text-sm text-gray-400">
                        <span className="text-gray-500">Note:</span> {order.notes}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-1">
                      {/* Confirmer au client = valide + ouvre WhatsApp */}
                      {order.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleConfirmAndOpen(order)}
                            className="inline-flex items-center gap-1.5 bg-[#25D366] hover:bg-[#1ebe5d] text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            Confirmer au client
                          </button>
                          <button
                            onClick={() => annulerCommande(order.id)}
                            className="bg-red-500 hover:bg-red-600 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
                          >
                            Annuler
                          </button>
                        </>
                      )}

                      {/* Reçu PDF — Pro uniquement */}
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
