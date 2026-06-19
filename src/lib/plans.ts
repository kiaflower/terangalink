/**
 * TerangaLink Subscription System
 * Plans: starter | pro | premium
 */

export type PlanType = 'starter' | 'pro' | 'premium'
export type LegacyPlanType = 'mensuel' | 'trimestriel' | 'annuel' | 'enterprise' | 'free' | 'demo' | 'gratuit' | 'trial'

export const PLAN_LABELS: Record<PlanType, string> = {
  starter: 'Starter',
  pro: 'Pro',
  premium: 'Premium',
}

export const PLAN_PRICES: Record<PlanType, number> = {
  starter: 9000,
  pro: 15000,
  premium: 25000,
}

export const PLAN_PERIODS: Record<PlanType, string> = {
  starter: '/mois',
  pro: '/mois',
  premium: '/mois',
}

export const PLAN_OPTIONS: { value: PlanType; label: string }[] = [
  { value: 'starter', label: 'Starter — 9 000 FCFA/mois' },
  { value: 'pro', label: 'Pro — 15 000 FCFA/mois' },
  { value: 'premium', label: 'Premium — 25 000 FCFA/mois' },
]

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
  couleursTerangaParDefaut: boolean
  modeClairSombre: boolean
  couleursPersonnalisees: boolean
  couleurBoutonsPersonnalisee: boolean
  elementsVisuelsPersonnalises: boolean
  reseauxSociaux: boolean
  suppressionBranding: boolean
  supportPrioritaire: boolean
  accompagnementPersonnalise: boolean
  // Premium
  variantesProduits: boolean
  gestionStock: boolean
  precommandes: boolean
  codePromo: boolean
  // Compatibilité feature gates existants
  maxPlats: number | 'illimité'
  maxAdmins: number
  brandingPersonnalise: boolean
  analyticsAvances: boolean
  qrCodePremium: boolean
  boutonAppel: boolean
  boutonPartage: boolean
  managerDedie: boolean
}

export const PLAN_FEATURES: Record<PlanType, PlanFeatures> = {
  starter: {
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
    brandingTerangaVisible: true,
    couleursTerangaParDefaut: true,
    modeClairSombre: false,
    couleursPersonnalisees: false,
    couleurBoutonsPersonnalisee: false,
    elementsVisuelsPersonnalises: false,
    reseauxSociaux: false,
    suppressionBranding: false,
    supportPrioritaire: false,
    accompagnementPersonnalise: false,
    variantesProduits: false,
    gestionStock: false,
    precommandes: false,
    codePromo: false,
    maxPlats: 'illimité',
    maxAdmins: 1,
    brandingPersonnalise: false,
    analyticsAvances: true,
    qrCodePremium: true,
    boutonAppel: false,
    boutonPartage: false,
    managerDedie: false,
  },
  pro: {
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
    brandingTerangaVisible: false,
    couleursTerangaParDefaut: false,
    modeClairSombre: true,
    couleursPersonnalisees: true,
    couleurBoutonsPersonnalisee: true,
    elementsVisuelsPersonnalises: true,
    reseauxSociaux: true,
    suppressionBranding: true,
    supportPrioritaire: true,
    accompagnementPersonnalise: true,
    variantesProduits: false,
    gestionStock: false,
    precommandes: false,
    codePromo: false,
    maxPlats: 'illimité',
    maxAdmins: 5,
    brandingPersonnalise: true,
    analyticsAvances: true,
    qrCodePremium: true,
    boutonAppel: true,
    boutonPartage: true,
    managerDedie: true,
  },
  premium: {
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
    brandingTerangaVisible: false,
    couleursTerangaParDefaut: false,
    modeClairSombre: true,
    couleursPersonnalisees: true,
    couleurBoutonsPersonnalisee: true,
    elementsVisuelsPersonnalises: true,
    reseauxSociaux: true,
    suppressionBranding: true,
    supportPrioritaire: true,
    accompagnementPersonnalise: true,
    variantesProduits: true,
    gestionStock: true,
    precommandes: true,
    codePromo: true,
    maxPlats: 'illimité',
    maxAdmins: 10,
    brandingPersonnalise: true,
    analyticsAvances: true,
    qrCodePremium: true,
    boutonAppel: true,
    boutonPartage: true,
    managerDedie: true,
  },
}

const LEGACY_PLAN_MAP: Record<string, PlanType> = {
  starter: 'starter',
  mensuel: 'starter',
  trimestriel: 'starter',
  free: 'starter',
  demo: 'starter',
  gratuit: 'starter',
  trial: 'starter',
  pro: 'pro',
  annuel: 'pro',
  enterprise: 'pro',
  premium: 'premium',
}

export function getPlanFeatures(plan: string): PlanFeatures {
  return PLAN_FEATURES[normalizePlan(plan)]
}

export function normalizePlan(plan: string): PlanType {
  const normalized = (plan || '').trim().toLowerCase()
  return LEGACY_PLAN_MAP[normalized] ?? 'starter'
}

export function isProPlan(plan: string): boolean {
  return normalizePlan(plan) === 'pro'
}

export function isPremiumPlan(plan: string): boolean {
  return normalizePlan(plan) === 'premium'
}

export function canUseFeature(plan: string, feature: keyof PlanFeatures): boolean {
  const features = getPlanFeatures(plan)
  return !!features[feature]
}

export function getUpgradeRequired(feature: keyof PlanFeatures): PlanType | null {
  if (PLAN_FEATURES.starter[feature]) return null
  if (PLAN_FEATURES.pro[feature]) return 'pro'
  if (PLAN_FEATURES.premium[feature]) return 'premium'
  return null
}

export function getUpgradeLabel(feature: keyof PlanFeatures): string {
  const required = getUpgradeRequired(feature)
  if (!required) return ''
  return `Disponible avec le plan ${PLAN_LABELS[required]}`
}
