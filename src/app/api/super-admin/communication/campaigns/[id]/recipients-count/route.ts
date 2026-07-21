import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { countSegmentRecipients } from '@/lib/newsletter/segments'
import type { NewsletterSegment } from '@/lib/types/database'

export const dynamic = 'force-dynamic'

async function requireSuperAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }) }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return { error: NextResponse.json({ error: 'Accès refusé' }, { status: 403 }) }
  return { error: null }
}

export async function POST(request: NextRequest) {
  try {
    const { error: authError } = await requireSuperAdmin()
    if (authError) return authError

    const body = await request.json().catch(() => ({}))
    const segment = (body.segment && typeof body.segment === 'object' ? body.segment : { type: 'all' }) as NewsletterSegment

    const admin = createAdminClient()
    const count = await countSegmentRecipients(admin, segment)

    return NextResponse.json({ count })
  } catch (err) {
    console.error('communication/campaigns/[id]/recipients-count error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
