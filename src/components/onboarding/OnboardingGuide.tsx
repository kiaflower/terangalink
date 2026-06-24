'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, ArrowRight, ChevronRight, Sparkles } from 'lucide-react'

interface Step {
  key: string
  page: string           // quelle page doit être active pour afficher ce step
  title: string
  body: string
  cta: string            // texte du bouton action
  href?: string          // si on navigue au clic
  dismissOnNav?: boolean // disparaît quand on navigue vers href
}

const STEPS: Step[] = [
  {
    key: 'welcome',
    page: '/dashboard/restaurant',
    title: 'Bienvenue sur TerangaLink 🎉',
    body: 'Votre restaurant est prêt. Suivez ce guide rapide pour recevoir vos premières commandes en moins de 5 minutes.',
    cta: 'Commencer le guide',
  },
  {
    key: 'go_menu',
    page: '/dashboard/restaurant',
    title: 'Créez votre menu',
    body: 'Appuyez sur "Menu" dans la barre latérale pour ajouter vos plats. Vos clients ne peuvent pas commander si le menu est vide.',
    cta: 'Aller au Menu →',
    href: '/dashboard/restaurant/menu',
    dismissOnNav: true,
  },
  {
    key: 'add_product',
    page: '/dashboard/restaurant/menu',
    title: 'Ajoutez votre premier plat',
    body: 'Cliquez sur le bouton "Ajouter un plat" en haut à droite. Donnez un nom, un prix et une photo.',
    cta: 'C\'est fait ✓',
  },
  {
    key: 'go_orders',
    page: '/dashboard/restaurant/menu',
    title: 'Où voir vos commandes ?',
    body: 'Vos commandes apparaissent dans l\'onglet "Commandes". Vous pouvez les accepter, les confirmer au client par WhatsApp, et générer un reçu téléchargeable si vous êtes en Pro ou Premium.',
    cta: 'Voir les commandes →',
    href: '/dashboard/restaurant/orders',
    dismissOnNav: true,
  },
  {
    key: 'orders_info',
    page: '/dashboard/restaurant/orders',
    title: 'Vos commandes en temps réel',
    body: 'Chaque nouvelle commande apparaît ici automatiquement. Cliquez dessus pour voir les détails, confirmer au client et marquer comme livrée.',
    cta: 'Compris ✓',
  },
  {
    key: 'go_analytics',
    page: '/dashboard/restaurant/orders',
    title: 'Suivez vos performances',
    body: 'Vos vues, paniers et plats les plus commandés apparaissent dans Analytiques. Consultez-les chaque jour pour mesurer votre visibilité.',
    cta: 'Voir les analytiques →',
    href: '/dashboard/restaurant/analytics',
    dismissOnNav: true,
  },
  {
    key: 'go_settings',
    page: '/dashboard/restaurant/analytics',
    title: 'Configurez vos paiements',
    body: 'Allez dans Paramètres pour renseigner vos numéros Wave et Orange Money. Ces numéros seront affichés automatiquement dans le message de confirmation envoyé à vos clients.',
    cta: 'Aller aux Paramètres →',
    href: '/dashboard/restaurant/settings',
    dismissOnNav: true,
  },
  {
    key: 'settings_info',
    page: '/dashboard/restaurant/settings',
    title: 'Wave, Orange Money & livraison',
    body: 'Renseignez vos numéros Wave et Orange Money. Activez les frais de livraison si vous livrez, et configurez vos horaires d\'ouverture. Vos clients verront tout ça sur votre page.',
    cta: 'C\'est fait ✓',
  },
  {
    key: 'see_site',
    page: '/dashboard/restaurant/settings',
    title: 'Votre site est prêt !',
    body: 'Cliquez sur "Voir mon site" dans la barre latérale (icône lien externe) pour voir votre page publique. Partagez ce lien à vos clients !',
    cta: 'Terminer le guide',
  },
]

const STORAGE_KEY = 'tl_onboarding_v2'

function getState(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

function saveState(state: Record<string, boolean>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

interface OnboardingGuideProps {
  currentPath: string
  restaurantSlug?: string
}

export function OnboardingGuide({ currentPath, restaurantSlug }: OnboardingGuideProps) {
  const router = useRouter()
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({})
  const [active, setActive] = useState<Step | null>(null)
  const [visible, setVisible] = useState(false)
  const [asked, setAsked] = useState(false)
  const [declined, setDeclined] = useState(false)
  const [animating, setAnimating] = useState(false)

  // Charger l'état depuis localStorage
  useEffect(() => {
    const state = getState()
    setDismissed(state)
    setAsked(!!state.__asked)
    setDeclined(!!state.__declined)
  }, [])

  // Trouver le step actif pour la page courante
  useEffect(() => {
    const state = getState()
    if (state.__declined) return
    if (!state.__asked) return

    const step = STEPS.find(s =>
      s.page === currentPath && !state[s.key]
    )

    if (step) {
      setTimeout(() => {
        setActive(step)
        setVisible(true)
      }, 600)
    } else {
      setActive(null)
      setVisible(false)
    }
  }, [currentPath, dismissed])

  function dismiss(key: string) {
    setAnimating(true)
    setTimeout(() => {
      const next = { ...getState(), [key]: true }
      saveState(next)
      setDismissed(next)
      setActive(null)
      setVisible(false)
      setAnimating(false)
    }, 250)
  }

  function handleCta(step: Step) {
    if (step.href) {
      dismiss(step.key)
      router.push(step.href)
    } else {
      dismiss(step.key)
    }
  }

  function skipAll() {
    const next = { ...getState(), __declined: true }
    saveState(next)
    setDeclined(true)
    setVisible(false)
    setActive(null)
  }

  function acceptGuide() {
    const next = { ...getState(), __asked: true, welcome: true }
    saveState(next)
    setAsked(true)
    setDismissed(next)
  }

  function declineGuide() {
    const next = { ...getState(), __asked: true, __declined: true }
    saveState(next)
    setAsked(true)
    setDeclined(true)
  }

  if (declined) return null

  // Écran de proposition du guide — seulement sur le dashboard
  if (!asked && currentPath === '/dashboard/restaurant') {
    return (
      <div className={`fixed bottom-6 right-6 z-50 w-80 transition-all duration-500 ${visible || !asked ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
        <div className="bg-surface-50 border border-brand-orange/30 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header orange */}
          <div className="bg-brand-orange px-5 py-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-white" />
              <span className="text-white font-bold text-sm">Guide de démarrage</span>
            </div>
          </div>
          <div className="px-5 py-4 space-y-4">
            <p className="text-gray-300 text-sm leading-relaxed">
              Vous venez de rejoindre TerangaLink. Voulez-vous un guide rapide pour configurer votre restaurant et recevoir vos premières commandes ?
            </p>
            <div className="flex gap-2">
              <button
                onClick={declineGuide}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-gray-500 hover:text-gray-300 border border-surface-300 hover:bg-surface-100 transition-colors"
              >
                Non merci
              </button>
              <button
                onClick={acceptGuide}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-brand-orange hover:bg-brand-orange/90 text-white transition-colors flex items-center justify-center gap-1.5"
              >
                Oui, allons-y <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!active || !visible) return null

  return (
    <div className={`fixed bottom-6 right-6 z-50 w-80 transition-all duration-300 ${
      animating ? 'translate-y-2 opacity-0' : 'translate-y-0 opacity-100'
    }`}>
      <div className="bg-surface-50 border border-surface-200 rounded-2xl shadow-2xl overflow-hidden">
        {/* Barre de progression */}
        <div className="h-0.5 bg-surface-200">
          <div
            className="h-full bg-brand-orange transition-all duration-500"
            style={{
              width: `${((STEPS.findIndex(s => s.key === active.key) + 1) / STEPS.length) * 100}%`
            }}
          />
        </div>

        <div className="px-5 pt-4 pb-2 flex items-start justify-between gap-3">
          <h3 className="text-white font-bold text-sm leading-snug">{active.title}</h3>
          <button
            onClick={skipAll}
            className="text-gray-600 hover:text-gray-400 transition-colors flex-shrink-0 mt-0.5"
            title="Quitter le guide"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pb-4 space-y-4">
          <p className="text-gray-400 text-xs leading-relaxed">{active.body}</p>

          <div className="flex items-center justify-between">
            <span className="text-gray-600 text-xs">
              {STEPS.findIndex(s => s.key === active.key) + 1} / {STEPS.length}
            </span>
            <button
              onClick={() => handleCta(active)}
              className="inline-flex items-center gap-1.5 bg-brand-orange hover:bg-brand-orange/90 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors"
            >
              {active.cta}
              {active.href && <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
