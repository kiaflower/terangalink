'use client'

import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { MessageCircle, Store, X } from 'lucide-react'
import type { ProductWithVariants } from '@/lib/types'
import { formatPrice, buildWhatsAppMessage } from '@/lib/utils'
import { BoutiqueLink } from './BoutiqueLink'
import { getOrCreateSessionId } from '@/lib/analytics/sessionId'
import { useVariantSelection } from './VariantSelectionContext'
import { getUnitPrice } from '@/lib/pricing'
import { LowStockNotice } from '@/components/product/LowStockNotice'

interface Props {
  product: ProductWithVariants
  boutiqueId: string
  boutiqueSlug: string
  boutiqueName: string
  whatsappNumber: string
  accent: string
}

export function ProductOrderPanel({ product, boutiqueId, boutiqueSlug, boutiqueName, whatsappNumber, accent }: Props) {
  // Partagé avec ConnectedProductGallery (via VariantSelectionProvider) pour
  // que la photo affichée change quand une variante avec photo est choisie.
  const { selectedVariants, setVariant } = useVariantSelection()
  const [quantity, setQuantity] = useState(1)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('Wave')
  const [notes, setNotes] = useState('')
  const [sending, setSending] = useState(false)
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => { setNow(Date.now()) }, [])

  useEffect(() => {
    // Tracké côté client : la page produit est en ISR (revalidate=300), un
    // insert côté serveur compterait un seul événement par régénération de
    // cache et non par visite réelle.
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ boutique_id: boutiqueId, event_type: 'product_view', item_id: product.id, item_name: product.name }),
    }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id])

  const isPreorderActive = (() => {
    if (!product.preorder_enabled || now === null) return false
    if (product.preorder_start && now < new Date(product.preorder_start).getTime()) return false
    if (product.preorder_end && now > new Date(product.preorder_end).getTime()) return false
    return true
  })()

  const unitPrice = getUnitPrice(product, selectedVariants)
  const total = unitPrice * quantity

  async function sendWhatsApp() {
    setSending(true)
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        boutique_id: boutiqueId, event_type: 'whatsapp_click', item_id: product.id, item_name: product.name,
        session_id: getOrCreateSessionId(boutiqueSlug),
      }),
    }).catch(() => {})
    const waWindow = window.open('', '_blank')
    const items = [{
      product_id: product.id,
      name: product.name,
      quantity,
      price: unitPrice,
      variants: selectedVariants,
      isPreorder: isPreorderActive,
      preorderDeliveryDate: isPreorderActive ? product.preorder_delivery_date ?? undefined : undefined,
      preorderNote: isPreorderActive && product.preorder_delivery_date
        ? `Précommande — livraison prévue : ${product.preorder_delivery_date}`
        : undefined,
    }]
    let dashboardUrl: string | undefined
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boutique_id: boutiqueId, customer_name: customerName, customer_phone: customerPhone, customer_address: customerAddress,
          items, total, notes, payment_method: paymentMethod,
        }),
      })
      if (res.ok) {
        const order = await res.json()
        if (order?.dashboard_url) dashboardUrl = order.dashboard_url
      }
    } catch { /* continue without dashboard link */ }
    const message = buildWhatsAppMessage(boutiqueName, items, total, customerName, customerPhone, {
      notes, address: customerAddress, dashboardUrl, paymentMethod,
    })
    const waUrl = `https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
    if (waWindow) waWindow.location.href = waUrl
    else window.open(waUrl, '_blank')
    setCheckoutOpen(false)
    setSending(false)
  }

  return (
    <div>
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        {product.discount_percent ? (
          <span className="text-sm line-through text-gray-400">{formatPrice(product.price)}</span>
        ) : null}
        <p className="text-3xl font-bold" style={{ color: accent }}>{formatPrice(unitPrice)}</p>
        {product.discount_percent ? (
          <span className="text-xs font-semibold text-green-600">-{product.discount_percent}%</span>
        ) : null}
      </div>

      <LowStockNotice trackStock={product.track_stock} stockQuantity={product.stock_quantity} className="mt-1.5 text-xs font-semibold text-orange-500" />

      {isPreorderActive && (
        <p className="mt-2 text-xs font-semibold px-2.5 py-1 rounded-full text-white inline-block" style={{ backgroundColor: accent }}>
          Précommande{product.preorder_delivery_date ? ` — livraison prévue : ${product.preorder_delivery_date}` : ''}
        </p>
      )}

      {product.variants && product.variants.length > 0 && (
        <div className="mt-5 space-y-3">
          {product.variants.map(variant => (
            <div key={variant.id}>
              <p className="text-sm font-medium text-gray-700 mb-2">{variant.name}</p>
              <div className="flex gap-2 flex-wrap">
                {variant.options.map((opt: string) => {
                  const optPrice = variant.option_prices?.[opt]
                  return (
                    <button key={opt}
                      onClick={() => setVariant(variant.name, opt)}
                      className="px-3 py-1.5 text-sm rounded-lg border transition-colors"
                      style={selectedVariants[variant.name] === opt
                        ? { backgroundColor: accent, color: '#fff', borderColor: accent }
                        : { borderColor: '#E5E7EB', color: '#374151' }}>
                      {opt}{optPrice != null ? ` — ${formatPrice(optPrice)}` : ''}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-5">
        <p className="text-sm font-medium text-gray-700 mb-2">Quantité</p>
        <div className="inline-flex items-center gap-3 border border-gray-200 rounded-xl px-3 py-2">
          <button type="button" onClick={() => setQuantity(q => Math.max(1, q - 1))}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors font-bold">
            −
          </button>
          <span className="w-6 text-center font-semibold text-gray-900">{quantity}</span>
          <button type="button" onClick={() => setQuantity(q => q + 1)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors font-bold">
            +
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mt-6">
        <button
          onClick={() => setCheckoutOpen(true)}
          disabled={!product.is_available}
          className="flex-1 py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: accent }}>
          <MessageCircle className="w-5 h-5" />
          {product.is_available ? 'Commander sur WhatsApp' : 'Indisponible'}
        </button>
        <Suspense fallback={
          <Link href={`/${boutiqueSlug}`}
            className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors text-center">
            <Store className="w-4 h-4" />
            Voir la boutique
          </Link>
        }>
          <BoutiqueLink slug={boutiqueSlug}
            className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors text-center">
            <Store className="w-4 h-4" />
            Voir la boutique
          </BoutiqueLink>
        </Suspense>
      </div>

      {checkoutOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4" onClick={() => setCheckoutOpen(false)}>
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto text-gray-900" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Vos informations</h2>
              <button onClick={() => setCheckoutOpen(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-4 mb-4">
              <input value={customerName} onChange={e => setCustomerName(e.target.value)}
                placeholder="Votre nom *" required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-orange" />
              <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
                placeholder="Votre téléphone *" type="tel" required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-orange" />
              <input value={customerAddress} onChange={e => setCustomerAddress(e.target.value)}
                placeholder="Adresse / quartier (optionnel)"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-orange" />
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">Mode de paiement</p>
                <div className="grid grid-cols-3 gap-2">
                  {['Wave', 'Orange Money', 'Cash'].map(m => (
                    <button key={m} onClick={() => setPaymentMethod(m)}
                      className="py-2.5 text-xs font-semibold rounded-xl border transition-colors"
                      style={paymentMethod === m
                        ? { backgroundColor: accent, color: '#fff', borderColor: accent }
                        : { borderColor: '#E5E7EB', color: '#6B7280' }}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Notes ou instructions (optionnel)" rows={2}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-orange resize-none" />
              <div className="flex justify-between text-lg font-bold border-t border-gray-100 pt-3">
                <span>Total</span>
                <span style={{ color: accent }}>{formatPrice(total)}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setCheckoutOpen(false)}
                className="flex-1 border border-gray-200 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-50">
                Retour
              </button>
              <button onClick={sendWhatsApp} disabled={!customerName || !customerPhone || sending}
                className="flex-1 py-3 rounded-xl font-bold text-white disabled:opacity-50 transition-opacity hover:opacity-90"
                style={{ backgroundColor: accent }}>
                {sending ? 'Envoi...' : 'Envoyer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
