'use client'

import { useState } from 'react'
import Image from 'next/image'
import { MapPin, Phone, Zap, Share2, PhoneCall, Truck, Home } from 'lucide-react'
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
  latitude?: number | null
  longitude?: number | null
  instagram_url?: string | null
  facebook_url?: string | null
  tiktok_url?: string | null
  snapchat_url?: string | null
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

  const plan = normalizePlan(restaurant.plan || (restaurant.is_demo ? 'free' : 'mensuel'))
  const shouldShowTerangaBranding = !restaurant.is_demo && (plan === 'mensuel' || plan === 'trimestriel')
  const canCall = canUseFeature(plan, 'boutonAppel')
  const canShare = canUseFeature(plan, 'boutonPartage')

  const themeConfig: RestaurantTheme = {
    primary: restaurant.primary_color || '#F97316',
    mode: restaurant.theme_mode || 'dark',
    background: restaurant.background_color || undefined,
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
        {(restaurant as { banner_url?: string; cover_url?: string }).banner_url || restaurant.cover_url ? (
          <Image
            src={(restaurant as { banner_url?: string }).banner_url || restaurant.cover_url!}
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

        {/* TerangaLink branding (mensuel/trimestriel uniquement) */}
        {shouldShowTerangaBranding && (
          <a href="/" className="absolute top-3 left-4 flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: tokens.accent }}>
              <Zap className="w-3 h-3 text-white" />
            </div>
            <span className="text-xs font-semibold" style={{ color: tokens.textPrimary, opacity: 0.7 }}>TerangaLink</span>
          </a>
        )}

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

        <div className="flex flex-wrap gap-3 items-center">
          {restaurant.city && (
            <div className="flex items-center gap-1.5 text-xs" style={{ color: tokens.textMuted }}>
              <MapPin className="w-3.5 h-3.5" style={{ color: tokens.accent }} />
              {restaurant.city}
            </div>
          )}
          {restaurant.phone && (
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
                ? { backgroundColor: tokens.accent, color: tokens.textOnAccent }
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
                  ? { backgroundColor: tokens.accent, color: tokens.textOnAccent }
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
                city={restaurant.city}
                latitude={restaurant.latitude ?? null}
                longitude={restaurant.longitude ?? null}
                tokens={tokens}
              />
            )}

            {/* Social media links */}
            {(restaurant.instagram_url || restaurant.facebook_url || restaurant.tiktok_url || restaurant.snapchat_url) && (
              <div className="flex items-center gap-3 pt-2 flex-wrap">
                {restaurant.instagram_url && (
                  <a
                    href={restaurant.instagram_url.startsWith('http') ? restaurant.instagram_url : `https://instagram.com/${restaurant.instagram_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-opacity hover:opacity-80"
                    style={{ backgroundColor: tokens.bgCard, border: `1px solid ${tokens.border}` }}
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: tokens.textSecondary }}>
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                    </svg>
                  </a>
                )}
                {restaurant.facebook_url && (
                  <a
                    href={restaurant.facebook_url.startsWith('http') ? restaurant.facebook_url : `https://facebook.com/${restaurant.facebook_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook"
                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-opacity hover:opacity-80"
                    style={{ backgroundColor: tokens.bgCard, border: `1px solid ${tokens.border}` }}
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" style={{ color: tokens.textSecondary }}>
                      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
                    </svg>
                  </a>
                )}
                {restaurant.tiktok_url && (
                  <a
                    href={restaurant.tiktok_url.startsWith('http') ? restaurant.tiktok_url : `https://tiktok.com/@${restaurant.tiktok_url.replace(/^@/, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="TikTok"
                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-opacity hover:opacity-80"
                    style={{ backgroundColor: tokens.bgCard, border: `1px solid ${tokens.border}` }}
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" style={{ color: tokens.textSecondary }}>
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.17 8.17 0 0 0 4.78 1.52V6.77a4.85 4.85 0 0 1-1.01-.08z"/>
                    </svg>
                  </a>
                )}
                {restaurant.snapchat_url && (
                  <a
                    href={restaurant.snapchat_url.startsWith('http') ? restaurant.snapchat_url : `https://snapchat.com/add/${restaurant.snapchat_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Snapchat"
                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-opacity hover:opacity-80"
                    style={{ backgroundColor: tokens.bgCard, border: `1px solid ${tokens.border}` }}
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" style={{ color: tokens.textSecondary }}>
                      <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.12.068.381.143.658.143.307-.012.6-.123.85-.301.132-.09.287-.14.443-.14.116 0 .224.031.315.083.187.101.301.288.301.490 0 .271-.201.509-.571.657-.006.003-.412.097-.59.132-.56.09-1.084.165-1.409.395-.166.116-.234.28-.203.45l.016.148c.05.475.131 1.274.379 2.292.019.066.019.12-.019.185-.042.081-.219.101-.261.101-.16 0-.339-.048-.528-.122-.395-.157-.83-.242-1.291-.242-.43 0-.841.078-1.25.224-.412.147-.712.312-.972.456-.3.163-.569.31-.871.31-.287 0-.558-.133-.837-.422l-.006-.006c-.183-.193-.385-.404-.612-.586-.393-.307-.907-.489-1.408-.489-.527 0-1.015.18-1.435.484-.24.176-.453.398-.642.602l-.003.003c-.275.293-.546.424-.833.424-.303 0-.572-.147-.871-.31-.26-.144-.56-.309-.971-.456-.41-.146-.82-.224-1.25-.224-.462 0-.897.085-1.292.242-.189.074-.367.122-.527.122-.043 0-.22-.02-.262-.101-.038-.065-.038-.119-.019-.185.249-1.018.33-1.817.379-2.292l.016-.147c.031-.17-.037-.334-.203-.45-.326-.231-.85-.305-1.41-.394-.177-.036-.583-.13-.589-.133-.37-.148-.571-.386-.571-.657 0-.202.114-.389.3-.49.092-.052.2-.083.316-.083.155 0 .31.05.443.14.25.178.542.29.849.301.278 0 .54-.075.659-.143-.008-.165-.018-.33-.03-.51l-.003-.06c-.104-1.628-.23-3.654.3-4.847 1.58-3.545 4.937-3.821 5.927-3.821l.036-.001z"/>
                    </svg>
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Powered by TerangaLink (mensuel/trimestriel uniquement) */}
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