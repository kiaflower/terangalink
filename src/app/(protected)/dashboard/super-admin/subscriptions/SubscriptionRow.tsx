'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Save, Receipt } from 'lucide-react'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { getActiveDiscount, getPendingDiscount } from '@/lib/subscriptionDiscount'

interface SubscriptionRowProps {
  id: string
  boutiqueName: string
  plan: string
  status: string
  startedAt: string
  endsAt: string | null
  discountPercent: number | null
  discountExpiresAt: string | null
  pendingDiscountPercent: number | null
  onChanged: () => void | Promise<void>
}

const PLAN_OPTIONS = [
  { value: 'free', label: 'Free' },
  { value: 'starter', label: 'Starter' },
  { value: 'pro', label: 'Pro' },
]

const STATUS_OPTIONS = [
  { value: 'trial', label: 'Essai' },
  { value: 'active', label: 'Actif' },
  { value: 'overdue', label: 'En retard' },
  { value: 'suspended', label: 'Suspendu' },
  { value: 'cancelled', label: 'Annulé' },
]

export function SubscriptionRow({
  id, boutiqueName, plan, status, startedAt, endsAt,
  discountPercent, discountExpiresAt, pendingDiscountPercent, onChanged,
}: SubscriptionRowProps) {
  const [form, setForm] = useState({ plan, status, ends_at: endsAt ? endsAt.slice(0, 10) : '' })
  const [saving, setSaving] = useState(false)

  const activeDiscount = getActiveDiscount({ discount_percent: discountPercent, discount_expires_at: discountExpiresAt })
  const pendingDiscount = getPendingDiscount({ pending_discount_percent: pendingDiscountPercent })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/super-admin/update-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, plan: form.plan, status: form.status, ends_at: form.ends_at || undefined }),
    })
    setSaving(false)
    if (res.ok) await onChanged()
    else alert('Erreur lors de la mise à jour')
  }

  return (
    <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
      <div>
        <p className="text-sm font-medium text-gray-900">{boutiqueName}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          Plan {plan} · Depuis {new Date(startedAt).toLocaleDateString('fr-SN')}
          {endsAt && ` · Expire ${new Date(endsAt).toLocaleDateString('fr-SN')}`}
        </p>
        {/* Legacy — anciennes réductions de parrainage accordées avant le passage aux crédits (0022) */}
        {activeDiscount && (
          <p className="text-xs font-semibold mt-1" style={{ color: '#059669' }}>
            🎁 -{activeDiscount.percent}% parrainage (ancien système) jusqu&apos;au {new Date(activeDiscount.expiresAt).toLocaleDateString('fr-SN')}
          </p>
        )}
        {!activeDiscount && pendingDiscount && (
          <p className="text-xs font-semibold mt-1" style={{ color: '#D97706' }}>
            🎁 -{pendingDiscount.percent}% parrainage (ancien système) prévu au prochain paiement
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge status={status} />
        <Link
          href="/dashboard/super-admin/invoices"
          title="Encaisser un paiement pour cette boutique"
          className="flex items-center gap-1.5 text-xs bg-white border border-gray-200 hover:border-brand-violet text-gray-700 px-2 sm:px-3 py-1.5 rounded-lg transition-colors"
        >
          <Receipt className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Factures</span>
        </Link>
        <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
          <select
            value={form.plan}
            onChange={e => setForm(f => ({ ...f, plan: e.target.value }))}
            className="text-xs bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none focus:border-brand-violet"
          >
            {PLAN_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select
            value={form.status}
            onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
            className="text-xs bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none focus:border-brand-violet"
          >
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <input
            type="date"
            value={form.ends_at}
            onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))}
            className="text-xs bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none focus:border-brand-violet"
          />
          <button
            type="submit"
            disabled={saving}
            title="Mettre à jour l'abonnement"
            className="flex items-center gap-1.5 text-xs bg-brand-violet hover:bg-brand-violet-dark text-white px-2 sm:px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{saving ? '...' : 'Mettre à jour'}</span>
          </button>
        </form>
      </div>
    </div>
  )
}
