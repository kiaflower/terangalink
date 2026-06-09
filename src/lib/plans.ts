/**
 * TerangaLink Subscription System
 * Plans métier actifs: starter | pro
 *
 * Compatibilité de lecture uniquement:
 * - mensuel, starter, trial, free, demo => starter
 * - trimestriel, annuel, pro, enterprise, premium => pro
 * Le futur Premium n'est pas implémenté comme offre active.
 */

export type PlanType = 'starter' | 'pro'

export const PLAN_LABELS: Record<PlanType, string> = {
  starter: 'Starter',
  pro: 'Pro',
}

export const PLAN_PRICES: Record<PlanType, number> = {
  starter: 9000,
  pro: 15000,
}

export const PLAN_PERIODS: Record<PlanType, string> = {
  starter: '/mois',
  pro: '/mois',
}

export interface PlanFeatures {
  siteCommande: boolean
  menuIllimite: boolean
  commandesWhatsapp: boolean
  dashboardAdministrateur: boolean
  suiviCommandes: boolean
  revenusMensuels: boolean
  produitsPlusCommandes: boolean
  statistiquesAnalytiques: boolean
  qrCode: boolean
  supportWhatsapp: boolean
  formationIncluse: boolean
  brandingTerangaVisible: boolean
  mentionPoweredByVisible: boolean
  couleursTerangaDefaut: boolean
  personnalisationAvancee: boolean
  suppressionBranding: boolean
  modeClairSombre: boolean
  couleursPersonnalisees: boolean
  couleursBoutonsPersonnalisees: boolean
  reseauxSociaux: boolean
  boutonAppel: boolean
  boutonPartage: boolean
  telephoneVisible: boolean
  supportPrioritaire: boolean
  accompagnementPersonnalise: boolean
  maxAdmins: number
}

const BASE_FEATURES = {
  siteCommande: true,
  menuIllimite: true,
  commandesWhatsapp: true,
  dashboardAdministrateur: true,
  suiviCommandes: true,
  revenusMensuels: true,
  produitsPlusCommandes: true,
  statistiquesAnalytiques: true,
  qrCode: true,
  supportWhatsapp: true,
  formationIncluse: true,
}

export const PLAN_FEATURES: Record<PlanType, PlanFeatures> = {
  starter: {
    ...BASE_FEATURES,
    brandingTerangaVisible: true,
    mentionPoweredByVisible: true,
    couleursTerangaDefaut: true,
    personnalisationAvancee: false,
    suppressionBranding: false,
    modeClairSombre: false,
    couleursPersonnalisees: false,
    couleursBoutonsPersonnalisees: false,
    reseauxSociaux: false,
    boutonAppel: false,
    boutonPartage: false,
    telephoneVisible: false,
    supportPrioritaire: false,
    accompagnementPersonnalise: false,
    maxAdmins: 1,
  },
  pro: {
    ...BASE_FEATURES,
    brandingTerangaVisible: false,
    mentionPoweredByVisible: false,
    couleursTerangaDefaut: false,
    personnalisationAvancee: true,
    suppressionBranding: true,
    modeClairSombre: true,
    couleursPersonnalisees: true,
    couleursBoutonsPersonnalisees: true,
    reseauxSociaux: true,
    boutonAppel: true,
    boutonPartage: true,
    telephoneVisible: true,
    supportPrioritaire: true,
    accompagnementPersonnalise: true,
    maxAdmins: 3,
  },
}

export function normalizePlan(plan: string | null | undefined): PlanType {
  const normalized = (plan || '').trim().toLowerCase()
  if (normalized === 'pro') return 'pro'
  if (normalized === 'starter') return 'starter'

  // Compatibilité ancien système en lecture.
  if (normalized === 'trimestriel' || normalized === 'annuel' || normalized === 'enterprise' || normalized === 'premium') {
    return 'pro'
  }
  return 'starter'
}

export function getPlanFeatures(plan: string | null | undefined): PlanFeatures {
  return PLAN_FEATURES[normalizePlan(plan)]
}

export function canUseFeature(plan: string | null | undefined, feature: keyof PlanFeatures): boolean {
  return !!getPlanFeatures(plan)[feature]
}

export function getUpgradeRequired(feature: keyof PlanFeatures): PlanType | null {
  if (PLAN_FEATURES.starter[feature]) return null
  return PLAN_FEATURES.pro[feature] ? 'pro' : null
}

export function getUpgradeLabel(feature: keyof PlanFeatures): string {
  const required = getUpgradeRequired(feature)
  if (!required) return ''
  return `Disponible avec le plan ${PLAN_LABELS[required]}`
}
