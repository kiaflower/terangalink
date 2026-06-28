'use client'

import { useState, useEffect, useRef } from 'react'
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

// ─── Props ────────────────────────────────────────────────────────────────────

interface SmartCardsProps {
  restaurantId: string
  plan: string
  menuItemsCount: number
  hasWhatsapp: boolean
  hasWave: boolean
  hasOrangeMoney: boolean
  hasFeaturedProduct: boolean
  lastMenuUpdate: string | null
  lastOrderDate: string | null
  restaurantCreatedAt: string
  totalOrders?: number
  todayOrders?: number
}

// ─── Onboarding steps ─────────────────────────────────────────────────────────

const ONBOARDING_STEPS: Array<{
  title: string
  body: string
  actionLabel: string   // label du bouton principal "J'ai fait ça"
  linkLabel?: string    // label du lien secondaire optionnel
  linkHref?: string     // page vers laquelle le lien pointe
  skipable?: boolean
}> = [
  {
    title: 'Bienvenue sur TerangaLink ! 👋',
    body: 'Votre restaurant est maintenant en ligne. Suivez ces 10 étapes rapides pour recevoir vos premières commandes.',
    actionLabel: 'C\'est parti !',
  },
  {
    title: 'Ajoutez votre numéro WhatsApp',
    body: 'Sans WhatsApp configuré, vos clients ne peuvent pas passer de commandes. Allez dans Paramètres → Contacts.',
    actionLabel: 'C\'est fait ✓',
    linkLabel: 'Aller dans Paramètres',
    linkHref: '/dashboard/restaurant/settings',
  },
  {
    title: 'Créez votre premier plat',
    body: 'Ajoutez au moins un plat à votre menu pour que vos clients puissent commander. Nom, prix, photo : c\'est tout.',
    actionLabel: 'C\'est fait ✓',
    linkLabel: 'Aller au menu',
    linkHref: '/dashboard/restaurant/menu',
  },
  {
    title: 'Complétez votre profil',
    body: 'Ajoutez une description, vos horaires et l\'adresse de votre restaurant pour rassurer vos clients.',
    actionLabel: 'C\'est fait ✓',
    linkLabel: 'Voir le profil',
    linkHref: '/dashboard/restaurant/profile',
  },
  {
    title: 'Configurez vos paiements',
    body: 'Renseignez Wave et Orange Money dans Paramètres. Ils s\'affichent dans les confirmations de commande.',
    actionLabel: 'C\'est fait ✓',
    linkLabel: 'Paramètres paiements',
    linkHref: '/dashboard/restaurant/settings',
  },
  {
    title: 'Enrichissez votre menu',
    body: 'Les restaurants avec 8+ plats reçoivent 3× plus de commandes. Visez au minimum 5 plats pour démarrer.',
    actionLabel: 'C\'est fait ✓',
    linkLabel: 'Ajouter des plats',
    linkHref: '/dashboard/restaurant/menu',
    skipable: true,
  },
  {
    title: 'Ajoutez des photos à vos plats',
    body: 'Les plats avec photos génèrent 60% de commandes en plus. Une photo bien éclairée suffit.',
    actionLabel: 'C\'est fait ✓',
    linkLabel: 'Gérer le menu',
    linkHref: '/dashboard/restaurant/menu',
    skipable: true,
  },
  {
    title: 'Partagez votre lien restaurant',
    body: 'Copiez votre lien TerangaLink et envoyez-le sur vos groupes WhatsApp, votre story Instagram, etc.',
    actionLabel: 'Lien partagé ✓',
    linkLabel: 'Voir mon lien',
    linkHref: '/dashboard/restaurant/profile',
    skipable: true,
  },
  {
    title: 'Créez votre première promotion',
    body: 'Une promo de lancement (-10% ou livraison offerte) peut déclencher vos premières commandes rapidement.',
    actionLabel: 'C\'est fait ✓',
    linkLabel: 'Créer une promo',
    linkHref: '/dashboard/restaurant/promotions',
    skipable: true,
  },
  {
    title: 'Votre restaurant est prêt ! 🎉',
    body: 'Bravo, configuration terminée. Continuez à enrichir votre menu et à partager votre lien chaque semaine.',
    actionLabel: 'Super, merci !',
  },
]

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

function buildOnboardingCard(state: CardState): SmartCard | null {
  if (state.onboarding_dismissed) return null
  const done = state.onboarding_steps_done ?? []
  const nextStep = ONBOARDING_STEPS.findIndex((_, i) => !done.includes(i))
  if (nextStep === -1) return null  // all done
  const step = ONBOARDING_STEPS[nextStep]
  const isLast = nextStep === ONBOARDING_STEPS.length - 1
  return {
    id: `onboarding_${nextStep}`,
    type: 'onboarding',
    icon: <Sparkles className="w-4 h-4" />,
    accentColor: '#F97316',
    label: `Étape ${nextStep + 1} / ${ONBOARDING_STEPS.length}`,
    title: step.title,
    body: step.body,
    actionLabel: step.actionLabel,
    linkLabel: step.linkLabel,
    linkHref: step.linkHref,
    skipable: !isLast && step.skipable === true,
  }
}

function buildReminderCards(props: SmartCardsProps, state: CardState): SmartCard[] {
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

function buildOptimizationCards(props: SmartCardsProps, state: CardState): SmartCard[] {
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
      body: 'Excellent travail ! Avez-vous pensé à passer au plan Premium pour bénéficier des mises en avant sponsorisées ?',
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

export function SmartCards(props: SmartCardsProps) {
  const [cardState, setCardState] = useState<CardState>(DEFAULT_STATE)
  const [card, setCard] = useState<SmartCard | null>(null)
  const [visible, setVisible] = useState(false)
  const [animOut, setAnimOut] = useState(false)
  const [skipModal, setSkipModal] = useState(false)
  const [stateLoaded, setStateLoaded] = useState(false)
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load state from API — pre-mark milestones for existing restaurants on first load
  useEffect(() => {
    fetch('/api/restaurant/smart-cards')
      .then(r => r.json())
      .then(({ state }) => {
        const loaded: CardState = { ...DEFAULT_STATE, ...(state ?? {}) }
        const isFirstLoad = !state || Object.keys(state).length === 0
        if (isFirstLoad) {
          // Pre-mark all already-reached milestones so existing restaurants don't see celebration cards
          const orders = props.totalOrders ?? 0
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
        setStateLoaded(true)
      })
      .catch(() => setStateLoaded(true))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Decide which card to show after state loads
  useEffect(() => {
    if (!stateLoaded) return
    const timer = setTimeout(() => {
      const onboarding = buildOnboardingCard(cardState)
      if (onboarding) {
        setCard(onboarding)
        setVisible(true)
        return
      }
      const reminders = buildReminderCards(props, cardState)
      if (reminders.length > 0) {
        setCard(reminders[0])
        setVisible(true)
        return
      }
      const opts = buildOptimizationCards(props, cardState)
      if (opts.length > 0) {
        setCard(opts[0])
        setVisible(true)
      }
    }, 3000)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateLoaded])

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

  function handleOnboardingAction() {
    if (!card || card.type !== 'onboarding') return
    const stepIndex = parseInt(card.id.replace('onboarding_', ''))
    const done = Array.from(new Set([...(cardState.onboarding_steps_done ?? []), stepIndex]))
    const newState = { ...cardState, onboarding_steps_done: done }
    setCardState(newState)
    saveState({ onboarding_steps_done: done })
    // Show next onboarding card immediately
    setAnimOut(true)
    setTimeout(() => {
      setAnimOut(false)
      const next = buildOnboardingCard(newState)
      if (next) {
        setCard(next)
      } else {
        setVisible(false)
        setCard(null)
      }
    }, 280)
  }

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
              return (
                <div className="flex gap-1 pt-0.5">
                  {ONBOARDING_STEPS.map((_, i) => (
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
