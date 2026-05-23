/**
 * TerangaLink Subscription System
 * Plans: mensuel | trimestriel | annuel
 */

export type PlanType = 'mensuel' | 'trimestriel' | 'annuel'

export const PLAN_LABELS: Record<PlanType, string> = {
  mensuel: 'Mensuel',
  trimestriel: 'Trimestriel',
  annuel: 'Annuel',
}

export const PLAN_PRICES: Record<PlanType, number> = {
  mensuel: 15000,
  trimestriel: 40000,
  annuel: 135000,
}

export const PLAN_PERIODS: Record<PlanType, string> = {
  mensuel: '/mois',
  trimestriel: '/3 mois',
  annuel: '/an',
}

export interface PlanFeatures {
  maxPlats: number | 'illimité'
  maxAdmins: number
  modeClairSombre: boolean
  couleursPersonnalisees: boolean
  brandingPersonnalise: boolean
  suppressionBranding: boolean
  analyticsAvances: boolean
  qrCodePremium: boolean
  boutonAppel: boolean
  boutonPartage: boolean
  supportPrioritaire: boolean
  managerDedie: boolean
}

export const PLAN_FEATURES: Record<PlanType, PlanFeatures> = {
  mensuel: {
    maxPlats: 20,
    maxAdmins: 1,
    modeClairSombre: false,
    couleursPersonnalisees: false,
    brandingPersonnalise: false,
    suppressionBranding: false,
    analyticsAvances: false,
    qrCodePremium: false,
    boutonAppel: false,
    boutonPartage: false,
    supportPrioritaire: false,
    managerDedie: false,
  },
  trimestriel: {
    maxPlats: 'illimité',
    maxAdmins: 2,
    modeClairSombre: true,
    couleursPersonnalisees: false,
    brandingPersonnalise: false,
    suppressionBranding: false,
    analyticsAvances: true,
    qrCodePremium: true,
    boutonAppel: true,
    boutonPartage: true,
    supportPrioritaire: true,
    managerDedie: false,
  },
  annuel: {
    maxPlats: 'illimité',
    maxAdmins: 5,
    modeClairSombre: true,
    couleursPersonnalisees: true,
    brandingPersonnalise: true,
    suppressionBranding: true,
    analyticsAvances: true,
    qrCodePremium: true,
    boutonAppel: true,
    boutonPartage: true,
    supportPrioritaire: true,
    managerDedie: true,
  },
}

export function getPlanFeatures(plan: string): PlanFeatures {
  // Backward compat: map old plan names
  const normalized = normalizePlan(plan)
  return PLAN_FEATURES[normalized] ?? PLAN_FEATURES.mensuel
}

export function normalizePlan(plan: string): PlanType {
  if (['mensuel', 'trimestriel', 'annuel'].includes(plan)) return plan as PlanType
  // Map legacy names
  if (plan === 'mensuel') return 'mensuel'
  if (plan === 'trimestriel') return 'trimestriel'
  if (plan === 'annuel') return 'annuel'
  if (plan === 'trial') return 'mensuel'
  return 'mensuel'
}

export function canUseFeature(plan: string, feature: keyof PlanFeatures): boolean {
  const features = getPlanFeatures(plan)
  return !!features[feature]
}

export function getUpgradeRequired(feature: keyof PlanFeatures): PlanType | null {
  if (PLAN_FEATURES.mensuel[feature]) return null
  if (PLAN_FEATURES.trimestriel[feature]) return 'trimestriel'
  return 'annuel'
}

export function getUpgradeLabel(feature: keyof PlanFeatures): string {
  const required = getUpgradeRequired(feature)
  if (!required) return ''
  return `Disponible avec le plan ${PLAN_LABELS[required]}`
}
