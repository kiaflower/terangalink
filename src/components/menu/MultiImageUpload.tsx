'use client'

import { useRef, useState } from 'react'
import { Upload, X, Loader2, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

interface MultiImageUploadProps {
  values: string[]
  onChange: (urls: string[]) => void
  folder?: string
  max?: number
}

const MAX_SIZE_MB = 5

export function MultiImageUpload({ values, onChange, folder = 'menu', max = 5 }: MultiImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return

    const remaining = max - values.length
    const toUpload = files.slice(0, remaining)

    const oversized = toUpload.find(f => f.size > MAX_SIZE_MB * 1024 * 1024)
    if (oversized) {
      setError(`Image trop lourde — maximum ${MAX_SIZE_MB}MB`)
      return
    }

    setUploading(true)
    setError(null)

    const uploaded: string[] = []
    for (const file of toUpload) {
      const ext = file.name.split('.').pop()
      const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('menu-images')
        .upload(path, file, { upsert: true })

      if (uploadError) {
        setError('Erreur upload — vérifie le bucket Supabase Storage')
        break
      }

      const { data: { publicUrl } } = supabase.storage
        .from('menu-images')
        .getPublicUrl(path)

      uploaded.push(publicUrl)
    }

    onChange([...values, ...uploaded])
    setUploading(false)
    // Reset input so same file can be re-selected
    if (inputRef.current) inputRef.current.value = ''
  }

  function remove(idx: number) {
    onChange(values.filter((_, i) => i !== idx))
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= values.length) return
    const next = [...values]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    onChange(next)
  }

  const canAdd = values.length < max && !uploading

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-gray-400 uppercase">
          Photos du produit
          <span className="ml-1.5 text-gray-600 font-normal normal-case">({values.length}/{max})</span>
        </label>
        {values.length > 0 && (
          <span className="text-gray-600 text-xs">Glisser pour réordonner · 1ère = photo principale</span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {values.map((url, idx) => (
          <div key={url + idx} className="relative group aspect-square rounded-xl overflow-hidden border border-surface-300">
            <Image src={url} alt={`Photo ${idx + 1}`} fill className="object-cover" sizes="150px" />

            {/* Badge principale */}
            {idx === 0 && (
              <div className="absolute top-1 left-1 bg-brand-orange text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                Principale
              </div>
            )}

            {/* Overlay actions */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
              {idx > 0 && (
                <button
                  type="button"
                  onClick={() => move(idx, idx - 1)}
                  className="w-7 h-7 bg-white/20 hover:bg-white/40 rounded-lg text-white text-xs font-bold transition-colors"
                  title="Déplacer à gauche"
                >
                  ←
                </button>
              )}
              <button
                type="button"
                onClick={() => remove(idx)}
                className="w-7 h-7 bg-red-500/80 hover:bg-red-500 rounded-lg flex items-center justify-center text-white transition-colors"
                title="Supprimer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              {idx < values.length - 1 && (
                <button
                  type="button"
                  onClick={() => move(idx, idx + 1)}
                  className="w-7 h-7 bg-white/20 hover:bg-white/40 rounded-lg text-white text-xs font-bold transition-colors"
                  title="Déplacer à droite"
                >
                  →
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Bouton ajouter */}
        {canAdd && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="aspect-square rounded-xl border-2 border-dashed border-surface-300 hover:border-brand-orange/50 flex flex-col items-center justify-center gap-1.5 text-gray-600 hover:text-gray-400 transition-colors"
          >
            {uploading ? (
              <Loader2 className="w-5 h-5 text-brand-orange animate-spin" />
            ) : (
              <>
                <Plus className="w-5 h-5" />
                <span className="text-[10px]">Ajouter</span>
              </>
            )}
          </button>
        )}

        {/* Zone vide initiale */}
        {values.length === 0 && !uploading && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="col-span-3 h-28 rounded-xl border-2 border-dashed border-surface-300 hover:border-brand-orange/50 flex flex-col items-center justify-center gap-2 text-gray-600 hover:text-gray-400 transition-colors"
          >
            <Upload className="w-5 h-5" />
            <span className="text-xs">Cliquer pour ajouter des photos</span>
            <span className="text-[10px] text-gray-600">JPG, PNG — max {MAX_SIZE_MB}MB — jusqu&apos;à {max} photos</span>
          </button>
        )}
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFiles}
        className="hidden"
      />
    </div>
  )
}
