import { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = ReturnType<typeof createAdminClient>

/**
 * Called when a boutique is approved/created. If it was referred by another
 * boutique's code, records a pending reward — no credit granted yet. The
 * reward only fires once the referred boutique actually pays, see
 * triggerReferralRewardIfDue.
 */
export async function registerReferral(
  admin: AdminClient,
  newBoutiqueId: string,
  referredByCode: string | null | undefined
) {
  if (!referredByCode) return

  const { data: referrer } = await admin
    .from('boutiques')
    .select('id')
    .eq('referral_code', referredByCode)
    .maybeSingle()

  if (!referrer || referrer.id === newBoutiqueId) return

  const { data: existing } = await admin
    .from('referral_rewards')
    .select('id')
    .eq('referred_boutique_id', newBoutiqueId)
    .maybeSingle()

  if (existing) return

  await admin.from('referral_rewards').insert({
    referrer_boutique_id: referrer.id,
    referred_boutique_id: newBoutiqueId,
    discount_percent: 25,
    status: 'pending',
  })
}

/**
 * Call right after a boutique's subscription is marked active from a real
 * payment (see collectPayment in src/lib/invoices.ts, which also queues the
 * referred boutique's own welcome discount on that same payment before
 * calling this). If this boutique was referred and its reward hasn't fired
 * yet, grants the referrer 1 referral credit — redeemable anytime, no expiry.
 */
export async function triggerReferralRewardIfDue(admin: AdminClient, boutiqueId: string) {
  const { data: reward } = await admin
    .from('referral_rewards')
    .select('id, referrer_boutique_id')
    .eq('referred_boutique_id', boutiqueId)
    .eq('status', 'pending')
    .maybeSingle()

  if (!reward) return

  await admin.from('referral_credits').insert({
    boutique_id: reward.referrer_boutique_id,
    referred_boutique_id: boutiqueId,
    status: 'available',
  })

  await admin.from('referral_rewards')
    .update({ status: 'completed', triggered_at: new Date().toISOString() })
    .eq('id', reward.id)
}
