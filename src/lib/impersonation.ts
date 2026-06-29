import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'

interface ImpersonationPayload {
  restaurantId: string
  restaurantName: string
  superAdminId: string
  expiresAt: number
}

/**
 * Retourne l'ID du restaurant effectif pour les pages du dashboard.
 * Si le super-admin est en mode impersonation, retourne l'ID impersonné.
 * Sinon retourne le restaurant_id du profil utilisateur normal.
 */
export async function getImpersonatedRestaurantId(): Promise<string | null> {
  const cookieStore = await cookies()
  const raw = cookieStore.get('sa_impersonate')?.value
  if (!raw) return null
  try {
    const payload: ImpersonationPayload = JSON.parse(raw)
    if (payload.expiresAt < Date.now()) return null
    return payload.restaurantId
  } catch {
    return null
  }
}

/**
 * En mode impersonation, récupère le restaurant complet via admin client.
 */
export async function getImpersonatedRestaurant(restaurantId: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('restaurants')
    .select('*')
    .eq('id', restaurantId)
    .single()
  return data
}
