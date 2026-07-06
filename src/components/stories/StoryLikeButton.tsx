'use client'

import { useState } from 'react'
import { Heart } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getLikedStorySet, setStoryLiked } from '@/lib/stories-utils'

export function StoryLikeButton({ storyId }: { storyId: string }) {
  const supabase = createClient()
  const [liked, setLiked] = useState(() => getLikedStorySet().has(storyId))

  function handleToggle() {
    const next = !liked
    setLiked(next)
    setStoryLiked(storyId, next)
    supabase.rpc('set_story_like', { p_story_id: storyId, p_liked: next })
  }

  return (
    <button
      onClick={handleToggle}
      className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-transform active:scale-90"
      style={{ backgroundColor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}
      title={liked ? 'Retirer le like' : 'Aimer'}
    >
      <Heart className="w-5 h-5" style={{ color: liked ? '#F97316' : 'white', fill: liked ? '#F97316' : 'none' }} />
    </button>
  )
}
