const VIEWED_KEY = 'terangalink_viewed_stories'
const LIKED_KEY = 'terangalink_liked_stories'

export const STORIES_VIEWED_EVENT = 'stories:viewed-changed'

function readSet(key: string): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(key) ?? '[]'))
  } catch {
    return new Set()
  }
}

function writeSet(key: string, set: Set<string>) {
  localStorage.setItem(key, JSON.stringify(Array.from(set)))
}

export function getViewedStoryIds(): Set<string> {
  return readSet(VIEWED_KEY)
}

export function isStoryViewed(storyId: string): boolean {
  return readSet(VIEWED_KEY).has(storyId)
}

// Retourne true seulement la première fois qu'une story est marquée vue,
// pour que l'appelant sache s'il doit incrémenter le compteur de vues.
export function markStoryViewed(storyId: string): boolean {
  const set = readSet(VIEWED_KEY)
  if (set.has(storyId)) return false
  set.add(storyId)
  writeSet(VIEWED_KEY, set)
  window.dispatchEvent(new CustomEvent(STORIES_VIEWED_EVENT))
  return true
}

export function isStoryLiked(storyId: string): boolean {
  return readSet(LIKED_KEY).has(storyId)
}

export function toggleStoryLiked(storyId: string): boolean {
  const set = readSet(LIKED_KEY)
  const nowLiked = !set.has(storyId)
  if (nowLiked) set.add(storyId)
  else set.delete(storyId)
  writeSet(LIKED_KEY, set)
  return nowLiked
}
