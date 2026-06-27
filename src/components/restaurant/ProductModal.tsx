'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { X, Plus, Minus, ShoppingCart, Clock, AlertTriangle, PackageX, Tag, ChevronLeft, ChevronRight } from 'lucide-react'
import { useCart } from '@/lib/hooks/useCart'
import { formatCurrency } from '@/lib/utils'
import type { MenuItem, MenuItemVariant } from '@/lib/types'
import type { ThemeTokens } from '@/lib/theme'

interface ProductModalProps {
  item: MenuItem | null
  onClose: () => void
  restaurantId: string
  restaurantSlug: string
  restaurantPhone: string
  restaurantName: string
  tokens: ThemeTokens
  isPremium: boolean
}

// ─── Précommande helpers ──────────────────────────────────────────────────────

type PreorderState =
  | { status: 'soon'; openAt: Date }
  | { status: 'open'; closeAt: Date; remaining: number | null }
  | { status: 'closed' }
  | { status: 'soldout' }

function getPreorderState(item: MenuItem): PreorderState | null {
  if (!item.preorder_enabled) return null
  const now = new Date()
  const openAt = item.preorder_open_at ? new Date(item.preorder_open_at) : null
  const closeAt = item.preorder_close_at ? new Date(item.preorder_close_at) : null
  const maxQty = item.preorder_max_qty ?? null
  const reserved = item.preorder_reserved ?? 0
  if (maxQty !== null && reserved >= maxQty) return { status: 'soldout' }
  if (openAt && now < openAt) return { status: 'soon', openAt }
  if (closeAt && now > closeAt) return { status: 'closed' }
  const remaining = maxQty !== null ? maxQty - reserved : null
  return { status: 'open', closeAt: closeAt ?? new Date(now.getTime() + 99 * 86400000), remaining }
}

function useCountdown(target: Date | null): string {
  const [label, setLabel] = useState('')
  useEffect(() => {
    if (!target) return
    function update() {
      const diff = target!.getTime() - Date.now()
      if (diff <= 0) { setLabel('Terminé'); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      if (h > 24) {
        setLabel(`${Math.floor(h / 24)}j ${h % 24}h`)
      } else {
        setLabel(`${String(h).padStart(2, '0')}h${String(m).padStart(2, '0')}m${String(s).padStart(2, '0')}s`)
      }
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [target])
  return label
}

// ─── Stock helpers ────────────────────────────────────────────────────────────

function getStockStatus(item: MenuItem): 'ok' | 'low' | 'out' | 'disabled' {
  if (!item.stock_enabled) return 'disabled'
  const qty = item.stock_quantity ?? 0
  if (qty <= 0) return 'out'
  const threshold = item.stock_low_threshold ?? 5
  if (qty <= threshold) return 'low'
  return 'ok'
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StockBadge({ item, tokens }: { item: MenuItem; tokens: ThemeTokens }) {
  const status = getStockStatus(item)
  if (status === 'disabled') return null
  const qty = item.stock_quantity ?? 0
  if (status === 'out') return (
    <div className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
      style={{ backgroundColor: 'rgba(239,68,68,0.12)', color: '#F87171' }}>
      <PackageX className="w-3.5 h-3.5" />Rupture de stock
    </div>
  )
  if (status === 'low') return (
    <div className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
      style={{ backgroundColor: 'rgba(245,158,11,0.12)', color: '#FCD34D' }}>
      <AlertTriangle className="w-3.5 h-3.5" />Stock faible — Plus que {qty} disponible{qty > 1 ? 's' : ''}
    </div>
  )
  return (
    <div className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
      style={{ backgroundColor: tokens.openBg, color: tokens.openText }}>
      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tokens.openText }} />
      {qty} en stock
    </div>
  )
}

function PreorderBanner({ item, tokens }: { item: MenuItem; tokens: ThemeTokens }) {
  const preorderState = getPreorderState(item)
  const closeCountdown = useCountdown(preorderState?.status === 'open' ? preorderState.closeAt : null)
  const openCountdown = useCountdown(preorderState?.status === 'soon' ? preorderState.openAt : null)
  if (!preorderState) return null
  if (preorderState.status === 'soon') return (
    <div className="rounded-xl p-3 text-xs font-medium"
      style={{ backgroundColor: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', color: '#A5B4FC' }}>
      <div className="flex items-center gap-2 mb-1"><Clock className="w-3.5 h-3.5" /><span className="font-semibold">Précommandes bientôt ouvertes</span></div>
      <p>Ouverture dans : <span className="font-bold">{openCountdown}</span></p>
      {item.preorder_delivery_date && <p className="mt-0.5 opacity-75">Livraison : {item.preorder_delivery_date}</p>}
    </div>
  )
  if (preorderState.status === 'open') return (
    <div className="rounded-xl p-3 text-xs"
      style={{ backgroundColor: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', color: '#A5B4FC' }}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2 font-semibold"><Clock className="w-3.5 h-3.5" />Précommandes ouvertes</div>
        <span className="font-bold text-white">{closeCountdown}</span>
      </div>
      {preorderState.remaining !== null && (
        <div className="mb-1.5">
          <div className="flex items-center justify-between mb-1 opacity-75">
            <span>{preorderState.remaining} disponible{preorderState.remaining > 1 ? 's' : ''}</span>
            {item.preorder_max_qty && <span>{item.preorder_reserved ?? 0} / {item.preorder_max_qty} réservés</span>}
          </div>
          {item.preorder_max_qty && (
            <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
              <div className="h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, ((item.preorder_reserved ?? 0) / item.preorder_max_qty) * 100)}%`, backgroundColor: '#818CF8' }} />
            </div>
          )}
        </div>
      )}
      {item.preorder_delivery_date && <p className="opacity-75">Livraison : {item.preorder_delivery_date}</p>}
    </div>
  )
  if (preorderState.status === 'soldout') return (
    <div className="rounded-xl p-3 text-xs font-medium"
      style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171' }}>
      <div className="flex items-center gap-2"><PackageX className="w-3.5 h-3.5" /><span className="font-semibold">Précommandes complètes</span></div>
      <p className="mt-0.5 opacity-75">Toutes les places ont été réservées</p>
    </div>
  )
  return (
    <div className="rounded-xl p-3 text-xs font-medium"
      style={{ backgroundColor: 'rgba(107,114,128,0.1)', border: '1px solid rgba(107,114,128,0.2)', color: '#9CA3AF' }}>
      <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5" /><span className="font-semibold">Précommandes terminées</span></div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ProductModal({
  item, onClose, restaurantId, restaurantSlug, restaurantPhone, restaurantName, tokens, isPremium,
}: ProductModalProps) {
  const { addItem } = useCart()
  const [selectedVariant, setSelectedVariant] = useState<MenuItemVariant | null>(null)
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)

  useEffect(() => {
    if (!item) return
    setSelectedVariant(null)
    setQty(1)
    setAdded(false)
    if (item.variants && item.variants.length === 1) setSelectedVariant(item.variants[0])
  }, [item?.id])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    if (!item) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [item])

  const handleAdd = useCallback(() => {
    if (!item) return
    const hasVariants = isPremium && item.variants && item.variants.length > 0
    if (hasVariants && !selectedVariant) return

    const effectivePrice = selectedVariant ? selectedVariant.price : item.price

    // ─── SÉPARATION CLAIRE ───────────────────────────────────────────────────
    // cart_key : clé interne du panier — permet d'avoir deux variantes
    //            du même plat comme deux lignes séparées dans le panier.
    //            N'est JAMAIS envoyée à la BDD.
    // id       : vrai UUID du menu_item — seul envoyé dans orders.items
    // variant_id : UUID de la variante — envoyé séparément dans orders.items
    // ────────────────────────────────────────────────────────────────────────
    const cart_key = selectedVariant
      ? `${item.id}__${selectedVariant.id}`
      : item.id

    for (let i = 0; i < qty; i++) {
      addItem(
        {
          cart_key,          // clé interne panier uniquement
          id: item.id,       // vrai UUID menu_item → sera dans orders.items.id
          name: item.name,
          price: effectivePrice,
          quantity: 1,
          image_url: item.image_url,
          variant_id: selectedVariant?.id ?? null,    // → orders.items.variant_id
          variant_name: selectedVariant?.name ?? null,
          preorder_delivery_date: (isPremium && item.preorder_enabled)
            ? (item.preorder_delivery_date ?? null)
            : null,
        },
        restaurantId,
        restaurantSlug,
        restaurantPhone,
        restaurantName,
      )
    }

    // Analytics : utilise item.id (vrai UUID), jamais cart_key
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurant_id: restaurantId,
        event_type: 'add_to_cart',
        item_id: item.id,
        item_name: item.name,
      }),
    }).catch(() => {})

    setAdded(true)
    setTimeout(() => { setAdded(false); onClose() }, 800)
  }, [item, selectedVariant, qty, isPremium, addItem, restaurantId, restaurantSlug, restaurantPhone, restaurantName, onClose])

  if (!item) return null

  const hasVariants = isPremium && item.variants && item.variants.length > 0
  const stockStatus = getStockStatus(item)
  const preorderState = isPremium ? getPreorderState(item) : null
  const displayPrice = hasVariants && item.variants && item.variants.length > 0
    ? (selectedVariant ? selectedVariant.price : Math.min(...item.variants.map(v => v.price)))
    : item.price
  const priceLabel = hasVariants && !selectedVariant ? 'À partir de' : null
  const isBlockedByStock = isPremium && stockStatus === 'out'
  const isBlockedByPreorder = isPremium && preorderState !== null &&
    (preorderState.status === 'soon' || preorderState.status === 'closed' || preorderState.status === 'soldout')
  const isBlockedByVariant = hasVariants && !selectedVariant
  const isBlocked = !item.is_available || isBlockedByStock || isBlockedByPreorder

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full sm:w-[480px] sm:max-w-[95vw] max-h-[92vh] flex flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl shadow-2xl"
        style={{ backgroundColor: tokens.bgCard, border: `1px solid ${tokens.border}` }}
      >
        <button onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)', color: 'white' }}>
          <X className="w-4 h-4" />
        </button>

        <div className="overflow-y-auto flex-1">
          {/* Galerie d'images */}
          {(() => {
            const allImages = item.image_urls?.length ? item.image_urls : item.image_url ? [item.image_url] : []
            const [activeIdx, setActiveIdx] = useState(0)
            const hasMany = allImages.length > 1
            const currentImg = allImages[activeIdx] ?? null
            return (
              <div className="relative w-full h-56 sm:h-64 flex-shrink-0" style={{ backgroundColor: tokens.bgCardHover }}
                onTouchStart={e => { const t = e.touches[0]; (e.currentTarget as HTMLDivElement & { _touchX?: number })._touchX = t.clientX }}
                onTouchEnd={e => {
                  const el = e.currentTarget as HTMLDivElement & { _touchX?: number }
                  if (el._touchX == null) return
                  const dx = e.changedTouches[0].clientX - el._touchX
                  if (Math.abs(dx) > 40) setActiveIdx(i => dx < 0 ? (i + 1) % allImages.length : (i - 1 + allImages.length) % allImages.length)
                  el._touchX = undefined
                }}
                onMouseDown={e => { (e.currentTarget as HTMLDivElement & { _mouseX?: number })._mouseX = e.clientX }}
                onMouseUp={e => {
                  const el = e.currentTarget as HTMLDivElement & { _mouseX?: number }
                  if (el._mouseX == null) return
                  const dx = e.clientX - el._mouseX
                  if (Math.abs(dx) > 40) setActiveIdx(i => dx < 0 ? (i + 1) % allImages.length : (i - 1 + allImages.length) % allImages.length)
                  el._mouseX = undefined
                }}
              >
                {currentImg ? (
                  <Image src={currentImg} alt={`${item.name} ${activeIdx + 1}`} fill className="object-cover"
                    sizes="(max-width: 640px) 100vw, 480px" unoptimized priority />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-6xl opacity-20">🍽️</span>
                  </div>
                )}
                {hasMany && (
                  <>
                    <button onClick={() => setActiveIdx(i => (i - 1 + allImages.length) % allImages.length)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button onClick={() => setActiveIdx(i => (i + 1) % allImages.length)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {allImages.map((_, i) => (
                        <button key={i} onClick={() => setActiveIdx(i)}
                          className={`w-1.5 h-1.5 rounded-full transition-colors ${i === activeIdx ? 'bg-white' : 'bg-white/40'}`} />
                      ))}
                    </div>
                  </>
                )}
                {isPremium && item.is_featured && item.featured_label && (
                  <div className="absolute top-3 left-3">
                    <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full text-white shadow-lg"
                      style={{ backgroundColor: tokens.button }}>
                      <Tag className="w-3 h-3" />{item.featured_label}
                    </span>
                  </div>
                )}
              </div>
            )
          })()}

          <div className="p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-bold leading-tight" style={{ color: tokens.textPrimary }}>{item.name}</h2>
              <div className="text-right flex-shrink-0">
                {priceLabel && <p className="text-xs font-medium mb-0.5" style={{ color: tokens.textMuted }}>{priceLabel}</p>}
                <p className="text-xl font-black" style={{ color: tokens.accentText }}>{formatCurrency(displayPrice)}</p>
              </div>
            </div>

            {item.description && (
              <p className="text-sm leading-relaxed" style={{ color: tokens.textSecondary }}>{item.description}</p>
            )}

            {isPremium && <StockBadge item={item} tokens={tokens} />}
            {isPremium && <PreorderBanner item={item} tokens={tokens} />}

            {hasVariants && item.variants && item.variants.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2.5" style={{ color: tokens.textPrimary }}>
                  Choisir une option <span className="text-red-400">*</span>
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {item.variants.map(variant => {
                    const isSelected = selectedVariant?.id === variant.id
                    return (
                      <button key={variant.id} onClick={() => setSelectedVariant(variant)}
                        className="flex items-center justify-between px-4 py-3 rounded-xl transition-all text-left"
                        style={{
                          backgroundColor: isSelected ? `${tokens.button}18` : tokens.bgCardHover,
                          border: `2px solid ${isSelected ? tokens.button : tokens.border}`,
                          color: tokens.textPrimary,
                        }}>
                        <span className="font-medium text-sm">{variant.name}</span>
                        <span className="font-bold text-sm" style={{ color: isSelected ? tokens.button : tokens.accentText }}>
                          {formatCurrency(variant.price)}
                        </span>
                      </button>
                    )
                  })}
                </div>
                {!selectedVariant && (
                  <p className="text-xs mt-1.5" style={{ color: tokens.textMuted }}>Sélectionnez une option pour continuer</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 p-4 space-y-3" style={{ borderTop: `1px solid ${tokens.border}`, backgroundColor: tokens.bgCard }}>
          {!isBlocked && !isBlockedByPreorder && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium" style={{ color: tokens.textSecondary }}>Quantité</span>
              <div className="flex items-center gap-3">
                <button onClick={() => setQty(q => Math.max(1, q - 1))}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
                  style={{ backgroundColor: tokens.bgCardHover, border: `1px solid ${tokens.border}` }}>
                  <Minus className="w-4 h-4" style={{ color: tokens.textSecondary }} />
                </button>
                <span className="font-bold text-base w-6 text-center" style={{ color: tokens.textPrimary }}>{qty}</span>
                <button
                  onClick={() => {
                    const stockMax = isPremium && item.stock_enabled ? (item.stock_quantity ?? Infinity) : Infinity
                    setQty(q => Math.min(q + 1, stockMax))
                  }}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
                  style={{ backgroundColor: tokens.button, color: tokens.textOnButton }}>
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {!item.is_available ? (
            <div className="w-full py-3.5 rounded-xl text-center text-sm font-semibold"
              style={{ backgroundColor: tokens.bgCardHover, color: tokens.textMuted }}>Indisponible</div>
          ) : isBlockedByStock ? (
            <div className="w-full py-3.5 rounded-xl text-center text-sm font-semibold"
              style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#F87171' }}>Rupture de stock</div>
          ) : isBlockedByPreorder ? (
            <div className="w-full py-3.5 rounded-xl text-center text-sm font-semibold"
              style={{ backgroundColor: tokens.bgCardHover, color: tokens.textMuted }}>
              {preorderState?.status === 'soon' ? 'Précommandes pas encore ouvertes' :
                preorderState?.status === 'soldout' ? 'Complet' : 'Précommandes terminées'}
            </div>
          ) : (
            <button onClick={handleAdd} disabled={isBlockedByVariant || added}
              className="w-full py-3.5 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all disabled:opacity-50"
              style={{
                backgroundColor: added ? '#22C55E' : (isBlockedByVariant ? tokens.bgCardHover : tokens.button),
                color: added ? 'white' : (isBlockedByVariant ? tokens.textMuted : tokens.textOnButton),
                cursor: isBlockedByVariant ? 'not-allowed' : 'pointer',
              }}>
              <ShoppingCart className="w-4 h-4" />
              {added ? 'Ajouté ✓' : isBlockedByVariant ? 'Choisir une option' : `Ajouter — ${formatCurrency(displayPrice * qty)}`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
