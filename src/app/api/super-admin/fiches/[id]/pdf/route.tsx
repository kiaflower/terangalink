import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { FicheDocument } from '@/lib/pdf/FicheDocument'
import { slugify } from '@/lib/utils'
import { pdfRegenerateUnlockAt, formatRegenerateRemaining } from '@/lib/pdf/regenerateLock'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const admin = createAdminClient()
    const { data: fiche } = await admin
      .from('fiches')
      .select('numero, title, subtitle, why_it_matters, key_points, example, common_mistake, action_step, status, last_generated_at, download_count, category:fiche_categories(code, name, color)')
      .eq('id', params.id)
      .single()

    if (!fiche) return NextResponse.json({ error: 'Fiche introuvable' }, { status: 404 })
    if (fiche.status === 'brouillon') {
      return NextResponse.json({ error: 'Cette fiche est encore en brouillon' }, { status: 400 })
    }

    const unlockAt = pdfRegenerateUnlockAt(fiche.last_generated_at)
    const remaining = unlockAt - Date.now()
    if (remaining > 0) {
      return NextResponse.json(
        { error: `Régénérable dans ${formatRegenerateRemaining(remaining)} — évite d'envoyer deux versions différentes de la même fiche.` },
        { status: 403 }
      )
    }

    const category = fiche.category as unknown as { code: string; name: string; color: string } | null

    const buffer = await renderToBuffer(
      <FicheDocument
        numero={fiche.numero}
        categoryCode={category?.code ?? '—'}
        categoryName={category?.name ?? '—'}
        categoryColor={category?.color ?? '#7C3AED'}
        title={fiche.title}
        subtitle={fiche.subtitle}
        whyItMatters={fiche.why_it_matters}
        keyPoints={Array.isArray(fiche.key_points) ? fiche.key_points as string[] : []}
        example={fiche.example}
        commonMistake={fiche.common_mistake}
        actionStep={fiche.action_step}
      />
    )

    const numeroStr = String(fiche.numero).padStart(3, '0')
    const filename = `fiche-${numeroStr}-${slugify(fiche.title)}.pdf`

    await admin.from('fiches').update({
      last_generated_at: new Date().toISOString(),
      download_count: (fiche.download_count ?? 0) + 1,
    }).eq('id', params.id)

    return new NextResponse(Buffer.from(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    console.error('super-admin/fiches/[id]/pdf error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
