import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { checkRestaurantSession } from '@/lib/auth/session'

const MAINTENANCE_EXEMPT_PREFIXES = ['/dashboard', '/login', '/logout', '/api', '/maintenance', '/mot-de-passe-oublie', '/reset-password']

async function isMaintenanceModeOn(): Promise<boolean> {
  try {
    const admin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { data } = await admin.from('platform_settings').select('value').eq('key', 'maintenance_mode').maybeSingle()
    return data?.value === 'true'
  } catch {
    return false
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!MAINTENANCE_EXEMPT_PREFIXES.some(p => pathname.startsWith(p)) && await isMaintenanceModeOn()) {
    return NextResponse.rewrite(new URL('/maintenance', request.url))
  }

  const isDashboard = pathname.startsWith('/dashboard')
  const isLoginPage = pathname === '/login' || pathname.startsWith('/login/')

  if (!isDashboard && !isLoginPage) {
    return NextResponse.next()
  }

  const { supabaseResponse, user, supabase } = await updateSession(request)

  // Already logged in and landing on /login → send straight to the right
  // dashboard instead of showing the login form again.
  if (isLoginPage) {
    if (!user) return supabaseResponse
    const { data: profileData } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    const role = (profileData as { role?: string } | null)?.role
    if (role === 'super_admin') return NextResponse.redirect(new URL('/dashboard/super-admin', request.url))
    if (role === 'restaurant_admin') {
      // Le cookie de session Supabase peut rester valide même après un
      // compte désactivé ou un mot de passe changé (on ne révoque jamais
      // la session ici, seulement is_active/password_version en base) : si
      // on redirigeait quand même vers /dashboard/restaurant, son propre
      // contrôle de session renverrait aussitôt ici → boucle infinie de
      // redirection. On nettoie donc la session côté serveur et on laisse
      // voir le formulaire de connexion (avec le message ?reason= déjà présent).
      const sessionCheck = await checkRestaurantSession(supabase, user.id)
      if (!sessionCheck.ok) {
        await supabase.auth.signOut()
        return supabaseResponse
      }
      return NextResponse.redirect(new URL('/dashboard/restaurant', request.url))
    }
    if (role) return NextResponse.redirect(new URL('/dashboard/restaurant', request.url))
    return supabaseResponse
  }

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Check impersonation cookie for super-admin
  const impersonateCookie = request.cookies.get('sa_impersonate')?.value

  // Reuse the same client updateSession() just refreshed the session on —
  // a separate client built from the pre-refresh request cookies can miss
  // a just-rotated token and wrongly bounce the user to /login.
  const { data: profileData } = await supabase
    .from('profiles')
    .select('role, restaurant_id')
    .eq('id', user.id)
    .single()

  const profile = profileData as { role: string; restaurant_id: string | null } | null

  if (!profile) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const isSuperAdmin = profile.role === 'super_admin'

  // Super admin with impersonation cookie → allow restaurant dashboard.
  // L'impersonation ne dépend jamais de password_version/is_active — elle
  // s'appuie uniquement sur ce cookie + le rôle super_admin, vérifié ci-dessus.
  if (isSuperAdmin && impersonateCookie && pathname.startsWith('/dashboard/restaurant')) {
    return supabaseResponse
  }

  // Déconnexion forcée : mot de passe partagé changé depuis ce login, ou
  // compte désactivé (admin secondaire supprimé). Jamais appliqué en mode
  // impersonation (cas traité juste au-dessus).
  if (!isSuperAdmin && pathname.startsWith('/dashboard/restaurant')) {
    const sessionCheck = await checkRestaurantSession(supabase, user.id)
    if (!sessionCheck.ok) {
      const reason = sessionCheck.reason === 'account_disabled' ? 'account_disabled' : 'session_expired'
      return NextResponse.redirect(new URL(`/login?reason=${reason}`, request.url))
    }
  }

  // Super admin → redirect to super-admin dashboard
  if (isSuperAdmin && pathname.startsWith('/dashboard/restaurant')) {
    return NextResponse.redirect(new URL('/dashboard/super-admin', request.url))
  }

  // Restaurant admin → redirect away from super-admin
  if (!isSuperAdmin && pathname.startsWith('/dashboard/super-admin')) {
    return NextResponse.redirect(new URL('/dashboard/restaurant', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
}
