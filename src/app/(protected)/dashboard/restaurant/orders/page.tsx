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

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: 'preparing',
  preparing: 'ready',
  ready: 'delivered',
}

const NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
  pending: 'Accepter / Préparer',
  preparing: 'Marquer comme prêt',
  ready: 'Marquer comme livré',
}

export default function OrdersPage() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<OrderStatus | 'all'>('all')
  const [restaurantName, setRestaurantName] = useState('Restaurant')

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
        .select('name')
        .eq('id', profile.restaurant_id)
        .single(),
    ])

    setOrders((orderData as Order[]) ?? [])
    setRestaurantName(restaurant?.name || 'Restaurant')
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

  function buildCustomerConfirmation(order: Order) {
    const phone = (order.customer_phone || '').replace(/\D/g, '')
    if (!phone) return null

    const itemsLines = (order.items as { name: string; quantity: number }[])
      .map(i => `• ${i.name} x${i.quantity}`)
      .join('\n')

    const message = encodeURIComponent(
      `Bonjour ${order.customer_name || ''}, votre commande a bien été acceptée par ${restaurantName}.\n` +
      `Temps de préparation estimé : 25 min.\n` +
      `Paiement Wave : XXXXXXXX\n` +
      `Paiement Orange Money : XXXXXXXX\n\n` +
      `Résumé:\n${itemsLines}\n\nMerci 🙏`
    )

    return `https://wa.me/${phone}?text=${message}`
  }

  async function updateStatus(orderId: string, status: OrderStatus) {
    await supabase.from('orders').update({ status }).eq('id', orderId)
    setOrders(prev => prev.map(o => (o.id === orderId ? { ...o, status } : o)))

    // On accept/preparing: open customer confirmation WhatsApp
    if (status === 'preparing') {
      const target = orders.find(o => o.id === orderId)
      const url = target ? buildCustomerConfirmation(target) : null
      if (url) {
        const w = window.open(url, '_blank')
        if (!w) window.location.href = url
      }
    }
  }

  async function cancelOrder(orderId: string) {
    if (!confirm('Annuler cette commande ?')) return
    await updateStatus(orderId, 'cancelled')
  }

  const filtered = filterStatus === 'all'
    ? orders
    : orders.filter(o => o.status === filterStatus)

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

      <div className="flex gap-2 overflow-x-auto mb-6 pb-1" style={{ scrollbarWidth: 'none' }}>
        {([['all', 'Toutes'], ['pending', 'En attente'], ['preparing', 'En préparation'], ['ready', 'Prêtes'], ['delivered', 'Livrées']] as const).map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilterStatus(val)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              filterStatus === val
                ? 'bg-brand-orange text-white'
                : 'bg-surface-100 text-gray-400 hover:text-white'
            }`}
          >
            {label}
            {val !== 'all' && (
              <span className="ml-1.5 text-xs opacity-70">
                ({orders.filter(o => o.status === val).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="w-7 h-7" />}
          title="Aucune commande"
          description="Les commandes reçues via WhatsApp apparaîtront ici."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map(order => {
            const confirmUrl = buildCustomerConfirmation(order)
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
                          <span className="text-gray-300">{item.quantity}× {item.name}</span>
                          <span className="text-white font-medium">{formatCurrency(item.price * item.quantity)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-sm font-bold border-t border-surface-200 pt-2">
                        <span className="text-white">Total</span>
                        <span className="text-brand-orange">{formatCurrency(order.total)}</span>
                      </div>
                    </div>

                    {order.notes && (
                      <div className="bg-surface-100 rounded-xl px-4 py-3">
                        <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Note</p>
                        <p className="text-gray-300 text-sm">{order.notes}</p>
                      </div>
                    )}

                    <div className="flex gap-2 flex-wrap">
                      {NEXT_STATUS[order.status] && (
                        <button
                          onClick={() => updateStatus(order.id, NEXT_STATUS[order.status]!)}
                          className="flex-1 bg-brand-orange hover:bg-brand-orange-dark text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
                        >
                          {NEXT_LABEL[order.status]}
                        </button>
                      )}

                      {confirmUrl && (
                        <button
                          onClick={() => {
                            const w = window.open(confirmUrl, '_blank')
                            if (!w) window.location.href = confirmUrl
                          }}
                          className="px-4 py-2.5 bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#25D366] text-sm font-semibold rounded-xl transition-colors inline-flex items-center gap-1.5"
                        >
                          <MessageCircle className="w-4 h-4" />
                          Confirmer via WhatsApp
                        </button>
                      )}

                      {order.status !== 'cancelled' && order.status !== 'delivered' && (
                        <button
                          onClick={() => cancelOrder(order.id)}
                          className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-semibold rounded-xl transition-colors"
                        >
                          Annuler
                        </button>
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