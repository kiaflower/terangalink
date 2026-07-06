'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, ArrowRight, ChevronRight, Sparkles } from 'lucide-react'

interface Step {
  key: string
  page: string
  title: string
  body: string
  cta: string
  href?: string
  dismissOnNav?: boolean
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
    cta: "C'est fait ✓",
  },
  {
    key: 'go_stories',
    page: '/dashboard/restaurant/menu',
    title: 'Publiez votre première story',
    body: 'Partagez une photo ou vidéo de vos plats, promos ou nouveautés. Vos stories apparaissent 24h dans l\'annuaire et donnent envie de commander.',
    cta: 'Aller aux Stories →',
    href: '/dashboard/restaurant/stories',
    dismissOnNav: true,
  },
  {
    key: 'stories_info',
    page: '/dashboard/restaurant/stories',
    title: 'Vos stories en un clic',
    body: "Ajoutez une photo ou une vidéo, un petit texte, et si vous le souhaitez un produit lié — vos clients pourront commander directement depuis la story.",
    cta: "C'est fait ✓",
  },
  {
    key: 'go_orders',
    page: '/dashboard/restaurant/stories',
    title: 'Où voir vos commandes ?',
    body: "Vos commandes apparaissent dans l'onglet \"Commandes\". Vous pouvez les accepter, les confirmer au client par WhatsApp, et générer un reçu téléchargeable si vous êtes en Pro.",
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
    body: "Renseignez vos numéros Wave et Orange Money. Activez les frais de livraison si vous livrez, et configurez vos horaires d'ouverture. Vos clients verront tout ça sur votre page.",
    cta: "C'est fait ✓",
  },
  {
    key: 'see_site',
    page: '/dashboard/restaurant/settings',
    title: 'Votre site est prêt 🚀',
    body: 'Cliquez sur "Voir mon site" dans la barre latérale (icône lien externe) pour voir votre page publique. Partagez ce lien à vos clients !',
    cta: 'Terminer le guide',
  },
]

const STORAGE_KEY = 'tl_onboarding_v2'

function readState(): Record<string, boolean> {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

function writeState(state: Record<string, boolean>) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

interface OnboardingGuideProps {
  currentPath: string
  restaurantSlug?: string
}

export function OnboardingGuide({ currentPath }: OnboardingGuideProps) {
  const router = useRouter()

  // Initialisation synchrone depuis localStorage — évite le flash
  const [state, setState] = useState<Record<string, boolean>>(() => readState())
  const [mounted, setMounted] = useState(false)
  const [leaving, setLeaving] = useState(false)

  // On marque comme monté après le premier render côté client
  useEffect(() => { setMounted(true) }, [])

  // Helpers
  const isDeclined = state.__declined === true
  const isAsked = state.__asked === true

  function updateState(patch: Record<string, boolean>) {
    const next = { ...state, ...patch }
    writeState(next)
    setState(next)
  }

  function acceptGuide() {
    updateState({ __asked: true, welcome: true })
  }

  function declineGuide() {
    // __declined = true → ne plus jamais montrer
    // __asked = true → marquer comme vu
    updateState({ __asked: true, __declined: true })
  }

  function skipAll() {
    // X sur une étape = ignorer pour cette session mais repropposer à la reconnexion
    // On NE met PAS __declined : ça réapparaîtra à la prochaine session
    updateState({ __asked: false })
  }

  function dismissStep(key: string) {
    setLeaving(true)
    setTimeout(() => {
      updateState({ [key]: true })
      setLeaving(false)
    }, 250)
  }

  function handleCta(step: Step) {
    if (step.href) {
      dismissStep(step.key)
      router.push(step.href)
    } else {
      dismissStep(step.key)
    }
  }

  // Ne rien rendre côté serveur ni avant le mount (évite le flash)
  if (!mounted) return null
  if (isDeclined) return null

  // ── Proposition initiale ────────────────────────────────────────────────
  if (!isAsked && currentPath === '/dashboard/restaurant') {
    return (
      <div className="fixed bottom-6 right-6 z-50 w-80 translate-y-0 opacity-100 transition-all duration-500">
        <div className="bg-surface-50 border border-brand-orange/30 rounded-2xl shadow-2xl overflow-hidden">
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

  // ── Étapes du guide ─────────────────────────────────────────────────────
  if (!isAsked) return null

  const activeStep = STEPS.find(s => s.page === currentPath && !state[s.key])
  if (!activeStep) return null

  const stepIndex = STEPS.findIndex(s => s.key === activeStep.key)
  const progress = ((stepIndex + 1) / STEPS.length) * 100

  return (
    <div className={`fixed bottom-6 right-6 z-50 w-80 transition-all duration-300 ${
      leaving ? 'translate-y-2 opacity-0' : 'translate-y-0 opacity-100'
    }`}>
      <div className="bg-surface-50 border border-surface-200 rounded-2xl shadow-2xl overflow-hidden">
        {/* Barre de progression */}
        <div className="h-0.5 bg-surface-200">
          <div
            className="h-full bg-brand-orange transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="px-5 pt-4 pb-2 flex items-start justify-between gap-3">
          <h3 className="text-white font-bold text-sm leading-snug">{activeStep.title}</h3>
          <button
            onClick={skipAll}
            className="text-gray-600 hover:text-gray-400 transition-colors flex-shrink-0 mt-0.5"
            title="Ignorer le guide"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pb-4 space-y-4">
          <p className="text-gray-400 text-xs leading-relaxed">{activeStep.body}</p>
          <div className="flex items-center justify-between">
            <span className="text-gray-600 text-xs">{stepIndex + 1} / {STEPS.length}</span>
            <button
              onClick={() => handleCta(activeStep)}
              className="inline-flex items-center gap-1.5 bg-brand-orange hover:bg-brand-orange/90 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors"
            >
              {activeStep.cta}
              {activeStep.href && <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
