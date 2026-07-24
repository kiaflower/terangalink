import { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = ReturnType<typeof createAdminClient>

/**
 * Called when a restaurant is approved/created. If it was referred by another
 * restaurant's code, records a pending reward — no credit granted yet. The
 * reward only fires once the referred restaurant actually pays, see
 * triggerReferralRewardIfDue.
 */
export async function registerReferral(
  admin: AdminClient,
  newRestaurantId: string,
  referredByCode: string | null | undefined
) {
  if (!referredByCode) return

  const { data: referrer } = await admin
    .from('restaurants')
    .select('id')
    .eq('referral_code', referredByCode)
    .maybeSingle()

  if (!referrer || referrer.id === newRestaurantId) return

  const { data: existing } = await admin
    .from('referral_rewards')
    .select('id')
    .eq('referred_restaurant_id', newRestaurantId)
    .maybeSingle()

  if (existing) return

  const { error } = await admin.from('referral_rewards').insert({
    referrer_restaurant_id: referrer.id,
    referred_restaurant_id: newRestaurantId,
    discount_percent: 25,
    status: 'pending',
  })
  if (error) console.error('registerReferral: referral_rewards insert error:', error)
}

/**
 * Call right after a restaurant's subscription is marked active from a real
 * payment (see collectPayment in src/lib/invoices.ts, which also queues the
 * referred restaurant's own welcome discount on that same payment before
 * calling this). If this restaurant was referred and its reward hasn't fired
 * yet, grants the referrer 1 referral credit — redeemable anytime, no expiry.
 */
export async function triggerReferralRewardIfDue(admin: AdminClient, restaurantId: string) {
  const { data: reward } = await admin
    .from('referral_rewards')
    .select('id, referrer_restaurant_id')
    .eq('referred_restaurant_id', restaurantId)
    .eq('status', 'pending')
    .maybeSingle()

  if (!reward) return

  const { error: creditError } = await admin.from('referral_credits').insert({
    restaurant_id: reward.referrer_restaurant_id,
    referred_restaurant_id: restaurantId,
    status: 'available',
  })
  if (creditError) {
    // Ne marque surtout pas la récompense "completed" si le crédit n'a pas pu
    // être créé : le parrain perdrait définitivement son crédit sans recours,
    // aucune future recherche ne retrouvant plus cette reward (status pending).
    console.error('triggerReferralRewardIfDue: referral_credits insert error:', creditError)
    return
  }

  const { error: updateError } = await admin.from('referral_rewards')
    .update({ status: 'completed', triggered_at: new Date().toISOString() })
    .eq('id', reward.id)
  if (updateError) console.error('triggerReferralRewardIfDue: referral_rewards update error:', updateError)
}
