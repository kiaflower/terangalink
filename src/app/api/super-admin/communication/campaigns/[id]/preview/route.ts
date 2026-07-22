import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderCampaignHtml } from '@/lib/newsletter/render'
import { sanitizeBlocks } from '@/lib/newsletter/blocks'
import { getSiteUrl } from '@/lib/site-url'

export const dynamic = 'force-dynamic'

async function requireSuperAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }) }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return { error: NextResponse.json({ error: 'Accès refusé' }, { status: 403 }) }
  return { error: null }
}

// Rend le HTML final à partir des blocs envoyés dans le corps de la requête
// (pas de la base) — permet un aperçu live des modifications non enregistrées.
export async function POST(request: NextRequest) {
  try {
    const { error: authError } = await requireSuperAdmin()
    if (authError) return authError

    const body = await request.json().catch(() => ({}))
    const blocks = sanitizeBlocks(body.blocks)
    const previewText = typeof body.preview_text === 'string' ? body.preview_text : null

    const html = await renderCampaignHtml(
      { blocks, preview_text: previewText },
      { siteUrl: getSiteUrl(), recipientId: null, restaurantId: null }
    )

    return NextResponse.json({ html })
  } catch (err) {
    console.error('communication/campaigns/[id]/preview error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
