'use client'

import { useState, useCallback } from 'react'
import { ShoppingBag, X, Plus, Minus, Trash2, MessageCircle, Tag, Loader2, XCircle } from 'lucide-react'
import { useCart } from '@/lib/hooks/useCart'
import { formatCurrency } from '@/lib/utils'
import Image from 'next/image'
import type { ThemeTokens } from '@/lib/theme'
import { useSettings } from '@/lib/hooks/useSettings'

interface Props {
  onClose?: () => void
  inline?: boolean
  tokens?: ThemeTokens
  isPremium?: boolean
}

const DEFAULT_TOKENS: ThemeTokens = {
  bgPage: '#0A0A0A', bgCard: '#141414', bgCardHover: '#1C1C1C', bgInput: '#1C1C1C', bgBadge: '#1C1C1C',
  border: 'rgba(255,255,255,0.08)', borderStrong: 'rgba(255,255,255,0.14)',
  textPrimary: '#FFFFFF', textSecondary: '#A3A3A3', textMuted: '#6B6B6B', textOnAccent: '#FFFFFF', textOnButton: '#FFFFFF',
  accent: '#F97316', accentHover: '#EA580C', accentSubtle: '#F9731620', accentText: '#F97316', button: '#F97316', buttonHover: '#EA580C',
  openBg: 'rgba(34,197,94,0.12)', openText: '#4ADE80', closedBg: 'rgba(239,68,68,0.12)', closedText: '#F87171',
}

// ─── Promo hook ───────────────────────────────────────────────────────────────

interface AppliedPromo {
  code: string
  discount_type: 'fixed' | 'percent'
  discount_value: number
  promo_code_id: string
}

function usePromoCode(restaurantId: string | null) {
  const [code, setCode] = useState('')
  const [applied, setApplied] = useState<AppliedPromo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const apply = useCallback(async () => {
    if (!code.trim() || !restaurantId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/promo?code=${encodeURIComponent(code.trim())}&restaurant_id=${restaurantId}`)
      const json = await res.json()
      if (!res.ok || !json.data) {
        setError(json.error || 'Code invalide')
        return
      }
      setApplied({
        code: json.data.code,
        discount_type: json.data.discount_type,
        discount_value: json.data.value,
        promo_code_id: json.data.id,
      })
    } catch {
      setError('Erreur de vérification')
    } finally {
      setLoading(false)
    }
  }, [code, restaurantId])

  const remove = useCallback(() => {
    setApplied(null)
    setCode('')
    setError(null)
  }, [])

  return { code, setCode, applied, loading, error, apply, remove }
}

function computeDiscount(total: number, promo: AppliedPromo | null): number {
  if (!promo) return 0
  if (promo.discount_type === 'fixed') return Math.min(promo.discount_value, total)
  return Math.round((total * promo.discount_value) / 100)
}

// ─── Cart Item display ────────────────────────────────────────────────────────

export function CartButton({ tokens = DEFAULT_TOKENS, isPremium = false }: { tokens?: ThemeTokens; isPremium?: boolean }) {
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
                body: JSON.stringify({ restaurant_id: 'demo', event_type: 'open_cart' }),
              })
            } catch { /* ignore */ }
            setOpen(true)
          }}
          className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 text-white px-5 py-3 rounded-2xl font-semibold shadow-2xl"
          style={{ backgroundColor: tokens.button, color: tokens.textOnButton, boxShadow: `0 8px 30px ${tokens.button}40` }}
        >
          <ShoppingBag className="w-4 h-4" />
          Voir le panier ({totalItems})
        </button>
      )}
      {open && <CartDrawer onClose={() => setOpen(false)} tokens={tokens} isPremium={isPremium} />}
    </>
  )
}

export function CartDrawer({ onClose, inline = false, tokens = DEFAULT_TOKENS, isPremium = false }: Props) {
  const { state, updateQty, clearCart, totalItems, totalPrice } = useCart()
  const settings = useSettings()
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : settings.platform_url

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'Wave' | 'Orange Money' | 'Cash'>('Wave')

  const promo = usePromoCode(state.restaurantId)
  const discount = computeDiscount(totalPrice, promo.applied)
  const finalTotal = totalPrice - discount

  function openWhatsappSafely(url: string, pendingWindow: Window | null) {
    if (pendingWindow && !pendingWindow.closed) {
      try { pendingWindow.location.href = url; return } catch { /* continue */ }
    }
    const popup = window.open(url, '_blank')
    if (!popup) window.location.href = url
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
    const pendingWindow = window.open('about:blank', '_blank')

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: state.restaurantId,
          customer_name: customerName.trim() || 'Client',
          customer_phone: cleanedCustomerPhone,
          customer_address: customerAddress.trim() || null,
          items: state.items.map(i => ({
            id: i.id,
            name: i.name,
            price: i.price,
            quantity: i.quantity,
            variant_id: i.variant_id ?? null,
            variant_name: i.variant_name ?? null,
          })),
          total: finalTotal,
          payment_method: paymentMethod === 'Wave' ? 'wave' : paymentMethod === 'Orange Money' ? 'orange_money' : 'cash',
          notes: null,
          promo_code_id: promo.applied?.promo_code_id ?? null,
          discount_amount: discount,
        }),
      })

      const payload = await response.json()
      if (!response.ok || !payload?.data?.id) {
        throw new Error(payload?.error || 'Erreur de création de commande')
      }

      const order = payload.data as { id: string; created_at: string }
      const orderNumber: string = payload.order_number || order.id.slice(0, 8).toUpperCase()
      const shortUrl: string = payload.short_url || `${baseUrl}/c/${orderNumber}`

      // Detect preorder (any item with preorder_delivery_date)
      const preorderItem = state.items.find(i => i.preorder_delivery_date)
      const isPreorder = !!preorderItem
      const deliveryText = preorderItem?.preorder_delivery_date ?? ''

      // Build items lines with variants
      const itemsLines = state.items.map(i => {
        const variantPart = i.variant_name ? ` (${i.variant_name})` : ''
        return `• ${i.quantity}× ${i.name}${variantPart} — ${(i.price * i.quantity).toLocaleString('fr-SN')} FCFA`
      }).join('\n')

      const promoLine = promo.applied
        ? `\nCode promo : ${promo.applied.code} (−${formatCurrency(discount)})`
        : ''

      const addressLine = customerAddress.trim()
        ? `Adresse : ${customerAddress.trim()}\n`
        : ''

      // Fix Invalid Date: parse safely
      const rawDate = order.created_at
      const parsedDate = rawDate ? new Date(rawDate) : new Date()
      const orderTime = isNaN(parsedDate.getTime())
        ? new Date().toLocaleString('fr-SN', { timeZone: 'Africa/Dakar' })
        : new Intl.DateTimeFormat('fr-SN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Dakar' }).format(parsedDate)

      let message: string
      if (isPreorder) {
        message = encodeURIComponent(
          `📅 Précommande ${orderNumber} — ${state.restaurantName}\n\n` +
          `Client : ${customerName.trim() || 'Client'}\n` +
          `Tél : ${cleanedCustomerPhone}\n` +
          `${addressLine}\n` +
          `Articles :\n${itemsLines}${promoLine}\n\n` +
          `Livraison : ${deliveryText}\n\n` +
          `Total : ${formatCurrency(finalTotal)}\n` +
          `Paiement : ${paymentMethod}\n` +
          `Heure : ${orderTime}\n\n` +
          `🔗 Voir la commande :\n${shortUrl}`
        )
      } else {
        message = encodeURIComponent(
          `🍽 Commande ${orderNumber} — ${state.restaurantName}\n\n` +
          `Client : ${customerName.trim() || 'Client'}\n` +
          `Tél : ${cleanedCustomerPhone}\n` +
          `${addressLine}\n` +
          `Articles :\n${itemsLines}${promoLine}\n\n` +
          `Total : ${formatCurrency(finalTotal)}\n` +
          `Paiement : ${paymentMethod}\n` +
          `Heure : ${orderTime}\n\n` +
          `🔗 Voir la commande :\n${shortUrl}`
        )
      }

      const restaurantPhone = (payload.whatsapp_url
        ? payload.whatsapp_url.split('wa.me/')[1]?.split('?')[0]
        : state.restaurantPhone.replace(/\D/g, '')) || state.restaurantPhone.replace(/\D/g, '')

      openWhatsappSafely(
        payload.whatsapp_url || `https://wa.me/${restaurantPhone}?text=${message}`,
        pendingWindow
      )

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
            <span className="text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center"
              style={{ backgroundColor: tokens.button, color: tokens.textOnButton }}>
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
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 text-2xl"
              style={{ backgroundColor: tokens.bgCardHover }}>🛒</div>
            <p className="font-semibold text-sm mb-1" style={{ color: tokens.textPrimary }}>Panier vide</p>
            <p className="text-xs" style={{ color: tokens.textMuted }}>Ajoutez des plats pour commander</p>
          </div>
        ) : (
          state.items.map(item => (
            <div key={item.id} className="flex items-center gap-3 rounded-xl p-3"
              style={{ backgroundColor: tokens.bgCardHover }}>
              {item.image_url && (
                <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                  <Image src={item.image_url} alt={item.name} fill className="object-cover" sizes="48px" unoptimized />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: tokens.textPrimary }}>{item.name}</p>
                {/* Affichage variante */}
                {item.variant_name && (
                  <p className="text-xs" style={{ color: tokens.textMuted }}>{item.variant_name}</p>
                )}
                {/* Badge précommande avec date de livraison */}
                {item.preorder_delivery_date && (
                  <p className="text-xs font-semibold mt-0.5" style={{ color: tokens.accent }}>
                    📅 Précommande · Livraison : {item.preorder_delivery_date}
                  </p>
                )}
                <p className="text-xs font-semibold" style={{ color: tokens.accentText }}>{formatCurrency(item.price)}</p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => updateQty(item.id, item.quantity - 1)}
                  className="w-6 h-6 rounded-full flex items-center justify-center transition-colors"
                  style={{ backgroundColor: tokens.bgCard, border: `1px solid ${tokens.border}` }}
                >
                  {item.quantity === 1
                    ? <Trash2 className="w-3 h-3 text-red-400" />
                    : <Minus className="w-3 h-3" style={{ color: tokens.textSecondary }} />
                  }
                </button>
                <span className="text-sm font-bold w-4 text-center" style={{ color: tokens.textPrimary }}>{item.quantity}</span>
                <button
                  onClick={() => updateQty(item.id, item.quantity + 1)}
                  className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: tokens.button, color: tokens.textOnButton }}
                >
                  <Plus className="w-3 h-3" />
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

          <input
            value={customerAddress}
            onChange={(e) => setCustomerAddress(e.target.value)}
            placeholder="Adresse de livraison (optionnel)"
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

          {/* ── Code promo (Premium uniquement) ── */}
          {isPremium && (
            <div>
              {!promo.applied ? (
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: tokens.textMuted }} />
                    <input
                      value={promo.code}
                      onChange={e => promo.setCode(e.target.value.toUpperCase())}
                      onKeyDown={e => e.key === 'Enter' && promo.apply()}
                      placeholder="Code promo"
                      className="w-full rounded-xl pl-8 pr-3 py-2.5 text-sm focus:outline-none uppercase"
                      style={{ backgroundColor: tokens.bgCardHover, color: tokens.textPrimary, border: `1px solid ${tokens.border}` }}
                    />
                  </div>
                  <button
                    onClick={promo.apply}
                    disabled={promo.loading || !promo.code.trim()}
                    className="px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50 transition-all"
                    style={{ backgroundColor: tokens.button, color: tokens.textOnButton }}
                  >
                    {promo.loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Appliquer'}
                  </button>
                </div>
              ) : (
                <div
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                  style={{ backgroundColor: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}
                >
                  <div className="flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5 text-green-400" />
                    <span className="text-sm font-semibold text-green-400">{promo.applied.code}</span>
                    <span className="text-xs" style={{ color: tokens.textMuted }}>
                      {promo.applied.discount_type === 'percent'
                        ? `−${promo.applied.discount_value}%`
                        : `−${formatCurrency(promo.applied.discount_value)}`}
                    </span>
                  </div>
                  <button onClick={promo.remove}>
                    <XCircle className="w-4 h-4 text-green-400 opacity-70 hover:opacity-100" />
                  </button>
                </div>
              )}
              {promo.error && (
                <p className="text-xs text-red-400 mt-1 px-1">{promo.error}</p>
              )}
            </div>
          )}

          {/* Totaux */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: tokens.textSecondary }}>Sous-total</span>
              <span className="text-sm font-medium" style={{ color: tokens.textPrimary }}>{formatCurrency(totalPrice)}</span>
            </div>
            {discount > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-green-400">Réduction</span>
                <span className="text-sm font-semibold text-green-400">−{formatCurrency(discount)}</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-1" style={{ borderTop: `1px solid ${tokens.border}` }}>
              <span className="font-bold text-sm" style={{ color: tokens.textPrimary }}>Total</span>
              <span className="font-black text-lg" style={{ color: tokens.textPrimary }}>{formatCurrency(finalTotal)}</span>
            </div>
          </div>

          {/* Récapitulatif précommande si applicable */}
          {state.items.some(i => i.preorder_delivery_date) && (
            <div
              className="rounded-xl px-3 py-2.5 text-sm"
              style={{ backgroundColor: `${tokens.accent}15`, border: `1px solid ${tokens.accent}40` }}
            >
              <p className="font-semibold mb-1" style={{ color: tokens.accent }}>📅 Commande en précommande</p>
              {Array.from(new Set(state.items.filter(i => i.preorder_delivery_date).map(i => i.preorder_delivery_date))).map(date => (
                <p key={date} className="text-xs" style={{ color: tokens.textSecondary }}>
                  Livraison prévue : <span className="font-semibold" style={{ color: tokens.textPrimary }}>{date}</span>
                </p>
              ))}
            </div>
          )}

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
