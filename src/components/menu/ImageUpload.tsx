'use client'

import { useState, useRef } from 'react'
import { Upload, X, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface ImageUploadProps {
  value?: string | null
  onChange: (url: string | null) => void
  folder?: string
}

export function ImageUpload({ value, onChange, folder = 'menu' }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setError('Image trop lourde — maximum 5MB')
      return
    }

    setUploading(true)
    setError(null)

    const ext = file.name.split('.').pop()
    const path = `${folder}/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('menu-images')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      setError('Erreur upload — vérifie le bucket Supabase Storage')
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('menu-images')
      .getPublicUrl(path)

    onChange(publicUrl)
    setUploading(false)
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        className={cn(
          'relative w-full h-36 rounded-xl border-2 border-dashed transition-all duration-200 overflow-hidden cursor-pointer',
          value
            ? 'border-brand-orange/40'
            : 'border-surface-300 hover:border-brand-orange/40',
          uploading && 'opacity-70 cursor-not-allowed'
        )}
      >
        {value ? (
          <>
            <Image src={value} alt="Preview" fill className="object-cover" sizes="300px" unoptimized />
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
              <p className="text-white text-sm font-semibold">Changer</p>
            </div>
            <button
              onClick={e => { e.stopPropagation(); onChange(null) }}
              className="absolute top-2 right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            {uploading ? (
              <Loader2 className="w-6 h-6 text-brand-orange animate-spin" />
            ) : (
              <Upload className="w-6 h-6 text-gray-600" />
            )}
            <p className="text-gray-500 text-xs">
              {uploading ? 'Upload en cours...' : 'Cliquer pour ajouter une photo'}
            </p>
            <p className="text-gray-600 text-xs">JPG, PNG — max 5MB</p>
          </div>
        )}
      </div>
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />
    </div>
  )
}
