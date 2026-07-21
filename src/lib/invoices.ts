import { createAdminClient } from '@/lib/supabase/admin'
import { BillablePlanKey } from '@/lib/plans'
import { getPlanPrices } from '@/lib/platform-settings'
import { triggerReferralRewardIfDue } from '@/lib/referral'

type AdminClient = ReturnType<typeof createAdminClient>

const DISCOUNT_PERCENT = 25
const GENERATE_LEAD_DAYS = 3
const OVERDUE_GRACE_DAYS = 7
const SWEEP_THROTTLE_HOURS = 6
const SWEEP_SETTING_KEY = 'last_invoice_sweep_at'
const BILLABLE_STATUSES = ['trial', 'active', 'overdue']

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10)
}

type PendingCreditAction = 'discount' | 'free_month' | 'referral_welcome' | null

/**
 * A trial boutique's first payment always starts a fresh month from today —
 * the trial window itself was never billed. A renewing boutique's next
 * period always starts where its last paid period left off (ends_at), so
 * paying early never shortens what they already paid for.
 */
function computeCurrentPeriod(sub: { status: string; started_at: string; ends_at: string | null }): { start: Date; end: Date } {
  const start = sub.status === 'trial' || !sub.ends_at ? new Date() : new Date(sub.ends_at)
  return { start, end: addMonths(start, 1) }
}

function computeDiscount(fullAmount: number, pendingAction: PendingCreditAction): { discountAmount: number; discountReason: string | null; finalAmount: number } {
  let discountAmount = 0
  let discountReason: string | null = null

  if (pendingAction === 'discount') {
    discountAmount = Math.round(fullAmount * DISCOUNT_PERCENT / 100)
    discountReason = `Crédit parrainage (-${DISCOUNT_PERCENT}%)`
  } else if (pendingAction === 'free_month') {
    discountAmount = fullAmount
    discountReason = 'Mois gratuit — palier 5 parrainages'
  } else if (pendingAction === 'referral_welcome') {
    discountAmount = Math.round(fullAmount * DISCOUNT_PERCENT / 100)
    discountReason = `Réduction de bienvenue — parrainage (-${DISCOUNT_PERCENT}%)`
  }

  return { discountAmount, discountReason, finalAmount: fullAmount - discountAmount }
}

/**
 * Consumes 1 available referral credit and queues a -25% discount on the
 * boutique's next generated invoice. Only one queued action at a time — a
 * boutique can't stack a discount and a free month on the same invoice.
 */
export async function applyCreditToNextInvoice(admin: AdminClient, boutiqueId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: sub } = await admin.from('subscriptions').select('id, pending_credit_action').eq('boutique_id', boutiqueId).maybeSingle()
  if (!sub) return { ok: false, error: 'Abonnement introuvable' }
  if (sub.pending_credit_action) return { ok: false, error: 'Une réduction est déjà prévue sur la prochaine facture' }

  const { data: consumed } = await admin.rpc('consume_referral_credits', {
    p_boutique_id: boutiqueId, p_count: 1, p_reason: 'discount', p_invoice_id: null,
  })
  if (!consumed || consumed < 1) return { ok: false, error: 'Aucun crédit disponible' }

  await admin.from('subscriptions').update({ pending_credit_action: 'discount', updated_at: new Date().toISOString() }).eq('id', sub.id)
  return { ok: true }
}

/** Same as applyCreditToNextInvoice but consumes 5 credits at once for a free month. */
export async function redeemFreeMonth(admin: AdminClient, boutiqueId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: sub } = await admin.from('subscriptions').select('id, pending_credit_action').eq('boutique_id', boutiqueId).maybeSingle()
  if (!sub) return { ok: false, error: 'Abonnement introuvable' }
  if (sub.pending_credit_action) return { ok: false, error: 'Une réduction est déjà prévue sur la prochaine facture' }

  const { data: consumed } = await admin.rpc('consume_referral_credits', {
    p_boutique_id: boutiqueId, p_count: 5, p_reason: 'free_month', p_invoice_id: null,
  })
  if (!consumed || consumed < 5) return { ok: false, error: 'Il faut au moins 5 crédits disponibles' }

  await admin.from('subscriptions').update({ pending_credit_action: 'free_month', updated_at: new Date().toISOString() }).eq('id', sub.id)
  return { ok: true }
}

/**
 * If this boutique was referred and never had its welcome discount applied,
 * queues it now. Called right before invoice generation so a referred
 * boutique's very first invoice carries the discount — not some future one.
 * Never overwrites a discount the boutique already chose itself.
 */
async function maybeQueueWelcomeDiscount(admin: AdminClient, boutiqueId: string): Promise<void> {
  const { data: reward } = await admin.from('referral_rewards').select('id').eq('referred_boutique_id', boutiqueId).eq('status', 'pending').maybeSingle()
  if (!reward) return

  const { data: sub } = await admin.from('subscriptions').select('id, pending_credit_action').eq('boutique_id', boutiqueId).maybeSingle()
  if (!sub || sub.pending_credit_action) return

  await admin.from('subscriptions').update({ pending_credit_action: 'referral_welcome', updated_at: new Date().toISOString() }).eq('id', sub.id)
}

interface SubscriptionForInvoice {
  id: string
  boutique_id: string
  plan: BillablePlanKey
  status: string
  started_at: string
  ends_at: string | null
  pending_credit_action: PendingCreditAction
}

/**
 * Ensures an invoice exists for a subscription's current billing period —
 * returns the existing one if already generated (idempotent), otherwise
 * builds it. `bypassLeadGate` skips the "only within 3 days of due date"
 * check used by the automatic sweep — an explicit manual "collect payment
 * now" action should never be blocked by that.
 */
async function ensureInvoiceForCurrentPeriod(
  admin: AdminClient, sub: SubscriptionForInvoice, opts: { bypassLeadGate: boolean }
): Promise<{ invoiceId: string; created: boolean } | null> {
  const period = computeCurrentPeriod(sub)
  const periodStartStr = toDateOnly(period.start)

  const { data: existing } = await admin
    .from('invoices')
    .select('id')
    .eq('subscription_id', sub.id)
    .eq('period_start', periodStartStr)
    .maybeSingle()
  if (existing) return { invoiceId: existing.id, created: false }

  if (!opts.bypassLeadGate && period.start.getTime() - Date.now() > GENERATE_LEAD_DAYS * 86400000) return null

  const prices = await getPlanPrices(admin)
  const fullAmount = prices[sub.plan]
  const { discountAmount, discountReason, finalAmount } = computeDiscount(fullAmount, sub.pending_credit_action)

  const { data: invoiceNumber } = await admin.rpc('next_invoice_number')
  if (!invoiceNumber) { console.error('ensureInvoiceForCurrentPeriod: next_invoice_number returned nothing'); return null }

  const { data: invoice, error } = await admin.from('invoices').insert({
    invoice_number: invoiceNumber as string,
    boutique_id: sub.boutique_id,
    subscription_id: sub.id,
    period_start: periodStartStr,
    period_end: toDateOnly(period.end),
    plan: sub.plan,
    full_amount: fullAmount,
    discount_amount: discountAmount,
    discount_reason: discountReason,
    final_amount: finalAmount,
    due_at: period.start.toISOString(),
  }).select('id').single()

  if (error || !invoice) {
    console.error('ensureInvoiceForCurrentPeriod insert error:', error)
    return null
  }

  if (sub.pending_credit_action === 'discount' || sub.pending_credit_action === 'free_month') {
    await admin.from('referral_credits')
      .update({ invoice_id: invoice.id })
      .eq('boutique_id', sub.boutique_id)
      .eq('status', 'consumed')
      .is('invoice_id', null)
  }
  if (sub.pending_credit_action) {
    await admin.from('subscriptions').update({ pending_credit_action: null }).eq('id', sub.id)
  }

  return { invoiceId: invoice.id, created: true }
}

/**
 * Generates the invoice for a subscription's upcoming billing period, if
 * it's due soon and hasn't been generated yet. Idempotent: safe to call
 * repeatedly (cron + super-admin login backstop both call this). Trial
 * subscriptions are never auto-billed — only an explicit collectPayment can
 * convert a trial's first payment.
 */
export async function generateInvoiceForSubscription(admin: AdminClient, sub: SubscriptionForInvoice): Promise<string | null> {
  if (sub.status !== 'active') return null
  const result = await ensureInvoiceForCurrentPeriod(admin, sub, { bypassLeadGate: false })
  return result?.created ? result.invoiceId : null
}

/** Generates due invoices for every active subscription, and marks stale unpaid ones overdue. Returns how many invoices were created. */
export async function runInvoiceGenerationSweep(admin: AdminClient): Promise<number> {
  // Le plan Free n'a pas de prix et ne facture jamais — on l'exclut ici plutôt
  // que de complexifier generateInvoiceForSubscription, pour que le type
  // BillablePlanKey de SubscriptionForInvoice reste vrai à l'exécution.
  const { data: subs } = await admin
    .from('subscriptions')
    .select('id, boutique_id, plan, status, started_at, ends_at, pending_credit_action')
    .eq('status', 'active')
    .neq('plan', 'free')

  let generated = 0
  for (const sub of (subs ?? []) as SubscriptionForInvoice[]) {
    try {
      const invoiceId = await generateInvoiceForSubscription(admin, sub)
      if (invoiceId) generated++
    } catch (err) {
      console.error('runInvoiceGenerationSweep: failed for subscription', sub.id, err)
    }
  }

  await admin.from('invoices')
    .update({ status: 'overdue' })
    .eq('status', 'unpaid')
    .lt('due_at', addDays(new Date(), -OVERDUE_GRACE_DAYS).toISOString())

  return generated
}

/**
 * Safety net called from the super-admin dashboard layout on every request.
 * Throttled via platform_settings so navigating around doesn't re-query every
 * active subscription on each page load — only after the cron would plausibly
 * have missed a run.
 */
export async function runInvoiceGenerationSweepThrottled(admin: AdminClient): Promise<void> {
  const { data } = await admin.from('platform_settings').select('value').eq('key', SWEEP_SETTING_KEY).maybeSingle()
  const last = data?.value ? new Date(data.value).getTime() : 0
  if (Date.now() - last < SWEEP_THROTTLE_HOURS * 3600000) return

  await admin.from('platform_settings')
    .upsert({ key: SWEEP_SETTING_KEY, value: new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: 'key' })

  await runInvoiceGenerationSweep(admin)
}

/**
 * The single entry point for recording a payment. Never takes a manually
 * typed amount — the amount is always computed server-side from the plan
 * price and whichever discount applies (the boutique's own pre-selected
 * credit/free-month choice, an auto-detected referral welcome discount, or
 * one picked by the super-admin at collection time via `applyCredit`).
 * Works for a trial's first payment as much as a renewal.
 */
export async function collectPayment(
  admin: AdminClient,
  opts: { boutiqueId: string; method: string; applyCredit?: 'discount' | 'free_month' | null }
): Promise<{ ok: true; invoiceId: string; finalAmount: number } | { ok: false; error: string }> {
  const { data: sub } = await admin.from('subscriptions').select('*').eq('boutique_id', opts.boutiqueId).maybeSingle()
  if (!sub) return { ok: false, error: 'Abonnement introuvable' }
  if (sub.plan === 'free') return { ok: false, error: 'Le plan Free ne se facture pas' }
  if (!BILLABLE_STATUSES.includes(sub.status)) {
    return { ok: false, error: 'Cet abonnement est suspendu ou annulé — rien à facturer' }
  }

  if (!sub.pending_credit_action && opts.applyCredit) {
    const result = opts.applyCredit === 'free_month'
      ? await redeemFreeMonth(admin, opts.boutiqueId)
      : await applyCreditToNextInvoice(admin, opts.boutiqueId)
    if (!result.ok) return result
  }

  await maybeQueueWelcomeDiscount(admin, opts.boutiqueId)

  const { data: freshSub } = await admin.from('subscriptions').select('*').eq('boutique_id', opts.boutiqueId).single()
  if (!freshSub) return { ok: false, error: 'Abonnement introuvable' }

  const built = await ensureInvoiceForCurrentPeriod(admin, freshSub as SubscriptionForInvoice, { bypassLeadGate: true })
  if (!built) return { ok: false, error: 'Impossible de générer la facture' }

  const { data: invoice } = await admin.from('invoices').select('*').eq('id', built.invoiceId).single()
  if (!invoice) return { ok: false, error: 'Facture introuvable après génération' }
  if (invoice.status === 'paid') return { ok: false, error: 'Cette facture est déjà payée' }

  const now = new Date().toISOString()
  const { error: invoiceError } = await admin.from('invoices').update({
    status: 'paid', paid_at: now, payment_method: opts.method,
  }).eq('id', invoice.id)
  if (invoiceError) return { ok: false, error: invoiceError.message }

  const { error: paymentError } = await admin.from('payments').insert({
    subscription_id: freshSub.id,
    boutique_id: opts.boutiqueId,
    invoice_id: invoice.id,
    amount: invoice.final_amount,
    method: opts.method,
    paid_at: now,
  })
  if (paymentError) return { ok: false, error: paymentError.message }

  const { error: subError } = await admin.from('subscriptions').update({
    status: 'active', ends_at: invoice.period_end, updated_at: now,
  }).eq('id', freshSub.id)
  if (subError) return { ok: false, error: subError.message }

  // If this boutique was referred, this real payment is what triggers the
  // referrer's credit (never during the trial)
  await triggerReferralRewardIfDue(admin, opts.boutiqueId)

  return { ok: true, invoiceId: invoice.id, finalAmount: invoice.final_amount }
}

export interface BoutiqueBillingRow {
  boutiqueId: string
  boutiqueName: string
  plan: BillablePlanKey
  subscriptionStatus: string
  periodStart: string
  periodEnd: string
  fullAmount: number
  discountAmount: number
  discountReason: string | null
  finalAmount: number
  pendingCreditAction: PendingCreditAction
  availableCredits: number
  invoice: { id: string; invoiceNumber: string; status: string; dueAt: string; paidAt: string | null } | null
  /** Whether "collecter le paiement" should be offered right now (no double-billing an already-covered period). */
  actionable: boolean
}

/**
 * One row per billable boutique (trial/active/overdue) — the data source for
 * the super-admin's Factures tab. Every boutique shows up here, whether or
 * not an invoice has been generated yet, with the amount that would be due
 * computed live so nothing ever needs a manually typed number.
 */
export async function getBoutiqueBillingRows(admin: AdminClient): Promise<BoutiqueBillingRow[]> {
  const { data: subs } = await admin
    .from('subscriptions')
    .select('id, boutique_id, plan, status, started_at, ends_at, pending_credit_action, boutique:boutiques(name, is_demo)')
    .in('status', BILLABLE_STATUSES)
    .order('created_at', { ascending: false })

  const rows: BoutiqueBillingRow[] = []
  const prices = await getPlanPrices(admin)

  for (const raw of (subs ?? []) as unknown as (SubscriptionForInvoice & { boutique: { name: string; is_demo: boolean } | null })[]) {
    // Les boutiques de démo (vitrines de présentation, pas de vrais clients)
    // n'ont rien à facturer — elles ne doivent jamais apparaître ici.
    if (raw.boutique?.is_demo) continue

    const period = computeCurrentPeriod(raw)
    const periodStartStr = toDateOnly(period.start)

    const [{ data: invoice }, { count: availableCredits }] = await Promise.all([
      admin.from('invoices')
        .select('id, invoice_number, status, due_at, paid_at, discount_amount, discount_reason, final_amount')
        .eq('subscription_id', raw.id).eq('period_start', periodStartStr).maybeSingle(),
      admin.from('referral_credits').select('id', { count: 'exact', head: true }).eq('boutique_id', raw.boutique_id).eq('status', 'available'),
    ])

    let pendingCreditAction = raw.pending_credit_action
    if (!invoice && !pendingCreditAction) {
      const { data: reward } = await admin.from('referral_rewards').select('id').eq('referred_boutique_id', raw.boutique_id).eq('status', 'pending').maybeSingle()
      if (reward) pendingCreditAction = 'referral_welcome'
    }

    const fullAmount = prices[raw.plan]
    const { discountAmount, discountReason, finalAmount } = invoice
      ? { discountAmount: invoice.discount_amount, discountReason: invoice.discount_reason, finalAmount: invoice.final_amount }
      : computeDiscount(fullAmount, pendingCreditAction)

    const actionable = invoice
      ? invoice.status !== 'paid'
      : raw.status === 'trial' || period.start.getTime() - Date.now() <= GENERATE_LEAD_DAYS * 86400000

    rows.push({
      boutiqueId: raw.boutique_id,
      boutiqueName: raw.boutique?.name ?? '—',
      plan: raw.plan,
      subscriptionStatus: raw.status,
      periodStart: periodStartStr,
      periodEnd: toDateOnly(period.end),
      fullAmount,
      discountAmount,
      discountReason,
      finalAmount,
      pendingCreditAction,
      availableCredits: availableCredits ?? 0,
      invoice: invoice ? {
        id: invoice.id, invoiceNumber: invoice.invoice_number, status: invoice.status,
        dueAt: invoice.due_at, paidAt: invoice.paid_at,
      } : null,
      actionable,
    })
  }

  return rows
}
