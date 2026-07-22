import type { createAdminClient } from '@/lib/supabase/admin'
import type { NewsletterSegment } from '@/lib/types/database'
import { INACTIVE_DAYS_THRESHOLD } from './config'

type AdminClient = ReturnType<typeof createAdminClient>

export interface SegmentRecipient {
  restaurant_id: string
  email: string
  name: string
}

async function matchingRestaurantIds(admin: AdminClient, segment: NewsletterSegment): Promise<string[]> {
  let query = admin.from('restaurants').select('id, created_at, is_active').eq('newsletter_opt_in', true)

  if (segment.type === 'founder') {
    query = query.eq('is_founder', true)
  }

  if (segment.type === 'inactive') {
    const cutoff = new Date(Date.now() - INACTIVE_DAYS_THRESHOLD * 24 * 60 * 60 * 1000).toISOString()
    query = query.or(`last_login_at.is.null,last_login_at.lt.${cutoff}`)
  }

  if (segment.type === 'custom') {
    if (segment.active === true) query = query.eq('is_active', true)
    if (segment.active === false) query = query.eq('is_active', false)
    if (segment.registeredBefore) query = query.lt('created_at', segment.registeredBefore)
    if (segment.registeredAfter) query = query.gt('created_at', segment.registeredAfter)
  }

  const { data: restaurants } = await query
  let rows: { id: string }[] = restaurants ?? []

  const needsPlanFilter =
    segment.type === 'pro' ||
    segment.type === 'starter' ||
    segment.type === 'trial' ||
    (segment.type === 'custom' && !!segment.plan && segment.plan !== 'any')

  if (needsPlanFilter) {
    const ids = rows.map(r => r.id)
    if (ids.length === 0) return []
    const { data: subs } = await admin.from('subscriptions').select('restaurant_id, plan, status').in('restaurant_id', ids)
    const subsByRestaurant = new Map((subs ?? []).map((s: { restaurant_id: string; plan: string; status: string }) => [s.restaurant_id, s]))

    rows = rows.filter(r => {
      const sub = subsByRestaurant.get(r.id)
      if (segment.type === 'pro') return sub?.plan === 'pro'
      if (segment.type === 'starter') return sub?.plan === 'starter'
      if (segment.type === 'trial') return sub?.status === 'trial'
      if (segment.type === 'custom' && segment.plan && segment.plan !== 'any') return sub?.plan === segment.plan
      return true
    })
  }

  return rows.map(r => r.id)
}

/** Une seule adresse par restaurant — priorité au profil admin "principal" pour éviter les doublons entre admins partagés. */
async function emailsForRestaurants(admin: AdminClient, restaurantIds: string[]): Promise<SegmentRecipient[]> {
  if (restaurantIds.length === 0) return []
  const { data: profiles } = await admin
    .from('profiles')
    .select('restaurant_id, email, full_name, admin_role, created_at')
    .in('restaurant_id', restaurantIds)
    .eq('role', 'restaurant_admin')
    .order('created_at', { ascending: true })

  const byRestaurant = new Map<string, { email: string; full_name: string | null; admin_role: string | null }>()
  for (const p of (profiles ?? []) as { restaurant_id: string | null; email: string; full_name: string | null; admin_role: string | null }[]) {
    if (!p.restaurant_id) continue
    const existing = byRestaurant.get(p.restaurant_id)
    if (!existing || (p.admin_role === 'principal' && existing.admin_role !== 'principal')) {
      byRestaurant.set(p.restaurant_id, p)
    }
  }

  return Array.from(byRestaurant.entries()).map(([restaurant_id, p]) => ({
    restaurant_id,
    email: p.email,
    name: p.full_name ?? '',
  }))
}

/** Résout les destinataires pour un segment — toujours filtré newsletter_opt_in=true en base, quel que soit le segment. */
export async function resolveSegmentRecipients(admin: AdminClient, segment: NewsletterSegment): Promise<SegmentRecipient[]> {
  const ids = await matchingRestaurantIds(admin, segment)
  return emailsForRestaurants(admin, ids)
}

export async function countSegmentRecipients(admin: AdminClient, segment: NewsletterSegment): Promise<number> {
  const recipients = await resolveSegmentRecipients(admin, segment)
  return recipients.length
}
