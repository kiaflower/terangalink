'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { X, ChevronRight, Sparkles, AlertTriangle, Clock, TrendingUp, Gift } from 'lucide-react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

type CardType = 'onboarding' | 'reminder' | 'optimization'

interface SmartCard {
  id: string
  type: CardType
  icon: React.ReactNode
  accentColor: string   // hex
  label: string         // small tag above title
  title: string
  body: string
  // onboarding: primary action marks step done (no navigation)
  actionLabel?: string
  // optional secondary link for those who want to navigate
  linkLabel?: string
  linkHref?: string
  // reminder/optimization: direct CTA link
  cta?: { label: string; href: string }
  skipable?: boolean
}

interface CardState {
  onboarding_steps_done: number[]
  onboarding_dismissed: boolean
  card_last_shown: Record<string, string>   // cardId → ISO datetime
  milestones_shown: string[]
}

const DEFAULT_STATE: CardState = {
  onboarding_steps_done: [],
  onboarding_dismissed: false,
  card_last_shown: {},
  milestones_shown: [],
}

// ─── Props (fetched internally) ───────────────────────────────────────────────

interface RestaurantProps {
  restaurantId: string
  slug: string | null
  plan: string
  menuItemsCount: number
  hasWhatsapp: boolean
  hasWave: boolean
  hasOrangeMoney: boolean
  hasFeaturedProduct: boolean
  lastMenuUpdate: string | null
  lastOrderDate: string | null
  restaurantCreatedAt: string
  totalOrders: number
  todayOrders: number
}

// ─── Onboarding steps ─────────────────────────────────────────────────────────

interface OnboardingStep {
  title: string
  body: string
  actionLabel: string
  linkLabel?: string
  linkHref?: string
  skipable?: boolean
}

function getOnboardingSteps(plan: string, slug: string | null): OnboardingStep[] {
  const isPro = plan === 'pro' || plan === 'premium'
  const siteUrl = slug ? `/${slug}` : null

  const steps: OnboardingStep[] = [
    {
      title: 'Bienvenue sur TerangaLink ! 👋',
      body: 'Votre restaurant est maintenant en ligne. Suivez ces étapes pour découvrir toutes les fonctionnalités.',
      actionLabel: 'C\'est parti !',
    },
    {
      title: 'Changez votre mot de passe',
      body: 'Pour sécuriser votre compte, commencez par définir un mot de passe personnel dans les Paramètres.',
      actionLabel: 'C\'est fait ✓',
      linkLabel: 'Aller dans Paramètres',
      linkHref: '/dashboard/restaurant/settings',
    },
    {
      title: 'Ajoutez Wave et Orange Money',
      body: 'Renseignez vos numéros Wave et Orange Money dans Paramètres. Ils s\'affichent automatiquement dans vos confirmations.',
      actionLabel: 'C\'est fait ✓',
      linkLabel: 'Configurer les paiements',
      linkHref: '/dashboard/restaurant/settings',
    },
    {
      title: 'Réglez vos horaires d\'ouverture',
      body: 'Indiquez vos jours et heures d\'ouverture dans Paramètres pour que vos clients sachent quand commander.',
      actionLabel: 'C\'est fait ✓',
      linkLabel: 'Régler les horaires',
      linkHref: '/dashboard/restaurant/settings',
    },
    {
      title: 'Ajoutez vos produits au menu',
      body: 'Créez vos plats avec nom, prix et photo. Plus votre menu est complet, plus vous recevrez de commandes.',
      actionLabel: 'C\'est fait ✓',
      linkLabel: 'Gérer le menu',
      linkHref: '/dashboard/restaurant/menu',
    },
    {
      title: 'Partagez votre QR code',
      body: 'Téléchargez votre QR code et affichez-le dans votre restaurant, sur vos réseaux sociaux et vos emballages.',
      actionLabel: 'QR code partagé ✓',
      linkLabel: 'Voir mon QR code',
      linkHref: '/dashboard/restaurant/qrcode',
    },
    {
      title: 'Découvrez vos analytiques',
      body: 'Suivez vos vues, commandes et performances par période. Ces données vous aident à prendre les bonnes décisions.',
      actionLabel: 'J\'ai vu ✓',
      linkLabel: 'Voir les analytiques',
      linkHref: '/dashboard/restaurant/analytics',
    },
    {
      title: 'Suivez vos revenus',
      body: 'Le tableau de bord affiche vos revenus du mois, commandes du jour et statistiques en temps réel.',
      actionLabel: 'J\'ai vu ✓',
      linkLabel: 'Voir le tableau de bord',
      linkHref: '/dashboard/restaurant',
    },
    ...(isPro ? [
      {
        title: 'Créez votre premier code promo',
        body: 'Offrez une réduction à vos clients fidèles ou pour un lancement. Un bon code promo booste les premières commandes.',
        actionLabel: 'C\'est fait ✓',
        linkLabel: 'Créer un code promo',
        linkHref: '/dashboard/restaurant/promotions',
        skipable: true,
      },
      {
        title: 'Ajoutez une bannière promotionnelle',
        body: 'Les bannières s\'affichent en haut de votre page restaurant et attirent l\'attention sur vos offres spéciales.',
        actionLabel: 'C\'est fait ✓',
        linkLabel: 'Créer une bannière',
        linkHref: '/dashboard/restaurant/banners',
        skipable: true,
      },
    ] : []),
    {
      title: 'Visitez votre site restaurant 🎉',
      body: 'Votre page publique est en ligne. Regardez-la comme le voit votre client et partagez-la partout !',
      actionLabel: 'Excellent !',
      ...(siteUrl ? { linkLabel: 'Voir mon site', linkHref: siteUrl } : {}),
    },
  ]

  return steps
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hoursSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 3_600_000
}

function daysSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 86_400_000
}

function canShow(state: CardState, cardId: string, minHours: number): boolean {
  const last = state.card_last_shown[cardId]
  if (!last) return true
  return hoursSince(last) >= minHours
}

// ─── Card builders ────────────────────────────────────────────────────────────

function buildOnboardingCard(state: CardState, plan: string, slug: string | null): SmartCard | null {
  if (state.onboarding_dismissed) return null
  const steps = getOnboardingSteps(plan, slug)
  const done = state.onboarding_steps_done ?? []
  const nextStep = steps.findIndex((_, i) => !done.includes(i))
  if (nextStep === -1) return null
  const step = steps[nextStep]
  const isLast = nextStep === steps.length - 1
  return {
    id: `onboarding_${nextStep}`,
    type: 'onboarding',
    icon: <Sparkles className="w-4 h-4" />,
    accentColor: '#F97316',
    label: `Étape ${nextStep + 1} / ${steps.length}`,
    title: step.title,
    body: step.body,
    actionLabel: step.actionLabel,
    linkLabel: step.linkLabel,
    linkHref: step.linkHref,
    skipable: !isLast && step.skipable === true,
  }
}

function buildReminderCards(props: RestaurantProps, state: CardState): SmartCard[] {
  const cards: SmartCard[] = []
  const hour = new Date().getHours()
  const isEvening = hour >= 19

  // Commandes non traitées en fin de soirée (min 2h between shows)
  if (isEvening && (props.todayOrders ?? 0) > 0 && canShow(state, 'reminder_orders_check', 2)) {
    cards.push({
      id: 'reminder_orders_check',
      type: 'reminder',
      icon: <Clock className="w-4 h-4" />,
      accentColor: '#EF4444',
      label: 'Rappel soir',
      title: 'Vérifiez vos commandes du jour',
      body: 'N\'oubliez pas de clôturer vos commandes du jour (livré ou annulé) pour garder vos statistiques à jour.',
      cta: { label: 'Voir les commandes', href: '/dashboard/restaurant/orders' },
    })
  }

  // Aucune commande aujourd'hui (après 14h, min 3h between shows)
  if (hour >= 14 && (props.todayOrders ?? 0) === 0 && canShow(state, 'reminder_no_orders_today', 3)) {
    cards.push({
      id: 'reminder_no_orders_today',
      type: 'reminder',
      icon: <AlertTriangle className="w-4 h-4" />,
      accentColor: '#F59E0B',
      label: 'Rappel',
      title: 'Aucune commande aujourd\'hui',
      body: 'Partagez votre lien sur WhatsApp ou Instagram pour attirer des clients. Un message avec une belle photo peut faire la différence.',
      cta: { label: 'Voir mon profil public', href: '/dashboard/restaurant/profile' },
    })
  }

  // Menu non mis à jour depuis 30+ jours (min 7 jours between shows)
  if (props.lastMenuUpdate && daysSince(props.lastMenuUpdate) > 30 && canShow(state, 'reminder_stale_menu', 168)) {
    cards.push({
      id: 'reminder_stale_menu',
      type: 'reminder',
      icon: <AlertTriangle className="w-4 h-4" />,
      accentColor: '#6366F1',
      label: 'Rappel',
      title: 'Menu non mis à jour',
      body: `Votre menu n'a pas changé depuis ${Math.floor(daysSince(props.lastMenuUpdate))} jours. Ajouter un nouveau plat relance l'intérêt de vos clients.`,
      cta: { label: 'Mettre à jour le menu', href: '/dashboard/restaurant/menu' },
    })
  }

  return cards
}

function buildOptimizationCards(props: RestaurantProps, state: CardState): SmartCard[] {
  const cards: SmartCard[] = []
  const plan = props.plan
  const milestones = state.milestones_shown ?? []

  // Milestone: première commande
  if ((props.totalOrders ?? 0) >= 1 && !milestones.includes('first_order')) {
    cards.push({
      id: 'milestone_first_order',
      type: 'optimization',
      icon: <Gift className="w-4 h-4" />,
      accentColor: '#22C55E',
      label: 'Félicitations 🎉',
      title: 'Vous avez reçu votre première commande !',
      body: 'C\'est une étape importante. Continuez à partager votre lien et enrichissez votre menu pour en recevoir encore plus.',
      cta: { label: 'Voir les statistiques', href: '/dashboard/restaurant' },
    })
  }

  // Milestone: 10 commandes
  if ((props.totalOrders ?? 0) >= 10 && !milestones.includes('orders_10')) {
    cards.push({
      id: 'milestone_orders_10',
      type: 'optimization',
      icon: <Gift className="w-4 h-4" />,
      accentColor: '#22C55E',
      label: 'Félicitations 🎉',
      title: '10 commandes reçues !',
      body: 'Votre restaurant prend de l\'ampleur. Pensez à activer les promotions pour fidéliser vos clients et augmenter la fréquence de commande.',
      cta: { label: 'Créer une promo', href: '/dashboard/restaurant/promotions' },
    })
  }

  // Milestone: 50 commandes
  if ((props.totalOrders ?? 0) >= 50 && !milestones.includes('orders_50')) {
    cards.push({
      id: 'milestone_orders_50',
      type: 'optimization',
      icon: <TrendingUp className="w-4 h-4" />,
      accentColor: '#F97316',
      label: 'Félicitations 🎉',
      title: '50 commandes — vous êtes en forme !',
      body: 'Excellent travail ! Avez-vous pensé à passer au plan Pro pour bénéficier des mises en avant sponsorisées ?',
      cta: { label: 'Voir les plans', href: '/dashboard/restaurant/settings' },
    })
  }

  // WhatsApp manquant (7j cooldown)
  if (!props.hasWhatsapp && canShow(state, 'opt_no_whatsapp', 168)) {
    cards.push({
      id: 'opt_no_whatsapp',
      type: 'optimization',
      icon: <AlertTriangle className="w-4 h-4" />,
      accentColor: '#EF4444',
      label: 'Action requise',
      title: 'WhatsApp non configuré',
      body: 'Vos clients ne peuvent pas commander sans numéro WhatsApp. Configurez-le en 30 secondes dans Paramètres.',
      cta: { label: 'Configurer', href: '/dashboard/restaurant/settings' },
    })
  }

  // Aucun moyen de paiement (7j cooldown)
  if (!props.hasWave && !props.hasOrangeMoney && props.hasWhatsapp && canShow(state, 'opt_no_payment', 168)) {
    cards.push({
      id: 'opt_no_payment',
      type: 'optimization',
      icon: <AlertTriangle className="w-4 h-4" />,
      accentColor: '#F59E0B',
      label: 'Conseil',
      title: 'Aucun moyen de paiement',
      body: 'Renseignez Wave et Orange Money pour faciliter le paiement de vos clients. Ils s\'affichent automatiquement dans vos messages.',
      cta: { label: 'Configurer les paiements', href: '/dashboard/restaurant/settings' },
    })
  }

  // Menu vide (7j cooldown)
  if (props.menuItemsCount === 0 && canShow(state, 'opt_empty_menu', 168)) {
    cards.push({
      id: 'opt_empty_menu',
      type: 'optimization',
      icon: <AlertTriangle className="w-4 h-4" />,
      accentColor: '#EF4444',
      label: 'Action requise',
      title: 'Votre menu est vide',
      body: 'Ajoutez au moins 3 plats pour que vos clients puissent commander. Sans menu, votre page est invisible.',
      cta: { label: 'Ajouter des plats', href: '/dashboard/restaurant/menu' },
    })
  }

  return cards
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SmartCards() {
  const pathname = usePathname()
  const [cardState, setCardState] = useState<CardState>(DEFAULT_STATE)
  const [restoProps, setRestoProps] = useState<RestaurantProps | null>(null)
  const [card, setCard] = useState<SmartCard | null>(null)
  const [visible, setVisible] = useState(false)
  const [animOut, setAnimOut] = useState(false)
  const [skipModal, setSkipModal] = useState(false)
  const [ready, setReady] = useState(false)
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load card state + restaurant props in parallel
  useEffect(() => {
    Promise.all([
      fetch('/api/restaurant/smart-cards').then(r => r.json()),
      fetch('/api/restaurant/smart-card-props').then(r => r.json()),
    ]).then(([{ state }, rProps]) => {
      if (rProps.error) return  // not a restaurant user, don't show cards
      const loaded: CardState = { ...DEFAULT_STATE, ...(state ?? {}) }
      const isFirstLoad = !state || Object.keys(state).length === 0
      if (isFirstLoad) {
        const orders: number = rProps.totalOrders ?? 0
        const preMilestones: string[] = []
        if (orders >= 1) preMilestones.push('first_order')
        if (orders >= 10) preMilestones.push('orders_10')
        if (orders >= 50) preMilestones.push('orders_50')
        if (preMilestones.length > 0) {
          loaded.milestones_shown = preMilestones
          fetch('/api/restaurant/smart-cards', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ milestones_shown: preMilestones }),
          })
        }
      }
      setCardState(loaded)
      setRestoProps(rProps as RestaurantProps)
      setReady(true)
    }).catch(() => {/* silently fail */})
  }, [])

  // Re-trigger card display on every page navigation (or on first load)
  useEffect(() => {
    if (!ready || !restoProps) return
    // If a card is already visible, keep it — don't replace mid-navigation
    if (visible) return
    const timer = setTimeout(() => {
      const onboarding = buildOnboardingCard(cardState, restoProps.plan, restoProps.slug)
      if (onboarding) { setCard(onboarding); setVisible(true); return }
      const reminders = buildReminderCards(restoProps, cardState)
      if (reminders.length > 0) { setCard(reminders[0]); setVisible(true); return }
      const opts = buildOptimizationCards(restoProps, cardState)
      if (opts.length > 0) { setCard(opts[0]); setVisible(true) }
    }, 600)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, pathname])

  function saveState(patch: Partial<CardState>) {
    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(() => {
      fetch('/api/restaurant/smart-cards', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
    }, 300)
  }

  function dismiss(options?: { skip?: boolean }) {
    if (!card) return

    const newState = { ...cardState }

    if (card.type === 'onboarding') {
      const stepIndex = parseInt(card.id.replace('onboarding_', ''))
      if (options?.skip) {
        // "Passer" — mark step done but don't dismiss whole onboarding
        const done = Array.from(new Set([...(newState.onboarding_steps_done ?? []), stepIndex]))
        newState.onboarding_steps_done = done
        saveState({ onboarding_steps_done: done })
      } else {
        // X button — dismiss entire onboarding
        newState.onboarding_dismissed = true
        saveState({ onboarding_dismissed: true })
      }
    } else if (card.type === 'optimization' && card.id.startsWith('milestone_')) {
      const key = card.id.replace('milestone_', '')
      const milestones = Array.from(new Set([...(newState.milestones_shown ?? []), key]))
      newState.milestones_shown = milestones
      saveState({ milestones_shown: [key] })
    } else {
      // Reminder / optimization with cooldown
      const now = new Date().toISOString()
      newState.card_last_shown = { ...(newState.card_last_shown ?? {}), [card.id]: now }
      saveState({ card_last_shown: { [card.id]: now } })
    }

    setCardState(newState)
    setAnimOut(true)
    setSkipModal(false)
    setTimeout(() => {
      setVisible(false)
      setCard(null)
      setAnimOut(false)
    }, 280)
  }

  function markOnboardingStepDone(andNavigate = false) {
    if (!card || card.type !== 'onboarding') return
    const stepIndex = parseInt(card.id.replace('onboarding_', ''))
    const done = Array.from(new Set([...(cardState.onboarding_steps_done ?? []), stepIndex]))
    const newState = { ...cardState, onboarding_steps_done: done }
    setCardState(newState)
    saveState({ onboarding_steps_done: done })
    if (andNavigate) {
      // Just hide the card — navigation happens via the Link href
      setVisible(false)
      setCard(null)
      return
    }
    // Stay on page: animate out and show next step
    setAnimOut(true)
    setTimeout(() => {
      setAnimOut(false)
      const next = buildOnboardingCard(newState, restoProps?.plan ?? 'starter', restoProps?.slug ?? null)
      if (next) {
        setCard(next)
      } else {
        setVisible(false)
        setCard(null)
      }
    }, 280)
  }

  const handleOnboardingAction = () => markOnboardingStepDone(false)

  if (!visible || !card) return null

  const accent = card.accentColor

  return (
    <>
      {/* Skip confirmation modal */}
      {skipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSkipModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-xs text-center"
            style={{ border: '1px solid #E5E7EB' }}>
            <p className="font-bold mb-2" style={{ color: '#111111' }}>Passer cette étape ?</p>
            <p className="text-sm mb-5" style={{ color: '#6B7280' }}>
              Vous pourrez y revenir plus tard depuis votre tableau de bord.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setSkipModal(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                style={{ border: '1.5px solid #E5E7EB', color: '#374151' }}>
                Annuler
              </button>
              <button
                onClick={() => dismiss({ skip: true })}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#F97316' }}>
                Passer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Card */}
      <div
        className={`fixed bottom-6 right-6 z-40 w-80 transition-all duration-280 ${
          animOut ? 'translate-y-3 opacity-0' : 'translate-y-0 opacity-100'
        }`}
        style={{ filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.12))' }}
      >
        <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #E5E7EB' }}>
          {/* Accent bar */}
          <div className="h-0.5" style={{ backgroundColor: accent }} />

          {/* Header */}
          <div className="px-4 pt-4 pb-0 flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span style={{ color: accent }}>{card.icon}</span>
              <span className="text-xs font-bold uppercase tracking-wide" style={{ color: accent }}>
                {card.label}
              </span>
            </div>
            <button
              onClick={() => dismiss()}
              className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full transition-colors hover:bg-gray-100"
              style={{ color: '#9CA3AF' }}
              title="Fermer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Body */}
          <div className="px-4 pt-2.5 pb-4 space-y-3">
            <div>
              <p className="font-bold text-sm leading-snug" style={{ color: '#111111' }}>{card.title}</p>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: '#6B7280' }}>{card.body}</p>
            </div>

            {/* CTA buttons */}
            <div className="flex items-center gap-2 pt-0.5">
              {card.type === 'onboarding' ? (
                <>
                  <button
                    onClick={handleOnboardingAction}
                    className="flex-1 inline-flex items-center justify-center gap-1 text-xs font-bold px-3 py-2.5 rounded-xl text-white transition-opacity hover:opacity-90"
                    style={{ backgroundColor: accent }}>
                    {card.actionLabel ?? 'Suivant'}
                    <ChevronRight className="w-3 h-3" />
                  </button>
                  {card.linkHref && card.linkLabel && (
                    <Link
                      href={card.linkHref}
                      onClick={() => markOnboardingStepDone(true)}
                      className="text-xs font-medium px-3 py-2.5 rounded-xl transition-colors hover:bg-gray-50 flex-shrink-0 whitespace-nowrap"
                      style={{ color: '#6B7280', border: '1px solid #E5E7EB' }}>
                      {card.linkLabel} →
                    </Link>
                  )}
                  {card.skipable && (
                    <button
                      onClick={() => setSkipModal(true)}
                      className="text-xs font-medium px-3 py-2.5 rounded-xl transition-colors hover:bg-gray-50 flex-shrink-0"
                      style={{ color: '#9CA3AF', border: '1px solid #E5E7EB' }}>
                      Passer
                    </button>
                  )}
                </>
              ) : card.cta ? (
                <Link
                  href={card.cta.href}
                  onClick={() => dismiss()}
                  className="flex-1 inline-flex items-center justify-center gap-1 text-xs font-bold px-3 py-2.5 rounded-xl text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: accent }}>
                  {card.cta.label}
                  <ChevronRight className="w-3 h-3" />
                </Link>
              ) : null}
            </div>

            {/* Progress dots for onboarding */}
            {card.type === 'onboarding' && (() => {
              const stepIndex = parseInt(card.id.replace('onboarding_', ''))
              const steps = getOnboardingSteps(restoProps?.plan ?? 'starter', restoProps?.slug ?? null)
              return (
                <div className="flex gap-1 pt-0.5">
                  {steps.map((_: OnboardingStep, i: number) => (
                    <div
                      key={i}
                      className="rounded-full transition-all"
                      style={{
                        width: i === stepIndex ? 16 : 6,
                        height: 4,
                        backgroundColor: i <= stepIndex ? accent : '#E5E7EB',
                      }}
                    />
                  ))}
                </div>
              )
            })()}
          </div>
        </div>
      </div>
    </>
  )
}
