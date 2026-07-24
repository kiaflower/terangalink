'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Share2, Download, X, Check, Lock, CreditCard, Gift, FileDown, Clock, Users, Trash2, Plus, Mail } from 'lucide-react'
import { PLANS, type PlanKey } from '@/lib/plans'
import { DAYS, DEFAULT_OPENING_HOURS } from '@/lib/openingHours'
import { getActiveDiscount } from '@/lib/subscriptionDiscount'
import type { OpeningHours } from '@/lib/types'
import { NotificationSettings } from '@/components/dashboard/NotificationSettings'

const iCls = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange/20 transition-colors'
const lCls = 'block text-xs font-medium text-gray-500 mb-1.5'
const timeCls = 'flex-1 min-w-0 border border-gray-200 rounded-xl px-2.5 py-2 text-sm text-gray-900 focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange/20 transition-colors'

interface RestaurantData {
  id: string
  name: string
  slug: string
  referral_code: string | null
  whatsapp_number: string
  opening_hours: OpeningHours | null
  newsletter_opt_in: boolean
}

interface Sub {
  plan: string
  status: string
  ends_at: string | null
  discount_percent: number | null
  discount_expires_at: string | null
}

interface AdminRow {
  id: string
  email: string
  full_name: string | null
  admin_role: 'principal' | 'secondaire' | null
}

export default function SettingsPage() {
  const supabase = createClient()
  const [restaurant, setRestaurant] = useState<RestaurantData | null>(null)
  const [sub, setSub] = useState<Sub | null>(null)

  // Password
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [adminRole, setAdminRole] = useState<'principal' | 'secondaire' | null>(null)
  const [myId, setMyId] = useState<string | null>(null)
  const isPrincipal = adminRole === 'principal'

  // Gestion des admins (Pro, principal only)
  const [admins, setAdmins] = useState<AdminRow[]>([])
  const [addAdminForm, setAddAdminForm] = useState({ full_name: '', email: '' })
  const [addAdminSaving, setAddAdminSaving] = useState(false)
  const [addAdminMsg, setAddAdminMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  // Plan change modal
  const [planModalOpen, setPlanModalOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>('pro')
  const [planReason, setPlanReason] = useState('')

  // Share
  const [copied, setCopied] = useState(false)
  const [siteOrigin, setSiteOrigin] = useState('')

  // Export
  const [exporting, setExporting] = useState(false)

  // Horaires
  const [hours, setHours] = useState<OpeningHours>(DEFAULT_OPENING_HOURS)
  const [hoursSaving, setHoursSaving] = useState(false)
  const [hoursSaved, setHoursSaved] = useState(false)
  const [newsletterOptIn, setNewsletterOptIn] = useState(false)
  const [newsletterSaving, setNewsletterSaving] = useState(false)
  const [supportWhatsapp, setSupportWhatsapp] = useState('221774739266')
  const [planPrices, setPlanPrices] = useState<Record<string, number>>({ starter: PLANS.starter.price, pro: PLANS.pro.price })

  useEffect(() => { setSiteOrigin(window.location.origin) }, [])

  useEffect(() => {
    fetch('/api/platform-settings')
      .then(r => r.json())
      .then(d => {
        if (d.support_whatsapp) setSupportWhatsapp(d.support_whatsapp)
        setPlanPrices({ starter: d.plan_starter_price ?? PLANS.starter.price, pro: d.plan_pro_price ?? PLANS.pro.price })
      })
      .catch(() => {})
  }, [])

  const loadData = useCallback(async () => {
    const meRes = await fetch('/api/auth/me').then(r => r.json())
    if (!meRes.restaurant_id) return
    setAdminRole(meRes.admin_role ?? null)
    setMyId(meRes.user_id ?? null)
    const { data: b } = await supabase.from('restaurants').select('id, name, slug, referral_code, whatsapp_number, opening_hours, newsletter_opt_in').eq('id', meRes.restaurant_id).single()
    const { data: s } = await supabase.from('subscriptions').select('plan, status, ends_at, discount_percent, discount_expires_at').eq('restaurant_id', meRes.restaurant_id).single()
    if (b) {
      setRestaurant(b)
      setHours(b.opening_hours && Object.keys(b.opening_hours).length > 0 ? b.opening_hours : DEFAULT_OPENING_HOURS)
      setNewsletterOptIn(!!b.newsletter_opt_in)
    }
    if (s) setSub(s)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadAdmins = useCallback(async () => {
    if (!restaurant) return
    const { data } = await supabase
      .from('profiles')
      .select('id, email, full_name, admin_role')
      .eq('restaurant_id', restaurant.id)
      .eq('role', 'restaurant_admin')
      .eq('is_active', true)
      .order('created_at', { ascending: true })
    setAdmins((data ?? []) as AdminRow[])
  }, [restaurant]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadData() }, [loadData])
  useEffect(() => {
    if (restaurant && isPrincipal && sub?.plan === 'pro') loadAdmins()
  }, [restaurant, isPrincipal, sub?.plan]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ─── Horaires ─── */
  async function saveHours() {
    if (!restaurant) return
    setHoursSaving(true)
    await supabase.from('restaurants').update({ opening_hours: hours }).eq('id', restaurant.id)
    setHoursSaving(false)
    setHoursSaved(true)
    setTimeout(() => setHoursSaved(false), 2500)
  }

  /* ─── Newsletter ─── */
  async function toggleNewsletterOptIn(value: boolean) {
    if (!restaurant) return
    setNewsletterOptIn(value)
    setNewsletterSaving(true)
    await supabase.from('restaurants').update({ newsletter_opt_in: value }).eq('id', restaurant.id)
    setNewsletterSaving(false)
  }

  /* ─── Password ─── */
  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    if (!isPrincipal) return
    if (!pwForm.current) { setPwMsg({ ok: false, text: 'Renseignez le mot de passe actuel.' }); return }
    if (pwForm.next !== pwForm.confirm) { setPwMsg({ ok: false, text: 'Les mots de passe ne correspondent pas.' }); return }
    if (pwForm.next.length < 8) { setPwMsg({ ok: false, text: 'Minimum 8 caractères.' }); return }
    setPwSaving(true)
    const res = await fetch('/api/restaurant/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current: pwForm.current, next: pwForm.next }),
    })
    const data = await res.json()
    if (!res.ok) { setPwMsg({ ok: false, text: data.error ?? 'Erreur' }); setPwSaving(false); return }
    setPwMsg({ ok: true, text: 'Mot de passe changé avec succès. Les autres admins ont été déconnectés et notifiés par email.' })
    setPwForm({ current: '', next: '', confirm: '' })
    setPwSaving(false)
    setTimeout(() => setPwMsg(null), 5000)
  }

  /* ─── Gestion des admins ─── */
  async function handleAddAdmin(e: React.FormEvent) {
    e.preventDefault()
    if (!addAdminForm.full_name.trim() || !addAdminForm.email.trim()) return
    setAddAdminSaving(true)
    setAddAdminMsg(null)
    const res = await fetch('/api/restaurant/admins/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: addAdminForm.full_name.trim(), email: addAdminForm.email.trim() }),
    })
    const data = await res.json()
    if (!res.ok) { setAddAdminMsg({ ok: false, text: data.error ?? 'Erreur' }); setAddAdminSaving(false); return }
    setAddAdminMsg({ ok: true, text: 'Admin ajouté, ses identifiants lui ont été envoyés par email.' })
    setAddAdminForm({ full_name: '', email: '' })
    setAddAdminSaving(false)
    await loadAdmins()
  }

  async function handleRemoveAdmin(id: string, label: string) {
    if (!confirm(`Supprimer l'accès de "${label}" ?`)) return
    setRemovingId(id)
    const res = await fetch('/api/restaurant/admins/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_id: id }),
    })
    if (res.ok) await loadAdmins()
    else { const data = await res.json().catch(() => ({})); alert(data.error ?? 'Erreur lors de la suppression') }
    setRemovingId(null)
  }

  /* ─── Share referral ─── */
  async function handleShare() {
    if (!restaurant?.referral_code) return
    const url = `${window.location.origin}/inscription?ref=${restaurant.referral_code}`
    if (navigator.share) {
      try { await navigator.share({ title: 'TerangaLink', text: `Inscris ton restaurant sur TerangaLink avec mon code et on a tous les deux 25% de réduction !`, url }) }
      catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  /* ─── Plan request via WhatsApp ─── */
  function sendPlanRequest() {
    if (!restaurant) return
    const msg = `Bonjour TerangaLink, je souhaite modifier mon abonnement.\nRestaurant : ${restaurant.name}\nPlan souhaité : ${selectedPlan === 'pro' ? 'Pro' : 'Starter'}${planReason ? `\nRaison : ${planReason}` : ''}`
    window.open(`https://wa.me/${supportWhatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank')
    setPlanModalOpen(false)
  }

  /* ─── Export CSV — étendue par plan : Free (1 mois, basique), Starter
     (3 mois, + téléphone), Pro (6 mois, complet avec détail des plats) ─── */
  function formatOrderItems(items: unknown): string {
    const list = (items as Array<{ name: string; quantity: number }>) ?? []
    return list.map(i => `${i.name} x${i.quantity ?? 1}`).join(' ; ')
  }

  async function handleExport() {
    if (!restaurant) return
    setExporting(true)
    const plan = (sub?.plan as PlanKey) ?? 'starter'
    const days = plan === 'pro' ? 180 : plan === 'starter' ? 90 : 30
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    const orderColumns = plan === 'pro'
      ? 'order_number, customer_name, customer_phone, total, status, items, created_at'
      : plan === 'starter'
      ? 'order_number, customer_name, customer_phone, total, status, created_at'
      : 'order_number, customer_name, total, status, created_at'

    const { data: products } = await supabase.from('menu_items').select('name, price, is_available').eq('restaurant_id', restaurant.id)
    const { data: orders } = await supabase.from('orders').select(orderColumns).eq('restaurant_id', restaurant.id).gte('created_at', since).order('created_at', { ascending: false })

    const prodCsv = ['Plat,Prix,Disponible', ...(products ?? []).map(p => `"${p.name}",${p.price},${p.is_available ? 'Oui' : 'Non'}`)].join('\n')

    type OrderExportRow = { order_number: string; customer_name: string; customer_phone?: string; total: number; status: string; items?: unknown; created_at: string }
    const rows = (orders ?? []) as unknown as OrderExportRow[]
    const orderHeader = plan === 'pro'
      ? 'N° commande,Client,Téléphone,Total,Statut,Date,Plats'
      : plan === 'starter'
      ? 'N° commande,Client,Téléphone,Total,Statut,Date'
      : 'N° commande,Client,Total,Statut,Date'
    const orderRows = rows.map(o => {
      const date = new Date(o.created_at).toLocaleDateString('fr-SN')
      if (plan === 'pro') return `${o.order_number},"${o.customer_name}",${o.customer_phone ?? ''},${o.total},${o.status},${date},"${formatOrderItems(o.items)}"`
      if (plan === 'starter') return `${o.order_number},"${o.customer_name}",${o.customer_phone ?? ''},${o.total},${o.status},${date}`
      return `${o.order_number},"${o.customer_name}",${o.total},${o.status},${date}`
    })
    const orderCsv = [orderHeader, ...orderRows].join('\n')

    const periodLabel = plan === 'pro' ? '6 derniers mois' : plan === 'starter' ? '3 derniers mois' : 'dernier mois'
    const full = `=== MENU ===\n${prodCsv}\n\n=== COMMANDES (${periodLabel}) ===\n${orderCsv}`

    const blob = new Blob([full], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${restaurant.slug}-export.csv`; a.click()
    setExporting(false)
  }

  const planColors: Record<string, string> = { free: '#6B7280', starter: '#6B7280', pro: '#F97316', trial: '#D97706' }
  const planLabels: Record<string, string> = { free: 'Free', starter: 'Starter', pro: 'Pro', trial: 'Essai', active: 'Actif', suspended: 'Suspendu', cancelled: 'Annulé' }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
        <p className="text-gray-500 text-sm mt-1">Sécurité, abonnement, parrainage et données</p>
      </div>

      {/* ── Section 1 : Mot de passe (partagé par le restaurant) — principal uniquement ── */}
      {isPrincipal && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="font-semibold text-gray-900 text-sm mb-1 flex items-center gap-2">
            <Lock className="w-4 h-4 text-brand-orange" />
            Mot de passe du restaurant
          </h2>
          <p className="text-xs text-gray-500 mb-4">Ce mot de passe est partagé par tous les admins du restaurant.</p>
          <form onSubmit={handlePasswordChange} className="space-y-3">
            <div>
              <label className={lCls}>Mot de passe actuel</label>
              <input type="password" value={pwForm.current} onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))}
                placeholder="Mot de passe actuel" className={iCls} required />
            </div>
            <div>
              <label className={lCls}>Nouveau mot de passe</label>
              <input type="password" value={pwForm.next} onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))}
                placeholder="8 caractères minimum" className={iCls} minLength={8} required />
            </div>
            <div>
              <label className={lCls}>Confirmer</label>
              <input type="password" value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                placeholder="Répétez le mot de passe" className={iCls} required />
            </div>
            {pwMsg && (
              <p className={`text-sm flex items-center gap-1.5 ${pwMsg.ok ? 'text-green-600' : 'text-red-500'}`}>
                {pwMsg.ok ? <Check className="w-4 h-4" /> : null}{pwMsg.text}
              </p>
            )}
            <button type="submit" disabled={pwSaving}
              className="w-full bg-brand-orange text-white py-3 rounded-xl text-sm font-semibold hover:bg-brand-orange-dark transition-colors disabled:opacity-50">
              {pwSaving ? 'Mise à jour…' : 'Mettre à jour le mot de passe'}
            </button>
            <a href="/mot-de-passe-oublie" target="_blank" rel="noopener noreferrer"
              className="block text-center text-xs text-gray-400 hover:text-brand-orange transition-colors">
              Mot de passe actuel oublié ?
            </a>
          </form>
        </div>
      )}

      <NotificationSettings variant="restaurant" />

      {/* ── Section : Gestion des admins (Pro, principal uniquement) ── */}
      {isPrincipal && sub?.plan === 'pro' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="font-semibold text-gray-900 text-sm mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-brand-orange" />
            Gestion des admins
          </h2>
          <div className="space-y-2 mb-4">
            {admins.map(a => (
              <div key={a.id} className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {a.full_name ?? a.email} {a.id === myId && <span className="text-gray-400 font-normal">(vous)</span>}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{a.email}</p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${a.admin_role === 'principal' ? 'bg-orange-100 text-brand-orange' : 'bg-gray-200 text-gray-600'}`}>
                  {a.admin_role === 'principal' ? 'Principal' : 'Secondaire'}
                </span>
                {a.admin_role === 'secondaire' && (
                  <button onClick={() => handleRemoveAdmin(a.id, a.full_name ?? a.email)} disabled={removingId === a.id}
                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40 shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            {admins.length === 0 && <p className="text-sm text-gray-400">Chargement…</p>}
          </div>
          {admins.length < 5 ? (
            <form onSubmit={handleAddAdmin} className="space-y-3 pt-4 border-t border-gray-100">
              <div>
                <label className={lCls}>Nom complet</label>
                <input type="text" value={addAdminForm.full_name} onChange={e => setAddAdminForm(f => ({ ...f, full_name: e.target.value }))}
                  placeholder="Prénom Nom" className={iCls} required />
              </div>
              <div>
                <label className={lCls}>Email</label>
                <input type="email" value={addAdminForm.email} onChange={e => setAddAdminForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="admin@exemple.com" className={iCls} required />
              </div>
              {addAdminMsg && (
                <p className={`text-sm flex items-center gap-1.5 ${addAdminMsg.ok ? 'text-green-600' : 'text-red-500'}`}>
                  {addAdminMsg.ok ? <Check className="w-4 h-4" /> : null}{addAdminMsg.text}
                </p>
              )}
              <button type="submit" disabled={addAdminSaving}
                className="w-full inline-flex items-center justify-center gap-2 border border-brand-orange text-brand-orange py-2.5 rounded-xl text-sm font-semibold hover:bg-brand-orange/5 transition-colors disabled:opacity-50">
                <Plus className="w-4 h-4" />
                {addAdminSaving ? 'Ajout…' : 'Ajouter un admin'}
              </button>
            </form>
          ) : (
            <p className="text-xs text-gray-400 pt-4 border-t border-gray-100">Limite de 5 administrateurs atteinte.</p>
          )}
        </div>
      )}

      {/* ── Section 2 : Abonnement ── */}
      <div id="abonnement" className="bg-white border border-gray-200 rounded-2xl p-6 scroll-mt-6">
        <h2 className="font-semibold text-gray-900 text-sm mb-4 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-brand-orange" />
          Mon abonnement
        </h2>
        {sub ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{planLabels[sub.plan] ?? sub.plan}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Statut : <span style={{ color: planColors[sub.status] ?? '#6B7280' }}>{planLabels[sub.status] ?? sub.status}</span>
                  {sub.ends_at && ` · Expire le ${new Date(sub.ends_at).toLocaleDateString('fr-SN')}`}
                </p>
                {(() => {
                  const active = getActiveDiscount(sub)
                  return active && (
                    <p className="text-xs font-semibold mt-1.5" style={{ color: '#059669' }}>
                      -{active.percent}% de parrainage jusqu&apos;au {new Date(active.expiresAt).toLocaleDateString('fr-SN')}
                    </p>
                  )
                })()}
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full text-white" style={{ backgroundColor: planColors[sub.plan] ?? '#6B7280' }}>
                {planLabels[sub.plan]}
              </span>
            </div>
            <button onClick={() => { setSelectedPlan(sub.plan === 'pro' ? 'starter' : 'pro'); setPlanModalOpen(true) }}
              className="w-full border border-brand-orange text-brand-orange py-2.5 rounded-xl text-sm font-semibold hover:bg-brand-orange/5 transition-colors">
              Demander une modification
            </button>
          </div>
        ) : (
          <p className="text-sm text-gray-400">Aucun abonnement trouvé.</p>
        )}
      </div>

      {/* ── Section : Horaires d'ouverture ── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <h2 className="font-semibold text-gray-900 text-sm mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-brand-orange" />
          Horaires d&apos;ouverture
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          Affiche automatiquement &quot;Ouvert&quot; ou &quot;Fermé&quot; sur votre vitrine, jour par jour. Cochez &quot;Fermé&quot; pour un jour sans horaires.
        </p>
        <div className="space-y-2.5">
          {DAYS.map(({ key, label }) => {
            const closed = !hours[key]
            const [open, close] = (hours[key] ?? DEFAULT_OPENING_HOURS[key] ?? '08:00-18:00')!.split('-')
            return (
              <div key={key} className="flex items-center gap-2 sm:gap-3">
                <span className="text-xs text-gray-600 w-16 sm:w-20 shrink-0">{label}</span>
                <input
                  type="time"
                  value={open}
                  disabled={closed}
                  onChange={e => setHours(h => ({ ...h, [key]: `${e.target.value}-${close}` }))}
                  className={`${timeCls} disabled:bg-gray-50 disabled:text-gray-300`}
                />
                <span className="text-xs text-gray-400 shrink-0">à</span>
                <input
                  type="time"
                  value={close}
                  disabled={closed}
                  onChange={e => setHours(h => ({ ...h, [key]: `${open}-${e.target.value}` }))}
                  className={`${timeCls} disabled:bg-gray-50 disabled:text-gray-300`}
                />
                <label className="flex items-center gap-1.5 text-xs text-gray-500 shrink-0 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={closed}
                    onChange={e => setHours(h => ({ ...h, [key]: e.target.checked ? null : '08:00-18:00' }))}
                    className="w-3.5 h-3.5 accent-brand-orange"
                  />
                  Fermé
                </label>
              </div>
            )
          })}
        </div>
        <div className="flex items-center gap-3 mt-4">
          <button onClick={saveHours} disabled={hoursSaving}
            className="bg-brand-orange text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-brand-orange-dark transition-colors disabled:opacity-50">
            {hoursSaving ? 'Enregistrement…' : 'Enregistrer les horaires'}
          </button>
          {hoursSaved && <span className="text-xs text-green-600 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Enregistré</span>}
        </div>
      </div>

      {/* ── Section : Newsletter ── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <h2 className="font-semibold text-gray-900 text-sm mb-4 flex items-center gap-2">
          <Mail className="w-4 h-4 text-brand-orange" />
          Newsletter TerangaLink
        </h2>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={newsletterOptIn}
            onChange={e => toggleNewsletterOptIn(e.target.checked)}
            className="w-4 h-4 mt-0.5 accent-brand-orange shrink-0"
          />
          <span className="text-sm text-gray-700">
            Recevoir les emails de la newsletter TerangaLink (conseils, offres partenaires, actualités).
            <span className="block text-xs text-gray-400 mt-0.5">Modifiable à tout moment. Chaque email contient un lien de désabonnement.</span>
          </span>
        </label>
        {newsletterSaving && <span className="text-xs text-gray-400 mt-2 inline-block">Enregistrement…</span>}
      </div>

      {/* ── Section 3 : Parrainage ── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <h2 className="font-semibold text-gray-900 text-sm mb-4 flex items-center gap-2">
          <Gift className="w-4 h-4 text-brand-orange" />
          Mon code de parrainage
        </h2>
        {restaurant?.referral_code ? (
          <div>
            <p className="text-xs text-gray-500 mb-4">
              Partagez ce code. Si le filleul s&apos;inscrit avec et paie son premier mois, vous recevez tous les deux 25% sur votre prochain mois.
            </p>
            <div className="flex items-center gap-3 mb-3">
              <span className="font-mono font-bold text-xl tracking-wider px-4 py-2 bg-white border border-gray-200 rounded-xl" style={{ color: '#F97316' }}>
                {restaurant.referral_code}
              </span>
              <button onClick={handleShare}
                className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#F97316' }}>
                <Share2 className="w-4 h-4" />
                {copied ? 'Lien copié !' : 'Partager'}
              </button>
            </div>
            <p className="text-xs text-gray-400">
              {siteOrigin.replace(/^https?:\/\//, '')}/inscription?ref={restaurant.referral_code}
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-400">Code de parrainage en cours de génération…</p>
        )}
      </div>

      {/* ── Section 4 : Export ── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <h2 className="font-semibold text-gray-900 text-sm mb-2 flex items-center gap-2">
          <FileDown className="w-4 h-4 text-brand-orange" />
          Télécharger mes données
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          Exportez votre menu et vos commandes au format CSV.{' '}
          {sub?.plan === 'pro'
            ? 'Détail complet (client, téléphone, plats) sur les 6 derniers mois.'
            : sub?.plan === 'starter'
            ? 'Client et téléphone inclus, sur les 3 derniers mois. Passez en Pro pour le détail des plats sur 6 mois.'
            : 'Données de base sur le dernier mois. Passez en Starter ou Pro pour plus de données et une période plus longue.'}
        </p>
        <button onClick={handleExport} disabled={exporting || !restaurant}
          className="inline-flex items-center gap-2 border border-gray-200 text-gray-700 text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50">
          <Download className="w-4 h-4" />
          {exporting ? 'Export en cours…' : 'Exporter en CSV'}
        </button>
      </div>

      {/* ── Plan change modal ── */}
      {planModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid #F3F4F6' }}>
              <h3 className="font-bold text-gray-900">Choisir un plan</h3>
              <button onClick={() => setPlanModalOpen(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {(Object.entries(PLANS) as [string, typeof PLANS.starter][]).map(([key, plan]) => (
                  <button key={key} onClick={() => setSelectedPlan(key as PlanKey)}
                    className={`text-left p-5 rounded-2xl border-2 transition-all ${selectedPlan === key ? 'border-brand-orange bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-gray-900">{plan.name}</span>
                      {selectedPlan === key && <Check className="w-4 h-4 text-brand-orange" />}
                    </div>
                    <p className="text-xl font-bold text-brand-orange mb-3">{(planPrices[key] ?? plan.price).toLocaleString('fr-FR')} FCFA<span className="text-sm font-normal text-gray-400">/mois</span></p>
                    <ul className="space-y-1.5">
                      {plan.features.slice(0, 5).map(f => (
                        <li key={f} className="flex items-start gap-1.5 text-xs text-gray-600">
                          <Check className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />{f}
                        </li>
                      ))}
                    </ul>
                  </button>
                ))}
              </div>
              <div>
                <label className={lCls}>Raison (optionnel)</label>
                <textarea value={planReason} onChange={e => setPlanReason(e.target.value)}
                  placeholder="Précisez si besoin…" rows={2}
                  className={`${iCls} resize-none`} />
              </div>
              <button onClick={sendPlanRequest}
                className="w-full bg-brand-orange text-white py-3 rounded-xl font-semibold hover:bg-brand-orange-dark transition-colors text-sm">
                Envoyer ma demande via WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
