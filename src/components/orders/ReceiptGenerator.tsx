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

function buildReceiptHTML(
  order: Order,
  restaurantName: string,
  accentColor: string,
  restaurantPhone?: string,
  restaurantAddress?: string,
): string {
  const items = order.items as OrderItem[]
  const orderId = order.id.slice(0, 8).toUpperCase()
  const paymentLabel = getPaymentLabel(order)
  const displayNotes = order.notes?.replace(/Paiement\s*:\s*.+/i, '').trim() || ''

  const itemsHTML = items.map(item => `
    <div class="item-row">
      <div class="item-name">${item.name}</div>
      <div class="item-qty">×${item.quantity}</div>
      <div class="item-price">${(item.price * item.quantity).toLocaleString('fr-SN')} FCFA</div>
    </div>
  `).join('')

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reçu ${orderId} — ${restaurantName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: Arial, Helvetica, sans-serif;
      background: #f5f5f5;
      display: flex;
      justify-content: center;
      padding: 32px 16px;
      min-height: 100vh;
    }

    .receipt {
      background: #ffffff;
      width: 400px;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 32px rgba(0,0,0,0.12);
    }

    /* HEADER */
    .header {
      background: ${accentColor};
      padding: 28px 24px 26px;
      text-align: center;
    }
    .header-name {
      font-size: 22px;
      font-weight: 900;
      color: #ffffff;
      line-height: 1.2;
      margin-bottom: 6px;
    }
    .header-address {
      font-size: 11px;
      color: rgba(255,255,255,0.82);
      margin-bottom: 18px;
      line-height: 1.4;
    }
    .header-badge {
      display: inline-block;
      background: rgba(255,255,255,0.25);
      color: #ffffff;
      font-size: 11px;
      font-weight: 700;
      padding: 5px 20px;
      border-radius: 20px;
      letter-spacing: 0.04em;
    }

    /* BODY */
    .body {
      padding: 24px 24px 28px;
    }

    /* SECTION ROW */
    .section {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 16px;
      border-bottom: 1.5px dashed #e5e5e5;
      margin-bottom: 16px;
    }
    .field-label {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #c0c0c0;
      margin-bottom: 5px;
    }
    .field-value {
      font-size: 14px;
      font-weight: 800;
      color: #1a1a1a;
      line-height: 1.2;
    }
    .field-value-sm {
      font-size: 12px;
      font-weight: 600;
      color: #1a1a1a;
      line-height: 1.3;
    }
    .field-right {
      text-align: right;
    }

    /* ARTICLES */
    .articles-header {
      display: flex;
      align-items: center;
      padding-bottom: 8px;
      border-bottom: 1.5px solid #e5e5e5;
      margin-bottom: 4px;
    }
    .col-label {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #c0c0c0;
    }
    .col-article { flex: 1; }
    .col-qty { width: 40px; text-align: center; }
    .col-amount { width: 110px; text-align: right; }

    .items-list { margin-bottom: 16px; }

    .item-row {
      display: flex;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px solid #f2f2f2;
    }
    .item-name {
      flex: 1;
      font-size: 13px;
      color: #1a1a1a;
      line-height: 1.35;
      padding-right: 8px;
    }
    .item-qty {
      width: 40px;
      text-align: center;
      font-size: 13px;
      color: #aaa;
      flex-shrink: 0;
    }
    .item-price {
      width: 110px;
      text-align: right;
      font-size: 13px;
      font-weight: 700;
      color: #1a1a1a;
      flex-shrink: 0;
    }

    /* TOTAL */
    .total-box {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: ${accentColor}18;
      border: 1.5px solid ${accentColor};
      border-radius: 12px;
      padding: 14px 18px;
      margin-bottom: 16px;
    }
    .total-label {
      font-size: 15px;
      font-weight: 700;
      color: #1a1a1a;
    }
    .total-amount {
      font-size: 22px;
      font-weight: 900;
      color: ${accentColor};
      line-height: 1;
    }

    /* PAIEMENT */
    .payment-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
    }
    .payment-label-text {
      font-size: 12px;
      color: #aaa;
    }
    .payment-badge {
      background: ${accentColor}18;
      color: ${accentColor};
      font-size: 12px;
      font-weight: 700;
      padding: 5px 14px;
      border-radius: 8px;
      border: 1px solid ${accentColor}55;
      line-height: 1.4;
    }

    /* NOTE */
    .note-box {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 10px;
      padding: 11px 14px;
      font-size: 12px;
      color: #92400e;
      margin-bottom: 20px;
      line-height: 1.5;
    }

    /* FOOTER */
    .footer {
      border-top: 1.5px dashed #e5e5e5;
      padding-top: 18px;
      text-align: center;
    }
    .footer-thanks {
      font-size: 15px;
      font-weight: 700;
      color: #1a1a1a;
      margin-bottom: 6px;
    }
    .footer-phone {
      font-size: 12px;
      color: #bbb;
      margin-bottom: 4px;
    }
    .footer-brand {
      font-size: 10px;
      color: #ccc;
      margin-top: 8px;
    }
    .footer-brand span {
      color: ${accentColor};
      font-weight: 700;
    }

    /* PRINT */
    @media print {
      body {
        background: white;
        padding: 0;
        display: block;
      }
      .receipt {
        box-shadow: none;
        border-radius: 0;
        width: 100%;
        max-width: 400px;
        margin: 0 auto;
      }
    }
  </style>
</head>
<body>
  <div class="receipt">

    <div class="header">
      <div class="header-name">${restaurantName}</div>
      ${restaurantAddress ? `<div class="header-address">${restaurantAddress}</div>` : '<div style="margin-bottom:18px"></div>'}
      <div class="header-badge">Reçu de commande</div>
    </div>

    <div class="body">

      <div class="section">
        <div>
          <div class="field-label">N° commande</div>
          <div class="field-value">#${orderId}</div>
        </div>
        <div class="field-right">
          <div class="field-label">Date</div>
          <div class="field-value-sm">${formatDateTime(order.created_at)}</div>
        </div>
      </div>

      <div class="section">
        <div>
          <div class="field-label">Client</div>
          <div class="field-value">${order.customer_name || '—'}</div>
        </div>
        ${order.customer_phone ? `
        <div class="field-right">
          <div class="field-label">Téléphone</div>
          <div class="field-value-sm">${order.customer_phone}</div>
        </div>` : ''}
      </div>

      <div class="articles-header">
        <div class="col-label col-article">Article</div>
        <div class="col-label col-qty">Qté</div>
        <div class="col-label col-amount">Montant</div>
      </div>

      <div class="items-list">
        ${itemsHTML}
      </div>

      <div class="total-box">
        <div class="total-label">Total</div>
        <div class="total-amount">${order.total.toLocaleString('fr-SN')} FCFA</div>
      </div>

      <div class="payment-row">
        <div class="payment-label-text">Mode de paiement :</div>
        <div class="payment-badge">${paymentLabel}</div>
      </div>

      ${displayNotes ? `
      <div class="note-box">
        <strong>Note :</strong> ${displayNotes}
      </div>` : ''}

      <div class="footer">
        <div class="footer-thanks">Merci pour votre commande ! 🙏</div>
        ${restaurantPhone ? `<div class="footer-phone">${restaurantPhone}</div>` : ''}
        <div class="footer-brand">Propulsé par <span>TerangaLink</span></div>
      </div>

    </div>
  </div>
</body>
</html>`
}

async function generateAndDownloadPDF(
  order: Order,
  restaurantName: string,
  accentColor: string,
  restaurantPhone?: string,
  restaurantAddress?: string,
) {
  const html = buildReceiptHTML(order, restaurantName, accentColor, restaurantPhone, restaurantAddress)
  const orderId = order.id.slice(0, 8).toUpperCase()

  const [{ jsPDF }, html2canvas] = await Promise.all([
    import('jspdf'),
    import('html2canvas').then(m => m.default),
  ])

  // Créer un iframe caché pour isoler le rendu du reçu
  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:432px;height:1px;border:none;visibility:hidden;'
  document.body.appendChild(iframe)

  await new Promise<void>(resolve => {
    iframe.onload = () => resolve()
    iframe.srcdoc = html
  })

  // Attendre que les fonts/images soient chargées
  await new Promise(r => setTimeout(r, 300))

  const receiptEl = iframe.contentDocument?.querySelector('.receipt') as HTMLElement
  if (!receiptEl) {
    document.body.removeChild(iframe)
    throw new Error('Élément reçu introuvable')
  }

  try {
    const canvas = await html2canvas(receiptEl, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      // Forcer les dimensions exactes du reçu
      width: receiptEl.offsetWidth,
      height: receiptEl.offsetHeight,
      windowWidth: 432,
    })

    const imgData = canvas.toDataURL('image/png')
    const pdfW = 400
    const pdfH = (canvas.height / canvas.width) * pdfW
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [pdfW, pdfH] })
    pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH)

    // Forcer le téléchargement sur mobile (évite que le navigateur ouvre le PDF)
    const filename = `recu-${orderId}-${restaurantName.toLowerCase().replace(/\s+/g, '-')}.pdf`
    const blob = pdf.output('blob')
    const blobUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => URL.revokeObjectURL(blobUrl), 2000)
  } finally {
    document.body.removeChild(iframe)
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

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-brand-orange/15">
                <FileText className="w-5 h-5 text-brand-orange" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Générer le reçu</h3>
                <p className="text-gray-500 text-xs">Commande #{order.id.slice(0, 8).toUpperCase()}</p>
              </div>
            </div>

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
