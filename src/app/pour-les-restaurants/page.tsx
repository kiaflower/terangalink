import Link from 'next/link'
import { LandingNav } from '@/components/landing/LandingNav'
import { Footer } from '@/components/layout/Footer'
import { CtaDecouverte } from '@/components/landing/CtaDecouverte'
import { getPlatformSettings } from '@/lib/settings'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Rejoignez TerangaLink — Restaurants, traiteurs, pâtisseries au Sénégal',
  description: 'TerangaLink donne à votre activité un site de commande professionnel. Restaurants, traiteurs, pâtisseries — visible sur Google, dans notre annuaire, commandes via WhatsApp. Inscription en moins de 24h.',
  keywords: 'créer site restaurant Sénégal, traiteur en ligne Dakar, pâtisserie commande WhatsApp, visibilité food Dakar, TerangaLink pro, rejoindre TerangaLink',
  openGraph: {
    title: 'Rejoignez TerangaLink | Pros de la food au Sénégal',
    description: 'Site de commande professionnel, annuaire, Google — tout pour développer votre activité food au Sénégal.',
    url: 'https://www.teranga-link.com/pour-les-restaurants',
    siteName: 'TerangaLink',
    locale: 'fr_SN',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: 'Rejoignez TerangaLink | Pros de la food au Sénégal', description: 'Site de commande professionnel, annuaire, Google — tout pour développer votre activité food au Sénégal.' },
  alternates: { canonical: 'https://www.teranga-link.com/pour-les-restaurants' },
}
import {
  Zap, Smartphone, Shield, Globe, Search,
  Check, Star, ArrowRight, UtensilsCrossed, ShoppingBag, BarChart3, MessageCircle, Store,
} from 'lucide-react'

const WHATSAPP_NUMBER = '221774739266'
const WHATSAPP_MSG = encodeURIComponent("Bonjour, j'ai découvert TerangaLink et je souhaite inscrire mon restaurant.")
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MSG}`

const features = [
  { icon: UtensilsCrossed, title: 'Annuaire TerangaLink', description: "Votre restaurant est listé dans notre annuaire public consulté par les clients qui cherchent où manger au Sénégal. Visibilité immédiate." },
  { icon: Globe, title: 'Site de commande premium', description: "Votre propre site de commande professionnel avec votre menu, vos photos et vos prix. Optimisé pour mobile." },
  { icon: ShoppingBag, title: 'Commandes via WhatsApp', description: "Vos clients commandent en un clic. Le résumé arrive directement sur votre WhatsApp — sans appli à installer." },
  { icon: Smartphone, title: 'Optimisé pour mobile', description: 'Pensé pour tous les smartphones. Vos clients commandent depuis leur téléphone en quelques secondes.' },
  { icon: BarChart3, title: 'Statistiques & revenus', description: 'Suivez vos ventes, vos meilleurs plats et votre croissance en FCFA depuis votre tableau de bord.' },
  { icon: Search, title: 'Référencement Google inclus', description: "Votre restaurant apparaît automatiquement sur Google dès sa création — titre, description, fiche locale — sans aucune action de votre part." },
  { icon: Shield, title: 'Sécurisé & fiable', description: "Données sécurisées, uptime 99.9%. Votre business ne s'arrête jamais." },
]

const plans = [
  {
    name: 'Starter', price: '9 000', period: '/mois', description: "L'essentiel pour démarrer en ligne", badge: null, popular: false,
    features: ['Listé dans l\'annuaire TerangaLink', 'Site de commande', 'Menu illimité', 'Commandes WhatsApp', 'Dashboard administrateur', 'Statistiques & revenus', 'QR Code', 'Support WhatsApp'],
  },
  {
    name: 'Pro', price: '15 000', period: '/mois', description: 'Personnalisation + visibilité maximale', badge: null, popular: true,
    features: ['Tout Starter', 'Mise en avant dans l\'annuaire', 'Branding TerangaLink supprimé', 'Thème clair ou sombre', 'Couleurs personnalisées', 'Réseaux sociaux affichés', 'Génération de reçus', 'Support prioritaire'],
  },
  {
    name: 'Premium', price: '25 000', period: '/mois', description: 'E-commerce avancé pour les restaurants ambitieux', badge: 'NOUVEAU', popular: false,
    features: ['Tout Pro', 'Variantes de produits', 'Gestion de stock', 'Précommandes', 'Codes promo clients', 'Produits mis en avant', 'Bannières promotionnelles'],
  },
]

const testimonials = [
  { name: 'Marième', role: 'Petits fours faits maison, Keur Massar', stars: 4, content: "Les clients comprennent mieux le menu maintenant, surtout avec les photos. On reçoit aussi beaucoup moins d'appels pour demander les prix." },
  { name: 'Ibou', role: 'Fast food, Cité Keur Gorgui', stars: 5, content: "Franchement le QR code nous a beaucoup aidés pendant les heures de pointe. Les commandes arrivent plus clairement qu'avant." },
  { name: 'Awa', role: 'Gérante, Adjamé', stars: 4, content: "Au début je pensais que ça allait être compliqué à gérer, mais finalement tout se fait facilement depuis le téléphone." },
]

const faqs = [
  { q: "C'est quoi l'annuaire TerangaLink ?", a: "L'annuaire est une page publique sur teranga-link.com où tous les clients peuvent découvrir les adresses inscrites sur la plateforme. Dès que vous créez votre profil, votre activité y apparaît automatiquement — avec votre nom, votre ville, votre type de cuisine et vos avis." },
  { q: 'Comment fonctionne TerangaLink ?', a: "Votre activité obtient un site de commande unique. Vos clients y accèdent, parcourent votre menu et commandent. La commande arrive directement sur votre WhatsApp." },
  { q: "Ai-je besoin de compétences techniques ?", a: "Aucune. Notre tableau de bord est conçu pour être utilisé depuis un smartphone. Tout est visuel et intuitif." },
  { q: "Combien de temps pour être en ligne ?", a: "Moins de 24h. Vous remplissez votre profil, ajoutez votre menu, et vous êtes prêts à recevoir des commandes et à apparaître dans l'annuaire." },
  { q: 'Mon adresse sera-t-elle visible sur Google ?', a: "Oui, automatiquement. Dès que votre activité est créée sur TerangaLink, elle est référencée sur Google. Vos clients peuvent vous trouver en tapant votre nom, et quand ils partagent votre lien sur WhatsApp, une belle carte visuelle apparaît." },
  { q: "Comment les clients paient-ils ?", a: "Les clients commandent via WhatsApp. Vous gérez le paiement directement avec eux — Wave, Orange Money, cash, comme vous préférez." },
  { q: "Puis-je annuler à tout moment ?", a: "Oui, les offres Starter, Pro et Premium sont mensuelles et peuvent être résiliées à la fin du mois en cours." },
]

export default async function PourLesRestaurantsPage() {
  const settings = await getPlatformSettings()

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ backgroundColor: '#FFFFFF', color: '#111111' }}>
      <LandingNav />

      {/* ── Hero ── */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 overflow-hidden">
        {/* Image plein hero — bien visible */}
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1400&q=80&auto=format&fit=crop"
            alt=""
            className="w-full h-full object-cover"
            aria-hidden="true"
          />
          {/* Overlay blanc assez léger pour voir l'image, assez opaque pour lire le texte */}
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.82) 0%, rgba(255,255,255,0.92) 60%, rgba(255,255,255,0.98) 100%)' }} />
        </div>

        <div className="container-app relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6 text-xs font-semibold uppercase tracking-wider"
              style={{ backgroundColor: 'rgba(249,115,22,0.1)', color: '#EA580C', border: '1px solid rgba(249,115,22,0.2)' }}>
              <Store className="w-3.5 h-3.5" />
              Pour les pros de la food au Sénégal
            </div>
            <h1 className="heading-xl mb-6" style={{ color: '#111111' }}>
              Boostez la visibilité{' '}
              <span style={{ color: '#F97316' }}>de votre cuisine</span>
            </h1>
            <p className="text-lg sm:text-xl max-w-2xl mx-auto mb-4 leading-relaxed" style={{ color: '#374151' }}>
              TerangaLink vous donne un site de commande professionnel, une visibilité dans notre annuaire, et les outils pour développer votre clientèle au Sénégal.
            </p>

            {/* 3 arguments clés */}
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mb-10">
              {[
                { icon: Globe, text: 'Visible sur Google' },
                { icon: UtensilsCrossed, text: "Dans l'annuaire TerangaLink" },
                { icon: MessageCircle, text: 'Commandes via WhatsApp' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-1.5 text-sm font-medium" style={{ color: '#6B7280' }}>
                  <Icon className="w-4 h-4" style={{ color: '#F97316' }} />
                  {text}
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/inscription"
                className="inline-flex items-center justify-center gap-2 text-white font-semibold px-7 py-3.5 rounded-xl text-base transition-all hover:opacity-90 group shadow-lg"
                style={{ backgroundColor: '#F97316', boxShadow: '0 4px 20px rgba(249,115,22,0.3)' }}>
                <Store className="w-5 h-5" />
                Créer mon restaurant
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="/chez-teranga"
                className="inline-flex items-center justify-center gap-2 font-semibold px-7 py-3.5 rounded-xl text-base transition-all hover:opacity-80"
                style={{ color: '#F97316', border: '1.5px solid #F97316' }}>
                Voir la démo
              </Link>
            </div>
            <div className="flex items-center justify-center gap-6 mt-12 flex-wrap">
              <div className="flex -space-x-2">
                {['M', 'I', 'A', 'F'].map((letter, i) => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: '#F97316', borderColor: '#FFFFFF' }}>
                    {letter}
                  </div>
                ))}
              </div>
              <div className="text-sm" style={{ color: '#9CA3AF' }}>
                <span className="font-bold" style={{ color: '#111111' }}>+25 restaurants</span> actifs sur TerangaLink
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="fonctionnalités" className="section" style={{ borderTop: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>
        <div className="container-app">
          <div className="text-center mb-14">
            <h2 className="heading-lg mb-4" style={{ color: '#111111' }}>Tout ce dont votre activité a besoin</h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: '#6B7280' }}>Une plateforme complète pensée pour les pros de la food au Sénégal.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(feature => (
              <div key={feature.title}
                className="rounded-2xl p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
                style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB' }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: 'rgba(249,115,22,0.08)' }}>
                  <feature.icon className="w-5 h-5" style={{ color: '#F97316' }} />
                </div>
                <h3 className="font-semibold text-lg mb-2" style={{ color: '#111111' }}>{feature.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#6B7280' }}>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section clients — aparté ── */}
      <section style={{ backgroundColor: '#FFF7ED', borderTop: '2px solid #FED7AA', borderBottom: '2px solid #FED7AA' }}>
        <div className="container-app py-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#EA580C' }}>
              Pour vos futurs clients
            </p>
            <h3 className="text-xl font-black mb-1" style={{ color: '#111111' }}>
              Vous cherchez où manger au Sénégal ?
            </h3>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              Découvrez notre annuaire de restaurants — vos clients y passent déjà.
            </p>
          </div>
          <Link
            href="/restaurants"
            className="inline-flex items-center gap-2 font-bold text-sm px-6 py-3 rounded-xl text-white flex-shrink-0 transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#F97316' }}
          >
            <UtensilsCrossed className="w-4 h-4" />
            Voir les restaurants
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="tarifs" className="section" style={{ borderTop: '1px solid #E5E7EB', backgroundColor: '#FFFFFF' }}>
        <div className="container-app">
          <div className="text-center mb-14">
            <h2 className="heading-lg mb-4" style={{ color: '#111111' }}>Tarifs simples et transparents</h2>
            <p className="text-lg" style={{ color: '#6B7280' }}>En FCFA. Sans frais cachés.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map(plan => (
              <div key={plan.name}
                className="relative rounded-2xl p-6 sm:p-8 flex flex-col transition-all hover:-translate-y-0.5 hover:shadow-lg"
                style={plan.popular ? {
                  backgroundColor: '#FFF7ED', border: '2px solid #F97316',
                  boxShadow: '0 4px 24px rgba(249,115,22,0.12)',
                } : {
                  backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB',
                }}>
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-white text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap"
                    style={{ backgroundColor: '#F97316' }}>LE PLUS POPULAIRE</div>
                )}
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-white text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap"
                    style={{ backgroundColor: '#22C55E' }}>{plan.badge}</div>
                )}
                <div className="mb-6">
                  <h3 className="font-bold text-xl mb-1" style={{ color: '#111111' }}>{plan.name}</h3>
                  <p className="text-sm mb-4" style={{ color: '#6B7280' }}>{plan.description}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold" style={{ color: '#111111' }}>{plan.price}</span>
                    <span className="text-sm" style={{ color: '#9CA3AF' }}>FCFA{plan.period}</span>
                  </div>
                </div>
                <ul className="space-y-3 flex-1 mb-6">
                  {plan.features.map(feat => (
                    <li key={feat} className="flex items-start gap-2.5 text-sm" style={{ color: '#374151' }}>
                      <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#F97316' }} />{feat}
                    </li>
                  ))}
                </ul>
                <Link href="/inscription"
                  className="w-full flex items-center justify-center gap-2 font-semibold py-3 rounded-xl text-sm transition-all hover:opacity-90"
                  style={plan.popular ? { backgroundColor: '#F97316', color: '#FFFFFF' } : { border: '1.5px solid #F97316', color: '#F97316' }}>
                  <Store className="w-4 h-4" />Commencer
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section id="témoignages" className="section" style={{ borderTop: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>
        <div className="container-app">
          <div className="text-center mb-14">
            <h2 className="heading-lg mb-4" style={{ color: '#111111' }}>Ils font confiance à TerangaLink</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map(t => (
              <div key={t.name} className="rounded-2xl p-6 transition-all hover:shadow-md"
                style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB' }}>
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`w-4 h-4 ${i < t.stars ? 'fill-orange-400 text-orange-400' : 'text-gray-200'}`} />
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

      {/* ── FAQ ── */}
      <section id="faq" className="section" style={{ borderTop: '1px solid #E5E7EB', backgroundColor: '#FFFFFF' }}>
        <div className="container-app">
          <div className="text-center mb-14">
            <h2 className="heading-lg mb-4" style={{ color: '#111111' }}>Questions fréquentes</h2>
          </div>
          <div className="max-w-2xl mx-auto space-y-4">
            {faqs.map(faq => (
              <div key={faq.q} className="rounded-2xl p-5"
                style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                <h3 className="font-semibold mb-2" style={{ color: '#111111' }}>{faq.q}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#6B7280' }}>{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CtaDecouverte />

      <Footer whatsapp={settings.whatsapp} email={settings.email} city={settings.city} />
    </div>
  )
}
