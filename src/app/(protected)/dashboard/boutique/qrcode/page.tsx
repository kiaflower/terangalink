'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { PlanKey } from '@/lib/plans'
import { FeatureGate } from '@/components/FeatureGate'

export default function QrCodePage() {
  const supabase = createClient()
  const [slug, setSlug] = useState<string | null>(null)
  const [siteUrl, setSiteUrl] = useState('')
  const [plan, setPlan] = useState<PlanKey | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [qrGenerated, setQrGenerated] = useState(false)

  useEffect(() => {
    setSiteUrl(window.location.origin)
    fetch('/api/auth/me').then(r => r.json()).then(async d => {
      if (!d.boutique_id) return
      const { data } = await supabase.from('boutiques').select('slug').eq('id', d.boutique_id).single()
      if (data) setSlug(data.slug)
      const { data: sub } = await supabase.from('subscriptions').select('plan').eq('boutique_id', d.boutique_id).single()
      setPlan((sub?.plan as PlanKey) ?? 'starter')
    })
  }, [supabase])

  useEffect(() => {
    if (!slug || !canvasRef.current || !siteUrl) return
    const url = `${siteUrl}/${slug}`
    import('qrcode').then(QRCode => {
      QRCode.toCanvas(canvasRef.current!, url, {
        width: 300,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      }, (err) => {
        if (!err) setQrGenerated(true)
      })
    })
  }, [slug, siteUrl])

  function download() {
    if (!canvasRef.current) return
    const link = document.createElement('a')
    link.download = `qrcode-${slug}.png`
    link.href = canvasRef.current.toDataURL()
    link.click()
  }

  if (plan === null) return <p className="text-gray-400 text-sm py-8">Chargement...</p>

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">QR Code</h1>
      <p className="text-gray-400 mb-8">Partagez ce QR code pour que vos clients accèdent directement à votre boutique.</p>

      <FeatureGate plan={plan} feature="qrCode" requiredPlanLabel="Starter"
        description="Passez en Starter (ou Pro) pour générer et télécharger le QR code de votre boutique.">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
          <div className="bg-white rounded-2xl p-4 inline-block mb-6">
            <canvas ref={canvasRef} />
            {!qrGenerated && <div className="w-[300px] h-[300px] flex items-center justify-center text-gray-400">Génération...</div>}
          </div>
          {slug && siteUrl && (
            <p className="text-sm text-gray-500 mb-6 font-mono break-all">
              {siteUrl}/{slug}
            </p>
          )}
          <button
            onClick={download}
            disabled={!qrGenerated}
            className="w-full bg-brand-orange text-white py-3 rounded-xl font-semibold hover:bg-brand-orange-dark transition-colors disabled:opacity-50"
          >
            Télécharger PNG
          </button>
        </div>
      </FeatureGate>
    </div>
  )
}
