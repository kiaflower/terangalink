'use client'

import { useState, useEffect } from 'react'
import { X, Lightbulb, AlertTriangle, Sparkles, RefreshCw, Clock } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface SmartCard {
  id: string
  type: 'audit' | 'inactivity' | 'seasonal' | 'product' | 'unclosed_orders'
  icon: React.ReactNode
  title: string
  body: string
  cta?: { label: string; href: string }
  color: string // border + icon color
  dismissDays: number // combien de jours avant de réafficher
}

interface SmartCardsProps {
  restaurantId: string
  plan: string
  menuItemsCount: number
  hasWhatsapp: boolean
  hasWave: boolean
  hasOrangeMoney: boolean
  hasFeaturedProduct: boolean
  lastMenuUpdate: string | null // ISO date
  lastOrderDate: string | null  // ISO date
  restaurantCreatedAt: string
}

// Sénégal / Afrique de l'Ouest dates approximatives
function getSeasonalCards(plan: string, isPremium: boolean): SmartCard[] {
  const now = new Date()
  const month = now.getMonth() + 1 // 1-12
  const day = now.getDate()
  const cards: SmartCard[] = []

  // Ramadan ~ mars-avril selon l'année lunaire (on utilise une fenêtre large)
  if ((month === 3 || month === 4) && isPremium) {
    cards.push({
      id: 'seasonal_ramadan',
      type: 'seasonal',
      icon: <Sparkles className="w-4 h-4" />,
      title: 'Ramadan Kareem 🌙',
      body: 'C\'est la période idéale pour lancer des offres spéciales Iftar. Activez les précommandes et créez une bannière promotionnelle pour attirer plus de clients.',
      cta: { label: 'Créer une bannière', href: '/dashboard/restaurant/banners' },
      color: 'border-yellow-500/30 text-yellow-400',
      dismissDays: 7,
    })
  }

  // Korité / Aïd el-Fitr ~ fin mars-début mai
  if ((month === 4 || month === 5) && day <= 15 && isPremium) {
    cards.push({
      id: 'seasonal_korite',
      type: 'seasonal',
      icon: <Sparkles className="w-4 h-4" />,
      title: 'Korité approche 🎊',
      body: 'Proposez des menus spéciaux et des codes promo pour la fête. Mettez en avant vos plats signature pour attirer les familles.',
      cta: { label: 'Ajouter un code promo', href: '/dashboard/restaurant/promotions' },
      color: 'border-orange-500/30 text-orange-400',
      dismissDays: 5,
    })
  }

  // Tabaski / Aïd el-Adha ~ juin-août
  if ((month >= 6 && month <= 8) && isPremium) {
    cards.push({
      id: 'seasonal_tabaski',
      type: 'seasonal',
      icon: <Sparkles className="w-4 h-4" />,
      title: 'Tabaski approche 🐏',
      body: 'La Tabaski est l\'une des périodes les plus actives pour la restauration. Lancez des précommandes et créez des offres spéciales pour vous démarquer.',
      cta: { label: 'Activer les précommandes', href: '/dashboard/restaurant/menu' },
      color: 'border-green-500/30 text-green-400',
      dismissDays: 7,
    })
  }

  // Saint-Valentin
  if (month === 2 && day <= 16) {
    cards.push({
      id: 'seasonal_valentine',
      type: 'seasonal',
      icon: <Sparkles className="w-4 h-4" />,
      title: 'Saint-Valentin ❤️',
      body: 'Créez une offre "Menu pour 2" et mettez-la en avant. Un code promo romantique peut booster vos commandes ce soir.',
      cta: { label: 'Ajouter une bannière', href: '/dashboard/restaurant/banners' },
      color: 'border-pink-500/30 text-pink-400',
      dismissDays: 3,
    })
  }

  // Noël
  if (month === 12 && day >= 18) {
    cards.push({
      id: 'seasonal_noel',
      type: 'seasonal',
      icon: <Sparkles className="w-4 h-4" />,
      title: 'Fêtes de fin d\'année 🎄',
      body: 'C\'est la période des grandes tablées. Proposez des menus festifs, activez les précommandes et lancez une promo spéciale.',
      cta: { label: 'Créer une promo', href: '/dashboard/restaurant/promotions' },
      color: 'border-red-500/30 text-red-400',
      dismissDays: 5,
    })
  }

  // Rentrée scolaire
  if (month === 10 && day <= 20) {
    cards.push({
      id: 'seasonal_rentree',
      type: 'seasonal',
      icon: <Sparkles className="w-4 h-4" />,
      title: 'Rentrée scolaire 📚',
      body: 'Proposez des menus rapides et abordables pour les parents pressés et les étudiants. C\'est le moment de mettre à jour votre menu.',
      cta: { label: 'Mettre à jour le menu', href: '/dashboard/restaurant/menu' },
      color: 'border-blue-500/30 text-blue-400',
      dismissDays: 7,
    })
  }

  return cards
}

function buildUnclosedOrdersCard(unclosedCount: number): SmartCard | null {
  if (unclosedCount === 0) return null

  return {
    id: 'unclosed_orders_eod',
    type: 'unclosed_orders',
    icon: <Clock className="w-4 h-4" />,
    title: `${unclosedCount} commande${unclosedCount > 1 ? 's' : ''} non clôturée${unclosedCount > 1 ? 's' : ''}`,
    body: `Vous avez ${unclosedCount} commande${unclosedCount > 1 ? 's' : ''} du jour qui n'${unclosedCount > 1 ? 'ont' : 'a'} pas encore été marquée${unclosedCount > 1 ? 's' : ''} comme livrée${unclosedCount > 1 ? 's' : ''} ou annulée${unclosedCount > 1 ? 's' : ''}. Clôturez-les pour garder vos statistiques à jour.`,
    cta: { label: 'Voir les commandes', href: '/dashboard/restaurant/orders' },
    color: 'border-orange-500/30 text-orange-400',
    dismissDays: 4 / 24, // re-afficher après 4h (fractional day)
  }
}

function buildAllCards(props: SmartCardsProps): SmartCard[] {
  const {
    plan, menuItemsCount, hasWhatsapp, hasWave, hasOrangeMoney,
    hasFeaturedProduct, lastMenuUpdate, lastOrderDate, restaurantCreatedAt,
  } = props

  const isPremium = plan === 'premium'
  const isPro = plan === 'pro' || isPremium
  const cards: SmartCard[] = []

  // ── AUDIT ─────────────────────────────────────────────────────────────────

  // Pas de WhatsApp
  if (!hasWhatsapp) {
    cards.push({
      id: 'audit_no_whatsapp',
      type: 'audit',
      icon: <AlertTriangle className="w-4 h-4" />,
      title: 'WhatsApp non configuré',
      body: 'Sans numéro WhatsApp, vos clients ne peuvent pas passer de commandes. Configurez-le maintenant dans Paramètres.',
      cta: { label: 'Configurer', href: '/dashboard/restaurant/settings' },
      color: 'border-red-500/30 text-red-400',
      dismissDays: 3,
    })
  }

  // Pas de Wave ni Orange Money
  if (!hasWave && !hasOrangeMoney && hasWhatsapp) {
    cards.push({
      id: 'audit_no_payment',
      type: 'audit',
      icon: <AlertTriangle className="w-4 h-4" />,
      title: 'Aucun moyen de paiement',
      body: 'Renseignez vos numéros Wave et Orange Money dans Paramètres. Ils apparaissent automatiquement dans le message de confirmation envoyé à vos clients.',
      cta: { label: 'Configurer', href: '/dashboard/restaurant/settings' },
      color: 'border-orange-500/30 text-orange-400',
      dismissDays: 5,
    })
  }

  // Menu vide ou très peu garni
  if (menuItemsCount === 0) {
    cards.push({
      id: 'audit_empty_menu',
      type: 'audit',
      icon: <AlertTriangle className="w-4 h-4" />,
      title: 'Votre menu est vide',
      body: 'Vos clients ne peuvent rien commander pour l\'instant. Ajoutez au moins 3 plats pour attirer vos premiers visiteurs.',
      cta: { label: 'Ajouter des plats', href: '/dashboard/restaurant/menu' },
      color: 'border-red-500/30 text-red-400',
      dismissDays: 2,
    })
  } else if (menuItemsCount < 5) {
    cards.push({
      id: 'audit_few_products',
      type: 'audit',
      icon: <Lightbulb className="w-4 h-4" />,
      title: 'Menu encore limité',
      body: `Vous avez ${menuItemsCount} plat${menuItemsCount > 1 ? 's' : ''}. Les restaurants avec 8+ plats reçoivent en moyenne 3× plus de commandes. Enrichissez votre menu !`,
      cta: { label: 'Ajouter des plats', href: '/dashboard/restaurant/menu' },
      color: 'border-yellow-500/30 text-yellow-400',
      dismissDays: 7,
    })
  }

  // Pas de produit mis en avant (Premium seulement)
  if (isPremium && !hasFeaturedProduct && menuItemsCount >= 3) {
    cards.push({
      id: 'audit_no_featured',
      type: 'audit',
      icon: <Lightbulb className="w-4 h-4" />,
      title: 'Aucun produit mis en avant',
      body: 'Avec votre plan Premium, vous pouvez épingler un "Best Seller" ou un "Recommandé" pour attirer l\'attention de vos visiteurs.',
      cta: { label: 'Mettre en avant un plat', href: '/dashboard/restaurant/menu' },
      color: 'border-yellow-500/30 text-yellow-400',
      dismissDays: 14,
    })
  }

  // ── INACTIVITÉ ────────────────────────────────────────────────────────────

  const daysSinceCreation = Math.floor(
    (Date.now() - new Date(restaurantCreatedAt).getTime()) / 86400000
  )

  // Inactivité menu > 30 jours (seulement si restaurant > 14 jours)
  if (daysSinceCreation > 14 && lastMenuUpdate) {
    const daysSinceMenu = Math.floor(
      (Date.now() - new Date(lastMenuUpdate).getTime()) / 86400000
    )
    if (daysSinceMenu > 30) {
      cards.push({
        id: 'inactivity_menu',
        type: 'inactivity',
        icon: <RefreshCw className="w-4 h-4" />,
        title: 'Menu non mis à jour',
        body: `Votre menu n'a pas changé depuis ${daysSinceMenu} jours. Ajouter un nouveau plat ou modifier les prix maintient vos clients intéressés.`,
        cta: { label: 'Mettre à jour le menu', href: '/dashboard/restaurant/menu' },
        color: 'border-blue-500/30 text-blue-400',
        dismissDays: 14,
      })
    }
  }

  // Pas de commandes depuis > 14 jours
  if (daysSinceCreation > 14 && lastOrderDate) {
    const daysSinceOrder = Math.floor(
      (Date.now() - new Date(lastOrderDate).getTime()) / 86400000
    )
    if (daysSinceOrder > 14) {
      cards.push({
        id: 'inactivity_orders',
        type: 'inactivity',
        icon: <RefreshCw className="w-4 h-4" />,
        title: 'Aucune commande récente',
        body: `Pas de commandes depuis ${daysSinceOrder} jours. Partagez votre lien sur WhatsApp, Instagram ou Facebook pour relancer l'activité.`,
        cta: { label: 'Voir mon profil', href: '/dashboard/restaurant/profile' },
        color: 'border-blue-500/30 text-blue-400',
        dismissDays: 7,
      })
    }
  }

  // ── SAISONNIER désactivé — à réactiver plus tard ─────────────────────────

  return cards
}

function shouldShowCard(id: string, dismissDays: number): boolean {
  try {
    const key = `tl_smart_${id}`
    const stored = localStorage.getItem(key)
    if (!stored) return true
    const dismissedAt = new Date(stored)
    const daysSince = (Date.now() - dismissedAt.getTime()) / 86400000
    return daysSince >= dismissDays
  } catch {
    return true
  }
}

function dismissCard(id: string) {
  try {
    localStorage.setItem(`tl_smart_${id}`, new Date().toISOString())
  } catch {}
}

export function SmartCards(props: SmartCardsProps) {
  const [card, setCard] = useState<SmartCard | null>(null)
  const [visible, setVisible] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [unclosedCount, setUnclosedCount] = useState(0)
  const supabase = createClient()

  // Fetch des commandes non clôturées du jour (en background)
  useEffect(() => {
    async function fetchUnclosed() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase
        .from('profiles').select('restaurant_id').eq('id', user.id).single()
      if (!profile?.restaurant_id) return

      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', profile.restaurant_id)
        .gte('created_at', todayStart.toISOString())
        .not('status', 'in', '("delivered","cancelled","delivery_cancelled")')

      setUnclosedCount(count ?? 0)
    }

    fetchUnclosed()
    // Re-fetch toutes les 15 min
    const interval = setInterval(fetchUnclosed, 15 * 60 * 1000)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    // Attendre 3 secondes avant d'afficher pour ne pas surcharger au chargement
    const timer = setTimeout(() => {
      // Heure locale (Dakar = UTC+0, pas de décalage)
      const now = new Date()
      const hour = now.getHours()
      const isEndOfDay = hour >= 21 // à partir de 21h

      // Carte "commandes non clôturées" en fin de journée — priorité absolue
      if (isEndOfDay && unclosedCount > 0) {
        const unclosedCard = buildUnclosedOrdersCard(unclosedCount)
        if (unclosedCard && shouldShowCard(unclosedCard.id, unclosedCard.dismissDays)) {
          setCard(unclosedCard)
          setVisible(true)
          return
        }
      }

      const allCards = buildAllCards(props)

      // Filtrer les cartes dismissées
      const eligible = allCards.filter(c => shouldShowCard(c.id, c.dismissDays))
      if (eligible.length === 0) return

      // Priorité : audit > inactivité > saisonnier > produit
      const priorityOrder = ['audit', 'inactivity', 'seasonal', 'product']
      eligible.sort((a, b) => priorityOrder.indexOf(a.type) - priorityOrder.indexOf(b.type))

      // 60% de chance d'afficher (pas systématique)
      if (Math.random() > 0.6 && eligible[0].type !== 'audit') return

      setCard(eligible[0])
      setVisible(true)
    }, 3000)

    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unclosedCount])

  function handleDismiss() {
    if (!card) return
    dismissCard(card.id)
    setLeaving(true)
    setTimeout(() => {
      setVisible(false)
      setCard(null)
    }, 300)
  }

  if (!visible || !card) return null

  return (
    <div className={`fixed bottom-6 right-6 z-40 w-80 transition-all duration-300 ${
      leaving ? 'translate-y-2 opacity-0' : 'translate-y-0 opacity-100'
    }`}>
      <div className={`bg-gray-50 border rounded-2xl shadow-2xl overflow-hidden ${card.color.split(' ')[0]}`}>
        {/* Ligne colorée en haut */}
        <div className={`h-0.5 ${
          card.color.includes('red') ? 'bg-red-400' :
          card.color.includes('orange') ? 'bg-orange-400' :
          card.color.includes('yellow') ? 'bg-yellow-400' :
          card.color.includes('green') ? 'bg-green-400' :
          card.color.includes('blue') ? 'bg-blue-400' :
          card.color.includes('pink') ? 'bg-pink-400' :
          'bg-brand-orange'
        }`} />

        <div className="px-4 pt-4 pb-2 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className={card.color.split(' ')[1]}>{card.icon}</span>
            <h3 className="text-gray-900 font-bold text-sm">{card.title}</h3>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-500 hover:text-gray-400 transition-colors flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="px-4 pb-4 space-y-3">
          <p className="text-gray-400 text-xs leading-relaxed">{card.body}</p>
          {card.cta && (
            <Link
              href={card.cta.href}
              onClick={handleDismiss}
              className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-colors ${
                card.color.includes('red') ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400' :
                card.color.includes('orange') ? 'bg-orange-500/10 hover:bg-orange-500/20 text-orange-400' :
                card.color.includes('yellow') ? 'bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400' :
                card.color.includes('green') ? 'bg-green-500/10 hover:bg-green-500/20 text-green-400' :
                card.color.includes('pink') ? 'bg-pink-500/10 hover:bg-pink-500/20 text-pink-400' :
                'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400'
              }`}
            >
              {card.cta.label}
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
