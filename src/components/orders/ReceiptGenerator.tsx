'use client'

import { useState } from 'react'
import { FileText, X, Download, Loader2 } from 'lucide-react'
import type { Order, OrderItem } from '@/lib/types'

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Espèces',
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
  return 'Espèces'
}

async function generateAndDownloadPDF(
  order: Order,
  restaurantName: string,
  accentColor: string,
  restaurantPhone?: string,
  restaurantAddress?: string,
) {
  const [{ jsPDF }, html2canvas] = await Promise.all([
    import('jspdf'),
    import('html2canvas').then(m => m.default),
  ])

  const items = order.items as OrderItem[]
  const orderId = order.id.slice(0, 8).toUpperCase()
  const paymentLabel = getPaymentLabel(order)
  const displayNotes = order.notes?.replace(/Paiement\s*:\s*.+/i, '').trim() || ''

  // Utiliser des tableaux HTML partout — bien plus stable pour html2canvas
  const itemsRows = items.map(item => `
    <tr>
      <td style="padding:9px 4px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#1a1a1a;">${item.name}</td>
      <td style="padding:9px 4px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#999;text-align:center;white-space:nowrap;">×${item.quantity}</td>
      <td style="padding:9px 4px;border-bottom:1px solid #f0f0f0;font-size:13px;font-weight:700;color:#1a1a1a;text-align:right;white-space:nowrap;">${(item.price * item.quantity).toLocaleString('fr-SN')} FCFA</td>
    </tr>
  `).join('')

  const container = document.createElement('div')
  container.style.cssText = 'position:fixed;left:-9999px;top:0;width:380px;background:white;'

  container.innerHTML = `
    <div style="width:380px;background:white;font-family:Arial,Helvetica,sans-serif;">

      <!-- HEADER -->
      <div style="background:${accentColor};padding:26px 24px 20px;text-align:center;">
        <div style="font-size:20px;font-weight:900;color:white;margin-bottom:${restaurantAddress ? '4px' : '12px'};">${restaurantName}</div>
        ${restaurantAddress ? `<div style="font-size:11px;color:rgba(255,255,255,0.75);margin-bottom:12px;">${restaurantAddress}</div>` : ''}
        <div style="display:inline-block;background:rgba(255,255,255,0.22);color:white;font-size:11px;font-weight:700;padding:3px 14px;border-radius:20px;">Reçu de commande</div>
      </div>

      <!-- BODY -->
      <div style="padding:20px 24px;">

        <!-- N° commande + Date -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;padding-bottom:14px;border-bottom:2px dashed #f0f0f0;">
          <tr>
            <td style="vertical-align:top;">
              <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#bbb;margin-bottom:3px;">N° commande</div>
              <div style="font-size:14px;font-weight:800;color:#1a1a1a;">#${orderId}</div>
            </td>
            <td style="vertical-align:top;text-align:right;">
              <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#bbb;margin-bottom:3px;">Date</div>
              <div style="font-size:12px;font-weight:600;color:#1a1a1a;">${formatDateTime(order.created_at)}</div>
            </td>
          </tr>
        </table>

        <!-- Client + Téléphone -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;padding-bottom:14px;border-bottom:2px dashed #f0f0f0;">
          <tr>
            <td style="vertical-align:top;">
              <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#bbb;margin-bottom:3px;">Client</div>
              <div style="font-size:14px;font-weight:600;color:#1a1a1a;">${order.customer_name || '—'}</div>
            </td>
            ${order.customer_phone ? `
            <td style="vertical-align:top;text-align:right;">
              <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#bbb;margin-bottom:3px;">Téléphone</div>
              <div style="font-size:12px;font-weight:600;color:#1a1a1a;">${order.customer_phone}</div>
            </td>` : '<td></td>'}
          </tr>
        </table>

        <!-- Articles -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
          <thead>
            <tr>
              <th style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:#bbb;padding-bottom:8px;border-bottom:2px solid #f0f0f0;text-align:left;">Article</th>
              <th style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:#bbb;padding-bottom:8px;border-bottom:2px solid #f0f0f0;text-align:center;">Qté</th>
              <th style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:#bbb;padding-bottom:8px;border-bottom:2px solid #f0f0f0;text-align:right;">Montant</th>
            </tr>
          </thead>
          <tbody>${itemsRows}</tbody>
        </table>

        <!-- Total -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
          <tr>
            <td colspan="3">
              <div style="background:${accentColor}18;border:1.5px solid ${accentColor};border-radius:12px;padding:13px 16px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-size:14px;font-weight:700;color:#1a1a1a;">Total</td>
                    <td style="font-size:20px;font-weight:900;color:${accentColor};text-align:right;">${order.total.toLocaleString('fr-SN')} FCFA</td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
        </table>

        <!-- Paiement -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:${displayNotes ? '14px' : '16px'};">
          <tr>
            <td style="font-size:12px;color:#999;vertical-align:middle;">Mode de paiement :</td>
            <td style="text-align:right;">
              <span style="background:${accentColor}18;color:${accentColor};font-size:12px;font-weight:700;padding:4px 12px;border-radius:8px;border:1px solid ${accentColor}40;">${paymentLabel}</span>
            </td>
          </tr>
        </table>

        ${displayNotes ? `
        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:11px 14px;font-size:12px;color:#92400e;margin-bottom:16px;">
          <strong>Note :</strong> ${displayNotes}
        </div>` : ''}

        <!-- Footer -->
        <div style="border-top:2px dashed #f0f0f0;padding-top:14px;text-align:center;">
          <div style="font-size:15px;font-weight:700;color:#1a1a1a;margin-bottom:4px;">Merci pour votre commande ! 🙏</div>
          ${restaurantPhone ? `<div style="font-size:12px;color:#999;margin-bottom:4px;">${restaurantPhone}</div>` : ''}
          <div style="font-size:10px;color:#ccc;margin-top:8px;">Propulsé par <span style="color:${accentColor};font-weight:700;">TerangaLink</span></div>
        </div>

      </div>
    </div>
  `

  document.body.appendChild(container)

  try {
    const canvas = await html2canvas(container.firstElementChild as HTMLElement, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      width: 380,
      windowWidth: 380,
      logging: false,
    })

    const imgData = canvas.toDataURL('image/png')
    const pdfH = (canvas.height / canvas.width) * 380
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [380, pdfH] })
    pdf.addImage(imgData, 'PNG', 0, 0, 380, pdfH)
    pdf.save(`recu-${orderId}-${restaurantName.toLowerCase().replace(/\s+/g, '-')}.pdf`)
  } finally {
    document.body.removeChild(container)
  }
}

export function ReceiptGenerator({ order, restaurantName, restaurantPhone, restaurantAddress, accentColor = '#F97316' }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDownload() {
    setLoading(true)
    try {
      await generateAndDownloadPDF(order, restaurantName, accentColor, restaurantPhone, restaurantAddress)
      setOpen(false)
    } catch (err) {
      console.error('PDF generation error:', err)
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
        Reçu PDF
      </button>

      {open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-surface-50 border border-surface-200 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-500 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header modal — couleurs TerangaLink */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-brand-orange/15">
                <FileText className="w-5 h-5 text-brand-orange" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Générer le reçu</h3>
                <p className="text-gray-500 text-xs">Commande #{order.id.slice(0, 8).toUpperCase()}</p>
              </div>
            </div>

            {/* Aperçu */}
            <div className="bg-surface-100 rounded-xl p-4 mb-5 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Client</span>
                <span className="text-white font-medium">{order.customer_name || '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Articles</span>
                <span className="text-white font-medium">{(order.items as OrderItem[]).length} article(s)</span>
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

            {/* Bouton — couleurs TerangaLink */}
            <button
              onClick={handleDownload}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-brand-orange hover:bg-brand-orange-dark text-white font-semibold py-3 rounded-xl text-sm transition-colors disabled:opacity-60"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" />Génération en cours...</>
                : <><Download className="w-4 h-4" />Télécharger le PDF</>
              }
            </button>
          </div>
        </div>
      )}
    </>
  )
}
