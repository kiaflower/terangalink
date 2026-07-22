export const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    currency: 'FCFA',
    period: 'mois',
    features: [
      "Listée dans l'annuaire TerangaLink",
      'Vitrine publique avec lien unique',
      "Jusqu'à 10 plats",
      'Commandes WhatsApp illimitées',
      'Tableau de bord simple',
      'Statistiques de base',
      'Badge TerangaLink visible sur la vitrine',
    ],
    limits: { products: 10, categories: 3, images_per_product: 1 },
    brandingVisible: true,
  },
  starter: {
    name: 'Starter',
    price: 9900,
    currency: 'FCFA',
    period: 'mois',
    features: [
      "Listée dans l'annuaire TerangaLink",
      'Vitrine publique avec lien unique',
      "Menu jusqu'à 30 plats",
      'Commandes WhatsApp illimitées',
      'QR Code téléchargeable',
      'Avis clients visibles',
      'Suivi de commande client',
      "Bannière d'annonce sur la vitrine",
      'Bannières promotionnelles',
      'Stories (photo/vidéo, 24h)',
      'Tableau de bord',
      "Parcours d'achat & plats populaires",
      'Badge TerangaLink visible sur la vitrine',
    ],
    limits: { products: 30, categories: 5, images_per_product: 1 },
    brandingVisible: true,
  },
  pro: {
    name: 'Pro',
    price: 19900,
    currency: 'FCFA',
    period: 'mois',
    features: [
      'Tout Starter +',
      'Menu illimité',
      "Jusqu'à 5 images par plat",
      'Variantes plat (taille, couleur...)',
      'Épingler 2 plats en tête de vitrine',
      'Gestion de stock',
      'Codes promo clients',
      'Précommandes',
      'Génération de reçus de commande',
      'Analytiques complètes (abandon de panier, plats à surveiller, recommandations)',
      'Couleurs personnalisées sur la vitrine',
      'Suppression du badge TerangaLink',
    ],
    limits: { products: -1, categories: -1, images_per_product: 5 },
    brandingVisible: false,
  },
} as const

export type PlanKey = keyof typeof PLANS

// Plans facturables réellement en base sur `subscriptions.plan` — n'inclut pas `free`,
// qui n'a pas de prix et ne génère jamais de facture. À utiliser (au lieu de `PlanKey`)
// partout où le code lit/écrit le plan d'une vraie souscription (facturation, invoices).
export type BillablePlanKey = Exclude<PlanKey, 'free'>

// Feature flags par plan — source de vérité pour le gating (FeatureGate / canUseFeature).
// NB: `free` n'est pour l'instant qu'une carte marketing (aucun restaurant réel n'a ce plan
// en base — l'inscription en libre-service qui le créerait n'existe pas encore). Ces valeurs
// documentent l'intention pour quand l'application réelle des limites sera construite.
export const PLAN_FEATURES = {
  free: {
    maxPlats: 10,
    maxCategories: 3,
    imagesParPlat: 1,
    variantesPlats: false,
    gestionStock: false,
    codePromo: false,
    bannieres: false,
    precommandes: false,
    generationRecus: false,
    analyticsAvances: false,
    couleursPersonnalisees: false,
    suppressionBranding: false,
    badgeVerifie: false,
    epinglagePlats: false,
    qrCode: false,
    avisClients: false,
    suiviCommande: false,
    annonce: false,
    analyticsParcours: false,
    stories: false,
  },
  starter: {
    maxPlats: 30,
    maxCategories: 5,
    imagesParPlat: 1,
    variantesPlats: false,
    gestionStock: false,
    codePromo: false,
    bannieres: true,
    precommandes: false,
    generationRecus: false,
    analyticsAvances: false,
    couleursPersonnalisees: false,
    suppressionBranding: false,
    badgeVerifie: true, // option payante séparée, disponible sur les deux plans
    epinglagePlats: false,
    qrCode: true,
    avisClients: true,
    suiviCommande: true,
    annonce: true,
    analyticsParcours: true,
    stories: true,
  },
  pro: {
    maxPlats: -1,
    maxCategories: -1,
    imagesParPlat: 5,
    variantesPlats: true,
    gestionStock: true,
    codePromo: true,
    bannieres: true,
    precommandes: true,
    generationRecus: true,
    analyticsAvances: true,
    couleursPersonnalisees: true,
    suppressionBranding: true,
    badgeVerifie: true,
    epinglagePlats: true,
    qrCode: true,
    avisClients: true,
    suiviCommande: true,
    annonce: true,
    analyticsParcours: true,
    stories: true,
  },
} as const satisfies Record<PlanKey, Record<string, boolean | number>>

export type FeatureKey = keyof typeof PLAN_FEATURES.starter

export function canUseFeature(plan: PlanKey, feature: FeatureKey): boolean {
  const value: number | boolean = PLAN_FEATURES[plan][feature]
  return typeof value === 'number' ? value !== 0 : value
}

// -1 = illimité (Pro). Utilisé par Free (10) et Starter (30) pour bloquer
// réellement l'ajout de plat une fois la limite atteinte.
export function getProductLimit(plan: PlanKey): number {
  return PLAN_FEATURES[plan].maxPlats
}

export function hasReachedProductLimit(plan: PlanKey, currentProductCount: number): boolean {
  const limit = getProductLimit(plan)
  return limit !== -1 && currentProductCount >= limit
}

export function productLimitMessage(plan: PlanKey): string {
  const limit = getProductLimit(plan)
  const upgradeTarget = plan === 'free' ? 'Starter ou Pro' : 'Pro'
  return `Vous avez atteint votre limite de ${limit} plats. Passez à ${upgradeTarget} pour continuer à développer votre menu.`
}
