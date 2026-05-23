import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/lib/types/database'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — do not write logic between here and getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Fetch profile for role-based routing
  let role: string | null = null
  let restaurantId: string | null = null

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, restaurant_id')
      .eq('id', user.id)
      .single()

    role = profile?.role ?? null
    restaurantId = profile?.restaurant_id ?? null
  }

  const url = request.nextUrl.clone()
  const pathname = url.pathname

  // ─── Auth redirect rules ────────────────────────────────────────────────

  // Not logged in — protect all /dashboard routes
  if (!user && pathname.startsWith('/dashboard')) {
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Logged in but trying to access login page → redirect to correct dashboard
  if (user && pathname === '/login') {
    if (role === 'super_admin') {
      url.pathname = '/dashboard/super-admin'
    } else {
      url.pathname = '/dashboard/restaurant'
    }
    return NextResponse.redirect(url)
  }

  // Role guard: restaurant_admin trying to access super-admin routes
  if (user && role === 'restaurant_admin' && pathname.startsWith('/dashboard/super-admin')) {
    url.pathname = '/dashboard/restaurant'
    return NextResponse.redirect(url)
  }

  // Role guard: super_admin trying to access restaurant routes
  if (user && role === 'super_admin' && pathname.startsWith('/dashboard/restaurant')) {
    url.pathname = '/dashboard/super-admin'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
