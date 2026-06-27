'use client'

import { useState, useEffect } from 'react'
import { Star, X } from 'lucide-react'
import type { ThemeTokens } from '@/lib/theme'

interface Review {
  id: string
  customer_name: string | null
  rating: number
  comment: string | null
  created_at: string
}

interface ReviewsSectionProps {
  restaurantId: string
  tokens: ThemeTokens
}

function StarRow({ rating, tokens }: { rating: number; tokens: ThemeTokens }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          className="w-3.5 h-3.5"
          style={{
            color: n <= rating ? tokens.button : tokens.border,
            fill: n <= rating ? tokens.button : 'transparent',
          }}
        />
      ))}
    </div>
  )
}

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
  if (diff < 60) return 'à l\'instant'
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`
  if (diff < 604800) return `il y a ${Math.floor(diff / 86400)} jours`
  return new Date(dateStr).toLocaleDateString('fr-SN', { day: 'numeric', month: 'long' })
}

function ReviewCard({ r, tokens }: { r: Review; tokens: ThemeTokens }) {
  return (
    <div
      className="rounded-2xl p-4 space-y-2"
      style={{ backgroundColor: tokens.bgCard, border: `1.5px solid ${tokens.border}` }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ backgroundColor: tokens.bgBadge, color: tokens.accent }}
          >
            {(r.customer_name || 'A').charAt(0).toUpperCase()}
          </div>
          <span className="text-sm font-semibold" style={{ color: tokens.textPrimary }}>
            {r.customer_name || 'Anonyme'}
          </span>
        </div>
        <span className="text-xs flex-shrink-0" style={{ color: tokens.textMuted }}>
          {timeAgo(r.created_at)}
        </span>
      </div>

      <StarRow rating={r.rating} tokens={tokens} />

      {r.comment && (
        <p className="text-sm leading-relaxed" style={{ color: tokens.textSecondary }}>
          &quot;{r.comment}&quot;
        </p>
      )}
    </div>
  )
}

export function ReviewsSection({ restaurantId, tokens }: ReviewsSectionProps) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    fetch(`/api/reviews?restaurant_id=${restaurantId}`)
      .then(r => r.json())
      .then(d => { setReviews(d.data ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [restaurantId])

  if (loading || reviews.length === 0) return null

  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
  const rounded = Math.round(avg * 10) / 10
  const preview = reviews.slice(0, 3)
  const hasMore = reviews.length > 3

  return (
    <>
      <section className="mb-10 scroll-mt-20">
        <div className="flex items-center gap-3 mb-5">
          <Star className="w-5 h-5" style={{ color: tokens.accent, fill: tokens.accent }} />
          <h2 className="text-lg font-bold" style={{ color: tokens.textPrimary }}>Avis clients</h2>
          <div
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold"
            style={{ backgroundColor: tokens.bgBadge, color: tokens.textPrimary }}
          >
            <span style={{ color: tokens.button }}>{rounded}</span>
            <span style={{ color: tokens.textMuted }}>/ 5</span>
            <span className="text-xs font-normal" style={{ color: tokens.textMuted }}>({reviews.length})</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {preview.map(r => (
            <ReviewCard key={r.id} r={r} tokens={tokens} />
          ))}
        </div>

        {hasMore && (
          <div className="flex justify-center mt-4">
            <button
              onClick={() => setShowAll(true)}
              className="px-6 py-2.5 rounded-full text-sm font-semibold transition-all"
              style={{ border: `1.5px solid ${tokens.button}`, color: tokens.button, backgroundColor: 'transparent' }}
            >
              Voir tous les avis ({reviews.length})
            </button>
          </div>
        )}
      </section>

      {/* Popup tous les avis */}
      {showAll && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowAll(false)}
          />
          <div
            className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden"
            style={{ backgroundColor: tokens.bgCard, border: `1.5px solid ${tokens.border}` }}
          >
            {/* Header popup */}
            <div
              className="flex items-center justify-between px-6 py-4 flex-shrink-0"
              style={{ borderBottom: `1px solid ${tokens.border}` }}
            >
              <div className="flex items-center gap-3">
                <Star className="w-5 h-5" style={{ color: tokens.accent, fill: tokens.accent }} />
                <h3 className="font-bold text-base" style={{ color: tokens.textPrimary }}>
                  Tous les avis
                </h3>
                <div
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold"
                  style={{ backgroundColor: tokens.bgBadge, color: tokens.textPrimary }}
                >
                  <span style={{ color: tokens.button }}>{rounded}</span>
                  <span style={{ color: tokens.textMuted }}>/ 5</span>
                  <span className="text-xs font-normal" style={{ color: tokens.textMuted }}>({reviews.length})</span>
                </div>
              </div>
              <button
                onClick={() => setShowAll(false)}
                className="p-2 rounded-full transition-colors"
                style={{ backgroundColor: tokens.bgCardHover, color: tokens.textMuted }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Liste scrollable */}
            <div className="overflow-y-auto p-6 space-y-3">
              {reviews.map(r => (
                <ReviewCard key={r.id} r={r} tokens={tokens} />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
