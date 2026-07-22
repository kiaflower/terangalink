'use client'

import { useState } from 'react'
import { CheckCircle, Download, Gift, Receipt, PartyPopper } from 'lucide-react'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { PLANS, PlanKey } from '@/lib/plans'

export interface BillingRowData {
  restaurantId: string
  restaurantName: string
  plan: PlanKey
  subscriptionStatus: string
  periodStart: string
  periodEnd: string
  fullAmount: number
  discountAmount: number
  discountReason: string | null
  finalAmount: number
  pendingCreditAction: 'discount' | 'free_month' | 'referral_welcome' | null
  availableCredits: number
  invoice: { id: string; invoiceNumber: string; status: string; dueAt: string; paidAt: string | null } | null
  actionable: boolean
}

interface BillingRowProps extends BillingRowData {
  onChanged: () => void | Promise<void>
}

const PAYMENT_METHODS = ['Wave', 'Orange Money', 'Cash', 'Autre']

function formatFcfa(amount: number): string {
  return `${new Intl.NumberFormat('fr-SN').format(amount)} FCFA`
}

// period_start/period_end sont des dates pures (colonne SQL `date`) — les
// parser avec `new Date(str)` les interprète comme minuit UTC, ce qui les
// affiche un jour plus tôt dans un fuseau horaire à l'ouest de Dakar. On
// construit la date à partir de ses composants locaux pour l'éviter.
function formatDateOnly(dateStr: string): string {
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('fr-SN')
}

function computePreview(fullAmount: number, choice: 'none' | 'discount' | 'free_month'): number {
  if (choice === 'free_month') return 0
  if (choice === 'discount') return fullAmount - Math.round(fullAmount * 0.25)
  return fullAmount
}

export function BillingRow({
  restaurantId, restaurantName, plan, subscriptionStatus, periodStart, periodEnd,
  fullAmount, discountAmount, discountReason, finalAmount,
  pendingCreditAction, availableCredits, invoice, actionable, onChanged,
}: BillingRowProps) {
  const [payModalOpen, setPayModalOpen] = useState(false)
  const [payMethod, setPayMethod] = useState(PAYMENT_METHODS[0])
  const [creditChoice, setCreditChoice] = useState<'none' | 'discount' | 'free_month'>('none')
  const [marking, setMarking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paidInvoiceId, setPaidInvoiceId] = useState<string | null>(null)

  const hasPredeterminedDiscount = pendingCreditAction !== null
  const canChooseCredit = !hasPredeterminedDiscount && availableCredits >= 1

  function openPayModal() {
    setCreditChoice('none')
    setPayMethod(PAYMENT_METHODS[0])
    setError(null)
    setPaidInvoiceId(null)
    setPayModalOpen(true)
  }

  function closePayModal() {
    setPayModalOpen(false)
    // La facture a été mise à jour côté serveur dès la confirmation — on ne
    // rafraîchit la liste qu'à la fermeture pour laisser le reçu affiché.
    if (paidInvoiceId) onChanged()
  }

  async function confirmMarkPaid(e: React.FormEvent) {
    e.preventDefault()
    setMarking(true)
    setError(null)
    const res = await fetch('/api/super-admin/invoices/collect-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurant_id: restaurantId,
        method: payMethod,
        apply_credit: hasPredeterminedDiscount ? null : (creditChoice === 'none' ? null : creditChoice),
      }),
    })
    setMarking(false)
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      setPaidInvoiceId(data.invoiceId)
    } else {
      setError(data.error || 'Erreur lors de l\'enregistrement du paiement')
    }
  }

  const previewAmount = hasPredeterminedDiscount ? finalAmount : computePreview(fullAmount, creditChoice)

  return (
    <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900">
          {restaurantName}
          {invoice && <span className="text-gray-400 font-normal"> · {invoice.invoiceNumber}</span>}
          {subscriptionStatus === 'trial' && (
            <span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-orange-50 text-brand-orange border border-orange-100 align-middle">Essai</span>
          )}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          Plan {PLANS[plan].name} · Du {formatDateOnly(periodStart)} au {formatDateOnly(periodEnd)}
        </p>
        {discountAmount > 0 && (
          <p className="text-xs font-semibold mt-1" style={{ color: '#059669' }}>
            🎁 {discountReason} · -{formatFcfa(discountAmount)} (plein tarif {formatFcfa(fullAmount)})
          </p>
        )}
        {!invoice && !discountAmount && availableCredits > 0 && (
          <p className="text-xs font-medium mt-1 text-brand-orange flex items-center gap-1">
            <Gift className="w-3 h-3" /> {availableCredits} crédit{availableCredits > 1 ? 's' : ''} disponible{availableCredits > 1 ? 's' : ''} pour ce paiement
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm font-bold text-gray-900">{formatFcfa(finalAmount)}</p>
        {invoice ? (
          <StatusBadge status={invoice.status} />
        ) : actionable ? (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100">À facturer</span>
        ) : (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-600 border border-green-100">
            À jour · jusqu&apos;au {formatDateOnly(periodStart)}
          </span>
        )}
        {invoice && (
          <a
            href={`/api/super-admin/invoices/${invoice.id}/pdf`}
            title="Télécharger la facture PDF"
            className="flex items-center gap-1.5 text-xs bg-white border border-gray-200 hover:border-brand-orange text-gray-700 px-2 sm:px-3 py-1.5 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Facture</span>
          </a>
        )}
        {invoice?.status === 'paid' && (
          <a
            href={`/api/super-admin/invoices/${invoice.id}/receipt`}
            title="Télécharger le reçu de paiement"
            className="flex items-center gap-1.5 text-xs bg-white border border-gray-200 hover:border-brand-orange text-gray-700 px-2 sm:px-3 py-1.5 rounded-lg transition-colors"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reçu</span>
          </a>
        )}
        {actionable && (
          <button
            type="button"
            onClick={openPayModal}
            title="Marquer comme payée"
            className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-2 sm:px-3 py-1.5 rounded-lg transition-colors"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Marquer payée</span>
          </button>
        )}
      </div>

      {payModalOpen && paidInvoiceId && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={closePayModal}>
          <div onClick={e => e.stopPropagation()} className="bg-white w-full max-w-sm rounded-2xl p-5 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-green-50 border border-green-100 flex items-center justify-center mx-auto">
              <PartyPopper className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">Paiement confirmé</p>
              <p className="text-xs text-gray-500 mt-1">{restaurantName} · {formatFcfa(previewAmount)}</p>
            </div>
            <a
              href={`/api/super-admin/invoices/${paidInvoiceId}/receipt`}
              className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-lg text-xs font-semibold text-white bg-brand-orange hover:bg-brand-orange-dark transition-colors"
            >
              <Receipt className="w-3.5 h-3.5" />
              Télécharger le reçu
            </a>
            <button
              type="button"
              onClick={closePayModal}
              className="w-full py-2 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {payModalOpen && !paidInvoiceId && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setPayModalOpen(false)}>
          <form onClick={e => e.stopPropagation()} onSubmit={confirmMarkPaid} className="bg-white w-full max-w-sm rounded-2xl p-5 space-y-4">
            <p className="font-semibold text-gray-900 text-sm">Paiement reçu — {restaurantName}</p>

            {hasPredeterminedDiscount ? (
              <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 text-xs text-brand-orange font-medium">
                🎁 {discountReason} déjà prévu — montant final {formatFcfa(finalAmount)}
              </div>
            ) : canChooseCredit ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500">Ce restaurant a {availableCredits} crédit{availableCredits > 1 ? 's' : ''} de parrainage disponible{availableCredits > 1 ? 's' : ''}</p>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input type="radio" name="credit" checked={creditChoice === 'none'} onChange={() => setCreditChoice('none')} />
                  Aucune réduction
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input type="radio" name="credit" checked={creditChoice === 'discount'} onChange={() => setCreditChoice('discount')} />
                  Appliquer 1 crédit (-25%)
                </label>
                {availableCredits >= 5 && (
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="radio" name="credit" checked={creditChoice === 'free_month'} onChange={() => setCreditChoice('free_month')} />
                    Échanger 5 crédits (mois gratuit)
                  </label>
                )}
              </div>
            ) : null}

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Méthode de paiement</label>
              <select
                value={payMethod}
                onChange={e => setPayMethod(e.target.value)}
                className="w-full text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:border-brand-orange"
              >
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div className="flex items-center justify-between text-sm bg-gray-50 rounded-xl px-3 py-2.5">
              <span className="text-gray-500">Montant à encaisser</span>
              <span className="font-bold text-gray-900">{formatFcfa(previewAmount)}</span>
            </div>

            {error && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPayModalOpen(false)}
                className="flex-1 py-2 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={marking}
                className="flex-1 py-2 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
              >
                {marking ? '...' : 'Confirmer'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
