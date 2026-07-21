import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verify } from '@/lib/newsletter/token'

export const dynamic = 'force-dynamic'

function page(title: string, message: string): string {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title} — TerangaSpot</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; background: #f4f4f5; margin: 0; padding: 40px 20px; display: flex; justify-content: center; }
  .card { background: #fff; border-radius: 12px; padding: 32px; max-width: 420px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
  h1 { font-size: 18px; color: #111827; margin: 0 0 12px; }
  p { font-size: 14px; color: #6b7280; line-height: 22px; margin: 0; }
  .brand { font-size: 13px; color: #7C3AED; font-weight: 600; margin-top: 20px; }
</style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${message}</p>
    <div class="brand">TerangaSpot</div>
  </div>
</body>
</html>`
}

// Désabonnement en un clic (GET, sans étape de confirmation intermédiaire —
// c'est le comportement attendu de ce type de lien dans un client email).
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const boutiqueId = searchParams.get('b')
  const recipientId = searchParams.get('r')
  const token = searchParams.get('t')

  if (!boutiqueId || !token || !verify(boutiqueId, token)) {
    return new NextResponse(page('Lien invalide', "Ce lien de désabonnement est invalide ou a expiré."), {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  try {
    const admin = createAdminClient()
    await admin.from('boutiques').update({ newsletter_opt_in: false }).eq('id', boutiqueId)

    if (recipientId) {
      await admin.from('newsletter_recipients').update({
        status: 'unsubscribed',
        unsubscribed_at: new Date().toISOString(),
      }).eq('id', recipientId)
    }

    return new NextResponse(
      page('Désabonnement confirmé', 'Vous ne recevrez plus les emails de la newsletter TerangaSpot. Vous pouvez réactiver cette option à tout moment depuis les paramètres de votre boutique.'),
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    )
  } catch (err) {
    console.error('newsletter/unsubscribe error:', err)
    return new NextResponse(page('Erreur', "Une erreur est survenue, merci de réessayer plus tard."), {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }
}
