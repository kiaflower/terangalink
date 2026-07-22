import type { WeeklyStats } from './weeklyStats'

/**
 * Message WhatsApp prérempli pour le rapport hebdomadaire (envoi manuel par
 * le super admin — même pattern que buildWhatsAppMessage pour les commandes).
 */
export function buildWeeklyReportMessage(restaurantName: string, stats: WeeklyStats, recommendations: string[]): string {
  const lines = [
    `Bonjour ${restaurantName} 👋`,
    '',
    '*TON TERANGASPOT CETTE SEMAINE*',
    `${stats.visits} visites`,
    `${stats.addToCart} ajouts au panier`,
    `${stats.ordersTotal} demande${stats.ordersTotal > 1 ? 's' : ''} de commande`,
    `${stats.abandonedCarts} panier${stats.abandonedCarts > 1 ? 's' : ''} abandonné${stats.abandonedCarts > 1 ? 's' : ''}`,
  ]

  if (stats.topProduct) lines.push('', `Plat le plus populaire : *${stats.topProduct.itemName}*`)
  if (stats.visitGrowthPercent !== null) {
    lines.push(`${stats.visitGrowthPercent >= 0 ? '+' : ''}${stats.visitGrowthPercent}% de visites par rapport à la semaine précédente`)
  }

  if (recommendations.length > 0) {
    lines.push('', '💡 *Nos conseils cette semaine*')
    for (const r of recommendations) lines.push(`- ${r}`)
  }

  return lines.join('\n')
}
