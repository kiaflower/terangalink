'use client'

import { useState } from 'react'
import { ShoppingBag, X, Plus, Minus, Trash2, MessageCircle } from 'lucide-react'
import { useCart } from '@/lib/hooks/useCart'
import { formatCurrency } from '@/lib/utils'
import Image from 'next/image'
import type { ThemeTokens } from '@/lib/theme'
import { useSettings } from '@/lib/hooks/useSettings'

interface Props { onClose?: () => void; inline?: boolean; tokens?: ThemeTokens }

const DEFAULT_TOKENS: ThemeTokens = {
  bgPage: '#0A0A0A', bgCard: '#141414', bgCardHover: '#1C1C1C', bgInput: '#1C1C1C', bgBadge: '#1C1C1C',
  border: 'rgba(255,255,255,0.08)', borderStrong: 'rgba(255,255,255,0.14)',
  textPrimary: '#FFFFFF', textSecondary: '#A3A3A3', textMuted: '#6B6B6B', textOnAccent: '#FFFFFF',
  accent: '#F97316', accentHover: '#EA580C', accentSubtle: '#F9731620', accentText: '#F97316',
  openBg: 'rgba(34,197,94,0.12)', openText: '#4ADE80', closedBg: 'rgba(239,68,68,0.12)', closedText: '#F87171',
}

export function CartButton({ tokens = DEFAULT_TOKENS }: { tokens?: ThemeTokens }) {
  const { totalItems } = useCart()
  const [open, setOpen] = useState(false)

  return (
    <>
      {totalItems > 0 && (
        <button
          onClick={async () => {
            try {
              await fetch('/api/analytics/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  restaurant_id: 'demo',
                  event_type: 'open_cart',
                }),
              })
            } catch {
              // ignore analytics failure
            }
            setOpen(true)
          }}
          className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 text-white px-5 py-3 rounded-2xl font-semibold shadow-2xl"
          style={{
            backgroundColor: tokens.accent,
            boxShadow: `0 8px 30px ${tokens.accent}40`,
          }}
        >
          <ShoppingBag className="w-4 h-4" />
          Voir le panier ({totalItems})
        </button>
      )}
      {open && <CartDrawer onClose={() => setOpen(false)} tokens={tokens} />}
    </>
  )
}

export function CartDrawer({ onClose, inline = false, tokens = DEFAULT_TOKENS }: Props) {
  const { state, updateQty, clearCart, totalItems, totalPrice } = useCart()
  const settings = useSettings()
  const baseUrl = typeof window !== 'undefined'
    ? window.location.origin
    : settings.platform_url

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'Wave' | 'Orange Money' | 'Cash'>('Wave')

  function openWhatsappSafely(url: string, pendingWindow: Window | null) {
    // iOS Safari safe fallback chain
    if (pendingWindow && !pendingWindow.closed) {
      try {
        pendingWindow.location.href = url
        return
      } catch {
        // continue fallback
      }
    }

    const popup = window.open(url, '_blank')
    if (!popup) {
      // last-resort fallback (works better on iOS Safari)
      window.location.href = url
    }
  }

  async function handleOrderViaWhatsApp() {
    if (!state.restaurantPhone || !state.restaurantId || state.items.length === 0 || submitting) return

    const cleanedCustomerPhone = customerPhone.replace(/\D/g, '')
    if (!cleanedCustomerPhone) {
      setSubmitError('Veuillez entrer votre numéro WhatsApp.')
      return
    }

    setSubmitting(true)
    setSubmitError(null)

    // Open immediately in click context (anti popup-block)
    const pendingWindow = window.open('about:blank', '_blank')

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: state.restaurantId,
          customer_name: customerName.trim() || 'Client',
          customer_phone: cleanedCustomerPhone,
          items: state.items.map(i => ({
            id: i.id,
            name: i.name,
            price: i.price,
            quantity: i.quantity,
          })),
          total: totalPrice,
          notes: `Paiement: ${paymentMethod}`,
        }),
      })

      const payload = await response.json()
      if (!response.ok || !payload?.data?.id) {
        throw new Error(payload?.error || 'Erreur de création de commande')
      }

      const order = payload.data as { id: string; created_at: string }
      const itemsLines = state.items
        .map(i => `• ${i.name} x${i.quantity} — ${(i.price * i.quantity).toLocaleString('fr-SN')} FCFA`)
        .join('\n')

      const orderTime = new Date(order.created_at || Date.now()).toLocaleString('fr-SN')
      const manageUrl = `${baseUrl.replace(/\/$/, '')}/dashboard/restaurant/orders?order=${order.id}`

      const message = encodeURIComponent(
        `Nouvelle commande TerangaLink\n\n` +
        `Client: ${customerName.trim() || 'Client'}\n` +
        `Téléphone: ${cleanedCustomerPhone}\n` +
        `Articles:\n${itemsLines}\n\n` +
        `Total: ${totalPrice.toLocaleString('fr-SN')} FCFA\n` +
        `Paiement: ${paymentMethod}\n` +
        `Heure: ${orderTime}\n\n` +
        `Gérer la commande:\n${manageUrl}`
      )

      const restaurantPhone = state.restaurantPhone.replace(/\D/g, '')
      const url = `https://wa.me/${restaurantPhone}?text=${message}`

      openWhatsappSafely(url, pendingWindow)

      clearCart()
      onClose?.()
    } catch (error) {
      console.error('Order checkout error:', error)
      if (pendingWindow && !pendingWindow.closed) pendingWindow.close()
      setSubmitError('La commande a échoué. Veuillez réessayer.')
    } finally {
      setSubmitting(false)
    }
  }

  const content = (
    <div className="flex flex-col h-full" style={{ color: tokens.textPrimary }}>
      {/* Header */}
      <div className="flex items-center justify-between p-5" style={{ borderBottom: `1px solid ${tokens.border}` }}>
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5" style={{ color: tokens.accent }} />
          <h2 className="font-bold text-sm" style={{ color: tokens.textPrimary }}>Votre panier</h2>
          {totalItems > 0 && (
            <span className="text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: tokens.accent }}>
              {totalItems}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {totalItems > 0 && (
            <button onClick={clearCart} className="text-xs transition-colors" style={{ color: tokens.textMuted }}>Vider</button>
          )}
          {onClose && (
            <button onClick={onClose} className="p-1.5 transition-colors" style={{ color: tokens.textMuted }}>
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {state.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 text-2xl" style={{ backgroundColor: tokens.bgCardHover }}>🛒</div>
            <p className="font-semibold text-sm mb-1" style={{ color: tokens.textPrimary }}>Panier vide</p>
            <p className="text-xs" style={{ color: tokens.textMuted }}>Ajoutez des plats pour commander</p>
          </div>
        ) : (
          state.items.map(item => (
            <div key={item.id} className="flex items-center gap-3 rounded-xl p-3" style={{ backgroundColor: tokens.bgCardHover }}>
              {item.image_url && (
                <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                  <Image src={item.image_url} alt={item.name} fill className="object-cover" sizes="48px" unoptimized />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: tokens.textPrimary }}>{item.name}</p>
                <p className="text-xs font-semibold" style={{ color: tokens.accentText }}>{formatCurrency(item.price)}</p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => updateQty(item.id, item.quantity - 1)}
                  className="w-6 h-6 rounded-full flex items-center justify-center transition-colors"
                  style={{ backgroundColor: tokens.bgCard, border: `1px solid ${tokens.border}` }}
                >
                  {item.quantity === 1 ? <Trash2 className="w-3 h-3 text-red-400" /> : <Minus className="w-3 h-3" style={{ color: tokens.textSecondary }} />}
                </button>
                <span className="text-sm font-bold w-4 text-center" style={{ color: tokens.textPrimary }}>{item.quantity}</span>
                <button onClick={() => updateQty(item.id, item.quantity + 1)} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: tokens.accent }}>
                  <Plus className="w-3 h-3 text-white" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {state.items.length > 0 && (
        <div className="p-4 space-y-3" style={{ borderTop: `1px solid ${tokens.border}` }}>
          <input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Nom (optionnel)"
            className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none"
            style={{ backgroundColor: tokens.bgCardHover, color: tokens.textPrimary, border: `1px solid ${tokens.border}` }}
          />

          <input
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            placeholder="Votre numéro WhatsApp (obligatoire)"
            className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none"
            style={{ backgroundColor: tokens.bgCardHover, color: tokens.textPrimary, border: `1px solid ${tokens.border}` }}
          />

          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as 'Wave' | 'Orange Money' | 'Cash')}
            className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none"
            style={{ backgroundColor: tokens.bgCardHover, color: tokens.textPrimary, border: `1px solid ${tokens.border}` }}
          >
            <option value="Wave">Paiement : Wave</option>
            <option value="Orange Money">Paiement : Orange Money</option>
            <option value="Cash">Paiement : Cash</option>
          </select>

          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: tokens.textSecondary }}>Total</span>
            <span className="font-bold text-lg" style={{ color: tokens.textPrimary }}>{formatCurrency(totalPrice)}</span>
          </div>

          {state.restaurantPhone ? (
            <button
              onClick={handleOrderViaWhatsApp}
              disabled={submitting}
              className="flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#20b858] text-white font-bold py-3.5 rounded-xl transition-colors text-sm"
            >
              <MessageCircle className="w-4 h-4" />
              {submitting ? 'Ouverture WhatsApp...' : 'Commander via WhatsApp'}
            </button>
          ) : (
            <p className="text-xs text-center" style={{ color: tokens.textMuted }}>Numéro WhatsApp non configuré</p>
          )}

          {submitError && <p className="text-xs text-center text-red-400">{submitError}</p>}
        </div>
      )}
    </div>
  )

  if (inline) return content

  return (
    <>
      <div className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl max-h-[90vh] flex flex-col"
        style={{ backgroundColor: tokens.bgCard, borderTop: `1px solid ${tokens.border}` }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: tokens.borderStrong }} />
        </div>
        {content}
      </div>
    </>
  )
}