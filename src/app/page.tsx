import Link from 'next/link'
import { LandingNav } from '@/components/landing/LandingNav'
import { getPlatformSettings } from '@/lib/settings'
import {
  Zap, Smartphone, Shield, Globe,
  Check, Star, ArrowRight, UtensilsCrossed, ShoppingBag, BarChart3, MessageCircle,
  Mail, Phone,
} from 'lucide-react'

const WHATSAPP_NUMBER = '221774739266'
const WHATSAPP_MSG = encodeURIComponent("Bonjour, j'ai découvert TerangaLink et je souhaite inscrire mon restaurant.")
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MSG}`

// Contact info — also editable in super admin settings
const CONTACT_INFO = {
  whatsapp: WHATSAPP_NUMBER,
  email: 'support@terangalink.sn',
  city: 'Dakar, Sénégal',
}

const features = [
  { icon: Globe, title: 'Site de commande premium', description: "Votre restaurant obtient son propre site de commande professionnel, optimisé pour mobile." },
  { icon: Smartphone, title: 'Optimisé pour mobile', description: 'Pensé pour tous les smartphones.' },
  { icon: ShoppingBag, title: 'Commande via WhatsApp', description: "Vos clients commandent en un clic. Le résumé arrive directement sur votre WhatsApp." },
  { icon: UtensilsCrossed, title: 'Menu digital', description: "Créez et mettez à jour votre menu en quelques clics. Photos, prix, descriptions — tout." },
  { icon: BarChart3, title: 'Statistiques & revenus', description: 'Suivez vos ventes, vos meilleurs plats et votre croissance en FCFA.' },
  { icon: Shield, title: 'Sécurisé & fiable', description: "Données sécurisées, uptime 99.9%. Votre business ne s'arrête jamais." },
]

const plans = [
  {
    name: 'Starter', price: '9 000', period: '/mois', description: 'L’essentiel pour commander en ligne', badge: null, popular: false,
    features: ['Site de commande', 'Menu illimité', 'Commandes WhatsApp', 'Dashboard administrateur', 'Statistiques & revenus', 'QR Code', 'Support WhatsApp', 'Branding TerangaLink visible'],
  },
  {
    name: 'Pro', price: '15 000', period: '/mois', description: 'Personnalisation avancée par TerangaLink', badge: null, popular: true,
    features: ['Tout Starter', 'Branding TerangaLink supprimé', 'Thème clair ou sombre', 'Réseaux sociaux affichés', 'Couleurs personnalisées', 'Génération de reçus de commande', 'Support prioritaire', 'Accompagnement personnalisé'],
  },
  {
    name: 'Premium', price: '25 000', period: '/mois', description: 'Fonctionnalités e-commerce avancées', badge: 'NOUVEAU', popular: false,
    features: ['Tout Pro', 'Variantes de produits', 'Gestion de stock', 'Précommandes', 'Codes promo', 'Produits mis en avant', 'Bannières promotionnelles'],
  },
]

const testimonials = [
  {
    name: 'Marième',
    role: 'Petits fours faits maison, Keur Massar',
    stars: 4,
    content: "Les clients comprennent mieux le menu maintenant, surtout avec les photos. On reçoit aussi beaucoup moins d'appels pour demander les prix.",
  },
  {
    name: 'Ibou',
    role: 'Fast food, Cité Keur Gorgui',
    stars: 5,
    content: "Franchement le QR code nous a beaucoup aidés pendant les heures de pointe. Les commandes arrivent plus clairement qu'avant.",
  },
  {
    name: 'Awa',
    role: 'Gérante, Adjamé',
    stars: 4,
    content: "Au début je pensais que ça allait être compliqué à gérer, mais finalement tout se fait facilement depuis le téléphone.",
  },
]

const faqs = [
  { q: 'Comment fonctionne TerangaLink ?', a: "Votre restaurant obtient un site de commande unique. Vos clients y accèdent, parcourent votre menu et commandent. La commande arrive directement sur votre WhatsApp." },
  { q: "Ai-je besoin de compétences techniques ?", a: "Aucune. Notre tableau de bord est conçu pour être utilisé depuis un smartphone. Tout est visuel et intuitif." },
  { q: "Combien de temps pour être en ligne ?", a: "Moins de 24h. Vous remplissez votre profil, ajoutez votre menu, et vous êtes prêts à recevoir des commandes." },
  { q: "Comment les clients paient-ils ?", a: "Les clients commandent via WhatsApp. Vous gérez le paiement directement avec eux — Wave, Orange Money, cash, comme vous préférez." },
  { q: "Puis-je annuler à tout moment ?", a: "Oui, les offres Starter et Pro sont mensuelles et peuvent être résiliées à la fin du mois en cours." },
]

export default async function HomePage() {
  const settings = await getPlatformSettings()
  return (
    <div className="min-h-screen bg-surface overflow-x-hidden">
      <LandingNav />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 overflow-hidden">
        {/* Food background image — low opacity, AI-style food collage */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url("https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1400&q=60&auto=format&fit=crop")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.07,
          }}
        />
        {/* Gradient overlay — fade to black on edges */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse at center, transparent 20%, #0A0A0A 75%)',
        }} />
        {/* Orange glow */}
        <div className="absolute inset-0 bg-orange-glow opacity-50 pointer-events-none" />

        <div className="container-app relative">
          <div className="max-w-3xl mx-auto text-center">
            {/* Badge — sans éclair */}
            <div className="inline-flex items-center gap-2 bg-brand-orange/10 border border-brand-orange/20 rounded-full px-4 py-1.5 mb-6">
              <span className="text-brand-orange text-xs font-semibold uppercase tracking-wider">
                Votre resto parle FCFA ? Teranga est pour vous !
              </span>
            </div>

            <h1 className="heading-xl text-white mb-6">
              Votre restaurant mérite un{' '}
              <span className="text-gradient">site de commande</span>{' '}
              premium
            </h1>

            {/* Tiret remplacé par un point */}
            <p className="text-gray-400 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
              TerangaLink donne à chaque restaurant son propre site de commande professionnel. Rapide, beau et adapté au mobile.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-brand-orange hover:bg-brand-orange-dark text-white font-semibold px-7 py-3.5 rounded-xl text-base transition-all shadow-lg shadow-brand-orange/20 group"
              >
                <MessageCircle className="w-5 h-5" />
                Créer mon restaurant
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
              <Link href="/chez-teranga" className="inline-flex items-center justify-center gap-2 border border-brand-orange/50 text-brand-orange hover:bg-brand-orange/10 font-semibold px-7 py-3.5 rounded-xl text-base transition-all">
                Voir la démo
              </Link>
            </div>

            <div className="flex items-center justify-center gap-6 mt-12 flex-wrap">
              <div className="flex -space-x-2">
                {['M', 'I', 'A', 'F'].map((letter, i) => (
                  <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-orange to-brand-gold border-2 border-surface flex items-center justify-center text-xs font-bold text-white">
                    {letter}
                  </div>
                ))}
              </div>
              <div className="text-sm text-gray-500">
                <span className="text-white font-semibold">+25 restaurants</span> actifs
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section id="fonctionnalités" className="section border-t border-surface-200">
        <div className="container-app">
          <div className="text-center mb-14">
            <h2 className="heading-lg text-white mb-4">Tout ce dont votre restaurant a besoin</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">Une plateforme complète pensée pour les entrepreneurs de la restauration.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(feature => (
              <div key={feature.title} className="bg-surface-50 border border-surface-200 hover:border-brand-orange/30 rounded-2xl p-6 transition-all duration-300 group">
                <div className="w-11 h-11 bg-brand-orange/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-brand-orange/20 transition-colors">
                  <feature.icon className="w-5 h-5 text-brand-orange" />
                </div>
                <h3 className="text-white font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────────────────── */}
      <section id="tarifs" className="section border-t border-surface-200">
        <div className="container-app">
          <div className="text-center mb-14">
            <h2 className="heading-lg text-white mb-4">Tarifs simples et transparents</h2>
            <p className="text-gray-500 text-lg">En FCFA. Sans frais cachés.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map(plan => (
              <div key={plan.name} className={`relative rounded-2xl p-6 sm:p-8 flex flex-col ${plan.popular ? 'bg-brand-orange/5 border-2 border-brand-orange/50 shadow-xl shadow-brand-orange/10' : 'bg-surface-50 border border-surface-200'}`}>
                {plan.popular && <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-brand-orange text-white text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap">LE PLUS POPULAIRE</div>}
                {plan.badge && <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap">{plan.badge}</div>}
                <div className="mb-6">
                  <h3 className="text-white font-bold text-xl mb-1">{plan.name}</h3>
                  <p className="text-gray-500 text-sm mb-4">{plan.description}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-white">{plan.price}</span>
                    <span className="text-gray-500 text-sm">FCFA{plan.period}</span>
                  </div>
                </div>
                <ul className="space-y-3 flex-1 mb-6">
                  {plan.features.map(feat => (
                    <li key={feat} className="flex items-start gap-2.5 text-sm text-gray-400">
                      <Check className="w-4 h-4 text-brand-orange flex-shrink-0 mt-0.5" />{feat}
                    </li>
                  ))}
                </ul>
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-full flex items-center justify-center gap-2 font-semibold py-3 rounded-xl text-sm transition-all ${plan.popular ? 'bg-brand-orange hover:bg-brand-orange-dark text-white shadow-lg shadow-brand-orange/20' : 'border border-brand-orange/50 text-brand-orange hover:bg-brand-orange/10'}`}
                >
                  <MessageCircle className="w-4 h-4" />Commencer
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ──────────────────────────────────────────────────── */}
      <section id="témoignages" className="section border-t border-surface-200">
        <div className="container-app">
          <div className="text-center mb-14">
            <h2 className="heading-lg text-white mb-4">Ils font confiance à TerangaLink</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map(t => (
              <div key={t.name} className="bg-surface-50 border border-surface-200 rounded-2xl p-6">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${i < t.stars ? 'fill-brand-orange text-brand-orange' : 'text-surface-300'}`}
                    />
                  ))}
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mb-4 italic">&ldquo;{t.content}&rdquo;</p>
                <div>
                  <p className="text-white font-semibold text-sm">{t.name}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <section id="faq" className="section border-t border-surface-200">
        <div className="container-app">
          <div className="text-center mb-14">
            <h2 className="heading-lg text-white mb-4">Questions fréquentes</h2>
          </div>
          <div className="max-w-2xl mx-auto space-y-4">
            {faqs.map(faq => (
              <div key={faq.q} className="bg-surface-50 border border-surface-200 rounded-2xl p-5">
                <h3 className="text-white font-semibold mb-2">{faq.q}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Final ─────────────────────────────────────────────────────── */}
      <section className="section border-t border-surface-200">
        <div className="container-app">
          <div className="relative bg-gradient-to-br from-brand-orange/10 to-transparent border border-brand-orange/20 rounded-3xl p-10 sm:p-16 text-center overflow-hidden">
            <div className="absolute inset-0 bg-orange-glow opacity-40 pointer-events-none" />
            <div className="relative">
              <h2 className="heading-lg text-white mb-4">Prêt à digitaliser votre restaurant ?</h2>
              <p className="text-gray-400 text-lg mb-8 max-w-xl mx-auto">
                Rejoignez les restaurants qui ont déjà fait le choix TerangaLink.
              </p>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-brand-orange hover:bg-brand-orange-dark text-white font-semibold px-7 py-3.5 rounded-xl text-base transition-all shadow-lg shadow-brand-orange/20 group"
              >
                <MessageCircle className="w-5 h-5" />
                Inscrire mon restaurant maintenant
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer avec contacts ──────────────────────────────────────────── */}
      <footer className="border-t border-surface-200 py-12">
        <div className="container-app">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 bg-brand-orange rounded-lg flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="font-bold text-white">TerangaLink</span>
              </div>
              <p className="text-gray-500 text-sm leading-relaxed">
                La plateforme de commande pour restaurants au Sénégal et en Afrique de l&apos;Ouest.
              </p>
            </div>

            {/* Liens rapides */}
            <div>
              <p className="text-white font-semibold text-sm mb-3">Navigation</p>
              <div className="space-y-2">
                {[
                  { label: 'Fonctionnalités', href: '#fonctionnalités' },
                  { label: 'Tarifs', href: '#tarifs' },
                  { label: 'Témoignages', href: '#témoignages' },
                  { label: 'FAQ', href: '#faq' },
                  { label: 'Mentions légales', href: '/legal' },
                ].map(link => (
                  <a key={link.label} href={link.href} className="block text-gray-500 hover:text-white text-sm transition-colors">
                    {link.label}
                  </a>
                ))}
              </div>
            </div>

            {/* Contact */}
            <div>
              <p className="text-white font-semibold text-sm mb-3">Contact</p>
              <div className="space-y-3">
                <a
                  href={`https://wa.me/${settings.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 text-gray-500 hover:text-white text-sm transition-colors group"
                >
                  <div className="w-7 h-7 bg-[#25D366]/10 group-hover:bg-[#25D366]/20 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors">
                    <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
                  </div>
                  +{settings.whatsapp}
                </a>
                <a
                  href={`mailto:${settings.email}`}
                  className="flex items-center gap-2.5 text-gray-500 hover:text-white text-sm transition-colors group"
                >
                  <div className="w-7 h-7 bg-brand-orange/10 group-hover:bg-brand-orange/20 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors">
                    <Mail className="w-3.5 h-3.5 text-brand-orange" />
                  </div>
                  {settings.email}
                </a>
                <div className="flex items-center gap-2.5 text-gray-500 text-sm">
                  <div className="w-7 h-7 bg-surface-200 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Phone className="w-3.5 h-3.5 text-gray-500" />
                  </div>
                  {settings.city}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-surface-200">
            <p className="text-gray-600 text-sm">© 2026 TerangaLink. Fait à Dakar avec 🧡</p>
            <div className="flex gap-4 text-sm text-gray-600">
              <a href="/legal" className="hover:text-white transition-colors">Mentions légales</a>
              <a href="/legal#confidentialite" className="hover:text-white transition-colors">Confidentialité</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
