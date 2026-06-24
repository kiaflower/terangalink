'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Loader2, TrendingUp, Clock, CheckCircle, AlertTriangle, XCircle,
  PauseCircle, RefreshCw, CreditCard, Calendar, ChevronDown, ChevronUp,
  FileText, Pencil, Check, X,
} from 'lucide-react'
import { PLAN_LABELS, normalizePlan } from '@/lib/plans'
import { formatDate } from '@/lib/utils'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import Image from 'next/image'

type SubStatus = 'trial' | 'active' | 'overdue' | 'suspended' | 'cancelled'
type PlanType = 'starter' | 'pro' | 'premium'

interface SubRow {
  restaurant_id: string
  restaurant_name: string
  restaurant_phone: string | null
  restaurant_logo: string | null
  plan: string
  status: SubStatus
  trial_start_date: string | null
  trial_end_date: string | null
  subscription_start_date: string | null
  next_payment_due_date: string | null
  last_payment_date: string | null
  amount_paid: number | null
  notes_admin: string | null
  created_at: string
}

const STATUS_CONFIG: Record<SubStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  trial:     { label: 'Essai',     color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20',      icon: <Clock className="w-3 h-3" /> },
  active:    { label: 'Actif',     color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20',    icon: <CheckCircle className="w-3 h-3" /> },
  overdue:   { label: 'En retard', color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20',        icon: <AlertTriangle className="w-3 h-3" /> },
  suspended: { label: 'Suspendu',  color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20',  icon: <PauseCircle className="w-3 h-3" /> },
  cancelled: { label: 'Annulé',    color: 'text-gray-400',   bg: 'bg-gray-500/10 border-gray-500/20',      icon: <XCircle className="w-3 h-3" /> },
}

const PLAN_COLORS: Record<PlanType, string> = {
  starter: 'bg-surface-200 text-gray-400 border-surface-300',
  pro:     'bg-purple-500/10 text-purple-400 border-purple-500/20',
  premium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
}

function getDaysInfo(row: SubRow): { label: string; color: string } | null {
  const now = new Date()
  if (row.status === 'trial' && row.trial_end_date) {
    const diff = Math.ceil((new Date(row.trial_end_date).getTime() - now.getTime()) / 86400000)
    if (diff < 0) return { label: `En retard de ${Math.abs(diff)}j`, color: 'text-red-400' }
    if (diff === 0) return { label: "Échéance aujourd'hui", color: 'text-orange-400' }
    if (diff <= 3) return { label: `J-${diff}`, color: 'text-orange-400' }
  }
  if ((row.status === 'active' || row.status === 'overdue') && row.next_payment_due_date) {
    const diff = Math.ceil((new Date(row.next_payment_due_date).getTime() - now.getTime()) / 86400000)
    if (diff < 0) return { label: `En retard de ${Math.abs(diff)}j`, color: 'text-red-400' }
    if (diff === 0) return { label: "Échéance aujourd'hui", color: 'text-orange-400' }
    if (diff <= 7) return { label: `J-${diff}`, color: 'text-yellow-400' }
  }
  return null
}

function sortRows(rows: SubRow[]): SubRow[] {
  const priority: Record<string, number> = { overdue: 0, active: 1, trial: 2, suspended: 3, cancelled: 4 }
  return [...rows].sort((a, b) => {
    const pa = priority[a.status] ?? 5
    const pb = priority[b.status] ?? 5
    if (pa !== pb) return pa - pb
    const aDate = a.next_payment_due_date || a.trial_end_date
    const bDate = b.next_payment_due_date || b.trial_end_date
    if (aDate && bDate) return new Date(aDate).getTime() - new Date(bDate).getTime()
    return 0
  })
}

export default function SubscriptionsPage() {
  const supabase = createClient()
  const [rows, setRows] = useState<SubRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | SubStatus>('all')
  const [planFilter, setPlanFilter] = useState<'all' | PlanType>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Inline notes editing
  const [editingNotes, setEditingNotes] = useState<string | null>(null)
  const [notesValue, setNotesValue] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)

  // Inline plan editing
  const [editingPlan, setEditingPlan] = useState<string | null>(null)
  const [planValue, setPlanValue] = useState<PlanType>('starter')
  const [savingPlan, setSavingPlan] = useState(false)

  // Modal paiement
  const [payModal, setPayModal] = useState(false)
  const [payRow, setPayRow] = useState<SubRow | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0])
  const [payNotes, setPayNotes] = useState('')
  const [payNextDue, setPayNextDue] = useState('')
  const [paying, setPaying] = useState(false)

  // Modal échéance
  const [dueModal, setDueModal] = useState(false)
  const [dueRow, setDueRow] = useState<SubRow | null>(null)
  const [dueDate, setDueDate] = useState('')
  const [dueNotes, setDueNotes] = useState('')
  const [savingDue, setSavingDue] = useState(false)

  // Modal dates manuelles
  const [datesModal, setDatesModal] = useState(false)
  const [datesRow, setDatesRow] = useState<SubRow | null>(null)
  const [datesForm, setDatesForm] = useState({
    trial_start_date: '',
    trial_end_date: '',
    subscription_start_date: '',
    last_payment_date: '',
    next_payment_due_date: '',
    amount_paid: '',
  })
  const [savingDates, setSavingDates] = useState(false)

  const loadData = useCallback(async () => {
    const { data: subs } = await supabase
      .from('subscriptions')
      .select('*, restaurants(name, phone, logo_url)')
      .order('created_at', { ascending: false })

    const mapped: SubRow[] = (subs ?? []).map((s: Record<string, unknown>) => {
      const resto = s.restaurants as { name: string; phone: string | null; logo_url?: string | null } | null
      return {
        restaurant_id: s.restaurant_id as string,
        restaurant_name: resto?.name ?? 'Inconnu',
        restaurant_phone: resto?.phone ?? null,
        restaurant_logo: resto?.logo_url ?? null,
        plan: s.plan as string,
        status: (s.status as SubStatus) ?? 'trial',
        trial_start_date: s.trial_start_date as string | null,
        trial_end_date: s.trial_end_date as string | null,
        subscription_start_date: s.subscription_start_date as string | null,
        next_payment_due_date: s.next_payment_due_date as string | null,
        last_payment_date: s.last_payment_date as string | null,
        amount_paid: s.amount_paid as number | null,
        notes_admin: s.notes_admin as string | null,
        created_at: s.created_at as string,
      }
    })

    setRows(sortRows(mapped))
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    loadData()
    fetch('/api/admin/subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'check_trial_expiry', restaurant_id: 'all' }),
    }).then(() => loadData())
  }, [loadData])

  async function handleAction(action: string, restaurantId: string, extra?: Record<string, unknown>) {
    await fetch('/api/admin/subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, restaurant_id: restaurantId, ...extra }),
    })
    await loadData()
  }

  // Save notes inline
  async function saveNotes(restaurantId: string) {
    setSavingNotes(true)
    await supabase
      .from('subscriptions')
      .update({ notes_admin: notesValue || null })
      .eq('restaurant_id', restaurantId)
    setSavingNotes(false)
    setEditingNotes(null)
    setRows(prev => prev.map(r => r.restaurant_id === restaurantId ? { ...r, notes_admin: notesValue || null } : r))
  }

  // Save plan inline
  async function savePlan(restaurantId: string) {
    setSavingPlan(true)
    await supabase
      .from('subscriptions')
      .update({ plan: planValue })
      .eq('restaurant_id', restaurantId)
    setSavingPlan(false)
    setEditingPlan(null)
    setRows(prev => prev.map(r => r.restaurant_id === restaurantId ? { ...r, plan: planValue } : r))
  }

  function openPayModal(row: SubRow) {
    setPayRow(row)
    setPayAmount('')
    setPayDate(new Date().toISOString().split('T')[0])
    setPayNotes('')
    const next = new Date()
    next.setDate(next.getDate() + 30)
    setPayNextDue(next.toISOString().split('T')[0])
    setPayModal(true)
  }

  async function confirmPay() {
    if (!payRow) return
    setPaying(true)
    await handleAction('mark_paid', payRow.restaurant_id, {
      amount_paid: Number(payAmount) || 0,
      payment_date: payDate,
      next_payment_due_date: payNextDue,
      notes_admin: payNotes || null,
    })
    setPaying(false)
    setPayModal(false)
  }

  function openDueModal(row: SubRow) {
    setDueRow(row)
    setDueDate(row.next_payment_due_date?.split('T')[0] || row.trial_end_date?.split('T')[0] || '')
    setDueNotes('')
    setDueModal(true)
  }

  async function confirmDue() {
    if (!dueRow || !dueDate) return
    setSavingDue(true)
    await handleAction('update_due_date', dueRow.restaurant_id, {
      next_payment_due_date: dueDate,
      notes_admin: dueNotes || null,
    })
    setSavingDue(false)
    setDueModal(false)
  }

  function openDatesModal(row: SubRow) {
    setDatesRow(row)
    setDatesForm({
      trial_start_date: row.trial_start_date?.split('T')[0] || '',
      trial_end_date: row.trial_end_date?.split('T')[0] || '',
      subscription_start_date: row.subscription_start_date?.split('T')[0] || '',
      last_payment_date: row.last_payment_date?.split('T')[0] || '',
      next_payment_due_date: row.next_payment_due_date?.split('T')[0] || '',
      amount_paid: row.amount_paid != null ? String(row.amount_paid) : '',
    })
    setDatesModal(true)
  }

  async function confirmDates() {
    if (!datesRow) return
    setSavingDates(true)
    await handleAction('update_dates', datesRow.restaurant_id, {
      trial_start_date: datesForm.trial_start_date || null,
      trial_end_date: datesForm.trial_end_date || null,
      subscription_start_date: datesForm.subscription_start_date || null,
      last_payment_date: datesForm.last_payment_date || null,
      next_payment_due_date: datesForm.next_payment_due_date || null,
      amount_paid: datesForm.amount_paid !== '' ? datesForm.amount_paid : null,
    })
    setSavingDates(false)
    setDatesModal(false)
  }

  const stats = {
    trial:     rows.filter(r => r.status === 'trial').length,
    active:    rows.filter(r => r.status === 'active').length,
    overdue:   rows.filter(r => r.status === 'overdue').length,
    suspended: rows.filter(r => r.status === 'suspended').length,
    upcoming7: rows.filter(r => {
      const date = r.next_payment_due_date || r.trial_end_date
      if (!date) return false
      const diff = Math.ceil((new Date(date).getTime() - Date.now()) / 86400000)
      return diff >= 0 && diff <= 7
    }).length,
    revenueEstimated: rows.filter(r => r.status === 'active').reduce((sum, r) => {
      const p = normalizePlan(r.plan)
      return sum + (p === 'premium' ? 25000 : p === 'pro' ? 15000 : 9000)
    }, 0),
    revenueReal: rows.reduce((sum, r) => sum + (r.amount_paid ?? 0), 0),
  }

  const filtered = rows.filter(r => {
    if (filter !== 'all' && r.status !== filter) return false
    if (planFilter !== 'all' && normalizePlan(r.plan) !== planFilter) return false
    return true
  })

  if (loading) return (
    <div className="flex items-center justify-center min-h-64">
      <Loader2 className="w-8 h-8 animate-spin text-brand-orange" />
    </div>
  )

  return (
    <div className="p-6 sm:p-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Abonnements</h1>
          <p className="text-gray-500 text-sm mt-1">{rows.length} restaurant(s) — suivi des paiements et échéances</p>
        </div>
        <button
          onClick={() => loadData()}
          className="inline-flex items-center gap-2 bg-surface-100 hover:bg-surface-200 border border-surface-300 text-gray-300 hover:text-white px-3 py-2 rounded-xl text-sm font-medium transition-colors"
        >
          <RefreshCw className="w-4 h-4" />Actualiser
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        {[
          { label: 'En essai',      value: stats.trial,     color: 'text-blue-400',   icon: <Clock className="w-4 h-4" /> },
          { label: 'Actifs',        value: stats.active,    color: 'text-green-400',  icon: <CheckCircle className="w-4 h-4" /> },
          { label: 'En retard',     value: stats.overdue,   color: 'text-red-400',    icon: <AlertTriangle className="w-4 h-4" /> },
          { label: 'Suspendus',     value: stats.suspended, color: 'text-orange-400', icon: <PauseCircle className="w-4 h-4" /> },
          { label: 'Échéance 7j',   value: stats.upcoming7, color: 'text-yellow-400', icon: <Calendar className="w-4 h-4" /> },
          { label: 'Revenus est.',  value: `${stats.revenueEstimated.toLocaleString('fr-SN')} F`, color: 'text-purple-400', icon: <TrendingUp className="w-4 h-4" /> },
          { label: 'Revenus réels', value: `${stats.revenueReal.toLocaleString('fr-SN')} F`,      color: 'text-green-400',  icon: <CreditCard className="w-4 h-4" /> },
        ].map((s, i) => (
          <div key={i} className="bg-surface-50 border border-surface-200 rounded-2xl p-4">
            <div className={`flex items-center gap-1.5 mb-2 ${s.color}`}>{s.icon}<span className="text-xs font-medium">{s.label}</span></div>
            <div className={`text-xl font-black ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filtres statut */}
      <div className="flex flex-wrap gap-2 mb-3">
        {(['all', 'trial', 'active', 'overdue', 'suspended', 'cancelled'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
              filter === f
                ? 'bg-brand-orange text-white border-brand-orange'
                : 'bg-surface-100 text-gray-400 border-surface-200 hover:text-white'
            }`}
          >
            {f === 'all' ? 'Tous' : STATUS_CONFIG[f as SubStatus]?.label ?? f}
          </button>
        ))}
      </div>

      {/* Filtres plan */}
      <div className="flex flex-wrap gap-2 mb-5">
        {([['all', 'Tous les plans'], ['starter', 'Starter'], ['pro', 'Pro'], ['premium', 'Premium']] as const).map(([p, label]) => (
          <button
            key={p}
            onClick={() => setPlanFilter(p as 'all' | PlanType)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
              planFilter === p
                ? 'bg-brand-orange text-white border-brand-orange'
                : 'bg-surface-100 text-gray-400 border-surface-200 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Liste */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-500 text-sm">Aucun abonnement pour ce filtre.</div>
        )}
        {filtered.map(row => {
          const cfg = STATUS_CONFIG[row.status]
          const daysInfo = getDaysInfo(row)
          const plan = normalizePlan(row.plan) as PlanType
          const isExpanded = expandedId === row.restaurant_id

          return (
            <div key={row.restaurant_id} className="bg-surface-50 border border-surface-200 rounded-2xl overflow-hidden">
              {/* Row principale */}
              <div
                className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-surface-100 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : row.restaurant_id)}
              >
                {/* Logo */}
                <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 bg-surface-200 flex items-center justify-center">
                  {row.restaurant_logo ? (
                    <Image src={row.restaurant_logo} alt={row.restaurant_name} width={36} height={36} className="object-cover w-full h-full" unoptimized />
                  ) : (
                    <span className="text-gray-600 text-xs font-bold">{row.restaurant_name.slice(0, 2).toUpperCase()}</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-white font-semibold text-sm">{row.restaurant_name}</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.color}`}>
                      {cfg.icon}{cfg.label}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${PLAN_COLORS[plan]}`}>
                      {PLAN_LABELS[plan]}
                    </span>
                    {daysInfo && <span className={`text-xs font-bold ${daysInfo.color}`}>{daysInfo.label}</span>}
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                    {row.restaurant_phone && <span>📞 {row.restaurant_phone}</span>}
                    {row.status === 'trial' && row.trial_end_date && <span>Fin essai : {formatDate(row.trial_end_date)}</span>}
                    {row.next_payment_due_date && <span>Échéance : {formatDate(row.next_payment_due_date)}</span>}
                    {row.last_payment_date && <span>Dernier paiement : {formatDate(row.last_payment_date)}</span>}
                    {(row.amount_paid ?? 0) > 0 && <span className="text-green-400">{(row.amount_paid ?? 0).toLocaleString('fr-SN')} FCFA payés</span>}
                  </div>
                </div>

                {isExpanded
                  ? <ChevronUp className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />}
              </div>

              {/* Détail */}
              {isExpanded && (
                <div className="border-t border-surface-200 px-5 py-4 space-y-4">

                  {/* Modifier le plan */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-28 flex-shrink-0">Plan</span>
                    {editingPlan === row.restaurant_id ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={planValue}
                          onChange={e => setPlanValue(e.target.value as PlanType)}
                          className="bg-surface-100 border border-surface-300 rounded-lg px-2 py-1 text-sm text-white focus:outline-none"
                        >
                          <option value="starter">Starter — 9 000 FCFA</option>
                          <option value="pro">Pro — 15 000 FCFA</option>
                          <option value="premium">Premium — 25 000 FCFA</option>
                        </select>
                        <button onClick={() => savePlan(row.restaurant_id)} disabled={savingPlan} className="p-1.5 text-green-400 hover:text-green-300">
                          {savingPlan ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => setEditingPlan(null)} className="p-1.5 text-gray-500 hover:text-gray-300">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${PLAN_COLORS[plan]}`}>{PLAN_LABELS[plan]}</span>
                        <button onClick={() => { setEditingPlan(row.restaurant_id); setPlanValue(plan) }} className="text-gray-500 hover:text-white">
                          <Pencil className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Infos */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { label: 'Début essai',       value: row.trial_start_date ? formatDate(row.trial_start_date) : '—' },
                      { label: 'Fin essai',          value: row.trial_end_date ? formatDate(row.trial_end_date) : '—' },
                      { label: 'Début abonnement',   value: row.subscription_start_date ? formatDate(row.subscription_start_date) : '—' },
                      { label: 'Prochaine échéance', value: row.next_payment_due_date ? formatDate(row.next_payment_due_date) : '—' },
                      { label: 'Dernier paiement',   value: row.last_payment_date ? formatDate(row.last_payment_date) : '—' },
                      { label: 'Montant payé',       value: (row.amount_paid ?? 0) > 0 ? `${(row.amount_paid ?? 0).toLocaleString('fr-SN')} FCFA` : '—' },
                    ].map((info, i) => (
                      <div key={i} className="bg-surface-100 rounded-xl p-3">
                        <div className="text-xs text-gray-500 mb-1">{info.label}</div>
                        <div className="text-sm font-semibold text-white">{info.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Notes éditables inline */}
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <FileText className="w-3.5 h-3.5 text-gray-500" />
                      <span className="text-xs text-gray-500 font-medium">Notes internes</span>
                    </div>
                    {editingNotes === row.restaurant_id ? (
                      <div className="flex gap-2">
                        <textarea
                          value={notesValue}
                          onChange={e => setNotesValue(e.target.value)}
                          rows={2}
                          placeholder="Notes visibles uniquement par les super-admins..."
                          className="flex-1 bg-surface-100 border border-surface-300 rounded-xl px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-orange/40 resize-none"
                        />
                        <div className="flex flex-col gap-1">
                          <button onClick={() => saveNotes(row.restaurant_id)} disabled={savingNotes} className="p-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20">
                            {savingNotes ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          </button>
                          <button onClick={() => setEditingNotes(null)} className="p-2 rounded-lg bg-surface-200 text-gray-400 hover:text-white">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => { setEditingNotes(row.restaurant_id); setNotesValue(row.notes_admin || '') }}
                        className="min-h-[40px] bg-surface-100 hover:bg-surface-200 border border-surface-200 hover:border-surface-300 rounded-xl px-3 py-2.5 text-sm cursor-pointer transition-colors"
                      >
                        {row.notes_admin
                          ? <span className="text-gray-300">{row.notes_admin}</span>
                          : <span className="text-gray-600 flex items-center gap-1"><Pencil className="w-3 h-3" />Cliquer pour ajouter une note...</span>}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => openDatesModal(row)}
                      className="inline-flex items-center gap-1.5 bg-surface-200 hover:bg-surface-300 text-gray-300 hover:text-white border border-surface-300 px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />Modifier les dates
                    </button>

                    <button
                      onClick={() => openPayModal(row)}
                      className="inline-flex items-center gap-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
                    >
                      <CreditCard className="w-3.5 h-3.5" />Marquer comme payé
                    </button>

                    <button
                      onClick={() => openDueModal(row)}
                      className="inline-flex items-center gap-1.5 bg-surface-200 hover:bg-surface-300 text-gray-300 hover:text-white border border-surface-300 px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
                    >
                      <Calendar className="w-3.5 h-3.5" />Modifier échéance
                    </button>

                    {row.status !== 'suspended' && row.status !== 'cancelled' && (
                      <button
                        onClick={() => { if (confirm(`Suspendre ${row.restaurant_name} ?`)) handleAction('suspend', row.restaurant_id) }}
                        className="inline-flex items-center gap-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
                      >
                        <PauseCircle className="w-3.5 h-3.5" />Suspendre
                      </button>
                    )}

                    {(row.status === 'suspended' || row.status === 'overdue') && (
                      <button
                        onClick={() => handleAction('reactivate', row.restaurant_id)}
                        className="inline-flex items-center gap-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />Réactiver
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal paiement */}
      <Modal open={payModal} onClose={() => setPayModal(false)} title="Marquer comme payé">
        <div className="space-y-4">
          <p className="text-gray-400 text-sm">{payRow?.restaurant_name} — {PLAN_LABELS[normalizePlan(payRow?.plan ?? 'starter') as PlanType]}</p>
          <Input label="Montant payé (FCFA)" value={payAmount} onChange={e => setPayAmount(e.target.value)} type="number" placeholder="15000" />
          <Input label="Date du paiement" value={payDate} onChange={e => setPayDate(e.target.value)} type="date" />
          <Input label="Prochaine échéance" value={payNextDue} onChange={e => setPayNextDue(e.target.value)} type="date" />
          <Input label="Notes (optionnel)" value={payNotes} onChange={e => setPayNotes(e.target.value)} placeholder="Ex: Paiement Wave reçu" />
          <button
            onClick={confirmPay}
            disabled={paying}
            className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl text-sm transition-colors disabled:opacity-60"
          >
            {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
            {paying ? 'Enregistrement...' : 'Confirmer le paiement'}
          </button>
        </div>
      </Modal>

      {/* Modal échéance */}
      <Modal open={dueModal} onClose={() => setDueModal(false)} title="Modifier l'échéance">
        <div className="space-y-4">
          <p className="text-gray-400 text-sm">{dueRow?.restaurant_name}</p>
          <Input label="Nouvelle date d'échéance" value={dueDate} onChange={e => setDueDate(e.target.value)} type="date" />
          <Input label="Notes (optionnel)" value={dueNotes} onChange={e => setDueNotes(e.target.value)} placeholder="Raison du changement..." />
          <button
            onClick={confirmDue}
            disabled={savingDue || !dueDate}
            className="w-full flex items-center justify-center gap-2 bg-brand-orange hover:bg-brand-orange/90 text-white font-semibold py-3 rounded-xl text-sm transition-colors disabled:opacity-60"
          >
            {savingDue ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
            {savingDue ? 'Enregistrement...' : 'Confirmer'}
          </button>
        </div>
      </Modal>
      {/* Modal dates manuelles */}
      <Modal open={datesModal} onClose={() => setDatesModal(false)} title="Modifier les dates & montant">
        <div className="space-y-3">
          <p className="text-gray-400 text-sm mb-2">{datesRow?.restaurant_name}</p>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Début essai"
              type="date"
              value={datesForm.trial_start_date}
              onChange={e => setDatesForm(f => ({ ...f, trial_start_date: e.target.value }))}
            />
            <Input
              label="Fin essai"
              type="date"
              value={datesForm.trial_end_date}
              onChange={e => setDatesForm(f => ({ ...f, trial_end_date: e.target.value }))}
            />
            <Input
              label="Début abonnement"
              type="date"
              value={datesForm.subscription_start_date}
              onChange={e => setDatesForm(f => ({ ...f, subscription_start_date: e.target.value }))}
            />
            <Input
              label="Dernier paiement"
              type="date"
              value={datesForm.last_payment_date}
              onChange={e => setDatesForm(f => ({ ...f, last_payment_date: e.target.value }))}
            />
            <Input
              label="Prochaine échéance"
              type="date"
              value={datesForm.next_payment_due_date}
              onChange={e => setDatesForm(f => ({ ...f, next_payment_due_date: e.target.value }))}
            />
            <Input
              label="Montant payé (FCFA)"
              type="number"
              value={datesForm.amount_paid}
              onChange={e => setDatesForm(f => ({ ...f, amount_paid: e.target.value }))}
              placeholder="0"
            />
          </div>

          <button
            onClick={confirmDates}
            disabled={savingDates}
            className="w-full flex items-center justify-center gap-2 bg-brand-orange hover:bg-brand-orange/90 text-white font-semibold py-3 rounded-xl text-sm transition-colors disabled:opacity-60 mt-2"
          >
            {savingDates ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {savingDates ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </Modal>

    </div>
  )
}
