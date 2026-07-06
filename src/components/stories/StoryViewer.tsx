'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { X, Volume2, VolumeX } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { StoryProgressBar } from './StoryProgressBar'
import { StoryCTA } from './StoryCTA'
import { ShareButton } from './ShareButton'
import { StoryLikeButton } from './StoryLikeButton'
import { getViewedStorySet, markStoryViewed } from '@/lib/stories-utils'
import type { RestaurantStoryGroup } from '@/lib/types'

const IMAGE_DURATION_MS = 6000

interface StoryViewerProps {
  groups: RestaurantStoryGroup[]
  initialGroupIndex: number
  initialStoryIndex?: number
  onClose: () => void
  onSeenChange?: () => void
}

export function StoryViewer({ groups, initialGroupIndex, initialStoryIndex = 0, onClose, onSeenChange }: StoryViewerProps) {
  const supabase = createClient()
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex)
  const [storyIndex, setStoryIndex] = useState(initialStoryIndex)
  const [progress, setProgress] = useState(0)
  const rafRef = useRef<number | null>(null)
  const startRef = useRef(0)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const touchXRef = useRef<number | null>(null)
  const [muted, setMuted] = useState(false)

  const group = groups[groupIndex]
  const story = group?.stories[storyIndex]

  const goNext = useCallback(() => {
    setProgress(0)
    if (!group) return
    if (storyIndex < group.stories.length - 1) {
      setStoryIndex(i => i + 1)
    } else if (groupIndex < groups.length - 1) {
      setGroupIndex(g => g + 1)
      setStoryIndex(0)
    } else {
      onClose()
    }
  }, [group, storyIndex, groupIndex, groups, onClose])

  const goPrev = useCallback(() => {
    setProgress(0)
    if (storyIndex > 0) {
      setStoryIndex(i => i - 1)
    } else if (groupIndex > 0) {
      const prevGroup = groups[groupIndex - 1]
      setGroupIndex(g => g - 1)
      setStoryIndex(prevGroup.stories.length - 1)
    }
  }, [storyIndex, groupIndex, groups])

  // ── Progression automatique (images uniquement — vidéo pilotée par timeupdate) ──
  useEffect(() => {
    if (!story || story.media_type === 'video') return
    setProgress(0)
    startRef.current = Date.now()

    function tick() {
      const elapsed = Date.now() - startRef.current
      const pct = Math.min(100, (elapsed / IMAGE_DURATION_MS) * 100)
      setProgress(pct)
      if (pct >= 100) { goNext(); return }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.id])

  // ── Tracking vue : chaque visionnage compte, y compris en revoyant une story déjà vue ──
  useEffect(() => {
    if (!story) return
    // "Vu" (pour l'anneau gris) ne se marque qu'une fois — indépendant du compteur de vues.
    if (!getViewedStorySet().has(story.id)) {
      markStoryViewed(story.id)
      onSeenChange?.()
    }
    supabase.rpc('increment_story_view', { p_story_id: story.id })
  }, [story, supabase, onSeenChange])

  // ── Préchargement de la story suivante uniquement ────────────
  useEffect(() => {
    if (!group) return
    const nextStory = group.stories[storyIndex + 1] ?? groups[groupIndex + 1]?.stories[0]
    if (!nextStory) return
    if (nextStory.media_type === 'image') {
      const img = new window.Image()
      img.src = nextStory.media_url
    } else {
      const video = document.createElement('video')
      video.preload = 'auto'
      video.src = nextStory.media_url
    }
  }, [group, groups, groupIndex, storyIndex])

  // ── Clavier + verrou scroll ───────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft') goPrev()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose, goNext, goPrev])

  function handleVideoTimeUpdate() {
    const video = videoRef.current
    if (!video || !video.duration) return
    setProgress((video.currentTime / video.duration) * 100)
  }

  // Certains navigateurs bloquent l'autoplay avec le son — on retombe sur muet si besoin.
  function handleVideoCanPlay() {
    const video = videoRef.current
    if (!video) return
    video.play().catch(() => setMuted(true))
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchXRef.current = e.touches[0].clientX
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchXRef.current == null) return
    const dx = e.changedTouches[0].clientX - touchXRef.current
    touchXRef.current = null
    if (Math.abs(dx) < 40) return
    if (dx < 0) goNext(); else goPrev()
  }

  if (!group || !story) return null

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center animate-fade-in">
      <div
        className="relative w-full h-full sm:w-[420px] sm:h-[92vh] sm:rounded-3xl overflow-hidden bg-black"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {story.media_type === 'video' ? (
          <video
            ref={videoRef}
            key={story.id}
            src={story.media_url}
            className="w-full h-full object-cover"
            autoPlay
            muted={muted}
            playsInline
            onTimeUpdate={handleVideoTimeUpdate}
            onCanPlay={handleVideoCanPlay}
            onEnded={goNext}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={story.id} src={story.media_url} alt={story.caption ?? group.restaurant.name} className="w-full h-full object-cover" />
        )}

        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 22%, transparent 60%, rgba(0,0,0,0.8) 100%)' }}
        />

        <StoryProgressBar count={group.stories.length} currentIndex={storyIndex} progress={progress} />

        <div className="absolute top-7 left-3 right-3 flex items-center justify-between z-20">
          <div className="flex items-center gap-2">
            {group.restaurant.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={group.restaurant.logo_url} alt={group.restaurant.name} className="w-8 h-8 rounded-full object-cover" style={{ border: '1px solid rgba(255,255,255,0.4)' }} />
            ) : (
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: '#F97316' }}>
                {group.restaurant.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-white text-sm font-semibold" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>{group.restaurant.name}</span>
          </div>
          <div className="flex items-center gap-2">
            {story.media_type === 'video' && (
              <button
                onClick={() => setMuted(m => !m)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-white"
                style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}
                aria-label={muted ? 'Activer le son' : 'Couper le son'}
              >
                {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            )}
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full flex items-center justify-center text-white"
              style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <button aria-label="Story précédente" onClick={goPrev} className="absolute top-0 left-0 w-1/3 h-full z-10" />
        <button aria-label="Story suivante" onClick={goNext} className="absolute top-0 right-0 w-1/3 h-full z-10" />

        {story.caption && (
          <div className="absolute bottom-24 left-4 right-4 z-20">
            <p className="text-white text-sm font-medium" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>{story.caption}</p>
          </div>
        )}

        <div className="absolute bottom-5 left-4 right-4 z-20 flex items-center gap-3">
          <div className="flex-1">
            <StoryCTA restaurantSlug={group.restaurant.slug} menuItem={story.menu_item} />
          </div>
          <StoryLikeButton key={story.id} storyId={story.id} />
          <ShareButton storyId={story.id} />
        </div>
      </div>
    </div>
  )
}
