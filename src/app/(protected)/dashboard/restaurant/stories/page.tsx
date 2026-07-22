'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RestaurantStory } from '@/lib/types'
import { Circle, Eye, Heart, Trash2, Upload, Film } from 'lucide-react'
import { FeatureGate } from '@/components/FeatureGate'
import type { PlanKey } from '@/lib/plans'
import { uploadWithProgress, validateVideoFile, MAX_VIDEO_SIZE_MB, MAX_VIDEO_SECONDS } from '@/lib/videoUtils'

const MAX_STORIES_PER_DAY = 3
const MAX_DURATION_HOURS = 24

interface StoryProduct {
  id: string
  name: string
  image_url: string | null
}

function startOfTodayISO(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function hoursLeft(expiresAt: string): number {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60)))
}

function StoriesManager({ restaurantId }: { restaurantId: string }) {
  const supabase = createClient()
  const [stories, setStories] = useState<RestaurantStory[]>([])
  const [products, setProducts] = useState<StoryProduct[]>([])
  const [caption, setCaption] = useState('')
  const [productId, setProductId] = useState('')
  const [durationHours, setDurationHours] = useState(MAX_DURATION_HOURS)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState('')
  const [todayCount, setTodayCount] = useState(0)

  const load = useCallback(async (bid: string) => {
    const [{ data: storyRows }, { data: prods }] = await Promise.all([
      supabase.from('restaurant_stories').select('*').eq('restaurant_id', bid)
        .gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }),
      supabase.from('menu_items').select('id, name, image_url').eq('restaurant_id', bid).eq('is_available', true),
    ])
    setStories(storyRows ?? [])
    setProducts(prods ?? [])
    const { count } = await supabase.from('restaurant_stories').select('id', { count: 'exact', head: true })
      .eq('restaurant_id', bid).gte('created_at', startOfTodayISO())
    setTodayCount(count ?? 0)
  }, [supabase])

  useEffect(() => { load(restaurantId) }, [load, restaurantId])

  async function handleFileSelected(file: File) {
    if (!restaurantId) return
    if (todayCount >= MAX_STORIES_PER_DAY) {
      setError(`Limite atteinte : ${MAX_STORIES_PER_DAY} stories par jour maximum.`)
      return
    }
    setError('')
    const mediaType: 'image' | 'video' = file.type.startsWith('video/') ? 'video' : 'image'

    if (mediaType === 'video') {
      const videoError = await validateVideoFile(file)
      if (videoError) {
        setError(videoError)
        return
      }
    }

    setUploading(true)
    setUploadProgress(0)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setError('Session expirée, reconnectez-vous.')
      setUploading(false)
      return
    }

    const path = `${restaurantId}/${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`
    const uploadedPath = await uploadWithProgress('restaurant-stories', path, file, session.access_token, setUploadProgress)
    if (!uploadedPath) {
      setError('Erreur lors de l\'envoi du fichier. Vérifiez votre connexion et réessayez.')
      setUploading(false)
      return
    }
    const { data: pub } = supabase.storage.from('restaurant-stories').getPublicUrl(uploadedPath)
    const clampedHours = Math.min(MAX_DURATION_HOURS, Math.max(1, durationHours))
    const expiresAt = new Date(Date.now() + clampedHours * 60 * 60 * 1000).toISOString()
    const { error: insertError } = await supabase.from('restaurant_stories').insert({
      restaurant_id: restaurantId,
      media_url: pub.publicUrl,
      media_type: mediaType,
      caption: caption || null,
      menu_item_id: productId || null,
      expires_at: expiresAt,
    })
    if (insertError) {
      setError('Erreur lors de la création de la story.')
      setUploading(false)
      return
    }
    setCaption('')
    setProductId('')
    setDurationHours(MAX_DURATION_HOURS)
    setUploading(false)
    setUploadProgress(0)
    await load(restaurantId)
  }

  async function deleteStory(id: string) {
    if (!restaurantId || !confirm('Supprimer cette story ?')) return
    await supabase.from('restaurant_stories').delete().eq('id', id)
    await load(restaurantId)
  }

  const remaining = Math.max(0, MAX_STORIES_PER_DAY - todayCount)

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stories</h1>
          <p className="text-gray-500 text-sm mt-1">
            {remaining > 0 ? `${remaining} ${remaining > 1 ? 'stories restantes' : 'story restante'} aujourd'hui` : 'Limite atteinte pour aujourd\'hui'} — expirent après {MAX_DURATION_HOURS}h maximum
          </p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6 space-y-4">
        <h2 className="font-semibold text-gray-900 text-sm">Nouvelle story</h2>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>}

        <div>
          <label className="text-xs text-gray-400 mb-1 block">Texte (optionnel)</label>
          <input
            value={caption}
            onChange={e => setCaption(e.target.value)}
            placeholder="Un mot pour accompagner votre story..."
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-brand-orange"
          />
        </div>

        <div>
          <label className="text-xs text-gray-400 mb-1 block">Plat à mettre en avant (optionnel)</label>
          <select
            value={productId}
            onChange={e => setProductId(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-brand-orange"
          >
            <option value="">Aucun plat — bouton &quot;Voir le restaurant&quot;</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-400 mb-1 block">Durée d&apos;affichage : {durationHours}h (max {MAX_DURATION_HOURS}h)</label>
          <input
            type="range"
            min={1}
            max={MAX_DURATION_HOURS}
            value={durationHours}
            onChange={e => setDurationHours(parseInt(e.target.value, 10))}
            className="w-full accent-brand-orange"
          />
        </div>

        {uploading ? (
          <div className="border-2 border-dashed border-gray-200 rounded-xl py-8 px-4">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
              <div className="h-full bg-brand-orange transition-all" style={{ width: `${uploadProgress}%` }} />
            </div>
            <p className="text-center text-sm font-medium text-gray-500">Envoi en cours... {uploadProgress}%</p>
          </div>
        ) : (
          <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl py-8 cursor-pointer transition-colors ${remaining === 0 ? 'opacity-40 pointer-events-none border-gray-200' : 'border-gray-300 hover:border-brand-orange text-gray-400 hover:text-brand-orange'}`}>
            <input type="file" accept="image/*,video/*" className="hidden"
              disabled={remaining === 0}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelected(f) }} />
            <Upload className="w-5 h-5" />
            <span className="text-sm font-medium">Choisir une image ou une vidéo</span>
            <span className="text-xs text-gray-400">Vidéo : {MAX_VIDEO_SECONDS}s et {MAX_VIDEO_SIZE_MB} Mo maximum</span>
          </label>
        )}
      </div>

      {stories.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <Circle className="w-10 h-10 mx-auto mb-4 text-gray-300" />
          <p>Aucune story active pour le moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {stories.map(story => {
            const product = products.find(p => p.id === story.menu_item_id)
            return (
              <div key={story.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <div className="relative w-full aspect-[9/16] bg-gray-100">
                  {story.media_type === 'video' ? (
                    <video src={story.media_url} className="w-full h-full object-cover" muted />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={story.media_url} alt="" className="w-full h-full object-cover" />
                  )}
                  {story.media_type === 'video' && (
                    <span className="absolute top-2 left-2 bg-black/60 rounded-full p-1"><Film className="w-3 h-3 text-white" /></span>
                  )}
                  <button onClick={() => deleteStory(story.id)}
                    className="absolute top-2 right-2 bg-black/60 rounded-full p-1.5 text-white hover:bg-red-500 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="p-3">
                  {story.caption && <p className="text-xs text-gray-700 truncate mb-1">{story.caption}</p>}
                  {product && <p className="text-[11px] text-brand-orange font-medium truncate mb-2">→ {product.name}</p>}
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span className="inline-flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{story.views_count}</span>
                    <span className="inline-flex items-center gap-1"><Heart className="w-3.5 h-3.5" />{story.likes_count}</span>
                    <span>{hoursLeft(story.expires_at)}h restantes</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function StoriesPage() {
  const supabase = createClient()
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [plan, setPlan] = useState<PlanKey | null>(null)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(async data => {
      if (!data.restaurant_id) return
      setRestaurantId(data.restaurant_id)
      const { data: sub } = await supabase.from('subscriptions').select('plan').eq('restaurant_id', data.restaurant_id).single()
      setPlan((sub?.plan as PlanKey) ?? 'starter')
    })
  }, [supabase])

  if (plan === null || !restaurantId) return <p className="text-gray-400 text-sm py-8">Chargement...</p>

  return (
    <FeatureGate plan={plan} feature="stories" requiredPlanLabel="Starter"
      description="Publiez des stories (photo ou vidéo, 24h max) pour mettre en avant vos nouveautés sur votre vitrine.">
      <StoriesManager restaurantId={restaurantId} />
    </FeatureGate>
  )
}
