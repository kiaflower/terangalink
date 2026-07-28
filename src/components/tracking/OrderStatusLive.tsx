'use client'

import { useState, useEffect, useRef } from 'react'
import { CheckCircle2, Clock, XCircle, Truck, Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ReviewForm } from './ReviewForm'

interface OrderLive {
  id: string
  status: string
  order_number?: string
  customer_name?: string
}

const STATUS_CONFIG: Record<string, {
  label: string
  icon: React.ElementType
  desc: string
}> = {
  pending: {
    label: 'En attente',
    icon: Clock,
    desc: 'Votre commande est en attente de confirmation par le restaurant.',
  },
  confirmed: {
    label: 'Confirmée',
    icon: CheckCircle2,
    desc: 'Le restaurant a confirmé votre commande. Préparation en cours.',
  },
  in_delivery: {
    label: 'En livraison',
    icon: Truck,
    desc: 'Votre commande est en cours de livraison.',
  },
  delivered: {
    label: 'Livrée',
    icon: CheckCircle2,
    desc: 'Votre commande a été livrée. Merci pour votre confiance !',
  },
  cancelled: {
    label: 'Annulée',
    icon: XCircle,
    desc: "Cette commande a été annulée. Contactez le restaurant pour plus d'informations.",
  },
}

const CANCELLED_COLOR = '#EF4444'
const PROGRESS_STEPS = ['pending', 'confirmed', 'in_delivery', 'delivered']
const PROGRESS_LABELS = ['Reçue', 'Confirmée', 'En livraison', 'Livrée']

interface OrderStatusLiveProps {
  order: OrderLive
  restaurantId: string
  hasReview: boolean
  accentColor?: string
  cardBg?: string
  cardBorder?: string
  pageText?: string
  subtleText?: string
}

export function OrderStatusLive({
  order: initialOrder,
  restaurantId,
  hasReview: initialHasReview,
  accentColor = '#F97316',
  cardBg = '#FFFFFF',
  cardBorder = '#E5E7EB',
  pageText = '#111111',
  subtleText = '#6B7280',
}: OrderStatusLiveProps) {
  const [status, setStatus] = useState(initialOrder.status)
  const [hasReview, setHasReview] = useState(initialHasReview)
  const supabaseRef = useRef(createClient())

  useEffect(() => {
    const supabase = supabaseRef.current
    const orderId = initialOrder.id
    let active = true

    supabase
      .from('orders')
      .select('status')
      .eq('id', orderId)
      .single()
      .then(({ data }: { data: { status?: string } | null }) => {
        if (active && data?.status) setStatus(data.status)
      })

    const pollInterval = setInterval(async () => {
      const { data } = await supabase
        .from('orders')
        .select('status')
        .eq('id', orderId)
        .single()
      if (active && data?.status) setStatus(data.status as string)
    }, 8000)

    const channel = supabase
      .channel(`order-status-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'app',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload: { new: { status?: string } }) => {
          const newStatus = payload.new?.status
          if (active && newStatus) setStatus(newStatus)
        }
      )
      .subscribe()

    return () => {
      active = false
      clearInterval(pollInterval)
      supabase.removeChannel(channel)
    }
  }, [initialOrder.id])

  const safeStatus = status in STATUS_CONFIG ? status : 'pending'
  const cfg = STATUS_CONFIG[safeStatus]
  const StatusIcon = cfg.icon
  const isCancelled = safeStatus === 'cancelled'
  const isDelivered = safeStatus === 'delivered'
  const currentIdx = PROGRESS_STEPS.indexOf(safeStatus)
  const color = isCancelled ? CANCELLED_COLOR : accentColor

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-6 text-center space-y-3" style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}` }}>
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto transition-all duration-500"
          style={{ backgroundColor: `${color}18` }}
        >
          <StatusIcon className="w-8 h-8 transition-all duration-500" style={{ color }} />
        </div>

        <div>
          <h1 className="text-2xl font-black mb-2 transition-all duration-300" style={{ color }}>
            {cfg.label}
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: subtleText }}>{cfg.desc}</p>
        </div>

        {isCancelled ? (
          <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-2.5 text-sm font-semibold text-red-600">
            Commande annulée
          </div>
        ) : (
          <div className="pt-2">
            <div className="flex items-center justify-center gap-1">
              {PROGRESS_STEPS.map((s, i) => {
                const isDone = currentIdx >= i
                return (
                  <div key={s} className="flex items-center gap-1">
                    <div
                      className="w-3 h-3 rounded-full transition-all duration-500"
                      style={{ backgroundColor: isDone ? color : '#E5E7EB' }}
                    />
                    {i < PROGRESS_STEPS.length - 1 && (
                      <div
                        className="w-10 h-0.5 transition-all duration-500"
                        style={{ backgroundColor: currentIdx > i ? color : '#E5E7EB' }}
                      />
                    )}
                  </div>
                )
              })}
            </div>
            <div className="flex justify-between text-[10px] mt-1.5 px-1" style={{ color: subtleText }}>
              {PROGRESS_LABELS.map(l => <span key={l}>{l}</span>)}
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-1.5 pt-1">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: color }} />
          <span className="text-xs" style={{ color: subtleText }}>Suivi en direct</span>
        </div>
      </div>

      {isDelivered && !hasReview && (
        <ReviewForm
          orderId={initialOrder.id}
          restaurantId={restaurantId}
          customerName={initialOrder.customer_name || ''}
          onSubmitted={() => setHasReview(true)}
          accentColor={accentColor}
          cardBg={cardBg}
          cardBorder={cardBorder}
          pageText={pageText}
          subtleText={subtleText}
        />
      )}

      {isDelivered && hasReview && (
        <div className="rounded-2xl px-5 py-4 text-center" style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}` }}>
          <Star className="w-5 h-5 mx-auto mb-2" style={{ color: accentColor }} />
          <p className="text-sm font-semibold" style={{ color: pageText }}>Merci pour votre avis !</p>
        </div>
      )}
    </div>
  )
}
