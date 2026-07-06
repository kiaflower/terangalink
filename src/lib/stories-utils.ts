import type { RestaurantStoryGroup, StoryWithRelations } from '@/lib/types'

const STORY_MAX_ACTIVE = 3

export function groupStoriesByRestaurant(stories: StoryWithRelations[]): RestaurantStoryGroup[] {
  const groups = new Map<string, RestaurantStoryGroup>()

  for (const story of stories) {
    const existing = groups.get(story.restaurant_id)
    if (existing) {
      existing.stories.push(story)
    } else {
      groups.set(story.restaurant_id, { restaurant: story.restaurant, stories: [story] })
    }
  }

  const result = Array.from(groups.values())
  result.forEach(group => {
    group.stories.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  })

  return result
}

export function formatTimeRemaining(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now()
  if (diff <= 0) return 'Expirée'
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  if (h > 0) return `${h}h${String(m).padStart(2, '0')}min`
  return `${m}min`
}

export function buildStoryShareUrl(storyId: string, baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, '')}/restaurants?story=${storyId}`
}

// ─── Durée d'affichage configurable (le restaurateur choisit à la publication) ──
export const STORY_DURATION_OPTIONS = [
  { value: '1', label: '1 heure' },
  { value: '3', label: '3 heures' },
  { value: '6', label: '6 heures' },
  { value: '12', label: '12 heures' },
  { value: '24', label: '24 heures' },
  { value: '48', label: '48 heures' },
  { value: '72', label: '72 heures' },
]

export function computeExpiresAt(hours: number): string {
  return new Date(Date.now() + hours * 3600 * 1000).toISOString()
}

// ─── Stories déjà vues (persistant, partagé entre le lecteur et la rangée) ──────
const VIEWED_KEY = 'tl_viewed_stories'

export function getViewedStorySet(): Set<string> {
  try {
    const raw = localStorage.getItem(VIEWED_KEY)
    return new Set(raw ? JSON.parse(raw) : [])
  } catch {
    return new Set()
  }
}

export function markStoryViewed(id: string) {
  try {
    const set = getViewedStorySet()
    set.add(id)
    localStorage.setItem(VIEWED_KEY, JSON.stringify(Array.from(set)))
  } catch {
    /* localStorage indisponible — pas bloquant */
  }
}

export function isGroupFullySeen(group: RestaurantStoryGroup, viewedSet: Set<string>): boolean {
  return group.stories.every(s => viewedSet.has(s.id))
}

// ─── Stories aimées (toggle local, en miroir du compteur privé côté serveur) ────
const LIKED_KEY = 'tl_liked_stories'

export function getLikedStorySet(): Set<string> {
  try {
    const raw = localStorage.getItem(LIKED_KEY)
    return new Set(raw ? JSON.parse(raw) : [])
  } catch {
    return new Set()
  }
}

export function setStoryLiked(id: string, liked: boolean) {
  try {
    const set = getLikedStorySet()
    if (liked) set.add(id); else set.delete(id)
    localStorage.setItem(LIKED_KEY, JSON.stringify(Array.from(set)))
  } catch {
    /* localStorage indisponible — pas bloquant */
  }
}

export { STORY_MAX_ACTIVE }
