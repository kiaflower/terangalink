'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { X, Heart, Share2, Volume2, VolumeX } from 'lucide-react'
import type { RestaurantStory } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { markStoryViewed, isStoryLiked, toggleStoryLiked } from '@/lib/storyStorage'

const IMAGE_DURATION_MS = 5000
const SWIPE_THRESHOLD = 60

interface Props {
  stories: RestaurantStory[]
  restaurantSlug: string
  restaurantName: string
  restaurantLogoUrl?: string | null
  onClose: () => void
}

export function StoryViewer({ stories, restaurantSlug, restaurantName, restaurantLogoUrl, onClose }: Props) {
  const supabase = createClient()
  const [index, setIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [muted, setMuted] = useState(true)
  const [liked, setLiked] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const rafRef = useRef<number | null>(null)
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  const story = stories[index]

  function goNext() {
    setIndex(i => {
      if (i >= stories.length - 1) { onClose(); return i }
      return i + 1
    })
  }
  function goPrev() {
    setIndex(i => Math.max(0, i - 1))
  }

  useEffect(() => {
    if (!story) return
    setProgress(0)
    setLiked(isStoryLiked(story.id))

    const firstView = markStoryViewed(story.id)
    if (firstView) {
      supabase.rpc('increment_story_counter', { story_id: story.id, counter_name: 'views_count', delta: 1 }).then(() => {}, () => {})
    }

    if (story.media_type === 'image') {
      const start = performance.now()
      const tick = (now: number) => {
        const elapsed = now - start
        setProgress(Math.min(1, elapsed / IMAGE_DURATION_MS))
        if (elapsed >= IMAGE_DURATION_MS) { goNext(); return }
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
      return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.id])

  useEffect(() => {
    const video = videoRef.current
    if (!video || story?.media_type !== 'video') return
    function onTimeUpdate() {
      if (video && video.duration) setProgress(video.currentTime / video.duration)
    }
    video.addEventListener('timeupdate', onTimeUpdate)
    video.addEventListener('ended', goNext)
    video.play().catch(() => {})
    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate)
      video.removeEventListener('ended', goNext)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.id])

  if (!story) return null

  function handleLike() {
    const nowLiked = toggleStoryLiked(story.id)
    setLiked(nowLiked)
    supabase.rpc('increment_story_counter', { story_id: story.id, counter_name: 'likes_count', delta: nowLiked ? 1 : -1 }).then(() => {}, () => {})
  }

  async function handleShare() {
    const url = `${window.location.origin}/${restaurantSlug}`
    if (navigator.share) {
      try { await navigator.share({ title: restaurantName, url }) } catch { /* annulé */ }
    } else {
      await navigator.clipboard.writeText(url)
    }
  }

  const ctaHref = story.product_id ? `/${restaurantSlug}?product=${story.product_id}` : `/${restaurantSlug}`
  const ctaLabel = story.product_id ? 'Voir le plat' : 'Voir le restaurant'

  function handleTouchStart(e: React.TouchEvent) {
    const t = e.touches[0]
    touchStart.current = { x: t.clientX, y: t.clientY }
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const start = touchStart.current
    touchStart.current = null
    if (!start) return
    const t = e.changedTouches[0]
    const dx = t.clientX - start.x
    const dy = t.clientY - start.y
    const absDx = Math.abs(dx)
    const absDy = Math.abs(dy)

    if (absDy > absDx && dy > SWIPE_THRESHOLD) {
      e.preventDefault()
      onClose()
      return
    }
    if (absDx > absDy && absDx > SWIPE_THRESHOLD) {
      e.preventDefault()
      if (dx < 0) goNext()
      else goPrev()
    }
  }

  return (
    <div className="fixed inset-0 z-[70] bg-black flex items-center justify-center"
      onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <div className="relative w-full h-full sm:w-[420px] sm:h-[90vh] sm:rounded-2xl overflow-hidden bg-black">
        <div className="absolute top-2 left-2 right-2 z-20 flex gap-1">
          {stories.map((s, i) => (
            <div key={s.id} className="flex-1 h-0.5 rounded-full bg-white/30 overflow-hidden">
              <div className="h-full bg-white" style={{ width: `${i < index ? 100 : i === index ? progress * 100 : 0}%` }} />
            </div>
          ))}
        </div>

        <div className="absolute top-5 left-3 right-3 z-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {restaurantLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={restaurantLogoUrl} alt="" className="w-7 h-7 rounded-full object-cover border border-white/40" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold">
                {restaurantName.charAt(0)}
              </div>
            )}
            <p className="text-white text-sm font-semibold drop-shadow">{restaurantName}</p>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="text-white p-1.5"><X className="w-6 h-6" /></button>
        </div>

        {story.media_type === 'video' ? (
          <video ref={videoRef} src={story.media_url} className="w-full h-full object-contain" muted={muted} playsInline autoPlay />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={story.media_url} alt="" className="w-full h-full object-contain" />
        )}

        <button aria-label="Précédent" onClick={goPrev} className="absolute left-0 top-0 h-full w-1/3 z-10" />
        <button aria-label="Suivant" onClick={goNext} className="absolute right-0 top-0 h-full w-1/3 z-10" />

        <div className="absolute bottom-0 left-0 right-0 z-20 p-4 bg-gradient-to-t from-black/80 to-transparent">
          {story.caption && <p className="text-white text-sm mb-3">{story.caption}</p>}
          <div className="flex items-center gap-2">
            <Link href={ctaHref} className="flex-1 text-center bg-white text-black text-sm font-bold py-2.5 rounded-xl">
              {ctaLabel}
            </Link>
            <button onClick={handleLike} aria-label="Aimer" className="p-2.5 rounded-xl bg-white/15 text-white">
              <Heart className={`w-5 h-5 ${liked ? 'fill-red-500 text-red-500' : ''}`} />
            </button>
            {story.media_type === 'video' && (
              <button onClick={() => setMuted(m => !m)} aria-label="Muet" className="p-2.5 rounded-xl bg-white/15 text-white">
                {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
            )}
            <button onClick={handleShare} aria-label="Partager" className="p-2.5 rounded-xl bg-white/15 text-white">
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
