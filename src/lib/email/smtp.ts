import nodemailer, { type Transporter } from 'nodemailer'

let transporter: Transporter | null = null

/** Retourne le transport SMTP (boîte contact@teranga-link.com), ou null si non configuré. */
export function getSmtpTransporter(): Transporter | null {
  const host = process.env.SMTP_HOST
  const port = process.env.SMTP_PORT
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !port || !user || !pass) return null

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host,
      port: Number(port),
      secure: Number(port) === 465,
      auth: { user, pass },
      // L'hébergement mutualisé de mail.teranga-link.com sert un certificat
      // générique du panel (LiteSpeed) qui ne couvre pas ce nom d'hôte — la
      // connexion reste chiffrée, seule la vérification du nom du certificat
      // est désactivée. À revoir si le domaine obtient un jour son propre
      // certificat TLS dédié.
      tls: { rejectUnauthorized: false },
    })
  }

  return transporter
}
