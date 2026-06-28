'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Zap, MessageCircle, CheckCircle2, XCircle, Clock, Play, X, ChevronDown, Plus } from 'lucide-react'

const WA_NUMBER = '221774739266'

type BoostType = 'mise_en_avant' | 'meta_ads' | 'combo'
type BoostStatus = 'en_attente' | 'paye' | 'en_cours' | 'termine' | 'annule'

const PRICES: Record<BoostType, Record<number, number>> = {
  mise_en_avant: { 7: 3000, 15: 5000, 30: 9000 },
  meta_ads:      { 7: 10000, 15: 17000, 30: 28000 },
  combo:         { 7: 12000, 15: 20000, 30: 35000 },
}

const TYPE_LABELS: Record<BoostType, string> = {
  mise_en_avant: 'Mise en avant annuaire',
  meta_ads: 'Meta Ads',
  combo: 'Combo (annuaire + Meta)',
}

const STATUS_LABELS: Record<BoostStatus, string> = {
  en_attente: 'En attente',
  paye:       'Payé',
  en_cours:   'En cours',
  termine:    'Terminé',
  annule:     'Annulé',
}

const STATUS_COLORS: Record<BoostStatus, { bg: string; text: string }> = {
  en_attente: { bg: '#FEF3C7', text: '#92400E' },
  paye:       { bg: '#DBEAFE', text: '#1E40AF' },
  en_cours:   { bg: '#DCFCE7', text: '#14532D' },
  termine:    { bg: '#F3F4F6', text: '#4B5563' },
  annule:     { bg: '#FEE2E2', text: '#7F1D1D' },
}

interface Restaurant { id: string; name: string }

interface BoostRequest {
  id: string
  restaurant_id: string
  restaurant_name?: string
  type: BoostType
  duree: number
  prix: number
  statut: BoostStatus
  date_demande: string
  date_debut: string | null
  date_fin: string | null
  notes_internes: string | null
}

function formatPrice(n: number) { return n.toLocaleString('fr-FR') + ' FCFA' }

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function buildWaConfirmation(req: BoostRequest): string {
  return [
    `Bonjour ${req.restaurant_name || 'Restaurant'},`,
    ``,
    `Voici la confirmation de votre demande de boost TerangaLink :`,
    ``,
    `• Type : ${TYPE_LABELS[req.type]}`,
    `• Durée : ${req.duree} jours`,
    `• Prix : ${formatPrice(req.prix)}`,
    req.date_debut ? `• Début : ${req.date_debut}` : '',
    req.date_fin   ? `• Fin : ${req.date_fin}` : '',
    `• Statut : ${STATUS_LABELS[req.statut]}`,
    ``,
    `Merci de votre confiance — l'équipe TerangaLink 🙏`,
  ].filter(Boolean).join('\n')
}

const inputClass = "w-full px-3 py-2.5 rounded-xl text-sm bg-white text-gray-900 placeholder-gray-400"
const inputStyle = { border: '1px solid #E5E7EB' }
const selectClass = "w-full appearance-none px-3 py-2.5 rounded-xl text-sm bg-white text-gray-900 pr-8"

export default function BoostRequestsPage() {
  const supabase = createClient()
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [requests, setRequests] = useState<BoostRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filterStatus, setFilterStatus] = useState<BoostStatus | 'all'>('all')
  const [filterType, setFilterType] = useState<BoostType | 'all'>('all')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Activation inline
  const [activatingId, setActivatingId] = useState<string | null>(null)
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))

  // Formulaire création manuelle
  const [fRestaurantId, setFRestaurantId] = useState('')
  const [fType, setFType] = useState<BoostType>('mise_en_avant')
  const [fDuree, setFDuree] = useState<7 | 15 | 30>(7)
  const [fPrix, setFPrix] = useState(PRICES['mise_en_avant'][7])
  const [fDateDebut, setFDateDebut] = useState(new Date().toISOString().slice(0, 10))
  const fDateFin = fDateDebut ? addDays(fDateDebut, fDuree) : ''
  const [fStatut, setFStatut] = useState<BoostStatus>('en_attente')
  const [fNotes, setFNotes] = useState('')

  // Sync prix auto
  useEffect(() => { setFPrix(PRICES[fType][fDuree]) }, [fType, fDuree])

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [{ data: reqsData }, { data: restosData }] = await Promise.all([
      supabase.from('boost_requests').select('*').order('date_demande', { ascending: false }),
      supabase.from('restaurants').select('id, name').order('name'),
    ])
    setRestaurants(restosData ?? [])
    if (reqsData) {
      const restoMap: Record<string, string> = {}
      for (const r of restosData ?? []) restoMap[r.id] = r.name
      setRequests(reqsData.map(r => ({ ...r, restaurant_name: restoMap[r.restaurant_id] ?? '—' })))
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleCreate() {
    if (!fRestaurantId) { setFormError('Sélectionnez un restaurant'); return }
    setSaving(true); setFormError(null)
    const { error } = await supabase.from('boost_requests').insert({
      restaurant_id: fRestaurantId,
      type: fType,
      duree: fDuree,
      prix: fPrix,
      statut: fStatut,
      date_debut: fDateDebut || null,
      date_fin: fDateFin || null,
      notes_internes: fNotes.trim() || null,
    } as never)
    setSaving(false)
    if (error) { setFormError(error.message); return }
    setShowForm(false)
    setFRestaurantId(''); setFType('mise_en_avant'); setFDuree(7); setFStatut('en_attente'); setFNotes('')
    fetchData()
  }

  async function updateStatus(req: BoostRequest, statut: BoostStatus, dateDebut?: string) {
    const updates: Record<string, unknown> = { statut }
    if (statut === 'en_cours' && dateDebut) {
      updates.date_debut = dateDebut
      updates.date_fin = addDays(dateDebut, req.duree)
      if (req.type === 'mise_en_avant' || req.type === 'combo') {
        await supabase.from('restaurants').update({ is_boosted: true } as never).eq('id', req.restaurant_id)
      }
    }
    if (statut === 'termine') {
      if (req.type === 'mise_en_avant' || req.type === 'combo') {
        await supabase.from('restaurants').update({ is_boosted: false } as never).eq('id', req.restaurant_id)
      }
    }
    await supabase.from('boost_requests').update(updates as never).eq('id', req.id)
    setActivatingId(null)
    fetchData()
  }

  async function deleteRequest(id: string) {
    if (!confirm('Supprimer cette demande ?')) return
    await supabase.from('boost_requests').delete().eq('id', id)
    fetchData()
  }

  const filtered = requests.filter(r => {
    if (filterStatus !== 'all' && r.statut !== filterStatus) return false
    if (filterType !== 'all' && r.type !== filterType) return false
    return true
  })

  return (
    <div className="p-4 sm:p-8 max-w-5xl">

      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-5 h-5" style={{ color: '#F97316' }} />
            <h1 className="text-2xl font-black text-gray-900">Demandes de boost</h1>
          </div>
          <p className="text-sm text-gray-500">Les demandes arrivent automatiquement ou peuvent être créées manuellement.</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white flex-shrink-0"
          style={{ backgroundColor: '#F97316' }}
        >
          <Plus className="w-4 h-4" />
          Nouvelle demande
        </button>
      </div>

      {/* Formulaire création manuelle */}
      {showForm && (
        <div className="rounded-2xl p-6 mb-8" style={{ border: '2px solid #F97316', backgroundColor: '#FFF7ED' }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-gray-900">Nouvelle demande manuelle</h2>
            <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Restaurant */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Restaurant *</label>
              <div className="relative">
                <select value={fRestaurantId} onChange={e => setFRestaurantId(e.target.value)}
                  className={selectClass} style={inputStyle}>
                  <option value="">Sélectionner un restaurant…</option>
                  {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Type */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Formule</label>
              <div className="relative">
                <select value={fType} onChange={e => setFType(e.target.value as BoostType)}
                  className={selectClass} style={inputStyle}>
                  <option value="mise_en_avant">Mise en avant annuaire</option>
                  <option value="meta_ads">Meta Ads</option>
                  <option value="combo">Combo (annuaire + Meta)</option>
                </select>
                <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Durée */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Durée</label>
              <div className="relative">
                <select value={fDuree} onChange={e => setFDuree(Number(e.target.value) as 7 | 15 | 30)}
                  className={selectClass} style={inputStyle}>
                  <option value={7}>7 jours</option>
                  <option value={15}>15 jours</option>
                  <option value={30}>30 jours</option>
                </select>
                <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Prix */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Prix (FCFA)</label>
              <input type="number" value={fPrix} onChange={e => setFPrix(Number(e.target.value))}
                className={inputClass} style={inputStyle} />
            </div>

            {/* Statut */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Statut</label>
              <div className="relative">
                <select value={fStatut} onChange={e => setFStatut(e.target.value as BoostStatus)}
                  className={selectClass} style={inputStyle}>
                  {(Object.keys(STATUS_LABELS) as BoostStatus[]).map(s => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Date début */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Date de début</label>
              <input type="date" value={fDateDebut} onChange={e => setFDateDebut(e.target.value)}
                className={inputClass} style={inputStyle} />
            </div>

            {/* Date fin */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Date de fin (calculée)</label>
              <input type="date" value={fDateFin} readOnly
                className="w-full px-3 py-2.5 rounded-xl text-sm bg-gray-100 text-gray-500 cursor-not-allowed"
                style={inputStyle} />
            </div>

            {/* Notes */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Notes internes <span className="font-normal text-gray-400">(optionnel)</span></label>
              <textarea rows={2} value={fNotes} onChange={e => setFNotes(e.target.value)}
                placeholder="Ex : contact WhatsApp le 28/06, paiement Wave attendu…"
                className={`${inputClass} resize-none`} style={inputStyle} />
            </div>
          </div>

          {formError && <p className="mt-3 text-sm text-red-600">{formError}</p>}

          <div className="flex items-center gap-3 mt-5">
            <button onClick={handleCreate} disabled={saving}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
              style={{ backgroundColor: '#F97316' }}>
              {saving ? 'Enregistrement…' : 'Créer la demande'}
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-white transition-colors">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="flex flex-wrap gap-2 mb-6">
        <div className="relative">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as BoostStatus | 'all')}
            className="appearance-none pl-3 pr-8 py-2 rounded-xl text-sm bg-white text-gray-900 font-medium"
            style={{ border: '1px solid #E5E7EB' }}>
            <option value="all">Tous les statuts</option>
            {(Object.keys(STATUS_LABELS) as BoostStatus[]).map(s => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        <div className="relative">
          <select value={filterType} onChange={e => setFilterType(e.target.value as BoostType | 'all')}
            className="appearance-none pl-3 pr-8 py-2 rounded-xl text-sm bg-white text-gray-900 font-medium"
            style={{ border: '1px solid #E5E7EB' }}>
            <option value="all">Tous les types</option>
            {(Object.keys(TYPE_LABELS) as BoostType[]).map(t => (
              <option key={t} value={t}>{TYPE_LABELS[t]}</option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        <span className="px-3 py-2 rounded-xl text-sm text-gray-500 font-medium"
          style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}>
          {filtered.length} demande{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Chargement…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">Aucune demande de boost.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(req => {
            const sc = STATUS_COLORS[req.statut]
            const isActivating = activatingId === req.id
            return (
              <div key={req.id} className="rounded-2xl p-5" style={{ border: '1px solid #E5E7EB', backgroundColor: '#FFFFFF' }}>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <p className="font-bold text-gray-900 truncate">{req.restaurant_name}</p>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: sc.bg, color: sc.text }}>
                        {STATUS_LABELS[req.statut]}
                      </span>
                      {req.type === 'combo' && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white"
                          style={{ backgroundColor: '#F97316' }}>Combo</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span>{TYPE_LABELS[req.type]}</span>
                      <span>{req.duree} jours</span>
                      <span className="font-semibold text-gray-700">{formatPrice(req.prix)}</span>
                      {req.date_debut && <span>Du {req.date_debut} au {req.date_fin}</span>}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Demande reçue le {new Date(req.date_demande).toLocaleDateString('fr-FR')}
                    </p>
                    {req.notes_internes && (
                      <p className="mt-1.5 text-xs text-gray-400 italic">{req.notes_internes}</p>
                    )}

                    {/* Activation date */}
                    {isActivating && (
                      <div className="mt-3 flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-gray-700">Date de début :</span>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                          className="px-2 py-1 rounded-lg text-xs text-gray-900 bg-white"
                          style={{ border: '1px solid #E5E7EB' }} />
                        <button onClick={() => updateStatus(req, 'en_cours', startDate)}
                          className="px-3 py-1 rounded-lg text-xs font-bold text-white"
                          style={{ backgroundColor: '#F97316' }}>
                          Confirmer
                        </button>
                        <button onClick={() => setActivatingId(null)}
                          className="px-3 py-1 rounded-lg text-xs text-gray-500 hover:bg-gray-100">
                          Annuler
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                    <a href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(buildWaConfirmation(req))}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white"
                      style={{ backgroundColor: '#25D366' }}>
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Confirmer</span>
                    </a>

                    {req.statut === 'en_attente' && (
                      <button onClick={() => updateStatus(req, 'paye')}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
                        style={{ backgroundColor: '#DBEAFE', color: '#1E40AF' }}>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Payé</span>
                      </button>
                    )}

                    {req.statut === 'paye' && !isActivating && (
                      <button onClick={() => { setActivatingId(req.id); setStartDate(new Date().toISOString().slice(0, 10)) }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white"
                        style={{ backgroundColor: '#F97316' }}>
                        <Play className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Activer</span>
                      </button>
                    )}

                    {req.statut === 'en_cours' && (
                      <button onClick={() => updateStatus(req, 'termine')}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
                        style={{ backgroundColor: '#F3F4F6', color: '#4B5563' }}>
                        <Clock className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Terminer</span>
                      </button>
                    )}

                    {!['termine', 'annule'].includes(req.statut) && (
                      <button onClick={() => updateStatus(req, 'annule')}
                        className="p-2 rounded-xl"
                        style={{ backgroundColor: '#FEE2E2', color: '#B91C1C' }}
                        title="Annuler">
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {['termine', 'annule'].includes(req.statut) && (
                      <button onClick={() => deleteRequest(req.id)}
                        className="p-2 rounded-xl"
                        style={{ backgroundColor: '#F9FAFB', color: '#9CA3AF' }}
                        title="Supprimer">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
