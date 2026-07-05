export type OpeningHoursMap = Record<string, { ouverture?: string; fermeture?: string; ferme?: boolean }>

const JOURS_BY_JS_DAY = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']

export function isOpenNow(opening_hours?: OpeningHoursMap | null): boolean {
  if (!opening_hours || Object.keys(opening_hours).length === 0) return true
  const now = new Date()
  const jour = JOURS_BY_JS_DAY[now.getDay()]
  const h = opening_hours[jour]
  if (!h || h.ferme) return false
  if (!h.ouverture || !h.fermeture) return true
  const [oh, om] = h.ouverture.split(':').map(Number)
  const [fh, fm] = h.fermeture.split(':').map(Number)
  const cur = now.getHours() * 60 + now.getMinutes()
  return cur >= oh * 60 + om && cur < fh * 60 + fm
}
