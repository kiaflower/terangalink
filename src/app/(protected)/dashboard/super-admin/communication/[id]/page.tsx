'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Eye, MousePointerClick, AlertTriangle, Users } from 'lucide-react'
import type { NewsletterCampaignRow } from '@/lib/types/database'

interface FailedRecipient {
  id: string
  email: string
  status: string
  error_message: string | null
}

interface Stats { total: number; sent: number; opened: number; clicked: number; failed: number }

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  scheduled: 'Programmée',
  sending: "En cours d'envoi",
  sent: 'Envoyée',
}

function pct(n: number, total: number): string {
  if (!total) return '0%'
  return `${Math.round((n / total) * 100)}%`
}

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>()
  const [campaign, setCampaign] = useState<NewsletterCampaignRow | null>(null)
  const [stats, setStats] = useState<Stats>({ total: 0, sent: 0, opened: 0, clicked: 0, failed: 0 })
  const [failedRecipients, setFailedRecipients] = useState<FailedRecipient[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const res = await fetch(`/api/super-admin/communication/campaigns/${params.id}`)
    if (res.ok) {
      const data = await res.json()
      setCampaign(data.campaign)
      setStats(data.stats)
      setFailedRecipients(data.failedRecipients ?? [])
    }
    setLoading(false)
  }, [params.id])

  useEffect(() => {
    load()
    const interval = setInterval(load, 15000)
    return () => clearInterval(interval)
  }, [load])

  if (loading || !campaign) return <p className="text-sm text-gray-400">Chargement…</p>

  const statCards = [
    { label: 'Destinataires', value: stats.total, icon: Users },
    { label: 'Ouvertures', value: `${stats.opened} (${pct(stats.opened, stats.total)})`, icon: Eye },
    { label: 'Clics', value: `${stats.clicked} (${pct(stats.clicked, stats.total)})`, icon: MousePointerClick },
    { label: 'Échecs', value: stats.failed, icon: AlertTriangle },
  ]

  return (
    <div>
      <Link href="/dashboard/super-admin/communication" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-4">
        <ArrowLeft className="w-4 h-4" /> Communication
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
        <p className="text-gray-500 text-sm mt-0.5">{campaign.subject}</p>
        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
          <span>{STATUS_LABELS[campaign.status] ?? campaign.status}</span>
          {campaign.sent_at && <span>· envoyée le {new Date(campaign.sent_at).toLocaleString('fr-FR')}</span>}
          {campaign.scheduled_at && !campaign.sent_at && <span>· programmée le {new Date(campaign.scheduled_at).toLocaleString('fr-FR')}</span>}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(s => (
          <div key={s.label} className="border border-gray-200 rounded-xl p-4 bg-white">
            <s.icon className="w-4 h-4 text-gray-400 mb-2" />
            <p className="text-xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>

      {failedRecipients.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Adresses en échec</h2>
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {failedRecipients.map(r => (
                  <tr key={r.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-2.5 text-gray-900">{r.email}</td>
                    <td className="px-4 py-2.5 text-gray-400 text-xs">{r.error_message ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
