import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

export interface ConnectedBoutiquePwa {
  id: string
  name: string
  logo_url: string | null
  primary_color: string
  background_color: string
}

// Même logique de résolution boutique que dashboard/boutique/layout.tsx
// (session + cookie d'impersonation super-admin) — dupliquée ici plutôt
// qu'importée car le layout n'exporte rien de réutilisable, et les deux
// routes PWA (manifest + icônes) en ont besoin indépendamment.
export async function getConnectedBoutiquePwa(): Promise<ConnectedBoutiquePwa | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const cookieStore = cookies()
  const impersonateCookie = cookieStore.get('sa_impersonate')?.value

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, boutique:boutiques(id, name, logo_url, primary_color, background_color)')
    .eq('id', user.id)
    .single()

  const isSuperAdmin = (profile as { role?: string } | null)?.role === 'super_admin'

  if (isSuperAdmin && impersonateCookie) {
    const admin = createAdminClient()
    const { data: b } = await admin
      .from('boutiques')
      .select('id, name, logo_url, primary_color, background_color')
      .eq('id', impersonateCookie)
      .single()
    return b as ConnectedBoutiquePwa | null
  }

  return ((profile as { boutique?: ConnectedBoutiquePwa | null } | null)?.boutique) ?? null
}
