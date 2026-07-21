// Seed unique — 11 numéros du "Point Business" (#002 à #012), en brouillon.
// Usage : node scripts/seed-point-business.mjs
// Idempotent : une campagne dont le nom existe déjà en base est ignorée (relançable sans doublon).

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function loadEnvLocal() {
  const envPath = path.join(__dirname, '..', '.env.local')
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

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

// ============================================================
// 1. Parsing du fichier source
// ============================================================

let blockIdCounter = 0
function newBlockId() {
  blockIdCounter += 1
  return `b${Date.now().toString(36)}${blockIdCounter}`
}

function parseCampaigns(markdown) {
  const lines = markdown.split('\n')
  const campaigns = []
  let current = null
  let inBlocs = false

  for (const rawLine of lines) {
    const line = rawLine.trim()

    if (line.startsWith('### CAMPAGNE:')) {
      if (current) campaigns.push(current)
      const name = line.slice('### CAMPAGNE:'.length).trim()
      const numberMatch = name.match(/#(\d+)/)
      current = { name, number: numberMatch ? numberMatch[1] : null, subject: '', preview: '', blocks: [] }
      inBlocs = false
      continue
    }
    if (!current) continue

    if (line.startsWith('OBJET:')) {
      current.subject = line.slice('OBJET:'.length).trim()
      continue
    }
    if (line.startsWith('APERCU:')) {
      current.preview = line.slice('APERCU:'.length).trim()
      continue
    }
    if (line.startsWith('BLOCS:')) {
      inBlocs = true
      continue
    }
    if (line.startsWith('[TITRE]')) {
      current.blocks.push({ id: newBlockId(), type: 'title', text: line.slice('[TITRE]'.length).trim(), align: 'left' })
      continue
    }
    if (line.startsWith('[PARAGRAPHE]')) {
      current.blocks.push({ id: newBlockId(), type: 'paragraph', text: line.slice('[PARAGRAPHE]'.length).trim() })
      continue
    }
    // lignes vides, "---", ou l'en-tête du fichier : ignorées
  }
  if (current) campaigns.push(current)
  return campaigns
}

const mdPath = path.join(__dirname, 'seed-data', 'contenu-point-business-002-012.md')
const campaigns = parseCampaigns(readFileSync(mdPath, 'utf-8'))

if (campaigns.length === 0) {
  console.error('Aucune campagne trouvée dans le fichier source.')
  process.exit(1)
}

for (const c of campaigns) {
  if (!c.number || !c.subject || !c.preview || c.blocks.length === 0) {
    console.error(`Campagne mal formée, abandon : ${JSON.stringify(c.name)}`)
    process.exit(1)
  }
}

console.log(`${campaigns.length} campagnes parsées depuis le fichier source.`)

// ============================================================
// 2. Insertion en base (idempotente)
// ============================================================

const { data: existingCampaigns, error: fetchError } = await admin
  .from('newsletter_campaigns')
  .select('name, created_at')
  .order('created_at', { ascending: false })

if (fetchError) {
  console.error('Erreur lecture campagnes existantes :', fetchError.message)
  process.exit(1)
}

const existingNames = new Set((existingCampaigns ?? []).map(c => c.name))
const latestExisting = existingCampaigns?.[0]?.created_at ? new Date(existingCampaigns[0].created_at).getTime() : Date.now()

const { data: superAdmin } = await admin.from('profiles').select('id').eq('role', 'super_admin').limit(1).maybeSingle()

const rows = []
campaigns.forEach((c, index) => {
  if (existingNames.has(c.name)) {
    console.log(`Ignoré (déjà présent) : ${c.name}`)
    return
  }
  const createdAt = new Date(latestExisting + (index + 1) * 60_000).toISOString()
  rows.push({
    name: c.name,
    subject: c.subject,
    preview_text: c.preview,
    from_name: 'TerangaSpot',
    blocks: c.blocks,
    status: 'draft',
    scheduled_at: null,
    created_by: superAdmin?.id ?? null,
    created_at: createdAt,
    updated_at: createdAt,
  })
})

if (rows.length === 0) {
  console.log('Rien à insérer — toutes les campagnes existent déjà.')
  process.exit(0)
}

const { data: inserted, error: insertError } = await admin.from('newsletter_campaigns').insert(rows).select('name')
if (insertError) {
  console.error('Erreur insertion :', insertError.message)
  process.exit(1)
}

console.log(`${inserted.length} campagnes créées en brouillon :`)
for (const row of inserted) console.log(` - ${row.name}`)
