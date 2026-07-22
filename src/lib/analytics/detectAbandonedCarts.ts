import type { SupabaseClient } from '@supabase/supabase-js'

interface AddToCartRow {
  session_id: string | null
  created_at: string
}

export interface AbandonedCartsScanResult {
  newlyAbandonedCount: number
  scannedUntil: Date
}

/**
 * Détecte les sessions dont le panier vient de franchir le seuil d'abandon
 * (délai configurable) depuis le dernier passage du cron — pas les paniers
 * déjà signalés lors d'un run précédent. `lastCheckedAt` est le
 * `scannedUntil` renvoyé au run précédent ; à null au tout premier run, où
 * on ne remonte que 24h en arrière pour éviter un backfill sur tout
 * l'historique du restaurant.
 */
export async function detectNewlyAbandonedCarts(
  admin: SupabaseClient<any, any, any>,
  restaurantId: string,
  delayHours: number,
  lastCheckedAt: string | null
): Promise<AbandonedCartsScanResult> {
  const cutoff = new Date(Date.now() - delayHours * 60 * 60 * 1000)
  const windowStart = lastCheckedAt ? new Date(lastCheckedAt) : new Date(cutoff.getTime() - 24 * 60 * 60 * 1000)

  if (windowStart >= cutoff) return { newlyAbandonedCount: 0, scannedUntil: cutoff }

  const { data } = await admin
    .from('analytics_events')
    .select('session_id, created_at')
    .eq('restaurant_id', restaurantId)
    .eq('event_type', 'add_to_cart')
    .gt('created_at', windowStart.toISOString())
    .limit(10000)

  const rows = (data ?? []) as AddToCartRow[]
  const lastAddedAt = new Map<string, number>()
  for (const row of rows) {
    if (!row.session_id) continue
    const t = new Date(row.created_at).getTime()
    const existing = lastAddedAt.get(row.session_id)
    if (!existing || t > existing) lastAddedAt.set(row.session_id, t)
  }

  const candidateSessions = Array.from(lastAddedAt.entries())
    .filter(([, lastAdd]) => lastAdd <= cutoff.getTime())
    .map(([sid]) => sid)

  if (candidateSessions.length === 0) return { newlyAbandonedCount: 0, scannedUntil: cutoff }

  const [convertedRes, clearedRes] = await Promise.all([
    admin.from('analytics_events').select('session_id')
      .eq('restaurant_id', restaurantId).eq('event_type', 'whatsapp_click').in('session_id', candidateSessions).limit(10000),
    admin.from('analytics_events').select('session_id, created_at')
      .eq('restaurant_id', restaurantId).eq('event_type', 'cart_cleared').in('session_id', candidateSessions).limit(10000),
  ])

  const convertedSessions = new Set((convertedRes.data ?? []).map((r: { session_id: string }) => r.session_id))
  const lastClearedAt = new Map<string, number>()
  for (const row of (clearedRes.data ?? []) as Array<{ session_id: string; created_at: string }>) {
    const t = new Date(row.created_at).getTime()
    const existing = lastClearedAt.get(row.session_id)
    if (!existing || t > existing) lastClearedAt.set(row.session_id, t)
  }

  let newlyAbandonedCount = 0
  for (const sid of candidateSessions) {
    if (convertedSessions.has(sid)) continue
    const lastAdd = lastAddedAt.get(sid)!
    const clearedAfter = lastClearedAt.get(sid)
    if (clearedAfter && clearedAfter > lastAdd) continue
    newlyAbandonedCount++
  }

  return { newlyAbandonedCount, scannedUntil: cutoff }
}
