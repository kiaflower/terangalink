'use client'

import { useEffect, useState } from 'react'
import { Eye, Heart, Clock, Trash2, Pencil, Image as ImageIcon, Video } from 'lucide-react'
import { formatTimeRemaining } from '@/lib/stories-utils'
import type { StoryWithRelations } from '@/lib/types'

interface StoryCardProps {
  story: StoryWithRelations
  onDelete: (id: string) => void
  onEdit: (story: StoryWithRelations) => void
}

export function StoryCard({ story, onDelete, onEdit }: StoryCardProps) {
  const [remaining, setRemaining] = useState(() => formatTimeRemaining(story.expires_at))
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    const id = setInterval(() => setRemaining(formatTimeRemaining(story.expires_at)), 30000)
    return () => clearInterval(id)
  }, [story.expires_at])

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-white border border-gray-200">
      <div className="relative w-16 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
        {story.media_type === 'video' ? (
          <video src={story.media_url} className="w-full h-full object-cover" muted />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={story.media_url} alt="Story" className="w-full h-full object-cover" />
        )}
        <div className="absolute top-1 left-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center">
          {story.media_type === 'video' ? <Video className="w-3 h-3 text-white" /> : <ImageIcon className="w-3 h-3 text-white" />}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        {story.caption && <p className="text-sm text-gray-900 truncate mb-1">{story.caption}</p>}
        {story.menu_item && (
          <p className="text-xs text-brand-orange font-medium mb-1 truncate">Lié à : {story.menu_item.name}</p>
        )}
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{remaining}</span>
          <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />Vue {story.view_count} fois</span>
          <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" />Aimée {story.like_count ?? 0} fois</span>
        </div>
      </div>

      {confirming ? (
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => onDelete(story.id)} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-500 text-white">Confirmer</button>
          <button onClick={() => setConfirming(false)} className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600">Annuler</button>
        </div>
      ) : (
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onEdit(story)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            title="Modifier"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => setConfirming(true)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors"
            title="Supprimer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
