'use client'

import { useEffect, useState, useCallback } from 'react'
import { RefreshCw, CheckCircle, Clock, AlertTriangle, Zap } from 'lucide-react'
import { BillingRow, BillingRowData } from './BillingRow'

type Filter = 'all' | 'covered' | 'due' | 'overdue'

export default function InvoicesPage() {
  const [rows, setRows] = useState<BillingRowData[]>([])
  const [loading, setLoading] = useState(true)
  // null jusqu'au premier fetch côté client : évite un mismatch d'hydratation
  // (new Date() rendu côté serveur diffère forcément de celui du client).
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [generating, setGenerating] = useState(false)
  const [generateMessage, setGenerateMessage] = useState<string | null>(null)

  const fetchRows = useCallback(async () => {
    const res = await fetch('/api/super-admin/boutiques-billing')
    const data = await res.json().catch(() => ({}))
    setRows((data.rows ?? []) as BillingRowData[])
    setLastRefresh(new Date())
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchRows()
    const interval = setInterval(fetchRows, 60000)
    return () => clearInterval(interval)
  }, [fetchRows])

  // Une boutique est "à jour" dès que sa période en cours ne demande plus
  // d'action — qu'elle vienne d'être payée (la période a alors déjà avancé)
  // ou qu'elle soit simplement encore couverte par un paiement précédent.
  const coveredRows = rows.filter(r => !r.actionable)
  const overdueRows = rows.filter(r => r.invoice?.status === 'overdue')
  const dueRows = rows.filter(r => r.actionable && r.invoice?.status !== 'overdue')
  const dueRevenue = dueRows.reduce((sum, r) => sum + r.finalAmount, 0)

  const statCards: { label: string; value: string | number; icon: typeof CheckCircle; color: string; bg: string; filter: Filter }[] = [
    { label: 'À jour', value: coveredRows.length, icon: CheckCircle, color: '#059669', bg: '#F0FDF4', filter: 'covered' },
    { label: 'À encaisser', value: dueRows.length, icon: Clock, color: '#D97706', bg: '#FFFBEB', filter: 'due' },
    { label: 'En retard', value: overdueRows.length, icon: AlertTriangle, color: '#DC2626', bg: '#FEF2F2', filter: 'overdue' },
    { label: 'Montant à encaisser', value: `${new Intl.NumberFormat('fr-SN').format(dueRevenue)} FCFA`, icon: RefreshCw, color: '#7C3AED', bg: '#F5F3FF', filter: 'all' },
  ]

  const filtered = rows.filter(r => {
    if (filter === 'all') return true
    if (filter === 'covered') return !r.actionable
    if (filter === 'overdue') return r.invoice?.status === 'overdue'
    if (filter === 'due') return r.actionable && r.invoice?.status !== 'overdue'
    return true
  })

  async function generateNow() {
    setGenerating(true)
    setGenerateMessage(null)
    const res = await fetch('/api/super-admin/invoices/generate-now', { method: 'POST' })
    const data = await res.json().catch(() => ({}))
    setGenerating(false)
    if (!res.ok) { setGenerateMessage(data.error || 'Erreur lors de la génération'); return }
    setGenerateMessage(
      data.generated > 0
        ? `${data.generated} facture${data.generated > 1 ? 's' : ''} générée${data.generated > 1 ? 's' : ''}.`
        : 'Aucune facture à générer pour l\'instant — aucune échéance dans les 3 prochains jours.'
    )
    await fetchRows()
  }

  return (
    <div>
      <div className="mb-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Factures</h1>
          <p className="text-gray-500 text-sm mt-0.5">{rows.length} boutique{rows.length !== 1 ? 's' : ''} facturable{rows.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={generateNow} disabled={generating}
            title="Générer les factures dues maintenant, sans attendre le cron"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-brand-violet hover:bg-brand-violet-dark rounded-lg px-3 py-2 transition-colors disabled:opacity-50">
            <Zap className={`w-3.5 h-3.5 ${generating ? 'animate-pulse' : ''}`} />
            <span className="hidden sm:inline">{generating ? 'Génération...' : 'Générer maintenant'}</span>
          </button>
          <button onClick={fetchRows}
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-brand-violet border border-gray-200 rounded-lg px-3 py-2 transition-colors shrink-0">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{lastRefresh ? lastRefresh.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}</span>
          </button>
        </div>
      </div>
      {generateMessage && (
        <p className="text-xs text-gray-500 mb-4">{generateMessage}</p>
      )}
      {!generateMessage && <div className="mb-6" />}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map(s => (
          <button key={s.label} onClick={() => setFilter(f => f === s.filter ? 'all' : s.filter)}
            className="rounded-2xl p-5 border text-left transition-all hover:shadow-sm"
            style={{
              backgroundColor: s.bg,
              borderColor: filter === s.filter ? s.color : '#F3F4F6',
              boxShadow: filter === s.filter ? `0 0 0 2px ${s.color}33` : undefined,
            }}>
            <div className="flex items-center justify-between mb-2">
              <s.icon className="w-4 h-4" style={{ color: s.color }} />
              {filter === s.filter && s.filter !== 'all' && <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: s.color }}>Filtré</span>}
            </div>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="space-y-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4 flex items-center gap-4 border-b border-gray-100 animate-pulse">
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-100 rounded w-40" />
                  <div className="h-2.5 bg-gray-50 rounded w-52" />
                </div>
                <div className="flex gap-2">
                  <div className="h-7 w-16 bg-gray-100 rounded-lg" />
                  <div className="h-7 w-24 bg-gray-100 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-400 py-20 text-sm">Aucune boutique{filter !== 'all' ? ' dans ce filtre' : ''}</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map(row => (
              <BillingRow key={row.boutiqueId} {...row} onChanged={fetchRows} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
