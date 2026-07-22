import type { SupabaseClient } from '@supabase/supabase-js'

// Évite de re-signaler la même restaurant pour le même type d'alerte tant que
// la condition reste vraie d'un run à l'autre du cron quotidien — sinon une
// restaurant inactive depuis 60 jours déclencherait la même alerte tous les
// jours. S'appuie sur push_notifications_log (déjà écrit par sendPush.ts),
// pas de table de dédoublonnage séparée à maintenir.
export async function shouldSendAdminAlert(
  admin: SupabaseClient<any, any, any>,
  type: string,
  restaurantId: string,
  cooldownDays: number
): Promise<boolean> {
  const since = new Date(Date.now() - cooldownDays * 24 * 60 * 60 * 1000).toISOString()
  const { count } = await admin
    .from('push_notifications_log')
    .select('id', { count: 'exact', head: true })
    .eq('type', type)
    .eq('restaurant_id', restaurantId)
    .gte('created_at', since)
  return (count ?? 0) === 0
}
