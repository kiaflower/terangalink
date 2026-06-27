'use client'

import { useState, useEffect, useRef } from 'react'
import { CheckCircle2, Clock, XCircle, Package, Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ReviewForm } from '@/components/restaurant/ReviewForm'
import type { ThemeTokens } from '@/lib/theme'

interface OrderLive {
  id: string
  status: string
  order_number?: string
  customer_name?: string
}

const STATUS_CONFIG: Record<string, {
  label: string
  icon: React.ElementType
  color: string
  desc: string
}> = {
  pending: {
    label: 'En attente',
    icon: Clock,
    color: '#F59E0B',
    desc: 'Votre commande est en attente de confirmation par le restaurant.',
  },
  confirmed: {
    label: 'Confirmée',
    icon: CheckCircle2,
    color: '#10B981',
    desc: 'Le restaurant a confirmé votre commande. Préparation en cours.',
  },
  preparing: {
    label: 'En préparation',
    icon: Package,
    color: '#6366F1',
    desc: 'Votre commande est en cours de préparation.',
  },
  ready: {
    label: 'Prête',
    icon: CheckCircle2,
    color: '#10B981',
    desc: 'Votre commande est prête ! Le restaurant va vous contacter.',
  },
  delivered: {
    label: 'Livrée ✓',
    icon: CheckCircle2,
    color: '#10B981',
    desc: 'Votre commande a été livrée. Bon appétit !',
  },
  cancelled: {
    label: 'Annulée',
    icon: XCircle,
    color: '#EF4444',
    desc: "Cette commande a été annulée. Contactez le restaurant pour plus d'informations.",
  },
  delivery_cancelled: {
    label: 'Livraison annulée',
    icon: XCircle,
    color: '#EF4444',
    desc: "La livraison a été annulée. Contactez le restaurant pour plus d'informations.",
  },
}

const PROGRESS_STEPS = ['pending', 'confirmed', 'preparing', 'ready', 'delivered']

interface OrderStatusLiveProps {
  order: OrderLive
  tokens: ThemeTokens
  hasReview: boolean
  restaurantId: string
}

export function OrderStatusLive({
  order: initialOrder,
  tokens,
  hasReview: initialHasReview,
  restaurantId,
}: OrderStatusLiveProps) {
  const [status, setStatus] = useState(initialOrder.status)
  const [hasReview, setHasReview] = useState(initialHasReview)
  const supabaseRef = useRef(createClient())

  useEffect(() => {
    const supabase = supabaseRef.current
    const orderId = initialOrder.id
    let active = true

    // Fetch immédiat au montage — récupère le vrai statut depuis la BDD
    supabase
      .from('orders')
      .select('status')
      .eq('id', orderId)
      .single()
      .then(({ data }) => {
        if (active && data?.status) setStatus(data.status as string)
      })

    // Polling toutes les 8s — garantit la mise à jour même sans realtime
    const pollInterval = setInterval(async () => {
      const { data } = await supabase
        .from('orders')
        .select('status')
        .eq('id', orderId)
        .single()
      if (active && data?.status) setStatus(data.status as string)
    }, 8000)

    // Realtime — mise à jour instantanée si disponible
    const channel = supabase
      .channel(`order-status-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          const newStatus = (payload.new as { status?: string }).status
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
  const isCancelled = safeStatus === 'cancelled' || safeStatus === 'delivery_cancelled'
  const isDelivered = safeStatus === 'delivered'
  const currentIdx = PROGRESS_STEPS.indexOf(safeStatus)

  return (
    <div className="space-y-4">
      <div
        className="rounded-2xl p-6 text-center space-y-3"
        style={{ backgroundColor: tokens.bgCard, border: `1.5px solid ${tokens.border}` }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto transition-all duration-500"
          style={{ backgroundColor: `${cfg.color}18` }}
        >
          <StatusIcon className="w-8 h-8 transition-all duration-500" style={{ color: cfg.color }} />
        </div>

        <div>
          <h1
            className="text-2xl font-black mb-2 transition-all duration-300"
            style={{ color: cfg.color }}
          >
            {cfg.label}
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: tokens.textSecondary }}>
            {cfg.desc}
          </p>
        </div>

        {!isCancelled && (
          <div className="pt-2">
            <div className="flex items-center justify-center gap-1">
              {(['pending', 'confirmed', 'delivered'] as const).map((s, i) => {
                const refIdx = PROGRESS_STEPS.indexOf(s)
                const isDone = currentIdx >= refIdx
                return (
                  <div key={s} className="flex items-center gap-1">
                    <div
                      className="w-3 h-3 rounded-full transition-all duration-500"
                      style={{ backgroundColor: isDone ? cfg.color : tokens.border }}
                    />
                    {i < 2 && (
                      <div
                        className="w-14 h-0.5 transition-all duration-500"
                        style={{
                          backgroundColor:
                            (i === 0 && currentIdx >= PROGRESS_STEPS.indexOf('confirmed')) ||
                            (i === 1 && isDelivered)
                              ? cfg.color
                              : tokens.border,
                        }}
                      />
                    )}
                  </div>
                )
              })}
            </div>
            <div
              className="flex justify-between text-xs mt-1.5 px-1"
              style={{ color: tokens.textMuted }}
            >
              <span>Reçue</span>
              <span>Confirmée</span>
              <span>Livrée</span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-1.5 pt-1">
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ backgroundColor: cfg.color }}
          />
          <span className="text-xs" style={{ color: tokens.textMuted }}>
            Suivi en direct
          </span>
        </div>
      </div>

      {isDelivered && !hasReview && (
        <ReviewForm
          orderId={initialOrder.id}
          restaurantId={restaurantId}
          customerName={initialOrder.customer_name || ''}
          tokens={tokens}
          onSubmitted={() => setHasReview(true)}
        />
      )}

      {isDelivered && hasReview && (
        <div
          className="rounded-2xl px-5 py-4 text-center"
          style={{ backgroundColor: tokens.bgCard, border: `1.5px solid ${tokens.border}` }}
        >
          <Star className="w-5 h-5 mx-auto mb-2" style={{ color: tokens.accent }} />
          <p className="text-sm font-semibold" style={{ color: tokens.textPrimary }}>
            Merci pour votre avis !
          </p>
        </div>
      )}
    </div>
  )
}
