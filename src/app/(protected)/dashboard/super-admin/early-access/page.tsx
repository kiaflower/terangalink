'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { EarlyAccessApplicationRow, EarlyAccessConfigRow, WaitlistRow } from '@/lib/types/database'
import { Ticket, Clock, CheckCircle, Users, X, MessageCircle } from 'lucide-react'

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'En attente', color: '#D97706', bg: '#FFFBEB' },
  contacted: { label: 'Contacté', color: '#2563EB', bg: '#EFF6FF' },
  confirmed: { label: 'Confirmé', color: '#059669', bg: '#F0FDF4' },
  rejected: { label: 'Refusé', color: '#DC2626', bg: '#FEF2F2' },
}

function StatCard({ title, value, icon, color }: { title: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div className="rounded-2xl p-5 border" style={{ backgroundColor: '#F9FAFB', borderColor: '#F3F4F6' }}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-gray-500 text-sm font-medium">{title}</p>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}1A`, color }}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

function InfoRow({ label, value, link }: { label: string; value: string; link?: boolean }) {
  return (
    <div className="flex justify-between gap-3 py-1.5 text-sm">
      <span className="text-gray-400">{label}</span>
      {link ? (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-brand-orange hover:underline truncate max-w-[60%] text-right">{value}</a>
      ) : (
        <span className="text-gray-900 text-right">{value}</span>
      )}
    </div>
  )
}

function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">{title}</p>
      {children}
    </div>
  )
}

export default function EarlyAccessPage() {
  const supabase = createClient()
  const [applications, setApplications] = useState<EarlyAccessApplicationRow[]>([])
  const [config, setConfig] = useState<EarlyAccessConfigRow | null>(null)
  const [waitlist, setWaitlist] = useState<WaitlistRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<EarlyAccessApplicationRow | null>(null)
  const [notesDraft, setNotesDraft] = useState('')
  const [confirming, setConfirming] = useState(false)

  const load = useCallback(async () => {
    const [{ data: apps }, { data: cfg }, { data: wl }] = await Promise.all([
      supabase.from('early_access_applications').select('*').order('created_at', { ascending: true }),
      supabase.from('early_access_config').select('*').single(),
      supabase.from('waitlist').select('*').order('created_at', { ascending: false }),
    ])
    setApplications(apps ?? [])
    setConfig(cfg ?? null)
    setWaitlist(wl ?? [])
    setLoading(false)
    return apps ?? []
  }, [supabase])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    setNotesDraft(selected?.notes_admin ?? '')
  }, [selected])

  async function toggleIsOpen() {
    if (!config) return
    const nextOpen = !config.is_open
    setConfig({ ...config, is_open: nextOpen })
    await supabase.from('early_access_config').update({ is_open: nextOpen }).eq('id', config.id)
  }

  async function updateStatus(id: string, status: EarlyAccessApplicationRow['status']) {
    setApplications(prev => prev.map(a => a.id === id ? { ...a, status } : a))
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : prev)
    await supabase.from('early_access_applications').update({ status }).eq('id', id)
  }

  async function saveNotes() {
    if (!selected) return
    await supabase.from('early_access_applications').update({ notes_admin: notesDraft }).eq('id', selected.id)
    setApplications(prev => prev.map(a => a.id === selected.id ? { ...a, notes_admin: notesDraft } : a))
  }

  async function confirmAndCreateRestaurant(id: string) {
    setConfirming(true)
    try {
      const res = await fetch('/api/super-admin/early-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(data.error || 'Erreur lors de la confirmation')
        return
      }
      const freshApps = await load()
      const updated = freshApps.find(a => a.id === id)
      if (updated) setSelected(updated)
    } finally {
      setConfirming(false)
    }
  }

  if (loading) return <p className="text-gray-400 text-sm py-8">Chargement...</p>

  const confirmed = applications.filter(a => a.status === 'confirmed').length
  const pending = applications.filter(a => a.status === 'pending').length
  const activeCount = applications.filter(a => a.status !== 'rejected').length
  const placesLeft = Math.max(0, (config?.max_places ?? 15) - activeCount)

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Early Access</h1>
          <p className="text-gray-500 text-sm mt-1">Gestion des {config?.max_places ?? 15} premières restaurants</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">Inscriptions {config?.is_open ? 'ouvertes' : 'fermées'}</span>
          <button
            onClick={toggleIsOpen}
            role="switch"
            aria-checked={!!config?.is_open}
            className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0"
            style={{ backgroundColor: config?.is_open ? '#F97316' : '#E5E7EB' }}
          >
            <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
              style={{ transform: config?.is_open ? 'translateX(22px)' : 'translateX(2px)' }} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard title="Places restantes" value={placesLeft} icon={<Ticket className="w-4 h-4" />} color="#F97316" />
        <StatCard title="En attente" value={pending} icon={<Clock className="w-4 h-4" />} color="#D97706" />
        <StatCard title="Confirmées" value={confirmed} icon={<CheckCircle className="w-4 h-4" />} color="#059669" />
        <StatCard title="Liste d'attente" value={waitlist.length} icon={<Users className="w-4 h-4" />} color="#2563EB" />
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl divide-y divide-gray-100 mb-8">
        {applications.length === 0 ? (
          <p className="text-center text-gray-400 py-16 text-sm">Aucune candidature pour le moment</p>
        ) : (
          applications.map(app => {
            const statusInfo = STATUS_LABELS[app.status] ?? STATUS_LABELS.pending
            return (
              <button
                key={app.id}
                onClick={() => setSelected(app)}
                className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50 transition-colors"
              >
                {app.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={app.logo_url} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center font-bold text-brand-orange flex-shrink-0">
                    {app.restaurant_name.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white bg-brand-orange shrink-0">
                      #{app.place_number}
                    </span>
                    <p className="font-semibold text-gray-900 truncate">{app.restaurant_name}</p>
                  </div>
                  <p className="text-xs text-gray-400">{app.cuisine_type} · {app.city}</p>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{app.owner_name} · {app.phone}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: statusInfo.bg, color: statusInfo.color }}>
                    {statusInfo.label}
                  </span>
                  <span className="text-[11px] text-gray-400">{new Date(app.created_at).toLocaleDateString('fr-SN')}</span>
                </div>
              </button>
            )
          })
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <h2 className="font-bold text-gray-900 mb-4">Liste d&apos;attente ({waitlist.length})</h2>
        {waitlist.length === 0 ? (
          <p className="text-sm text-gray-400">Personne pour le moment</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {waitlist.map(w => (
              <div key={w.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{w.name || 'Sans nom'}</p>
                  <p className="text-xs text-gray-400">{w.phone}</p>
                </div>
                <a
                  href={`https://wa.me/${w.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                    `Bonjour ${w.name || ''}, TerangaLink ouvre officiellement bientôt ! Nous vous recontactons dès que les inscriptions sont ouvertes.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg text-white shrink-0"
                  style={{ backgroundColor: '#25D366' }}
                >
                  <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSelected(null)} />
          <div className="relative w-full max-w-lg bg-white h-full overflow-y-auto shadow-2xl border-l border-gray-100">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-100 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                {selected.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selected.logo_url} alt="" className="w-10 h-10 rounded-xl object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center font-bold text-brand-orange">
                    {selected.restaurant_name.charAt(0)}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-gray-900">{selected.restaurant_name}</p>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white bg-brand-orange">
                      Early Access #{selected.place_number}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">{selected.cuisine_type} · {selected.city}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>

            <div className="p-6 space-y-6">
              {selected.cover_url && (
                <InfoSection title="Bannière">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={selected.cover_url} alt="" className="w-full h-36 object-cover rounded-xl border border-gray-100" />
                </InfoSection>
              )}

              {selected.description && (
                <InfoSection title="Description">
                  <p className="text-sm text-gray-700 leading-relaxed">{selected.description}</p>
                </InfoSection>
              )}

              <InfoSection title="Contact">
                <InfoRow label="Responsable" value={selected.owner_name} />
                <InfoRow label="Email" value={selected.email} />
                <InfoRow label="Téléphone" value={selected.phone} />
                <InfoRow label="WhatsApp" value={selected.whatsapp_number} />
              </InfoSection>

              <InfoSection title="Offre">
                <InfoRow label="Plan" value={selected.plan === 'pro' ? 'Pro' : 'Starter'} />
                {selected.partner_offer_type && (
                  <InfoRow
                    label="Offre partenaire"
                    value={
                      selected.partner_offer_type === 'discount_10' ? '-10% de réduction'
                        : selected.partner_offer_type === 'free_delivery' ? 'Livraison gratuite'
                        : `Personnalisée : ${selected.partner_offer_custom ?? ''}`
                    }
                  />
                )}
                {selected.referral_code && <InfoRow label="Code parrainage" value={selected.referral_code} />}
              </InfoSection>

              {(selected.wave_number || selected.orange_money_number) && (
                <InfoSection title="Paiement mobile">
                  {selected.wave_number && <InfoRow label="Wave" value={selected.wave_number} />}
                  {selected.orange_money_number && <InfoRow label="Orange Money" value={selected.orange_money_number} />}
                </InfoSection>
              )}

              {(selected.instagram_url || selected.facebook_url || selected.tiktok_url || selected.snapchat_url) && (
                <InfoSection title="Réseaux sociaux">
                  {selected.instagram_url && <InfoRow label="Instagram" value={selected.instagram_url} link />}
                  {selected.facebook_url && <InfoRow label="Facebook" value={selected.facebook_url} link />}
                  {selected.tiktok_url && <InfoRow label="TikTok" value={selected.tiktok_url} link />}
                  {selected.snapchat_url && <InfoRow label="Snapchat" value={selected.snapchat_url} />}
                </InfoSection>
              )}

              <InfoSection title="Notes internes">
                <textarea
                  value={notesDraft}
                  onChange={e => setNotesDraft(e.target.value)}
                  onBlur={saveNotes}
                  placeholder="Ajouter une note..."
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:border-brand-orange"
                  rows={3}
                />
              </InfoSection>

              {selected.created_restaurant_id && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <p className="text-sm font-semibold text-green-700">Restaurant créée automatiquement</p>
                  </div>
                  {selected.created_admin_password && (
                    <>
                      <p className="text-xs text-green-600 mb-3">
                        Mot de passe admin : <span className="font-mono font-bold">{selected.created_admin_password}</span>
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          const msg = `Bonjour ${selected.owner_name}, votre restaurant ${selected.restaurant_name} est prête sur TerangaLink !\n\nEmail : ${selected.email}\nMot de passe : ${selected.created_admin_password}\n\nConnectez-vous sur : ${window.location.origin}/login`
                          window.open(`https://wa.me/${selected.whatsapp_number.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank')
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

            <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-gray-100 space-y-2">
              <a
                href={`https://wa.me/${selected.whatsapp_number.replace(/\D/g, '')}?text=${encodeURIComponent(
                  `Bonjour ${selected.owner_name}, nous avons bien reçu votre demande d'inscription Early Access pour ${selected.restaurant_name} sur TerangaLink ! Nous allons vous contacter très prochainement pour la suite.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white"
                style={{ backgroundColor: '#25D366' }}>
                <MessageCircle className="w-4 h-4" />
                Contacter sur WhatsApp
              </a>

              {!selected.created_restaurant_id && (
                <button
                  onClick={() => confirmAndCreateRestaurant(selected.id)}
                  disabled={confirming}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                  style={{ backgroundColor: '#F97316' }}>
                  {confirming ? 'Création en cours...' : 'Confirmer & créer le restaurant'}
                </button>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => updateStatus(selected.id, 'contacted')}
                  disabled={selected.status === 'contacted' || selected.status === 'confirmed'}
                  className="py-2.5 rounded-xl text-xs font-semibold border border-gray-200 text-gray-600 disabled:opacity-40">
                  Marquer contacté
                </button>
                <button
                  onClick={() => updateStatus(selected.id, 'rejected')}
                  disabled={selected.status === 'rejected'}
                  className="py-2.5 rounded-xl text-xs font-semibold border border-red-200 text-red-500 disabled:opacity-40">
                  Refuser
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
