import { getCanonicalSiteUrl } from '@/lib/site-url'

interface EmailContent {
  subject: string
  html: string
}

function layout(title: string, bodyHtml: string): string {
  const logoUrl = `${getCanonicalSiteUrl()}/logo.jpg`
  return `<!doctype html>
<html lang="fr">
  <body style="margin:0;padding:0;background-color:#F9FAFB;font-family:system-ui,-apple-system,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
      <tr>
        <td align="center">
          <table width="480" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #E5E7EB;">
            <tr>
              <td style="background:#F97316;padding:20px 32px;">
                <table cellpadding="0" cellspacing="0"><tr>
                  <td style="padding-right:10px;"><img src="${logoUrl}" width="28" height="28" alt="" style="border-radius:8px;display:block;" /></td>
                  <td><span style="color:#FFFFFF;font-weight:700;font-size:18px;">TerangaLink</span></td>
                </tr></table>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 16px;font-size:18px;color:#111111;">${title}</h1>
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px;background:#F9FAFB;">
                <p style="margin:0;font-size:12px;color:#9CA3AF;">TerangaLink — cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

function credentialsBlock(email: string, password: string): string {
  return `<table cellpadding="0" cellspacing="0" style="width:100%;background:#F9FAFB;border-radius:12px;margin:16px 0;">
    <tr><td style="padding:16px 20px;">
      <p style="margin:0 0 6px;font-size:13px;color:#6B7280;">Email de connexion</p>
      <p style="margin:0 0 14px;font-size:15px;font-weight:600;color:#111111;">${email}</p>
      <p style="margin:0 0 6px;font-size:13px;color:#6B7280;">Mot de passe</p>
      <p style="margin:0;font-size:15px;font-weight:600;color:#111111;font-family:monospace;">${password}</p>
    </td></tr>
  </table>`
}

export function welcomeEmail(restaurantName: string, email: string, password: string): EmailContent {
  return {
    subject: `Bienvenue sur TerangaLink, ${restaurantName} !`,
    html: layout('Votre restaurant est prête 🎉', `
      <p style="margin:0 0 12px;font-size:14px;color:#374151;">Votre restaurant <strong>${restaurantName}</strong> a été validée. Voici vos identifiants pour accéder à votre dashboard :</p>
      ${credentialsBlock(email, password)}
      <p style="margin:0;font-size:13px;color:#6B7280;">Conservez ces informations en lieu sûr. Vous pourrez modifier ce mot de passe à tout moment depuis les Paramètres de votre dashboard.</p>
    `),
  }
}

export function adminAddedEmail(restaurantName: string, email: string, password: string): EmailContent {
  return {
    subject: `Vous êtes désormais admin de ${restaurantName} sur TerangaLink`,
    html: layout('Accès dashboard ajouté', `
      <p style="margin:0 0 12px;font-size:14px;color:#374151;">L'admin principal de <strong>${restaurantName}</strong> vous a ajouté comme administrateur secondaire. Voici vos identifiants :</p>
      ${credentialsBlock(email, password)}
      <p style="margin:0;font-size:13px;color:#6B7280;">Ce mot de passe est partagé avec les autres admins du restaurant. Seul l'admin principal peut le modifier.</p>
    `),
  }
}

export function passwordChangedEmail(restaurantName: string, email: string, newPassword: string): EmailContent {
  return {
    subject: `Le mot de passe de ${restaurantName} a changé`,
    html: layout('Mot de passe mis à jour', `
      <p style="margin:0 0 12px;font-size:14px;color:#374151;">L'admin principal de <strong>${restaurantName}</strong> vient de changer le mot de passe partagé du dashboard. Voici le nouveau :</p>
      ${credentialsBlock(email, newPassword)}
      <p style="margin:0;font-size:13px;color:#6B7280;">Vous avez été déconnecté(e) de vos sessions actives. Utilisez ce nouveau mot de passe pour vous reconnecter.</p>
    `),
  }
}

export function forgotPasswordPrincipalEmail(restaurantName: string, email: string, newPassword: string): EmailContent {
  return {
    subject: `Nouveau mot de passe pour ${restaurantName}`,
    html: layout('Mot de passe réinitialisé', `
      <p style="margin:0 0 12px;font-size:14px;color:#374151;">Vous avez demandé la réinitialisation du mot de passe de <strong>${restaurantName}</strong>. Voici le nouveau mot de passe :</p>
      ${credentialsBlock(email, newPassword)}
      <p style="margin:0;font-size:13px;color:#6B7280;">Toutes les sessions actives du restaurant ont été déconnectées. Si vous n'êtes pas à l'origine de cette demande, contactez le support TerangaLink.</p>
    `),
  }
}

export function supportResetEmail(restaurantName: string, email: string, newPassword: string): EmailContent {
  return {
    subject: `Mot de passe réinitialisé par le support TerangaLink`,
    html: layout('Réinitialisation par le support', `
      <p style="margin:0 0 12px;font-size:14px;color:#374151;">L'équipe support TerangaLink a réinitialisé le mot de passe de <strong>${restaurantName}</strong> à votre demande. Voici le nouveau mot de passe :</p>
      ${credentialsBlock(email, newPassword)}
      <p style="margin:0;font-size:13px;color:#6B7280;">Toutes les sessions actives du restaurant ont été déconnectées. Contactez le support si vous n'êtes pas à l'origine de cette demande.</p>
    `),
  }
}

