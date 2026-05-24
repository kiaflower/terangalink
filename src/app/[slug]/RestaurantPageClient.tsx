'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { MapPin, Phone, Zap, ChevronRight, Share2, PhoneCall, Truck, QrCode, Home } from 'lucide-react'
import { MenuCard } from '@/components/restaurant/MenuCard'
import { CartDrawer, CartButton } from '@/components/cart/CartDrawer'
import { CartProvider } from '@/lib/hooks/useCart'
import { QRCodeButton } from '@/components/restaurant/QRCodeButton'
import { GoogleMap } from '@/components/restaurant/GoogleMap'
import { generateThemeTokens, themeToStyle, type RestaurantTheme } from '@/lib/theme'
import { canUseFeature, normalizePlan } from '@/lib/plans'
import type { RestaurantPageData } from '@/lib/types'

type RestaurantFull = RestaurantPageData['restaurant'] & {
  primary_color?: string
  background_color?: string
  theme_mode?: 'dark' | 'light'
  whatsapp_number?: string
  opening_hours?: Record<string, { ouverture?: string; fermeture?: string; ferme?: boolean }>
  delivery_fee?: number
  show_delivery_fee?: boolean
  is_demo?: boolean
  plan?: string
}

interface Props {
  data: Omit<RestaurantPageData, 'restaurant'> & { restaurant: RestaurantFull }
}

function isOpenNow(opening_hours?: Record<string, { ouverture?: string; fermeture?: string; ferme?: boolean }>): boolean {
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
  const [showQR, setShowQR] = useState(false)

  const plan = restaurant.plan ? normalizePlan(restaurant.plan) : 'mensuel'
  const canCustomizeColors = canUseFeature(plan, 'couleursPersonnalisees')
  const canHideBranding = canUseFeature(plan, 'suppressionBranding')
  const canUseLightMode = canUseFeature(plan, 'modeClairSombre')
  const canCall = canUseFeature(plan, 'boutonAppel')
  const canShare = canUseFeature(plan, 'boutonPartage')

  const themeConfig: RestaurantTheme = {
    primary: canCustomizeColors ? (restaurant.primary_color || '#F97316') : '#F97316',
    mode: canUseLightMode ? (restaurant.theme_mode || 'dark') : 'dark',
  }

  const tokens = generateThemeTokens(themeConfig)
  const style = themeToStyle(tokens)
  const ouvert = isOpenNow(restaurant.opening_hours)
  const publicUrl = typeof window !== 'undefined' ? window.location.href : `${restaurant.platform_url || 'https://terangalink.sn'}/${restaurant.slug}`

  async function handleShare() {
    if (navigator.share) {
      try { await navigator.share({ title: restaurant.name, text: `Commandez chez ${restaurant.name}`, url: publicUrl }) }
      catch { /* cancelled */ }
    } else {
      try { await navigator.clipboard.writeText(publicUrl) } catch { /* fallback */ }
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  const filteredItems = activeCategory ? items.filter(i => i.category_id === activeCategory) : items
  const availableItems = filteredItems.filter(i => i.is_available)
  const unavailableItems = filteredItems.filter(i => !i.is_available)

  return (
    <div style={style} className="min-h-screen">
      {/* Demo banner */}
      {restaurant.is_demo && (
        <div className="text-white text-center text-xs py-2 px-4 font-semibold" style={{ backgroundColor: `${tokens.accent}CC` }}>
          Ceci est un site démo TerangaLink —
<a
  href="https://wa.me/221777777777?text=Bonjour%2C%20j%E2%80%99ai%20d%C3%A9couvert%20TerangaLink%20et%20je%20souhaiterais%20cr%C3%A9er%20un%20site%20pour%20mon%20restaurant."
  target="_blank"
  className="underline opacity-90 hover:opacity-100 ml-1"
>
  Créez votre propre restaurant
</a>
        </div>
      )}

      {/* Hero */}
      <div className="relative h-52 sm:h-64 overflow-hidden">
        
        {(restaurant as { banner_url?: string; cover_url?: string }).banner_url || restaurant.cover_url ? (
          <Image
            src={(restaurant as { banner_url?: string }).banner_url || restaurant.cover_url!}
            alt={restaurant.name} fill className="object-cover" priority sizes="100vw"
          unoptimized
          />
        ) : (
          <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${tokens.accent}25 0%, ${tokens.bgPage} 100%)` }} />
        )}
        <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${tokens.bgPage} 0%, ${tokens.bgPage}60 40%, transparent 100%)` }} />

        {/* TerangaLink branding - hide if annuel */}
        {!canHideBranding && (
          <a href="/" className="absolute top-3 left-4 flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: tokens.accent }}>
              <Zap className="w-3 h-3 text-white" />
            </div>
            <span className="text-xs font-semibold" style={{ color: tokens.textPrimary, opacity: 0.7 }}>TerangaLink</span>
          </a>
        )}

        {/* Action buttons */}
        <div className="absolute top-3 right-4 flex items-center gap-2">
          <QRCodeButton
            url={publicUrl}
            restaurantName={restaurant.name}
            tokens={tokens}
          />
          {canCall && restaurant.phone && (
            <a href={`tel:${restaurant.phone}`} className="w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors" style={{ backgroundColor: 'rgba(0,0,0,0.35)', color: 'white' }}>
              <PhoneCall className="w-4 h-4" />
            </a>
          )}
          {canShare && (
            <div className="relative">
              <button onClick={handleShare} className="w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors" style={{ backgroundColor: 'rgba(0,0,0,0.35)', color: 'white' }}>
                <Share2 className="w-4 h-4" />
              </button>
              {copied && (
                <span className="absolute -bottom-9 right-0 text-xs font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-lg" style={{ backgroundColor: tokens.bgCard, color: tokens.textPrimary, border: `1px solid ${tokens.border}` }}>
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
          <div className="w-20 h-20 rounded-2xl border-4 flex-shrink-0 overflow-hidden shadow-xl" style={{ borderColor: tokens.bgPage, backgroundColor: tokens.bgCard }}>
            {restaurant.logo_url ? (
              <Image src={restaurant.logo_url} alt={restaurant.name} width={80} height={80} className="object-cover w-full h-full" unoptimized/>
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

        <div className="flex flex-wrap gap-3 items-center">
          {restaurant.city && (
            <div className="flex items-center gap-1.5 text-xs" style={{ color: tokens.textMuted }}>
              <MapPin className="w-3.5 h-3.5" style={{ color: tokens.accent }} />{restaurant.city}
            </div>
          )}
          {restaurant.phone && (
            <a href={`tel:${restaurant.phone}`} className="flex items-center gap-1.5 text-xs transition-colors" style={{ color: tokens.textMuted }}>
              <Phone className="w-3.5 h-3.5" style={{ color: tokens.accent }} />{restaurant.phone}
            </a>
          )}
          {/* Open/closed badge */}
          <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: ouvert ? tokens.openBg : tokens.closedBg, color: ouvert ? tokens.openText : tokens.closedText }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ouvert ? tokens.openText : tokens.closedText }} />
            {ouvert ? 'Ouvert maintenant' : 'Fermé'}
          </div>
          {/* Delivery fee */}
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
        <div className="sticky top-0 z-20 py-3" style={{ backgroundColor: `${tokens.bgPage}f0`, backdropFilter: 'blur(12px)', borderBottom: `1px solid ${tokens.border}` }}>
          <div className="flex gap-2 overflow-x-auto px-4 sm:px-6" style={{ scrollbarWidth: 'none' }}>
            <button
              onClick={() => setActiveCategory(null)}
              className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all"
              style={activeCategory === null
                ? { backgroundColor: tokens.accent, color: tokens.textOnAccent }
                : { backgroundColor: tokens.bgCard, color: tokens.textMuted, border: `1px solid ${tokens.border}` }
              }
            >
              Tout
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap"
                style={activeCategory === cat.id
                  ? { backgroundColor: tokens.accent, color: tokens.textOnAccent }
                  : { backgroundColor: tokens.bgCard, color: tokens.textMuted, border: `1px solid ${tokens.border}` }
                }
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
                    <MenuCard key={item.id} item={item} restaurantId={restaurant.id} restaurantSlug={restaurant.slug} restaurantPhone={restaurant.whatsapp_number || restaurant.phone || ''} restaurantName={restaurant.name} tokens={tokens} />
                  ))}
                </div>
              )}
              {unavailableItems.length > 0 && (
                <div style={{ opacity: 0.45 }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: tokens.textMuted }}>Indisponibles</p>
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {unavailableItems.map(item => (
                      <MenuCard key={item.id} item={item} restaurantId={restaurant.id} restaurantSlug={restaurant.slug} restaurantPhone={restaurant.whatsapp_number || restaurant.phone || ''} restaurantName={restaurant.name} tokens={tokens} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Info section */}
          <div className="mt-10 space-y-3 pt-8" style={{ borderTop: `1px solid ${tokens.border}` }}>
            {restaurant.address && (
              <GoogleMap
                address={restaurant.address!}
                city={restaurant.city ?? 'Dakar'}
                latitude={(restaurant as { latitude?: number | null }).latitude}
                longitude={(restaurant as { longitude?: number | null }).longitude}
                tokens={tokens}
              />
            )}

            {restaurant.phone && (
              <div className="rounded-2xl p-5" style={{ backgroundColor: tokens.bgCard, border: `1px solid ${tokens.border}` }}>
                <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm" style={{ color: tokens.textPrimary }}>
                  <Phone className="w-4 h-4" style={{ color: tokens.accent }} />Contact
                </h3>
                <a href={`tel:${restaurant.phone}`} className="flex items-center justify-between transition-colors" style={{ color: tokens.textSecondary }}>
                  <span className="text-sm">{restaurant.phone}</span>
                  <ChevronRight className="w-4 h-4" />
                </a>
              </div>
            )}
          </div>

          {/* Footer */}
          {!canHideBranding && (
            <div className="mt-8 pt-5 text-center" style={{ borderTop: `1px solid ${tokens.border}` }}>
              <a href="/" className="inline-flex items-center gap-1.5 text-xs transition-colors" style={{ color: tokens.textMuted }}>
                <Zap className="w-3 h-3" style={{ color: tokens.accent }} />
                Propulsé par TerangaLink
              </a>
            </div>
          )}
        </div>

        {/* Desktop cart sidebar */}
        <div className="hidden lg:block w-80 flex-shrink-0">
          <div className="sticky top-20 rounded-2xl overflow-hidden max-h-[calc(100vh-6rem)]" style={{ backgroundColor: tokens.bgCard, border: `1px solid ${tokens.border}` }}>
            <CartDrawer inline tokens={tokens} />
          </div>
        </div>
      </div>

      {/* Floating "Retour à l'accueil" — demo only */}
        {restaurant.is_demo && (
        <a
          href="/"
          className="lg:hidden fixed top-4 left-4 z-40 flex items-center gap-2 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-lg transition-all"
          style={{ backgroundColor: tokens.accent, boxShadow: `0 4px 20px ${tokens.accent}40` }}
        >
          <Home className="w-3.5 h-3.5" />
          Accueil
        </a>
      {/* Desktop demo button */}
      {restaurant.is_demo && (
        <a
          href="/"
          className="hidden lg:flex fixed top-6 left-6 z-40 items-center gap-2 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg transition-all hover:opacity-90"
          style={{ backgroundColor: tokens.accent, boxShadow: `0 4px 20px ${tokens.accent}40` }}
        >
          <Home className="w-4 h-4" />
          Retour à l&apos;accueil
        </a>
      )}
      <CartButton tokens={tokens} />
    </div>
  )
}

export function RestaurantPageClient({ data }: Props) {
  return (
    <CartProvider>
      <RestaurantInner data={data} />
    </CartProvider>
  )
}
