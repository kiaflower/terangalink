import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('fr-SN').format(price) + ' FCFA'
}

export function applyDiscount(price: number, discountPercent?: number | null): number {
  if (!discountPercent) return price
  return Math.round(price * (1 - discountPercent / 100))
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat('fr-SN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (!data.length) return
  const headers = Object.keys(data[0])
  const rows = data.map(row => headers.map(h => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(','))
  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function buildWhatsAppMessage(
  restaurantName: string,
  items: Array<{
    name: string
    quantity: number
    price: number
    variants?: Record<string, string>
    isPreorder?: boolean
    preorderDeliveryDate?: string
    preorderNote?: string
  }>,
  subtotal: number,
  customerName: string,
  customerPhone: string,
  options?: {
    notes?: string
    address?: string
    dashboardUrl?: string
    paymentMethod?: string
    promo?: { code: string; discountAmount: number }
  }
): string {
  const { notes, address, dashboardUrl, paymentMethod, promo } = options ?? {}
  const total = promo ? subtotal - promo.discountAmount : subtotal
  const hasPreorder = items.some(item => item.isPreorder)

  const lines = [`Bonjour ${restaurantName},`, '', hasPreorder ? 'Voici ma précommande :' : 'Voici ma commande :', '']
  for (const item of items) {
    lines.push(`- *${item.name}* x${item.quantity}`)
    if (item.variants) {
      const variantStr = Object.entries(item.variants)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ')
      if (variantStr) lines.push(`   Variante : ${variantStr}`)
    }
    lines.push(`   Prix : ${formatPrice(item.price * item.quantity)}`)
    if (item.preorderNote) lines.push(`   ${item.preorderNote}`)
    lines.push('')
  }
  if (promo) {
    lines.push(`Sous-total : ${formatPrice(subtotal)}`)
    lines.push(`Réduction (${promo.code}) : -${formatPrice(promo.discountAmount)}`)
  }
  lines.push(`*Total : ${formatPrice(total)}*`)
  if (paymentMethod) lines.push(`Paiement souhaité : ${paymentMethod}`)
  lines.push('', '---')
  lines.push(`Nom : ${customerName}`)
  lines.push(`Téléphone : ${customerPhone}`)
  if (address) lines.push(`Adresse : ${address}`)
  if (notes) lines.push(`Note : ${notes}`)
  if (dashboardUrl) lines.push('', 'Voici le lien de ma commande :', dashboardUrl)
  lines.push('', 'Merci !')
  return lines.join('\n')
}
