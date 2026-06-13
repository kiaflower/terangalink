'use client'

import { useState } from 'react'
import Image from 'next/image'
import { MapPin, Phone, Zap, Share2, PhoneCall, Truck, Home, Instagram, Facebook, Music2 } from 'lucide-react'
import { MenuCard } from '@/components/restaurant/MenuCard'
import { CartDrawer, CartButton } from '@/components/cart/CartDrawer'
import { CartProvider } from '@/lib/hooks/useCart'
import { QRCodeButton } from '@/components/restaurant/QRCodeButton'
import { GoogleMap } from '@/components/restaurant/GoogleMap'
import { DEFAULT_BUTTON_COLOR, DEFAULT_DARK_BACKGROUND, DEFAULT_PRIMARY_COLOR, generateThemeTokens, themeToStyle, type RestaurantTheme } from '@/lib/theme'
import { canUseFeature, normalizePlan } from '@/lib/plans'
import type { RestaurantPageData } from '@/lib/types'

type RestaurantFull = RestaurantPageData['restaurant'] & {
  primary_color?: string | null
  background_color?: string | null
  theme_mode?: string | null
  button_color?: string | null
  facebook_url?: string | null
  instagram_url?: string | null
  tiktok_url?: string | null
  whatsapp_number?: string | null
  opening_hours?: Record<string, { ouverture?: string; fermeture?: string; ferme?: boolean }> | null
  delivery_fee?: number | null
  show_delivery_fee?: boolean
  is_demo?: boolean
  plan?: string
  latitude?: number | null
  longitude?: number | null
}

interface Props {
  data: Omit<RestaurantPageData, 'restaurant'> & { restaurant: RestaurantFull }
}

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

function RestaurantInner({ data }: Props) {
  const { restaurant, categories, items } = data
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const plan = normalizePlan(restaurant.plan || (restaurant.is_demo ? 'starter' : 'starter'))
  const isPro = plan === 'pro'

  // Fonctionnalités par plan
  const shouldShowTerangaBranding = !restaurant.is_demo && !canUseFeature(plan, 'suppressionBranding')
  const canCall = canUseFeature(plan, 'boutonAppel')
  const canShare = canUseFeature(plan, 'boutonPartage')
  const canShowSocials = canUseFeature(plan, 'reseauxSociaux')
  // Téléphone visible publiquement uniquement en Pro
  const canShowPhone = isPro

  // Thème : Pro = couleurs personnalisées, Starter = thème TerangaLink par défaut
  const themeConfig: RestaurantTheme = isPro ? {
    primary: restaurant.primary_color || DEFAULT_PRIMARY_COLOR,
    mode: (restaurant.theme_mode === 'light' ? 'light' : 'dark') as 'dark' | 'light',
    background: restaurant.background_color || undefined,
    button: restaurant.button_color || restaurant.primary_color || DEFAULT_BUTTON_COLOR,
  } : {
    primary: DEFAULT_PRIMARY_COLOR,
    mode: 'dark',
    background: DEFAULT_DARK_BACKGROUND,
    button: DEFAULT_BUTTON_COLOR,
  }

  const tokens = generateThemeTokens(themeConfig)
  const style = themeToStyle(tokens)
  const ouvert = isOpenNow(restaurant.opening_hours)
  const publicUrl = typeof window !== 'undefined' ? window.location.href : `https://terangalink.sn/${restaurant.slug}`

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: restaurant.name,
          text: `Commandez chez ${restaurant.name}`,
          url: publicUrl,
        })
      } catch {
        // cancelled
      }
    } else {
      try { await navigator.clipboard.writeText(publicUrl) } catch {}
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  const filteredItems = activeCategory ? items.filter(i => i.category_id === activeCategory) : items
  const availableItems = filteredItems.filter(i => i.is_available)
  const unavailableItems = filteredItems.filter(i => !i.is_available)

  return (
    <div style={style} className="min-h-screen">
      {/* Demo top banner */}
      {restaurant.is_demo && (
        <div
          className="fixed top-0 left-0 right-0 z-[70] text-white px-3 py-1.5 backdrop-blur-sm"
          style={{ backgroundColor: `${tokens.accent}CC` }}
        >
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-2 text-[11px] sm:text-xs">
            <a
              href="/"
              className="inline-flex items-center gap-1 rounded-full px-2 py-1 font-semibold transition-colors"
              style={{ backgroundColor: 'rgba(0,0,0,0.22)' }}
            >
              <Home className="w-3.5 h-3.5" />
              Accueil
            </a>

            <span className="opacity-95 whitespace-nowrap">Démo TerangaLink</span>

            <a
              href="https://wa.me/221777777777?text=Bonjour%2C%20j%E2%80%99ai%20d%C3%A9couvert%20TerangaLink%20et%20je%20souhaiterais%20cr%C3%A9er%20un%20site%20pour%20mon%20restaurant."
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline underline-offset-2 whitespace-nowrap"
            >
              Créer mon site
            </a>
          </div>
        </div>
      )}

      {/* Hero */}
      <div className="relative h-52 sm:h-64 overflow-hidden">
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
        <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${tokens.bgPage} 0%, ${tokens.bgPage}60 40%, transparent 100%)` }} />

        {/* TerangaLink branding — Starter uniquement */}
        {shouldShowTerangaBranding && (
          <a href="/" className="absolute top-3 left-4 flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: tokens.button, color: tokens.textOnButton }}>
              <Zap className="w-3 h-3" />
            </div>
            <span className="text-xs font-semibold" style={{ color: tokens.textPrimary, opacity: 0.7 }}>TerangaLink</span>
          </a>
        )}

        {/* Action buttons top-right */}
        <div className="absolute top-3 right-4 flex items-center gap-2">
          <QRCodeButton url={publicUrl} restaurantName={restaurant.name} tokens={tokens} />
          {canCall && restaurant.phone && (
            <a
              href={`tel:${restaurant.phone}`}
              className="w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors"
              style={{ backgroundColor: 'rgba(0,0,0,0.35)', color: 'white' }}
            >
              <PhoneCall className="w-4 h-4" />
            </a>
          )}
          {canShare && (
            <div className="relative">
              <button
                onClick={handleShare}
                className="w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors"
                style={{ backgroundColor: 'rgba(0,0,0,0.35)', color: 'white' }}
              >
                <Share2 className="w-4 h-4" />
              </button>
              {copied && (
                <span
                  className="absolute -bottom-9 right-0 text-xs font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-lg"
                  style={{ backgroundColor: tokens.bgCard, color: tokens.textPrimary, border: `1px solid ${tokens.border}` }}
                >
                  Lien copié !
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Restaurant info */}
      <div className="px-4 sm:px-6 -mt-12 relative z-10 mb-5">
        <div className="flex items-end gap-4 mb-3">
          <div
            className="w-20 h-20 rounded-2xl border-4 flex-shrink-0 overflow-hidden shadow-xl"
            style={{ borderColor: tokens.bgPage, backgroundColor: tokens.bgCard }}
          >
            {restaurant.logo_url ? (
              <Image src={restaurant.logo_url} alt={restaurant.name} width={80} height={80} className="object-cover w-full h-full" unoptimized />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl font-black" style={{ color: tokens.accent }}>
                {restaurant.name.charAt(0)}
              </div>
            )}
          </div>
          <div className="pb-2">
            <h1 className="font-black text-xl leading-tight" style={{ color: tokens.textPrimary }}>{restaurant.name}</h1>
            {restaurant.cuisine_type && <p className="text-sm mt-0.5" style={{ color: tokens.textMuted }}>{restaurant.cuisine_type}</p>}
          </div>
        </div>

        {restaurant.description && <p className="text-sm leading-relaxed mb-4" style={{ color: tokens.textSecondary }}>{restaurant.description}</p>}

        {/* Réseaux sociaux — Pro uniquement */}
        {canShowSocials && (restaurant.instagram_url || restaurant.facebook_url || restaurant.tiktok_url) && (
          <div className="flex items-center gap-2 mb-4">
            {restaurant.instagram_url && (
              <a href={restaurant.instagram_url} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full flex items-center justify-center transition-colors" style={{ backgroundColor: tokens.bgCard, color: tokens.textSecondary, border: `1px solid ${tokens.border}` }} aria-label="Instagram">
                <Instagram className="w-4 h-4" />
              </a>
            )}
            {restaurant.facebook_url && (
              <a href={restaurant.facebook_url} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full flex items-center justify-center transition-colors" style={{ backgroundColor: tokens.bgCard, color: tokens.textSecondary, border: `1px solid ${tokens.border}` }} aria-label="Facebook">
                <Facebook className="w-4 h-4" />
              </a>
            )}
            {restaurant.tiktok_url && (
              <a href={restaurant.tiktok_url} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full flex items-center justify-center transition-colors" style={{ backgroundColor: tokens.bgCard, color: tokens.textSecondary, border: `1px solid ${tokens.border}` }} aria-label="TikTok">
                <Music2 className="w-4 h-4" />
              </a>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-3 items-center">
          {restaurant.city && (
            <div className="flex items-center gap-1.5 text-xs" style={{ color: tokens.textMuted }}>
              <MapPin className="w-3.5 h-3.5" style={{ color: tokens.accent }} />
              {restaurant.city}
            </div>
          )}
          {/* Téléphone visible uniquement en Pro */}
          {canShowPhone && restaurant.phone && (
            <a href={`tel:${restaurant.phone}`} className="flex items-center gap-1.5 text-xs transition-colors" style={{ color: tokens.textMuted }}>
              <Phone className="w-3.5 h-3.5" style={{ color: tokens.accent }} />
              {restaurant.phone}
            </a>
          )}
          <div
            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ backgroundColor: ouvert ? tokens.openBg : tokens.closedBg, color: ouvert ? tokens.openText : tokens.closedText }}
          >
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ouvert ? tokens.openText : tokens.closedText }} />
            {ouvert ? 'Ouvert maintenant' : 'Fermé'}
          </div>
          {restaurant.show_delivery_fee && (restaurant.delivery_fee ?? 0) > 0 && (
            <div className="flex items-center gap-1.5 text-xs" style={{ color: tokens.textMuted }}>
              <Truck className="w-3.5 h-3.5" style={{ color: tokens.accent }} />
              Livraison : {(restaurant.delivery_fee ?? 0).toLocaleString('fr-SN')} FCFA
            </div>
          )}
        </div>
      </div>

      {/* Category bar */}
      {categories.length > 0 && (
        <div
          className="sticky top-0 z-20 py-3"
          style={{ backgroundColor: `${tokens.bgPage}f0`, backdropFilter: 'blur(12px)', borderBottom: `1px solid ${tokens.border}` }}
        >
          <div className="flex gap-2 overflow-x-auto px-4 sm:px-6" style={{ scrollbarWidth: 'none' }}>
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

      {/* Main content */}
      <div className="flex gap-6 px-4 sm:px-6 pt-6 max-w-6xl mx-auto pb-32 lg:pb-8">
        <div className="flex-1 min-w-0">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="text-5xl mb-4">🍽️</div>
              <h3 className="font-bold text-lg mb-2" style={{ color: tokens.textPrimary }}>Menu en cours de préparation</h3>
              <p className="text-sm" style={{ color: tokens.textMuted }}>Revenez bientôt !</p>
            </div>
          ) : (
            <>
              {availableItems.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">
                  {availableItems.map(item => (
                    <MenuCard
                      key={item.id}
                      item={item}
                      restaurantId={restaurant.id}
                      restaurantSlug={restaurant.slug}
                      restaurantPhone={restaurant.whatsapp_number || restaurant.phone || ''}
                      restaurantName={restaurant.name}
                      tokens={tokens}
                    />
                  ))}
                </div>
              )}
              {unavailableItems.length > 0 && (
                <div style={{ opacity: 0.45 }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: tokens.textMuted }}>
                    Indisponibles
                  </p>
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
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          <div className="mt-10 space-y-3 pt-8" style={{ borderTop: `1px solid ${tokens.border}` }}>
            {restaurant.address && (
              <GoogleMap
                address={restaurant.address}
                city={restaurant.city || undefined}
                latitude={restaurant.latitude ?? null}
                longitude={restaurant.longitude ?? null}
                tokens={tokens}
              />
            )}
          </div>

          {/* Powered by TerangaLink — Starter uniquement */}
          {shouldShowTerangaBranding && (
            <div className="text-center py-6">
              <a
                href="/"
                className="text-xs transition-opacity hover:opacity-100"
                style={{ color: tokens.textMuted, opacity: 0.8 }}
              >
                Propulsé par TerangaLink
              </a>
            </div>
          )}
        </div>

        {/* Desktop cart */}
        <div className="hidden lg:block w-[340px] flex-shrink-0">
          <div className="sticky top-20 rounded-2xl overflow-hidden max-h-[calc(100vh-6rem)]" style={{ backgroundColor: tokens.bgCard, border: `1px solid ${tokens.border}` }}>
            <CartDrawer inline tokens={tokens} />
          </div>
        </div>
      </div>

      {/* Floating cart button mobile */}
      <CartButton tokens={tokens} />
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
