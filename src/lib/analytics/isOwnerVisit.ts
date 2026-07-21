import type { SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Un visiteur authentifié qui consulte SA PROPRE boutique (ou un super-admin
// qui l'impersonne via le cookie sa_impersonate) n'est pas un client tiers —
// ne doit jamais être compté dans les analytics (visites, funnel, rapport
// hebdomadaire). Mêmes règles de résolution du propriétaire que /api/auth/me
// et dashboard/boutique/page.tsx.
export async function isOwnerVisit(supabase: SupabaseClient, boutiqueId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, boutique_id')
    .eq('id', user.id)
    .single()

  const impersonateCookie = cookies().get('sa_impersonate')?.value
  if (impersonateCookie && profile?.role === 'super_admin') {
    return impersonateCookie === boutiqueId
  }

  return profile?.boutique_id === boutiqueId
}
