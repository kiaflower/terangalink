'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fileToCompressedBlob } from '@/lib/imageUtils'
import { Upload } from 'lucide-react'
import type { NewsletterBlock } from '@/lib/types/database'

type ImageBlock = Extract<NewsletterBlock, { type: 'image' }>

export function ImageBlockEditor({ block, onChange, disabled }: {
  block: ImageBlock
  onChange: (patch: Partial<ImageBlock>) => void
  disabled?: boolean
}) {
  const supabase = createClient()
  const [uploading, setUploading] = useState(false)

  async function handleFile(file: File) {
    setUploading(true)
    try {
      const compressed = await fileToCompressedBlob(file, 1200)
      const path = `campaigns/${Date.now()}-${compressed.name}`
      const { error } = await supabase.storage.from('newsletter-images').upload(path, compressed, { upsert: false })
      if (!error) {
        const { data } = supabase.storage.from('newsletter-images').getPublicUrl(path)
        onChange({ url: data.publicUrl })
      }
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-2">
      {block.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={block.url} alt={block.alt ?? ''} className="w-full max-h-48 object-cover rounded-lg border border-gray-200" />
      ) : null}
      <label className={`flex items-center justify-center gap-2 text-sm border border-dashed border-gray-300 rounded-lg py-3 cursor-pointer hover:border-brand-violet hover:text-brand-violet transition-colors ${disabled ? 'pointer-events-none opacity-50' : 'text-gray-500'}`}>
        <Upload className="w-4 h-4" />
        {uploading ? 'Envoi…' : block.url ? "Changer l'image" : 'Choisir une image'}
        <input type="file" accept="image/*" disabled={disabled || uploading} className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
      </label>
      <input
        value={block.linkUrl ?? ''}
        disabled={disabled}
        onChange={e => onChange({ linkUrl: e.target.value })}
        placeholder="Lien au clic (optionnel) — https://…"
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-violet/30 disabled:bg-gray-50"
      />
    </div>
  )
}
