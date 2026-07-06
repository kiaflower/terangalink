import Link from 'next/link'
import { LandingNav } from '@/components/landing/LandingNav'
import { Footer } from '@/components/layout/Footer'
import { EarlyAccessWaitlistForm } from '@/components/landing/EarlyAccessWaitlistForm'
import { getPlatformSettings } from '@/lib/settings'
import { createAdminClient } from '@/lib/supabase/admin'
import { SITE_URL } from '@/lib/seo'
import type { Metadata } from 'next'
import {
  Zap, BadgeCheck, TrendingUp, GraduationCap, Handshake,
  ClipboardList, MessageCircle, Rocket, PartyPopper, Check, ArrowRight,
} from 'lucide-react'

const MAX_SLOTS = 15
const WHATSAPP_NUMBER = '221774739266'

export const metadata: Metadata = {
  title: 'Early Access TerangaLink — 15 places pour les restaurants du Sénégal',
  description: "Rejoignez le programme Early Access TerangaLink : plan Pro à prix réduit pendant 6 mois, badge vérifié, boost annuaire, atelier individuel et accompagnement pour lancer votre restaurant en ligne.",
  openGraph: {
    title: 'Early Access TerangaLink — 15 places pour les restaurants',
    description: "Plan Pro à prix réduit, badge vérifié, boost annuaire et accompagnement personnalisé pour les 15 premiers restaurants.",
    url: `${SITE_URL}/early-access`,
    siteName: 'TerangaLink',
    locale: 'fr_SN',
    type: 'website',
  },
  alternates: { canonical: `${SITE_URL}/early-access` },
}

const benefits = [
  {
    icon: Zap,
    title: 'Plan Pro à prix réduit',
    description: 'Accès complet à toutes les fonctionnalités pendant 6 mois.',
    highlight: true,
  },
  {
    icon: BadgeCheck,
    title: 'Badge Fondateur offert',
    description: "Affiché sur votre vitrine et dans l'annuaire pendant 6 mois.",
  },
  {
    icon: TrendingUp,
    title: 'Boost annuaire 15 jours',
    description: "Votre restaurant apparaît en tête de l'annuaire et sur nos réseaux dès le lancement officiel.",
  },
  {
    icon: GraduationCap,
    title: 'Atelier individuel 45 min',
    description: 'Comment fixer vos prix, structurer votre menu et vendre plus.',
  },
  {
    icon: Handshake,
    title: 'On prépare votre restaurant ensemble',
    description: '7 jours pour configurer votre vitrine, ajouter votre menu, tester avec de vrais clients avant le lancement officiel.',
  },
]

const steps = [
  {
    icon: ClipboardList,
    title: 'Vous remplissez le formulaire',
    description: 'Votre fiche complète arrive directement chez TerangaLink.',
  },
  {
    icon: MessageCircle,
    title: 'On vous contacte sous 24h',
    description: 'Par WhatsApp pour confirmer votre inscription et les modalités de paiement.',
  },
  {
    icon: Handshake,
    title: 'On prépare vos premiers jours de vente ensemble',
    description: "7 jours de préparation. Dès que votre restaurant est prêt, nous le présentons sur les réseaux et vous commencez à vendre avant tout le monde.",
  },
  {
    icon: PartyPopper,
    title: "Lancement officiel — vous êtes déjà prêt(e) !",
    description: 'Vos clients peuvent commander. Votre restaurant est boosté, vérifié et mis en avant.',
  },
]

const conditions = [
  'Offre limitée aux 15 premiers restaurants inscrits.',
  'Prix Pro réduit (12 900 FCFA/mois) garanti pendant 6 mois, puis tarif standard (19 900 FCFA/mois).',
  'Aucun paiement requis à l\'inscription — les modalités sont confirmées par WhatsApp sous 24h.',
  "Votre restaurant reste privé le temps de la préparation, puis rejoint l'annuaire public lors du lancement officiel groupé.",
]

export default async function EarlyAccessPage() {
  const admin = createAdminClient()
  const [settings, { count }, { data: setting }] = await Promise.all([
    getPlatformSettings(),
    admin.from('early_access_registrations').select('*', { count: 'exact', head: true }).neq('status', 'rejected'),
    admin.from('platform_settings').select('value').eq('key', 'early_access_open').maybeSingle(),
  ])
  const isOpen = setting?.value !== 'false'
  const taken = count ?? 0
  const remaining = isOpen ? Math.max(0, MAX_SLOTS - taken) : 0
  const full = remaining <= 0

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ backgroundColor: '#FFFFFF', color: '#111111' }}>
      <LandingNav />

      {/* ── Hero ── */}
      <section className="pt-32 pb-16 sm:pt-40 sm:pb-20" style={{ backgroundColor: '#FFF7ED' }}>
        <div className="container-app">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6 text-xs font-semibold uppercase tracking-wider"
              style={{ backgroundColor: '#FFFFFF', color: '#EA580C', border: '1px solid rgba(249,115,22,0.3)' }}>
              <Zap className="w-3.5 h-3.5" />
              15 places seulement
            </div>
            <h1 className="heading-xl mb-5" style={{ color: '#111111' }}>
              Le programme{' '}
              <span style={{ color: '#F97316' }}>Early Access</span>{' '}
              TerangaLink
            </h1>
            <p className="text-lg max-w-xl mx-auto leading-relaxed" style={{ color: '#374151' }}>
              15 restaurants seulement rejoignent TerangaLink avant tout le monde, avec un accompagnement complet et des avantages exclusifs pendant 6 mois.
            </p>
          </div>
        </div>
      </section>

      {/* ── Ce qui vous attend ── */}
      <section className="section" style={{ backgroundColor: '#FFFFFF' }}>
        <div className="container-app">
          <div className="text-center mb-12">
            <h2 className="heading-lg mb-3" style={{ color: '#111111' }}>Ce qui vous attend</h2>
            <p className="text-lg" style={{ color: '#6B7280' }}>Cinq avantages réservés aux 15 restaurants Early Access.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map(b => (
              <div key={b.title}
                className="rounded-2xl p-6"
                style={b.highlight
                  ? { backgroundColor: '#FFF7ED', border: '2px solid #F97316' }
                  : { backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: b.highlight ? '#F97316' : 'rgba(249,115,22,0.08)' }}>
                  <b.icon className="w-5 h-5" style={{ color: b.highlight ? '#FFFFFF' : '#F97316' }} />
                </div>
                <h3 className="font-bold text-lg mb-2" style={{ color: '#111111' }}>{b.title}</h3>
                {b.highlight ? (
                  <p className="text-sm leading-relaxed" style={{ color: '#374151' }}>
                    {b.description}{' '}
                    <span className="line-through" style={{ color: '#9CA3AF' }}>19 900 FCFA</span>{' '}
                    <span className="font-bold" style={{ color: '#F97316' }}>12 900 FCFA/mois</span>
                  </p>
                ) : (
                  <p className="text-sm leading-relaxed" style={{ color: '#6B7280' }}>{b.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comment ça se passe ── */}
      <section className="section" style={{ borderTop: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>
        <div className="container-app">
          <div className="text-center mb-12">
            <h2 className="heading-lg mb-3" style={{ color: '#111111' }}>Comment ça se passe</h2>
            <p className="text-lg" style={{ color: '#6B7280' }}>Quatre étapes, du formulaire au lancement officiel.</p>
          </div>
          <div className="max-w-3xl mx-auto space-y-4">
            {steps.map((s, i) => (
              <div key={s.title} className="flex items-start gap-4 rounded-2xl p-5"
                style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB' }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm text-white"
                  style={{ backgroundColor: '#F97316' }}>
                  {i + 1}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <s.icon className="w-4 h-4" style={{ color: '#F97316' }} />
                    <h3 className="font-bold text-sm" style={{ color: '#111111' }}>{s.title}</h3>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: '#6B7280' }}>{s.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Conditions ── */}
      <section className="section" style={{ borderTop: '1px solid #E5E7EB', backgroundColor: '#FFFFFF' }}>
        <div className="container-app">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-xl font-bold mb-4" style={{ color: '#111111' }}>Conditions</h2>
            <ul className="space-y-3">
              {conditions.map(c => (
                <li key={c} className="flex items-start gap-2.5 text-sm" style={{ color: '#374151' }}>
                  <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#F97316' }} />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="section" style={{ borderTop: '1px solid #E5E7EB', backgroundColor: '#FFF7ED' }}>
        <div className="container-app">
          <div className="max-w-md mx-auto text-center">
            {full ? (
              <EarlyAccessWaitlistForm />
            ) : (
              <>
                <Link
                  href="/early-access/inscription"
                  className="inline-flex items-center justify-center gap-2 w-full text-white font-bold px-7 py-4 rounded-xl text-base transition-all hover:opacity-90 shadow-lg"
                  style={{ backgroundColor: '#F97316', boxShadow: '0 4px 20px rgba(249,115,22,0.3)' }}>
                  <Zap className="w-5 h-5" />
                  Réserver ma place — {remaining} restante{remaining > 1 ? 's' : ''}
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <p className="text-sm mt-4" style={{ color: '#6B7280' }}>
                  Aucun paiement requis maintenant. On vous contacte sur WhatsApp sous 24h.
                </p>
              </>
            )}
            <div className="mt-6">
              <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Bonjour, j'ai une question sur l'offre Early Access TerangaLink.")}`}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: '#6B7280' }}>
                <MessageCircle className="w-3.5 h-3.5" style={{ color: '#25D366' }} />
                Une question ? Écrivez-nous sur WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer whatsapp={settings.whatsapp} email={settings.email} city={settings.city} />
    </div>
  )
}
