/**
 * Seuil "restaurant inactif" pour le segment de ciblage — nombre de jours sans
 * connexion au dashboard restaurant. Centralisé ici plutôt qu'en dur dans les
 * requêtes, au cas où ce nombre doive changer plus tard.
 */
export const INACTIVE_DAYS_THRESHOLD = 30

/** Nombre de destinataires traités par appel à sendCampaignBatch (une invocation cron). */
export const BATCH_SIZE = 20

/** Délai entre deux envois SMTP au sein d'un même lot, pour ménager le serveur mutualisé. */
export const SEND_DELAY_MS = 300
