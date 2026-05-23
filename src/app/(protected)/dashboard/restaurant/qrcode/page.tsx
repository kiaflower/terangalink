'use client'

import { useSettings } from '@/lib/hooks/useSettings'
import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import { Download, QrCode, Loader2, ExternalLink } from 'lucide-react'

export default function QRCodePage() {
  const { user } = useAuth()
  const supabase = createClient()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [slug, setSlug] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [qrReady, setQrReady] = useState(false)

  const loadSlug = useCallback(async () => {
    if (!user?.restaurant_id) return
    const { data } = await supabase
      .from('restaurants')
      .select('slug')
      .eq('id', user.restaurant_id)
      .single()
    if (data) setSlug(data.slug)
    setLoading(false)
  }, [user, supabase])

  useEffect(() => { loadSlug() }, [loadSlug])

  // Générer le QR code avec la lib qrcode
  useEffect(() => {
    if (!slug || !canvasRef.current) return

    const settings = useSettings()
  const url = `${settings.platform_url}/${slug}`

    // Import dynamique de la lib qrcode
    import('qrcode').then((QRCode) => {
      QRCode.toCanvas(canvasRef.current!, url, {
        width: 280,
        margin: 3,
        color: {
          dark: '#0F0F0F',
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'H',
      }, (err) => {
        if (!err) setQrReady(true)
      })
    }).catch(() => {
      // Fallback: essayer avec une URL de génération d'image QR
      setQrReady(true)
    })
  }, [slug])

  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Créer un canvas plus grand avec le logo TerangaLink
    const exportCanvas = document.createElement('canvas')
    const size = 400
    exportCanvas.width = size
    exportCanvas.height = size + 80
    const ctx = exportCanvas.getContext('2d')
    if (!ctx) return

    // Fond blanc
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height)

    // QR code centré
    const qrSize = 280
    const x = (size - qrSize) / 2
    ctx.drawImage(canvas, x, 20, qrSize, qrSize)

    // Texte TerangaLink
    ctx.fillStyle = '#F97316'
    ctx.font = 'bold 22px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('TerangaLink', size / 2, qrSize + 50)

    // URL
    ctx.fillStyle = '#666666'
    ctx.font = '13px system-ui, sans-serif'
    ctx.fillText(`${new URL(settings.platform_url).hostname}/${slug}`, size / 2, qrSize + 72)

    // Télécharger
    const link = document.createElement('a')
    link.download = `qrcode-${slug}.png`
    link.href = exportCanvas.toDataURL('image/png')
    link.click()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-orange" />
      </div>
    )
  }

  if (!slug) {
    return (
      <div className="p-6 text-center text-gray-500">
        Aucun restaurant trouvé.
      </div>
    )
  }

  const publicUrl = `${settings.platform_url}/${slug}`

  return (
    <div className="p-6 sm:p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">QR Code</h1>
        <p className="text-gray-500 text-sm mt-1">
          Partagez votre menu en un scan
        </p>
      </div>

      {/* Carte QR code */}
      <div className="bg-surface-50 border border-surface-200 rounded-2xl p-8 flex flex-col items-center">
        {/* Badge TerangaLink */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-7 h-7 bg-brand-orange rounded-lg flex items-center justify-center">
            <QrCode className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold text-lg">TerangaLink</span>
        </div>

        {/* Cadre QR */}
        <div className="relative p-4 bg-white rounded-2xl shadow-2xl mb-6">
          {/* Coins décoratifs */}
          <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-brand-orange rounded-tl-lg" />
          <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-brand-orange rounded-tr-lg" />
          <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-brand-orange rounded-bl-lg" />
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-brand-orange rounded-br-lg" />

          <canvas
            ref={canvasRef}
            className={`block transition-opacity duration-300 ${qrReady ? 'opacity-100' : 'opacity-0'}`}
          />
          {!qrReady && (
            <div className="w-[280px] h-[280px] flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          )}
        </div>

        {/* URL */}
        <div className="flex items-center gap-2 mb-2">
          <code className="text-brand-orange text-sm font-mono bg-brand-orange/10 px-3 py-1.5 rounded-lg">
            {new URL(settings.platform_url).hostname}/{slug}
          </code>
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-gray-500 hover:text-white hover:bg-surface-100 rounded-lg transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        <p className="text-gray-600 text-xs text-center mb-8 max-w-xs">
          Imprimez ce QR code et placez-le sur vos tables, votre vitrine ou vos emballages.
        </p>

        {/* Bouton télécharger */}
        <button
          onClick={handleDownload}
          disabled={!qrReady}
          className="flex items-center gap-2.5 bg-brand-orange hover:bg-brand-orange-dark text-white px-6 py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 w-full sm:w-auto justify-center"
        >
          <Download className="w-4 h-4" />
          Télécharger en PNG
        </button>
      </div>

      {/* Tips d'utilisation */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { title: 'Tables', desc: 'Imprimez et plastifiez pour chaque table' },
          { title: 'Vitrine', desc: 'Affichez à l\'entrée de votre établissement' },
          { title: 'Emballages', desc: 'Collez sur vos sacs et boîtes de livraison' },
        ].map(tip => (
          <div
            key={tip.title}
            className="bg-surface-50 border border-surface-200 rounded-xl p-4"
          >
            <p className="text-white text-sm font-semibold mb-1">{tip.title}</p>
            <p className="text-gray-600 text-xs">{tip.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
