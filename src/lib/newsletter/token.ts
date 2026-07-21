import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Signature HMAC des liens de tracking/désabonnement — réutilise
 * APP_ENCRYPTION_KEY (déjà provisionnée pour src/lib/crypto.ts) au lieu
 * d'exiger un nouveau secret d'environnement.
 */
function getSecret(): Buffer {
  const raw = process.env.APP_ENCRYPTION_KEY
  if (!raw) throw new Error('APP_ENCRYPTION_KEY manquante')
  return Buffer.from(raw, 'base64')
}

export function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('base64url')
}

export function verify(payload: string, token: string): boolean {
  const expected = Buffer.from(sign(payload))
  const actual = Buffer.from(token)
  if (expected.length !== actual.length) return false
  return timingSafeEqual(expected, actual)
}
