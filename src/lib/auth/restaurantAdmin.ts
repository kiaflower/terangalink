import type { SupabaseClient } from '@supabase/supabase-js'
import { encryptSecret, decryptSecret } from '@/lib/crypto'

export function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let pw = ''
  for (let i = 0; i < 10; i++) pw += chars[Math.floor(Math.random() * chars.length)]
  return pw
}

export interface RestaurantAdminProfile {
  id: string
  email: string
  full_name: string | null
  admin_role: 'principal' | 'secondaire' | null
}

export async function getActiveAdmins(admin: SupabaseClient<any, any, any>, restaurantId: string): Promise<RestaurantAdminProfile[]> {
  const { data } = await admin
    .from('profiles')
    .select('id, email, full_name, admin_role')
    .eq('restaurant_id', restaurantId)
    .eq('role', 'restaurant_admin')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
  return (data ?? []) as RestaurantAdminProfile[]
}

export async function getPrincipalAdmin(admin: SupabaseClient<any, any, any>, restaurantId: string): Promise<RestaurantAdminProfile | null> {
  const { data } = await admin
    .from('profiles')
    .select('id, email, full_name, admin_role')
    .eq('restaurant_id', restaurantId)
    .eq('role', 'restaurant_admin')
    .eq('admin_role', 'principal')
    .eq('is_active', true)
    .maybeSingle()
  return (data ?? null) as RestaurantAdminProfile | null
}

/** Déchiffre le mot de passe partagé actuel, ou null s'il n'a jamais été défini. */
export async function getCurrentPassword(admin: SupabaseClient<any, any, any>, restaurantId: string): Promise<string | null> {
  const { data } = await admin.from('restaurants').select('admin_password_enc').eq('id', restaurantId).single()
  const enc = (data as { admin_password_enc: string | null } | null)?.admin_password_enc
  if (!enc) return null
  return decryptSecret(enc)
}

interface RotateResult {
  newVersion: number
  admins: RestaurantAdminProfile[]
}

/**
 * Pousse newPassword sur tous les comptes Supabase Auth des admins actifs de
 * le restaurant, incrémente restaurants.password_version, chiffre et stocke le
 * nouveau mot de passe. Si actingUserId est fourni, sa propre session est
 * resynchronisée pour ne pas être déconnecté par son propre changement —
 * tous les autres admins voient leur session_password_version devenir
 * obsolète et sont donc déconnectés au prochain contrôle.
 *
 * IMPORTANT : actingUserId est exclu de la boucle admin.auth.admin.updateUserById
 * ci-dessous. Un update de mot de passe déclenché côté admin (service role)
 * révoque la session en cours de l'utilisateur visé — y compris la session
 * de la personne qui vient de faire la demande. Le mot de passe de
 * actingUserId doit être mis à jour séparément par l'appelant via un update
 * self-service (caller.auth.updateUser({ password })), qui lui ne révoque
 * pas la session en cours.
 *
 * Le chiffrement est calculé et la config validée AVANT toute mutation
 * (rotation des autres admins, écriture en base) : si APP_ENCRYPTION_KEY est
 * mal configurée, on échoue immédiatement plutôt que de laisser de vrais
 * mots de passe Supabase changés sans que restaurants.password_version /
 * admin_password_enc ne soient mis à jour en conséquence.
 */
export async function rotateRestaurantPassword(
  admin: SupabaseClient<any, any, any>,
  restaurantId: string,
  newPassword: string,
  actingUserId: string | null
): Promise<RotateResult> {
  const encryptedPassword = encryptSecret(newPassword)

  const admins = await getActiveAdmins(admin, restaurantId)
  const othersToRotate = admins.filter(a => a.id !== actingUserId)

  const results = await Promise.all(othersToRotate.map(a => admin.auth.admin.updateUserById(a.id, { password: newPassword })))
  results.forEach((r, i) => {
    if (r.error) console.error(`[rotateRestaurantPassword] échec rotation pour ${othersToRotate[i].email}:`, r.error)
  })

  const { data: restaurantData } = await admin.from('restaurants').select('password_version').eq('id', restaurantId).single()
  const currentVersion = (restaurantData as { password_version: number } | null)?.password_version ?? 1
  const newVersion = currentVersion + 1

  const { error: updateError } = await admin.from('restaurants').update({
    password_version: newVersion,
    admin_password_enc: encryptedPassword,
  }).eq('id', restaurantId)
  if (updateError) throw new Error(`Échec mise à jour restaurants.password_version: ${updateError.message}`)

  if (actingUserId) {
    await admin.from('profiles').update({ session_password_version: newVersion }).eq('id', actingUserId)
  }

  return { newVersion, admins }
}
