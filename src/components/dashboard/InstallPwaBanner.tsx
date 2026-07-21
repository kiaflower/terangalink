'use client'

import { useEffect, useState } from 'react'
import { Download, Share, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const COPY = {
  boutique: {
    title: 'Installez votre tableau de bord',
    body: "Ajoutez-le à votre écran d'accueil pour l'ouvrir en un tap, comme une vraie appli. Sur iPhone, c'est aussi nécessaire pour recevoir les notifications de nouvelles commandes — Safari seul ne les affiche pas.",
  },
  admin: {
    title: 'Installez le dashboard admin',
    body: "Ajoutez-le à votre écran d'accueil pour un accès rapide. Sur iPhone, c'est nécessaire pour recevoir les notifications.",
  },
}

// Détecte iOS/Android/desktop pour adapter les instructions : iOS Safari ne
// déclenche jamais `beforeinstallprompt` (pas d'API d'installation
// programmatique), il faut donc toujours afficher les étapes manuelles.
function detectPlatform() {
  if (typeof navigator === 'undefined') return 'other' as const
  const ua = navigator.userAgent
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios' as const
  if (/android/i.test(ua)) return 'android' as const
  return 'other' as const
}

function isStandalone() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

export function InstallPwaBanner({ variant }: { variant: 'boutique' | 'admin' }) {
  const storageKey = `pwa_banner_dismissed_${variant}`
  const [visible, setVisible] = useState(false)
  const [platform, setPlatform] = useState<'ios' | 'android' | 'other'>('other')
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if (isStandalone()) return
    if (localStorage.getItem(storageKey) === '1') return

    setPlatform(detectPlatform())
    setVisible(true)

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [storageKey])

  if (!visible) return null

  const dismiss = () => {
    localStorage.setItem(storageKey, '1')
    setVisible(false)
  }

  const copy = COPY[variant]

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') dismiss()
    setDeferredPrompt(null)
  }

  return (
    <div className="relative mb-4 rounded-2xl border border-brand-violet/20 bg-brand-violet/5 p-4">
      <button
        onClick={dismiss}
        className="absolute right-3 top-3 text-ink-300 hover:text-ink-500"
        aria-label="Fermer"
      >
        <X size={16} />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-violet text-white">
          <Download size={18} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink-DEFAULT">{copy.title}</p>
          <p className="mt-1 text-xs text-ink-400 leading-relaxed">{copy.body}</p>

          {platform === 'ios' && (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-brand-violet-dark">
              Appuyez sur <Share size={14} className="inline" /> puis « Sur l'écran d'accueil »
            </p>
          )}

          {platform !== 'ios' && deferredPrompt && (
            <button
              onClick={handleInstallClick}
              className="mt-3 rounded-lg bg-brand-violet px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-violet-dark"
            >
              Installer
            </button>
          )}

          {platform !== 'ios' && !deferredPrompt && (
            <p className="mt-2 text-xs font-medium text-brand-violet-dark">
              Menu du navigateur (⋮) → « Installer l'application » ou « Ajouter à l'écran d'accueil »
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
