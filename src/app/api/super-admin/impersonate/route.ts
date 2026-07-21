import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const COOKIE = 'sa_impersonate'
const MAX_AGE = 60 * 60 * 4 // 4 heures

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { boutique_id } = await request.json()
    if (!boutique_id) return NextResponse.json({ error: 'boutique_id requis' }, { status: 400 })

    const adminClient = createAdminClient()
    const { data: boutique } = await adminClient.from('boutiques').select('id, name').eq('id', boutique_id).single()
    if (!boutique) return NextResponse.json({ error: 'Boutique introuvable' }, { status: 404 })

    // Fix: set cookie on NextResponse directly (cookies() is read-only in Route Handlers in Next.js 14+)
    const response = NextResponse.json({ success: true, boutique_name: boutique.name })
    response.cookies.set(COOKIE, boutique_id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: MAX_AGE,
      path: '/',
    })
    return response
  } catch (err) {
    console.error('impersonate error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.delete(COOKIE)
  return response
}
