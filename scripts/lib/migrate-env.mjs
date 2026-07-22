// Helpers partagés par les scripts de migration Phase 2 (migrate-export-verify,
// migrate-import, migrate-verify). Deux clients service-role vers le MÊME projet
// Supabase : un sur le schéma "public" (ancien TerangaLink, lecture seule), un sur
// le schéma "app" (nouveau fork, écriture). Jamais l'inverse.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export function loadEnvLocal() {
  const envPath = path.join(__dirname, '..', '..', '.env.local')
  const content = readFileSync(envPath, 'utf-8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = value
  }
}

loadEnvLocal()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error('Variables Supabase manquantes dans .env.local (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)')
  process.exit(1)
}

export function getPublicClient() {
  return createClient(url, serviceKey)
}

export function getAppClient() {
  return createClient(url, serviceKey, { db: { schema: 'app' } })
}

// Les 4 restaurants réels confirmés par l'utilisateur (ancien schéma public).
export const RESTAURANTS = [
  { id: 'c98232e1-3290-4c90-bba6-3753cbd00803', name: 'Chez Teranga' },
  { id: '9479e6bd-1244-4952-a521-04c30f05774f', name: 'Dema Sweets' },
  { id: '13a4390b-668c-4084-9af1-7628ee8e8eb8', name: 'La cuisine de Mina' },
  { id: '5f3ed47e-533e-4dc8-86e4-41a76eebd521', name: 'Krunch' },
]

export const RESTAURANT_IDS = RESTAURANTS.map(r => r.id)
