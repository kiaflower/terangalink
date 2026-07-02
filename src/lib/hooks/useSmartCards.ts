'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface OnboardingStep {
  step: number
  stepCount: number
  title: string
  message: string
  cta?: { label: string; href: string }
}

export type SmartCardData =
  | ({ kind: 'onboarding' } & OnboardingStep)
  | { kind: 'celebration'; id: string; message: string }
  | { kind: 'reminder'; id: string; message: string; cta?: { label: string; href: string } }
  | { kind: 'optimization'; id: string; message: string; cta?: { label: string; href: string } }

interface SmartCardsState {
  onboarding: { current_step: number; refused: boolean; finished: boolean }
  last_non_onboarding_shown: string | null
  celebration: { first_order: boolean; ten_orders: boolean; hundred_views: boolean }
  optimization_last_shown: Record<string, string | null>
}

const DEFAULT_STATE: SmartCardsState = {
  onboarding: { current_step: 1, refused: false, finished: false },
  last_non_onboarding_shown: null,
  celebration: { first_order: false, ten_orders: false, hundred_views: false },
  optimization_last_shown: {
    no_payment_numbers: null,
    hours_unchanged: null,
    no_promo_code: null,
    items_no_photo: null,
    no_reviews: null,
  },
}

// ─── Onboarding step definitions ─────────────────────────────────────────────

const ALL_STEPS = [
  {
    id: 1,
    title: 'Bienvenue',
    message: 'Bienvenue sur votre dashboard TerangaLink. Nous allons vous guider en quelques étapes pour bien démarrer.',
    premiumOnly: false,
  },
  {
    id: 2,
    title: 'Ajouter une catégorie',
    message: "Commencez par créer des catégories pour organiser votre menu — Plats, Boissons, Desserts… Rendez-vous dans l'onglet Menu.",
    premiumOnly: false,
    cta: { label: 'Aller au Menu', href: '/dashboard/restaurant/menu' },
  },
  {
    id: 3,
    title: 'Ajouter un produit',
    message: "Ajoutez votre premier plat : nom, description, prix et photo. Les plats avec photo se commandent bien plus souvent.",
    premiumOnly: false,
    cta: { label: 'Aller au Menu', href: '/dashboard/restaurant/menu' },
  },
  {
    id: 4,
    title: 'Codes promo',
    message: "Vous pouvez créer des codes promo pour attirer vos premiers clients. Rendez-vous dans l'onglet Promotions.",
    premiumOnly: true,
    cta: { label: 'Voir les Promotions', href: '/dashboard/restaurant/promotions' },
  },
  {
    id: 5,
    title: 'Voir ses commandes',
    message: "Dès qu'un client commande, vous le verrez dans l'onglet Commandes. Vous recevrez aussi un message WhatsApp automatique.",
    premiumOnly: false,
    cta: { label: 'Voir les Commandes', href: '/dashboard/restaurant/orders' },
  },
  {
    id: 6,
    title: 'Numéros de paiement',
    message: "Ajoutez vos numéros Wave et Orange Money dans vos Paramètres. Ils apparaissent automatiquement dans le message de confirmation envoyé à vos clients.",
    premiumOnly: false,
    cta: { label: 'Aller aux Paramètres', href: '/dashboard/restaurant/settings' },
  },
  {
    id: 7,
    title: 'Horaires d\'ouverture',
    message: "Configurez vos horaires dans Paramètres. Votre restaurant apparaît comme Ouvert ou Fermé en temps réel sur votre page publique.",
    premiumOnly: false,
    cta: { label: 'Aller aux Paramètres', href: '/dashboard/restaurant/settings' },
  },
  {
    id: 8,
    title: 'Frais de livraison',
    message: "Vous pouvez activer ou désactiver les frais de livraison depuis vos Paramètres, et définir le montant affiché à vos clients.",
    premiumOnly: false,
    cta: { label: 'Aller aux Paramètres', href: '/dashboard/restaurant/settings' },
  },
  {
    id: 9,
    title: 'Changer son mot de passe',
    message: "Pour des raisons de sécurité, pensez à changer votre mot de passe temporaire depuis Paramètres > Sécurité.",
    premiumOnly: false,
    cta: { label: 'Aller aux Paramètres', href: '/dashboard/restaurant/settings' },
  },
  {
    id: 10,
    title: 'Statistiques',
    message: "Dans l'onglet Statistiques, suivez vos vues de menu, vos paniers, vos revenus estimés et vos plats les plus commandés.",
    premiumOnly: false,
    cta: { label: 'Voir les Statistiques', href: '/dashboard/restaurant/analytics' },
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hoursPassedSince(isoDate: string | null, hours: number): boolean {
  if (!isoDate) return true
  return Date.now() - new Date(isoDate).getTime() > hours * 3_600_000
}

function daysPassedSince(isoDate: string | null, days: number): boolean {
  if (!isoDate) return true
  return Date.now() - new Date(isoDate).getTime() > days * 86_400_000
}

function randomHours(min = 2, max = 3): number {
  return min + Math.random() * (max - min)
}

function isPremium(plan: string): boolean {
  return plan === 'trimestriel' || plan === 'annuel'
}

function mergeState(existing: Partial<SmartCardsState>): SmartCardsState {
  return {
    onboarding: { ...DEFAULT_STATE.onboarding, ...(existing.onboarding || {}) },
    last_non_onboarding_shown: existing.last_non_onboarding_shown ?? null,
    celebration: { ...DEFAULT_STATE.celebration, ...(existing.celebration || {}) },
    optimization_last_shown: {
      ...DEFAULT_STATE.optimization_last_shown,
      ...(existing.optimization_last_shown || {}),
    },
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseSmartCardsReturn {
  card: SmartCardData | null
  loading: boolean
  showSkipConfirm: boolean
  onDismiss: () => void
  onNext: () => void
  onSkipOnboarding: () => void
  onConfirmSkip: () => void
  onCancelSkip: () => void
}

export function useSmartCards(): UseSmartCardsReturn {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [state, setState] = useState<SmartCardsState>(DEFAULT_STATE)
  const [card, setCard] = useState<SmartCardData | null>(null)
  const [showSkipConfirm, setShowSkipConfirm] = useState(false)

  // ── Persist state to DB ──────────────────────────────────────────────────
  const persistState = useCallback(async (rid: string, nextState: SmartCardsState) => {
    await supabase
      .from('restaurants')
      .update({ smart_cards_data: nextState })
      .eq('id', rid)
  }, [supabase])

  // ── Determine which card to show ─────────────────────────────────────────
  const determineCard = useCallback((
    s: SmartCardsState,
    ctx: {
      plan: string
      waveNumber: string | null
      orangeMoneyNumber: string | null
      openingHours: Record<string, unknown>
      openingHoursUpdatedAt: string | null
      restaurantCreatedAt: string
      itemsWithoutPhoto: number
      totalItems: number
      pendingOrders: number
      todayOrders: number
      totalOrders: number
      totalViews: number
    },
  ): SmartCardData | null => {
    const { onboarding, last_non_onboarding_shown, celebration } = s

    // 1. ONBOARDING — highest priority
    if (!onboarding.refused && !onboarding.finished) {
      const visibleSteps = ALL_STEPS.filter(st => !st.premiumOnly || isPremium(ctx.plan))
      const stepCount = visibleSteps.length
      const stepIndex = Math.min(onboarding.current_step - 1, stepCount - 1)
      const stepDef = visibleSteps[stepIndex]
      if (stepDef) {
        return {
          kind: 'onboarding',
          step: stepIndex + 1,
          stepCount,
          title: stepDef.title,
          message: stepDef.message,
          cta: stepDef.cta,
        }
      }
    }

    // 2. Enforce 2–3h gap between non-onboarding cards
    const minHours = randomHours(2, 3)
    if (!hoursPassedSince(last_non_onboarding_shown, minHours)) return null

    // 3. CELEBRATION — one-time each
    if (!celebration.first_order && ctx.totalOrders >= 1) {
      return { kind: 'celebration', id: 'first_order', message: 'Félicitations pour votre première commande. Continuez comme ça.' }
    }
    if (!celebration.ten_orders && ctx.totalOrders >= 10) {
      return { kind: 'celebration', id: 'ten_orders', message: '10 commandes reçues. Votre restaurant prend son envol.' }
    }
    if (!celebration.hundred_views && ctx.totalViews >= 100) {
      return { kind: 'celebration', id: 'hundred_views', message: '100 personnes ont vu votre menu. Votre visibilité augmente.' }
    }

    // 4. REMINDER — if after 20h local time and user is active
    const now = new Date()
    const isEvening = now.getHours() >= 20

    if (isEvening) {
      if (ctx.pendingOrders > 0) {
        return {
          kind: 'reminder',
          id: 'pending_orders',
          message: `Vous avez ${ctx.pendingOrders} commande${ctx.pendingOrders > 1 ? 's' : ''} à traiter. Pensez à mettre à jour leur statut pour suivre vos revenus.`,
          cta: { label: 'Voir les Commandes', href: '/dashboard/restaurant/orders' },
        }
      }
      if (ctx.todayOrders === 0) {
        return {
          kind: 'reminder',
          id: 'no_orders_today',
          message: "Vous n'avez pas encore reçu de commande aujourd'hui. Partagez votre lien TerangaLink à vos contacts WhatsApp.",
        }
      }
      if (ctx.itemsWithoutPhoto > 0) {
        return {
          kind: 'reminder',
          id: 'items_no_photo_reminder',
          message: `${ctx.itemsWithoutPhoto} plat${ctx.itemsWithoutPhoto > 1 ? 's' : ''} sans photo sur votre menu. Les plats avec image se commandent bien plus souvent — ajoutez des photos depuis votre menu.`,
          cta: { label: 'Modifier le Menu', href: '/dashboard/restaurant/menu' },
        }
      }
    }

    // 5. OPTIMIZATION — 7-day cooldown per card
    const opt = s.optimization_last_shown

    if (!ctx.waveNumber && !ctx.orangeMoneyNumber && daysPassedSince(opt.no_payment_numbers, 7)) {
      return {
        kind: 'optimization',
        id: 'no_payment_numbers',
        message: "Vos clients ne savent pas comment vous payer. Ajoutez vos numéros Wave et Orange Money dans vos Paramètres.",
        cta: { label: 'Aller aux Paramètres', href: '/dashboard/restaurant/settings' },
      }
    }

    // Hours not updated since account creation (within first 48h grace)
    const hoursNeverModified = !ctx.openingHoursUpdatedAt ||
      Math.abs(new Date(ctx.openingHoursUpdatedAt).getTime() - new Date(ctx.restaurantCreatedAt).getTime()) < 60_000
    if (hoursNeverModified && daysPassedSince(opt.hours_unchanged, 7)) {
      return {
        kind: 'optimization',
        id: 'hours_unchanged',
        message: "Vos horaires sont-ils toujours exacts ? Un restaurant affiché ouvert alors qu'il est fermé fait fuir les clients.",
        cta: { label: 'Configurer les Horaires', href: '/dashboard/restaurant/settings' },
      }
    }

    if (isPremium(ctx.plan) && daysPassedSince(opt.no_promo_code, 7)) {
      return {
        kind: 'optimization',
        id: 'no_promo_code',
        message: "Attirez vos premiers clients avec un code promo de bienvenue. Créez-en un depuis l'onglet Promotions.",
        cta: { label: 'Créer un Code Promo', href: '/dashboard/restaurant/promotions' },
      }
    }

    if (ctx.itemsWithoutPhoto > 0 && daysPassedSince(opt.items_no_photo, 7)) {
      return {
        kind: 'optimization',
        id: 'items_no_photo',
        message: `${ctx.itemsWithoutPhoto} plat${ctx.itemsWithoutPhoto > 1 ? 's' : ''} sans photo. Les plats avec image se commandent bien plus souvent — ajoutez des photos depuis votre menu.`,
        cta: { label: 'Modifier le Menu', href: '/dashboard/restaurant/menu' },
      }
    }

    if (ctx.totalOrders > 0 && daysPassedSince(opt.no_reviews, 7)) {
      return {
        kind: 'optimization',
        id: 'no_reviews',
        message: "Les avis rassurent vos futurs clients. Demandez à vos habitués de noter votre restaurant directement sur votre page.",
      }
    }

    return null
  }, [])

  // ── Load all data ────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('restaurant_id')
      .eq('id', user.id)
      .single()

    if (!profile?.restaurant_id) { setLoading(false); return }
    const rid = profile.restaurant_id
    setRestaurantId(rid)

    const today = new Date().toISOString().split('T')[0]

    const [
      { data: restaurant },
      { data: sub },
      { count: pendingOrders },
      { count: todayOrders },
      { count: totalOrders },
      { count: totalViews },
      { data: menuItems },
    ] = await Promise.all([
      supabase.from('restaurants').select('smart_cards_data, wave_number, orange_money_number, opening_hours, updated_at, created_at').eq('id', rid).single(),
      supabase.from('subscriptions').select('plan').eq('restaurant_id', rid).single(),
      supabase.from('orders').select('*', { count: 'exact', head: true }).eq('restaurant_id', rid).in('status', ['pending', 'paid']),
      supabase.from('orders').select('*', { count: 'exact', head: true }).eq('restaurant_id', rid).gte('created_at', `${today}T00:00:00`),
      supabase.from('orders').select('*', { count: 'exact', head: true }).eq('restaurant_id', rid),
      supabase.from('analytics_events').select('*', { count: 'exact', head: true }).eq('restaurant_id', rid).eq('event_type', 'page_view'),
      supabase.from('menu_items').select('id, image_url').eq('restaurant_id', rid),
    ])

    if (!restaurant) { setLoading(false); return }

    const savedState = mergeState((restaurant.smart_cards_data as Partial<SmartCardsState>) || {})
    setState(savedState)

    const itemsWithoutPhoto = (menuItems || []).filter(i => !i.image_url).length

    const ctx = {
      plan: sub?.plan || 'mensuel',
      waveNumber: restaurant.wave_number,
      orangeMoneyNumber: restaurant.orange_money_number,
      openingHours: (restaurant.opening_hours as Record<string, unknown>) || {},
      openingHoursUpdatedAt: restaurant.updated_at,
      restaurantCreatedAt: restaurant.created_at,
      itemsWithoutPhoto,
      totalItems: (menuItems || []).length,
      pendingOrders: pendingOrders ?? 0,
      todayOrders: todayOrders ?? 0,
      totalOrders: totalOrders ?? 0,
      totalViews: totalViews ?? 0,
    }

    const activeCard = determineCard(savedState, ctx)
    setCard(activeCard)
    setLoading(false)
  }, [supabase, determineCard])

  useEffect(() => { loadData() }, [loadData])

  // ── Actions ──────────────────────────────────────────────────────────────

  const updateState = useCallback(async (updater: (prev: SmartCardsState) => SmartCardsState) => {
    if (!restaurantId) return
    setState(prev => {
      const next = updater(prev)
      persistState(restaurantId, next)
      return next
    })
  }, [restaurantId, persistState])

  const onDismiss = useCallback(() => {
    if (!card) return

    if (card.kind === 'onboarding') {
      // Just close without advancing
      setCard(null)
      return
    }

    // Mark celebration/reminder/optimization as shown and update timestamp
    updateState(prev => {
      const next = { ...prev, last_non_onboarding_shown: new Date().toISOString() }

      if (card.kind === 'celebration') {
        next.celebration = { ...prev.celebration, [card.id]: true }
      } else if (card.kind === 'optimization') {
        next.optimization_last_shown = {
          ...prev.optimization_last_shown,
          [card.id]: new Date().toISOString(),
        }
      }

      return next
    })

    setCard(null)
  }, [card, updateState])

  const onNext = useCallback(() => {
    if (!card || card.kind !== 'onboarding') return

    updateState(prev => {
      const visibleSteps = ALL_STEPS.filter(st => !st.premiumOnly)
      const nextStep = prev.onboarding.current_step + 1

      if (nextStep > visibleSteps.length) {
        return { ...prev, onboarding: { ...prev.onboarding, finished: true } }
      }
      return { ...prev, onboarding: { ...prev.onboarding, current_step: nextStep } }
    })

    setState(prev => {
      const visibleSteps = ALL_STEPS.filter(st => !st.premiumOnly)
      const nextStep = prev.onboarding.current_step + 1

      if (nextStep > visibleSteps.length) {
        setCard(null)
        return { ...prev, onboarding: { ...prev.onboarding, finished: true } }
      }

      const stepDef = visibleSteps[nextStep - 1]
      if (stepDef) {
        setCard({
          kind: 'onboarding',
          step: nextStep,
          stepCount: visibleSteps.length,
          title: stepDef.title,
          message: stepDef.message,
          cta: stepDef.cta,
        })
      }
      return { ...prev, onboarding: { ...prev.onboarding, current_step: nextStep } }
    })
  }, [card, updateState])

  const onSkipOnboarding = useCallback(() => {
    setShowSkipConfirm(true)
  }, [])

  const onConfirmSkip = useCallback(() => {
    setShowSkipConfirm(false)
    updateState(prev => ({ ...prev, onboarding: { ...prev.onboarding, refused: true } }))
    setCard(null)
  }, [updateState])

  const onCancelSkip = useCallback(() => {
    setShowSkipConfirm(false)
  }, [])

  return { card, loading, showSkipConfirm, onDismiss, onNext, onSkipOnboarding, onConfirmSkip, onCancelSkip }
}
