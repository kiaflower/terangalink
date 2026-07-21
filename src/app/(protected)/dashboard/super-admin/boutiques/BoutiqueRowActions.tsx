'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Power, PowerOff, UserCog, Pencil, Trash2, Loader2, RotateCcw, Send } from 'lucide-react'

export function BoutiqueRowActions({
  boutiqueId,
  boutiqueName,
  isActive,
  onToggled,
  lastReportSentAt,
  onReportSent,
}: {
  boutiqueId: string
  boutiqueName: string
  isActive: boolean
  onToggled?: (id: string, newIsActive: boolean) => void
  lastReportSentAt?: string | null
  onReportSent?: (id: string, sentAt: string) => void
}) {
  const [loading, setLoading] = useState<string | null>(null)

  const sentThisWeek = lastReportSentAt
    ? Date.now() - new Date(lastReportSentAt).getTime() < 7 * 24 * 60 * 60 * 1000
    : false

  async function sendWeeklyReport() {
    if (sentThisWeek && !confirm(`Un rapport a déjà été envoyé à "${boutiqueName}" le ${new Date(lastReportSentAt!).toLocaleDateString('fr-SN')}. Préparer un nouveau message quand même ?`)) return
    setLoading('report')
    // Ouvrir l'onglet tout de suite (synchrone, dans le geste utilisateur) pour
    // éviter que le navigateur bloque le popup après l'await du fetch ci-dessous.
    const waWindow = window.open('', '_blank')
    try {
      const res = await fetch(`/api/super-admin/boutiques/${boutiqueId}/send-weekly-report`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        const waUrl = `https://wa.me/${(data.whatsappNumber as string).replace(/\D/g, '')}?text=${encodeURIComponent(data.message)}`
        if (waWindow) waWindow.location.href = waUrl
        else window.open(waUrl, '_blank')
        onReportSent?.(boutiqueId, data.sentAt ?? new Date().toISOString())
      } else {
        waWindow?.close()
        alert(data.error || 'Erreur lors de la préparation du rapport')
      }
    } catch {
      waWindow?.close()
      alert('Erreur réseau lors de la préparation du rapport')
    } finally {
      setLoading(null)
    }
  }

  async function toggleActive() {
    setLoading('toggle')
    try {
      const res = await fetch('/api/super-admin/toggle-boutique', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boutique_id: boutiqueId }),
      })
      if (res.ok) {
        const data = await res.json()
        onToggled?.(boutiqueId, data.is_active ?? !isActive)
      } else {
        alert('Erreur lors de la mise à jour')
      }
    } finally {
      setLoading(null)
    }
  }

  async function impersonate() {
    setLoading('impersonate')
    try {
      const res = await fetch('/api/super-admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boutique_id: boutiqueId }),
      })
      if (res.ok) {
        window.location.href = '/dashboard/boutique'
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data.error || 'Erreur lors de l\'impersonation')
        setLoading(null)
      }
    } catch {
      setLoading(null)
    }
  }

  async function resetStats() {
    if (!confirm(`Réinitialiser toutes les statistiques de "${boutiqueName}" ? Ceci supprime définitivement toutes ses commandes et ses vues (revenus, nombre de commandes et vues repartent à 0). Cette action est irréversible.`)) return
    setLoading('reset-stats')
    try {
      const res = await fetch('/api/super-admin/reset-boutique-stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boutique_id: boutiqueId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data.error || 'Erreur lors de la réinitialisation')
      }
    } catch {
      alert('Erreur réseau lors de la réinitialisation')
    } finally {
      setLoading(null)
    }
  }

  async function remove() {
    if (!confirm('Supprimer définitivement cette boutique et toutes ses données ? Cette action est irréversible.')) return
    setLoading('delete')
    try {
      const res = await fetch('/api/super-admin/delete-boutique', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boutique_id: boutiqueId }),
      })
      if (res.ok) {
        onToggled?.(boutiqueId, false)
        window.location.reload()
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data.error || 'Erreur lors de la suppression')
        setLoading(null)
      }
    } catch {
      alert('Erreur réseau lors de la suppression')
      setLoading(null)
    }
  }

  const iconBtnClass = 'w-8 h-8 shrink-0 flex items-center justify-center rounded-lg border transition-colors disabled:opacity-50'

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        onClick={toggleActive}
        disabled={loading !== null}
        aria-label={isActive ? 'Désactiver' : 'Activer'}
        title={isActive ? 'Désactiver' : 'Activer'}
        className={`${iconBtnClass} text-gray-500 border-gray-200 hover:border-brand-orange/30 hover:text-brand-orange`}
      >
        {loading === 'toggle' ? <Loader2 className="w-4 h-4 animate-spin" /> : isActive ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
      </button>
      <button
        onClick={impersonate}
        disabled={loading !== null}
        aria-label="Impersoner"
        title="Impersoner"
        className={`${iconBtnClass} text-gray-500 border-gray-200 hover:border-brand-orange/30 hover:text-brand-orange`}
      >
        {loading === 'impersonate' ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCog className="w-4 h-4" />}
      </button>
      <Link
        href={`/dashboard/super-admin/boutiques/${boutiqueId}/edit`}
        aria-label="Modifier"
        title="Modifier"
        className={`${iconBtnClass} text-gray-500 border-gray-200 hover:border-brand-orange/30 hover:text-brand-orange`}
      >
        <Pencil className="w-4 h-4" />
      </Link>
      <button
        onClick={sendWeeklyReport}
        disabled={loading !== null}
        aria-label="Rapport hebdomadaire sur WhatsApp"
        title={sentThisWeek ? `Rapport déjà envoyé le ${new Date(lastReportSentAt!).toLocaleDateString('fr-SN')} — cliquer pour repréparer le message` : 'Préparer le rapport hebdomadaire sur WhatsApp'}
        className={`${iconBtnClass} ${sentThisWeek ? 'text-green-600 border-green-200 hover:bg-green-50' : 'text-gray-500 border-gray-200 hover:border-brand-orange/30 hover:text-brand-orange'}`}
      >
        {loading === 'report' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
      </button>
      <button
        onClick={resetStats}
        disabled={loading !== null}
        aria-label="Réinitialiser les stats"
        title="Réinitialiser les stats (commandes + vues)"
        className={`${iconBtnClass} text-amber-500 border-amber-200 hover:bg-amber-50`}
      >
        {loading === 'reset-stats' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
      </button>
      <button
        onClick={remove}
        disabled={loading !== null}
        aria-label="Supprimer"
        title="Supprimer"
        className={`${iconBtnClass} text-red-500 border-red-200 hover:bg-red-50`}
      >
        {loading === 'delete' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
      </button>
    </div>
  )
}
