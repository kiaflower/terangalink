import type { OpeningHours } from './types/database'

export const DAYS: { key: keyof OpeningHours; label: string }[] = [
  { key: 'lundi', label: 'Lundi' },
  { key: 'mardi', label: 'Mardi' },
  { key: 'mercredi', label: 'Mercredi' },
  { key: 'jeudi', label: 'Jeudi' },
  { key: 'vendredi', label: 'Vendredi' },
  { key: 'samedi', label: 'Samedi' },
  { key: 'dimanche', label: 'Dimanche' },
]

const JS_DAY_TO_KEY: (keyof OpeningHours)[] = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']

// Miroir du DEFAULT de la colonne restaurants.opening_hours (migration 0017) — sert
// à préremplir le formulaire des paramètres tant que rien n'a encore été chargé
// depuis la base, pour ne jamais afficher "Fermé" par défaut à tort.
export const DEFAULT_OPENING_HOURS: OpeningHours = {
  lundi: '08:00-18:00',
  mardi: '08:00-18:00',
  mercredi: '08:00-18:00',
  jeudi: '08:00-18:00',
  vendredi: '08:00-18:00',
  samedi: '08:00-18:00',
  dimanche: '08:00-18:00',
}

export function isOpenNow(hours: OpeningHours | null | undefined, date = new Date()): boolean | null {
  if (!hours) return null
  const dakarDayName = date.toLocaleDateString('en-US', { timeZone: 'Africa/Dakar', weekday: 'short' })
  const dayIndex = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(dakarDayName)
  if (dayIndex === -1) return null
  const todayKey = JS_DAY_TO_KEY[dayIndex]
  const todayHours = hours[todayKey]
  if (!todayHours) return false

  const [open, close] = todayHours.split('-')
  if (!open || !close) return null
  const now = date.toLocaleTimeString('fr-SN', { timeZone: 'Africa/Dakar', hour: '2-digit', minute: '2-digit', hour12: false })
  return now >= open && now <= close
}

export interface OpenStatus {
  isOpen: boolean
  label: string
}

/**
 * Statut détaillé "Ouvert maintenant" / "Fermé — Ouvre [jour] à HH:MM", utilisé
 * sous la description du restaurant. Cherche la prochaine ouverture jusqu'à 7
 * jours en avant si le restaurant est fermée aujourd'hui ou n'a plus d'horaires définis.
 */
export function getOpenStatus(hours: OpeningHours | null | undefined, date = new Date()): OpenStatus | null {
  if (!hours) return null
  const dakarDayName = date.toLocaleDateString('en-US', { timeZone: 'Africa/Dakar', weekday: 'short' })
  const dayIndex = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(dakarDayName)
  if (dayIndex === -1) return null
  const now = date.toLocaleTimeString('fr-SN', { timeZone: 'Africa/Dakar', hour: '2-digit', minute: '2-digit', hour12: false })

  const todayKey = JS_DAY_TO_KEY[dayIndex]
  const todayHours = hours[todayKey]
  if (todayHours) {
    const [open, close] = todayHours.split('-')
    if (open && close) {
      if (now >= open && now <= close) return { isOpen: true, label: 'Ouvert maintenant' }
      if (now < open) return { isOpen: false, label: `Fermé — Ouvre aujourd'hui à ${open}` }
    }
  }

  for (let i = 1; i <= 7; i++) {
    const key = JS_DAY_TO_KEY[(dayIndex + i) % 7]
    const dayHours = hours[key]
    if (!dayHours) continue
    const [open] = dayHours.split('-')
    if (!open) continue
    const dayLabel = i === 1 ? 'demain' : DAYS.find(d => d.key === key)!.label.toLowerCase()
    return { isOpen: false, label: `Fermé — Ouvre ${dayLabel} à ${open}` }
  }

  return { isOpen: false, label: 'Fermé' }
}
