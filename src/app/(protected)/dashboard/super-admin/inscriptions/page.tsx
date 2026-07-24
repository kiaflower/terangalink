'use client'

import { useEffect, useState } from 'react'
import { X, FileText, ExternalLink, ShieldCheck, Tag, Truck, Sparkles, CheckCircle2 } from 'lucide-react'
import { PLANS, type PlanKey } from '@/lib/plans'

interface Inscription {
  id: string; restaurant_name: string; owner_name: string; email: string; phone: string
  whatsapp_number: string; cuisine_type?: string; city?: string; description?: string
  plan?: string; primary_color?: string; facebook_url?: string; instagram_url?: string
  tiktok_url?: string; snapchat_url?: string; referral_code?: string
  logo_base64?: string; cover_base64?: string; status: string; created_at: string
  want_verified_badge?: boolean; partner_offer_type?: string; partner_offer_custom?: string
  consent_images?: boolean; consent_annuaire?: boolean; consent_marketing?: boolean
  created_restaurant_id?: string; created_admin_password?: string
}

const STATUS_LABELS: Record<string, string> = { pending: 'En attente', approved: 'Approuvée', rejected: 'Rejetée' }
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-600 border-amber-200',
  approved: 'bg-green-50 text-green-600 border-green-200',
  rejected: 'bg-red-50 text-red-600 border-red-200',
}

const OFFER_LABELS: Record<string, string> = {
  discount_10: '-10% de réduction',
  free_delivery: 'Livraison gratuite',
  custom: 'Offre personnalisée',
}
const OFFER_ICONS: Record<string, React.ReactNode> = {
  discount_10: <Tag className="w-3.5 h-3.5" />,
  free_delivery: <Truck className="w-3.5 h-3.5" />,
  custom: <Sparkles className="w-3.5 h-3.5" />,
}

function isPlanKey(plan: string | undefined): plan is PlanKey {
  return plan === 'free' || plan === 'starter' || plan === 'pro'
}

function planName(plan: string | undefined): string {
  return isPlanKey(plan) ? PLANS[plan].name : (plan ?? '—')
}

function planLabel(plan: string | undefined, planPrices: Record<string, number>): string {
  if (!isPlanKey(plan)) return plan ?? '—'
  const price = planPrices[plan] ?? PLANS[plan].price
  return price > 0
    ? `${PLANS[plan].name} — ${new Intl.NumberFormat('fr-SN').format(price)} FCFA/mois`
    : `${PLANS[plan].name} — Gratuit`
}

function FicheModal({ ins, planPrices, onClose, onApproved }: { ins: Inscription; planPrices: Record<string, number>; onClose: () => void; onApproved?: (id: string, action: 'approve' | 'reject') => void }) {
  const [approving, setApproving] = useState(false)
  const [rejecting, setRejecting] = useState(false)

  const rows = [
    { label: 'Restaurant', value: ins.restaurant_name },
    { label: 'Responsable', value: ins.owner_name },
    { label: 'Email', value: ins.email },
    { label: 'Téléphone', value: ins.phone },
    { label: 'WhatsApp', value: ins.whatsapp_number },
    { label: 'Catégorie', value: ins.cuisine_type },
    { label: 'Ville', value: ins.city },
    { label: 'Description', value: ins.description },
    { label: 'Plan', value: planLabel(ins.plan, planPrices) },
    { label: 'Instagram', value: ins.instagram_url },
    { label: 'Facebook', value: ins.facebook_url },
    { label: 'TikTok', value: ins.tiktok_url },
    { label: 'Snapchat', value: ins.snapchat_url },
    { label: 'Code parrainage', value: ins.referral_code },
    { label: 'Statut', value: STATUS_LABELS[ins.status] ?? ins.status },
    { label: 'Soumis le', value: new Date(ins.created_at).toLocaleString('fr-SN') },
  ]

  async function handleApprove() {
    setApproving(true)
    const fd = new FormData()
    fd.append('id', ins.id)
    fd.append('action', 'approve')
    const res = await fetch('/api/super-admin/inscriptions', { method: 'POST', body: fd })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      alert(data.error || 'Erreur lors de l\'approbation')
      setApproving(false)
      return
    }
    onApproved?.(ins.id, 'approve')
    setApproving(false)
  }

  async function handleReject() {
    setRejecting(true)
    const fd = new FormData()
    fd.append('id', ins.id)
    fd.append('action', 'reject')
    await fetch('/api/super-admin/inscriptions', { method: 'POST', body: fd })
    onApproved?.(ins.id, 'reject')
    setRejecting(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <div className="sticky top-0 bg-white px-6 py-4 flex items-center justify-between border-b border-gray-100 rounded-t-2xl">
          <div>
            <h2 className="font-bold text-gray-900">{ins.restaurant_name}</h2>
            <p className="text-xs text-gray-400 mt-0.5">Fiche d&apos;inscription complète</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {(ins.logo_base64 || ins.cover_base64) && (
            <div className="mb-5 space-y-3">
              {ins.cover_base64 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Bannière</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ins.cover_base64} alt="Bannière" className="w-full h-32 object-cover rounded-xl border border-gray-200" />
                </div>
              )}
              {ins.logo_base64 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Logo</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ins.logo_base64} alt="Logo" className="w-16 h-16 object-cover rounded-xl border border-gray-200" />
                </div>
              )}
            </div>
          )}

          {ins.primary_color && (
            <div className="mb-5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg border border-gray-200 flex-shrink-0" style={{ backgroundColor: ins.primary_color }} />
              <span className="text-sm text-gray-600 font-mono">{ins.primary_color}</span>
              <span className="text-xs text-gray-400">couleur principale</span>
            </div>
          )}

          {/* Options spéciales */}
          {(ins.want_verified_badge || ins.partner_offer_type) && (
            <div className="mb-5 space-y-2">
              {ins.want_verified_badge && (
                <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200 text-orange-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Badge Vérifié demandé (+1 000 FCFA/mois)
                </div>
              )}
              {ins.partner_offer_type && (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-full w-fit">
                  {OFFER_ICONS[ins.partner_offer_type]}
                  Offre partenaire : {OFFER_LABELS[ins.partner_offer_type] ?? ins.partner_offer_type}
                  {ins.partner_offer_type === 'custom' && ins.partner_offer_custom && ` — "${ins.partner_offer_custom}"`}
                </div>
              )}
            </div>
          )}

          {/* Consentements */}
          <div className="mb-5 space-y-1.5">
            <p className="text-xs font-medium text-gray-500 mb-2">Consentements</p>
            {[
              { key: 'consent_images' as keyof Inscription, label: 'Utilisation images pour pub' },
              { key: 'consent_annuaire' as keyof Inscription, label: 'Inscription dans l\'annuaire' },
              { key: 'consent_marketing' as keyof Inscription, label: 'Communications marketing' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded flex items-center justify-center ${ins[key] ? 'bg-green-500' : 'bg-gray-200'}`}>
                  {ins[key] && <Check className="w-2.5 h-2.5 text-white" />}
                </div>
                <span className="text-xs text-gray-600">{label}</span>
              </div>
            ))}
          </div>

          <div className="space-y-0">
            {rows.map(({ label, value }) => value ? (
              <div key={label} className="flex gap-4 py-2.5 border-b border-gray-50 last:border-0">
                <span className="text-xs font-medium text-gray-400 w-32 flex-shrink-0 pt-0.5">{label}</span>
                <span className="text-sm text-gray-900 break-all">{value}</span>
              </div>
            ) : null)}
          </div>

          {/* Restaurant créée */}
          {ins.created_restaurant_id && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <p className="text-sm font-semibold text-green-700">Restaurant créée automatiquement</p>
              </div>
              {ins.created_admin_password && (
                <>
                  <p className="text-xs text-green-600 mb-3">Mot de passe admin : <span className="font-mono font-bold">{ins.created_admin_password}</span></p>
                  <button
                    type="button"
                    onClick={() => {
                      const msg = `Bonjour ${ins.owner_name}, votre restaurant ${ins.restaurant_name} est prête sur TerangaLink !\n\nEmail : ${ins.email}\nMot de passe : ${ins.created_admin_password}\n\nConnectez-vous sur : ${window.location.origin}/login`
                      window.open(`https://wa.me/${ins.whatsapp_number.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank')
                    }}
                    className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
                  >
                    Envoyer les identifiants sur WhatsApp
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <div className="px-6 pb-6 flex gap-2 pt-2 border-t border-gray-100">
          {ins.status === 'pending' && (
            <>
              <button type="button" onClick={handleApprove} disabled={approving}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50">
                {approving ? 'Approbation...' : '✓ Approuver & créer restaurant'}
              </button>
              <button type="button" onClick={handleReject} disabled={rejecting}
                className="flex-1 border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50">
                {rejecting ? '...' : 'Rejeter'}
              </button>
            </>
          )}
          {ins.status === 'approved' && ins.created_restaurant_id && (
            <a href={`/dashboard/super-admin/restaurants`}
              className="flex-1 flex items-center justify-center gap-2 bg-brand-orange text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-opacity hover:opacity-90">
              <ExternalLink className="w-4 h-4" />
              Voir les restaurants
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

function Check({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

const FILTER_OPTIONS = [
  { value: 'all', label: 'Toutes' },
  { value: 'pending', label: 'En attente' },
  { value: 'approved', label: 'Approuvées' },
  { value: 'rejected', label: 'Rejetées' },
]

export default function InscriptionsPage() {
  const [inscriptions, setInscriptions] = useState<Inscription[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Inscription | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [planPrices, setPlanPrices] = useState<Record<string, number>>({ starter: PLANS.starter.price, pro: PLANS.pro.price })

  useEffect(() => {
    fetch('/api/platform-settings')
      .then(r => r.json())
      .then(data => setPlanPrices({ starter: data.plan_starter_price ?? PLANS.starter.price, pro: data.plan_pro_price ?? PLANS.pro.price }))
      .catch(() => {})
  }, [])

  async function loadInscriptions(): Promise<Inscription[]> {
    try {
      const r = await fetch('/api/super-admin/inscriptions-list')
      const d = await r.json()
      const list: Inscription[] = d.inscriptions ?? []
      setInscriptions(list)
      setLoading(false)
      return list
    } catch {
      setLoading(false)
      return []
    }
  }

  useEffect(() => { loadInscriptions() }, [])

  // La liste n'inclut pas les images (base64, potentiellement plusieurs Mo) —
  // on charge la fiche complète à la demande, seulement pour l'inscription ouverte.
  async function openFiche(ins: Inscription) {
    setSelected(ins)
    try {
      const r = await fetch(`/api/super-admin/inscriptions-list?id=${ins.id}`)
      const d = await r.json()
      if (d.inscription) setSelected(d.inscription)
    } catch { /* keep the list-level data */ }
  }

  async function handleApproved(id: string, action: 'approve' | 'reject') {
    await loadInscriptions()
    if (action === 'reject') { setSelected(null); return }
    const r = await fetch(`/api/super-admin/inscriptions-list?id=${id}`)
    const d = await r.json()
    setSelected(d.inscription ?? null)
  }

  if (loading) return <p className="text-gray-400 text-sm py-8">Chargement...</p>

  return (
    <div>
      {selected && (
        <FicheModal
          ins={selected}
          planPrices={planPrices}
          onClose={() => setSelected(null)}
          onApproved={handleApproved}
        />
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Inscriptions</h1>
        <p className="text-gray-500 text-sm mt-1">Gérez les demandes d&apos;inscription des restaurants</p>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto -mx-1 px-1 pb-1" style={{ scrollbarWidth: 'thin' }}>
        {FILTER_OPTIONS.map(f => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
              statusFilter === f.value ? 'bg-brand-orange text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {f.label} {f.value !== 'all' ? `(${inscriptions.filter(i => i.status === f.value).length})` : `(${inscriptions.length})`}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {inscriptions.filter(ins => statusFilter === 'all' || ins.status === statusFilter).map(ins => (
          <div key={ins.id} className="bg-white border border-gray-200 rounded-2xl p-5">
            <div className="flex items-start justify-between mb-2 gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {ins.primary_color && (
                    <div className="w-3.5 h-3.5 rounded-full border border-gray-200 flex-shrink-0" style={{ backgroundColor: ins.primary_color }} />
                  )}
                  <h3 className="text-base font-semibold text-gray-900 truncate">{ins.restaurant_name}</h3>
                  {ins.want_verified_badge && (
                    <ShieldCheck className="w-4 h-4 text-brand-orange shrink-0" />
                  )}
                </div>
                <p className="text-sm text-gray-500">{ins.owner_name} · {ins.email}</p>
                <p className="text-sm text-gray-500">{ins.phone}</p>
                {ins.cuisine_type && <p className="text-xs text-gray-400 mt-0.5">{ins.cuisine_type}{ins.city && ` · ${ins.city}`}</p>}
                <p className="text-xs text-gray-400 mt-0.5">
                  Plan: <span className="font-medium">{planName(ins.plan)}</span> · {new Date(ins.created_at).toLocaleDateString('fr-SN')}
                </p>
                {ins.partner_offer_type && (
                  <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-medium px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-200 rounded-full">
                    {OFFER_ICONS[ins.partner_offer_type]}
                    {OFFER_LABELS[ins.partner_offer_type]}
                  </span>
                )}
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <span className={`text-xs font-medium px-3 py-1 rounded-full border ${STATUS_COLORS[ins.status] ?? 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                  {STATUS_LABELS[ins.status] ?? ins.status}
                </span>
                <button
                  onClick={() => openFiche(ins)}
                  className="inline-flex items-center gap-1.5 text-xs text-brand-orange border border-brand-orange/30 px-3 py-1.5 rounded-lg hover:bg-brand-orange/5 transition-colors font-medium"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Fiche
                </button>
              </div>
            </div>

            {ins.status === 'pending' && (
              <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                <button type="button"
                  onClick={async () => {
                    const fd = new FormData()
                    fd.append('id', ins.id)
                    fd.append('action', 'approve')
                    const res = await fetch('/api/super-admin/inscriptions', { method: 'POST', body: fd })
                    const data = await res.json().catch(() => ({}))
                    if (!res.ok) { alert(data.error || 'Erreur lors de l\'approbation'); return }
                    handleApproved(ins.id, 'approve')
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                  ✓ Approuver & créer restaurant
                </button>
                <button type="button"
                  onClick={async () => {
                    const fd = new FormData()
                    fd.append('id', ins.id)
                    fd.append('action', 'reject')
                    await fetch('/api/super-admin/inscriptions', { method: 'POST', body: fd })
                    handleApproved(ins.id, 'reject')
                  }}
                  className="border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                  Rejeter
                </button>
              </div>
            )}
          </div>
        ))}
        {!inscriptions.length && (
          <p className="text-center text-gray-500 py-20">Aucune inscription</p>
        )}
      </div>
    </div>
  )
}
