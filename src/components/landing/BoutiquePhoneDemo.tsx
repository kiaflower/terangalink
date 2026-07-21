'use client'

import { useEffect, useRef, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import type { Boutique, ProductCategory, ProductWithVariants } from '@/lib/types'
import BoutiquePageClient from '@/app/[slug]/BoutiquePageClient'

interface Review {
  id: string
  customer_name: string | null
  rating: number
  comment: string | null
  created_at: string
}

interface Banner {
  id: string
  text: string
}

interface BoutiquePhoneDemoProps {
  boutique: Boutique
  categories: ProductCategory[]
  products: ProductWithVariants[]
  reviews?: Review[]
  banners?: Banner[]
  plan: 'starter' | 'pro'
  label?: string
}

// Largeur de référence (iPhone standard) : le vrai composant vitrine est rendu à cette
// largeur puis mis à l'échelle du cadre via transform: scale(), mesuré en direct par
// ResizeObserver — pas d'iframe, donc les modals `position: fixed` de BoutiquePageClient
// restent contenus dans le cadre (un ancêtre transformé devient leur containing block).
const CONTENT_WIDTH = 375
const NOM_DEMO = 'Fatou Diallo'
const TEL_DEMO = '77 123 45 67'

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function setReactInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
  setter?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

async function waitFor<T>(getter: () => T | null | undefined, timeout = 2500, interval = 80): Promise<T | null> {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    const value = getter()
    if (value) return value
    await sleep(interval)
  }
  return null
}

export function BoutiquePhoneDemo({ boutique, categories, products, reviews = [], banners = [], plan, label }: BoutiquePhoneDemoProps) {
  const accentColor = boutique.primary_color || '#7C3AED'
  const planLabel = label ?? (plan === 'pro' ? 'Exemple de boutique Pro' : 'Exemple de boutique Starter')

  const [cursor, setCursor] = useState<{ left: number; top: number } | null>(null)
  const [tapPulse, setTapPulse] = useState(false)
  const [fit, setFit] = useState({ scale: 0.6, height: CONTENT_WIDTH * (19 / 9) })

  const frameRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Calcul dynamique du scale : le contenu (375px de large) est rendu réel puis mis à l'échelle du cadre
  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    const measure = () => {
      const scale = frame.clientWidth / CONTENT_WIDTH
      if (scale > 0) setFit({ scale, height: frame.clientHeight / scale })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(frame)
    return () => observer.disconnect()
  }, [])

  // Boucle d'animation : pilote le vrai DOM de BoutiquePageClient (getBoundingClientRect / click réels)
  useEffect(() => {
    let cancelled = false

    function positionOf(el: Element | null) {
      const frame = frameRef.current
      if (!frame || !el) return null
      const frameRect = frame.getBoundingClientRect()
      const elRect = el.getBoundingClientRect()
      return {
        left: elRect.left - frameRect.left + elRect.width / 2,
        top: elRect.top - frameRect.top + elRect.height / 2,
      }
    }

    function findButtonByText(text: string) {
      const buttons = frameRef.current?.querySelectorAll('button') ?? []
      for (const btn of Array.from(buttons)) {
        if (btn.textContent?.trim() === text) return btn as HTMLButtonElement
      }
      return null
    }

    function findFloatingCartButton() {
      const buttons = frameRef.current?.querySelectorAll('button') ?? []
      for (const btn of Array.from(buttons)) {
        if (/article/.test(btn.textContent ?? '')) return btn as HTMLButtonElement
      }
      return null
    }

    // Défile uniquement à l'intérieur de l'écran du téléphone (scrollRef), sans jamais passer par
    // Element.scrollIntoView() : celle-ci remonte la chaîne des ancêtres scrollables et peut faire
    // défiler la page entière du site jusqu'à la section démo, ce qu'on veut justement éviter.
    function scrollWithinFrame(el: Element | null, align: 'start' | 'center' = 'start') {
      const container = scrollRef.current
      if (!container || !el) return
      const containerRect = container.getBoundingClientRect()
      const elRect = el.getBoundingClientRect()
      const scale = containerRect.width / CONTENT_WIDTH || 1
      const deltaTop = (elRect.top - containerRect.top) / scale
      const elHeight = elRect.height / scale
      const target = align === 'center'
        ? container.scrollTop + deltaTop - (container.clientHeight - elHeight) / 2
        : container.scrollTop + deltaTop
      container.scrollTo({ top: Math.max(0, target), behavior: 'smooth' })
    }

    async function tap(el: HTMLElement) {
      if (cancelled) return
      const pos = positionOf(el)
      if (pos) setCursor(pos)
      await sleep(500)
      if (cancelled) return
      setTapPulse(true)
      // focus() sans preventScroll ferait défiler toute la page pour rendre ce bouton visible
      // (il vit dans un mini téléphone loin dans la page) avant même que click() ne s'exécute.
      el.focus({ preventScroll: true })
      el.click()
      await sleep(350)
      if (cancelled) return
      setTapPulse(false)
    }

    async function typeInto(input: HTMLInputElement, text: string) {
      const pos = positionOf(input)
      if (pos) setCursor(pos)
      for (let i = 1; i <= text.length; i++) {
        if (cancelled) return
        setReactInputValue(input, text.slice(0, i))
        await sleep(45)
      }
    }

    async function run() {
      await sleep(1000)
      while (!cancelled) {
        scrollRef.current?.scrollTo({ top: 0, behavior: 'auto' })
        setCursor(null)
        setTapPulse(false)
        await sleep(1200)
        if (cancelled) return

        // Ajouter un produit au panier (carte produit → modal → "Ajouter au panier")
        const addBtn = findButtonByText('Ajouter')
        if (addBtn) {
          scrollWithinFrame(addBtn, 'center')
          await sleep(700)
          if (cancelled) return
          await tap(addBtn)
          await sleep(400)
          if (cancelled) return

          const addToCartBtn = await waitFor(() => findButtonByText('Ajouter au panier'))
          if (addToCartBtn && !cancelled) {
            await tap(addToCartBtn)
            await sleep(500)
          }
        }
        if (cancelled) return

        // Ouvrir le panier flottant puis passer commande
        const floatingCartBtn = await waitFor(() => findFloatingCartButton(), 1500)
        if (floatingCartBtn && !cancelled) {
          await tap(floatingCartBtn)
          await sleep(500)
          if (cancelled) return

          const commanderBtn = await waitFor(() => findButtonByText('Commander'))
          if (commanderBtn && !cancelled) {
            await tap(commanderBtn)
            await sleep(500)
            if (cancelled) return

            const nameInput = await waitFor(() => frameRef.current?.querySelector<HTMLInputElement>('input[placeholder="Votre nom *"]'))
            const phoneInput = await waitFor(() => frameRef.current?.querySelector<HTMLInputElement>('input[placeholder="Votre téléphone *"]'))
            if (nameInput && phoneInput && !cancelled) {
              await typeInto(nameInput, NOM_DEMO)
              if (cancelled) return
              await sleep(250)
              await typeInto(phoneInput, TEL_DEMO)
              if (cancelled) return
              await sleep(400)

              const sendBtn = await waitFor(() => {
                const btn = findButtonByText('Envoyer')
                return btn && !btn.disabled ? btn : null
              })
              if (sendBtn && !cancelled) {
                await tap(sendBtn)
                await sleep(2400)
              }
            }
          }
        }
        if (cancelled) return

        // Défilement pour montrer avis, livraison, téléphone, réseaux sociaux (footer)
        setCursor(null)
        const reviewsSection = frameRef.current?.querySelector('#avis')
        if (reviewsSection) {
          scrollWithinFrame(reviewsSection, 'start')
          await sleep(1600)
          if (cancelled) return
        }
        const footerSection = frameRef.current?.querySelector('#contact')
        if (footerSection) {
          scrollWithinFrame(footerSection, 'start')
        } else {
          scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
        }
        await sleep(2200)
        if (cancelled) return
      }
    }

    run()
    return () => { cancelled = true }
  }, [boutique.id])

  return (
    <div className="flex flex-col items-center gap-3">
      <span className="text-xs font-semibold px-3 py-1 rounded-full"
        style={{ backgroundColor: `${accentColor}15`, color: accentColor }}>
        {planLabel}
      </span>

      {/* Téléphone */}
      <div className="relative mx-auto aspect-[9/19] w-[220px] overflow-hidden rounded-[2.5rem] border-8 border-gray-900 bg-white shadow-2xl">
        {/* BoutiquePageClient utilise les breakpoints sm:/md:/lg: de Tailwind, qui réagissent à la
            largeur réelle du navigateur — pas à celle, mise à l'échelle, de ce cadre. Sans ce
            correctif, sur un écran desktop le composant bascule en rendu "bureau" (nav complète au
            lieu du burger, grille 5 colonnes...) même à l'intérieur du mini téléphone. On force donc
            ici le rendu mobile quelle que soit la taille réelle de l'écran. */}
        <style>{`
          .tsp-demo-frame .md\\:hidden { display: inline-block !important; }
          .tsp-demo-frame .md\\:flex { display: none !important; }
          .tsp-demo-frame .sm\\:inline-flex { display: none !important; }
          .tsp-demo-frame .grid-cols-2.sm\\:grid-cols-3,
          .tsp-demo-frame .lg\\:grid-cols-5 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          .tsp-demo-frame .grid-cols-1.sm\\:grid-cols-3 { grid-template-columns: repeat(1, minmax(0, 1fr)) !important; }
        `}</style>
        <div ref={frameRef} className="tsp-demo-frame relative h-full w-full overflow-hidden">
          <div className="absolute left-0 top-0 origin-top-left"
            style={{ width: CONTENT_WIDTH, height: fit.height, transform: `scale(${fit.scale})` }}>
            <div ref={scrollRef} className="h-full w-full overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <BoutiquePageClient
                boutique={boutique}
                categories={categories}
                products={products}
                reviews={reviews}
                plan={plan}
                banners={banners}
                previewMode
                demoHomeHref="/pour-les-boutiques"
              />
            </div>
          </div>

          {/* Un vrai clic (utilisateur) ouvre la vraie vitrine dans un nouvel onglet plutôt que de
              naviguer dans le mockup miniature — nos propres .click() programmatiques (ci-dessus)
              ciblent les éléments directement et ignorent cette superposition. On laisse le bandeau
              démo ("← Accueil" / "Créer ma boutique →") en dehors de cette zone pour que ses liens
              fonctionnent normalement au clic. */}
          <div
            className="absolute left-0 right-0 bottom-0 z-40 cursor-pointer"
            style={{ top: boutique.is_demo ? 40 * fit.scale : 0 }}
            onClick={() => window.open(`/${boutique.slug}`, '_blank', 'noopener,noreferrer')}
            role="link" tabIndex={0}
            aria-label={`Voir la boutique démo ${boutique.name}`}
            onKeyDown={e => {
              if (e.key === 'Enter') window.open(`/${boutique.slug}`, '_blank', 'noopener,noreferrer')
            }}
          />

          {/* Curseur animé */}
          {cursor && (
            <div className="pointer-events-none absolute z-50 transition-all duration-500 ease-out"
              style={{ left: cursor.left, top: cursor.top }}>
              <div className="relative -translate-x-1/2 -translate-y-1/2">
                {tapPulse && (
                  <span className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full animate-ping opacity-60"
                    style={{ backgroundColor: accentColor }} />
                )}
                <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-gray-900/80 shadow-md">
                  <MessageCircle size={11} className="text-white" />
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center">Cliquez pour voir la vraie vitrine</p>
    </div>
  )
}
