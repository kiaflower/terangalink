import { ANALYTICS_THRESHOLDS } from './thresholds'

const SESSION_TTL_MS = ANALYTICS_THRESHOLDS.cartAbandonmentHours * 60 * 60 * 1000

interface StoredSession {
  id: string
  touchedAt: number
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

/**
 * Id anonyme par visiteur/boutique, persisté en localStorage (même pattern
 * que usePersistedCart). Réutilisé tant que le visiteur revient dans la
 * fenêtre d'abandon — au-delà, un nouvel id est généré, ce qui est cohérent :
 * passé ce délai, la session précédente était de toute façon déjà abandonnée.
 */
export function getOrCreateSessionId(boutiqueSlug: string): string {
  const key = `terangaspot_session_${boutiqueSlug}`
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const parsed: StoredSession = JSON.parse(raw)
      if (Date.now() - parsed.touchedAt < SESSION_TTL_MS) {
        localStorage.setItem(key, JSON.stringify({ id: parsed.id, touchedAt: Date.now() }))
        return parsed.id
      }
    }
  } catch { /* ignore */ }

  const id = generateId()
  try {
    localStorage.setItem(key, JSON.stringify({ id, touchedAt: Date.now() }))
  } catch { /* storage full */ }
  return id
}
