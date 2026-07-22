'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Gift, Copy, Check, Users, Percent, PartyPopper } from 'lucide-react'

interface ReferredRestaurant {
  slug: string
  name: string
  created_at: string
  referral_rewards: { status: string; triggered_at: string | null }[]
}

const PALIER = 5

export default function ParrainagePage() {
  const supabase = createClient()
  const [referralCode, setReferralCode] = useState<string | null>(null)
  const [referred, setReferred] = useState<ReferredRestaurant[]>([])
  const [availableCredits, setAvailableCredits] = useState(0)
  const [pendingAction, setPendingAction] = useState<'discount' | 'free_month' | 'referral_welcome' | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [acting, setActing] = useState<'discount' | 'free_month' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/auth/me')
    const data = await res.json()
    const bId = data.restaurant_id
    if (!bId) { setLoading(false); return }

    const [{ data: restaurant }, { count }, { data: sub }] = await Promise.all([
      supabase.from('restaurants').select('referral_code').eq('id', bId).single(),
      supabase.from('referral_credits').select('id', { count: 'exact', head: true }).eq('restaurant_id', bId).eq('status', 'available'),
      supabase.from('subscriptions').select('pending_credit_action').eq('restaurant_id', bId).maybeSingle(),
    ])

    if (restaurant?.referral_code) {
      setReferralCode(restaurant.referral_code)
      const { data: referredData } = await supabase
        .from('restaurants')
        .select('slug, name, created_at, referral_rewards!referred_restaurant_id(status, triggered_at)')
        .eq('referred_by_code', restaurant.referral_code)
        .order('created_at', { ascending: false })
      setReferred((referredData ?? []) as unknown as ReferredRestaurant[])
    }

    setAvailableCredits(count ?? 0)
    setPendingAction((sub as { pending_credit_action: 'discount' | 'free_month' | 'referral_welcome' | null } | null)?.pending_credit_action ?? null)
    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  const referralLink = referralCode
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/inscription?ref=${referralCode}`
    : ''

  function copyLink() {
    if (!referralLink) return
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  async function runAction(kind: 'discount' | 'free_month') {
    setActing(kind)
    setError(null)
    const endpoint = kind === 'discount'
      ? '/api/restaurant/referral-credits/apply-discount'
      : '/api/restaurant/referral-credits/redeem-free-month'
    const res = await fetch(endpoint, { method: 'POST' })
    const data = await res.json().catch(() => ({}))
    setActing(null)
    if (!res.ok) { setError(data.error || 'Une erreur est survenue'); return }
    await load()
  }

  const tranchesReady = Math.floor(availableCredits / PALIER)
  const progressInTranche = availableCredits === 0 ? 0 : (availableCredits % PALIER === 0 ? PALIER : availableCredits % PALIER)
  const canApplyDiscount = !pendingAction && availableCredits >= 1
  const canRedeemFreeMonth = !pendingAction && availableCredits >= PALIER

  return (
    <div className="max-w-xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Parrainage</h1>
        <p className="text-gray-500 text-sm mt-1">Invitez d&apos;autres restaurateurs et gagnez des crédits de réduction</p>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Chargement...</p>
      ) : !referralCode ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
          <p className="text-amber-800 text-sm">Votre code de parrainage n&apos;est pas encore activé. Contactez le support.</p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                <Gift className="w-5 h-5 text-brand-orange" />
              </div>
              <div>
                <p className="font-bold text-gray-900">Comment ça fonctionne ?</p>
              </div>
            </div>
            <ol className="space-y-3 text-sm text-gray-600">
              <li className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-orange-100 text-brand-orange text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                Partagez votre lien de parrainage à un restaurateur
              </li>
              <li className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-orange-100 text-brand-orange text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                Il s&apos;inscrit avec votre code et paie son premier mois d&apos;abonnement
              </li>
              <li className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-orange-100 text-brand-orange text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                Vous gagnez <span className="font-bold text-brand-orange mx-1">1 crédit</span> : -25% sur une facture, ou 5 crédits pour un mois offert
              </li>
            </ol>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <p className="text-xs font-medium text-gray-500 mb-2">Votre code de parrainage</p>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-mono font-bold text-gray-900 text-lg tracking-widest">
                {referralCode}
              </div>
            </div>

            <p className="text-xs font-medium text-gray-500 mb-2">Votre lien de parrainage</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-600 truncate">
                {referralLink}
              </div>
              <button
                onClick={copyLink}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white flex-shrink-0 transition-all"
                style={{ backgroundColor: copied ? '#059669' : '#F97316' }}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copié' : 'Copier'}
              </button>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold text-gray-900">Vos crédits</p>
              <p className="text-2xl font-bold text-brand-orange">{availableCredits}</p>
            </div>
            <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
              <span>Vers votre prochain mois gratuit</span>
              <span className="font-semibold">{progressInTranche}/{PALIER}</span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
              <div className="h-full bg-brand-orange rounded-full transition-all" style={{ width: `${(progressInTranche / PALIER) * 100}%` }} />
            </div>
            {tranchesReady > 0 && (
              <p className="text-xs text-gray-500 mb-4">
                {tranchesReady} mois gratuit{tranchesReady > 1 ? 's' : ''} échangeable{tranchesReady > 1 ? 's' : ''} dès maintenant.
              </p>
            )}

            {pendingAction && (
              <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 mb-4 text-xs text-brand-orange font-medium">
                {pendingAction === 'discount' && 'Une réduction de -25% est déjà prévue sur votre prochaine facture.'}
                {pendingAction === 'free_month' && 'Un mois gratuit est déjà prévu sur votre prochaine facture.'}
                {pendingAction === 'referral_welcome' && 'Votre réduction de bienvenue de -25% est déjà prévue sur votre prochaine facture.'}
              </div>
            )}
            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-3 mb-4 text-xs text-red-600 font-medium">{error}</div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={() => runAction('discount')}
                disabled={!canApplyDiscount || acting !== null}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border border-gray-200 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:border-brand-orange transition-colors"
              >
                <Percent className="w-3.5 h-3.5" />
                {acting === 'discount' ? '...' : 'Appliquer un crédit (-25%)'}
              </button>
              <button
                onClick={() => runAction('free_month')}
                disabled={!canRedeemFreeMonth || acting !== null}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-white bg-brand-orange hover:bg-brand-orange-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <PartyPopper className="w-3.5 h-3.5" />
                {acting === 'free_month' ? '...' : 'Échanger 5 crédits (mois offert)'}
              </button>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-brand-orange" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-2xl">{referred.length}</p>
              <p className="text-xs text-gray-500">restaurant{referred.length !== 1 ? 's' : ''} parrainée{referred.length !== 1 ? 's' : ''}</p>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <p className="font-bold text-gray-900 mb-4">Restaurants parrainées</p>
            {referred.length === 0 ? (
              <p className="text-sm text-gray-400">Vous n&apos;avez pas encore parrainé de restaurant.</p>
            ) : (
              <ul className="space-y-3">
                {referred.map(b => {
                  const reward = b.referral_rewards?.[0]
                  const completed = reward?.status === 'completed'
                  return (
                    <li key={b.slug} className="flex items-center justify-between text-sm gap-3">
                      <div className="min-w-0">
                        <p className="text-gray-900 font-medium truncate">{b.name}</p>
                        <p className="text-xs text-gray-400">
                          @{b.slug} · Inscrit le {new Date(b.created_at).toLocaleDateString('fr-SN')}
                        </p>
                      </div>
                      {completed ? (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-600 border border-green-100 shrink-0 text-right">
                          1 crédit gagné{reward?.triggered_at && ` le ${new Date(reward.triggered_at).toLocaleDateString('fr-SN')}`}
                        </span>
                      ) : (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100 shrink-0">
                          En essai
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
