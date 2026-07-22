'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RestaurantStory } from '@/lib/types'
import { getViewedStoryIds, STORIES_VIEWED_EVENT } from '@/lib/storyStorage'
import { StoryViewer } from '@/components/stories/StoryViewer'

export interface StoryRestaurant {
  id: string
  slug: string
  name: string
  logo_url: string | null
  storyIds: string[]
}

interface Props {
  restaurants: StoryRestaurant[]
}

export function StoriesBar({ restaurants }: Props) {
  const [viewedIds, setViewedIds] = useState<Set<string>>(() => new Set())
  const [openRestaurant, setOpenRestaurant] = useState<StoryRestaurant | null>(null)
  const [viewerStories, setViewerStories] = useState<RestaurantStory[]>([])

  useEffect(() => {
    setViewedIds(getViewedStoryIds())
    function onViewedChanged() { setViewedIds(getViewedStoryIds()) }
    window.addEventListener(STORIES_VIEWED_EVENT, onViewedChanged)
    return () => window.removeEventListener(STORIES_VIEWED_EVENT, onViewedChanged)
  }, [])

  if (!restaurants.length) return null

  const ordered = [...restaurants].sort((a, b) => {
    const aSeen = a.storyIds.every(id => viewedIds.has(id))
    const bSeen = b.storyIds.every(id => viewedIds.has(id))
    return aSeen === bSeen ? 0 : aSeen ? 1 : -1
  })

  async function openStories(b: StoryRestaurant) {
    const supabase = createClient()
    const { data } = await supabase.from('restaurant_stories').select('*').eq('restaurant_id', b.id)
      .gt('expires_at', new Date().toISOString()).order('created_at', { ascending: true })
    if (!data?.length) return
    setViewerStories(data)
    setOpenRestaurant(b)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 pt-6">
      <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
        {ordered.map(b => {
          const seen = b.storyIds.every(id => viewedIds.has(id))
          return (
            <button key={b.id} onClick={() => openStories(b)} className="flex flex-col items-center gap-1.5 flex-shrink-0 w-16">
              <div className="rounded-full" style={{
                padding: 2.5,
                background: seen ? '#D1D5DB' : 'linear-gradient(45deg, #F59E0B, #EC4899, #F97316)',
              }}>
                <div className="rounded-full p-0.5 bg-white">
                  {b.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.logo_url} alt={b.name} className="w-14 h-14 rounded-full object-cover" />
                  ) : (
                    <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: '#F97316' }}>
                      {b.name.charAt(0)}
                    </div>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-gray-600 truncate w-full text-center">{b.name}</p>
            </button>
          )
        })}
      </div>

      {openRestaurant && viewerStories.length > 0 && (
        <StoryViewer
          stories={viewerStories}
          restaurantSlug={openRestaurant.slug}
          restaurantName={openRestaurant.name}
          restaurantLogoUrl={openRestaurant.logo_url}
          onClose={() => setOpenRestaurant(null)}
        />
      )}
    </div>
  )
}
