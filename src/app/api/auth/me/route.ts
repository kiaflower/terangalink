import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cookieStore = cookies()
  const imp = cookieStore.get('sa_impersonate')?.value

  const { data: profile } = await supabase.from('profiles').select('role, restaurant_id, admin_role, is_active').eq('id', user.id).single()

  // Only honor the impersonation cookie for an actual super_admin — a stale
  // cookie left in the browser must not silently impersonate for a regular
  // restaurant login.
  if (imp && profile?.role === 'super_admin') {
    return NextResponse.json({ restaurant_id: imp, impersonating: true })
  }

  // Alimente le segment de ciblage newsletter "restaurants inactifs" — throttlé
  // (condition dans le WHERE) pour ne pas écrire à chaque appel de cette route,
  // qui est faite à chaque chargement de page du dashboard restaurant.
  if (profile?.role === 'restaurant_admin' && profile.restaurant_id) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    await supabase
      .from('restaurants')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', profile.restaurant_id)
      .or(`last_login_at.is.null,last_login_at.lt.${oneHourAgo}`)
  }

  return NextResponse.json({ ...profile, user_id: user.id })
}
