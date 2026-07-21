'use client'

import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { downloadFichePdf } from '@/lib/pdf/downloadFichePdf'
import { pdfRegenerateUnlockAt, formatRegenerateRemaining } from '@/lib/pdf/regenerateLock'

interface PdfGenerateButtonProps {
  ficheId: string
  status: string
  lastGeneratedAt: string | null
  onGenerated?: (lastGeneratedAt: string) => void
  className?: string
}

/**
 * Handles both the "brouillon" disabled state and the 3h regeneration lock
 * that follows every successful generation — recomputed from wall-clock time
 * every tick, so it self-unlocks without a page reload.
 */
export function PdfGenerateButton({ ficheId, status, lastGeneratedAt, onGenerated, className }: PdfGenerateButtonProps) {
  const [localLastGeneratedAt, setLocalLastGeneratedAt] = useState(lastGeneratedAt)
  const [now, setNow] = useState(() => Date.now())
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { setLocalLastGeneratedAt(lastGeneratedAt) }, [lastGeneratedAt])

  const unlockAt = pdfRegenerateUnlockAt(localLastGeneratedAt)
  const locked = unlockAt > now

  useEffect(() => {
    if (!locked) return
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [locked])

  async function handleClick() {
    if (status === 'brouillon' || locked || downloading) return
    setDownloading(true)
    setError('')
    const result = await downloadFichePdf(ficheId)
    setDownloading(false)
    if (!result.ok) { setError(result.error); return }
    setLocalLastGeneratedAt(result.lastGeneratedAt)
    setNow(Date.now())
    onGenerated?.(result.lastGeneratedAt)
  }

  if (status === 'brouillon') {
    return (
      <span title="Passez la fiche en statut « Prête » pour générer le PDF"
        className={`inline-flex items-center gap-1.5 text-xs font-semibold text-gray-300 bg-gray-50 rounded-lg px-3 py-2 cursor-not-allowed whitespace-nowrap ${className ?? ''}`}>
        <Download className="w-3.5 h-3.5" />
        PDF
      </span>
    )
  }

  if (locked) {
    return (
      <span title="Le PDF a été généré il y a moins de 3h — attends la fin du délai avant d'envoyer une nouvelle version"
        className={`inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 bg-gray-50 rounded-lg px-3 py-2 cursor-not-allowed whitespace-nowrap ${className ?? ''}`}>
        <Download className="w-3.5 h-3.5" />
        Régénérable dans {formatRegenerateRemaining(unlockAt - now)}
      </span>
    )
  }

  return (
    <div className={className}>
      <button type="button" onClick={handleClick} disabled={downloading}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-brand-orange hover:bg-brand-orange-dark rounded-lg px-3 py-2 transition-colors disabled:opacity-50 whitespace-nowrap w-full justify-center">
        <Download className="w-3.5 h-3.5" />
        {downloading ? 'Génération...' : 'PDF'}
      </button>
      {error && <p className="text-[10px] text-red-500 mt-1">{error}</p>}
    </div>
  )
}
