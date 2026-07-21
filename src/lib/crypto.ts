import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGO = 'aes-256-gcm'

function getKey(): Buffer {
  const raw = process.env.APP_ENCRYPTION_KEY
  if (!raw) throw new Error('APP_ENCRYPTION_KEY manquante')
  const key = Buffer.from(raw, 'base64')
  if (key.length !== 32) throw new Error('APP_ENCRYPTION_KEY doit faire 32 octets une fois décodée en base64')
  return key
}

/**
 * À appeler en tout début d'une route qui va manipuler le mot de passe
 * partagé, avant toute mutation (changement réel de mdp, rotation d'autres
 * comptes, etc.) — permet d'échouer immédiatement si APP_ENCRYPTION_KEY est
 * mal configurée plutôt que de laisser une opération à moitié appliquée.
 */
export function assertEncryptionConfigured(): void {
  getKey()
}

/** Chiffre une chaîne en clair. Retourne "iv:authTag:ciphertext" en base64. */
export function encryptSecret(plain: string): string {
  const key = getKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGO, key, iv)
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return [iv.toString('base64'), authTag.toString('base64'), ciphertext.toString('base64')].join(':')
}

/** Déchiffre une valeur produite par encryptSecret(). */
export function decryptSecret(enc: string): string {
  const key = getKey()
  const [ivB64, authTagB64, ciphertextB64] = enc.split(':')
  if (!ivB64 || !authTagB64 || !ciphertextB64) throw new Error('Format de secret chiffré invalide')
  const decipher = createDecipheriv(ALGO, key, Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(authTagB64, 'base64'))
  const plain = Buffer.concat([decipher.update(Buffer.from(ciphertextB64, 'base64')), decipher.final()])
  return plain.toString('utf8')
}
