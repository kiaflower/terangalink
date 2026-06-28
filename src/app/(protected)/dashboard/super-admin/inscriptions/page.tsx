'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/Badge'
import { Loader2, Eye, MessageCircle, Check, X, Phone, Mail, MapPin, Clock, ExternalLink, ChevronRight } from 'lucide-react'
import { formatDate } from '@/lib/utils'

type AppStatus = 'pending' | 'accepted' | 'refused' | 'contacted'

interface Application {
  id: string
  created_at: string
  owner_name: string
  restaurant_name: string
  email: string
  whatsapp: string
  cuisine_type: string | null
  description: string | null
  address: string | null
  city: string | null
  google_maps_url: string | null
  opening_hours: Record<string, { ouverture: string; fermeture: string; ferme: boolean }> | null
  logo_url: string | null
  banner_url: string | null
  menu_image_url: string | null
  product_photos: string[]
  facebook_url: string | null
  instagram_url: string | null
  tiktok_url: string | null
  snapchat_url: string | null
  selected_plan: string
  color_choice: 'terangalink' | 'custom' | null
  primary_color: string | null
  secondary_color: string | null
  allow_social_media: boolean
  allow_photos: boolean
  allow_promo_offer: boolean
  promo_offer_type: string | null
  promo_offer_custom: string | null
  status: AppStatus
  admin_notes: string | null
}

const STATUS_CONFIG: Record<AppStatus, { label: string; variant: 'warning' | 'success' | 'danger' | 'info' | 'default' }> = {
  pending:   { label: 'En attente',  variant: 'warning' },
  accepted:  { label: 'Acceptée',    variant: 'success' },
  refused:   { label: 'Refusée',     variant: 'danger' },
  contacted: { label: 'Contactée',   variant: 'info' },
}

const FILTERS: { key: 'all' | AppStatus; label: string }[] = [
  { key: 'all', label: 'Toutes' },
  { key: 'pending', label: 'En attente' },
  { key: 'accepted', label: 'Acceptées' },
  { key: 'contacted', label: 'Contactées' },
  { key: 'refused', label: 'Refusées' },
]

const JOURS_ORDER = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
const JOUR_LABELS: Record<string, string> = {
  lundi: 'Lun', mardi: 'Mar', mercredi: 'Mer', jeudi: 'Jeu',
  vendredi: 'Ven', samedi: 'Sam', dimanche: 'Dim',
}

export default function InscriptionsPage() {
  const supabase = createClient()
  const [apps, setApps] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | AppStatus>('pending')
  const [selected, setSelected] = useState<Application | null>(null)
  const [accepting, setAccepting] = useState(false)
  const [refusing, setRefusing] = useState(false)
  const [contacting, setContacting] = useState(false)
  const [acceptResult, setAcceptResult] = useState<{ tempPassword: string; slug: string; whatsappUrl: string } | null>(null)
  const [notes, setNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('restaurant_applications')
      .select('*')
      .order('created_at', { ascending: false })
    setApps((data as Application[]) ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  const filtered = filter === 'all' ? apps : apps.filter(a => a.status === filter)

  function openDetail(app: Application) {
    setSelected(app)
    setNotes(app.admin_notes ?? '')
    setAcceptResult(null)
  }

  async function handleAccept() {
    if (!selected) return
    if (!confirm(`Accepter la demande de ${selected.restaurant_name} ?`)) return
    setAccepting(true)
    const res = await fetch('/api/super-admin/accept-application', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ application_id: selected.id }),
    })
    const data = await res.json()
    setAccepting(false)
    if (!res.ok) { alert(data.error || 'Erreur'); return }
    // Construire l'URL WhatsApp sans l'ouvrir (popup bloqué après async)
    const msg = encodeURIComponent(
      `Bonjour ${data.owner_name}, votre restaurant ${data.restaurant_name} est maintenant en ligne sur TerangaLink ! ` +
      `Voici vos identifiants : Email : ${data.email} / Mot de passe temporaire : ${data.tempPassword}. ` +
      `Connectez-vous sur teranga-link.com/login`
    )
    const whatsappUrl = `https://wa.me/${data.whatsapp.replace(/\D/g, '')}?text=${msg}`

    setAcceptResult({ tempPassword: data.tempPassword, slug: data.slug, whatsappUrl })
    setApps(prev => prev.map(a => a.id === selected.id ? { ...a, status: 'accepted' } : a))
    setSelected(s => s ? { ...s, status: 'accepted' } : s)
  }

  async function handleContact() {
    if (!selected) return
    setContacting(true)
    await supabase.from('restaurant_applications')
      .update({ status: 'contacted', updated_at: new Date().toISOString() })
      .eq('id', selected.id)
    setApps(prev => prev.map(a => a.id === selected.id ? { ...a, status: 'contacted' } : a))
    setSelected(s => s ? { ...s, status: 'contacted' } : s)
    setContacting(false)
    const msg = encodeURIComponent(
      `Bonjour ${selected.owner_name}, nous avons bien reçu votre demande d'inscription pour ${selected.restaurant_name} sur TerangaLink. ` +
      `Pouvez-vous nous confirmer quelques informations ?`
    )
    window.open(`https://wa.me/${selected.whatsapp.replace(/\D/g, '')}?text=${msg}`, '_blank')
  }

  async function handleRefuse() {
    if (!selected) return
    if (!confirm(`Refuser la demande de ${selected.restaurant_name} ?`)) return
    setRefusing(true)
    await supabase.from('restaurant_applications')
      .update({ status: 'refused', updated_at: new Date().toISOString() })
      .eq('id', selected.id)
    setApps(prev => prev.map(a => a.id === selected.id ? { ...a, status: 'refused' } : a))
    setSelected(s => s ? { ...s, status: 'refused' } : s)
    setRefusing(false)
  }

  async function saveNotes() {
    if (!selected) return
    setSavingNotes(true)
    await supabase.from('restaurant_applications')
      .update({ admin_notes: notes, updated_at: new Date().toISOString() })
      .eq('id', selected.id)
    setSavingNotes(false)
  }

  return (
    <div className="p-6 sm:p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Inscriptions</h1>
        <p className="text-gray-500 text-sm mt-1">{apps.length} demande(s) reçue(s)</p>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 flex-wrap mb-6">
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={{
              backgroundColor: filter === f.key ? '#F97316' : '#F3F4F6',
              color: filter === f.key ? '#FFFFFF' : '#6B7280',
            }}>
            {f.label}
            <span className="ml-1.5 opacity-70">
              ({f.key === 'all' ? apps.length : apps.filter(a => a.status === f.key).length})
            </span>
          </button>
        ))}
      </div>

      {/* Liste */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-400 text-sm">Aucune demande pour ce filtre</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(app => (
            <div key={app.id}
              className="rounded-2xl p-5 flex items-center gap-4 transition-all hover:shadow-md cursor-pointer"
              style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB' }}
              onClick={() => openDetail(app)}>

              {/* Avatar */}
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                style={{ backgroundColor: '#F97316' }}>
                {app.restaurant_name.charAt(0)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900 truncate">{app.restaurant_name}</p>
                  <Badge variant={STATUS_CONFIG[app.status].variant}>{STATUS_CONFIG[app.status].label}</Badge>
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{ backgroundColor: '#FFF7ED', color: '#EA580C' }}>
                    {app.selected_plan}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 mt-1 text-xs text-gray-400">
                  <span>{app.owner_name}</span>
                  {app.city && <span><MapPin className="w-3 h-3 inline mr-0.5" />{app.city}</span>}
                  <span>{app.whatsapp}</span>
                  <span>{formatDate(app.created_at)}</span>
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
            </div>
          ))}
        </div>
      )}

      {/* Panel détail */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative w-full max-w-lg bg-white h-full overflow-y-auto shadow-2xl flex flex-col"
            style={{ borderLeft: '1px solid #E5E7EB' }}>

            {/* Header panneau */}
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

              {/* Résultat accept */}
              {acceptResult && (
                <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                  <p className="text-green-700 font-bold text-sm">Restaurant créé avec succès !</p>
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

              {/* Compte */}
              <Section title="Compte">
                <Row icon={<Phone className="w-3.5 h-3.5" />} label="Responsable" value={selected.owner_name} />
                <Row icon={<Mail className="w-3.5 h-3.5" />} label="Email" value={selected.email} />
                <Row icon={<MessageCircle className="w-3.5 h-3.5" />} label="WhatsApp" value={selected.whatsapp} />
                <Row label="Plan choisi" value={selected.selected_plan.toUpperCase()} highlight />
              </Section>

              {/* Restaurant */}
              <Section title="Restaurant">
                {selected.cuisine_type && <Row label="Type de cuisine" value={selected.cuisine_type} />}
                {selected.description && <Row label="Description" value={selected.description} />}
                {selected.city && <Row icon={<MapPin className="w-3.5 h-3.5" />} label="Ville" value={selected.city} />}
                {selected.address && <Row label="Adresse" value={selected.address} />}
                {selected.google_maps_url && (
                  <a href={selected.google_maps_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-orange-500 hover:underline mt-1">
                    <ExternalLink className="w-3 h-3" />Voir sur Google Maps
                  </a>
                )}
              </Section>

              {/* Horaires */}
              {selected.opening_hours && Object.keys(selected.opening_hours).length > 0 && (
                <Section title="Horaires">
                  <div className="space-y-1">
                    {JOURS_ORDER.map(jour => {
                      const h = selected.opening_hours?.[jour]
                      if (!h) return null
                      return (
                        <div key={jour} className="flex items-center justify-between text-xs">
                          <span className="text-gray-500 w-8">{JOUR_LABELS[jour]}</span>
                          {h.ferme
                            ? <span className="text-red-400">Fermé</span>
                            : <span className="text-gray-700 font-medium">{h.ouverture} – {h.fermeture}</span>
                          }
                        </div>
                      )
                    })}
                  </div>
                </Section>
              )}

              {/* Réseaux */}
              {(selected.facebook_url || selected.instagram_url || selected.tiktok_url || selected.snapchat_url) && (
                <Section title="Réseaux sociaux">
                  {selected.facebook_url && <UrlRow label="Facebook" url={selected.facebook_url} />}
                  {selected.instagram_url && <UrlRow label="Instagram" url={selected.instagram_url} />}
                  {selected.tiktok_url && <UrlRow label="TikTok" url={selected.tiktok_url} />}
                  {selected.snapchat_url && <UrlRow label="Snapchat" url={selected.snapchat_url} />}
                </Section>
              )}

              {/* Couleurs */}
              {(selected.selected_plan === 'pro' || selected.selected_plan === 'premium') && (
                <Section title="Couleurs personnalisées">
                  {selected.color_choice === 'custom' && selected.primary_color ? (
                    <div className="px-4 py-3 flex items-center gap-3">
                      <div className="flex gap-2">
                        <div className="w-7 h-7 rounded-full shadow-sm border border-gray-100" style={{ backgroundColor: selected.primary_color }} />
                        {selected.secondary_color && (
                          <div className="w-7 h-7 rounded-full shadow-sm border border-gray-100" style={{ backgroundColor: selected.secondary_color }} />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-medium" style={{ color: '#111111' }}>
                          {selected.primary_color} · {selected.secondary_color}
                        </p>
                        <p className="text-xs" style={{ color: '#6B7280' }}>Couleurs choisies par le restaurant</p>
                      </div>
                    </div>
                  ) : (
                    <div className="px-4 py-3">
                      <p className="text-xs" style={{ color: '#6B7280' }}>Laissé à TerangaLink — couleurs à définir par l&apos;équipe</p>
                    </div>
                  )}
                </Section>
              )}

              {/* Communication */}
              <Section title="Communication">
                <Row label="Réseaux sociaux" value={selected.allow_social_media ? 'Oui' : 'Non'} />
                <Row label="Utilisation photos" value={selected.allow_photos ? 'Oui' : 'Non'} />
                {selected.allow_promo_offer && (
                  <Row label="Offre promo" value={
                    selected.promo_offer_type === '10_percent' ? '-10%'
                    : selected.promo_offer_type === 'free_delivery' ? 'Livraison offerte'
                    : selected.promo_offer_custom || 'Personnalisée'
                  } />
                )}
              </Section>

              {/* Images */}
              {(selected.logo_url || selected.banner_url || selected.menu_image_url || (selected.product_photos?.length > 0)) && (
                <Section title="Images">
                  <div className="flex flex-wrap gap-2">
                    {selected.logo_url && (
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Logo</p>
                        <img src={selected.logo_url} alt="Logo" className="h-14 w-14 rounded-xl object-cover" style={{ border: '1px solid #E5E7EB' }} />
                      </div>
                    )}
                    {selected.banner_url && (
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Bannière</p>
                        <img src={selected.banner_url} alt="Bannière" className="h-14 w-28 rounded-xl object-cover" style={{ border: '1px solid #E5E7EB' }} />
                      </div>
                    )}
                    {selected.menu_image_url && (
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Menu</p>
                        <img src={selected.menu_image_url} alt="Menu" className="h-14 w-20 rounded-xl object-cover" style={{ border: '1px solid #E5E7EB' }} />
                      </div>
                    )}
                  </div>
                  {selected.product_photos?.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-400 mb-1">Photos produits</p>
                      <div className="flex flex-wrap gap-2">
                        {selected.product_photos.map((url, i) => (
                          <img key={i} src={url} alt="" className="h-12 w-12 rounded-lg object-cover" style={{ border: '1px solid #E5E7EB' }} />
                        ))}
                      </div>
                    </div>
                  )}
                </Section>
              )}

              {/* Notes internes */}
              <Section title="Notes internes">
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Notes visibles uniquement par l'équipe TerangaLink..."
                  className="w-full px-3 py-2.5 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-400"
                  style={{ border: '1px solid #E5E7EB', backgroundColor: '#F9FAFB', color: '#111111' }}
                />
                <button onClick={saveNotes} disabled={savingNotes}
                  className="mt-2 text-xs font-semibold px-4 py-1.5 rounded-lg text-white disabled:opacity-50"
                  style={{ backgroundColor: '#6B7280' }}>
                  {savingNotes ? 'Sauvegarde...' : 'Sauvegarder les notes'}
                </button>
              </Section>
            </div>

            {/* Actions */}
            {selected.status !== 'accepted' && selected.status !== 'refused' && (
              <div className="sticky bottom-0 bg-white px-6 py-4 space-y-2" style={{ borderTop: '1px solid #E5E7EB' }}>
                <button onClick={handleAccept} disabled={accepting}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60 transition-opacity hover:opacity-90"
                  style={{ backgroundColor: '#22C55E' }}>
                  {accepting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {accepting ? 'Création en cours...' : 'Accepter et créer le restaurant'}
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={handleContact} disabled={contacting}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60"
                    style={{ backgroundColor: '#FFF7ED', color: '#EA580C', border: '1px solid #FED7AA' }}>
                    {contacting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageCircle className="w-3.5 h-3.5" />}
                    Contacter
                  </button>
                  <button onClick={handleRefuse} disabled={refusing}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60"
                    style={{ backgroundColor: '#FEF2F2', color: '#EF4444', border: '1px solid #FECACA' }}>
                    {refusing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                    Refuser
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

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

function Row({ icon, label, value, highlight }: { icon?: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-start gap-3 px-4 py-2.5" style={{ borderBottom: '1px solid #F3F4F6' }}>
      {icon && <span className="text-gray-400 mt-0.5 flex-shrink-0">{icon}</span>}
      <span className="text-xs text-gray-400 flex-shrink-0 w-28">{label}</span>
      <span className="text-xs font-medium break-all" style={{ color: highlight ? '#F97316' : '#111111' }}>{value}</span>
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
