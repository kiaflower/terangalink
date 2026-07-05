import crypto from 'crypto'

const INDEXING_SCOPE = 'https://www.googleapis.com/auth/indexing'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const PUBLISH_URL = 'https://indexing.googleapis.com/v3/urlNotifications:publish'

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function getAccessToken(): Promise<string | null> {
  const clientEmail = process.env.GOOGLE_INDEXING_CLIENT_EMAIL
  const privateKey = process.env.GOOGLE_INDEXING_PRIVATE_KEY?.replace(/\\n/g, '\n')
  if (!clientEmail || !privateKey) return null

  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss: clientEmail,
    scope: INDEXING_SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  }
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`
  const signature = crypto.sign('RSA-SHA256', Buffer.from(unsigned), privateKey)
  const assertion = `${unsigned}.${base64url(signature)}`

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })

  if (!res.ok) {
    console.error('[google-indexing] token request failed:', await res.text())
    return null
  }

  const data = await res.json()
  return data.access_token as string
}

/**
 * Notifie l'API Google Indexing qu'une URL a été créée/mise à jour ou supprimée.
 * No-op silencieux si GOOGLE_INDEXING_CLIENT_EMAIL/GOOGLE_INDEXING_PRIVATE_KEY ne sont pas configurés.
 */
export async function notifyGoogleIndexing(
  url: string,
  type: 'URL_UPDATED' | 'URL_DELETED' = 'URL_UPDATED'
): Promise<void> {
  try {
    const token = await getAccessToken()
    if (!token) {
      console.warn('[google-indexing] skipped (credentials not configured) for', url)
      return
    }

    const res = await fetch(PUBLISH_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url, type }),
    })

    if (!res.ok) {
      console.error('[google-indexing] publish failed:', res.status, await res.text())
    } else {
      console.log(`[google-indexing] notified (${type}) for`, url)
    }
  } catch (err) {
    console.error('[google-indexing] unexpected error:', err)
  }
}
