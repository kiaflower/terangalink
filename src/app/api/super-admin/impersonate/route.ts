import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const COOKIE = 'sa_impersonate'
const MAX_AGE = 60 * 30 // 30 minutes

// POST : démarrer l'impersonation
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if ((profile as { role?: string } | null)?.role !== 'super_admin') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const { restaurantId } = await req.json()
  if (!restaurantId) return NextResponse.json({ error: 'restaurantId manquant' }, { status: 400 })

  // Récupérer le nom du restaurant
  const admin = createAdminClient()
  const { data: resto } = await admin.from('restaurants').select('name').eq('id', restaurantId).single()
  if (!resto) return NextResponse.json({ error: 'Restaurant introuvable' }, { status: 404 })

  const payload = JSON.stringify({
    restaurantId,
    restaurantName: resto.name,
    superAdminId: user.id,
    expiresAt: Date.now() + MAX_AGE * 1000,
  })

  const cookieStore = await cookies()
  cookieStore.set(COOKIE, payload, {
    httpOnly: false, // lisible côté client pour la bannière
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: MAX_AGE,
    path: '/',
  })

  return NextResponse.json({ ok: true, restaurantName: resto.name })
}

// DELETE : terminer l'impersonation
export async function DELETE() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE)
  return NextResponse.json({ ok: true })
}
