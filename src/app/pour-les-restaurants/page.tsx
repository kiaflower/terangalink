import Link from 'next/link'
import { PLANS } from '@/lib/plans'
import type { Metadata } from 'next'
import {
  BookOpen, Link2, Smartphone, MessageCircle, Package, BarChart3,
  Search, Check, Star, Calendar, ArrowRight, ChevronDown,
} from 'lucide-react'
import { Footer } from '@/components/layout/Footer'
import { MobileMenu } from '@/components/landing/MobileMenu'
import { RestaurantDemoCarousel } from '@/components/landing/RestaurantDemoCarousel'
import { RealRestaurantsMarquee } from '@/components/landing/RealRestaurantsMarquee'
import { HeroPhoneMockup } from '@/components/landing/HeroPhoneMockup'
import { Logo } from '@/components/ui/Logo'
import { getSiteUrl } from '@/lib/site-url'
import { getPlatformSettings } from '@/lib/platform-settings'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildWhatsAppMessage } from '@/lib/utils'
import type { Restaurant, MenuCategory, ProductWithVariants } from '@/lib/types'

export const metadata: Metadata = {
  title: 'Organisez vos commandes Instagram et WhatsApp — TerangaLink',
  description: "Vous vendez déjà sur Instagram, TikTok et WhatsApp. TerangaLink range vos commandes dans un lien unique — sans rien changer à votre façon de vendre.",
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

const steps = [
  {
    icon: Smartphone,
    title: 'Vous postez comme d’habitude',
    text: "Instagram, TikTok, Stories, statut WhatsApp : continuez à publier vos plats exactement comme aujourd'hui. Rien à changer ici.",
  },
  {
    icon: Link2,
    title: 'Ils commandent sur votre lien',
    text: "Un seul lien en bio renvoie vers votre restaurant TerangaLink. Vos clients choisissent et commandent seuls — sans vous écrire pour demander le prix ou si c'est toujours dispo.",
  },
  {
    icon: MessageCircle,
    title: 'La commande arrive organisée sur WhatsApp',
    text: "Plats, variantes, coordonnées : tout y est déjà. Vous confirmez et vous livrez, exactement comme avant — mais sans reconstituer la commande dans une conversation.",
  },
]

const features = [
  {
    icon: Link2,
    title: 'Votre lien en bio, mais qui vend',
    description: null as string | null, // filled dynamically with the current domain — see render below
  },
  {
    icon: MessageCircle,
    title: 'Fini les DM à rallonge',
    description: "Vos clients commandent seuls sur votre lien. La commande arrive complète — plats, variantes, coordonnées — directement dans votre WhatsApp. Vous n'avez plus qu'à confirmer.",
  },
  {
    icon: Package,
    title: 'Vos « bientôt disponible », sans repost',
    description: "Ajoutez vos plats une fois, gérez votre stock et activez les précommandes pour vos nouveautés — sans avoir à republier une story à chaque fois qu'on vous demande si c'est arrivé.",
  },
  {
    icon: BarChart3,
    title: 'Vos ventes, sans les noter dans un cahier',
    description: "Vues, commandes, revenus, meilleurs plats : tout est déjà calculé dans votre tableau de bord.",
  },
  {
    icon: BookOpen,
    title: 'Des clients qui ne vous suivent pas encore',
    description: "Votre restaurant apparaît automatiquement dans l'annuaire TerangaLink, consulté par des clients partout au Sénégal — une source de clients en plus d'Instagram et TikTok.",
  },
  {
    icon: Search,
    title: 'Trouvable sur Google aussi',
    description: "Votre restaurant est indexée sur Google dès sa création — nom, description, catégorie — sans configuration technique de votre part.",
  },
  {
    icon: Smartphone,
    title: 'Aussi simple à ouvrir qu’un lien Snap',
    description: "Vos clients commandent depuis leur navigateur, sans rien installer. Zéro téléchargement, zéro commande abandonnée à cause d'une appli.",
  },
]

// TODO: témoignages fictifs — à remplacer par de vrais retours clients dès qu'on en aura.
// On n'a que 5 restaurants actifs à ce jour (cf. section "Elles vendent déjà sur TerangaLink"
// plus haut sur la page, qui sert de vraie preuve sociale en attendant).
const testimonials = [
  { name: 'Fatou', role: 'Restaurant mode, Dakar', stars: 5, content: "Mes clients commandent maintenant directement sur mon lien. Je reçois moins d'appels et des commandes beaucoup plus claires." }, // TODO: témoignage fictif
  { name: 'Moussa', role: 'Téléphonie, Thiès', stars: 4, content: "Le QR code posé à la caisse m'a amené de nouveaux clients. Les gens scannent et commandent facilement." }, // TODO: témoignage fictif
  { name: 'Aïda', role: 'Cosmétiques, Dakar', stars: 5, content: "J'ai activé la gestion de stock et les précommandes pour mes nouveautés. Mes ventes sont mieux organisées qu'avant." }, // TODO: témoignage fictif
]

interface DemoShowcaseEntry {
  restaurant: Restaurant
  categories: MenuCategory[]
  products: ProductWithVariants[]
  reviews: { id: string; customer_name: string | null; rating: number; comment: string | null; created_at: string }[]
  banners: { id: string; text: string }[]
  plan: 'starter' | 'pro'
}

interface RealRestaurantPreview {
  name: string
  slug: string
  cuisine_type: string | null
  logo_url: string | null
  primary_color: string | null
}

// Charge les deux restaurants démo avec toutes les données nécessaires au vrai composant
// RestaurantPageClient (catégories, plats + variantes, avis, bannières) — même logique
// que /[slug]/page.tsx — pour que le mockup animé affiche exactement le vrai rendu.
async function loadDemoShowcase(): Promise<DemoShowcaseEntry[]> {
  const supabase = createClient()
  const admin = createAdminClient()

  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('*')
    .eq('is_demo', true)
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(2)

  if (!restaurants?.length) return []

  const { data: subs } = await admin
    .from('subscriptions')
    .select('restaurant_id, plan')
    .in('restaurant_id', restaurants.map(b => b.id))

  const planByRestaurant = new Map((subs ?? []).map(s => [s.restaurant_id, s.plan]))

  const sorted = restaurants
    .map(b => ({ ...b, plan: (planByRestaurant.get(b.id) ?? 'starter') as 'starter' | 'pro' }))
    .sort((a, b) => (a.plan === b.plan ? 0 : a.plan === 'starter' ? -1 : 1))

  return Promise.all(sorted.map(async b => {
    const isPro = b.plan === 'pro'
    const displayRestaurant = (isPro ? b : { ...b, primary_color: '#F97316', theme: 'light' }) as Restaurant

    const { data: categories } = await supabase
      .from('menu_categories')
      .select('*')
      .eq('restaurant_id', b.id)
      .eq('is_active', true)
      .order('position')

    let productsQuery = supabase
      .from('menu_items')
      .select('*, variants:menu_item_variants(*)')
      .eq('restaurant_id', b.id)
      .eq('is_available', true)
    productsQuery = isPro
      ? productsQuery.order('is_pinned', { ascending: false }).order('position')
      : productsQuery.order('position')
    const { data: products } = await productsQuery

    const { data: banners } = isPro
      ? await supabase
          .from('restaurant_banners')
          .select('id, text')
          .eq('restaurant_id', b.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(3)
      : { data: [] as { id: string; text: string }[] }

    const { data: reviews } = await supabase
      .from('reviews')
      .select('id, customer_name, rating, comment, created_at')
      .eq('restaurant_id', b.id)
      .eq('is_visible', true)
      .order('created_at', { ascending: false })
      .limit(20)

    return {
      restaurant: displayRestaurant,
      categories: (categories ?? []) as MenuCategory[],
      products: (products ?? []) as ProductWithVariants[],
      reviews: reviews ?? [],
      banners: (banners ?? []) as { id: string; text: string }[],
      plan: b.plan,
    }
  }))
}

// Restaurants réels et actifs (is_demo = false) — la vraie preuve sociale de la page.
// On est encore petits (quelques restaurants), donc on montre de la profondeur (des vraies
// restaurants cliquables) plutôt que d'inventer du volume.
async function loadRealRestaurants(): Promise<RealRestaurantPreview[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('restaurants')
    .select('name, slug, cuisine_type, logo_url, primary_color')
    .eq('is_active', true)
    .eq('is_demo', false)
    .order('created_at', { ascending: true })
    .limit(8)

  return (data ?? []).map(b => ({ ...b, name: b.name.trim() }))
}

const faqs = [
  { q: 'Est-ce que je vais perdre le contact direct avec mes clients ?', a: "Non. Les commandes arrivent toujours sur votre WhatsApp, exactement comme aujourd'hui. TerangaLink organise juste ce qui arrive avant — vous gardez toute la conversation avec vos clients." },
  { q: "Je vends déjà bien sur Instagram, pourquoi j'aurais besoin de ça ?", a: "Parce que le problème n'est pas de vendre, c'est de gérer ce que vous vendez déjà. Si vous répondez encore \"c'est combien ?\" en message privé dix fois par jour, ou si vous avez déjà perdu une commande dans vos DM, TerangaLink règle ça." },
  { q: "Je ne suis pas doué avec la technologie, c'est compliqué à utiliser ?", a: "Non. Si vous savez publier une photo sur Instagram, vous savez utiliser TerangaLink." },
  { q: "Est-ce que ça va me coûter cher en internet/data pour gérer mon restaurant ?", a: "Non, le tableau de bord est très léger, pensé pour fonctionner même avec une petite connexion." },
  { q: 'Et si ça ne marche pas pour moi, je perds mon argent ?', a: "Non — vous pouvez créer votre restaurant gratuitement avec TerangaLink Free et l'utiliser sans limite de temps. Vous ne payez que si vous décidez d'aller plus loin." },
  { q: "Je n'ai pas beaucoup de plats, ça vaut le coup pour une petite restaurant ?", a: "Oui. Avec la formule gratuite, vous pouvez déjà publier jusqu'à 10 plats — largement de quoi tester et avoir une vraie restaurant professionnel en ligne." },
  { q: 'Mes clients vont devoir télécharger une application ?', a: "Non, jamais. Ils commandent depuis leur navigateur, comme un lien qu'ils ouvrent normalement." },
  { q: "Si j'arrête, qu'est-ce qui se passe ?", a: "Rien n'est supprimé. Votre restaurant reste en pause jusqu'à réabonnement, et vous pouvez télécharger toutes vos données (commandes, comptabilité) en Excel depuis votre espace commerçant." },
]

export default async function PourLesRestaurantsPage() {
  const siteHost = getSiteUrl().replace(/^https?:\/\//, '')
  const settings = await getPlatformSettings()
  const WHATSAPP_URL = `https://wa.me/${settings.support_whatsapp.replace(/\D/g, '')}`
  const planPrices: Record<string, number> = { starter: settings.plan_starter_price, pro: settings.plan_pro_price }

  const [demoShowcase, realRestaurants] = await Promise.all([
    loadDemoShowcase(),
    loadRealRestaurants(),
  ])

  // Plat réel (issu des restaurants démo, pas inventé) utilisé dans le mockup téléphone
  // du hero — photo, nom, prix et restaurant authentiques plutôt qu'un placeholder générique.
  const allDemoProducts = demoShowcase.flatMap(e =>
    e.products.map(p => ({ ...p, restaurantName: e.restaurant.name, restaurantSlug: e.restaurant.slug }))
  )
  const heroProductSource =
    allDemoProducts.find(p => p.slug === 'robe-wax' && (p.image_url || p.images_urls?.[0])) ??
    allDemoProducts.find(p => p.image_url || p.images_urls?.[0]) ??
    null
  const heroVariant = heroProductSource?.variants?.[0]
    ? { label: heroProductSource.variants[0].name, value: heroProductSource.variants[0].options[0] }
    : null
  const heroProduct = heroProductSource ? {
    name: heroProductSource.name,
    price: heroProductSource.price,
    image: heroProductSource.image_url ?? heroProductSource.images_urls[0],
    restaurantName: heroProductSource.restaurantName,
    variant: heroVariant,
  } : null

  // Le même générateur de message que le vrai tunnel de commande (src/lib/utils#buildWhatsAppMessage)
  // — pas un texte inventé — avec un client et une adresse d'exemple pour illustrer un envoi réel.
  const heroOrderMessage = heroProductSource ? buildWhatsAppMessage(
    heroProductSource.restaurantName,
    [{
      name: heroProductSource.name,
      quantity: 1,
      price: heroProductSource.price,
      variants: heroVariant ? { [heroVariant.label]: heroVariant.value } : undefined,
    }],
    heroProductSource.price,
    'Fatou Diallo',
    '771234567',
    {
      address: 'Castors',
      notes: heroVariant ? undefined : 'Je veux la robe en M',
      paymentMethod: 'Wave',
      dashboardUrl: `${getSiteUrl()}/c/${heroProductSource.restaurantSlug}/TL-000004`,
    }
  ) : null

  return (
    <div className="min-h-screen bg-white">

      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-white" style={{ borderBottom: '1px solid #F3F4F6' }}>
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <Link href="/"><Logo textClassName="text-xl font-bold" textStyle={{ color: '#111111' }} /></Link>
          <div className="hidden md:flex items-center gap-6">
            <Link href="/restaurants" className="text-sm text-gray-500 hover:text-brand-orange transition-colors">Annuaire</Link>
            <Link href="#fonctionnalites" className="text-sm text-gray-500 hover:text-brand-orange transition-colors">Fonctionnalités</Link>
            <Link href="#tarifs" className="text-sm text-gray-500 hover:text-brand-orange transition-colors">Tarifs</Link>
            <Link href="#faq" className="text-sm text-gray-500 hover:text-brand-orange transition-colors">FAQ</Link>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login"
              className="inline-flex text-sm font-semibold px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-white transition-opacity hover:opacity-90 whitespace-nowrap"
              style={{ backgroundColor: '#F97316' }}>
              Me connecter
            </Link>
            <MobileMenu />
          </div>
        </div>
      </nav>

      {/* Hero — fond sombre, lueur orange diffuse, mockups téléphone en illustration */}
      <section className="relative" style={{ backgroundColor: '#0A0A0A' }}>
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -top-32 -left-24 w-[420px] h-[420px] rounded-full opacity-40 blur-[100px]" style={{ backgroundColor: '#F97316' }} />
          <div className="absolute top-1/3 -right-32 w-[380px] h-[380px] rounded-full opacity-30 blur-[110px]" style={{ backgroundColor: '#C2410C' }} />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 py-20 sm:py-28 grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
          <div className="text-center lg:text-left">
            <span className="inline-block text-xs font-bold text-orange-300 uppercase tracking-widest mb-4">
              Pour les restaurants et commerçants
            </span>
            <h1 className="font-black text-4xl sm:text-5xl text-white mb-6 leading-tight tracking-tight">
              Fini les commandes<br />
              <span className="text-gradient">perdues dans vos DM</span>
            </h1>
            <p className="text-lg sm:text-xl mb-8" style={{ color: 'rgba(255,255,255,0.65)' }}>
              Vous vendez déjà sur Instagram, TikTok et WhatsApp. TerangaLink range vos commandes dans un lien unique — vos clients commandent seuls, vous recevez tout, organisé, sur WhatsApp.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
              <Link href="/inscription"
                className="inline-flex items-center justify-center gap-2 bg-brand-orange text-white px-8 py-4 rounded-2xl font-bold text-base hover:bg-brand-orange-dark transition-colors w-full sm:w-auto whitespace-nowrap">
                Commencer gratuitement
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a href="#comment-ca-marche"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold text-base text-white transition-colors hover:bg-white/10 w-full sm:w-auto whitespace-nowrap"
                style={{ border: '1.5px solid rgba(255,255,255,0.25)' }}>
                Voir comment ça marche
                <ChevronDown className="w-4 h-4" />
              </a>
            </div>
            <p className="inline-flex items-center gap-2 text-sm mt-6" style={{ color: 'rgba(255,255,255,0.5)' }}>
              <Check className="w-4 h-4 text-orange-300 shrink-0" />
              Gratuit pour démarrer, sans limite de durée
            </p>
          </div>

          <HeroPhoneMockup product={heroProduct} orderMessage={heroOrderMessage} />
        </div>
      </section>

      {/* Preuve réelle — logos des restaurants actifs qui défilent, pas une grosse section */}
      {realRestaurants.length > 0 && (
        <section style={{ backgroundColor: '#0A0A0A' }}>
          <div className="max-w-5xl mx-auto px-4 pt-10 pb-16 sm:pb-20" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-center text-sm sm:text-base font-bold text-orange-300 uppercase tracking-widest mb-6 pt-10">
              Elles vendent déjà sur TerangaLink
            </p>
            <RealRestaurantsMarquee restaurants={realRestaurants} dark />
            <div className="text-center mt-4">
              <Link href="/restaurants" className="inline-flex items-center gap-2 text-sm font-semibold text-orange-300 hover:text-white transition-colors">
                Voir toutes les restaurants dans la vitrine publique
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Comment ça marche — le parcours Instagram/TikTok → TerangaLink → WhatsApp.
          Coins arrondis + léger chevauchement vers le haut : la section blanche
          se pose comme une feuille par-dessus le fond sombre, plutôt qu'une coupure nette. */}
      <section id="comment-ca-marche"
        className="relative z-10 -mt-8 sm:-mt-10 pt-10 sm:pt-14 pb-20 px-4 bg-white rounded-t-[2rem] sm:rounded-t-[2.5rem] rounded-b-[2rem] sm:rounded-b-[2.5rem] shadow-[0_-24px_40px_-28px_rgba(0,0,0,0.2),0_24px_40px_-28px_rgba(0,0,0,0.2)]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-block text-xs font-bold text-brand-orange uppercase tracking-widest mb-3">Comment ça marche</span>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Votre routine ne change pas — le chaos, lui, disparaît</h2>
            <p className="text-gray-500">TerangaLink s&apos;ajoute à ce que vous faites déjà, en 3 étapes.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((s, i) => (
              <div key={s.title} className="relative">
                <div className="h-full rounded-2xl p-6 text-center bg-gray-50 border border-gray-100 transition-colors hover:border-orange-200">
                  <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-orange-100 flex items-center justify-center mx-auto mb-4">
                    <s.icon className="w-6 h-6 text-brand-orange" />
                  </div>
                  <span className="inline-block text-xs font-bold text-brand-orange mb-2 tracking-wide">ÉTAPE {i + 1}</span>
                  <h3 className="font-bold text-gray-900 mb-2">{s.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{s.text}</p>
                </div>
                {i < steps.length - 1 && (
                  <ArrowRight className="hidden md:block absolute top-1/2 -right-4 -translate-y-1/2 w-6 h-6 text-orange-200 z-10" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Aperçu de l'interface — démonstration interactive du vrai plat.
          Même traitement que le hero : fond sombre + lueur orange diffuse.
          Glissée sous la courbe basse de la section blanche au-dessus. */}
      {demoShowcase.length > 0 && (
        <section className="relative -mt-8 sm:-mt-10 pt-16 sm:pt-20 pb-16 px-4 overflow-hidden" style={{ backgroundColor: '#0A0A0A' }}>
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            <div className="absolute top-1/4 -right-28 w-[360px] h-[360px] rounded-full opacity-35 blur-[110px]" style={{ backgroundColor: '#C2410C' }} />
            <div className="absolute -bottom-24 -left-20 w-[400px] h-[400px] rounded-full opacity-30 blur-[120px]" style={{ backgroundColor: '#F97316' }} />
          </div>
          <div className="relative max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-3">
                Voici ce que vos clients verront
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.65)' }}>Deux exemples réels, en Starter et en Pro — exactement ce qui s&apos;affiche quand un client clique sur votre lien.</p>
            </div>
            <RestaurantDemoCarousel entries={demoShowcase} />
          </div>
        </section>
      )}

      {/* Features — même traitement "feuille arrondie" que Comment ça marche : courbe
          en haut (vers la démo sombre) et en bas (vers les tarifs, désormais sombres). */}
      <section id="fonctionnalites"
        className="relative z-10 -mt-8 sm:-mt-10 pt-14 sm:pt-16 pb-20 bg-gray-50 rounded-t-[2rem] sm:rounded-t-[2.5rem] rounded-b-[2rem] sm:rounded-b-[2.5rem] shadow-[0_-24px_40px_-28px_rgba(0,0,0,0.2),0_24px_40px_-28px_rgba(0,0,0,0.2)]">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <span className="inline-block text-xs font-bold text-brand-orange uppercase tracking-widest mb-3">Fonctionnalités</span>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Ce que TerangaLink organise pour vous</h2>
            <p className="text-gray-500">Sept choses que vous faites déjà à la main aujourd&apos;hui, automatisées ici</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map(f => (
              <div key={f.title} className="bg-white rounded-2xl p-6 border border-gray-100 transition-colors hover:border-orange-200">
                <div className="mb-3">
                  <f.icon className="w-7 h-7 text-brand-orange" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  {f.description ?? `${siteHost}/votre-restaurant — partagez-le partout : Instagram, Snapchat, WhatsApp, cartes de visite. Vos clients arrivent directement sur votre vitrine, sans DM.`}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing — fond sombre + lueur orange, comme le hero. Glissée sous la courbe
          basse de la section Features au-dessus. */}
      <section id="tarifs" className="relative -mt-8 sm:-mt-10 pt-16 sm:pt-20 pb-20 overflow-hidden" style={{ backgroundColor: '#0A0A0A' }}>
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -top-20 left-1/3 w-[380px] h-[380px] rounded-full opacity-30 blur-[120px]" style={{ backgroundColor: '#FB923C' }} />
          <div className="absolute bottom-0 -right-24 w-[420px] h-[420px] rounded-full opacity-35 blur-[100px]" style={{ backgroundColor: '#C2410C' }} />
        </div>
        <div className="relative max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <span className="inline-block text-xs font-bold text-orange-300 uppercase tracking-widest mb-3">Tarifs</span>
            <h2 className="text-3xl font-bold text-white mb-4">Nos tarifs</h2>
            <p style={{ color: 'rgba(255,255,255,0.65)' }}>Commencez gratuitement avec Free, sans limite de durée. Passez à Starter ou Pro quand votre restaurant grandit.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {(Object.entries(PLANS) as [string, typeof PLANS.starter][]).map(([key, plan]) => (
              <div key={key} className={`rounded-2xl p-8 border-2 ${key === 'pro' ? 'border-brand-orange bg-orange-50 glow-orange' : 'border-gray-200 bg-white'}`}>
                {key === 'pro' && (
                  <span className="inline-block bg-brand-orange text-white text-xs px-3 py-1 rounded-full font-medium mb-4">
                    Recommandé
                  </span>
                )}
                {key === 'free' && (
                  <span className="inline-block bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full font-medium mb-4">
                    Pour commencer
                  </span>
                )}
                <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                <div className="flex items-baseline gap-1 my-4">
                  <span className="text-4xl font-bold text-gray-900">
                    {new Intl.NumberFormat('fr-SN').format(planPrices[key] ?? plan.price)}
                  </span>
                  <span className="text-gray-500">{plan.currency}/{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                      <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/inscription"
                  className={`block text-center py-3 rounded-xl font-semibold transition-colors ${
                    key === 'pro'
                      ? 'bg-brand-orange text-white hover:bg-brand-orange-dark'
                      : 'border-2 border-brand-orange text-brand-orange hover:bg-brand-orange hover:text-white'
                  }`}
                >
                  {key === 'free' ? 'Commencer gratuitement' : `Choisir ${plan.name}`}
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center text-sm mt-8" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Envie de tester Starter ou Pro avant de choisir ?{' '}
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-orange-300 hover:text-white hover:underline">
              Écrivez-nous sur WhatsApp
            </a>{' '}
            pour un essai gratuit de 8 jours.
          </p>
        </div>
      </section>

      {/* Testimonials — voir le TODO sur `testimonials` plus haut dans ce fichier : fictifs.
          Courbe de début (vers les tarifs sombres) et de fin (vers la FAQ sombre). */}
      <section id="temoignages"
        className="relative z-10 -mt-8 sm:-mt-10 pt-14 sm:pt-20 pb-16 sm:pb-24 rounded-t-[2rem] sm:rounded-t-[2.5rem] rounded-b-[2rem] sm:rounded-b-[2.5rem] shadow-[0_-24px_40px_-28px_rgba(0,0,0,0.2),0_24px_40px_-28px_rgba(0,0,0,0.2)]"
        style={{ backgroundColor: '#F9FAFB' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="inline-block text-xs font-bold text-brand-orange uppercase tracking-widest mb-3">Témoignages</span>
            <h2 className="font-bold text-3xl sm:text-4xl leading-tight tracking-tight" style={{ color: '#111111' }}>
              Ce que racontent nos commerçants
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map(t => (
              <div key={t.name} className="rounded-2xl p-6 transition-colors hover:border-orange-200"
                style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB' }}>
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`w-4 h-4 ${i < t.stars ? 'fill-orange-500 text-orange-500' : 'text-gray-200'}`} />
                  ))}
                </div>
                <p className="text-sm leading-relaxed mb-4 italic" style={{ color: '#6B7280' }}>&ldquo;{t.content}&rdquo;</p>
                <div>
                  <p className="font-semibold text-sm" style={{ color: '#111111' }}>{t.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ — fond sombre + lueur orange, comme le hero. Glissée sous la courbe
          basse des témoignages au-dessus. */}
      <section id="faq" className="relative -mt-8 sm:-mt-10 pt-16 sm:pt-20 pb-20 overflow-hidden" style={{ backgroundColor: '#0A0A0A' }}>
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute top-0 -left-16 w-[360px] h-[360px] rounded-full opacity-30 blur-[110px]" style={{ backgroundColor: '#C2410C' }} />
          <div className="absolute bottom-1/4 -right-20 w-[400px] h-[400px] rounded-full opacity-35 blur-[105px]" style={{ backgroundColor: '#F97316' }} />
        </div>
        <div className="relative max-w-3xl mx-auto px-4">
          <div className="text-center mb-12">
            <span className="inline-block text-xs font-bold text-orange-300 uppercase tracking-widest mb-3">FAQ</span>
            <h2 className="text-3xl font-bold text-white">Questions fréquentes</h2>
          </div>
          <div className="space-y-4">
            {faqs.map(faq => (
              <details key={faq.q} className="group rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.12)' }}>
                <summary className="flex items-center justify-between px-6 py-4 cursor-pointer font-semibold text-white list-none">
                  {faq.q}
                  <ChevronDown className="w-4 h-4 text-orange-300 group-open:rotate-180 transition-transform flex-shrink-0 ml-4" />
                </summary>
                <div className="px-6 pb-5 text-sm leading-relaxed pt-4" style={{ color: 'rgba(255,255,255,0.65)', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final — courbe de début pour se poser sur la FAQ sombre au-dessus. */}
      <section
        className="relative z-10 -mt-8 sm:-mt-10 pt-14 sm:pt-16 pb-16 px-4 rounded-t-[2rem] sm:rounded-t-[2.5rem] shadow-[0_-24px_40px_-28px_rgba(0,0,0,0.35)]"
        style={{ backgroundColor: '#F97316' }}>
        <div className="max-w-2xl mx-auto text-center text-white">
          <h2 className="font-black text-3xl sm:text-4xl leading-tight mb-4">
            Prêt à professionnaliser votre activité ?
          </h2>
          <p className="text-base mb-8 max-w-lg mx-auto" style={{ color: 'rgba(255,255,255,0.85)' }}>
            Découvrez comment configurer votre site vitrine gratuitement en 30 minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link href="/rendez-vous"
              className="inline-flex items-center justify-center gap-2 font-bold px-7 py-3.5 rounded-xl transition-all hover:opacity-90 w-full sm:w-auto"
              style={{ backgroundColor: '#FFFFFF', color: '#F97316' }}>
              <Calendar className="w-4 h-4" />
              Réserver un appel découverte
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 font-bold px-7 py-3.5 rounded-xl transition-all hover:bg-white/10 w-full sm:w-auto"
              style={{ color: '#FFFFFF', border: '1.5px solid rgba(255,255,255,0.5)' }}>
              <MessageCircle className="w-4 h-4" />
              Nous écrire sur WhatsApp
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
