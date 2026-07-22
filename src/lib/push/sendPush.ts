import webpush from 'web-push'
import type { SupabaseClient } from '@supabase/supabase-js'

type AdminClient = SupabaseClient

let vapidConfigured = false

function ensureVapidConfigured() {
  if (vapidConfigured) return
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT
  if (!publicKey || !privateKey || !subject) {
    throw new Error('VAPID keys manquantes (NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT)')
  }
  webpush.setVapidDetails(subject, publicKey, privateKey)
  vapidConfigured = true
}

export interface PushPayload {
  type: string
  title: string
  body: string
  url?: string
}

interface SubscriptionRow {
  id: string
  endpoint: string
  p256dh: string
  auth: string
}

// Envoie à chaque abonnement individuellement (pas d'API "broadcast" côté Web
// Push) et nettoie les abonnements expirés/révoqués (404/410) au passage —
// sinon on continuerait à tenter d'écrire dessus indéfiniment.
async function sendToSubscriptions(
  admin: AdminClient,
  subscriptions: SubscriptionRow[],
  payload: PushPayload
): Promise<number> {
  ensureVapidConfigured()
  let sentCount = 0

  await Promise.all(subscriptions.map(async (sub) => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      )
      sentCount++
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode
      if (statusCode === 404 || statusCode === 410) {
        await admin.from('push_subscriptions').delete().eq('id', sub.id)
      } else {
        console.error('push send error:', err)
      }
    }
  }))

  return sentCount
}

async function logNotification(
  admin: AdminClient,
  payload: PushPayload,
  opts: { restaurantId?: string | null; profileId?: string | null; recipientCount: number; totalTargets: number }
) {
  const status = opts.recipientCount > 0 ? 'sent' : opts.totalTargets > 0 ? 'failed' : 'skipped'
  await admin.from('push_notifications_log').insert({
    type: payload.type,
    restaurant_id: opts.restaurantId ?? null,
    profile_id: opts.profileId ?? null,
    title: payload.title,
    body: payload.body,
    recipient_count: opts.recipientCount,
    status,
  })
}

// Envoie à tous les admins (principal + secondaire) ayant activé les
// notifications sur au moins un appareil pour ce restaurant.
export async function sendPushToRestaurant(admin: AdminClient, restaurantId: string, payload: PushPayload): Promise<number> {
  const { data: subs } = await admin.from('push_subscriptions').select('id, endpoint, p256dh, auth').eq('restaurant_id', restaurantId)
  const targets = subs ?? []
  const sentCount = targets.length > 0 ? await sendToSubscriptions(admin, targets, payload) : 0
  await logNotification(admin, payload, { restaurantId, recipientCount: sentCount, totalTargets: targets.length })
  return sentCount
}

// Envoie à tous les super-admins abonnés (utilisateur unique en pratique,
// mais peut avoir plusieurs appareils).
export async function sendPushToSuperAdmins(admin: AdminClient, payload: PushPayload): Promise<number> {
  const { data: admins } = await admin.from('profiles').select('id').eq('role', 'super_admin')
  const adminIds = (admins ?? []).map(a => a.id)
  const { data: subs } = adminIds.length > 0
    ? await admin.from('push_subscriptions').select('id, endpoint, p256dh, auth').in('profile_id', adminIds)
    : { data: [] as SubscriptionRow[] }
  const targets = subs ?? []
  const sentCount = targets.length > 0 ? await sendToSubscriptions(admin, targets, payload) : 0
  await logNotification(admin, payload, { recipientCount: sentCount, totalTargets: targets.length })
  return sentCount
}
