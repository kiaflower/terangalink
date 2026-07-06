'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { EmptyState, SkeletonRow } from '@/components/ui/Loading'
import { Sparkles, PlusCircle } from 'lucide-react'
import { StoryForm } from '@/components/stories/dashboard/StoryForm'
import { StoryCard } from '@/components/stories/dashboard/StoryCard'
import { STORY_MAX_ACTIVE } from '@/lib/stories-utils'
import type { StoryWithRelations, MenuItem } from '@/lib/types'

export default function StoriesPage() {
  const supabase = createClient()

  const [stories, setStories] = useState<StoryWithRelations[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [modal, setModal] = useState(false)
  const [editingStory, setEditingStory] = useState<StoryWithRelations | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) { setLoading(false); return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('restaurant_id')
      .eq('id', auth.user.id)
      .single()

    let rid = profile?.restaurant_id ?? null
    if (!rid) {
      const m = document.cookie.match(/(?:^|;\s*)sa_impersonate=([^;]*)/)
      if (m) { try { const imp = JSON.parse(decodeURIComponent(m[1])); if (imp.expiresAt > Date.now()) rid = imp.restaurantId } catch { /* */ } }
    }
    if (!rid) { setLoading(false); return }
    setRestaurantId(rid)

    // Nettoyage opportuniste — pas de cron sur ce projet, on purge
    // les stories expirées de ce restaurant à chaque chargement.
    await supabase.from('stories').delete().eq('restaurant_id', rid).lt('expires_at', new Date().toISOString())

    const [{ data: storiesData }, { data: itemsData }] = await Promise.all([
      supabase
        .from('stories')
        .select('*, menu_item:menu_items(id, name, price, image_url)')
        .eq('restaurant_id', rid)
        .order('created_at', { ascending: false }),
      supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', rid)
        .eq('is_available', true)
        .order('position'),
    ])

    setStories((storiesData as unknown as StoryWithRelations[]) ?? [])
    setMenuItems((itemsData as MenuItem[]) ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function handleDelete(id: string) {
    const story = stories.find(s => s.id === id)
    await supabase.from('stories').delete().eq('id', id)
    if (story) {
      const path = story.media_url.split('/story-media/')[1]
      if (path) await supabase.storage.from('story-media').remove([path])
    }
    setStories(s => s.filter(x => x.id !== id))
  }

  const atLimit = stories.length >= STORY_MAX_ACTIVE

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 font-bold text-xl">Stories</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {stories.length}/{STORY_MAX_ACTIVE} story{stories.length !== 1 ? 's' : ''} active{stories.length !== 1 ? 's' : ''} — visibles 24h dans l&apos;annuaire
          </p>
        </div>
        <Button onClick={() => { setEditingStory(null); setModal(true) }} variant="primary" disabled={atLimit || !restaurantId}>
          <PlusCircle className="w-4 h-4 mr-2" />
          Publier
        </Button>
      </div>

      {atLimit && (
        <div className="rounded-xl px-4 py-3 text-sm bg-orange-50 border border-orange-200 text-orange-700">
          Vous avez atteint la limite de {STORY_MAX_ACTIVE} stories actives. Supprimez-en une pour en publier une nouvelle.
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <SkeletonRow key={i} />)}</div>
      ) : stories.length === 0 ? (
        <EmptyState
          icon={<Sparkles className="w-8 h-8 text-gray-500" />}
          title="Aucune story active"
          description="Publiez une photo ou une vidéo pour donner envie à vos clients de commander."
          action={<Button onClick={() => setModal(true)} variant="primary"><PlusCircle className="w-4 h-4 mr-2" />Publier une story</Button>}
        />
      ) : (
        <div className="space-y-3">
          {stories.map(story => (
            <StoryCard
              key={story.id}
              story={story}
              onDelete={handleDelete}
              onEdit={s => { setEditingStory(s); setModal(true) }}
            />
          ))}
        </div>
      )}

      {restaurantId && (
        <StoryForm
          open={modal}
          onClose={() => { setModal(false); setEditingStory(null) }}
          restaurantId={restaurantId}
          menuItems={menuItems}
          editingStory={editingStory}
          onSaved={load}
        />
      )}
    </div>
  )
}
