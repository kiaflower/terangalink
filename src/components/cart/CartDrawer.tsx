'use client'

import { useState } from 'react'
import { ShoppingBag, X, Plus, Minus, Trash2, MessageCircle, MapPin, Loader2, CheckCircle } from 'lucide-react'
import { useCart } from '@/lib/hooks/useCart'
import { formatCurrency } from '@/lib/utils'
import Image from 'next/image'
import type { ThemeTokens } from '@/lib/theme'

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
          onClick={() => {
  fetch('/api/analytics/track', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      restaurant_id: 'demo',
      event_type: 'open_cart'
    })
  })

  setOpen(true)
}}
          className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 text-white px-6 py-3.5 rounded-full shadow-2xl font-semibold text-sm"
          style={{ backgroundColor: tokens.accent, boxShadow: `0 8px 30px ${tokens.accent}40` }}
        >
          <ShoppingBag className="w-4 h-4" />Voir le panier ({totalItems})
        </button>
      )}
      {open && <CartDrawer onClose={() => setOpen(false)} tokens={tokens} />}
    </>
  )
}

export function CartDrawer({ onClose, inline = false, tokens = DEFAULT_TOKENS }: Props) {
  const { state, updateQty, clearCart, setLocation, totalItems, totalPrice, whatsappMessage } = useCart()
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)

  const whatsappUrl = state.restaurantPhone
    ? `https://wa.me/${state.restaurantPhone.replace(/\D/g, '')}?text=${whatsappMessage}`
    : null

  async function handleGetLocation() {
    if (!navigator.geolocation) {
      setGeoError('Géolocalisation non supportée sur cet appareil.')
      return
    }
    setGeoLoading(true)
    setGeoError(null)

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        const mapsUrl = `https://maps.google.com/?q=${latitude},${longitude}`

        // Reverse geocode using a free API
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=fr`
          )
          const data = await res.json()
          const address = data.display_name
            ? data.display_name.split(',').slice(0, 3).join(', ')
            : `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
          setLocation(address, mapsUrl)
        } catch {
          setLocation(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`, mapsUrl)
        }
        setGeoLoading(false)
      },
      (err) => {
        setGeoLoading(false)
        if (err.code === 1) setGeoError('Accès à la localisation refusé. Activez-la dans vos paramètres.')
        else setGeoError('Impossible de récupérer votre position.')
      },
      { timeout: 10000, maximumAge: 60000 }
    )
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
                <button onClick={() => updateQty(item.id, item.quantity - 1)} className="w-6 h-6 rounded-full flex items-center justify-center transition-colors" style={{ backgroundColor: tokens.bgCard, border: `1px solid ${tokens.border}` }}>
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
          {/* Total */}
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: tokens.textSecondary }}>Total</span>
            <span className="font-bold text-lg" style={{ color: tokens.textPrimary }}>{formatCurrency(totalPrice)}</span>
          </div>

          {/* Geolocation */}
          <div>
            {state.customerLocation ? (
              <div className="flex items-start gap-2 rounded-xl p-3" style={{ backgroundColor: `${tokens.accent}12`, border: `1px solid ${tokens.accent}25` }}>
                <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: tokens.accent }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold mb-0.5" style={{ color: tokens.accentText }}>Localisation ajoutée</p>
                  <p className="text-xs truncate" style={{ color: tokens.textMuted }}>{state.customerLocation}</p>
                </div>
                <button onClick={() => setLocation('', '')} className="text-xs flex-shrink-0" style={{ color: tokens.textMuted }}>✕</button>
              </div>
            ) : (
              <div>
                <button
                  onClick={handleGetLocation}
                  disabled={geoLoading}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-semibold transition-colors disabled:opacity-60"
                  style={{
                    backgroundColor: tokens.bgCardHover,
                    color: tokens.textSecondary,
                    border: `1px solid ${tokens.border}`,
                  }}
                >
                  {geoLoading
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Localisation...</>
                    : <><MapPin className="w-3.5 h-3.5" />Partager ma localisation</>
                  }
                </button>
                {geoError && <p className="text-xs text-red-400 mt-1.5 text-center">{geoError}</p>}
                <p className="text-xs text-center mt-1" style={{ color: tokens.textMuted }}>
                  Optionnel — aide le restaurant à vous livrer
                </p>
              </div>
            )}
          </div>

          {/* WhatsApp button */}
          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#20b858] text-white font-bold py-3.5 rounded-xl transition-colors text-sm"
            >
              <MessageCircle className="w-4 h-4" />
              Commander via WhatsApp
            </a>
          ) : (
            <p className="text-xs text-center" style={{ color: tokens.textMuted }}>Numéro WhatsApp non configuré</p>
          )}
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
