'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Mail, Eye, MousePointerClick, AlertTriangle, Clock, Trash2, X, Loader2 } from 'lucide-react'
import { CAMPAIGN_TEMPLATES, type CampaignTemplate } from '@/lib/newsletter/templates'
import type { NewsletterCampaignRow } from '@/lib/types/database'

interface CampaignWithStats extends NewsletterCampaignRow {
  stats: { total: number; sent: number; opened: number; clicked: number; failed: number }
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  draft: { label: 'Brouillon', className: 'bg-gray-100 text-gray-600' },
  scheduled: { label: 'Programmée', className: 'bg-amber-50 text-amber-600' },
  sending: { label: "En cours d'envoi", className: 'bg-blue-50 text-blue-600' },
  sent: { label: 'Envoyée', className: 'bg-green-50 text-green-600' },
}

function pct(n: number, total: number): string {
  if (!total) return '0%'
  return `${Math.round((n / total) * 100)}%`
}

export default function CommunicationPage() {
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<CampaignWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showTemplateModal, setShowTemplateModal] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch('/api/super-admin/communication/campaigns')
    if (res.ok) {
      const data = await res.json()
      setCampaigns(data.campaigns ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function deleteCampaign(id: string, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('Supprimer définitivement ce brouillon ?')) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/super-admin/communication/campaigns/${id}`, { method: 'DELETE' })
      if (res.ok) setCampaigns(prev => prev.filter(c => c.id !== id))
    } finally {
      setDeletingId(null)
    }
  }

  async function createCampaign(template: CampaignTemplate) {
    setCreating(true)
    try {
      const res = await fetch('/api/super-admin/communication/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: template.id === 'blank' ? 'Nouvelle campagne' : template.label,
          subject: template.subject,
          blocks: template.blocks(),
        }),
      })
      if (res.ok) {
        const data = await res.json()
        router.push(`/dashboard/super-admin/communication/${data.id}/edit`)
      }
    } finally {
      setCreating(false)
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Communication</h1>
          <p className="text-gray-500 text-sm mt-0.5">Newsletters envoyées aux restaurants ayant accepté d&apos;en recevoir.</p>
        </div>
        <button
          onClick={() => setShowTemplateModal(true)}
          disabled={creating}
          className="inline-flex items-center gap-2 bg-brand-orange text-white text-sm font-medium rounded-xl px-4 py-2.5 hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Nouvelle campagne
        </button>
      </div>

      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowTemplateModal(false)}>
          <div className="bg-white rounded-2xl p-5 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">Choisir un point de départ</h2>
              <button onClick={() => setShowTemplateModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              {CAMPAIGN_TEMPLATES.map(t => (
                <button
                  key={t.id}
                  onClick={() => createCampaign(t)}
                  disabled={creating}
                  className="text-left border border-gray-200 rounded-xl p-3 hover:border-brand-orange hover:bg-brand-orange/5 transition-colors disabled:opacity-50"
                >
                  <span className="block text-sm font-medium text-gray-900">{t.label}</span>
                  <span className="block text-xs text-gray-400 mt-0.5">{t.description}</span>
                </button>
              ))}
            </div>
            {creating && (
              <p className="flex items-center gap-1.5 text-xs text-gray-400 mt-3">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Création…
              </p>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Chargement…</p>
      ) : campaigns.length === 0 ? (
        <div className="text-center border border-dashed border-gray-200 rounded-2xl py-16">
          <Mail className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Aucune campagne pour l&apos;instant.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map(c => {
            const status = STATUS_LABELS[c.status] ?? STATUS_LABELS.draft
            const href = c.status === 'draft'
              ? `/dashboard/super-admin/communication/${c.id}/edit`
              : `/dashboard/super-admin/communication/${c.id}`
            return (
              <div
                key={c.id}
                onClick={() => router.push(href)}
                className="block border border-gray-200 rounded-xl p-4 hover:border-brand-orange/40 transition-colors bg-white cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{c.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{c.subject || 'Sans objet'}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${status.className}`}>{status.label}</span>
                    {c.status === 'draft' && (
                      <button
                        onClick={e => deleteCampaign(c.id, e)}
                        disabled={deletingId === c.id}
                        title="Supprimer"
                        className="text-gray-300 hover:text-red-500 disabled:opacity-50 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                {c.stats.total > 0 && (
                  <div className="flex flex-wrap gap-4 text-xs text-gray-500 mt-3">
                    <span>{c.stats.total} destinataire{c.stats.total !== 1 ? 's' : ''}</span>
                    <span className="inline-flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {pct(c.stats.opened, c.stats.total)} ouverture</span>
                    <span className="inline-flex items-center gap-1"><MousePointerClick className="w-3.5 h-3.5" /> {pct(c.stats.clicked, c.stats.total)} clic</span>
                    {c.stats.failed > 0 && (
                      <span className="inline-flex items-center gap-1 text-red-500"><AlertTriangle className="w-3.5 h-3.5" /> {c.stats.failed} échec{c.stats.failed !== 1 ? 's' : ''}</span>
                    )}
                  </div>
                )}
                {c.status === 'scheduled' && c.scheduled_at && (
                  <div className="flex items-center gap-1 text-xs text-amber-600 mt-2">
                    <Clock className="w-3.5 h-3.5" />
                    Programmée pour le {new Date(c.scheduled_at).toLocaleString('fr-FR')}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
