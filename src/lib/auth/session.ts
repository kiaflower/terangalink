import type { SupabaseClient } from '@supabase/supabase-js'

export interface BoutiqueSessionProfile {
  id: string
  role: string
  boutique_id: string | null
  admin_role: 'principal' | 'secondaire' | null
  is_active: boolean
  session_password_version: number
}

export type SessionCheckResult =
  | { ok: true; profile: BoutiqueSessionProfile }
  | { ok: false; reason: 'unauthenticated' | 'no_profile' | 'account_disabled' | 'password_changed' }

/**
 * Vérifie qu'une session boutique_admin est toujours valide : compte actif
 * et mot de passe partagé pas changé depuis le dernier login réussi (voir
 * /api/auth/session-sync). Toujours valide pour un super_admin — le mode
 * impersonation ne doit jamais dépendre de cette fonction, il est géré en
 * amont via le cookie sa_impersonate, séparément.
 */
export async function checkBoutiqueSession(
  supabase: SupabaseClient,
  userId: string
): Promise<SessionCheckResult> {
  const { data: profileData } = await supabase
    .from('profiles')
    .select('id, role, boutique_id, admin_role, is_active, session_password_version')
    .eq('id', userId)
    .single()

  const profile = profileData as BoutiqueSessionProfile | null
  if (!profile) return { ok: false, reason: 'no_profile' }

  if (profile.role !== 'boutique_admin') return { ok: true, profile }

  if (!profile.is_active) return { ok: false, reason: 'account_disabled' }
  if (!profile.boutique_id) return { ok: false, reason: 'no_profile' }

  const { data: boutiqueData } = await supabase
    .from('boutiques')
    .select('password_version')
    .eq('id', profile.boutique_id)
    .single()

  const boutique = boutiqueData as { password_version: number } | null
  if (!boutique) return { ok: false, reason: 'no_profile' }

  if (profile.session_password_version !== boutique.password_version) {
    return { ok: false, reason: 'password_changed' }
  }

  return { ok: true, profile }
}
