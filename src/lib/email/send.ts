import { getSmtpTransporter } from './smtp'

interface SendMailArgs {
  to: string
  subject: string
  html: string
}

/**
 * Envoie un email via la boîte SMTP contact@teranga-spot.com. N'échoue
 * jamais bruyamment : si SMTP n'est pas configuré ou que l'envoi échoue, on
 * logue et on continue — un email non envoyé ne doit jamais faire échouer
 * un changement de mot de passe ou une gestion d'admin.
 */
export async function sendMail({ to, subject, html }: SendMailArgs): Promise<void> {
  const transporter = getSmtpTransporter()
  const from = process.env.SMTP_USER

  if (!transporter || !from) {
    console.error(`[email] SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS manquant(s) — email "${subject}" à ${to} non envoyé.`)
    return
  }

  try {
    await transporter.sendMail({ from: `TerangaSpot <${from}>`, to, subject, html })
  } catch (err) {
    console.error(`[email] Échec d'envoi "${subject}" à ${to}:`, err)
  }
}
