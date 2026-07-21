import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { slugify } from '@/lib/utils'
import { generatePassword, rotateBoutiquePassword } from '@/lib/auth/boutiqueAdmin'
import { sendMail } from '@/lib/email/send'
import { forgotPasswordPrincipalEmail } from '@/lib/email/templates'

export const dynamic = 'force-dynamic'

const GENERIC_RESPONSE = { message: 'Si ces informations correspondent à un compte, un email a été envoyé sous peu.' }

// Le champ accepte "ma-boutique" aussi bien que "teranga-spot.com/ma-boutique"
// (le placeholder du formulaire suggère ce dernier format) — on ne garde que
// le dernier segment de chemin avant de le slugifier, sinon slugify() mange
// le nom de domaine et la recherche ne matche jamais.
function extractBoutiqueSlug(input: string): string {
  const withoutProtocol = input.trim().replace(/^https?:\/\//i, '')
  const segments = withoutProtocol.split('/').filter(Boolean)
  const lastSegment = segments[segments.length - 1] || withoutProtocol
  return slugify(lastSegment)
}

// Public: demande "mot de passe oublié" avec nom + email + slug de boutique.
// Réservé à l'admin principal — un admin secondaire qui a oublié le mot de
// passe doit le redemander au principal directement, pas via ce formulaire.
// Ne révèle jamais si l'email/la boutique existe, ni si le compte est
// principal ou secondaire — toujours la même réponse générique.
export async function POST(req: NextRequest) {
  try {
    const { email, slug } = await req.json().catch(() => ({ email: '', slug: '' }))

    if (typeof email === 'string' && email.trim() && typeof slug === 'string' && slug.trim()) {
      const admin = createAdminClient()
      const needle = slug.trim()

      const { data: boutique } = await admin.from('boutiques').select('id, name').eq('slug', extractBoutiqueSlug(needle)).maybeSingle()

      if (boutique) {
        const { data: profile } = await admin
          .from('profiles')
          .select('id')
          .eq('boutique_id', boutique.id)
          .eq('role', 'boutique_admin')
          .eq('admin_role', 'principal')
          .eq('is_active', true)
          .ilike('email', email.trim())
          .maybeSingle()

        if (profile) {
          const newPassword = generatePassword()
          await rotateBoutiquePassword(admin, boutique.id, newPassword, null)
          await sendMail({ to: email.trim(), ...forgotPasswordPrincipalEmail(boutique.name, email.trim(), newPassword) })
        }
      }
    }
  } catch (err) {
    console.error('forgot-password error:', err)
  }

  return NextResponse.json(GENERIC_RESPONSE)
}
