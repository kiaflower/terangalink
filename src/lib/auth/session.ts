import type { SupabaseClient } from '@supabase/supabase-js'

export interface RestaurantSessionProfile {
  id: string
  role: string
  restaurant_id: string | null
  admin_role: 'principal' | 'secondaire' | null
  is_active: boolean
  session_password_version: number
}

export type SessionCheckResult =
  | { ok: true; profile: RestaurantSessionProfile }
  | { ok: false; reason: 'unauthenticated' | 'no_profile' | 'account_disabled' | 'password_changed' }

/**
 * Vérifie qu'une session restaurant_admin est toujours valide : compte actif
 * et mot de passe partagé pas changé depuis le dernier login réussi (voir
 * /api/auth/session-sync). Toujours valide pour un super_admin — le mode
 * impersonation ne doit jamais dépendre de cette fonction, il est géré en
 * amont via le cookie sa_impersonate, séparément.
 */
export async function checkRestaurantSession(
  supabase: SupabaseClient<any, any, any>,
  userId: string
): Promise<SessionCheckResult> {
  const { data: profileData } = await supabase
    .from('profiles')
    .select('id, role, restaurant_id, admin_role, is_active, session_password_version')
    .eq('id', userId)
    .single()

  const profile = profileData as RestaurantSessionProfile | null
  if (!profile) return { ok: false, reason: 'no_profile' }

  if (profile.role !== 'restaurant_admin') return { ok: true, profile }

  if (!profile.is_active) return { ok: false, reason: 'account_disabled' }
  if (!profile.restaurant_id) return { ok: false, reason: 'no_profile' }

  const { data: restaurantData } = await supabase
    .from('restaurants')
    .select('password_version')
    .eq('id', profile.restaurant_id)
    .single()

  const restaurant = restaurantData as { password_version: number } | null
  if (!restaurant) return { ok: false, reason: 'no_profile' }

  if (profile.session_password_version !== restaurant.password_version) {
    return { ok: false, reason: 'password_changed' }
  }

  return { ok: true, profile }
}
