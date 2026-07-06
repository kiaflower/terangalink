'use client'

import { useEffect, useMemo, useState } from 'react'
import { StoryAvatar } from './StoryAvatar'
import { StoryViewer } from './StoryViewer'
import { getViewedStorySet, isGroupFullySeen } from '@/lib/stories-utils'
import type { RestaurantStoryGroup } from '@/lib/types'

interface StoriesRowProps {
  groups: RestaurantStoryGroup[]
  deepLinkStoryId?: string | null
  onSeenChange?: () => void
}

interface ViewerState {
  groups: RestaurantStoryGroup[]
  groupIndex: number
  storyIndex: number
}

export function StoriesRow({ groups, deepLinkStoryId, onSeenChange }: StoriesRowProps) {
  const [viewer, setViewer] = useState<ViewerState | null>(null)
  const [missedDeepLink, setMissedDeepLink] = useState(false)
  // localStorage n'existe pas côté serveur : on démarre avec un set vide (identique
  // au rendu serveur) puis on lit l'état réel après le montage, pour éviter tout
  // mismatch d'hydratation sur l'anneau vu/non-vu.
  const [mounted, setMounted] = useState(false)
  const [viewedSet, setViewedSet] = useState<Set<string>>(new Set())

  useEffect(() => {
    setMounted(true)
    setViewedSet(getViewedStorySet())
  }, [])

  // Vus en dernier : les stories déjà lues passent derrière celles non encore vues.
  const orderedGroups = useMemo(() => {
    if (!mounted) return groups
    return [...groups].sort((a, b) => Number(isGroupFullySeen(a, viewedSet)) - Number(isGroupFullySeen(b, viewedSet)))
  }, [groups, mounted, viewedSet])

  const storyLocationMap = useMemo(() => {
    const map = new Map<string, { groupIndex: number; storyIndex: number }>()
    orderedGroups.forEach((group, groupIndex) => {
      group.stories.forEach((story, storyIndex) => {
        map.set(story.id, { groupIndex, storyIndex })
      })
    })
    return map
  }, [orderedGroups])

  useEffect(() => {
    if (!deepLinkStoryId) return
    const location = storyLocationMap.get(deepLinkStoryId)
    if (location) setViewer({ groups: orderedGroups, ...location })
    else setMissedDeepLink(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepLinkStoryId, storyLocationMap])

  useEffect(() => {
    if (!missedDeepLink) return
    const timeout = setTimeout(() => setMissedDeepLink(false), 4000)
    return () => clearTimeout(timeout)
  }, [missedDeepLink])

  if (groups.length === 0) return null

  return (
    <div className="relative">
      {missedDeepLink && (
        <div
          className="absolute -top-1 left-1/2 -translate-x-1/2 z-30 text-xs font-medium px-4 py-2 rounded-full text-white shadow-lg whitespace-nowrap"
          style={{ backgroundColor: '#111111' }}
        >
          Cette story n&apos;est plus disponible
        </div>
      )}
      <div className="max-w-6xl mx-auto px-4 pt-5 pb-1">
        <div
          className="flex gap-3 overflow-x-auto pb-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {orderedGroups.map((group, groupIndex) => (
            <StoryAvatar
              key={group.restaurant.id}
              restaurant={group.restaurant}
              seen={mounted && isGroupFullySeen(group, viewedSet)}
              onClick={() => setViewer({ groups: orderedGroups, groupIndex, storyIndex: 0 })}
            />
          ))}
        </div>
      </div>

      {viewer && (
        <StoryViewer
          groups={viewer.groups}
          initialGroupIndex={viewer.groupIndex}
          initialStoryIndex={viewer.storyIndex}
          onClose={() => { setViewer(null); setViewedSet(getViewedStorySet()); onSeenChange?.() }}
          onSeenChange={() => { setViewedSet(getViewedStorySet()); onSeenChange?.() }}
        />
      )}
    </div>
  )
}
