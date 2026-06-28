'use client'
import { FaSnapchatGhost } from 'react-icons/fa'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import {
  MapPin, Phone, Zap, Share2, PhoneCall, Truck, Home,
  Instagram, Facebook, Music2, UtensilsCrossed, LayoutGrid,
  Info, Clock, ChevronDown, ChevronUp, ShoppingCart
} from 'lucide-react'
import { MenuCard } from '@/components/restaurant/MenuCard'
import { CartDrawer, CartButton } from '@/components/cart/CartDrawer'
import { CartProvider, useCart } from '@/lib/hooks/useCart'
import { QRCodeButton } from '@/components/restaurant/QRCodeButton'
import { ProductModal } from '@/components/restaurant/ProductModal'
import { PromoBanners } from '@/components/restaurant/PromoBanners'
import { FullMenuDisplay } from '@/components/restaurant/FullMenuDisplay'
import { ReviewsSection } from '@/components/restaurant/ReviewsSection'
import {
  DEFAULT_BUTTON_COLOR, DEFAULT_DARK_BACKGROUND, DEFAULT_PRIMARY_COLOR,
  generateThemeTokens, themeToStyle, type RestaurantTheme
} from '@/lib/theme'
import { canUseFeature, normalizePlan, isPremiumPlan } from '@/lib/plans'
import { BackToAnnuaire } from '@/components/restaurant/BackToAnnuaire'
import type { RestaurantPageData, MenuItem } from '@/lib/types'
import type { Banner } from '@/components/restaurant/PromoBanners'

type RestaurantFull = RestaurantPageData['restaurant'] & {
  primary_color?: string | null
  background_color?: string | null
  theme_mode?: string | null
  button_color?: string | null
  facebook_url?: string | null
  instagram_url?: string | null
  tiktok_url?: string | null
  snapchat_url?: string | null
  whatsapp_number?: string | null
  opening_hours?: Record<string, { ouverture?: string; fermeture?: string; ferme?: boolean }> | null
  delivery_fee?: number | null
  show_delivery_fee?: boolean
  is_demo?: boolean
  plan?: string
  latitude?: number | null
  longitude?: number | null
  prep_time_minutes?: number | null
  email?: string | null
  // Premium
  banners?: Banner[]
  full_menu_image_url?: string | null
  show_full_menu?: boolean
}

interface Props {
  data: Omit<RestaurantPageData, 'restaurant'> & { restaurant: RestaurantFull }
}

const DAYS_FR: Record<string, string> = {
  lundi: 'Lundi', mardi: 'Mardi', mercredi: 'Mercredi',
  jeudi: 'Jeudi', vendredi: 'Vendredi', samedi: 'Samedi', dimanche: 'Dimanche'
}
const DAYS_ORDER = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

function isOpenNow(opening_hours?: Record<string, { ouverture?: string; fermeture?: string; ferme?: boolean }> | null): boolean {
  if (!opening_hours || Object.keys(opening_hours).length === 0) return true
  const jours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
  const now = new Date()
  const jour = jours[now.getDay()]
  const h = opening_hours[jour]
  if (!h || h.ferme) return false
  if (!h.ouverture || !h.fermeture) return true
  const [oh, om] = h.ouverture.split(':').map(Number)
  const [fh, fm] = h.fermeture.split(':').map(Number)
  const cur = now.getHours() * 60 + now.getMinutes()
  return cur >= oh * 60 + om && cur < fh * 60 + fm
}

function NavCartButton({ tokens }: { tokens: ReturnType<typeof generateThemeTokens> }) {
  const { totalItems } = useCart()
  const [open, setOpen] = useState(false)

  if (totalItems === 0) return null

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-sm transition-all"
        style={{ backgroundColor: tokens.button, color: tokens.textOnButton }}
      >
        <ShoppingCart className="w-4 h-4" />
        <span>Mon panier</span>
        <span
          className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
          style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}
        >
          {totalItems}
        </span>
      </button>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div
            className="relative w-full sm:w-[400px] max-h-[85vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl"
            style={{ backgroundColor: tokens.bgCard }}
          >
            <CartDrawer onClose={() => setOpen(false)} tokens={tokens} />
          </div>
        </div>
      )}
    </>
  )
}

function RestaurantInner({ data }: Props) {
  const { restaurant, categories, items } = data
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showAllMenu, setShowAllMenu] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<MenuItem | null>(null)

  const MENU_PREVIEW = 8

  // ── Tracking vue de page ──────────────────────────────────
  useEffect(() => {
    if (!restaurant.id || restaurant.is_demo) return
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restaurant_id: restaurant.id, event_type: 'page_view' }),
    }).catch(() => {}) // silencieux, ne bloque pas le rendu
  }, [restaurant.id, restaurant.is_demo])

  const plan = normalizePlan(restaurant.plan || (restaurant.is_demo ? 'starter' : 'starter'))
  const isPro = plan === 'pro'
  const isPremium = isPremiumPlan(plan)

  const shouldShowTerangaBranding = !restaurant.is_demo && !canUseFeature(plan, 'suppressionBranding')
  const canCall = canUseFeature(plan, 'boutonAppel')
  const canShare = canUseFeature(plan, 'boutonPartage')
  const canShowSocials = canUseFeature(plan, 'reseauxSociaux')
  const canShowPhone = isPro

  // Thème
  const themeConfig: RestaurantTheme = isPro || isPremium ? {
    primary: restaurant.primary_color || DEFAULT_PRIMARY_COLOR,
    mode: (restaurant.theme_mode === 'light' ? 'light' : 'dark') as 'dark' | 'light',
    background: restaurant.background_color || undefined,
    button: restaurant.button_color || restaurant.primary_color || DEFAULT_BUTTON_COLOR,
  } : {
    // Starter : fond blanc par défaut, couleurs TerangaLink orange
    primary: DEFAULT_PRIMARY_COLOR,
    mode: 'light',
    background: '#FFFFFF',
    button: DEFAULT_BUTTON_COLOR,
  }

  const tokens = generateThemeTokens(themeConfig)
  const style = themeToStyle(tokens)
  const ouvert = isOpenNow(restaurant.opening_hours)
  const publicUrl = typeof window !== 'undefined' ? window.location.href : `https://terangalink.sn/${restaurant.slug}`

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: restaurant.name, text: `Commandez chez ${restaurant.name}`, url: publicUrl })
      } catch { }
    } else {
      try { await navigator.clipboard.writeText(publicUrl) } catch { }
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  // Tri Premium : items épinglés en premier dans leur catégorie
  const sortedItems = isPremium
    ? [...items].sort((a, b) => {
        if (a.category_id !== b.category_id) return 0
        const pinA = a.is_pinned ? 0 : 1
        const pinB = b.is_pinned ? 0 : 1
        if (pinA !== pinB) return pinA - pinB
        return (a.position ?? 0) - (b.position ?? 0)
      })
    : [...items].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))

  const filteredItems = activeCategory
    ? sortedItems.filter(i => i.category_id === activeCategory)
    : sortedItems
  const availableItems = filteredItems.filter(i => i.is_available)
  const unavailableItems = filteredItems.filter(i => !i.is_available)
  const displayedAvailable = showAllMenu ? availableItems : availableItems.slice(0, MENU_PREVIEW)
  const hasMore = !activeCategory && availableItems.length > MENU_PREVIEW

  const demoBannerH = restaurant.is_demo ? 36 : 0
  const prepTime = restaurant.prep_time_minutes ? `${restaurant.prep_time_minutes} min` : '20 - 35 min'

  useEffect(() => {
    const prevBg = document.body.style.backgroundColor
    const prevColor = document.body.style.color
    document.body.style.backgroundColor = tokens.bgPage
    document.body.style.color = tokens.textPrimary
    return () => {
      document.body.style.backgroundColor = prevBg
      document.body.style.color = prevColor
    }
  }, [tokens.bgPage, tokens.textPrimary])

  return (
    <div style={{ ...style, color: tokens.textPrimary }} className="min-h-screen w-full">

      {/* ── Demo banner ── */}
      {restaurant.is_demo && (
        <div
          className="fixed top-0 left-0 right-0 z-[70] text-white px-3 backdrop-blur-sm flex items-center"
          style={{ backgroundColor: `${tokens.accent}CC`, height: demoBannerH }}
        >
          <div className="max-w-6xl mx-auto w-full flex items-center justify-between gap-2 text-[11px] sm:text-xs">
            <a href="/" className="inline-flex items-center gap-1 rounded-full px-2 py-1 font-semibold" style={{ backgroundColor: 'rgba(0,0,0,0.22)' }}>
              <Home className="w-3.5 h-3.5" />Accueil
            </a>
            <span className="opacity-95 whitespace-nowrap">Démo TerangaLink</span>
            <a href="https://wa.me/221777777777?text=Bonjour%2C%20j%E2%80%99ai%20d%C3%A9couvert%20TerangaLink%20et%20je%20souhaiterais%20cr%C3%A9er%20un%20site%20pour%20mon%20restaurant." target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-2 whitespace-nowrap">
              Créer mon site
            </a>
          </div>
        </div>
      )}

      {/* ── NAVBAR ── */}
      <nav
        className="sticky z-[60]"
        style={{ top: demoBannerH, height: 64, backgroundColor: tokens.bgCard, borderBottom: `1px solid ${tokens.border}` }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0" style={{ backgroundColor: tokens.bgCardHover }}>
              {restaurant.logo_url ? (
                <Image src={restaurant.logo_url} alt={restaurant.name} width={36} height={36} className="object-cover w-full h-full" unoptimized />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-base font-black" style={{ color: tokens.accent }}>
                  {restaurant.name.charAt(0)}
                </div>
              )}
            </div>
            <span className="font-bold text-sm truncate hidden sm:block" style={{ color: tokens.textPrimary }}>{restaurant.name}</span>
          </div>

          <BackToAnnuaire tokens={tokens} />

          <div className="hidden md:flex items-center gap-6">
            {[
              { label: 'Catégories', id: 'categories' },
              { label: 'Menu', id: 'menu' },
              { label: 'À propos de nous', id: 'apropos' },
            ].map(({ label, id }) => (
              <button
                key={id}
                onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="text-sm font-medium transition-colors"
                style={{ color: tokens.textSecondary }}
                onMouseEnter={e => (e.currentTarget.style.color = tokens.button)}
                onMouseLeave={e => (e.currentTarget.style.color = tokens.textSecondary)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <QRCodeButton url={publicUrl} restaurantName={restaurant.name} tokens={tokens} />
            {canCall && restaurant.phone && (
              <button
                onClick={() => { window.location.href = `tel:${restaurant.phone}` }}
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ backgroundColor: tokens.bgCardHover, color: tokens.textSecondary }}
                aria-label="Appeler"
              >
                <PhoneCall className="w-4 h-4" />
              </button>
            )}
            {canShare && (
              <div className="relative">
                <button onClick={handleShare} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: tokens.bgCardHover, color: tokens.textSecondary }}>
                  <Share2 className="w-4 h-4" />
                </button>
                {copied && (
                  <span className="absolute -bottom-9 right-0 text-xs font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-lg" style={{ backgroundColor: tokens.bgCard, color: tokens.textPrimary, border: `1px solid ${tokens.border}` }}>
                    Lien copié !
                  </span>
                )}
              </div>
            )}
            <div className="hidden sm:block">
              <NavCartButton tokens={tokens} />
            </div>
          </div>
        </div>
      </nav>

      {/* ── HERO BANNER ── */}
      <div className="relative w-full h-64 sm:h-80 lg:h-96 overflow-hidden">
        {(restaurant.banner_url || restaurant.cover_url) ? (
          <Image
            src={restaurant.banner_url || restaurant.cover_url!}
            alt={restaurant.name}
            fill
            className="object-cover"
            priority
            sizes="100vw"
            unoptimized
          />
        ) : (
          <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${tokens.accent}25 0%, ${tokens.bgPage} 100%)` }} />
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 55%, transparent 100%)' }} />

        {shouldShowTerangaBranding && (
          <a href="/" className="absolute top-4 left-4 flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: tokens.button, color: tokens.textOnButton }}>
              <Zap className="w-3 h-3" />
            </div>
            <span className="text-xs font-semibold text-white/80">TerangaLink</span>
          </a>
        )}

        <div className="absolute bottom-0 left-0 right-0 px-5 sm:px-8 pb-6">
          <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight mb-1">{restaurant.name}</h1>
          {restaurant.description && (
            <p className="text-white/75 text-sm mb-4 max-w-lg line-clamp-2">{restaurant.description}</p>
          )}
          <div className="flex flex-wrap gap-2">
            <div
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{ backgroundColor: ouvert ? tokens.openBg : tokens.closedBg, color: ouvert ? tokens.openText : tokens.closedText }}
            >
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ouvert ? tokens.openText : tokens.closedText }} />
              {ouvert ? 'Ouvert maintenant' : 'Fermé'}
            </div>
            <div
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'white' }}
            >
              <Clock className="w-3.5 h-3.5" />
              {prepTime}
            </div>
          </div>
        </div>
      </div>

      {/* ── CONTENU PRINCIPAL ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-8 lg:pb-8">
        <div className="flex gap-8">

          {/* Colonne principale */}
          <div className="flex-1 min-w-0">

            {/* ── BANNIÈRES (Phase 7 — Premium) ── */}
            {isPremium && restaurant.banners && restaurant.banners.length > 0 && (
              <PromoBanners banners={restaurant.banners} tokens={tokens} />
            )}

            {/* ── MENU COMPLET IMAGE (Phase 8 — Premium) ── */}
            {isPremium && (
              <FullMenuDisplay
                menuImageUrl={restaurant.full_menu_image_url ?? null}
                enabled={restaurant.show_full_menu ?? false}
                tokens={tokens}
              />
            )}

            {/* ── SECTION CATÉGORIES ── */}
            <section id="categories" className="mb-8 scroll-mt-20">
              <div className="flex items-center gap-2 mb-4">
                <LayoutGrid className="w-5 h-5" style={{ color: tokens.accent }} />
                <h2 className="text-lg font-bold" style={{ color: tokens.textPrimary }}>Catégories</h2>
              </div>

              {categories.length > 0 && (
                <div
                  className="sticky z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3"
                  style={{
                    top: demoBannerH + 64,
                    backgroundColor: `${tokens.bgPage}f0`,
                    backdropFilter: 'blur(12px)',
                    borderBottom: `1px solid ${tokens.border}`,
                  }}
                >
                  <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                    <button
                      onClick={() => setActiveCategory(null)}
                      className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all"
                      style={activeCategory === null
                        ? { backgroundColor: tokens.button, color: tokens.textOnButton }
                        : { backgroundColor: tokens.bgCard, color: tokens.textMuted, border: `1px solid ${tokens.border}` }}
                    >
                      Tout
                    </button>
                    {categories.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap"
                        style={activeCategory === cat.id
                          ? { backgroundColor: tokens.button, color: tokens.textOnButton }
                          : { backgroundColor: tokens.bgCard, color: tokens.textMuted, border: `1px solid ${tokens.border}` }}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* ── SECTION MENU ── */}
            <section id="menu" className="mb-10 scroll-mt-20">
              <div className="flex items-center gap-2 mb-4">
                <UtensilsCrossed className="w-5 h-5" style={{ color: tokens.accent }} />
                <h2 className="text-lg font-bold" style={{ color: tokens.textPrimary }}>Menu</h2>
              </div>

              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="text-5xl mb-4">🍽️</div>
                  <h3 className="font-bold text-lg mb-2" style={{ color: tokens.textPrimary }}>Menu en cours de préparation</h3>
                  <p className="text-sm" style={{ color: tokens.textMuted }}>Revenez bientôt !</p>
                </div>
              ) : (
                <>
                  {displayedAvailable.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4">
                      {displayedAvailable.map(item => (
                        <MenuCard
                          key={item.id}
                          item={item}
                          restaurantId={restaurant.id}
                          restaurantSlug={restaurant.slug}
                          restaurantPhone={restaurant.whatsapp_number || restaurant.phone || ''}
                          restaurantName={restaurant.name}
                          tokens={tokens}
                          isPremium={isPremium}
                          onOpenProduct={setSelectedProduct}
                        />
                      ))}
                    </div>
                  )}

                  {hasMore && (
                    <div className="flex justify-center mt-2 mb-4">
                      <button
                        onClick={() => {
                          if (showAllMenu) {
                            setShowAllMenu(false)
                            document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' })
                          } else {
                            setShowAllMenu(true)
                          }
                        }}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-all"
                        style={{ border: `1.5px solid ${tokens.button}`, color: tokens.button, backgroundColor: 'transparent' }}
                      >
                        {showAllMenu
                          ? <><ChevronUp className="w-4 h-4" />Réduire</>
                          : <><ChevronDown className="w-4 h-4" />Voir tout le menu ({availableItems.length} plats)</>
                        }
                      </button>
                    </div>
                  )}

                  {showAllMenu && unavailableItems.length > 0 && (
                    <div style={{ opacity: 0.45 }}>
                      <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: tokens.textMuted }}>Indisponibles</p>
                      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        {unavailableItems.map(item => (
                          <MenuCard
                            key={item.id}
                            item={item}
                            restaurantId={restaurant.id}
                            restaurantSlug={restaurant.slug}
                            restaurantPhone={restaurant.whatsapp_number || restaurant.phone || ''}
                            restaurantName={restaurant.name}
                            tokens={tokens}
                            isPremium={isPremium}
                            onOpenProduct={setSelectedProduct}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </section>

            {/* ── SECTION LIVRAISON ── */}
            {restaurant.show_delivery_fee && (restaurant.delivery_fee ?? 0) > 0 && (
              <section id="livraison" className="mb-10 scroll-mt-20">
                <div
                  className="rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  style={{ border: `1.5px solid ${tokens.border}`, backgroundColor: tokens.bgCard }}
                >
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-1" style={{ color: tokens.textPrimary }}>Livraison rapide à votre porte</h3>
                    <p className="text-sm mb-4" style={{ color: tokens.textSecondary }}>
                      Nous livrons chez vous rapidement et en toute sécurité.
                    </p>
                    <div
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold"
                      style={{ backgroundColor: tokens.bgBadge, border: `1px solid ${tokens.border}`, color: tokens.textPrimary }}
                    >
                      <Truck className="w-4 h-4" style={{ color: tokens.accent }} />
                      Frais de livraison — {(restaurant.delivery_fee ?? 0).toLocaleString('fr-SN')} FCFA
                    </div>
                  </div>
                  <div className="text-6xl select-none" aria-hidden>🛵</div>
                </div>
              </section>
            )}

            {/* ── SECTION AVIS ── */}
            <ReviewsSection restaurantId={restaurant.id} tokens={tokens} />

            {/* ── SECTION À PROPOS ── */}
            <section id="apropos" className="mb-10 scroll-mt-20" style={{ borderTop: `1px solid ${tokens.border}`, paddingTop: 32 }}>
              <div className="flex items-center gap-2 mb-6">
                <Info className="w-5 h-5" style={{ color: tokens.accent }} />
                <h2 className="text-lg font-bold" style={{ color: tokens.textPrimary }}>À propos de nous</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                <div>
                  {restaurant.description && (
                    <p className="text-sm leading-relaxed mb-4" style={{ color: tokens.textSecondary }}>{restaurant.description}</p>
                  )}
                  <div className="space-y-3">
                    {restaurant.address && (() => {
                      const fullAddress = `${restaurant.address}${restaurant.city ? `, ${restaurant.city}` : ''}, Sénégal`
                      const mapsUrl = restaurant.latitude && restaurant.longitude
                        ? `https://www.google.com/maps/search/?api=1&query=${restaurant.latitude},${restaurant.longitude}`
                        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`
                      return (
                        <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-start gap-2 text-sm transition-opacity hover:opacity-75"
                          style={{ color: tokens.textSecondary }}>
                          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: tokens.accent }} />
                          <span className="underline underline-offset-2">{restaurant.address}{restaurant.city ? `, ${restaurant.city}` : ''}</span>
                        </a>
                      )
                    })()}
                    {restaurant.phone && (
                      <a href={`tel:${restaurant.phone}`} className="flex items-center gap-2 text-sm hover:opacity-75" style={{ color: tokens.textSecondary }}>
                        <Phone className="w-4 h-4 flex-shrink-0" style={{ color: tokens.accent }} />
                        {restaurant.phone}
                      </a>
                    )}
                    {restaurant.email && (
                      <div className="flex items-center gap-2 text-sm" style={{ color: tokens.textSecondary }}>
                        <span style={{ color: tokens.accent }}>✉</span>
                        {restaurant.email}
                      </div>
                    )}
                  </div>
                </div>

                {(() => {
                  const normalizedHours: Record<string, { ouverture?: string; fermeture?: string; ferme?: boolean }> = {}
                  if (restaurant.opening_hours) {
                    Object.entries(restaurant.opening_hours).forEach(([k, v]) => {
                      normalizedHours[k.toLowerCase().trim()] = v
                    })
                  }
                  return (
                    <div>
                      <h3 className="font-bold text-sm mb-3" style={{ color: tokens.textPrimary }}>Horaires d&apos;ouverture</h3>
                      <div className="space-y-2">
                        {DAYS_ORDER.map(day => {
                          const h = normalizedHours[day]
                          const isFerme = !h || h.ferme
                          const hasHours = !isFerme && h?.ouverture && h?.fermeture
                          return (
                            <div key={day} className="flex justify-between items-center text-sm">
                              <span style={{ color: tokens.textSecondary }}>{DAYS_FR[day]}</span>
                              <span style={{ color: isFerme ? tokens.textMuted : tokens.textPrimary }}>
                                {isFerme ? 'Fermé' : hasHours ? `${h!.ouverture} - ${h!.fermeture}` : '—'}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}

                {canShowSocials && (restaurant.instagram_url || restaurant.facebook_url || restaurant.tiktok_url || restaurant.snapchat_url) && (
                  <div>
                    <h3 className="font-bold text-sm mb-3" style={{ color: tokens.textPrimary }}>Suivez-nous</h3>
                    <div className="flex items-center gap-3">
                      {restaurant.instagram_url && (
                        <a href={restaurant.instagram_url} target="_blank" rel="noopener noreferrer"
                          className="w-10 h-10 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: tokens.bgCardHover, color: tokens.textSecondary, border: `1px solid ${tokens.border}` }}>
                          <Instagram className="w-4 h-4" />
                        </a>
                      )}
                      {restaurant.facebook_url && (
                        <a href={restaurant.facebook_url} target="_blank" rel="noopener noreferrer"
                          className="w-10 h-10 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: tokens.bgCardHover, color: tokens.textSecondary, border: `1px solid ${tokens.border}` }}>
                          <Facebook className="w-4 h-4" />
                        </a>
                      )}
                      {restaurant.tiktok_url && (
                        <a href={restaurant.tiktok_url} target="_blank" rel="noopener noreferrer"
                          className="w-10 h-10 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: tokens.bgCardHover, color: tokens.textSecondary, border: `1px solid ${tokens.border}` }}>
                          <Music2 className="w-4 h-4" />
                        </a>
                      )}
                      {restaurant.snapchat_url && (
                        <a href={restaurant.snapchat_url} target="_blank" rel="noopener noreferrer"
                          className="w-10 h-10 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: tokens.bgCardHover, border: `1px solid ${tokens.border}` }}>
                          <FaSnapchatGhost className="w-5 h-5" style={{ color: tokens.textSecondary }} />
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </section>

          </div>

          {/* ── PANIER DESKTOP ── */}
          <div className="hidden lg:block w-[340px] flex-shrink-0">
            <div
              className="sticky rounded-2xl overflow-hidden max-h-[calc(100vh-6rem)]"
              style={{ top: demoBannerH + 64 + 16, backgroundColor: tokens.bgCard, border: `1px solid ${tokens.border}` }}
            >
              <CartDrawer inline tokens={tokens} isPremium={isPremium} />
            </div>
          </div>

        </div>

      </div>

      {/* ── FOOTER ── */}
      <footer className="py-4 px-4" style={{ backgroundColor: '#000000' }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs" style={{ color: '#6B7280' }}>
          {shouldShowTerangaBranding ? (
            <>
              <span>© {new Date().getFullYear()} TerangaLink. Tous droits réservés.</span>
              <a href="/" className="font-semibold hover:opacity-80 transition-opacity" style={{ color: tokens.button }}>
                Propulsé par TerangaLink
              </a>
            </>
          ) : (
            <span>© {new Date().getFullYear()} {restaurant.name}</span>
          )}
        </div>
      </footer>

      {/* Panier mobile flottant */}
      <CartButton tokens={tokens} />

      {/* ── POPUP PRODUIT (Phase 1 + 2 + 3 + 4 + 6) ── */}
      {selectedProduct && (
        <ProductModal
          item={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          restaurantId={restaurant.id}
          restaurantSlug={restaurant.slug}
          restaurantPhone={restaurant.whatsapp_number || restaurant.phone || ''}
          restaurantName={restaurant.name}
          tokens={tokens}
          isPremium={isPremium}
        />
      )}

    </div>
  )
}

export default function RestaurantPageClient(props: Props) {
  return (
    <CartProvider>
      <RestaurantInner {...props} />
    </CartProvider>
  )
}
