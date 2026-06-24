'use client'

import { Clock, CreditCard, RefreshCw } from 'lucide-react'
import type { Subscription } from '@/lib/types'

interface Props {
  subscription: Subscription
  tlWhatsapp: string
}

export function SubscriptionReminder({ subscription, tlWhatsapp }: Props) {
  const now = new Date()

  // ── Calculs ──────────────────────────────────────────────────────────────
  const isTrial = subscription.status === 'trial'
  const isActive = subscription.status === 'active'
  const isOverdue = subscription.status === 'overdue'

  const endDate = isTrial
    ? (subscription as Subscription & { trial_end_date?: string }).trial_end_date
    : (subscription as Subscription & { next_payment_due_date?: string }).next_payment_due_date

  if (!endDate && !isOverdue) return null

  const daysLeft = endDate
    ? Math.ceil((new Date(endDate).getTime() - now.getTime()) / 86400000)
    : -1

  const showButton = isTrial || isOverdue || (isActive && daysLeft <= 7)
  if (!showButton && daysLeft > 7) return null

  // ── Messages WhatsApp ────────────────────────────────────────────────────
  const waMessage = isTrial
    ? encodeURIComponent("Bonjour, j'aimerais m'abonner à TerangaLink 🙏")
    : encodeURIComponent("Bonjour, j'aimerais renouveler mon abonnement à TerangaLink 🙏")

  const whatsappUrl = `https://wa.me/${tlWhatsapp.replace(/\D/g, '')}?text=${waMessage}`

  // ── Apparence selon contexte ─────────────────────────────────────────────
  let borderColor = 'border-blue-500/20'
  let bgColor = 'bg-blue-500/5'
  let iconColor = 'text-blue-400'
  let Icon = Clock

  if (isOverdue || daysLeft < 0) {
    borderColor = 'border-red-500/20'; bgColor = 'bg-red-500/5'; iconColor = 'text-red-400'; Icon = CreditCard
  } else if (daysLeft <= 3) {
    borderColor = 'border-orange-500/20'; bgColor = 'bg-orange-500/5'; iconColor = 'text-orange-400'; Icon = CreditCard
  } else if (daysLeft <= 7) {
    borderColor = 'border-yellow-500/20'; bgColor = 'bg-yellow-500/5'; iconColor = 'text-yellow-400'; Icon = RefreshCw
  }

  // ── Texte ────────────────────────────────────────────────────────────────
  let title = ''
  let body = ''
  let ctaLabel = ''

  if (isTrial) {
    if (daysLeft <= 0) {
      title = 'Votre essai est terminé'
      body = "Votre période d'essai gratuit s'est terminée. Abonnez-vous pour continuer à recevoir des commandes."
      ctaLabel = "S'abonner maintenant"
    } else if (daysLeft === 1) {
      title = "Dernier jour d'essai"
      body = "Votre période d'essai se termine aujourd'hui. Abonnez-vous pour ne pas perdre l'accès à votre restaurant."
      ctaLabel = "S'abonner maintenant"
    } else {
      title = `${daysLeft} jour${daysLeft > 1 ? 's' : ''} d'essai restant${daysLeft > 1 ? 's' : ''}`
      body = `Votre essai gratuit se termine le ${new Date(endDate!).toLocaleDateString('fr-SN', { day: 'numeric', month: 'long' })}. Abonnez-vous pour continuer sans interruption.`
      ctaLabel = "S'abonner"
    }
  } else if (isOverdue) {
    title = 'Abonnement en retard'
    body = 'Votre abonnement a expiré. Renouvelez-le pour que vos clients puissent continuer à passer des commandes.'
    ctaLabel = 'Renouveler maintenant'
  } else if (isActive && daysLeft <= 7) {
    title = daysLeft <= 0
      ? "Échéance aujourd'hui"
      : `Renouvellement dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}`
    body = endDate
      ? `Votre abonnement expire le ${new Date(endDate).toLocaleDateString('fr-SN', { day: 'numeric', month: 'long', year: 'numeric' })}. Renouvelez avant cette date pour éviter toute interruption.`
      : 'Votre abonnement arrive bientôt à échéance.'
    ctaLabel = 'Renouveler mon abonnement'
  }

  if (!title) return null

  return (
    <div className={`mt-6 rounded-2xl border ${borderColor} ${bgColor} p-5 flex items-start gap-4`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${bgColor} border ${borderColor}`}>
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-sm ${iconColor}`}>{title}</p>
        <p className="text-gray-400 text-xs mt-1 leading-relaxed">{body}</p>
      </div>
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-colors ${
          isOverdue || daysLeft <= 0
            ? 'bg-red-500 hover:bg-red-600'
            : daysLeft <= 3
            ? 'bg-orange-500 hover:bg-orange-600'
            : 'bg-[#25D366] hover:bg-[#1ebe5d]'
        }`}
      >
        {ctaLabel}
      </a>
    </div>
  )
}
