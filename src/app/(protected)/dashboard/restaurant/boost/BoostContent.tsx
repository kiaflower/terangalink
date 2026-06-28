'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Zap, UtensilsCrossed, Megaphone, CheckCircle2, MessageCircle, AlertCircle, CheckCircle, X, Calendar } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const WA_NUMBER = '221774739266'

const META_VIEWS: Record<number, string> = {
  7:  '≈ 14 000 à 40 000 vues ciblées au Sénégal',
  15: '≈ 30 000 à 85 000 vues ciblées au Sénégal',
  30: '≈ 60 000 à 170 000 vues ciblées au Sénégal',
}

const DURATIONS: { label: string; days: 7 | 15 | 30; description: string; prices: Record<string, number> }[] = [
  { label: '7 jours',  days: 7,  description: 'Idéal pour un lancement ou une promotion ponctuelle', prices: { mise_en_avant: 3000, meta_ads: 10000, combo: 12000 } },
  { label: '15 jours', days: 15, description: 'Visibilité soutenue sur deux semaines',               prices: { mise_en_avant: 5000, meta_ads: 17000, combo: 20000 } },
  { label: '30 jours', days: 30, description: 'Présence maximale pendant un mois complet',           prices: { mise_en_avant: 9000, meta_ads: 28000, combo: 35000 } },
]

type FormulaKey = 'mise_en_avant' | 'meta_ads' | 'combo'

const FORMULAS: { key: FormulaKey; label: string; shortLabel: string; icon: LucideIcon }[] = [
  { key: 'mise_en_avant', label: 'Mise en avant TerangaLink', shortLabel: 'Mise en avant', icon: UtensilsCrossed },
  { key: 'meta_ads',      label: 'Meta Ads (Instagram, Facebook, WhatsApp)', shortLabel: 'Meta Ads', icon: Megaphone },
  { key: 'combo',         label: 'Combo (Mise en avant + Meta Ads)', shortLabel: 'Combo', icon: Zap },
]

const TYPE_LABELS: Record<FormulaKey, string> = {
  mise_en_avant: 'Mise en avant annuaire',
  meta_ads: 'Meta Ads',
  combo: 'Combo (annuaire + Meta)',
}

function formatPrice(n: number) { return n.toLocaleString('fr-FR') + ' FCFA' }

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function formatDateFR(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

interface ModalState { type: FormulaKey; days: number; prix: number }

export default function BoostPage() {
  const supabase = createClient()

  const [restaurantId, setRestaurantId] = useState('')
  const [restaurantName, setRestaurantName] = useState('')
  const [boostBlocked, setBoostBlocked] = useState(false)
  const [blockedStatut, setBlockedStatut] = useState<string | null>(null)
  const [pageLoading, setPageLoading] = useState(true)

  const [modal, setModal] = useState<ModalState | null>(null)
  const [dateDebut, setDateDebut] = useState(new Date().toISOString().slice(0, 10))
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  const dateFin = modal ? addDays(dateDebut, modal.days) : ''

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles').select('restaurant_id').eq('id', user.id).single()
      const rid = profile?.restaurant_id ?? ''
      setRestaurantId(rid)

      if (rid) {
        const { data: resto } = await supabase.from('restaurants').select('name').eq('id', rid).single()
        setRestaurantName(resto?.name ?? '')

        const { data: existing } = await supabase
          .from('boost_requests')
          .select('statut')
          .eq('restaurant_id', rid)
          .in('statut', ['en_attente', 'en_cours'])
          .maybeSingle()
        setBoostBlocked(!!existing)
        setBlockedStatut(existing?.statut ?? null)
      }
      setPageLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function openModal(type: FormulaKey, days: number, prix: number) {
    setDateDebut(new Date().toISOString().slice(0, 10))
    setMessage('')
    setSendError(null)
    setModal({ type, days, prix })
  }

  function closeModal() { setModal(null); setSendError(null) }

  async function handleSend() {
    if (!modal || !dateDebut) return
    setSending(true)
    setSendError(null)

    const res = await fetch('/api/boost-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurant_id: restaurantId,
        type: modal.type,
        duree: modal.days,
        prix: modal.prix,
        date_debut: dateDebut,
        date_fin: dateFin,
        notes_internes: message.trim() || null,
      }),
    })

    const data = await res.json()
    setSending(false)

    if (!res.ok) {
      if (data.error === 'DOUBLON') { setBoostBlocked(true); closeModal() }
      else setSendError(data.error ?? 'Une erreur est survenue.')
      return
    }

    const nomResto = restaurantName || 'mon restaurant'
    let waMsg = `Bonjour TerangaLink, je souhaite booster mon restaurant ${nomResto} avec la formule ${TYPE_LABELS[modal.type]} pendant ${modal.days} jours (${formatDateFR(dateDebut)} → ${formatDateFR(dateFin)}) pour ${formatPrice(modal.prix)}.`
    if (message.trim()) waMsg += ` ${message.trim()}`
    window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(waMsg)}`, '_blank')

    closeModal()
    setConfirmed(true)
    setBoostBlocked(true)
  }

  const waGeneralUrl = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent("Bonjour TerangaLink, j'ai une question concernant le boost de mon restaurant.")}`
  const waCallUrl   = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent("Bonjour TerangaLink, je souhaite réserver un appel pour discuter du boost de mon restaurant.")}`

  if (pageLoading) {
    return <div className="p-8 text-sm text-gray-400">Chargement…</div>
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl">

      {/* En-tête */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-4"
          style={{ backgroundColor: 'rgba(249,115,22,0.1)', color: '#EA580C' }}>
          <Zap className="w-3.5 h-3.5" />
          Visibilité accrue
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2">Booster mon restaurant</h1>
        <p className="text-gray-500 text-sm sm:text-base max-w-xl">
          Augmentez votre visibilité sur TerangaLink et sur les réseaux sociaux. Choisissez la formule et la durée qui vous conviennent.
        </p>
      </div>

      {/* Bandeau boost actif */}
      {boostBlocked && !confirmed && (
        <div className="flex items-start gap-3 rounded-2xl p-4 mb-6"
          style={{ backgroundColor: '#FFF7ED', border: '1px solid #FED7AA' }}>
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#F97316' }} />
          <div>
            <p className="font-semibold text-sm text-gray-900">
              {blockedStatut === 'en_cours' ? 'Vous avez déjà un boost en cours.' : 'Vous avez déjà un boost en attente de confirmation.'}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">TerangaLink vous contactera sous 24h pour confirmer les modalités de paiement.</p>
          </div>
        </div>
      )}

      {/* Confirmation */}
      {confirmed && (
        <div className="flex items-start gap-3 rounded-2xl p-4 mb-6"
          style={{ backgroundColor: '#F0FDF4', border: '1px solid #86EFAC' }}>
          <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#22c55e' }} />
          <div>
            <p className="font-semibold text-sm text-gray-900">Demande envoyée avec succès !</p>
            <p className="text-xs text-gray-500 mt-0.5">Votre demande a bien été enregistrée. TerangaLink vous contactera sous 24h pour confirmer les modalités de paiement.</p>
          </div>
        </div>
      )}

      {/* Grille tarifaire */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        {DURATIONS.map(duration => (
          <div key={duration.label} className="rounded-2xl overflow-hidden"
            style={{ border: '1px solid #E5E7EB', backgroundColor: '#FFFFFF' }}>
            <div className="p-5 text-center" style={{ borderBottom: '1px solid #F3F4F6', backgroundColor: '#F9FAFB' }}>
              <p className="font-black text-xl text-gray-900">{duration.label}</p>
              <p className="text-xs text-gray-500 mt-1">{duration.description}</p>
            </div>
            <div className="divide-y divide-gray-100">
              {FORMULAS.map(formula => {
                const prix = duration.prices[formula.key]
                const isCombo = formula.key === 'combo'
                const isMeta = formula.key === 'meta_ads'
                return (
                  <div key={formula.key} className="p-4 flex flex-col gap-2.5"
                    style={isCombo ? { backgroundColor: '#FFF7ED' } : {}}>
                    {isCombo && (
                      <span className="self-start text-xs font-bold px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: '#F97316' }}>Meilleure offre</span>
                    )}
                    <div className="flex items-center gap-2">
                      <formula.icon className="w-4 h-4 flex-shrink-0"
                        style={{ color: isCombo ? '#F97316' : '#9CA3AF' }} />
                      <span className="text-xs font-semibold text-gray-700">{formula.shortLabel}</span>
                    </div>
                    <p className="font-black text-lg text-gray-900">{formatPrice(prix)}</p>
                    {isMeta && <p className="text-xs text-gray-400 -mt-1">{META_VIEWS[duration.days]}</p>}
                    <button
                      onClick={() => openModal(formula.key, duration.days, prix)}
                      disabled={boostBlocked}
                      className="w-full text-center text-xs font-bold py-2.5 rounded-xl transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                      style={isCombo
                        ? { backgroundColor: '#F97316', color: '#FFFFFF' }
                        : { backgroundColor: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB' }}
                    >
                      Choisir cette formule
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400 mb-10 px-1">
        * Estimations basées sur les performances Meta Ads observées en Afrique de l&apos;Ouest. Les résultats réels peuvent varier selon la qualité des visuels et le ciblage.
      </p>

      {/* Description formules */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <div className="rounded-2xl p-5" style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: 'rgba(249,115,22,0.08)' }}>
            <UtensilsCrossed className="w-5 h-5" style={{ color: '#F97316' }} />
          </div>
          <h3 className="font-bold text-gray-900 mb-2">Mise en avant TerangaLink</h3>
          <p className="text-sm text-gray-500 leading-relaxed">Votre restaurant passe en tête de l&apos;annuaire TerangaLink avec un badge Recommandé.</p>
        </div>
        <div className="rounded-2xl p-5" style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: 'rgba(249,115,22,0.08)' }}>
            <Megaphone className="w-5 h-5" style={{ color: '#F97316' }} />
          </div>
          <h3 className="font-bold text-gray-900 mb-2">Meta Ads</h3>
          <p className="text-sm text-gray-500 leading-relaxed">Campagne publicitaire ciblée sur Instagram, Facebook et WhatsApp gérée par TerangaLink.</p>
        </div>
        <div className="rounded-2xl p-5" style={{ backgroundColor: '#FFF7ED', border: '2px solid #F97316' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: 'rgba(249,115,22,0.15)' }}>
            <Zap className="w-5 h-5" style={{ color: '#F97316' }} />
          </div>
          <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
            Combo
            <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: '#F97316' }}>Meilleure offre</span>
          </h3>
          <p className="text-sm text-gray-500 leading-relaxed">Combinez la mise en avant dans l&apos;annuaire et une campagne Meta Ads pour une visibilité maximale.</p>
        </div>
      </div>

      {/* Checklist */}
      <div className="rounded-2xl p-6 mb-8" style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}>
        <h3 className="font-bold text-gray-900 mb-4">Pourquoi booster votre restaurant ?</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            'Visibilité immédiate sans attendre les avis clients',
            'Audience locale et qualifiée au Sénégal',
            'Activation et gestion gérées par TerangaLink',
            "Pas d'abonnement — paiement à la durée choisie",
            'Annulable à tout moment entre deux campagnes',
            'Résultats visibles dès les premiers jours',
          ].map(item => (
            <div key={item} className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#22c55e' }} />
              <span className="text-sm text-gray-600">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="mb-10 space-y-4">
        <h3 className="font-bold text-gray-900">Questions fréquentes</h3>
        {[
          { q: "Comment se passe l'activation ?", a: "Cliquez sur \"Choisir cette formule\", renseignez votre date de début souhaitée et envoyez votre demande. TerangaLink vous contacte sous 24h pour confirmer le paiement." },
          { q: 'Quand commence le boost ?', a: "Dès réception du paiement via Wave ou Orange Money. La mise en avant est immédiate, la campagne Meta Ads lancée dans les 24-48h." },
          { q: 'Que se passe-t-il à la fin de la durée choisie ?', a: "Le boost s'arrête automatiquement. Aucun prélèvement automatique. Vous pouvez renouveler à tout moment." },
        ].map(({ q, a }) => (
          <div key={q} className="rounded-xl p-4" style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}>
            <p className="font-semibold text-gray-900 text-sm mb-1">{q}</p>
            <p className="text-sm text-gray-500">{a}</p>
          </div>
        ))}
      </div>

      {/* Liens contact */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-6"
        style={{ borderTop: '1px solid #E5E7EB' }}>
        <span className="text-sm text-gray-500">Une question ?</span>
        <a href={waGeneralUrl} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium hover:opacity-80 transition-all"
          style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', color: '#374151' }}>
          <MessageCircle className="w-4 h-4" style={{ color: '#25D366' }} />
          Nous écrire sur WhatsApp
        </a>
        <a href={waCallUrl} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium hover:opacity-80 transition-all"
          style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', color: '#374151' }}>
          <Calendar className="w-4 h-4 text-gray-400" />
          Réserver un appel
        </a>
      </div>

      {/* MODALE */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          onClick={e => { if (e.target === e.currentTarget) closeModal() }}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-start justify-between p-6" style={{ borderBottom: '1px solid #F3F4F6' }}>
              <div>
                <h2 className="text-lg font-black text-gray-900">Votre demande de boost</h2>
                <p className="text-xs text-gray-500 mt-1">Vérifiez les détails avant d&apos;envoyer</p>
              </div>
              <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div className="px-6 pt-5 pb-6">
              {/* Récap */}
              <div className="rounded-xl p-4 mb-5 grid grid-cols-3 gap-3 text-center"
                style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Formule</p>
                  <p className="text-xs font-bold text-gray-900">{TYPE_LABELS[modal.type]}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Durée</p>
                  <p className="text-sm font-bold text-gray-900">{modal.days} jours</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Prix</p>
                  <p className="text-sm font-bold" style={{ color: '#F97316' }}>{formatPrice(modal.prix)}</p>
                </div>
              </div>

              {/* Date début */}
              <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Date de début souhaitée <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  value={dateDebut}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={e => setDateDebut(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm bg-white text-gray-900"
                  style={{ border: '1px solid #E5E7EB' }}
                />
              </div>

              {/* Date fin */}
              <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Date de fin (calculée)</label>
                <input
                  type="text"
                  value={dateFin ? formatDateFR(dateFin) : '—'}
                  readOnly
                  className="w-full px-3 py-2.5 rounded-xl text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                  style={{ border: '1px solid #E5E7EB' }}
                />
              </div>

              {/* Message */}
              <div className="mb-5">
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Message ou précision <span className="text-gray-400 font-normal">(optionnel)</span>
                </label>
                <textarea
                  rows={2}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder='Ex : "Je veux booster pendant le Ramadan"'
                  className="w-full px-3 py-2.5 rounded-xl text-sm bg-white text-gray-900 resize-none"
                  style={{ border: '1px solid #E5E7EB' }}
                />
              </div>

              {sendError && <p className="text-xs text-red-600 mb-4">{sendError}</p>}

              <div className="flex gap-3">
                <button
                  onClick={handleSend}
                  disabled={sending || !dateDebut}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: '#F97316' }}
                >
                  {sending ? 'Envoi…' : 'Envoyer ma demande'}
                </button>
                <button
                  onClick={closeModal}
                  className="px-5 py-3 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Annuler
                </button>
              </div>

              <div className="mt-3 pt-3" style={{ borderTop: '1px solid #F3F4F6' }}>
                <a
                  href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent("Bonjour TerangaLink, j'aimerais en savoir plus sur les options de boost pour mon restaurant.")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  style={{ border: '1px solid #E5E7EB' }}
                >
                  <MessageCircle className="w-4 h-4" style={{ color: '#25D366' }} />
                  En savoir plus sur WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
