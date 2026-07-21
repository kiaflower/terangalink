export const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    currency: 'FCFA',
    period: 'mois',
    features: [
      "Listée dans l'annuaire TerangaSpot",
      'Vitrine publique avec lien unique',
      "Jusqu'à 10 produits",
      'Commandes WhatsApp illimitées',
      'Tableau de bord simple',
      'Statistiques de base',
      'Badge TerangaSpot visible sur la vitrine',
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
      "Listée dans l'annuaire TerangaSpot",
      'Vitrine publique avec lien unique',
      "Catalogue jusqu'à 30 produits",
      'Commandes WhatsApp illimitées',
      'QR Code téléchargeable',
      'Avis clients visibles',
      'Suivi de commande client',
      "Bannière d'annonce sur la vitrine",
      'Bannières promotionnelles',
      'Stories (photo/vidéo, 24h)',
      'Tableau de bord',
      "Parcours d'achat & produits populaires",
      'Badge TerangaSpot visible sur la vitrine',
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
      'Catalogue illimité',
      "Jusqu'à 5 images par produit",
      'Variantes produit (taille, couleur...)',
      'Épingler 2 produits en tête de vitrine',
      'Gestion de stock',
      'Codes promo clients',
      'Précommandes',
      'Génération de reçus de commande',
      'Analytiques complètes (abandon de panier, produits à surveiller, recommandations)',
      'Couleurs personnalisées sur la vitrine',
      'Suppression du badge TerangaSpot',
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
// NB: `free` n'est pour l'instant qu'une carte marketing (aucune boutique réelle n'a ce plan
// en base — l'inscription en libre-service qui le créerait n'existe pas encore). Ces valeurs
// documentent l'intention pour quand l'application réelle des limites sera construite.
export const PLAN_FEATURES = {
  free: {
    maxProduits: 10,
    maxCategories: 3,
    imagesParProduit: 1,
    variantesProduits: false,
    gestionStock: false,
    codePromo: false,
    bannieres: false,
    precommandes: false,
    generationRecus: false,
    analyticsAvances: false,
    couleursPersonnalisees: false,
    suppressionBranding: false,
    badgeVerifie: false,
    epinglageProduits: false,
    qrCode: false,
    avisClients: false,
    suiviCommande: false,
    annonce: false,
    analyticsParcours: false,
    stories: false,
  },
  starter: {
    maxProduits: 30,
    maxCategories: 5,
    imagesParProduit: 1,
    variantesProduits: false,
    gestionStock: false,
    codePromo: false,
    bannieres: true,
    precommandes: false,
    generationRecus: false,
    analyticsAvances: false,
    couleursPersonnalisees: false,
    suppressionBranding: false,
    badgeVerifie: true, // option payante séparée, disponible sur les deux plans
    epinglageProduits: false,
    qrCode: true,
    avisClients: true,
    suiviCommande: true,
    annonce: true,
    analyticsParcours: true,
    stories: true,
  },
  pro: {
    maxProduits: -1,
    maxCategories: -1,
    imagesParProduit: 5,
    variantesProduits: true,
    gestionStock: true,
    codePromo: true,
    bannieres: true,
    precommandes: true,
    generationRecus: true,
    analyticsAvances: true,
    couleursPersonnalisees: true,
    suppressionBranding: true,
    badgeVerifie: true,
    epinglageProduits: true,
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
// réellement l'ajout de produit une fois la limite atteinte.
export function getProductLimit(plan: PlanKey): number {
  return PLAN_FEATURES[plan].maxProduits
}

export function hasReachedProductLimit(plan: PlanKey, currentProductCount: number): boolean {
  const limit = getProductLimit(plan)
  return limit !== -1 && currentProductCount >= limit
}

export function productLimitMessage(plan: PlanKey): string {
  const limit = getProductLimit(plan)
  const upgradeTarget = plan === 'free' ? 'Starter ou Pro' : 'Pro'
  return `Vous avez atteint votre limite de ${limit} produits. Passez à ${upgradeTarget} pour continuer à développer votre catalogue.`
}
