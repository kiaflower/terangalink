'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Pencil, CheckCircle } from 'lucide-react'
import { FicheStatusBadge } from '@/components/ui/FicheStatusBadge'
import { PdfGenerateButton } from '@/components/ui/PdfGenerateButton'

export interface FicheRowData {
  id: string
  numero: number
  title: string
  status: string
  category: { code: string; name: string; color: string } | null
  categoryRank: number
  lastGeneratedAt: string | null
  sentAt: string | null
}

function formatNumero(n: number): string {
  return `#${String(n).padStart(3, '0')}`
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) +
    ' à ' + new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export function FicheRow({ fiche, onChanged }: { fiche: FicheRowData; onChanged: () => void }) {
  const color = fiche.category?.color ?? '#7C3AED'
  const [markingSent, setMarkingSent] = useState(false)

  const subtext = fiche.sentAt
    ? `Envoyée le ${formatDateTime(fiche.sentAt)}`
    : fiche.lastGeneratedAt
      ? `Généré le ${formatDateTime(fiche.lastGeneratedAt)}`
      : 'Jamais généré'

  async function markSent() {
    setMarkingSent(true)
    await fetch(`/api/super-admin/fiches/${fiche.id}/mark-sent`, { method: 'POST' })
    setMarkingSent(false)
    onChanged()
  }

  return (
    <div className="rounded-2xl p-4 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4"
      style={{ backgroundColor: color + '0A' }}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-gray-400">{formatNumero(fiche.numero)}</span>
          <FicheStatusBadge status={fiche.status} />
        </div>
        {fiche.category && (
          <span className="text-[11px] font-semibold block mt-1" style={{ color }}>
            {fiche.category.code}-{String(fiche.categoryRank).padStart(2, '0')} · {fiche.category.name}
          </span>
        )}
        <h3 className="text-sm font-bold text-gray-900 mt-0.5 leading-snug">{fiche.title}</h3>
        <p className="text-[11px] text-gray-400 mt-1">{subtext}</p>
      </div>

      <div className="flex items-center gap-2 shrink-0 flex-wrap">
        <Link href={`/dashboard/super-admin/fiches/${fiche.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-brand-violet border border-gray-200 rounded-lg px-3 py-2 transition-colors whitespace-nowrap">
          <Pencil className="w-3.5 h-3.5" />
          Modifier
        </Link>

        <PdfGenerateButton ficheId={fiche.id} status={fiche.status} lastGeneratedAt={fiche.lastGeneratedAt} onGenerated={onChanged} />

        {fiche.status === 'prete' && (
          <button type="button" onClick={markSent} disabled={markingSent}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 rounded-lg px-3 py-2 transition-colors disabled:opacity-50 whitespace-nowrap">
            <CheckCircle className="w-3.5 h-3.5" />
            {markingSent ? '...' : 'Marquer envoyée'}
          </button>
        )}
      </div>
    </div>
  )
}
