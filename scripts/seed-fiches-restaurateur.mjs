// Seed — catégories + 10 Fiches Restaurateur (contenu propre à TerangaLink,
// remplace le catalogue générique "Fiches Business" hérité de TerangaSpot).
// Usage : node scripts/seed-fiches-restaurateur.mjs
// Idempotent : les catégories sont mises à jour (upsert par code), les fiches ne
// sont jamais écrasées si elles existent déjà (upsert ignore-duplicates par
// numero) — les éditions manuelles faites depuis l'admin après ce seed ne
// seront donc jamais perdues.
//
// Cible le schéma "app" (fork isolé) — voir supabase/migrations/0001_initial_schema_app.sql.

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

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false }, db: { schema: 'app' } })

// ============================================================
// 1. Catégories
// ============================================================

const CATEGORIES = [
  { code: 'ORG', name: 'Organisation', color: '#B45309', icon: 'timer', sort_order: 1 },
  { code: 'VIS', name: 'Visibilité', color: '#2563EB', icon: 'smartphone', sort_order: 2 },
  { code: 'MENU', name: 'Menu & Stock', color: '#C2410C', icon: 'shopping-bag', sort_order: 3 },
  { code: 'VTE', name: 'Ventes', color: '#0F766E', icon: 'bar-chart-3', sort_order: 4 },
  { code: 'FID', name: 'Fidélisation', color: '#BE185D', icon: 'heart', sort_order: 5 },
  { code: 'FIN', name: 'Finances', color: '#166534', icon: 'wallet', sort_order: 6 },
]

// ============================================================
// 2. Fiches (10 — les sujets validés pour le lancement)
// ============================================================

const FICHES = [
{ numero: 1, categoryCode: 'ORG', title: "Arrêter de gérer ses commandes uniquement par DM et WhatsApp", pitch: "Sortir la prise de commande de la messagerie pour ne plus la perdre dans le rush du service",
  subtitle: "Un DM noyé dans 40 autres messages, c'est une commande qui n'arrivera jamais en cuisine.",
  why_it_matters: "Pendant le coup de feu, les messages Instagram et WhatsApp s'accumulent au même endroit que les questions, les compliments et les messages personnels. Une commande peut se retrouver coincée entre deux messages sans lien, et personne ne s'en rend compte avant que le client rappelle, énervé.",
  key_points: ["Une commande qui passe par un lien de commande dédié arrive toujours au même endroit, jamais mélangée avec le reste", "Le client remplit lui-même son adresse et son plat — plus besoin de tout retaper depuis un message reçu en pleine cuisine", "Toi ou ton équipe voyez la commande arriver clairement, avec une notification, pas noyée dans une conversation WhatsApp", "Le lien reste valable 24h/24 — un client peut commander à minuit sans attendre que tu répondes"],
  example: "Un restaurateur de thiéboudienne à Parcelles Assainies recevait ses commandes du midi mélangées avec les messages de ses fournisseurs et les DM de curieux qui demandaient juste le prix. Deux commandes ont été oubliées la même semaine, découvertes seulement quand les clientes ont rappelé, furieuses. Depuis qu'il partage son lien TerangaLink en story, les commandes arrivent toutes au même endroit, avec le nom du client et l'adresse déjà notés.",
  common_mistake: "Continuer à répondre \"Envoie-moi ton adresse et ce que tu veux\" en pleine préparation, au lieu de rediriger vers un lien qui fait ce travail à ta place.",
  action_step: "Partage ton lien TerangaLink (visible dans ton tableau de bord) en story et en statut WhatsApp aujourd'hui, et redirige vers lui la prochaine fois qu'on te commande en DM." },

{ numero: 2, categoryCode: 'ORG', title: "Ce que coûte vraiment un ticket perdu ou une commande mal notée", pitch: "Calculer combien d'argent part chaque mois dans les erreurs de prise de commande papier",
  subtitle: "Un ticket égaré, ce n'est jamais qu'un bout de papier — c'est un plat déjà payé en ingrédients et jamais facturé.",
  why_it_matters: "Beaucoup de restaurateurs ne calculent jamais ce que coûtent réellement les tickets perdus, les commandes mal transcrites au téléphone, ou les \"c'était pas ça\" du client. Additionnés sur un mois, ces petits accidents représentent souvent plus que ce qu'on imagine.",
  key_points: ["Un ticket perdu = les ingrédients déjà achetés et cuisinés, sans jamais être payés", "Une commande mal notée au téléphone = soit un plat refait gratuitement, soit un client mécontent qui ne revient pas", "Compte sur une semaine normale combien de fois ça arrive — la plupart des restaurateurs sous-estiment ce chiffre", "Une commande enregistrée automatiquement (nom, plat, prix, adresse) élimine ce risque à la source"],
  example: "Une pâtissière de Ouakam notait ses commandes de gâteaux sur un carnet qu'elle perdait régulièrement en pleine préparation. En recomptant sur un mois, elle a réalisé qu'elle avait refait deux gâteaux gratuitement et raté une commande complètement — soit l'équivalent d'un gâteau et demi offert sans le vouloir, juste à cause du carnet égaré.",
  common_mistake: "Considérer les tickets perdus comme une fatalité du métier, sans jamais calculer combien ça représente sur un mois complet.",
  action_step: "Note pendant une semaine chaque commande mal transcrite ou perdue, avec son prix. À la fin de la semaine, multiplie par 4 pour voir le coût mensuel réel." },

{ numero: 3, categoryCode: 'VIS', title: "Un seul lien à partager, plutôt qu'un numéro qu'on rappelle sans cesse", pitch: "Remplacer \"appelle-moi pour commander\" par un lien unique dans ta bio Instagram et ton statut WhatsApp",
  subtitle: "Le client qui doit appeler pour commander est souvent celui qui commande ailleurs, plus simplement.",
  why_it_matters: "Demander à un client de composer un numéro, d'attendre que ça décroche, puis de dicter sa commande à voix haute est un frein que beaucoup de clients évitent tout simplement en allant voir un autre restaurant qui a un lien direct.",
  key_points: ["Ton lien TerangaLink regroupe ton menu, tes prix et un bouton de commande — en un seul endroit", "Il se met dans la bio Instagram, en story, en statut WhatsApp, sur une affiche en boutique", "Le client compose sa commande à son rythme, sans avoir à parler à personne s'il ne le souhaite pas", "Un seul lien à retenir, plutôt qu'un numéro de téléphone que le client doit sauvegarder"],
  example: "Un restaurant de grillades à Sacré-Cœur ne donnait que son numéro WhatsApp en bio Instagram. Beaucoup de visiteurs regardaient le menu en story sans jamais passer à l'appel. En mettant son lien TerangaLink en bio à la place du numéro, il a vu des commandes arriver directement depuis Instagram, de personnes qui n'auraient jamais appelé.",
  common_mistake: "Garder uniquement un numéro de téléphone en bio, en pensant que \"les gens appellent s'ils veulent vraiment commander\".",
  action_step: "Remplace dès aujourd'hui le numéro de téléphone dans ta bio Instagram par ton lien TerangaLink." },

{ numero: 4, categoryCode: 'MENU', title: "Marquer un plat \"en rupture\" en un clic, au lieu de répondre dix fois \"c'est fini\"", pitch: "Désactiver un plat épuisé en un geste, sans avoir à répéter la même réponse à chaque client",
  subtitle: "Répondre dix fois \"désolé, c'est terminé\" prend plus de temps que de simplement le marquer indisponible.",
  why_it_matters: "Quand un plat populaire est épuisé, chaque client qui le commande quand même génère un message ou un appel supplémentaire à gérer en plein service — au pire moment possible pour être dérangé.",
  key_points: ["Un plat marqué indisponible n'apparaît plus comme commandable sur ta vitrine, automatiquement", "Plus besoin de répondre individuellement à chaque personne qui commande ce qui n'existe plus", "Tu peux le réactiver en un clic dès que tu as reconstitué le stock", "Ça évite aussi les commandes qu'il faudrait annuler et rembourser après coup"],
  example: "Un restaurant de poisson braisé à Yoff voyait son plat vedette partir avant 14h presque tous les jours, et continuait à recevoir des commandes pour ce plat jusqu'au soir. En marquant le plat indisponible dès l'épuisement du stock, ces commandes impossibles à honorer ont simplement disparu de la vitrine.",
  common_mistake: "Laisser un plat épuisé visible et commandable, en comptant sur soi-même pour prévenir chaque client après coup.",
  action_step: "La prochaine fois qu'un plat s'épuise en cours de service, marque-le indisponible depuis ton tableau de bord avant de retourner en cuisine." },

{ numero: 5, categoryCode: 'MENU', title: "Un menu qui se met à jour tout seul, sans réimprimer ni redemander à quelqu'un", pitch: "Changer un prix ou ajouter un plat immédiatement visible, sans passer par l'imprimeur",
  subtitle: "Le jour où le prix du riz augmente, ton menu papier, lui, ne bouge pas.",
  why_it_matters: "Un menu imprimé coûte du temps et de l'argent à chaque changement, et pendant ce temps, les clients continuent de voir d'anciens prix ou des plats qui n'existent plus. Un menu qui se met à jour en temps réel évite ce décalage permanent.",
  key_points: ["Change un prix, une description ou une photo directement depuis ton téléphone, visible immédiatement", "Ajoute un nouveau plat en quelques minutes, sans attendre la prochaine impression", "Retire un plat qui ne marche plus sans avoir à corriger un menu papier au correcteur", "Le client voit toujours le menu réel, jamais une version dépassée"],
  example: "Une cantine de Liberté 6 changeait ses prix au feutre sur un menu plastifié à chaque hausse des prix du marché, ce qui finissait illisible après quelques mois. Depuis qu'elle gère son menu depuis son tableau de bord, elle ajuste un prix en 30 secondes dès qu'un ingrédient devient plus cher, sans jamais retoucher de papier.",
  common_mistake: "Continuer à utiliser un menu papier ou une photo de menu partagée en story, qui devient fausse dès le premier changement de prix.",
  action_step: "Ouvre ton menu dans le tableau de bord et vérifie que chaque prix affiché correspond bien à ce que tu factures aujourd'hui." },

{ numero: 6, categoryCode: 'VTE', title: "Voir quels plats se vendent, sans avoir à demander en cuisine", pitch: "Consulter en un coup d'œil les plats qui marchent, les heures et jours creux",
  subtitle: "Deviner ce qui se vend, c'est comme cuisiner sans regarder la recette.",
  why_it_matters: "Sans données, un restaurateur se fie à son impression pour savoir ce qui marche — et l'impression trompe souvent, surtout quand on est concentré sur le service plutôt que sur le comptage.",
  key_points: ["Le tableau de bord montre les plats les plus commandés sur la semaine ou le mois", "Les heures et jours creux apparaissent clairement, pour ajuster le stock ou les promos", "Un plat qu'on pensait populaire peut se révéler moins demandé que prévu, et inversement", "Ces chiffres aident à décider quoi mettre en avant sur la vitrine ou dans une promo"],
  example: "Un restaurateur de yassa à Médina était convaincu que son yassa poulet était son plat le plus vendu. En regardant ses statistiques, il a découvert que son mafé, qu'il mettait peu en avant, se vendait presque autant. Il l'a mis en photo de couverture, et ses commandes ont encore augmenté.",
  common_mistake: "Se fier uniquement à son ressenti pour savoir ce qui marche, sans jamais vérifier les vrais chiffres de commandes.",
  action_step: "Ouvre la section analytique de ton tableau de bord cette semaine et regarde quel est réellement ton plat le plus commandé — tu auras peut-être une surprise." },

{ numero: 7, categoryCode: 'VTE', title: "Récupérer un client qui a hésité, plutôt que de ne jamais le revoir", pitch: "Repérer les paniers abandonnés et relancer sans être insistant",
  subtitle: "Un client qui a rempli son panier sans valider n'a pas dit non — il a juste été interrompu.",
  why_it_matters: "Un client qui ajoute un plat à son panier puis quitte la page sans commander n'a pas forcément changé d'avis — un appel, une hésitation sur la livraison, ou simplement une distraction peuvent expliquer l'abandon. Sans suivi, cette vente presque conclue disparaît simplement.",
  key_points: ["Le système repère automatiquement les paniers laissés sans commande finalisée", "Une relance simple et sans pression peut suffire à récupérer la vente", "Ça coûte beaucoup moins d'effort que d'attirer un nouveau client depuis zéro", "Ce n'est pas une relance agressive — juste un rappel que le panier est toujours là"],
  example: "Une pâtisserie de Ngor recevait régulièrement des paniers remplis de gâteaux jamais validés, sans jamais chercher à savoir pourquoi. En repérant ces paniers abandonnés et en relançant les clients concernés, elle a récupéré plusieurs commandes qui semblaient perdues, souvent juste à cause d'une hésitation sur le mode de livraison.",
  common_mistake: "Ignorer complètement les paniers non finalisés, en supposant que le client a simplement changé d'avis.",
  action_step: "Regarde dans ton tableau de bord s'il y a des paniers abandonnés récents, et envoie un message simple à ces clients pour savoir s'ils ont besoin d'aide pour finaliser." },

{ numero: 8, categoryCode: 'FID', title: "Fidéliser sans toujours brader", pitch: "Construire une fidélité qui ne repose pas uniquement sur des réductions permanentes",
  subtitle: "Une réduction permanente n'est plus une offre spéciale — c'est juste ton nouveau prix.",
  why_it_matters: "Beaucoup de restaurateurs pensent que la seule façon de fidéliser est de baisser régulièrement les prix. Mais les avis clients, le badge Vérifié, ou un système de parrainage créent une fidélité tout aussi forte, sans jamais toucher à la marge.",
  key_points: ["Des avis clients visibles rassurent les nouveaux venus autant qu'une réduction", "Le badge Vérifié montre que ton restaurant est sérieux et établi, sans rien coûter", "Un système de parrainage récompense le client qui te ramène quelqu'un, plutôt que de brader pour tout le monde", "Une réduction ponctuelle et annoncée garde son effet — une réduction permanente le perd"],
  example: "Un restaurant de fast-food sénégalais à Sicap Liberté offrait -10% en continu depuis son ouverture, sans que ça n'attire particulièrement plus de clients fidèles. En arrêtant la réduction permanente et en mettant en avant ses avis clients et son badge Vérifié, il a gardé sa clientèle sans perdre de marge sur chaque commande.",
  common_mistake: "Offrir une réduction permanente dès l'ouverture, qui devient vite perçue comme le prix normal plutôt que comme un geste spécial.",
  action_step: "Si tu as une réduction permanente active, remplace-la cette semaine par un geste ponctuel — par exemple, un code de parrainage pour les clients qui t'en ramènent un nouveau." },

{ numero: 9, categoryCode: 'FIN', title: "Facturation et abonnement clairs, avec reçu automatique", pitch: "Savoir exactement ce que tu payes, quand, et récupérer ta facture en un clic",
  subtitle: "Une facture qu'on ne retrouve jamais, c'est un budget qu'on ne maîtrise jamais.",
  why_it_matters: "Beaucoup de petits restaurateurs paient leurs outils sans jamais recevoir de facture claire, ce qui rend difficile de suivre son budget ou de justifier une dépense professionnelle si besoin.",
  key_points: ["Chaque paiement d'abonnement génère automatiquement une facture PDF téléchargeable", "Le montant, la date et le plan sont toujours visibles dans ton tableau de bord", "Aucune surprise sur le prix — le montant est annoncé avant chaque prélèvement", "Utile aussi si tu dois un jour justifier tes charges auprès d'un comptable ou d'une banque"],
  example: "Un restaurateur de Rufisque payait son abonnement à un autre outil sans jamais recevoir le moindre reçu, et ne savait plus exactement combien il avait dépensé sur l'année quand on le lui a demandé pour un dossier de financement. Avec les factures PDF automatiques de TerangaLink, il retrouve chaque paiement en quelques secondes.",
  common_mistake: "Payer un abonnement mensuel sans jamais vérifier ni conserver les factures correspondantes.",
  action_step: "Va dans la section Paramètres/Facturation de ton tableau de bord et télécharge ta dernière facture, pour vérifier que tout est clair." },

{ numero: 10, categoryCode: 'VIS', title: "Être visible dans l'annuaire même avant d'être prêt à prendre des commandes en ligne", pitch: "Ta fiche restaurant existe et se fait connaître, même si tu commences doucement",
  subtitle: "On ne commande jamais chez un restaurant qu'on n'a pas d'abord trouvé.",
  why_it_matters: "Beaucoup de restaurateurs pensent qu'il faut attendre d'être \"prêts\" — un menu complet, des photos parfaites — avant de se rendre visibles. Pendant ce temps, l'annuaire TerangaLink continue d'être consulté par des clients qui cherchent un restaurant comme le tien, dans ton quartier, aujourd'hui.",
  key_points: ["Ta fiche dans l'annuaire est visible dès l'inscription, même avec un menu encore incomplet", "Un client qui cherche \"cuisine sénégalaise à Dakar\" peut tomber sur toi avant même que tu aies terminé tes photos", "Chaque plat ajouté rend ta fiche plus complète et plus susceptible d'être mise en avant", "Être visible tôt, même imparfaitement, vaut mieux qu'attendre la perfection pour se lancer"],
  example: "Une gargote de Grand Dakar a créé sa fiche avec seulement 4 plats et aucune photo de couverture au début. Elle a quand même reçu ses trois premières commandes via l'annuaire la première semaine, simplement parce qu'un client cherchait exactement sa spécialité, le mafé, dans son quartier.",
  common_mistake: "Attendre d'avoir un menu et des photos parfaits avant de s'inscrire, en perdant des semaines de visibilité possible.",
  action_step: "Vérifie ta fiche restaurant aujourd'hui : ajoute au moins une photo et un plat de plus, même si le menu n'est pas encore complet." },
]

// ============================================================
// 3. Exécution du seed
// ============================================================

async function main() {
  console.log(`Seed : ${CATEGORIES.length} catégories, ${FICHES.length} fiches.`)

  const { data: upsertedCategories, error: catError } = await admin
    .from('fiche_categories')
    .upsert(CATEGORIES, { onConflict: 'code' })
    .select('id, code')
  if (catError) { console.error('Erreur upsert catégories:', catError.message); process.exit(1) }
  console.log(`✓ ${upsertedCategories.length} catégories upsertées.`)

  const categoryIdByCode = Object.fromEntries(upsertedCategories.map(c => [c.code, c.id]))

  const maxNumero = Math.max(...FICHES.map(f => f.numero))
  const rows = FICHES.map(f => ({
    numero: f.numero,
    category_id: categoryIdByCode[f.categoryCode],
    title: f.title,
    pitch: f.pitch,
    status: 'prete',
    subtitle: f.subtitle,
    why_it_matters: f.why_it_matters,
    key_points: f.key_points,
    example: f.example,
    common_mistake: f.common_mistake,
    action_step: f.action_step,
  }))

  const missingCategory = rows.find(r => !r.category_id)
  if (missingCategory) {
    console.error('Code catégorie introuvable pour une fiche:', missingCategory.title)
    process.exit(1)
  }

  // ignoreDuplicates : n'écrase jamais une fiche déjà existante (numero unique) —
  // une édition manuelle faite depuis l'admin après un premier run reste intacte.
  const { data: insertedFiches, error: fichesError } = await admin
    .from('fiches')
    .upsert(rows, { onConflict: 'numero', ignoreDuplicates: true })
    .select('numero')
  if (fichesError) { console.error('Erreur upsert fiches:', fichesError.message); process.exit(1) }
  console.log(`✓ ${insertedFiches.length} nouvelles fiches insérées (sur ${rows.length} dans le catalogue).`)

  // Aligne la séquence next_fiche_numero() au-delà du plus grand numero seedé,
  // pour que le bouton "Nouvelle fiche" de l'admin ne produise jamais un numero
  // déjà utilisé par ce seed.
  let last = 0
  let guard = 0
  while (last < maxNumero && guard < maxNumero + 5) {
    const { data, error } = await admin.rpc('next_fiche_numero')
    if (error) { console.error('Erreur sync séquence:', error.message); process.exit(1) }
    last = data
    guard++
  }
  console.log(`✓ Séquence fiches_numero_seq alignée — prochaine fiche créée manuellement portera le numero ${last + 1}.`)

  console.log('Seed terminé.')
}

main()
