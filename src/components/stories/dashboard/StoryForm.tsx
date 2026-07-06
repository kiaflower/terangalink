'use client'

import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { StoryMediaUpload } from '@/components/stories/StoryMediaUpload'
import { createClient } from '@/lib/supabase/client'
import { STORY_DURATION_OPTIONS, computeExpiresAt } from '@/lib/stories-utils'
import type { MenuItem, StoryWithRelations } from '@/lib/types'

interface StoryFormProps {
  open: boolean
  onClose: () => void
  restaurantId: string
  menuItems: MenuItem[]
  editingStory?: StoryWithRelations | null
  onSaved: () => void
}

export function StoryForm({ open, onClose, restaurantId, menuItems, editingStory, onSaved }: StoryFormProps) {
  const supabase = createClient()
  const isEditing = !!editingStory
  const [media, setMedia] = useState<{ media_type: 'image' | 'video'; media_url: string } | null>(null)
  const [caption, setCaption] = useState('')
  const [menuItemId, setMenuItemId] = useState('')
  const [durationHours, setDurationHours] = useState('24')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Pré-remplit le formulaire quand on ouvre en mode édition.
  useEffect(() => {
    if (!open) return
    if (editingStory) {
      setMedia({ media_type: editingStory.media_type, media_url: editingStory.media_url })
      setCaption(editingStory.caption ?? '')
      setMenuItemId(editingStory.menu_item_id ?? '')
      setDurationHours('24')
    } else {
      setMedia(null)
      setCaption('')
      setMenuItemId('')
      setDurationHours('24')
    }
    setError(null)
  }, [open, editingStory])

  function handleClose() {
    setError(null)
    onClose()
  }

  async function handleSubmit() {
    if (!media) { setError('Ajoutez une photo ou une vidéo'); return }
    setSaving(true)
    setError(null)

    if (isEditing && editingStory) {
      const { error: updateError } = await supabase.from('stories').update({
        media_type: media.media_type,
        media_url: media.media_url,
        caption: caption.trim() || null,
        menu_item_id: menuItemId || null,
      }).eq('id', editingStory.id)

      setSaving(false)
      if (updateError) { setError('Erreur lors de la mise à jour — réessayez'); return }
      onSaved()
      onClose()
      return
    }

    const { error: insertError } = await supabase.from('stories').insert({
      restaurant_id: restaurantId,
      media_type: media.media_type,
      media_url: media.media_url,
      caption: caption.trim() || null,
      menu_item_id: menuItemId || null,
      expires_at: computeExpiresAt(parseInt(durationHours, 10)),
    })

    setSaving(false)

    if (insertError) {
      if (insertError.message.includes('STORY_LIMIT_REACHED')) {
        setError('Limite de 3 stories actives atteinte — supprimez-en une avant d\'en publier une nouvelle.')
      } else if (insertError.message.includes('STORY_INVALID_MENU_ITEM')) {
        setError('Produit invalide — réessayez')
      } else {
        setError('Erreur lors de la publication — réessayez')
      }
      return
    }

    onSaved()
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={isEditing ? 'Modifier la story' : 'Publier une story'}
      description={isEditing ? 'Le compte à rebours actuel est conservé' : "Visible dans l'annuaire pendant la durée choisie"}
    >
      <div className="space-y-4">
        <StoryMediaUpload value={media} onChange={setMedia} />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-500">Texte (facultatif)</label>
          <textarea
            value={caption}
            onChange={e => setCaption(e.target.value.slice(0, 150))}
            placeholder="Ex : Nouveau thiéboudienne disponible aujourd'hui !"
            rows={2}
            className="w-full bg-gray-100 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/50 focus:border-brand-orange/50 transition-all duration-200 resize-none"
          />
          <span className="text-[10px] text-gray-500 text-right">{caption.length}/150</span>
        </div>

        <Select
          label="Produit concerné (facultatif)"
          value={menuItemId}
          onChange={e => setMenuItemId(e.target.value)}
          placeholder="Aucun produit — bouton « Voir le menu »"
          options={menuItems.map(item => ({ value: item.id, label: item.name }))}
        />

        {!isEditing && (
          <Select
            label="Durée d'affichage"
            value={durationHours}
            onChange={e => setDurationHours(e.target.value)}
            options={STORY_DURATION_OPTIONS}
          />
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Button variant="secondary" onClick={handleClose} fullWidth>Annuler</Button>
          <Button onClick={handleSubmit} loading={saving} disabled={!media} fullWidth>
            {isEditing ? 'Enregistrer' : 'Publier'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
