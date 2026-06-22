import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import nodemailer from 'nodemailer'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { to_email } = await request.json()
    if (!to_email) return NextResponse.json({ error: 'to_email requis' }, { status: 400 })

    // Vérifier que les variables SMTP sont présentes
    const missing = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'].filter(k => !process.env[k])
    if (missing.length > 0) {
      return NextResponse.json({
        error: `Variables manquantes : ${missing.join(', ')}. Vérifier les variables d'environnement Vercel.`,
      }, { status: 500 })
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 465,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })

    await transporter.verify()

    await transporter.sendMail({
      from: `"TerangaLink" <${process.env.SMTP_USER}>`,
      to: to_email,
      subject: '✅ Test SMTP TerangaLink — Connexion OK',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:24px;">
          <div style="background:#F97316;border-radius:12px;padding:10px 16px;display:inline-block;margin-bottom:20px;">
            <span style="color:white;font-weight:900;font-size:16px;">TerangaLink</span>
          </div>
          <h2 style="color:#111;">Configuration SMTP opérationnelle ✅</h2>
          <p style="color:#555;">Cet email confirme que votre configuration SMTP fonctionne correctement.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:20px 0;" />
          <p style="color:#888;font-size:12px;">
            Host : ${process.env.SMTP_HOST}<br/>
            Port : ${process.env.SMTP_PORT || 465}<br/>
            User : ${process.env.SMTP_USER}
          </p>
        </div>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    console.error('[TEST SMTP]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
