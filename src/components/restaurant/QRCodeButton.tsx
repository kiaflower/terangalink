'use client'

import { useState, useEffect, useRef } from 'react'
import { QrCode, X, Download } from 'lucide-react'
import type { ThemeTokens } from '@/lib/theme'

interface QRCodeButtonProps {
  url: string
  restaurantName: string
  tokens: ThemeTokens
}

export function QRCodeButton({ url, restaurantName, tokens }: QRCodeButtonProps) {
  const [open, setOpen] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!open) return

    // Use Google Charts QR API — no npm dependency needed
    const encoded = encodeURIComponent(url)
    const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encoded}&format=png&bgcolor=ffffff&color=000000&margin=20`
    setQrDataUrl(apiUrl)
  }, [open, url])

  async function handleDownload() {
    if (!qrDataUrl) return
    try {
      const res = await fetch(qrDataUrl)
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `qrcode-${restaurantName.toLowerCase().replace(/\s+/g, '-')}.png`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch {
      window.open(qrDataUrl, '_blank')
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
        style={{
          backgroundColor: `${tokens.accent}12`,
          color: tokens.accentText,
          border: `1px solid ${tokens.accent}25`,
        }}
      >
        <QrCode className="w-3.5 h-3.5" />
        QR Code
      </button>

      {/* Modal overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div
            className="relative w-full max-w-xs rounded-2xl p-6 text-center animate-fade-in"
            style={{ backgroundColor: tokens.bgCard, border: `1px solid ${tokens.borderStrong}` }}
          >
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl transition-colors"
              style={{ color: tokens.textMuted }}
            >
              <X className="w-4 h-4" />
            </button>

            <QrCode className="w-6 h-6 mx-auto mb-3" style={{ color: tokens.accent }} />
            <h3 className="font-bold text-base mb-1" style={{ color: tokens.textPrimary }}>
              Commandez ici
            </h3>
            <p className="text-xs mb-4" style={{ color: tokens.textMuted }}>
              Scannez pour accéder au menu de {restaurantName}
            </p>

            {/* QR code image */}
            <div
              className="w-48 h-48 mx-auto rounded-xl overflow-hidden mb-4 flex items-center justify-center"
              style={{ backgroundColor: '#ffffff' }}
            >
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrDataUrl}
                  alt="QR Code"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: tokens.accent }} />
              )}
            </div>

            <p className="text-xs mb-4 break-all px-2" style={{ color: tokens.textMuted }}>
              {url}
            </p>

            <button
              onClick={handleDownload}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold transition-colors"
              style={{ backgroundColor: tokens.accent, color: tokens.textOnAccent }}
            >
              <Download className="w-4 h-4" />
              Télécharger le QR Code
            </button>

            <canvas ref={canvasRef} className="hidden" />
          </div>
        </div>
      )}
    </>
  )
}
