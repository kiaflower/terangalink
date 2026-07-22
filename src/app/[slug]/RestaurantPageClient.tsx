'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { Restaurant, MenuCategory, ProductWithVariants } from '@/lib/types'
import { usePersistedCart } from '@/hooks/usePersistedCart'
import { formatPrice, buildWhatsAppMessage } from '@/lib/utils'
import { getOpenStatus, type OpenStatus } from '@/lib/openingHours'
import {
  ShoppingBag, ShoppingCart, MessageCircle, Star, ArrowLeft,
  Phone, Share2, QrCode, X, Truck, Package, Download, Menu, Heart,
  CheckCircle2,
} from 'lucide-react'
import { FavoriteButton } from '@/components/restaurant/FavoriteButton'
import { ImageLightbox } from '@/components/ui/ImageLightbox'
import { ProductGallery } from '@/components/product/ProductGallery'
import { ScrollableDescription } from '@/components/product/ScrollableDescription'
import { LowStockNotice } from '@/components/product/LowStockNotice'
import { VerifiedBadge } from '@/components/ui/VerifiedBadge'
import { FounderBadge } from '@/components/ui/FounderBadge'
import { Logo } from '@/components/ui/Logo'
import { canUseFeature, type PlanKey } from '@/lib/plans'
import { getRestaurantTheme } from '@/lib/theme'
import { createClient } from '@/lib/supabase/client'
import type { RestaurantStory } from '@/lib/types'
import { getViewedStoryIds, STORIES_VIEWED_EVENT } from '@/lib/storyStorage'
import { StoryViewer } from '@/components/stories/StoryViewer'
import { getOrCreateSessionId } from '@/lib/analytics/sessionId'
import { getUnitPrice, getPriceInfo } from '@/lib/pricing'

interface Review {
  id: string
  customer_name: string | null
  rating: number
  comment: string | null
  created_at: string
}

interface Banner {
  id: string
  text: string
}

interface Props {
  restaurant: Restaurant
  categories: MenuCategory[]
  products: ProductWithVariants[]
  reviews?: Review[]
  fromAnnuaire?: boolean
  plan?: PlanKey
  banners?: Banner[]
  // Mode utilisé par le mockup animé de /pour-les-restaurants : désactive les effets de
  // bord réels (commande créée en base, ouverture WhatsApp) puisque la démo boucle seule.
  previewMode?: boolean
  demoHomeHref?: string
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743l-.002-.001.002.001a2.895 2.895 0 0 1 3.183-4.51v-3.5a6.329 6.329 0 0 0-5.394 10.692 6.33 6.33 0 0 0 10.857-4.424V8.687a8.182 8.182 0 0 0 4.773 1.526V6.79a4.831 4.831 0 0 1-1.003-.104z"/>
    </svg>
  )
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
    </svg>
  )
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
    </svg>
  )
}

function SnapchatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2c2.6 0 4.6 2.1 4.5 4.9l-.1 2.2c0 .3.2.4.4.5.3.1.9 0 1.3-.2.2-.1.5-.1.6.1.2.3.1.7-.3 1-.5.4-1.3.8-1.7 1 0 .3.1.6.3.9.4.9 1.5 1.5 2.6 1.7.2 0 .4.2.3.5-.1.5-.9.8-1.5 1-.2 0-.3.2-.3.4 0 .2 0 .5-.1.7-.1.2-.3.2-.5.2-.4 0-.9-.1-1.5 0-.5.1-.8.5-1.6 1-.7.5-1.5.9-2.6.9-1 0-1.9-.4-2.6-.9-.8-.5-1.1-.9-1.6-1-.6-.1-1.1 0-1.5 0-.2 0-.4 0-.5-.2-.1-.2-.1-.5-.1-.7 0-.2-.1-.4-.3-.4-.6-.2-1.4-.5-1.5-1-.1-.3.1-.5.3-.5 1.1-.2 2.2-.8 2.6-1.7.2-.3.3-.6.3-.9-.4-.2-1.2-.6-1.7-1-.4-.3-.5-.7-.3-1 .1-.2.4-.2.6-.1.4.2 1 .3 1.3.2.2-.1.4-.2.4-.5l-.1-2.2C7.4 4.1 9.4 2 12 2z"/>
    </svg>
  )
}

function ReviewCard({ review, accent, cardBg, cardBorder, pageText, subtleText }: {
  review: Review
  accent: string
  cardBg: string
  cardBorder: string
  pageText: string
  subtleText: string
}) {
  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}` }}>
      <div className="flex gap-0.5 mb-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
        ))}
      </div>
      {review.comment && (
        <p className="text-sm mb-4 leading-relaxed" style={{ color: subtleText }}>{review.comment}</p>
      )}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
          style={{ backgroundColor: accent }}>
          {review.customer_name?.charAt(0) ?? '?'}
        </div>
        <p className="text-sm font-semibold" style={{ color: pageText }}>{review.customer_name ?? 'Client'}</p>
      </div>
    </div>
  )
}

export default function RestaurantPageClient({ restaurant, categories, products, reviews = [], fromAnnuaire, plan = 'starter', banners = [], previewMode = false, demoHomeHref = '/' }: Props) {
  const { accent, theme, isDark, isVibrant, pageBg, pageText, cardBg, cardBorder, subtleText } = getRestaurantTheme(restaurant)
  // Boucle d'acquisition "Propulsé par TerangaLink" (Free/Starter) : le lien
  // porte le code de parrainage du restaurant, réutilisant le système de
  // parrainage existant (dashboard/restaurant/parrainage) pour récompenser la
  // restaurant d'origine si le clic mène à une inscription payante.
  const referralUrl = restaurant.referral_code
    ? `https://teranga-link.com/inscription?ref=${restaurant.referral_code}`
    : 'https://teranga-link.com'
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const { cart, setCart, clearCart } = usePersistedCart(restaurant.slug)
  const [cartOpen, setCartOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<ProductWithVariants | null>(null)
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({})
  const [selectedQuantity, setSelectedQuantity] = useState(1)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('Wave')
  const [notes, setNotes] = useState('')
  const [promoCodeInput, setPromoCodeInput] = useState('')
  const [appliedPromo, setAppliedPromo] = useState<{ promo_code_id: string; code: string; discount_amount: number } | null>(null)
  const [promoError, setPromoError] = useState<string | null>(null)
  const [promoLoading, setPromoLoading] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [previewSent, setPreviewSent] = useState(false)
  const [showAllReviews, setShowAllReviews] = useState(false)
  const [openStatus, setOpenStatus] = useState<OpenStatus | null>(null)
  const [now, setNow] = useState<number | null>(null)
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0)
  const [announcementZoomOpen, setAnnouncementZoomOpen] = useState(false)
  const [stories, setStories] = useState<RestaurantStory[]>([])
  const [storiesViewerOpen, setStoriesViewerOpen] = useState(false)
  const [viewedStoryIds, setViewedStoryIds] = useState<Set<string>>(() => new Set())
  const qrRef = useRef<HTMLCanvasElement>(null)
  const activeBanners = banners
  const restaurantUrl = typeof window !== 'undefined' ? `${window.location.origin}/${restaurant.slug}` : `https://teranga-link.com/${restaurant.slug}`

  useEffect(() => {
    function refresh() {
      setOpenStatus(getOpenStatus(restaurant.opening_hours))
      setNow(Date.now())
    }
    refresh()
    const interval = setInterval(refresh, 60000)
    return () => clearInterval(interval)
  }, [restaurant])

  useEffect(() => {
    if (!canUseFeature(plan, 'stories')) return
    const supabase = createClient()
    supabase.from('restaurant_stories').select('*').eq('restaurant_id', restaurant.id)
      .gt('expires_at', new Date().toISOString()).order('created_at', { ascending: true })
      .then(({ data }) => setStories(data ?? []))
    setViewedStoryIds(getViewedStoryIds())
  }, [restaurant.id, plan])

  useEffect(() => {
    function onViewedChanged() { setViewedStoryIds(getViewedStoryIds()) }
    window.addEventListener(STORIES_VIEWED_EVENT, onViewedChanged)
    return () => window.removeEventListener(STORIES_VIEWED_EVENT, onViewedChanged)
  }, [])

  const allStoriesViewed = stories.length > 0 && stories.every(s => viewedStoryIds.has(s.id))

  useEffect(() => {
    if (activeBanners.length <= 1) return
    const interval = setInterval(() => {
      setCurrentBannerIndex(i => (i + 1) % activeBanners.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [activeBanners.length])

  const filteredProducts = activeCategory
    ? products.filter(p => p.category_id === activeCategory)
    : products

  const heroProduct = products.find(p => p.image_url) ?? null
  const cartTotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  const REVIEWS_PER_PAGE = 3
  const visibleReviews = reviews.slice(0, REVIEWS_PER_PAGE)
  const hasMoreReviews = reviews.length > REVIEWS_PER_PAGE
  const avgRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : null

  function isPreorderActive(product: ProductWithVariants): boolean {
    if (!product.preorder_enabled || now === null) return false
    if (product.preorder_start && now < new Date(product.preorder_start).getTime()) return false
    if (product.preorder_end && now > new Date(product.preorder_end).getTime()) return false
    return true
  }

  useEffect(() => {
    if (qrOpen && qrRef.current) {
      import('qrcode').then(QRCode => {
        QRCode.toCanvas(qrRef.current!, restaurantUrl, { width: 200, color: { dark: accent, light: '#ffffff' } })
      })
    }
  }, [qrOpen, restaurantUrl, accent])

  function trackEvent(eventType: string, itemId?: string, itemName?: string) {
    if (previewMode) return
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurant_id: restaurant.id, event_type: eventType, item_id: itemId, item_name: itemName,
        session_id: getOrCreateSessionId(restaurant.slug),
      }),
    }).catch(() => {})
  }

  function addToCart(product: ProductWithVariants, variants: Record<string, string> = {}, quantity: number = 1) {
    const unitPrice = getUnitPrice(product, variants)
    trackEvent('add_to_cart', product.id, product.name)
    setCart(prev => {
      const key = product.id + JSON.stringify(variants)
      const existing = prev.find(i => i.product.id + JSON.stringify(i.selectedVariants ?? {}) === key)
      if (existing) {
        return prev.map(i => i.product.id + JSON.stringify(i.selectedVariants ?? {}) === key ? { ...i, quantity: i.quantity + quantity } : i)
      }
      return [...prev, { product, quantity, selectedVariants: variants, unitPrice }]
    })
  }

  function removeFromCart(index: number) {
    setCart(prev => {
      const next = prev.filter((_, i) => i !== index)
      // Panier volontairement vidé (dernier article retiré sans commander) —
      // à exclure du calcul d'abandon de panier.
      if (next.length === 0 && prev.length > 0) trackEvent('cart_cleared')
      return next
    })
  }

  function openProduct(product: ProductWithVariants) {
    setSelectedProduct(product)
    setSelectedVariants({})
    setSelectedQuantity(1)
  }

  async function handleShare() {
    const url = restaurantUrl
    if (navigator.share) {
      try { await navigator.share({ title: restaurant.name, text: `Découvrez ${restaurant.name} sur TerangaLink`, url }) } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    }
  }

  function downloadQr() {
    if (!qrRef.current) return
    const a = document.createElement('a')
    a.href = qrRef.current.toDataURL()
    a.download = `qr-${restaurant.slug}.png`
    a.click()
  }

  async function applyPromoCode() {
    if (!promoCodeInput.trim()) return
    setPromoLoading(true)
    setPromoError(null)
    try {
      const res = await fetch('/api/promo-codes/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurant_id: restaurant.id, code: promoCodeInput.trim(), subtotal: cartTotal }),
      })
      const data = await res.json()
      if (!res.ok) {
        setPromoError(data.error || 'Code promo invalide')
        setAppliedPromo(null)
        return
      }
      setAppliedPromo(data)
    } catch {
      setPromoError('Erreur lors de la vérification du code')
    } finally {
      setPromoLoading(false)
    }
  }

  async function sendWhatsApp() {
    if (previewMode) {
      setCheckoutOpen(false)
      clearCart()
      setPromoCodeInput('')
      setAppliedPromo(null)
      setPromoError(null)
      setPreviewSent(true)
      setTimeout(() => setPreviewSent(false), 2200)
      return
    }
    trackEvent('whatsapp_click')
    // Ouvrir l'onglet tout de suite (synchrone, dans le geste utilisateur) pour éviter
    // que le navigateur bloque le popup après l'await du fetch de commande ci-dessous.
    const waWindow = window.open('', '_blank')
    const items = cart.map(item => {
      const isPreorder = isPreorderActive(item.product)
      return {
        product_id: item.product.id,
        name: item.product.name,
        quantity: item.quantity,
        price: item.unitPrice,
        variants: item.selectedVariants,
        isPreorder,
        preorderDeliveryDate: isPreorder ? item.product.preorder_delivery_date ?? undefined : undefined,
        preorderNote: isPreorder && item.product.preorder_delivery_date
          ? `Précommande — livraison prévue : ${item.product.preorder_delivery_date}`
          : undefined,
      }
    })
    let dashboardUrl: string | undefined
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: restaurant.id, customer_name: customerName, customer_phone: customerPhone, customer_address: customerAddress,
          items, total: cartTotal, notes, payment_method: paymentMethod, promo_code_id: appliedPromo?.promo_code_id,
        }),
      })
      if (res.ok) {
        const order = await res.json()
        if (order?.dashboard_url) dashboardUrl = order.dashboard_url
      }
    } catch { /* continue without dashboard link */ }
    const message = buildWhatsAppMessage(restaurant.name, items, cartTotal, customerName, customerPhone, {
      notes,
      address: customerAddress,
      dashboardUrl,
      paymentMethod,
      promo: appliedPromo ? { code: appliedPromo.code, discountAmount: appliedPromo.discount_amount } : undefined,
    })
    const waUrl = `https://wa.me/${restaurant.whatsapp_number.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
    if (waWindow) waWindow.location.href = waUrl
    else window.open(waUrl, '_blank')
    setCheckoutOpen(false)
    clearCart()
    setPromoCodeInput('')
    setAppliedPromo(null)
    setPromoError(null)
  }

  function sendAnnouncementWhatsApp() {
    const title = restaurant.announcement_title?.trim()
    const message = title
      ? `Bonjour, je souhaite obtenir plus d'infos sur : ${title} - ${restaurant.name}`
      : `Bonjour, je souhaite obtenir plus d'infos sur votre annonce - ${restaurant.name}`
    const waUrl = `https://wa.me/${restaurant.whatsapp_number.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
    window.open(waUrl, '_blank')
  }

  const navLinks = [
    { href: '#accueil', label: 'Accueil' },
    ...(restaurant.description ? [{ href: '#apropos', label: 'À propos' }] : []),
    ...(categories.length > 0 ? [{ href: '#categories', label: 'Catégories' }] : []),
    { href: '#plats', label: 'Articles' },
    ...(reviews.length > 0 ? [{ href: '#avis', label: 'Avis' }] : []),
    { href: '#contact', label: 'Contact' },
  ]

  return (
    <div className="min-h-screen" style={{ backgroundColor: pageBg, color: pageText }}>

      {/* Demo banner */}
      {restaurant.is_demo && (
        <div className="sticky top-0 z-50 flex items-center justify-between px-4 text-white text-xs font-semibold"
          style={{ height: 40, backgroundColor: '#111111' }}>
          <Link href={demoHomeHref} className="hover:underline">← Accueil</Link>
          <span className="hidden sm:inline">Ceci est une démo TerangaLink</span>
          <Link href="/inscription" className="hover:underline">Créer mon restaurant →</Link>
        </div>
      )}

      {/* Sticky nav */}
      <header className="sticky z-40" style={{ top: restaurant.is_demo ? 40 : 0, backgroundColor: pageBg, borderBottom: `1px solid ${cardBorder}` }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => stories.length > 0 && setStoriesViewerOpen(true)}
              aria-label={stories.length > 0 ? 'Voir les stories' : restaurant.name}
              className="rounded-lg flex-shrink-0"
              style={stories.length > 0 ? {
                padding: 2,
                background: allStoriesViewed ? '#D1D5DB' : 'linear-gradient(45deg, #F59E0B, #EC4899, #F97316)',
                cursor: 'pointer',
              } : undefined}
            >
              {restaurant.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={restaurant.logo_url} alt={restaurant.name} className="w-9 h-9 rounded-lg object-cover" />
              ) : (
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                  style={{ backgroundColor: accent }}>
                  {restaurant.name.charAt(0)}
                </div>
              )}
            </button>
            <div>
              <p className="font-bold text-sm leading-tight" style={{ color: pageText }}>{restaurant.name}</p>
              <p className="text-[10px] uppercase tracking-wider" style={{ color: subtleText }}>{restaurant.cuisine_type}</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map(l => (
              <a key={l.href} href={l.href} className="text-sm transition-colors" style={{ color: subtleText }}>{l.label}</a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {restaurant.whatsapp_number && (
              <a href={`tel:${restaurant.whatsapp_number.replace(/\D/g, '')}`}
                className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
                style={{ border: `1px solid ${cardBorder}` }}
                aria-label="Appeler">
                <Phone className="w-4 h-4" style={{ color: pageText }} />
              </a>
            )}
            <button onClick={handleShare}
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
              style={{ border: `1px solid ${cardBorder}` }}
              aria-label="Partager">
              <Share2 className="w-4 h-4" style={{ color: pageText }} />
            </button>
            {canUseFeature(plan, 'qrCode') && (
              <button onClick={() => setQrOpen(true)}
                className="flex w-9 h-9 rounded-lg items-center justify-center transition-colors"
                style={{ border: `1px solid ${cardBorder}` }}
                aria-label="QR Code">
                <QrCode className="w-4 h-4" style={{ color: pageText }} />
              </button>
            )}
            <Link href={plan === 'free' ? '/favoris?src=free' : '/favoris'}
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
              style={{ border: `1px solid ${cardBorder}` }}
              aria-label="Mes favoris">
              <Heart className="w-4 h-4" style={{ color: pageText }} />
            </Link>
            <button
              onClick={() => setCartOpen(true)}
              className="hidden sm:inline-flex items-center px-5 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: accent }}>
              {cartCount > 0 ? `Mon panier (${cartCount})` : 'Mon panier'}
            </button>
            <button className="md:hidden p-2" style={{ color: pageText }} onClick={() => setMobileNavOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile nav overlay */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: pageBg }}>
          <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: `1px solid ${cardBorder}` }}>
            <span className="font-bold text-lg" style={{ color: pageText }}>{restaurant.name}</span>
            <button onClick={() => setMobileNavOpen(false)}><X className="w-5 h-5" style={{ color: pageText }} /></button>
          </div>
          <nav className="flex flex-col gap-1 p-6">
            {navLinks.map(l => (
              <a key={l.href} href={l.href} onClick={() => setMobileNavOpen(false)}
                className="py-3 text-base font-medium" style={{ color: pageText, borderBottom: `1px solid ${cardBorder}` }}>{l.label}</a>
            ))}
            <Link href={plan === 'free' ? '/favoris?src=free' : '/favoris'} onClick={() => setMobileNavOpen(false)}
              className="py-3 text-base font-medium flex items-center gap-2" style={{ color: pageText, borderBottom: `1px solid ${cardBorder}` }}>
              <Heart className="w-4 h-4" /> Mes favoris
            </Link>
          </nav>
        </div>
      )}

      {/* Back to annuaire strip */}
      {fromAnnuaire && (
        <div className="border-b border-gray-100 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2">
            <Link href="/restaurants" className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              Retour à l&apos;annuaire
            </Link>
          </div>
        </div>
      )}

      {/* Hero */}
      {(
          <section id="accueil" className="relative h-64 sm:h-80 overflow-hidden">
            {restaurant.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={restaurant.cover_url} alt={restaurant.name} className="w-full h-full object-cover" />
            ) : heroProduct?.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={heroProduct.image_url} alt={restaurant.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full" style={{ backgroundColor: accent }} />
            )}
            <div className="absolute inset-0 bg-black/45" />
            {!canUseFeature(plan, 'suppressionBranding') && !previewMode && !restaurant.is_demo && (
              <a href={referralUrl} target="_blank" rel="noopener noreferrer"
                className="absolute top-4 right-4 opacity-40 hover:opacity-70 transition-opacity"
                aria-label="Propulsé par TerangaLink">
                <Logo iconClassName="w-7 h-7 sm:w-8 sm:h-8" showText={false} />
              </a>
            )}
            <div className="absolute inset-0 flex flex-col justify-end px-6 pb-8">
              {restaurant.cuisine_type && (
                <p className="text-xs font-bold uppercase tracking-widest text-white/70 mb-1">{restaurant.cuisine_type}</p>
              )}
              <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight mb-2 flex items-center gap-3 flex-wrap">
                {restaurant.name}
                {restaurant.is_verified && (
                  <span className="inline-flex align-middle text-xs font-bold px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-sm">
                    <VerifiedBadge className="text-white" />
                  </span>
                )}
                {restaurant.is_founder && (
                  <span className="inline-flex align-middle text-xs font-bold px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-sm">
                    <FounderBadge className="text-white" />
                  </span>
                )}
              </h1>
              {restaurant.description && (
                <p className="text-white/75 text-sm leading-relaxed max-w-lg">{restaurant.description}</p>
              )}
              {openStatus && (
                <div className="mt-3">
                  {openStatus.isOpen ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-green-500/20 text-green-300 border border-green-400/30 backdrop-blur-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                      {openStatus.label}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-red-500/20 text-red-300 border border-red-400/30 backdrop-blur-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                      {openStatus.label}
                    </span>
                  )}
                </div>
              )}
            </div>
          </section>
      )}

      {/* Bannière d'annonce (générique : validation panier, promo, événement...) — Starter/Pro */}
      {canUseFeature(plan, 'annonce') && restaurant.announcement_enabled && restaurant.announcement_image_url && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
          <button
            type="button"
            onClick={() => setAnnouncementZoomOpen(true)}
            className="relative block w-full aspect-[3/1] rounded-2xl overflow-hidden"
            aria-label="Voir l'annonce en grand"
          >
            <Image
              src={restaurant.announcement_image_url}
              alt={restaurant.announcement_title?.trim() || `Annonce spéciale ${restaurant.name}`}
              fill
              sizes="(max-width: 768px) 100vw, 1200px"
              priority
              className="object-cover"
            />
          </button>
        </section>
      )}

      {/* Bannières promotionnelles (Starter/Pro) */}
      {activeBanners.length > 0 && (
        <div className="px-4 sm:px-6 py-2">
          <div className="rounded-xl px-4 py-2.5 text-sm font-semibold text-center text-white"
            style={{ backgroundColor: accent }}>
            {activeBanners[currentBannerIndex]?.text}
          </div>
        </div>
      )}

      {/* Link copié toast */}
      {copiedLink && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm px-4 py-2 rounded-xl shadow-lg">
          Lien copié
        </div>
      )}

      {/* Confirmation envoi (mode démo — aucune commande réelle n'est créée) */}
      {previewSent && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center gap-5 px-8 text-center">
          <CheckCircle2 className="w-20 h-20 text-green-500" strokeWidth={1.5} />
          <p className="text-2xl font-bold text-green-600 leading-snug">Commande envoyée sur WhatsApp</p>
        </div>
      )}

      {/* Categories */}
      {categories.length > 0 && (
        <section id="categories" className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <h2 className="text-xl sm:text-2xl font-bold text-center mb-6" style={{ color: pageText }}>Catégories</h2>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1 -mx-4 sm:-mx-6 px-4 sm:px-6">
            <button onClick={() => setActiveCategory(null)}
              className="flex-shrink-0 px-5 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors"
              style={activeCategory === null ? { backgroundColor: accent, color: '#FFFFFF' } : { backgroundColor: '#F3F4F6', color: '#374151' }}>
              Tous
            </button>
            {categories.map(cat => (
              <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                className="flex-shrink-0 px-5 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors"
                style={activeCategory === cat.id ? { backgroundColor: accent, color: '#FFFFFF' } : { backgroundColor: '#F3F4F6', color: '#374151' }}>
                {cat.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Products */}
      <section id="plats" className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <h2 className="text-xl sm:text-2xl font-bold text-center mb-8" style={{ color: pageText }}>Articles</h2>
        {filteredProducts.length === 0 ? (
          <div className="text-center py-20 text-gray-400">Aucun plat disponible</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-5">
            {filteredProducts.map(product => (
              <div key={product.id} className="rounded-2xl overflow-hidden hover:shadow-md transition-shadow group" style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}` }}>
                <Link
                  href={`/${restaurant.slug}/plat/${product.slug}`}
                  onClick={e => {
                    if (e.metaKey || e.ctrlKey || e.shiftKey) return
                    e.preventDefault()
                    openProduct(product)
                  }}
                  className="block w-full cursor-pointer"
                >
                  <div className="aspect-square overflow-hidden bg-gray-50 relative">
                    <FavoriteButton
                      productId={product.id}
                      restaurantSlug={restaurant.slug}
                      restaurantName={restaurant.name}
                      name={product.name}
                      imageUrl={product.image_url}
                      price={product.price}
                    />
                    {(product.is_featured && product.badge_text || isPreorderActive(product)) && (
                      <div className="absolute top-2 left-2 z-10 flex flex-col items-start gap-1">
                        {product.is_featured && product.badge_text && (
                          <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full text-white"
                            style={{ backgroundColor: accent }}>
                            {product.badge_text}
                          </span>
                        )}
                        {isPreorderActive(product) && (
                          <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full text-white"
                            style={{ backgroundColor: accent }}>
                            Précommande
                          </span>
                        )}
                      </div>
                    )}
                    {product.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.image_url} alt={product.name} loading="lazy" decoding="async"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-8 h-8 text-gray-300" />
                      </div>
                    )}
                  </div>
                </Link>
                <div className="p-3">
                  <h3 className="text-sm font-semibold truncate" style={{ color: pageText }}>{product.name}</h3>
                  {(() => {
                    const info = getPriceInfo(product)
                    if (info.hasRange) {
                      return <p className="text-sm font-bold mt-1" style={{ color: accent }}>À partir de {formatPrice(info.min)}</p>
                    }
                    return (
                      <p className="mt-1 flex items-center gap-1.5 flex-wrap">
                        {info.hasDiscount && (
                          <span className="text-xs line-through" style={{ color: subtleText }}>{formatPrice(product.price)}</span>
                        )}
                        <span className="text-sm font-bold" style={{ color: accent }}>{formatPrice(info.basePrice)}</span>
                      </p>
                    )
                  })()}
                  <button
                    onClick={() => openProduct(product)}
                    className="mt-2.5 w-full flex items-center justify-center gap-1.5 text-xs font-bold py-2 rounded-lg text-white transition-opacity hover:opacity-90"
                    style={{ backgroundColor: accent }}>
                    <ShoppingBag className="w-3.5 h-3.5" />
                    Ajouter
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Delivery info */}
      {restaurant.show_delivery_info && restaurant.delivery_info && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="rounded-2xl p-5 sm:p-6 flex items-center gap-4" style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}` }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${accent}15` }}>
              <Truck className="w-5 h-5" style={{ color: accent }} />
            </div>
            <div>
              <p className="font-semibold text-sm" style={{ color: pageText }}>Livraison</p>
              <p className="text-xs" style={{ color: subtleText }}>{restaurant.delivery_info}</p>
            </div>
          </div>
        </section>
      )}

      {/* Reviews */}
      {reviews.length > 0 && (
        <section id="avis" className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <div className="text-center mb-8">
            <h2 className="text-xl sm:text-2xl font-bold" style={{ color: pageText }}>Avis clients</h2>
            {avgRating !== null && (
              <div className="flex items-center justify-center gap-1.5 mt-2">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`w-4 h-4 ${i < Math.round(avgRating) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
                  ))}
                </div>
                <span className="text-sm" style={{ color: subtleText }}>{avgRating.toFixed(1)} ({reviews.length} avis)</span>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {visibleReviews.map(review => (
              <ReviewCard key={review.id} review={review} accent={accent} cardBg={cardBg} cardBorder={cardBorder} pageText={pageText} subtleText={subtleText} />
            ))}
          </div>
          {hasMoreReviews && (
            <div className="text-center mt-6">
              <button onClick={() => setShowAllReviews(true)}
                className="text-sm font-semibold underline"
                style={{ color: accent }}>
                Voir les {reviews.length - REVIEWS_PER_PAGE} autres avis
              </button>
            </div>
          )}
        </section>
      )}

      {showAllReviews && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4" onClick={() => setShowAllReviews(false)}>
          <div className="bg-white rounded-2xl max-h-[80vh] overflow-y-auto w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg text-gray-900">Tous les avis ({reviews.length})</h2>
              <button onClick={() => setShowAllReviews(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              {reviews.map(review => (
                <ReviewCard key={review.id} review={review} accent={accent} cardBg="#FFFFFF" cardBorder="#E5E7EB" pageText="#111111" subtleText="#6B7280" />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer restaurant */}
      <footer id="contact" className="mt-12" style={{ backgroundColor: cardBg, borderTop: `1px solid ${cardBorder}` }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 sm:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              {restaurant.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={restaurant.logo_url} alt="" loading="lazy" decoding="async" className="w-8 h-8 rounded-lg object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: accent }}>
                  {restaurant.name.charAt(0)}
                </div>
              )}
              <span className="font-bold text-sm" style={{ color: pageText }}>{restaurant.name}</span>
            </div>
            <p className="text-xs mb-4" style={{ color: subtleText }}>Des plats de qualité, un service de confiance.</p>
            <div className="flex gap-2">
              {restaurant.facebook_url && (
                <a href={restaurant.facebook_url} target="_blank" rel="noopener noreferrer"
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                  style={{ border: `1px solid ${cardBorder}`, color: pageText }}>
                  <FacebookIcon className="w-3.5 h-3.5" />
                </a>
              )}
              {restaurant.instagram_url && (
                <a href={restaurant.instagram_url} target="_blank" rel="noopener noreferrer"
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                  style={{ border: `1px solid ${cardBorder}`, color: pageText }}>
                  <InstagramIcon className="w-3.5 h-3.5" />
                </a>
              )}
              {restaurant.tiktok_url && (
                <a href={restaurant.tiktok_url} target="_blank" rel="noopener noreferrer"
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                  style={{ border: `1px solid ${cardBorder}`, color: pageText }}>
                  <TikTokIcon className="w-3.5 h-3.5" />
                </a>
              )}
              {restaurant.snapchat_url && (
                <a href={restaurant.snapchat_url} target="_blank" rel="noopener noreferrer"
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                  style={{ border: `1px solid ${cardBorder}`, color: pageText }}>
                  <SnapchatIcon className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>

          <div>
            <p className="font-semibold text-sm mb-3" style={{ color: pageText }}>Menu</p>
            <div className="flex flex-col gap-2">
              {navLinks.map(l => (
                <a key={l.href} href={l.href} className="text-xs transition-colors" style={{ color: subtleText }}>{l.label}</a>
              ))}
            </div>
          </div>

          <div>
            <p className="font-semibold text-sm mb-3" style={{ color: pageText }}>Contact</p>
            <div className="space-y-2">
              {restaurant.whatsapp_number && (
                <a href={`https://wa.me/${restaurant.whatsapp_number.replace(/\D/g, '')}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-xs flex items-center gap-1.5" style={{ color: subtleText }}>
                  <MessageCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  {restaurant.whatsapp_number}
                </a>
              )}
              {restaurant.phone && restaurant.phone !== restaurant.whatsapp_number && (
                <a href={`tel:${restaurant.phone}`} className="text-xs flex items-center gap-1.5" style={{ color: subtleText }}>
                  <Phone className="w-3.5 h-3.5 flex-shrink-0" />{restaurant.phone}
                </a>
              )}
              <a
                href={`https://www.google.com/maps/search/${encodeURIComponent((restaurant.city ?? 'Dakar') + ', Sénégal')}`}
                target="_blank" rel="noopener noreferrer"
                className="text-xs flex items-center gap-1.5" style={{ color: subtleText }}>
                <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
                {restaurant.city ?? 'Dakar'}, Sénégal
              </a>
            </div>
          </div>
        </div>

        <div className="py-4 text-center" style={{ borderTop: `1px solid ${cardBorder}` }}>
          <p className="text-xs" style={{ color: subtleText }}>
            © 2026 {restaurant.name}. Tous droits réservés.
          </p>
        </div>

        {!canUseFeature(plan, 'suppressionBranding') && !restaurant.is_demo && (
          <div className="text-center py-3" style={{ borderTop: `1px solid ${cardBorder}` }}>
            <a href={referralUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs transition-colors" style={{ color: subtleText }}>
              Propulsé par
              <Logo iconClassName="w-4 h-4" textClassName="font-bold" textStyle={{ color: '#F97316' }} />
            </a>
          </div>
        )}
      </footer>

      {/* Floating cart */}
      {cartCount > 0 && !cartOpen && (
        <div className="fixed bottom-6 left-0 right-0 z-40 flex justify-center px-4">
          <button onClick={() => setCartOpen(true)}
            className="text-white px-6 py-4 rounded-2xl shadow-lg font-semibold flex items-center gap-3 hover:opacity-90 transition-opacity"
            style={{ backgroundColor: accent }}>
            <ShoppingCart className="w-5 h-5" /> {cartCount} article{cartCount > 1 ? 's' : ''} · {formatPrice(cartTotal)}
          </button>
        </div>
      )}

      {/* Product modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            {(() => {
              const images = selectedProduct.images_urls?.length ? selectedProduct.images_urls : (selectedProduct.image_url ? [selectedProduct.image_url] : [])
              if (images.length === 0) return null
              let variantImage: string | null = null
              if (selectedProduct.variants) {
                for (const v of selectedProduct.variants) {
                  const chosen = selectedVariants[v.name]
                  const img = chosen ? v.option_images?.[chosen] : undefined
                  if (img) { variantImage = img; break }
                }
              }
              return (
                <ProductGallery
                  key={selectedProduct.id}
                  variant="modal"
                  images={images}
                  videoUrl={selectedProduct.video_url}
                  variantImage={variantImage}
                  productName={selectedProduct.name}
                  cardBg="#F9FAFB"
                />
              )
            })()}
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900">{selectedProduct.name}</h2>
              {selectedProduct.description && (
                <ScrollableDescription text={selectedProduct.description} textColor="#6B7280" bgColor="#ffffff" />
              )}
              <div className="flex items-center gap-2 mt-4 flex-wrap">
                {selectedProduct.discount_percent ? (
                  <span className="text-sm line-through text-gray-400">{formatPrice(selectedProduct.price)}</span>
                ) : null}
                <p className="text-2xl font-bold" style={{ color: accent }}>{formatPrice(getUnitPrice(selectedProduct, selectedVariants))}</p>
                {selectedProduct.discount_percent ? (
                  <span className="text-xs font-semibold text-green-600">-{selectedProduct.discount_percent}%</span>
                ) : null}
              </div>
              <LowStockNotice trackStock={selectedProduct.track_stock} stockQuantity={selectedProduct.stock_quantity} className="mt-1.5 text-xs font-semibold text-orange-500" />
              {selectedProduct.variants && selectedProduct.variants.length > 0 && (
                <div className="mt-4 space-y-3">
                  {selectedProduct.variants.map(variant => (
                    <div key={variant.id}>
                      <p className="text-sm font-medium text-gray-700 mb-2">{variant.name}</p>
                      <div className="flex gap-2 flex-wrap">
                        {variant.options.map((opt: string) => {
                          const optPrice = variant.option_prices?.[opt]
                          return (
                            <button key={opt}
                              onClick={() => setSelectedVariants(prev => ({ ...prev, [variant.name]: opt }))}
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
                  <button type="button" onClick={() => setSelectedQuantity(q => Math.max(1, q - 1))}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors font-bold">
                    −
                  </button>
                  <span className="w-6 text-center font-semibold text-gray-900">{selectedQuantity}</span>
                  <button type="button" onClick={() => setSelectedQuantity(q => q + 1)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors font-bold">
                    +
                  </button>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setSelectedProduct(null)}
                  className="flex-1 border border-gray-200 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-50">
                  Annuler
                </button>
                <button
                  onClick={() => { addToCart(selectedProduct, selectedVariants, selectedQuantity); setSelectedProduct(null) }}
                  className="flex-1 py-3 rounded-xl font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: accent }}>
                  Ajouter au panier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Zoom lightbox — bannière d'annonce */}
      {announcementZoomOpen && restaurant.announcement_image_url && (
        <ImageLightbox
          images={[restaurant.announcement_image_url]}
          index={0}
          alt={restaurant.announcement_title?.trim() || `Annonce spéciale ${restaurant.name}`}
          onClose={() => setAnnouncementZoomOpen(false)}
          footer={
            <button
              onClick={sendAnnouncementWhatsApp}
              className="w-full py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
              style={{ backgroundColor: accent }}
            >
              <MessageCircle className="w-5 h-5" />
              Obtenir plus d&apos;infos
            </button>
          }
        />
      )}

      {/* Cart drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end">
          <div className="bg-white w-full rounded-t-2xl p-6 max-h-[85vh] overflow-y-auto text-gray-900">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Votre panier</h2>
              <button onClick={() => setCartOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            {cart.length === 0 ? (
              <p className="text-center text-gray-400 py-10">Votre panier est vide</p>
            ) : (
              <>
                <div className="space-y-4 mb-6">
                  {cart.map((item, i) => (
                    <div key={i} className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.product.name}</p>
                        {item.selectedVariants && Object.keys(item.selectedVariants).length > 0 && (
                          <p className="text-xs text-gray-400">{Object.entries(item.selectedVariants).map(([k, v]) => `${k}: ${v}`).join(', ')}</p>
                        )}
                        <p className="text-sm font-semibold" style={{ color: accent }}>{formatPrice(item.unitPrice * item.quantity)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">×{item.quantity}</span>
                        <button onClick={() => removeFromCart(i)} className="text-red-400 hover:text-red-600 text-xs">Retirer</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-100 pt-4 mb-6">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span style={{ color: accent }}>{formatPrice(cartTotal)}</span>
                  </div>
                </div>
                <button onClick={() => { setCartOpen(false); setCheckoutOpen(true) }}
                  className="w-full py-4 rounded-2xl font-bold text-lg text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                  style={{ backgroundColor: accent }}>
                  Commander <MessageCircle className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Checkout modal */}
      {checkoutOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end">
          <div className="bg-white w-full rounded-t-2xl p-6 max-h-[90vh] overflow-y-auto text-gray-900">
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
              <div>
                {appliedPromo ? (
                  <div className="flex items-center justify-between border border-green-200 bg-green-50 rounded-xl px-4 py-3">
                    <span className="text-sm text-green-700 font-medium">Code {appliedPromo.code} appliqué (-{formatPrice(appliedPromo.discount_amount)})</span>
                    <button onClick={() => { setAppliedPromo(null); setPromoCodeInput('') }} className="text-green-700 hover:text-green-900">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input value={promoCodeInput} onChange={e => setPromoCodeInput(e.target.value)}
                      placeholder="Code promo (optionnel)"
                      className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-orange" />
                    <button onClick={applyPromoCode} disabled={promoLoading || !promoCodeInput.trim()}
                      className="px-4 py-3 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                      {promoLoading ? '...' : 'Appliquer'}
                    </button>
                  </div>
                )}
                {promoError && <p className="text-xs text-red-500 mt-1.5">{promoError}</p>}
              </div>
              <div className="border-t border-gray-100 pt-3 space-y-1">
                {appliedPromo && (
                  <>
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Sous-total</span>
                      <span>{formatPrice(cartTotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Réduction</span>
                      <span>-{formatPrice(appliedPromo.discount_amount)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span style={{ color: accent }}>{formatPrice(cartTotal - (appliedPromo?.discount_amount ?? 0))}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setCheckoutOpen(false)}
                className="flex-1 border border-gray-200 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-50">
                Retour
              </button>
              <button onClick={sendWhatsApp} disabled={!customerName || !customerPhone}
                className="flex-1 py-3 rounded-xl font-bold text-white disabled:opacity-50 transition-opacity hover:opacity-90"
                style={{ backgroundColor: accent }}>
                Envoyer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code modal */}
      {qrOpen && canUseFeature(plan, 'qrCode') && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-xs p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">QR Code — {restaurant.name}</h3>
              <button onClick={() => setQrOpen(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="flex flex-col items-center gap-4">
              <div className="bg-white p-4 rounded-2xl border border-gray-200">
                <canvas ref={qrRef} />
              </div>
              <p className="text-sm text-gray-600 text-center font-medium">Vous avez aimé nos articles ?<br/>Partagez les autour de vous&nbsp;!</p>
              <button onClick={downloadQr}
                className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: accent }}>
                <Download className="w-4 h-4" />
                Télécharger
              </button>
            </div>
          </div>
        </div>
      )}

      {storiesViewerOpen && stories.length > 0 && (
        <StoryViewer
          stories={stories}
          restaurantSlug={restaurant.slug}
          restaurantName={restaurant.name}
          restaurantLogoUrl={restaurant.logo_url}
          onClose={() => setStoriesViewerOpen(false)}
        />
      )}

    </div>
  )
}
