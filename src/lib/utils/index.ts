import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

export function formatCurrency(amount: number, currency = 'XOF'): string {
  if (currency === 'XOF') {
    return `${amount.toLocaleString('fr-SN')} FCFA`
  }
  return new Intl.NumberFormat('fr-SN', {
    style: 'currency',
    currency,
  }).format(amount)
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('fr-SN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export const PLAN_PRICES: Record<string, number> = {
  starter: 9000,
  pro: 15000,
  // Compatibilité lecture des anciens abonnements par durée.
  mensuel: 9000,
  trimestriel: 9000,
  annuel: 15000,
  enterprise: 15000,
  premium: 15000,
}

export const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter',
  pro: 'Pro',
  // Compatibilité lecture des anciens abonnements par durée.
  mensuel: 'Starter',
  trimestriel: 'Starter',
  annuel: 'Pro',
  enterprise: 'Pro',
  premium: 'Pro',
}


export const STATUS_COLORS: Record<string, string> = {
  active: 'text-green-400 bg-green-400/10',
  trial: 'text-yellow-400 bg-yellow-400/10',
  suspended: 'text-red-400 bg-red-400/10',
  cancelled: 'text-gray-400 bg-gray-400/10',
}
