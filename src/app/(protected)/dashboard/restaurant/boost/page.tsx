import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Zap, UtensilsCrossed, Megaphone, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

export const metadata = { title: 'Booster mon restaurant — TerangaLink' }

const WA_NUMBER = '221774739266'

const DURATIONS = [
  {
    label: '7 jours',
    description: 'Idéal pour un lancement ou une promotion ponctuelle',
    prices: { annuaire: 3000, meta: 10000, combo: 12000 },
  },
  {
    label: '15 jours',
    description: 'Visibilité soutenue sur deux semaines',
    prices: { annuaire: 5000, meta: 17000, combo: 20000 },
    highlight: false,
  },
  {
    label: '30 jours',
    description: 'Présence maximale pendant un mois complet',
    prices: { annuaire: 9000, meta: 28000, combo: 35000 },
  },
]

type FormulaKey = 'annuaire' | 'meta' | 'combo'

const FORMULAS: { key: FormulaKey; label: string; shortLabel: string; icon: React.ElementType; recommended?: boolean }[] = [
  { key: 'annuaire', label: 'Mise en avant TerangaLink', shortLabel: 'Mise en avant', icon: UtensilsCrossed },
  { key: 'meta', label: 'Meta Ads (Instagram, Facebook, WhatsApp)', shortLabel: 'Meta Ads', icon: Megaphone },
  { key: 'combo', label: 'Combo (Mise en avant + Meta Ads)', shortLabel: 'Combo', icon: Zap, recommended: true },
]

function formatPrice(n: number) {
  return n.toLocaleString('fr-FR') + ' FCFA'
}

function buildWaMessage(formula: FormulaKey, duration: string, price: number, restaurantName: string) {
  const name = restaurantName || 'mon restaurant'
  const priceStr = formatPrice(price)
  if (formula === 'annuaire') {
    return `Bonjour TerangaLink, je souhaite mettre en avant mon restaurant ${name} dans l'annuaire pendant ${duration} pour ${priceStr}. Merci de me confirmer les prochaines étapes.`
  }
  if (formula === 'meta') {
    return `Bonjour TerangaLink, je souhaite lancer une campagne Meta Ads pour mon restaurant ${name} pendant ${duration} pour ${priceStr}. Merci de me confirmer les prochaines étapes.`
  }
  return `Bonjour TerangaLink, je souhaite la formule Combo (Mise en avant + Meta Ads) pour mon restaurant ${name} pendant ${duration} pour ${priceStr}. Merci de me confirmer les prochaines étapes.`
}

export default async function BoostPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('restaurant_id').eq('id', user.id).single()

  let restaurantName = ''
  if (profile?.restaurant_id) {
    const { data: resto } = await supabase
      .from('restaurants').select('name').eq('id', profile.restaurant_id).single()
    restaurantName = resto?.name ?? ''
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

      {/* Grille tarifaire */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
        {DURATIONS.map(duration => (
          <div key={duration.label}
            className="rounded-2xl overflow-hidden"
            style={{ border: '1px solid #E5E7EB', backgroundColor: '#FFFFFF' }}>

            {/* En-tête colonne */}
            <div className="p-5 text-center" style={{ borderBottom: '1px solid #F3F4F6', backgroundColor: '#F9FAFB' }}>
              <p className="font-black text-xl text-gray-900">{duration.label}</p>
              <p className="text-xs text-gray-500 mt-1">{duration.description}</p>
            </div>

            {/* Lignes de formule */}
            <div className="divide-y divide-gray-100">
              {FORMULAS.map(formula => {
                const price = duration.prices[formula.key]
                const msg = buildWaMessage(formula.key, duration.label, price, restaurantName)
                const waUrl = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`
                const isCombo = formula.key === 'combo'

                return (
                  <div key={formula.key}
                    className="p-4 flex flex-col gap-3"
                    style={isCombo ? { backgroundColor: '#FFF7ED' } : {}}>
                    {isCombo && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                          style={{ backgroundColor: '#F97316' }}>
                          Meilleure offre
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <formula.icon className="w-4 h-4 flex-shrink-0"
                        style={{ color: isCombo ? '#F97316' : '#9CA3AF' }} />
                      <span className="text-xs font-semibold text-gray-700">{formula.shortLabel}</span>
                    </div>
                    <p className="font-black text-lg text-gray-900">{formatPrice(price)}</p>
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full text-center text-xs font-bold py-2.5 rounded-xl transition-all hover:opacity-90"
                      style={isCombo
                        ? { backgroundColor: '#F97316', color: '#FFFFFF' }
                        : { backgroundColor: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB' }}
                    >
                      Choisir cette formule
                    </a>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Description des formules */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {/* Mise en avant */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
            style={{ backgroundColor: 'rgba(249,115,22,0.08)' }}>
            <UtensilsCrossed className="w-5 h-5" style={{ color: '#F97316' }} />
          </div>
          <h3 className="font-bold text-gray-900 mb-2">Mise en avant TerangaLink</h3>
          <p className="text-sm text-gray-500 leading-relaxed">
            Votre restaurant passe en tête de l&apos;annuaire TerangaLink avec un badge Recommandé. Vos futurs clients vous voient en premier dès qu&apos;ils ouvrent la page restaurants.
          </p>
        </div>

        {/* Meta Ads */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
            style={{ backgroundColor: 'rgba(249,115,22,0.08)' }}>
            <Megaphone className="w-5 h-5" style={{ color: '#F97316' }} />
          </div>
          <h3 className="font-bold text-gray-900 mb-2">Meta Ads</h3>
          <p className="text-sm text-gray-500 leading-relaxed">
            TerangaLink lance une campagne publicitaire ciblée pour votre restaurant sur Instagram, Facebook et WhatsApp auprès d&apos;une audience locale à Dakar. Sur la base des performances observées en Afrique de l&apos;Ouest, une campagne de 7 jours peut atteindre entre 7 000 et 15 000 personnes ciblées dans votre zone. TerangaLink fait tout son possible pour maximiser votre visibilité pendant toute la durée de la campagne. Les résultats dépendent de plusieurs facteurs comme la qualité de votre menu, vos photos et votre réactivité sur WhatsApp. Nous ne garantissons pas un nombre fixe de commandes, mais nous nous engageons à donner à votre restaurant la meilleure visibilité possible.
          </p>
        </div>

        {/* Combo */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: '#FFF7ED', border: '2px solid #F97316' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
            style={{ backgroundColor: 'rgba(249,115,22,0.15)' }}>
            <Zap className="w-5 h-5" style={{ color: '#F97316' }} />
          </div>
          <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
            Combo
            <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: '#F97316' }}>Meilleure offre</span>
          </h3>
          <p className="text-sm text-gray-500 leading-relaxed">
            Combinez la mise en avant dans l&apos;annuaire et une campagne Meta Ads pour une visibilité maximale — sur TerangaLink et sur les réseaux sociaux en même temps.
          </p>
        </div>
      </div>

      {/* Checklist avantages */}
      <div className="rounded-2xl p-6 mb-8" style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}>
        <h3 className="font-bold text-gray-900 mb-4">Pourquoi booster votre restaurant ?</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            'Visibilité immédiate sans attendre les avis clients',
            'Audience locale et qualifiée à Dakar',
            'Activation et gestion gérées par TerangaLink',
            'Pas d\'abonnement — paiement à la durée choisie',
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

      {/* FAQ courte */}
      <div className="mb-8 space-y-4">
        <h3 className="font-bold text-gray-900">Questions fréquentes</h3>
        {[
          {
            q: 'Comment se passe l\'activation ?',
            a: 'Vous choisissez une formule et cliquez sur "Choisir cette formule". Vous êtes redirigé vers WhatsApp pour envoyer votre demande. Un membre de l\'équipe TerangaLink vous confirme les prochaines étapes sous 24h.',
          },
          {
            q: 'Quand commence le boost ?',
            a: 'Le boost est activé dès réception du paiement via Wave ou Orange Money. La mise en avant dans l\'annuaire est immédiate. La campagne Meta Ads est lancée dans les 24-48h après validation.',
          },
          {
            q: 'Que se passe-t-il à la fin de la durée choisie ?',
            a: 'Le boost s\'arrête automatiquement. Aucun prélèvement automatique. Vous pouvez renouveler à tout moment en faisant une nouvelle demande.',
          },
        ].map(({ q, a }) => (
          <div key={q} className="rounded-xl p-4" style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}>
            <p className="font-semibold text-gray-900 text-sm mb-1">{q}</p>
            <p className="text-sm text-gray-500">{a}</p>
          </div>
        ))}
      </div>

      {/* Note de bas de page */}
      <p className="text-xs text-gray-400 text-center">
        Le paiement s&apos;effectue via Wave ou Orange Money après confirmation de votre demande. Aucun prélèvement automatique.
      </p>
    </div>
  )
}
