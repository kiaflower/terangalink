import { createClient } from '@supabase/supabase-js'

// Client anonyme sans dépendance à cookies()/headers() : contrairement au client
// serveur standard (lib/supabase/server.ts), il ne force pas le rendu dynamique,
// ce qui permet aux pages qui n'ont besoin que de lectures publiques (RLS "anon")
// de bénéficier de l'ISR (revalidate) plutôt que d'un SSR à chaque requête.
export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
