import type { SupabaseClient } from '@supabase/supabase-js'
import { sendPushToSuperAdmins } from './sendPush'

const LAST_SENT_KEY = 'admin_notif_last_periodic_reminder_at'

// Un message différent par jour plutôt qu'un rappel générique répété 3x/semaine.
const DAY_COPY: Record<number, { title: string; suggestion: string }> = {
  1: {
    title: 'Lundi — bilan du week-end',
    suggestion: "Suggestion : relancez par WhatsApp les restaurants inactives depuis plus de 30 jours.",
  },
  3: {
    title: 'Mercredi — mi-semaine',
    suggestion: 'Suggestion : publiez une fiche business ou une story pour mettre en avant un restaurant.',
  },
  5: {
    title: 'Vendredi — avant le week-end',
    suggestion: "Suggestion : envoyez la newsletter hebdo ou relancez les abonnements qui arrivent à échéance.",
  },
}

function plural(count: number, word: string, pluralWord = `${word}s`): string {
  return count > 1 ? pluralWord : word
}

/**
 * Rappel Super Admin des lundis/mercredis/vendredis (voir push-daily). La
 * fenêtre de données couvre "depuis le dernier rappel envoyé" (persisté dans
 * platform_settings), pas un nombre de jours fixe — ça reste juste même si un
 * run est manqué ou que le cron change de créneau.
 */
export async function sendAdminPeriodicReminder(admin: SupabaseClient<any, any, any>, now: Date, dayOfWeek: number): Promise<void> {
  const copy = DAY_COPY[dayOfWeek]
  if (!copy) return

  const { data: lastSentRow } = await admin.from('platform_settings').select('value').eq('key', LAST_SENT_KEY).maybeSingle()
  const since = lastSentRow?.value ? new Date(lastSentRow.value) : new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
  const sinceIso = since.toISOString()

  const [signupsRes, clicksRes, fichesRes] = await Promise.all([
    admin.from('inscriptions').select('id', { count: 'exact', head: true }).gte('created_at', sinceIso),
    admin.from('analytics_events').select('id', { count: 'exact', head: true }).eq('event_type', 'directory_click').gte('created_at', sinceIso),
    admin.from('fiches').select('id', { count: 'exact', head: true }).neq('status', 'publiee'),
  ])

  const newSignups = signupsRes.count ?? 0
  const directoryClicks = clicksRes.count ?? 0
  const fichesToPublish = fichesRes.count ?? 0

  const body = [
    `${newSignups} nouvelle${plural(newSignups, '', 's')} inscription${plural(newSignups, '', 's')} depuis le dernier point`,
    `${directoryClicks} clic${plural(directoryClicks, '', 's')} depuis l'annuaire`,
    `${fichesToPublish} fiche${plural(fichesToPublish, '', 's')} business à publier/relancer`,
    copy.suggestion,
  ].join('\n')

  await sendPushToSuperAdmins(admin, {
    type: 'admin_periodic_reminder',
    title: copy.title,
    body,
    url: '/dashboard/super-admin',
  })

  await admin.from('platform_settings').upsert(
    { key: LAST_SENT_KEY, value: now.toISOString(), updated_at: now.toISOString() },
    { onConflict: 'key' }
  )
}
