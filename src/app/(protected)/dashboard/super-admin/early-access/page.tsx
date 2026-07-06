'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Loader2, MessageCircle, Check, X, MapPin, ExternalLink, UserPlus, Zap, Store, Trash2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'

const MAX_SLOTS = 15

interface Registration {
  id: string
  restaurant_name: string
  admin_name: string
  phone: string
  whatsapp: string
  address: string | null
  neighborhood: string | null
  city: string | null
  wave_number: string | null
  orange_money_number: string | null
  logo_url: string | null
  banner_url: string | null
  color_choice: 'terangalink' | 'custom'
  primary_color: string | null
  secondary_color: string | null
  facebook_url: string | null
  instagram_url: string | null
  tiktok_url: string | null
  snapchat_url: string | null
  status: 'pending' | 'accepted' | 'rejected'
  slot_number: number | null
  restaurant_id: string | null
  created_at: string
}

interface WaitlistLead {
  id: string
  prenom: string
  whatsapp: string
  type: 'reservation' | 'waitlist'
  contacted: boolean
  created_at: string
}

interface AcceptResult {
  tempPassword: string
  slug: string
  whatsappUrl: string
}

const STATUS_CONFIG: Record<Registration['status'], { label: string; variant: 'warning' | 'success' | 'danger' }> = {
  pending: { label: 'En attente', variant: 'warning' },
  accepted: { label: 'Acceptée', variant: 'success' },
  rejected: { label: 'Refusée', variant: 'danger' },
}

export default function EarlyAccessPage() {
  const supabase = createClient()
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [waitlist, setWaitlist] = useState<WaitlistLead[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Registration | null>(null)
  const [isOpen, setIsOpen] = useState(true)
  const [togglingOpen, setTogglingOpen] = useState(false)
  const [accepting, setAccepting] = useState(false)
  const [deletingShop, setDeletingShop] = useState(false)
  const [deletingReg, setDeletingReg] = useState(false)
  const [acceptResult, setAcceptResult] = useState<AcceptResult | null>(null)
  const [actionError, setActionError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: regs }, { data: leads }, { data: setting }] = await Promise.all([
      supabase.from('early_access_registrations').select('*').order('created_at', { ascending: false }),
      supabase.from('early_access_leads').select('*').eq('type', 'waitlist').order('created_at', { ascending: true }),
      supabase.from('platform_settings').select('value').eq('key', 'early_access_open').maybeSingle(),
    ])
    setRegistrations((regs as Registration[]) ?? [])
    setWaitlist((leads as WaitlistLead[]) ?? [])
    setIsOpen(setting?.value !== 'false')
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  const takenCount = registrations.filter(r => r.status !== 'rejected').length

  async function toggleOpen() {
    setTogglingOpen(true)
    const next = !isOpen
    await supabase.from('platform_settings')
      .upsert({ key: 'early_access_open', value: next ? 'true' : 'false' }, { onConflict: 'key' })
    setIsOpen(next)
    setTogglingOpen(false)
  }

  function openDetail(reg: Registration) {
    setSelected(reg)
    setAcceptResult(null)
    setActionError('')
  }

  async function handleRefuse(reg: Registration) {
    if (!confirm(`Refuser l'inscription de ${reg.restaurant_name} ? La place redeviendra disponible.`)) return
    await supabase.from('early_access_registrations')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', reg.id)
    setRegistrations(prev => prev.map(r => r.id === reg.id ? { ...r, status: 'rejected' } : r))
    setSelected(s => s ? { ...s, status: 'rejected' } : s)
  }

  async function handleAccept(reg: Registration) {
    if (!confirm(`Créer la boutique pour ${reg.restaurant_name} ?`)) return
    setAccepting(true)
    setActionError('')
    const res = await fetch('/api/super-admin/early-access/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registration_id: reg.id }),
    })
    const data = await res.json()
    setAccepting(false)
    if (!res.ok) { setActionError(data.error || 'Erreur'); return }

    const msg = encodeURIComponent(
      `Bonjour ${data.admin_name}, votre restaurant ${data.restaurant_name} est prêt sur TerangaLink ! ` +
      `Voici vos identifiants : mot de passe temporaire : ${data.tempPassword}. ` +
      `Connectez-vous sur teranga-link.com/login`
    )
    const whatsappUrl = `https://wa.me/${data.whatsapp.replace(/\D/g, '')}?text=${msg}`

    setAcceptResult({ tempPassword: data.tempPassword, slug: data.slug, whatsappUrl })
    const updated = { ...reg, status: 'accepted' as const, restaurant_id: data.restaurant_id }
    setRegistrations(prev => prev.map(r => r.id === reg.id ? updated : r))
    setSelected(updated)
  }

  async function handleDeleteShop(reg: Registration) {
    if (!confirm(`Supprimer la boutique de ${reg.restaurant_name} ? Cette action est irréversible.`)) return
    setDeletingShop(true)
    setActionError('')
    const res = await fetch('/api/super-admin/early-access/delete-restaurant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registration_id: reg.id }),
    })
    const data = await res.json()
    setDeletingShop(false)
    if (!res.ok) { setActionError(data.error || 'Erreur'); return }

    setAcceptResult(null)
    const updated = { ...reg, status: 'pending' as const, restaurant_id: null }
    setRegistrations(prev => prev.map(r => r.id === reg.id ? updated : r))
    setSelected(updated)
  }

  async function handleDeleteRegistration(reg: Registration) {
    if (!confirm(`Supprimer définitivement l'inscription de ${reg.restaurant_name} ?`)) return
    setDeletingReg(true)
    const { error } = await supabase.from('early_access_registrations').delete().eq('id', reg.id)
    setDeletingReg(false)
    if (error) { setActionError(error.message); return }
    setRegistrations(prev => prev.filter(r => r.id !== reg.id))
    setSelected(null)
  }

  async function toggleContacted(lead: WaitlistLead) {
    await supabase.from('early_access_leads').update({ contacted: !lead.contacted }).eq('id', lead.id)
    setWaitlist(prev => prev.map(l => l.id === lead.id ? { ...l, contacted: !l.contacted } : l))
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Early Access</h1>
          <p className="text-gray-500 text-sm mt-1">
            {takenCount} / {MAX_SLOTS} places prises
            {waitlist.length > 0 && ` · ${waitlist.length} en liste d'attente`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={toggleOpen}
            disabled={togglingOpen}
            className="inline-flex items-center gap-2 text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-colors disabled:opacity-60"
            style={isOpen
              ? { backgroundColor: '#F0FDF4', color: '#22C55E', border: '1px solid #BBF7D0' }
              : { backgroundColor: '#FEF2F2', color: '#EF4444', border: '1px solid #FECACA' }}>
            <span className={`w-8 h-4.5 rounded-full relative transition-all ${isOpen ? 'bg-green-500' : 'bg-gray-300'}`} style={{ width: 32, height: 18 }}>
              <span className="absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-all shadow" style={{ left: isOpen ? 16 : 2 }} />
            </span>
            {togglingOpen ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (isOpen ? 'Inscriptions ouvertes' : 'Inscriptions fermées')}
          </button>
          <Link href="/early-access" target="_blank"
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-colors"
            style={{ backgroundColor: '#F9FAFB', color: '#6B7280', border: '1px solid #E5E7EB' }}>
            <ExternalLink className="w-3.5 h-3.5" />
            Voir la page publique
          </Link>
          <Link href="/early-access/inscription" target="_blank"
            className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 rounded-xl text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#F97316' }}>
            <UserPlus className="w-3.5 h-3.5" />
            Inscrire restaurant
          </Link>
        </div>
      </div>

      {!isOpen && (
        <div className="rounded-xl p-3.5 mb-6 flex items-center gap-2.5" style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }}>
          <X className="w-4 h-4 flex-shrink-0" style={{ color: '#EF4444' }} />
          <p className="text-xs" style={{ color: '#991B1B' }}>
            Les inscriptions sont fermées : la page publique affiche automatiquement la liste d&apos;attente.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
        <div className="rounded-2xl p-4" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB' }}>
          <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#9CA3AF' }}>Places prises</p>
          <p className="text-2xl font-black" style={{ color: '#111111' }}>{takenCount}<span className="text-sm font-medium" style={{ color: '#9CA3AF' }}> / {MAX_SLOTS}</span></p>
        </div>
        <div className="rounded-2xl p-4" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB' }}>
          <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#9CA3AF' }}>En attente</p>
          <p className="text-2xl font-black" style={{ color: '#111111' }}>{registrations.filter(r => r.status === 'pending').length}</p>
        </div>
        <div className="rounded-2xl p-4" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB' }}>
          <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#9CA3AF' }}>Liste d&apos;attente</p>
          <p className="text-2xl font-black" style={{ color: '#111111' }}>{waitlist.length}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
        </div>
      ) : (
        <div className="space-y-10">
          <section>
            <h2 className="text-sm font-bold uppercase tracking-wide mb-3" style={{ color: '#9CA3AF' }}>
              Inscriptions Early Access ({takenCount}/{MAX_SLOTS})
            </h2>
            {registrations.length === 0 ? (
              <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: '#F9FAFB', border: '1px dashed #E5E7EB' }}>
                <Zap className="w-6 h-6 mx-auto mb-2" style={{ color: '#F97316' }} />
                <p className="text-sm font-medium mb-1" style={{ color: '#111111' }}>Aucune inscription pour le moment</p>
                <p className="text-xs" style={{ color: '#9CA3AF' }}>
                  Partagez la <Link href="/early-access" target="_blank" className="underline">page publique</Link>, ou inscrivez un restaurant vous-même avec le bouton &quot;Inscrire restaurant&quot; ci-dessus.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {registrations.map(reg => (
                  <div key={reg.id}
                    onClick={() => openDetail(reg)}
                    className="rounded-xl p-4 flex items-center justify-between gap-4 cursor-pointer hover:shadow-md transition-all"
                    style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB' }}>
                    <div className="min-w-0 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0"
                        style={{ backgroundColor: '#F97316' }}>
                        {reg.restaurant_name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm" style={{ color: '#111111' }}>{reg.restaurant_name}</p>
                          <Badge variant={STATUS_CONFIG[reg.status].variant}>{STATUS_CONFIG[reg.status].label}</Badge>
                          {reg.restaurant_id && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}>
                              <Store className="w-3 h-3" />Boutique créée
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs" style={{ color: '#9CA3AF' }}>
                          <span>{reg.admin_name}</span>
                          {reg.city && <span><MapPin className="w-3 h-3 inline mr-0.5" />{reg.city}</span>}
                          <span>{formatDate(reg.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-sm font-bold uppercase tracking-wide mb-3" style={{ color: '#9CA3AF' }}>
              Liste d&apos;attente ({waitlist.length})
            </h2>
            {waitlist.length === 0 ? (
              <p className="text-sm" style={{ color: '#9CA3AF' }}>Personne en liste d&apos;attente.</p>
            ) : (
              <div className="space-y-2">
                {waitlist.map(lead => (
                  <div key={lead.id}
                    className="rounded-xl p-4 flex items-center justify-between gap-4"
                    style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB' }}>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm" style={{ color: '#111111' }}>{lead.prenom}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs" style={{ color: '#9CA3AF' }}>
                        <span>{lead.whatsapp}</span>
                        <span>{formatDate(lead.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <a
                        href={`https://wa.me/${lead.whatsapp.replace(/\D/g, '')}`}
                        target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg text-white"
                        style={{ backgroundColor: '#25D366' }}>
                        <MessageCircle className="w-3.5 h-3.5" />
                        WhatsApp
                      </a>
                      <button
                        onClick={() => toggleContacted(lead)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
                        style={lead.contacted
                          ? { backgroundColor: '#F0FDF4', color: '#22C55E', border: '1px solid #BBF7D0' }
                          : { backgroundColor: '#F9FAFB', color: '#6B7280', border: '1px solid #E5E7EB' }}>
                        <Check className="w-3.5 h-3.5" />
                        {lead.contacted ? 'Contacté' : 'Marquer contacté'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Panel détail */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative w-full max-w-lg bg-white h-full overflow-y-auto shadow-2xl flex flex-col"
            style={{ borderLeft: '1px solid #E5E7EB' }}>

            <div className="sticky top-0 bg-white z-10 px-6 py-4 flex items-center justify-between"
              style={{ borderBottom: '1px solid #E5E7EB' }}>
              <div>
                <p className="font-bold text-gray-900">{selected.restaurant_name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant={STATUS_CONFIG[selected.status].variant}>{STATUS_CONFIG[selected.status].label}</Badge>
                  <span className="text-xs text-gray-400">{formatDate(selected.created_at)}</span>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 flex-1">

              {acceptResult && (
                <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                  <p className="text-green-700 font-bold text-sm">Boutique créée avec succès !</p>
                  <p className="text-green-600 text-xs">
                    Mot de passe temporaire : <strong className="font-mono bg-green-100 px-1.5 py-0.5 rounded">{acceptResult.tempPassword}</strong>
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <a href={acceptResult.whatsappUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg text-white"
                      style={{ backgroundColor: '#25D366' }}>
                      <MessageCircle className="w-3.5 h-3.5" />
                      Envoyer les identifiants WhatsApp
                    </a>
                    <a href={`/${acceptResult.slug}`} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-green-700 font-semibold underline py-2">
                      <ExternalLink className="w-3 h-3" />Voir le site
                    </a>
                  </div>
                </div>
              )}

              {actionError && (
                <div className="rounded-xl p-3.5" style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }}>
                  <p className="text-xs" style={{ color: '#991B1B' }}>{actionError}</p>
                </div>
              )}

              <Section title="Compte">
                <Row label="Responsable" value={selected.admin_name} />
                <Row label="Téléphone" value={selected.phone} />
                <Row label="WhatsApp" value={selected.whatsapp} />
              </Section>

              <Section title="Localisation">
                {selected.city && <Row label="Ville" value={selected.city} />}
                {selected.neighborhood && <Row label="Quartier" value={selected.neighborhood} />}
                {selected.address && <Row label="Adresse" value={selected.address} />}
                {!selected.city && !selected.neighborhood && !selected.address && <Row label="—" value="Non renseigné" />}
              </Section>

              <Section title="Paiement">
                <Row label="Wave" value={selected.wave_number || '—'} />
                <Row label="Orange Money" value={selected.orange_money_number || '—'} />
              </Section>

              {(selected.facebook_url || selected.instagram_url || selected.tiktok_url || selected.snapchat_url) && (
                <Section title="Réseaux sociaux">
                  {selected.instagram_url && <UrlRow label="Instagram" url={selected.instagram_url} />}
                  {selected.facebook_url && <UrlRow label="Facebook" url={selected.facebook_url} />}
                  {selected.tiktok_url && <UrlRow label="TikTok" url={selected.tiktok_url} />}
                  {selected.snapchat_url && <UrlRow label="Snapchat" url={selected.snapchat_url} />}
                </Section>
              )}

              {(selected.logo_url || selected.banner_url) && (
                <Section title="Images">
                  <div className="flex flex-wrap gap-2 p-3">
                    {selected.logo_url && <img src={selected.logo_url} alt="Logo" className="h-14 w-14 rounded-xl object-cover" style={{ border: '1px solid #E5E7EB' }} />}
                    {selected.banner_url && <img src={selected.banner_url} alt="Bannière" className="h-14 w-28 rounded-xl object-cover" style={{ border: '1px solid #E5E7EB' }} />}
                  </div>
                </Section>
              )}
            </div>

            <div className="sticky bottom-0 bg-white px-6 py-4 space-y-2" style={{ borderTop: '1px solid #E5E7EB' }}>
              <a href={`https://wa.me/${selected.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ backgroundColor: '#25D366' }}>
                <MessageCircle className="w-3.5 h-3.5" />
                Contacter sur WhatsApp
              </a>

              {selected.status === 'pending' && !selected.restaurant_id && (
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => handleAccept(selected)} disabled={accepting}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60"
                    style={{ backgroundColor: '#22C55E' }}>
                    {accepting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Store className="w-3.5 h-3.5" />}
                    Créer la boutique
                  </button>
                  <button onClick={() => handleRefuse(selected)}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold"
                    style={{ backgroundColor: '#FEF2F2', color: '#EF4444', border: '1px solid #FECACA' }}>
                    <X className="w-3.5 h-3.5" />
                    Refuser
                  </button>
                </div>
              )}

              {selected.restaurant_id && (
                <button onClick={() => handleDeleteShop(selected)} disabled={deletingShop}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60"
                  style={{ backgroundColor: '#FEF2F2', color: '#EF4444', border: '1px solid #FECACA' }}>
                  {deletingShop ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Store className="w-3.5 h-3.5" />}
                  Supprimer la boutique
                </button>
              )}

              {!selected.restaurant_id && (
                <button onClick={() => handleDeleteRegistration(selected)} disabled={deletingReg}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60"
                  style={{ backgroundColor: '#F9FAFB', color: '#6B7280', border: '1px solid #E5E7EB' }}>
                  {deletingReg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  Supprimer l&apos;inscription
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: '#9CA3AF' }}>{title}</p>
      <div className="rounded-xl overflow-hidden space-y-0" style={{ border: '1px solid #E5E7EB' }}>
        {children}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 px-4 py-2.5" style={{ borderBottom: '1px solid #F3F4F6' }}>
      <span className="text-xs text-gray-400 flex-shrink-0 w-28">{label}</span>
      <span className="text-xs font-medium break-all" style={{ color: '#111111' }}>{value}</span>
    </div>
  )
}

function UrlRow({ label, url }: { label: string; url: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5" style={{ borderBottom: '1px solid #F3F4F6' }}>
      <span className="text-xs text-gray-400 w-28">{label}</span>
      <a href={url} target="_blank" rel="noopener noreferrer"
        className="text-xs text-orange-500 hover:underline truncate flex items-center gap-1">
        <ExternalLink className="w-3 h-3 flex-shrink-0" />{url}
      </a>
    </div>
  )
}
