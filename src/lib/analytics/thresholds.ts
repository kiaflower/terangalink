// Seuils MVP pour les recommandations par règles, l'alerte de hausse de
// trafic et le délai d'abandon de panier. Centralisés ici pour rester
// faciles à ajuster sans chercher des valeurs codées en dur dans le code.
export const ANALYTICS_THRESHOLDS = {
  // Délai après le dernier ajout au panier sans clic WhatsApp avant de
  // considérer un panier comme abandonné.
  cartAbandonmentHours: 48,
  // Hausse de visites (semaine vs semaine précédente) déclenchant la
  // suggestion de publier une nouveauté ou une promotion.
  visitSpikePercent: 25,
  // Volume minimum de vues plat avant de juger un taux (ajout panier,
  // conversion) significatif — évite les faux signaux sur peu de données.
  minViewsForSignal: 30,
  // Volume minimum de paniers créés avant de juger le taux de conversion
  // panier -> commande significatif.
  minCartsForSignal: 5,
  // Taux vues plat -> ajout panier en dessous duquel on suggère de
  // vérifier prix/description/photos.
  lowAddToCartRate: 0.03,
  // Taux ajout panier -> commande confirmée en dessous duquel on signale
  // une possible friction de conversion.
  lowOrderConversionRate: 0.2,
  // Période couverte par défaut par le dashboard et le rapport hebdomadaire.
  reportPeriodDays: 7,
} as const
