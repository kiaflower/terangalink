'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Upload, X, Check, ZoomIn, ZoomOut, Move, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface ImageCropUploadProps {
  value?: string | null
  onChange: (url: string | null) => void
  folder?: string
  aspect?: 'square' | 'banner'
  label?: string
  previewShape?: 'circle' | 'rect'
}

interface CropState {
  x: number
  y: number
  scale: number
}

export function ImageCropUpload({
  value,
  onChange,
  folder = 'menu',
  aspect = 'square',
  label,
  previewShape = 'rect',
}: ImageCropUploadProps) {
  const supabase = createClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)

  const [rawSrc, setRawSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState<CropState>({ x: 0, y: 0, scale: 1 })
  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, cropX: 0, cropY: 0 })
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [imgLoaded, setImgLoaded] = useState(false)

  // Aspect ratio config
  const CANVAS_W = aspect === 'banner' ? 800 : 400
  const CANVAS_H = aspect === 'banner' ? 300 : 400
  const PREVIEW_H = aspect === 'banner' ? 120 : 160
  const PREVIEW_W = aspect === 'banner' ? 320 : 160

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setError('Image trop lourde — maximum 5MB')
      return
    }

    const url = URL.createObjectURL(file)
    setRawSrc(url)
    setCrop({ x: 0, y: 0, scale: 1 })
    setImgLoaded(false)
    setError(null)
  }

  // Draw preview on canvas whenever crop changes
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img || !imgLoaded) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = CANVAS_W
    canvas.height = CANVAS_H

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)

    const scaledW = img.naturalWidth * crop.scale
    const scaledH = img.naturalHeight * crop.scale

    ctx.drawImage(
      img,
      0, 0, img.naturalWidth, img.naturalHeight,
      crop.x, crop.y, scaledW, scaledH
    )
  }, [crop, imgLoaded, CANVAS_W, CANVAS_H])

  useEffect(() => {
    drawCanvas()
  }, [drawCanvas])

  function handleMouseDown(e: React.MouseEvent) {
    setDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY, cropX: crop.x, cropY: crop.y })
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!dragging) return
    const dx = e.clientX - dragStart.x
    const dy = e.clientY - dragStart.y
    const img = imgRef.current
    if (!img) return
    const scaledW = img.naturalWidth * crop.scale
    const scaledH = img.naturalHeight * crop.scale
    const newX = Math.min(0, Math.max(CANVAS_W - scaledW, dragStart.cropX + dx))
    const newY = Math.min(0, Math.max(CANVAS_H - scaledH, dragStart.cropY + dy))
    setCrop(prev => ({ ...prev, x: newX, y: newY }))
  }

  function handleMouseUp() { setDragging(false) }

  // Touch support
  function handleTouchStart(e: React.TouchEvent) {
    const t = e.touches[0]
    setDragging(true)
    setDragStart({ x: t.clientX, y: t.clientY, cropX: crop.x, cropY: crop.y })
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!dragging) return
    const t = e.touches[0]
    const dx = t.clientX - dragStart.x
    const dy = t.clientY - dragStart.y
    const img = imgRef.current
    if (!img) return
    const scaledW = img.naturalWidth * crop.scale
    const scaledH = img.naturalHeight * crop.scale
    const newX = Math.min(0, Math.max(CANVAS_W - scaledW, dragStart.cropX + dx))
    const newY = Math.min(0, Math.max(CANVAS_H - scaledH, dragStart.cropY + dy))
    setCrop(prev => ({ ...prev, x: newX, y: newY }))
  }

  function changeZoom(delta: number) {
    const img = imgRef.current
    if (!img) return
    const newScale = Math.max(0.5, Math.min(4, crop.scale + delta))
    // Clamp position with new scale
    const scaledW = img.naturalWidth * newScale
    const scaledH = img.naturalHeight * newScale
    const newX = Math.min(0, Math.max(CANVAS_W - scaledW, crop.x))
    const newY = Math.min(0, Math.max(CANVAS_H - scaledH, crop.y))
    setCrop({ scale: newScale, x: newX, y: newY })
  }

  function resetCrop() {
    const img = imgRef.current
    if (!img) return
    // Fit image to canvas
    const scaleX = CANVAS_W / img.naturalWidth
    const scaleY = CANVAS_H / img.naturalHeight
    const scale = Math.max(scaleX, scaleY)
    const scaledW = img.naturalWidth * scale
    const scaledH = img.naturalHeight * scale
    const x = (CANVAS_W - scaledW) / 2
    const y = (CANVAS_H - scaledH) / 2
    setCrop({ scale, x, y })
  }

  async function handleConfirm() {
    const canvas = canvasRef.current
    if (!canvas) return

    setUploading(true)
    setError(null)

    canvas.toBlob(async (blob) => {
      if (!blob) { setError('Erreur de traitement'); setUploading(false); return }

      const ext = 'jpg'
      const path = `${folder}/${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('menu-images')
        .upload(path, blob, { upsert: true, contentType: 'image/jpeg' })

      if (uploadError) {
        setError(`Erreur upload: ${uploadError.message}`)
        setUploading(false)
        return
      }

      const { data: { publicUrl } } = supabase.storage
        .from('menu-images')
        .getPublicUrl(path)

      onChange(publicUrl)
      setRawSrc(null)
      setUploading(false)
    }, 'image/jpeg', 0.88)
  }

  function handleCancel() {
    if (rawSrc) URL.revokeObjectURL(rawSrc)
    setRawSrc(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  // ── Crop editor mode ────────────────────────────────────────────────────────
  if (rawSrc) {
    return (
      <div className="space-y-3">
        {label && <p className="text-gray-400 text-xs font-medium">{label}</p>}

        <div className="bg-surface-100 border border-surface-300 rounded-xl p-4 space-y-3">
          <p className="text-white text-xs font-semibold flex items-center gap-2">
            <Move className="w-3.5 h-3.5 text-brand-orange" />
            Repositionner l&apos;image
          </p>

          {/* Crop canvas */}
          <div
            ref={containerRef}
            className={cn(
              'relative overflow-hidden rounded-xl border border-surface-300 select-none',
              dragging ? 'cursor-grabbing' : 'cursor-grab'
            )}
            style={{ width: '100%', aspectRatio: `${CANVAS_W}/${CANVAS_H}`, maxHeight: PREVIEW_H * 1.5 }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUp}
          >
            {/* Hidden img used for drawing */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={rawSrc}
              alt="crop source"
              ref={imgRef}
              className="hidden"
              onLoad={() => { setImgLoaded(true); setTimeout(resetCrop, 50) }}
            />
            <canvas
              ref={canvasRef}
              className="w-full h-full object-cover"
              style={{ imageRendering: 'auto' }}
            />
            {/* Crop overlay hint */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 ring-2 ring-brand-orange/40 ring-inset rounded-xl" />
            </div>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-3">
            <button onClick={() => changeZoom(-0.1)} className="w-8 h-8 bg-surface-200 hover:bg-surface-300 rounded-lg flex items-center justify-center transition-colors">
              <ZoomOut className="w-3.5 h-3.5 text-white" />
            </button>
            <div className="flex-1 bg-surface-200 rounded-full h-1.5">
              <div className="bg-brand-orange h-1.5 rounded-full transition-all" style={{ width: `${Math.round(((crop.scale - 0.5) / 3.5) * 100)}%` }} />
            </div>
            <button onClick={() => changeZoom(0.1)} className="w-8 h-8 bg-surface-200 hover:bg-surface-300 rounded-lg flex items-center justify-center transition-colors">
              <ZoomIn className="w-3.5 h-3.5 text-white" />
            </button>
            <button onClick={resetCrop} className="text-xs text-gray-500 hover:text-white transition-colors px-2">
              Recadrer
            </button>
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleCancel}
              className="flex-1 flex items-center justify-center gap-1.5 bg-surface-200 hover:bg-surface-300 text-gray-300 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            >
              <X className="w-4 h-4" />Annuler
            </button>
            <button
              onClick={handleConfirm}
              disabled={uploading || !imgLoaded}
              className="flex-1 flex items-center justify-center gap-1.5 bg-brand-orange hover:bg-brand-orange-dark text-white py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {uploading
                ? <><Loader2 className="w-4 h-4 animate-spin" />Upload...</>
                : <><Check className="w-4 h-4" />Valider</>
              }
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Preview / upload mode ───────────────────────────────────────────────────
  return (
    <div className="space-y-2">
      {label && <p className="text-gray-400 text-xs font-medium">{label}</p>}
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        className={cn(
          'relative overflow-hidden border-2 border-dashed transition-all duration-200 cursor-pointer',
          previewShape === 'circle' ? 'rounded-full' : 'rounded-xl',
          value ? 'border-brand-orange/40' : 'border-surface-300 hover:border-brand-orange/40'
        )}
        style={{ width: PREVIEW_W, height: PREVIEW_H, maxWidth: '100%' }}
      >
        {value ? (
          <>
            <Image src={value} alt="Preview" fill className="object-cover" sizes="320px" />
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
              <p className="text-white text-xs font-semibold">Changer</p>
            </div>
            <button
              onClick={e => { e.stopPropagation(); onChange(null) }}
              className="absolute top-2 right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors z-10"
            >
              <X className="w-3 h-3" />
            </button>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-surface-100">
            <Upload className="w-5 h-5 text-gray-600" />
            <p className="text-gray-500 text-xs text-center px-2">
              {aspect === 'banner' ? 'Cliquer pour ajouter une bannière' : 'Cliquer pour ajouter un logo'}
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
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  )
}
