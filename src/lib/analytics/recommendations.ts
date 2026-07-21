import { ANALYTICS_THRESHOLDS } from './thresholds'
import type { WeeklyStats } from './weeklyStats'

export interface Recommendation {
  type: 'low_conversion_views' | 'visit_spike' | 'cart_friction'
  message: string
}

/**
 * Règles simples (pas de ML) appliquées aux métriques déjà calculées par
 * computeWeeklyStats. Consommé par le dashboard boutique et le rapport
 * hebdomadaire — une seule implémentation, deux affichages.
 */
export function computeRecommendations(stats: WeeklyStats): Recommendation[] {
  const recos: Recommendation[] = []
  const { viewToCartRate, cartToOrderRate } = stats.conversionRates

  if (
    stats.productViews >= ANALYTICS_THRESHOLDS.minViewsForSignal &&
    viewToCartRate !== null &&
    viewToCartRate < ANALYTICS_THRESHOLDS.lowAddToCartRate
  ) {
    recos.push({
      type: 'low_conversion_views',
      message: "Beaucoup de vues produit mais peu d'ajouts au panier : vérifiez vos prix, descriptions et photos.",
    })
  }

  if (
    stats.visitGrowthPercent !== null &&
    stats.visitGrowthPercent >= ANALYTICS_THRESHOLDS.visitSpikePercent
  ) {
    recos.push({
      type: 'visit_spike',
      message: `Forte hausse des visites cette semaine (+${stats.visitGrowthPercent}%) : c'est le bon moment pour publier une nouveauté ou une promotion.`,
    })
  }

  if (
    stats.cartsCreated >= ANALYTICS_THRESHOLDS.minCartsForSignal &&
    cartToOrderRate !== null &&
    cartToOrderRate < ANALYTICS_THRESHOLDS.lowOrderConversionRate
  ) {
    recos.push({
      type: 'cart_friction',
      message: 'Beaucoup de paniers créés mais peu de commandes confirmées : il y a peut-être une friction au moment de commander (facilitez le passage vers WhatsApp).',
    })
  }

  return recos
}
