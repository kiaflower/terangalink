// Remplit le brouillon vide existant ("Nouvelle campagne", id fixe ci-dessous) avec le
// contenu réel du Point Business #001 — ce brouillon avait été créé sans contenu.
// Usage : node scripts/seed-point-business-001.mjs

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
  console.error('Variables Supabase manquantes dans .env.local')
  process.exit(1)
}

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

let blockIdCounter = 0
function newBlockId() {
  blockIdCounter += 1
  return `b${Date.now().toString(36)}${blockIdCounter}`
}

function title(text) {
  return { id: newBlockId(), type: 'title', text, align: 'left' }
}
function paragraph(text) {
  return { id: newBlockId(), type: 'paragraph', text }
}

const blocks = [
  title('Le mot de Kia'),
  paragraph(
    'Cette semaine, en discutant avec plusieurs boutiques, une phrase est revenue trois fois, presque mot pour mot : ' +
    '« Je passe plus de temps à répondre aux mêmes questions qu\'à vendre. »'
  ),
  paragraph(
    'Ce n\'est pas un problème de désorganisation personnelle. C\'est un problème de structure : une conversation WhatsApp ' +
    'n\'a jamais été pensée pour porter un catalogue entier. Regardons ensemble où part vraiment votre temps — et comment le reprendre.'
  ),

  title('Là où part vraiment votre temps'),
  paragraph(
    'Le problème n\'est pas le volume de messages, c\'est leur répétitivité. Une cliente demande la couleur, une autre le prix, ' +
    'une troisième la livraison — toujours les mêmes questions, jamais écrites une seule fois quelque part où elles pourraient se ' +
    'répondre seules. Ce n\'est pas le temps de réponse qui coûte cher : c\'est le temps de re-tapage.'
  ),
  paragraph(
    'À ça s\'ajoute un deuxième piège : chercher dans votre propre catalogue. Sans un endroit unique et clair, chaque question ' +
    'devient une mini-enquête — scroller les photos, vérifier un carnet, chercher de mémoire. Ce sont des interruptions ' +
    'permanentes qui cassent votre concentration.'
  ),
  paragraph(
    'Et un troisième : sans vue d\'ensemble, vous reconstruisez chaque matin l\'état de votre activité dans votre tête — ce qui ' +
    'crée oublis et doublons.'
  ),
  paragraph(
    'Ces trois pièges ne sont pas des défauts personnels. Même la commerçante la plus rigoureuse tomberait dedans avec cette ' +
    'structure. La solution n\'est pas « travaillez plus vite » — c\'est changer la structure elle-même.'
  ),

  title('À exploiter cette semaine : TerangaSpot'),
  paragraph(
    'Les catégories répondent à « vous avez ça ? » avant qu\'on vous la pose : la cliente navigue seule dans votre boutique en ' +
    'ligne, au lieu de vous écrire d\'abord.<br>' +
    'Les descriptions complètes tuent le re-tapage : une fiche remplie une fois (couleurs, tailles, prix) répond à toutes les ' +
    'clientes futures, sans que vous soyez présente.<br>' +
    'Le tableau de bord remplace la reconstruction mentale du matin : vous voyez vos commandes en cours d\'un coup d\'œil, au ' +
    'lieu de tout retenir de mémoire.'
  ),
  paragraph('Le principe à retenir : chaque information structurée une fois est une information que vous ne retaperez plus jamais.'),

  title('La checklist de la semaine'),
  paragraph(
    '1. Notez vos 3 questions les plus répétées de la semaine.<br>' +
    '2. Vérifiez si la réponse est déjà sur votre fiche produit — sinon, complétez-la aujourd\'hui.<br>' +
    '3. Rangez au moins 5 produits dans une catégorie claire.<br>' +
    '4. Ouvrez votre dashboard chaque matin, à heure fixe.'
  ),

  title('Le défi de la semaine'),
  paragraph(
    'La prochaine fois qu\'on vous pose une question déjà présente sur une fiche produit, envoyez juste le lien du produit au ' +
    'lieu de retaper la réponse. Comptez combien de fois vous l\'avez fait cette semaine.'
  ),

  title('Pour finir'),
  paragraph(
    'Ce Point Business est nourri par ce que je vois chez vous chaque semaine. Une idée, un problème, une astuce trouvée de ' +
    'votre côté — écrivez-moi. Vous construisez les prochains numéros.'
  ),
  paragraph('À la semaine prochaine, Kia'),
]

const { data: existing, error: fetchError } = await admin
  .from('newsletter_campaigns')
  .select('id, name, blocks')
  .eq('name', 'Nouvelle campagne')
  .maybeSingle()

if (fetchError) {
  console.error('Erreur lecture :', fetchError.message)
  process.exit(1)
}
if (!existing) {
  console.error('Brouillon "Nouvelle campagne" introuvable — rien à remplir. Abandon (aucune insertion créée pour éviter un doublon).')
  process.exit(1)
}
if (existing.blocks.length > 0) {
  console.error('Ce brouillon contient déjà du contenu — abandon pour ne rien écraser.')
  process.exit(1)
}

const { error: updateError } = await admin
  .from('newsletter_campaigns')
  .update({
    name: 'Le Point Business #001',
    subject: 'Les tâches qui vous font perdre le plus de temps',
    preview_text: 'Là où part vraiment votre temps, et comment le reprendre',
    from_name: 'TerangaSpot',
    blocks,
    updated_at: new Date().toISOString(),
  })
  .eq('id', existing.id)

if (updateError) {
  console.error('Erreur mise à jour :', updateError.message)
  process.exit(1)
}

console.log(`Brouillon "${existing.name}" (${existing.id}) rempli avec le contenu du Point Business #001.`)
