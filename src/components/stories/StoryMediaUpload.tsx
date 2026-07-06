'use client'

import { useRef, useState } from 'react'
import { Upload, X, Loader2, Image as ImageIcon, Video } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface StoryMediaValue {
  media_type: 'image' | 'video'
  media_url: string
}

interface StoryMediaUploadProps {
  value: StoryMediaValue | null
  onChange: (value: StoryMediaValue | null) => void
}

const MAX_IMAGE_MB = 5
const MAX_VIDEO_MB = 25
const MAX_VIDEO_SECONDS = 20
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']

function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src)
      resolve(video.duration)
    }
    video.onerror = () => {
      URL.revokeObjectURL(video.src)
      reject(new Error('Impossible de lire la vidéo'))
    }
    video.src = URL.createObjectURL(file)
  })
}

export function StoryMediaUpload({ value, onChange }: StoryMediaUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)

    const isImage = ACCEPTED_IMAGE_TYPES.includes(file.type)
    const isVideo = ACCEPTED_VIDEO_TYPES.includes(file.type)

    if (!isImage && !isVideo) {
      setError('Format non supporté — JPG, PNG, WEBP, MP4, WEBM ou MOV uniquement')
      if (inputRef.current) inputRef.current.value = ''
      return
    }

    if (isImage && file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setError(`Image trop lourde — maximum ${MAX_IMAGE_MB}MB`)
      if (inputRef.current) inputRef.current.value = ''
      return
    }

    if (isVideo) {
      if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
        setError(`Vidéo trop lourde — maximum ${MAX_VIDEO_MB}MB`)
        if (inputRef.current) inputRef.current.value = ''
        return
      }
      try {
        const duration = await readVideoDuration(file)
        if (duration > MAX_VIDEO_SECONDS) {
          setError(`Vidéo trop longue — maximum ${MAX_VIDEO_SECONDS} secondes`)
          if (inputRef.current) inputRef.current.value = ''
          return
        }
      } catch {
        setError('Vidéo illisible — essayez un autre fichier')
        if (inputRef.current) inputRef.current.value = ''
        return
      }
    }

    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `stories/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('story-media')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      setError('Erreur upload — réessayez')
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('story-media').getPublicUrl(path)
    onChange({ media_type: isVideo ? 'video' : 'image', media_url: publicUrl })
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  function remove() {
    onChange(null)
    setError(null)
  }

  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-gray-400 uppercase">Photo ou vidéo</label>

      {value ? (
        <div className="relative rounded-xl overflow-hidden border border-surface-300 aspect-[9/16] max-h-72 mx-auto bg-black">
          {value.media_type === 'video' ? (
            <video src={value.media_url} className="w-full h-full object-cover" muted playsInline controls />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value.media_url} alt="Aperçu story" className="w-full h-full object-cover" />
          )}
          <button
            type="button"
            onClick={remove}
            className="absolute top-2 right-2 w-8 h-8 bg-red-500/90 hover:bg-red-500 rounded-full flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full h-40 rounded-xl border-2 border-dashed border-surface-300 hover:border-brand-orange/50 flex flex-col items-center justify-center gap-2 text-gray-600 hover:text-gray-400 transition-colors disabled:opacity-60"
        >
          {uploading ? (
            <Loader2 className="w-6 h-6 text-brand-orange animate-spin" />
          ) : (
            <>
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                <Video className="w-5 h-5" />
              </div>
              <span className="text-xs flex items-center gap-1"><Upload className="w-3.5 h-3.5" /> Ajouter une photo ou une vidéo</span>
              <span className="text-[10px] text-gray-600">
                Photo max {MAX_IMAGE_MB}MB · Vidéo max {MAX_VIDEO_MB}MB / {MAX_VIDEO_SECONDS}s
              </span>
            </>
          )}
        </button>
      )}

      {error && <p className="text-red-400 text-xs">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
        onChange={handleFile}
        className="hidden"
      />
    </div>
  )
}
