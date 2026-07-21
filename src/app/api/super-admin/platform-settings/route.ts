import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data, error } = await supabase.from('platform_settings').select('key, value')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ settings: data ?? [] })
  } catch (err) {
    console.error('platform-settings GET error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { settings } = await request.json()
    if (!Array.isArray(settings)) return NextResponse.json({ error: 'settings doit être un tableau' }, { status: 400 })

    for (const { key, value } of settings) {
      if (!key) continue
      const { error } = await supabase
        .from('platform_settings')
        .upsert({ key, value: value ?? '', updated_at: new Date().toISOString() }, { onConflict: 'key' })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('platform-settings POST error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
