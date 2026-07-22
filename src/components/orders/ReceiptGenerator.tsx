'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { FeatureGate } from '@/components/FeatureGate'
import type { PlanKey } from '@/lib/plans'
import type { Order } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { sanitizeHexColor } from '@/lib/theme'

type OrderItem = { name: string; quantity: number; price: number; isPreorder?: boolean; preorderDeliveryDate?: string }

interface RestaurantInfo {
  name: string
  address: string | null
  phone: string | null
  primary_color: string
}

interface Props {
  order: Order
  restaurant: RestaurantInfo
  plan: PlanKey
}

export function ReceiptGenerator({ order, restaurant, plan }: Props) {
  const [downloading, setDownloading] = useState(false)
  const orderItems = (order.items as OrderItem[]) ?? []
  const items = orderItems.map(i => ({ name: i.name, quantity: i.quantity, price: i.price }))
  const accentColor = sanitizeHexColor(restaurant.primary_color)
  const isPreorder = orderItems.some(i => i.isPreorder)
  const deliveryDates = Array.from(new Set(orderItems.filter(i => i.isPreorder && i.preorderDeliveryDate).map(i => i.preorderDeliveryDate as string)))

  const params = new URLSearchParams({
    restaurantName: restaurant.name || '',
    restaurantAddress: restaurant.address || '',
    restaurantPhone: restaurant.phone || '',
    orderNumber: order.order_number,
    date: formatDate(order.created_at),
    customerName: order.customer_name || '',
    customerPhone: order.customer_phone || '',
    total: String(order.total),
    discountAmount: String(order.discount_amount || 0),
    paymentLabel: order.payment_method || 'Especes',
    accentColor,
    items: encodeURIComponent(JSON.stringify(items)),
    ...(isPreorder ? { isPreorder: '1', deliveryDate: deliveryDates.join(', ') } : {}),
  })
  const receiptUrl = `/api/receipt?${params.toString()}`

  async function downloadReceipt() {
    setDownloading(true)
    try {
      const res = await fetch(receiptUrl)
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `recu-${order.order_number}.png`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(blobUrl)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <FeatureGate
      plan={plan}
      feature="generationRecus"
      fallback={
        <span className="inline-flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg bg-gray-50 text-gray-400">
          <Download className="w-3.5 h-3.5" /> Reçu — réservé au plan Pro
        </span>
      }
    >
      <button
        type="button"
        onClick={downloadReceipt}
        disabled={downloading}
        className="inline-flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
      >
        <Download className="w-3.5 h-3.5" /> {downloading ? 'Téléchargement…' : 'Télécharger le reçu'}
      </button>
    </FeatureGate>
  )
}
