'use client'

import { useState } from 'react'
import { FileText, X, Download, Loader2 } from 'lucide-react'
import type { Order, OrderItem } from '@/lib/types'

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Especes',
  wave: 'Wave',
  orange_money: 'Orange Money',
}

interface Props {
  order: Order
  restaurantName: string
  restaurantPhone?: string
  restaurantAddress?: string
  accentColor?: string
}

function formatDateTime(dateString: string) {
  return new Intl.DateTimeFormat('fr-SN', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Africa/Dakar',
  }).format(new Date(dateString))
}

function getPaymentLabel(order: Order): string {
  if (order.payment_method && PAYMENT_LABELS[order.payment_method]) {
    return PAYMENT_LABELS[order.payment_method]
  }
  if (order.notes) {
    const match = order.notes.match(/Paiement\s*:\s*(.+)/i)
    if (match) return match[1].trim()
  }
  return 'Especes'
}

function buildReceiptHTML(
  order: Order,
  restaurantName: string,
  accentColor: string,
  restaurantPhone?: string,
  restaurantAddress?: string,
) {
  const items = order.items as OrderItem[]
  const orderId = order.id.slice(0, 8).toUpperCase()
  const paymentLabel = getPaymentLabel(order)
  const displayNotes = order.notes?.replace(/Paiement\s*:\s*.+/i, '').trim() || ''

  // Détection précommande
  const preorderItem = items.find(i => i.preorder_delivery_date)
  const isPreorder = !!preorderItem
  const preorderDate = preorderItem?.preorder_delivery_date ?? null

  const dashes = '- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -'

  const itemsHTML = items.map(item => `
    <div style="margin-bottom:8px;">
      <div style="font-size:13px;font-weight:700;color:#111;">${item.name}${(item as OrderItem).variant_name ? ` — ${(item as OrderItem).variant_name}` : ''}</div>
      <div style="font-size:12px;color:#666;margin-top:2px;">${item.quantity} x ${item.price.toLocaleString('fr-SN')} = ${(item.price * item.quantity).toLocaleString('fr-SN')} FCFA</div>
    </div>
  `).join('')

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: white; }
</style>
</head>
<body>
<div style="width:400px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;">

  <!-- HEADER bloc solide -->
  <div style="background:${accentColor};width:400px;padding:32px 28px 28px;">
    <div style="font-size:26px;font-weight:900;color:#ffffff;text-align:center;margin-bottom:6px;">${restaurantName}</div>
    ${restaurantAddress ? `<div style="font-size:11px;color:rgba(255,255,255,0.85);text-align:center;text-transform:uppercase;letter-spacing:1px;margin-bottom:18px;">${restaurantAddress}</div>` : `<div style="margin-bottom:18px;"></div>`}
    <div style="font-size:10px;font-weight:700;color:#ffffff;text-align:center;letter-spacing:2px;opacity:0.9;">— ${isPreorder ? 'RECU DE PRÉCOMMANDE' : 'RECU DE COMMANDE'} —</div>
  </div>

  <!-- BODY -->
  <div style="padding:20px 28px 28px;background:#ffffff;">

    <!-- Tirets séparateurs en texte — jamais de border CSS -->
    <div style="font-size:9px;color:#ccc;letter-spacing:2px;margin-bottom:14px;">${dashes}</div>

    ${isPreorder ? `
    <div style="margin-bottom:14px;background:${accentColor}15;border:1px solid ${accentColor}40;border-radius:8px;padding:10px 14px;">
      <div style="font-size:12px;font-weight:700;color:${accentColor};margin-bottom:4px;">📅 PRÉCOMMANDE</div>
      ${preorderDate ? `<div style="font-size:11px;color:#555;">Livraison prévue : <strong>${preorderDate}</strong></div>` : ''}
    </div>
    <div style="font-size:9px;color:#ccc;letter-spacing:2px;margin-bottom:14px;">${dashes}</div>
    ` : ''}

    <div style="margin-bottom:14px;">
      <div style="font-size:9px;font-weight:700;color:#aaa;letter-spacing:2px;margin-bottom:5px;">N° COMMANDE</div>
      <div style="font-size:20px;font-weight:900;color:#111;">#${orderId}</div>
    </div>

    <div style="font-size:9px;color:#ccc;letter-spacing:2px;margin-bottom:14px;">${dashes}</div>

    <div style="margin-bottom:14px;">
      <div style="font-size:9px;font-weight:700;color:#aaa;letter-spacing:2px;margin-bottom:5px;">DATE</div>
      <div style="font-size:14px;font-weight:600;color:#111;">${formatDateTime(order.created_at)}</div>
    </div>

    <div style="font-size:9px;color:#ccc;letter-spacing:2px;margin-bottom:14px;">${dashes}</div>

    <div style="margin-bottom:14px;">
      <div style="font-size:9px;font-weight:700;color:#aaa;letter-spacing:2px;margin-bottom:5px;">CLIENT</div>
      <div style="font-size:14px;font-weight:700;color:#111;">${order.customer_name || '-'}</div>
      ${order.customer_phone ? `<div style="font-size:12px;color:#888;margin-top:3px;">${order.customer_phone}</div>` : ''}
      ${order.customer_address ? `<div style="font-size:12px;color:#888;margin-top:3px;">${order.customer_address}</div>` : ''}
    </div>

    <div style="font-size:9px;color:#ccc;letter-spacing:2px;margin-bottom:14px;">${dashes}</div>

    <div style="margin-bottom:14px;">
      <div style="font-size:9px;font-weight:700;color:#aaa;letter-spacing:2px;margin-bottom:10px;">ARTICLES</div>
      ${itemsHTML}
    </div>

    <div style="font-size:9px;color:#ccc;letter-spacing:2px;margin-bottom:14px;">${dashes}</div>

    <div style="margin-bottom:14px;">
      <div style="font-size:9px;font-weight:700;color:#aaa;letter-spacing:2px;margin-bottom:5px;">TOTAL</div>
      <div style="font-size:28px;font-weight:900;color:${accentColor};">${order.total.toLocaleString('fr-SN')} FCFA</div>
    </div>

    <div style="font-size:9px;color:#ccc;letter-spacing:2px;margin-bottom:14px;">${dashes}</div>

    <div style="margin-bottom:14px;">
      <div style="font-size:9px;font-weight:700;color:#aaa;letter-spacing:2px;margin-bottom:5px;">MODE DE PAIEMENT</div>
      <div style="font-size:14px;font-weight:700;color:#111;">${paymentLabel}</div>
    </div>

    ${displayNotes ? `
    <div style="font-size:9px;color:#ccc;letter-spacing:2px;margin-bottom:14px;">${dashes}</div>
    <div style="margin-bottom:14px;">
      <div style="font-size:9px;font-weight:700;color:#aaa;letter-spacing:2px;margin-bottom:5px;">NOTE</div>
      <div style="font-size:13px;color:#555;">${displayNotes}</div>
    </div>` : ''}

    <div style="font-size:9px;color:#ccc;letter-spacing:2px;margin-bottom:20px;">${dashes}</div>

    <!-- FOOTER -->
    <div style="text-align:center;">
      <div style="font-size:15px;font-weight:700;color:#111;margin-bottom:6px;">Merci pour votre commande !</div>
      ${restaurantPhone ? `<div style="font-size:12px;color:#aaa;margin-bottom:4px;">${restaurantPhone}</div>` : ''}
      <div style="font-size:10px;color:#ccc;margin-top:6px;">Propulse par <span style="color:${accentColor};font-weight:700;">TerangaLink</span></div>
    </div>

  </div>
</div>
</body>
</html>`
}

export function ReceiptGenerator({
  order, restaurantName, restaurantPhone, restaurantAddress, accentColor = '#F97316'
}: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const orderId = order.id.slice(0, 8).toUpperCase()
  const items = order.items as OrderItem[]

  // Détection précommande depuis les items
  const preorderItem = items.find(i => i.preorder_delivery_date)
  const isPreorder = !!preorderItem
  const preorderDate = preorderItem?.preorder_delivery_date ?? null

  async function handleDownload() {
    setLoading(true)
    try {
      const html2canvas = (await import('html2canvas')).default

      // Iframe isolé pour éviter toute interférence CSS de Next.js
      const iframe = document.createElement('iframe')
      iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:400px;height:1px;border:none;'
      document.body.appendChild(iframe)

      await new Promise<void>(resolve => {
        iframe.onload = () => resolve()
        iframe.srcdoc = buildReceiptHTML(order, restaurantName, accentColor, restaurantPhone, restaurantAddress)
      })

      // Attendre rendu complet
      await new Promise(r => setTimeout(r, 400))

      const doc = iframe.contentDocument!
      const node = doc.body.firstElementChild as HTMLElement

      const canvas = await html2canvas(node, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: 400,
        height: node.scrollHeight,
        windowWidth: 400,
      })

      document.body.removeChild(iframe)

      // Télécharger en PNG — plus simple et envoyable WhatsApp
      const url = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = url
      a.download = `recu-${orderId}-${restaurantName.toLowerCase().replace(/\s+/g, '-')}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setOpen(false)
    } catch (err) {
      console.error('Receipt error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 bg-surface-100 hover:bg-surface-200 border border-surface-300 text-gray-300 hover:text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
      >
        <FileText className="w-3.5 h-3.5" />
        Recu
      </button>

      {open && (
        <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-surface-50 border border-surface-200 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">

            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-200">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-brand-orange/15">
                  <FileText className="w-4 h-4 text-brand-orange" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Recu de commande</h3>
                  <p className="text-gray-500 text-xs">#{orderId}</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-gray-500 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-4">
              <div className="bg-surface-100 rounded-xl p-4 mb-4 space-y-2">
                {isPreorder && (
                  <div className="flex justify-between text-sm pb-2 border-b border-surface-200">
                    <span className="text-brand-orange font-semibold">📅 Précommande</span>
                    {preorderDate && <span className="text-white font-medium text-xs">{preorderDate}</span>}
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Client</span>
                  <span className="text-white font-medium">{order.customer_name || '-'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Articles</span>
                  <span className="text-white font-medium">{items.length} article(s)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Paiement</span>
                  <span className="text-white font-medium">{getPaymentLabel(order)}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-surface-200 pt-2">
                  <span className="text-gray-400">Total</span>
                  <span className="font-bold text-brand-orange">{order.total.toLocaleString('fr-SN')} FCFA</span>
                </div>
              </div>

              <button
                onClick={handleDownload}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-brand-orange hover:bg-brand-orange-dark text-white font-semibold py-3 rounded-xl text-sm transition-colors disabled:opacity-60"
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Generation en cours...</>
                  : <><Download className="w-4 h-4" />Telecharger le recu</>
                }
              </button>
              <p className="text-gray-600 text-xs text-center mt-2">Image PNG · Envoyable directement sur WhatsApp</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
