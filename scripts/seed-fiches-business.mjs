// Seed unique — catégories + 110 fiches business (catalogue TerangaSpot_Fiches_Business.docx).
// Usage : node scripts/seed-fiches-business.mjs
// Idempotent : les catégories sont mises à jour (upsert par code), les fiches ne sont
// jamais écrasées si elles existent déjà (upsert ignore-duplicates par numero) — les
// éditions manuelles faites depuis l'admin après ce seed ne seront donc jamais perdues.

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
// 1. Catégories
// ============================================================

const CATEGORIES = [
  { code: 'MKT', name: 'Marketing', color: '#5B2A86', icon: 'target', sort_order: 1 },
  { code: 'SOC', name: 'Réseaux sociaux', color: '#D4527E', icon: 'smartphone', sort_order: 2 },
  { code: 'WA', name: 'WhatsApp Business', color: '#1D9E75', icon: 'message-circle', sort_order: 3 },
  { code: 'VTE', name: 'Vente', color: '#BA7517', icon: 'shopping-bag', sort_order: 4 },
  { code: 'SC', name: 'Service client', color: '#378ADD', icon: 'handshake', sort_order: 5 },
  { code: 'PRO', name: 'Productivité', color: '#5F5E5A', icon: 'timer', sort_order: 6 },
  { code: 'GES', name: 'Gestion', color: '#185FA5', icon: 'bar-chart-3', sort_order: 7 },
  { code: 'BRD', name: 'Branding', color: '#C9A227', icon: 'sparkles', sort_order: 8 },
  { code: 'PHT', name: 'Photos produits', color: '#0F6E56', icon: 'camera', sort_order: 9 },
  { code: 'LIV', name: 'Livraison', color: '#993C1D', icon: 'truck', sort_order: 10 },
  { code: 'FID', name: 'Fidélisation', color: '#993556', icon: 'heart', sort_order: 11 },
  { code: 'IA', name: 'IA & outils', color: '#7F77DD', icon: 'bot', sort_order: 12 },
  { code: 'FIN', name: 'Finances', color: '#27500A', icon: 'wallet', sort_order: 13 },
]

// ============================================================
// 2. Fiches (110 — catalogue complet du document de référence)
// ============================================================

const FICHES = [
// --- A. MARKETING (MKT) ---
{ numero: 1, categoryCode: 'MKT', title: "Trouver son client idéal en 10 minutes", pitch: "Définir en une fiche qui achète vraiment chez toi, pas «tout le monde»",
  subtitle: "Si tu vends à tout le monde, tu ne vends à personne.",
  why_it_matters: "Beaucoup de commerçants écrivent leurs posts en pensant toucher un maximum de monde. Résultat : le message est tellement vague que personne ne se sent concerné. Savoir précisément à qui tu parles change tout ce que tu écris ensuite.",
  key_points: ["Pense à ta dernière vraie vente (pas un like, une commande payée)", "Qui c'était ? Quel âge à peu près ? Pour elle/lui ou pour offrir ?", "C'est cette personne-là qu'il faut viser dans tes prochains posts, pas 'toutes les femmes sénégalaises'"],
  example: null,
  common_mistake: "Écrire 'pour toutes les femmes sénégalaises' en légende — ça ne parle précisément à personne.",
  action_step: "Écris une seule phrase : 'Mon client, c'est [âge] ans, qui [ce qu'il/elle cherche], parce que [pourquoi il/elle achète chez moi].' Garde cette phrase, elle te servira pour toutes tes prochaines fiches." },

{ numero: 2, categoryCode: 'MKT', title: "Écrire une bio qui vend (Instagram/WhatsApp)", pitch: "Transformer sa bio en argument de vente en 3 lignes",
  subtitle: "Ta bio, c'est ta vitrine avant même que le client entre.",
  why_it_matters: "Avant de discuter avec toi, un client lit ta bio Instagram ou ton nom WhatsApp Business. Si elle ne dit rien de clair, il repart sans même te demander un prix. Trois lignes bien écrites suffisent à transformer un visiteur curieux en acheteur potentiel.",
  key_points: ["Ligne 1 : ce que tu vends, sans détour (\"Bijoux en perles faits main à Dakar\")", "Ligne 2 : ce qui te rend différente (livraison rapide, sur-mesure, prix fixe)", "Ligne 3 : l'action à faire (\"Commande en DM\" ou \"Clique sur le lien\")", "Enlève les emojis en trop et les phrases vagues type 'passionnée depuis toujours'"],
  example: "Une couturière de Parcelles Assainies avait en bio 'Amoureuse de la mode depuis petite ❤️'. Elle l'a changée en 'Robes sur-mesure, livrées en 48h à Dakar — DM pour ton modèle'. Ses demandes en message ont doublé en une semaine.",
  common_mistake: "Raconter sa passion au lieu de dire clairement ce qu'on vend et comment commander.",
  action_step: "Réécris ta bio maintenant en 3 lignes : quoi, pourquoi toi, comment commander. Poste-la avant de fermer cette fiche." },

{ numero: 50, categoryCode: 'MKT', title: "Le prix n'est jamais le vrai problème", pitch: "Diagnostiquer pourquoi ça ne vend pas avant de baisser les prix",
  subtitle: "Avant de baisser ton prix, cherche ce qui bloque vraiment.",
  why_it_matters: "Quand ça ne vend pas, le réflexe est de baisser le prix. Mais souvent le vrai frein c'est la confiance, la photo, ou la clarté de l'offre — pas l'argent. Baisser le prix sans comprendre le problème te fait perdre de la marge pour rien.",
  key_points: ["Demande-toi : est-ce que les gens voient le produit (visibilité) ou est-ce qu'ils voient mais n'achètent pas (conversion) ?", "Vérifie tes photos, ta description, tes délais de réponse avant de toucher au prix", "Regarde si tes concurrents vendent plus cher avec plus de succès — souvent c'est la confiance qui fait la différence", "Le prix n'est le vrai problème que si tu l'as vérifié en dernier, pas en premier"],
  example: "Un vendeur de gadgets à Sandaga a baissé ses prix trois fois sans effet. En regardant ses messages, il répondait après 2 jours. Il a corrigé son temps de réponse, remis le prix d'origine, et les ventes sont reparties.",
  common_mistake: "Brader tout de suite dès qu'une vente stagne, sans diagnostiquer la vraie cause.",
  action_step: "Liste les 5 dernières personnes qui ont demandé un prix sans acheter. Note pourquoi, selon toi, elles n'ont pas continué — c'est ton vrai diagnostic." },

{ numero: 51, categoryCode: 'MKT', title: "Créer une offre irrésistible sans perdre d'argent", pitch: "Construire un bundle ou une réduction qui reste rentable",
  subtitle: "Un bon bundle donne l'impression de gagner, sans que toi tu perdes.",
  why_it_matters: "Une réduction mal calculée peut vider ta marge sans faire vraiment décoller tes ventes. Une bonne offre associe des produits pour augmenter le panier moyen, pas juste baisser le prix d'un seul article.",
  key_points: ["Associe un produit qui se vend bien avec un produit qui se vend moins (le best-seller 'tire' l'autre)", "Calcule ta marge sur le pack complet, pas juste sur le produit phare", "Donne une date de fin claire pour créer une décision rapide", "Affiche le prix normal barré à côté du prix du pack pour montrer l'économie"],
  example: "Une boutique de cosmétiques à Liberté 6 vendait son savon éclaircissant seul. Elle l'a associé à une crème moins demandée dans un pack '2 en 1' à prix légèrement réduit. Le produit qui stagnait s'est écoulé, et la marge globale est restée bonne.",
  common_mistake: "Faire une réduction sur son produit le plus vendu juste pour 'attirer du monde', et perdre de l'argent sur ce qui se vendait déjà bien.",
  action_step: "Choisis ton produit le plus vendu et ton produit qui stagne. Crée un pack des deux avec 10% de réduction sur l'ensemble, pas plus." },

{ numero: 52, categoryCode: 'MKT', title: "Le calendrier marketing du commerçant occupé", pitch: "Planifier son mois en 30 minutes avec un minimum d'outils",
  subtitle: "30 minutes suffisent pour ne plus improviser chaque matin.",
  why_it_matters: "Sans plan, on poste au hasard, on oublie des jours, et on panique la veille d'un événement. Un calendrier simple évite le stress et garde une présence régulière, ce qui compte plus que la perfection.",
  key_points: ["Prends un cahier ou les notes du téléphone, pas besoin d'outil compliqué", "Note juste : date, type de post (produit/coulisses/promo), et une idée en 3 mots", "Prévois les dates clés du mois (Tabaski, rentrée, fin de mois) à l'avance", "Fais ce planning le dimanche soir pour toute la semaine"],
  example: "Une vendeuse de sacs à Yoff a commencé à noter chaque dimanche ses 3 posts de la semaine sur une note téléphone. Elle ne rate plus les vendredis, son jour le plus vendeur, faute d'inspiration de dernière minute.",
  common_mistake: "Attendre d'avoir 'l'inspiration' le jour même pour poster, et finir par ne rien publier.",
  action_step: "Ouvre tes notes téléphone maintenant et écris les 3 sujets de tes prochains posts, avec une date pour chacun." },

{ numero: 53, categoryCode: 'MKT', title: "Copier n'est pas une stratégie", pitch: "Pourquoi s'inspirer d'un concurrent ≠ le recopier, et comment se différencier",
  subtitle: "S'inspirer, oui. Recopier, jamais — ça se voit et ça ne fidélise pas.",
  why_it_matters: "Beaucoup de commerçants recopient les posts d'un concurrent qui marche bien, mais sans la même clientèle ni la même histoire, ça ne prend pas pareil. Pire, les clients qui suivent les deux comptes le remarquent.",
  key_points: ["Observe ce qui marche chez un concurrent : le format, pas le contenu exact", "Demande-toi pourquoi ça a marché pour lui (son ton, son timing, sa communauté)", "Adapte l'idée à ta propre voix et à ton propre produit", "Ne republie jamais un visuel ou un texte quasi identique à celui d'un autre commerçant"],
  example: "Une boutique de mèches a vu qu'un concurrent cartonnait avec des vidéos 'avant/après pose'. Au lieu de copier le même montage, elle a fait sa propre version avec sa cliente fidèle et son propre style de coiffure signature.",
  common_mistake: "Reprendre presque mot pour mot la légende d'un concurrent qui a fait un carton.",
  action_step: "Repère un post qui a bien marché ailleurs. Note le format en une phrase, puis écris ta propre version avec ton produit et tes mots." },

{ numero: 54, categoryCode: 'MKT', title: "Le storytelling de ta boutique en 5 phrases", pitch: "Raconter pourquoi tu as commencé, pour créer un attachement émotionnel",
  subtitle: "Pourquoi tu as commencé compte plus que ce que tu vends.",
  why_it_matters: "Les clients achètent aussi une histoire, pas juste un produit. Raconter pourquoi tu as lancé ta boutique crée un lien émotionnel qui te différencie de n'importe quel autre vendeur du même produit.",
  key_points: ["Phrase 1 : d'où tu pars (un besoin, une frustration, une passion)", "Phrase 2 : le déclic qui t'a poussé à te lancer", "Phrase 3 : ce que tu as dû surmonter au début", "Phrase 4 : ce que tu veux offrir à tes clients aujourd'hui", "Phrase 5 : une invitation simple à te suivre ou commander"],
  example: "Une vendeuse de jus naturels à Ouakam a commencé son histoire par 'Je préparais ce bissap pour ma famille avant de le vendre'. Ce post simple a été plus partagé que toutes ses photos de produits du mois.",
  common_mistake: "Ne jamais parler de soi et rester uniquement sur des photos de produits, sans jamais créer de lien.",
  action_step: "Écris tes 5 phrases maintenant sur une note, puis poste-les cette semaine avec une photo de toi ou de tes débuts." },

{ numero: 55, categoryCode: 'MKT', title: "Vendre un événement (Tabaski, rentrée, Ramadan) sans stresser", pitch: "Anticiper les pics de vente 3 semaines à l'avance avec un plan simple",
  subtitle: "3 semaines d'avance changent tout le jour J.",
  why_it_matters: "Les pics de vente comme Tabaski ou la rentrée arrivent chaque année, mais beaucoup de commerçants les découvrent 5 jours avant, dans la panique. Anticiper permet de commander le bon stock et de communiquer sans se précipiter.",
  key_points: ["Note dans ton calendrier les 3 dates clés de l'année pour ton secteur", "Commence à teaser 3 semaines avant ('Bientôt disponible pour...')", "Prépare ton stock 2 semaines avant le pic, pas la veille", "Prévois un message de dernière minute pour les retardataires"],
  example: "Une boutique de tissus a commencé à publier 'Vos coupons pour Tabaski arrivent' dès début du mois, trois semaines avant la fête. Résultat : les clientes réservaient déjà avant même que le stock ne soit épuisé le jour J.",
  common_mistake: "Ne communiquer sur l'événement que 3-4 jours avant, quand la plupart des clients ont déjà acheté ailleurs.",
  action_step: "Regarde ton calendrier et identifie le prochain événement fort de ton secteur. Note aujourd'hui la date à laquelle tu commences à en parler — 3 semaines avant, pas moins." },

{ numero: 56, categoryCode: 'MKT', title: "Le bouche-à-oreille, ça se provoque", pitch: "4 actions concrètes pour donner envie aux clients de parler de toi",
  subtitle: "Personne ne parle de toi si tu ne lui donnes pas une raison de le faire.",
  why_it_matters: "Le bouche-à-oreille semble être un coup de chance, mais en réalité il se déclenche par des actions précises. Un client satisfait ne pense pas toujours à te recommander tout seul — il faut parfois le lui rappeler gentiment.",
  key_points: ["Demande directement à un client content de te recommander à une amie", "Donne un petit geste (réduction, cadeau) à qui te ramène un nouveau client", "Facilite le partage : un visuel prêt à envoyer sur WhatsApp", "Remercie publiquement (avec accord) les clients qui parlent de toi"],
  example: "Une vendeuse de gâteaux à Médina offre une part gratuite au prochain achat quand une cliente partage sa commande en story et la tague. Ses commandes issues du bouche-à-oreille ont doublé en deux mois.",
  common_mistake: "Espérer que les clients contents parlent de toi tout seuls, sans jamais le leur demander.",
  action_step: "Choisis ton client le plus fidèle et envoie-lui un message aujourd'hui pour lui demander de te recommander à une personne de son entourage — propose-lui un petit geste en retour." },

{ numero: 57, categoryCode: 'MKT', title: "Ton concurrent n'est pas ton ennemi", pitch: "Comment observer sans copier, et parfois collaborer",
  subtitle: "Observer sans copier, parfois même collaborer — ça rapporte plus que la guerre.",
  why_it_matters: "Beaucoup de commerçants perdent du temps et de l'énergie à surveiller ou dénigrer leurs concurrents. Cette énergie est mieux utilisée à comprendre le marché et parfois à créer des alliances utiles.",
  key_points: ["Suis 2-3 concurrents pour comprendre les tendances de ton secteur, pas pour les copier", "Identifie les produits complémentaires (pas identiques) avec qui collaborer", "Ne critique jamais un concurrent publiquement, même indirectement", "Une collaboration ponctuelle (jeu concours croisé, pack commun) peut toucher de nouveaux clients des deux côtés"],
  example: "Une boutique de bijoux et une boutique de vêtements du même quartier ont organisé un jeu concours commun : la gagnante recevait un article de chaque boutique. Chacune a gagné des followers de l'audience de l'autre.",
  common_mistake: "Critiquer ou ignorer complètement les concurrents au lieu d'apprendre d'eux ou de collaborer intelligemment.",
  action_step: "Identifie un commerçant complémentaire (pas concurrent direct) dans ton quartier et propose-lui une idée simple de collaboration cette semaine." },

{ numero: 58, categoryCode: 'MKT', title: "Le marketing qui ne coûte rien", pitch: "6 leviers gratuits à activer avant de penser à la publicité payante",
  subtitle: "6 leviers gratuits avant de penser à dépenser un centime en pub.",
  why_it_matters: "Beaucoup de commerçants pensent qu'il faut de la publicité payante pour vendre. Mais la majorité des leviers gratuits (contenu régulier, statuts, bouche-à-oreille, hashtags) ne sont même pas encore bien exploités.",
  key_points: ["Poster régulièrement (même 3x/semaine) plutôt que rarement mais 'parfait'", "Utiliser les statuts WhatsApp comme vitrine quotidienne gratuite", "Répondre à tous les commentaires pour booster la visibilité du post", "Utiliser les bons hashtags locaux et de niche", "Solliciter les avis et partages de clients satisfaits", "Collaborer avec d'autres commerçants pour toucher leur audience"],
  example: "Un vendeur d'accessoires téléphone à Colobane n'a jamais payé de publicité. En combinant statuts quotidiens, réponses rapides aux commentaires et hashtags précis, il a construit sa clientèle uniquement avec ces leviers gratuits.",
  common_mistake: "Penser qu'il faut absolument un budget pub avant même d'avoir exploité les outils gratuits à fond.",
  action_step: "Choisis un levier gratuit que tu n'utilises pas encore (statuts, hashtags, réponses aux commentaires) et applique-le dès aujourd'hui sur ton prochain post." },

{ numero: 59, categoryCode: 'MKT', title: "Quand et comment faire de la pub payante (Meta Ads)", pitch: "Les bases pour ne pas jeter son argent dans une première campagne",
  subtitle: "Ne mets pas un centime en pub avant d'avoir vérifié ces bases.",
  why_it_matters: "La publicité payante peut accélérer les ventes, mais lancée trop tôt ou mal ciblée, elle brûle du budget sans résultat. Il faut d'abord maîtriser l'organique avant d'investir.",
  key_points: ["Ne fais de la pub que sur un post qui a déjà bien marché en organique", "Cible précisément (âge, ville, centres d'intérêt) plutôt que 'tout le monde'", "Commence avec un petit budget test (quelques milliers de FCFA) avant de scaler", "Vérifie que ta page de destination (catalogue, DM) répond vite, sinon la pub est gaspillée"],
  example: "Une boutique de parfums a boosté un post qui avait déjà eu de bons commentaires en organique, ciblé sur Dakar, femmes 20-40 ans. Avec 5 000 FCFA de budget test, elle a pu mesurer si ça convertissait avant d'investir plus.",
  common_mistake: "Booster n'importe quel post, y compris ceux qui n'ont eu aucun engagement naturel, en espérant que l'argent seul suffira.",
  action_step: "Repère ton post le plus commenté et partagé du mois dernier. C'est celui-là, et seulement celui-là, que tu dois envisager de booster en premier." },
]

// --- B. RÉSEAUX SOCIAUX (SOC) ---
FICHES.push(
{ numero: 4, categoryCode: 'SOC', title: "Poster au bon moment : le calendrier sénégalais", pitch: "Les créneaux où ta cible est vraiment active (avant/après prière, pauses)",
  subtitle: "Les mêmes heures ne marchent pas ici qu'ailleurs — adapte-toi au rythme local.",
  why_it_matters: "Beaucoup de commerçants copient des horaires de posting trouvés sur internet, pensés pour d'autres pays. Au Sénégal, les pauses prière, les trajets et les horaires de travail créent des créneaux d'activité bien précis.",
  key_points: ["Les créneaux forts : avant 8h, pause déjeuner 13h-14h, après 18h30 et en soirée après 21h", "Évite de poster pendant les heures de prière si ta cible est pratiquante", "Le vendredi après la prière est souvent un bon moment pour les offres", "Teste et regarde tes propres statistiques Instagram/TikTok pour affiner ces horaires"],
  example: "Une boutique de tissus postait à midi pile et voyait peu d'engagement. En décalant à 13h30, juste après la pause déjeuner, ses vues ont nettement augmenté.",
  common_mistake: "Poster aux horaires suggérés par des articles américains, sans tenir compte du rythme réel de sa propre audience.",
  action_step: "Regarde dans les statistiques de ton compte à quelle heure tes abonnés sont le plus actifs, et cale ton prochain post sur ce créneau." },

{ numero: 6, categoryCode: 'SOC', title: "Créer son premier Reel produit sans se filmer", pitch: "Une méthode simple avec juste le produit, la lumière, et 3 plans",
  subtitle: "Pas besoin d'être devant la caméra pour faire un Reel qui marche.",
  why_it_matters: "Beaucoup de commerçants n'osent pas se filmer et abandonnent l'idée des vidéos. Pourtant, un Reel simple avec juste le produit, une bonne lumière et un bon rythme peut très bien fonctionner sans montrer son visage.",
  key_points: ["Filme le produit sous 3 angles différents (face, détail, en situation)", "Utilise une musique tendance pour le rythme du montage", "Garde le Reel entre 7 et 15 secondes pour rester efficace", "Ajoute un texte à l'écran avec le prix ou l'accroche principale"],
  example: "Une vendeuse de bijoux qui n'aimait pas se filmer a fait un Reel juste avec ses mains posant chaque bague sur un tissu noir, au rythme d'une musique populaire. La vidéo a dépassé toutes ses publications photo en vues.",
  common_mistake: "Ne jamais publier de vidéo par peur de se montrer, en pensant que c'est obligatoire.",
  action_step: "Filme aujourd'hui ton produit le plus vendu sous 3 angles, avec juste tes mains à l'écran, et monte-le avec une musique tendance." },

{ numero: 60, categoryCode: 'SOC', title: "Le carrousel Instagram qui retient l'attention", pitch: "Structurer 5 slides pour qu'on les swipe jusqu'au bout",
  subtitle: "5 slides bien pensées font swiper jusqu'au bout — et jusqu'à l'achat.",
  why_it_matters: "Un carrousel bien construit garde l'attention plus longtemps qu'une simple photo, ce qui augmente les chances qu'Instagram le montre à plus de monde. Mal structuré, il perd le client dès la 2e slide.",
  key_points: ["Slide 1 : une accroche forte qui donne envie de swiper", "Slides 2-4 : détails, angles, utilisation du produit", "Dernière slide : le prix et l'appel à l'action clair (DM, lien)", "Garde un style visuel cohérent entre les slides (mêmes couleurs, même fond)"],
  example: "Une boutique de chaussures a créé un carrousel 'Comment porter cette paire en 3 styles différents', chaque slide montrant une tenue. Le taux de partage a explosé comparé à ses photos uniques habituelles.",
  common_mistake: "Mettre 8 photos différentes sans fil conducteur, ce qui perd l'attention après la 2e slide.",
  action_step: "Choisis un produit et construis un carrousel de 5 slides avec un fil conducteur clair : accroche, 3 angles/usages, prix et appel à l'action." },

{ numero: 61, categoryCode: 'SOC', title: "Les hashtags, mode d'emploi sénégalais", pitch: "Combiner hashtags locaux et larges pour être vu par les bonnes personnes",
  subtitle: "Trop larges, tu te perds. Trop pointus, personne ne te trouve.",
  why_it_matters: "Les hashtags aident à être découvert par des gens qui ne te suivent pas encore. Mal choisis (trop génériques ou trop rares), ils ne servent à rien.",
  key_points: ["Combine 2-3 hashtags larges (#SenegalShopping) et 4-5 hashtags précis (#bijouxdakar)", "Ajoute ta ville ou ton quartier en hashtag (#DakarBoutique)", "Change tes hashtags régulièrement, ne recopie pas toujours les mêmes 30", "Évite les hashtags avec des millions de posts — ton contenu s'y noie immédiatement"],
  example: "Une vendeuse de mèches utilisait uniquement #hair et #beauty, hashtags saturés de contenu international. En passant à #mechesdakar #coiffuresenegal #hairstyledakar, ses posts sont devenus visibles par un public réellement local et intéressé.",
  common_mistake: "Utiliser uniquement des hashtags très génériques et très populaires, où ton post se perd en quelques secondes.",
  action_step: "Remplace 5 de tes hashtags habituels par des hashtags précis liés à ta ville et ton produit, et compare l'engagement du prochain post." },

{ numero: 62, categoryCode: 'SOC', title: "TikTok pour les commerçants qui n'aiment pas danser", pitch: "5 formats de contenu TikTok qui marchent sans mise en scène",
  subtitle: "5 formats qui marchent sans mise en scène ni chorégraphie.",
  why_it_matters: "Beaucoup de commerçants évitent TikTok en pensant qu'il faut danser ou faire du divertissement. Il existe pourtant plusieurs formats simples et efficaces pour vendre sans jamais se donner en spectacle.",
  key_points: ["Format 'déballage' : montrer le produit qui arrive et se déballe", "Format 'avant/après' : utilisation ou transformation du produit", "Format 'coulisses' : préparation d'une commande ou du stock", "Format 'FAQ' : répondre à une question fréquente en vidéo courte", "Format 'top 3' : tes 3 produits les plus demandés du mois"],
  example: "Un vendeur de gadgets qui refusait de se filmer a commencé par des vidéos 'déballage' de ses nouveaux arrivages, juste ses mains et le produit. Ce format simple lui a apporté plus de vues que n'importe quel autre commerçant du quartier qui dansait.",
  common_mistake: "Penser que TikTok = danse ou humour obligatoire, et abandonner la plateforme avant même d'essayer un format simple.",
  action_step: "Filme aujourd'hui un format 'déballage' de ton prochain arrivage de stock, sans te filmer toi-même, juste tes mains et le produit." },

{ numero: 63, categoryCode: 'SOC', title: "La story qui donne envie de DM", pitch: "Construire une story avec un appel à l'action clair",
  subtitle: "Une story sans appel à l'action, c'est une occasion de vente perdue.",
  why_it_matters: "Les stories ont un fort taux de vue mais souvent aucune action derrière. Ajouter un appel clair transforme une simple vue en message reçu.",
  key_points: ["Termine toujours par une question ou une invite claire ('Écris-moi STOCK pour réserver')", "Utilise les stickers de sondage ou question pour encourager l'interaction", "Montre une urgence réelle (dernières pièces, promo du jour)", "Republie les meilleurs retours clients en story pour rassurer"],
  example: "Une boutique de sacs postait ses stories sans texte, juste la photo. En ajoutant 'Réponds OUI pour recevoir le prix', elle a commencé à recevoir des DM directement depuis ses stories, chose qui n'arrivait jamais avant.",
  common_mistake: "Poster une story juste pour informer, sans jamais donner d'action précise à faire ensuite.",
  action_step: "Sur ta prochaine story produit, ajoute une phrase claire d'appel à l'action : 'Écris-moi [mot-clé] pour commander'." },

{ numero: 64, categoryCode: 'SOC', title: "Répondre aux commentaires : l'arme sous-utilisée", pitch: "Transformer chaque commentaire en opportunité de vente publique",
  subtitle: "Chaque commentaire ignoré est une vente publique en moins.",
  why_it_matters: "Un commentaire sous un post est visible par tous les autres visiteurs. Y répondre vite et bien rassure non seulement la personne qui a écrit, mais aussi tous ceux qui lisent en silence.",
  key_points: ["Réponds à tous les commentaires, même les simples emojis", "Réponds avec des infos utiles (prix, dispo) plutôt que juste 'merci'", "Utilise le commentaire pour rediriger vers le DM si la conversation devient longue", "Épingle les commentaires positifs en haut pour rassurer les futurs visiteurs"],
  example: "Une vendeuse de vêtements répondait 'merci' à chaque commentaire demandant le prix. En changeant pour 'Merci ! C'est à 8000F, je t'écris en DM pour les détails', elle a vu ses conversions depuis les commentaires augmenter nettement.",
  common_mistake: "Laisser des commentaires avec des questions de prix sans réponse, ou répondre par un simple emoji sans information utile.",
  action_step: "Va sur ton dernier post et réponds à tous les commentaires en attente avec une information concrète, pas juste un remerciement." },

{ numero: 65, categoryCode: 'SOC', title: "Le calendrier de contenu de la semaine (template)", pitch: "Un planning simple : lundi produit, mercredi coulisses, vendredi promo",
  subtitle: "Un planning simple : lundi produit, mercredi coulisses, vendredi promo.",
  why_it_matters: "Sans structure, on publie de façon aléatoire — parfois trop, parfois pas du tout. Un rythme simple et répétable donne à l'audience un rendez-vous régulier et te facilite la création.",
  key_points: ["Lundi : mise en avant d'un produit précis", "Mercredi : coulisses, préparation, humain derrière la marque", "Vendredi : promo, offre ou rappel d'achat avant le week-end", "Samedi/dimanche : contenu léger (témoignage, question, sondage)"],
  example: "Une boutique de bijoux a adopté ce rythme fixe pendant un mois. Ses abonnés ont commencé à anticiper le post du vendredi, jour où elle annonçait ses petites promos, et ses ventes du week-end ont augmenté.",
  common_mistake: "Publier sans aucun rythme fixe, ce qui empêche l'audience de prendre l'habitude de revenir voir le contenu.",
  action_step: "Planifie dès maintenant tes 3 prochains posts en suivant ce rythme : produit, coulisses, promo." },

{ numero: 66, categoryCode: 'SOC', title: "Filmer un avis client (sans que ce soit gênant)", pitch: "Une méthode douce pour demander et filmer un témoignage",
  subtitle: "Une méthode douce pour demander et filmer un témoignage sincère.",
  why_it_matters: "Le témoignage vidéo rassure bien plus qu'un simple texte. Mais demander directement à un client de 'faire une pub' met souvent mal à l'aise les deux parties si c'est mal amené.",
  key_points: ["Demande d'abord un avis simple par message avant de proposer la vidéo", "Propose plutôt de filmer une question-réponse rapide (30 secondes)", "Offre toujours un petit geste en échange (réduction, cadeau)", "Ne force jamais — un client hésitant vaut mieux qu'un témoignage forcé et peu naturel"],
  example: "Une vendeuse de gâteaux a commencé par demander en message 'Tu as aimé ? Je peux te filmer 20 secondes en train de goûter pour mes clients ?' au lieu de demander directement une vidéo pub. Les clientes acceptaient bien plus facilement présentées ainsi.",
  common_mistake: "Demander une vidéo témoignage de façon trop formelle ou insistante, ce qui met le client mal à l'aise et le fait refuser.",
  action_step: "Choisis ta cliente la plus fidèle et envoie-lui un message simple lui demandant si elle accepte 20 secondes de vidéo sur son ressenti, en lui proposant un petit geste en retour." },

{ numero: 67, categoryCode: 'SOC', title: "Que faire quand un post ne marche pas", pitch: "Diagnostiquer : timing, visuel, texte, ou produit ?",
  subtitle: "Timing, visuel, texte ou produit — trouve où ça coince avant de recommencer.",
  why_it_matters: "Un post qui ne marche pas n'est pas une fatalité, c'est une information. Comprendre pourquoi il n'a pas fonctionné évite de refaire la même erreur sur le prochain.",
  key_points: ["Vérifie l'heure de publication — était-ce un bon créneau ?", "Regarde la photo — était-elle claire, bien éclairée, engageante ?", "Relis le texte — était-il clair sur ce qu'il fallait faire ensuite ?", "Demande-toi si le produit lui-même intéresse vraiment ta cible actuelle"],
  example: "Un vendeur d'accessoires a eu un post sans aucun like un vendredi soir. En analysant, il a réalisé que la photo était sombre et floue, prise en vitesse. Le même produit repris en pleine lumière a bien mieux marché la semaine suivante.",
  common_mistake: "Abandonner un produit ou une idée après un seul post raté, sans chercher à comprendre ce qui n'a pas fonctionné.",
  action_step: "Reprends ton dernier post le moins performant et identifie lequel des 4 points (timing, visuel, texte, produit) a le plus posé problème. Corrige-le sur ton prochain post du même produit." },
)

// --- C. WHATSAPP BUSINESS (WA) ---
FICHES.push(
{ numero: 5, categoryCode: 'WA', title: "Le statut WhatsApp qui vend sans vendre", pitch: "La formule 80% valeur / 20% produit pour ne pas fatiguer sa liste",
  subtitle: "80% valeur, 20% produit — sinon ta liste se lasse et te mute.",
  why_it_matters: "Un statut WhatsApp collé de photos produits en boucle fatigue vite les contacts, qui finissent par masquer tes statuts. Varier avec du contenu utile ou humain garde l'attention sur le long terme.",
  key_points: ["Sur 5 statuts, garde 1 seul vraiment centré produit/prix", "Les autres : astuce, coulisses, question, témoignage client", "Poste régulièrement mais pas en excès (3-5 statuts par jour maximum)", "Utilise les statuts pour rediriger vers un message ('Écris-moi pour ce prix')"],
  example: "Un vendeur de gadgets postait 10 statuts produits par jour. Beaucoup de contacts le masquaient. En réduisant à 3-4 statuts variés par jour (dont un seul produit), son taux de vue est remonté.",
  common_mistake: "Poster uniquement des photos produits avec le prix, en boucle, toute la journée.",
  action_step: "Pour ton prochain statut, poste quelque chose qui n'est pas un produit — une astuce, une coulisse, une question — et observe la différence de réactions." },

{ numero: 7, categoryCode: 'WA', title: "Répondre en moins de 15 minutes, même occupé", pitch: "Mettre en place les réponses automatiques et les templates",
  subtitle: "Le client qui attend trop longtemps va voir ailleurs, pas exprès, juste par réflexe.",
  why_it_matters: "Sur WhatsApp, l'attente crée du doute — le client se demande si tu es sérieux ou disponible. Un délai de réponse court est souvent ce qui fait la différence entre deux boutiques équivalentes.",
  key_points: ["Active le message de réponse automatique WhatsApp Business pour accuser réception immédiatement", "Prépare des réponses rapides (templates) pour les questions fréquentes", "Vérifie ton téléphone à intervalles réguliers même en pleine activité", "Si tu ne peux vraiment pas répondre vite, dis-le clairement dans ton message d'absence"],
  example: "Une couturière très occupée en atelier a activé une réponse automatique 'Merci, je réponds sous 15 minutes' avec les templates pré-écrits pour les questions de prix et délais. Ses clientes ne se sentaient plus ignorées, même pendant ses heures de couture intense.",
  common_mistake: "Laisser un message sans réponse pendant des heures sans aucun accusé de réception, même automatique.",
  action_step: "Configure dès maintenant ton message de réponse rapide dans WhatsApp Business avec un délai réaliste annoncé." },

{ numero: 8, categoryCode: 'WA', title: "Les 5 messages WhatsApp qui closent une vente", pitch: "Des formulations testées pour transformer un «je réfléchis» en achat",
  subtitle: "Des formulations testées pour transformer un 'je réfléchis' en achat.",
  why_it_matters: "Beaucoup de ventes se perdent non pas au moment de l'intérêt, mais au moment de conclure. Avoir des formulations prêtes évite l'improvisation qui fait perdre le client au dernier moment.",
  key_points: ["'Il m'en reste seulement [X], tu veux que je te le mette de côté ?' — crée une urgence honnête", "'Tu préfères en [couleur A] ou [couleur B] pour que je prépare ta commande ?' — pousse à choisir plutôt qu'à hésiter", "'Je peux te l'envoyer aujourd'hui si tu confirmes avant [heure]' — donne un cadre clair", "'Voici ce que 3 clientes ont dit après l'avoir reçu' — rassure avec preuve sociale", "'On fait comme ça alors ?' — pose simplement la question de clôture"],
  example: "Une vendeuse de sacs terminait souvent ses échanges par un vague 'dis-moi si ça t'intéresse'. En remplaçant par 'Il m'en reste 2 en beige, je te le mets de côté ?', son taux de conclusion de vente a nettement augmenté.",
  common_mistake: "Laisser la conversation en suspens avec une phrase vague, sans jamais poser une question qui pousse à la décision.",
  action_step: "Choisis une de ces 5 formulations et utilise-la dans ta prochaine conversation WhatsApp où le client semble hésiter." },

{ numero: 68, categoryCode: 'WA', title: "Organiser ses contacts WhatsApp comme un pro", pitch: "Utiliser les étiquettes (labels) pour segmenter clients chauds/froids",
  subtitle: "Les étiquettes, la fonction la plus puissante que personne n'utilise.",
  why_it_matters: "Sans organisation, tous les contacts se mélangent : client chaud, client froid, fournisseur, livreur. Les étiquettes WhatsApp Business permettent de retrouver et cibler rapidement les bonnes personnes.",
  key_points: ["Crée des étiquettes simples : 'Nouveau', 'Client fidèle', 'À relancer', 'Commande en cours'", "Étiquette chaque conversation dès le premier échange", "Utilise le filtre par étiquette avant d'envoyer une promo ciblée", "Nettoie régulièrement les étiquettes obsolètes (commande livrée, etc.)"],
  example: "Une boutique de tissus avait plus de 300 contacts mélangés. En créant les étiquettes 'Client fidèle' et 'À relancer', elle a pu envoyer une promo ciblée uniquement aux clientes inactives depuis 2 mois, avec un bon taux de retour.",
  common_mistake: "Laisser tous les contacts dans une seule liste sans distinction, ce qui rend impossible tout ciblage.",
  action_step: "Ouvre WhatsApp Business maintenant et crée au minimum 3 étiquettes : Nouveau, Client fidèle, À relancer. Étiquette tes 10 dernières conversations." },

{ numero: 69, categoryCode: 'WA', title: "Le catalogue WhatsApp Business, enfin bien rempli", pitch: "Structurer son catalogue pour qu'il remplace un vrai site",
  subtitle: "Un bon catalogue remplace un site web que tu n'as pas à payer.",
  why_it_matters: "Beaucoup de commerçants ont un catalogue WhatsApp vide ou mal rempli, alors que c'est l'outil qui permet à un client de voir tout ton stock sans avoir à tout demander en message.",
  key_points: ["Ajoute une photo claire et un titre précis pour chaque article", "Mets le prix directement dans la description pour éviter les allers-retours", "Organise en catégories si tu as plusieurs types de produits", "Mets à jour le catalogue dès qu'un article est épuisé"],
  example: "Un vendeur d'accessoires téléphone avait un catalogue avec seulement 3 produits sur les 40 qu'il vendait. En le complétant entièrement avec prix visibles, ses clients ont commencé à commander directement sans poser 10 questions avant.",
  common_mistake: "Laisser le catalogue vide ou incomplet et tout gérer uniquement via messages individuels, ce qui prend un temps fou.",
  action_step: "Ajoute aujourd'hui 5 produits manquants à ton catalogue WhatsApp, avec photo claire et prix visible." },

{ numero: 70, categoryCode: 'WA', title: "Les messages d'absence qui ne perdent pas la vente", pitch: "Rédiger un message d'absence qui rassure au lieu de décourager",
  subtitle: "Un bon message d'absence rassure au lieu de décourager.",
  why_it_matters: "Un message d'absence trop froid ou vague ('indisponible') peut faire fuir un client pressé. Bien rédigé, il garde le client en confiance jusqu'à ton retour.",
  key_points: ["Indique un délai précis de retour, pas juste 'je reviens bientôt'", "Propose une alternative si urgent (numéro d'un(e) collègue, catalogue à consulter)", "Garde un ton chaleureux, pas robotique", "Remercie pour la patience et confirme que le message est bien reçu"],
  example: "Une styliste en plein rush de commandes avait juste 'Absente' en message automatique. En changeant pour 'Je prépare des commandes, je te réponds avant 18h — merci pour ta patience, ton message est bien reçu', ses clientes attendaient sans relancer nerveusement.",
  common_mistake: "Mettre un message d'absence trop court ou froid qui ne rassure pas sur le fait que le message a bien été reçu.",
  action_step: "Réécris ton message d'absence actuel en ajoutant un délai précis et un ton chaleureux, puis active-le." },

{ numero: 71, categoryCode: 'WA', title: "Relancer un client qui ne répond plus", pitch: "Un message de relance qui ne sonne pas désespéré",
  subtitle: "Un message de relance qui ne sonne pas désespéré.",
  why_it_matters: "Beaucoup de commerçants n'osent pas relancer par peur de paraître insistants, et perdent ainsi des ventes qui ne demandaient qu'un petit rappel au bon moment.",
  key_points: ["Attends 24-48h avant de relancer, pas immédiatement", "Apporte une nouvelle information plutôt que juste 'tu as vu mon message ?'", "Propose une aide plutôt qu'une pression ('Tu as des questions sur la taille ?')", "Accepte le silence après 2 relances maximum, sans insister davantage"],
  example: "Une vendeuse de vêtements relançait avec 'Alors ?' ce qui ne recevait presque jamais de réponse. En passant à 'Il me reste ta taille en stock, dis-moi si tu veux que je te la garde', elle a récupéré plusieurs ventes qui semblaient perdues.",
  common_mistake: "Relancer immédiatement ou de façon insistante avec des messages répétés qui mettent la pression au lieu de rassurer.",
  action_step: "Repère une conversation en attente depuis 2 jours et envoie une relance qui apporte une info utile, pas juste une question de suivi." },

{ numero: 72, categoryCode: 'WA', title: "Créer une liste de diffusion qui ne devient pas du spam", pitch: "La bonne fréquence et le bon contenu pour ne pas se faire bloquer",
  subtitle: "La bonne fréquence et le bon contenu pour ne pas se faire bloquer.",
  why_it_matters: "Une liste de diffusion mal utilisée pousse les clients à bloquer le numéro. Bien dosée, elle reste un outil puissant pour informer sans fatiguer.",
  key_points: ["Limite les envois à 1-2 messages par semaine maximum", "Alterne info utile et offre, jamais que de la promo", "Segmente tes listes par intérêt si possible (pas tout le monde reçoit tout)", "Laisse toujours une option simple pour se désinscrire sans mauvaise humeur"],
  example: "Un vendeur de parfums envoyait des promos quasi tous les jours à sa liste de diffusion, ce qui a fait fuir la moitié de ses contacts en un mois. En repassant à 1 message par semaine avec du contenu varié, son taux de blocage a chuté.",
  common_mistake: "Envoyer des messages promotionnels tous les jours à toute sa liste, ce qui pousse les clients à bloquer le numéro.",
  action_step: "Vérifie la fréquence de tes envois du mois dernier. Si c'est plus de 2 par semaine, réduis dès ta prochaine diffusion." },

{ numero: 73, categoryCode: 'WA', title: "Automatiser ses réponses fréquentes (FAQ WhatsApp)", pitch: "Préparer 10 réponses copier-coller pour gagner un temps fou",
  subtitle: "10 réponses copier-coller qui font gagner un temps fou.",
  why_it_matters: "Les mêmes questions reviennent sans cesse (prix, délai, mode de paiement). Préparer des réponses toutes prêtes évite de perdre du temps à retaper la même chose chaque jour.",
  key_points: ["Liste les 10 questions les plus fréquentes reçues ce mois-ci", "Rédige une réponse claire et chaleureuse pour chacune", "Utilise les 'réponses rapides' de WhatsApp Business avec un raccourci (/prix, /livraison)", "Mets à jour ces réponses dès que tes conditions changent"],
  example: "Une vendeuse de bijoux répondait à la question des délais de livraison au moins 15 fois par jour, en retapant à chaque fois. En créant la réponse rapide '/livraison', elle répond en 2 secondes au lieu de 2 minutes.",
  common_mistake: "Retaper manuellement les mêmes réponses à chaque nouveau client, ce qui fait perdre un temps précieux chaque jour.",
  action_step: "Crée dès maintenant 3 réponses rapides dans WhatsApp Business pour tes questions les plus fréquentes (prix, livraison, paiement)." },

{ numero: 74, categoryCode: 'WA', title: "Vendre par audio WhatsApp : oui ou non ?", pitch: "Quand la voix convertit mieux que le texte, et comment bien la faire",
  subtitle: "Quand la voix convertit mieux que le texte, et comment bien la faire.",
  why_it_matters: "L'audio WhatsApp peut créer une proximité que le texte n'a pas, mais mal utilisé (trop long, mauvaise qualité), il agace plus qu'il ne convainc.",
  key_points: ["Utilise l'audio pour des explications qui prennent du temps à écrire (utilisation d'un produit complexe)", "Garde les audios courts, 30 secondes maximum", "Enregistre dans un endroit calme, sans bruit de fond", "Ne remplace jamais toutes tes réponses par de l'audio — beaucoup préfèrent lire vite"],
  example: "Une vendeuse de cosmétiques envoyait un audio de 20 secondes expliquant comment utiliser un nouveau produit, plutôt qu'un long texte. Ses clientes appréciaient ce format plus personnel pour ce cas précis, mais elle gardait le texte pour les questions de prix rapides.",
  common_mistake: "Envoyer systématiquement de longs audios de plusieurs minutes, que peu de clients prennent le temps d'écouter en entier.",
  action_step: "La prochaine fois qu'une question demande une explication un peu longue, essaie d'y répondre par un audio de 30 secondes maximum et observe la réaction." },
)

// --- D. VENTE (VTE) ---
FICHES.push(
{ numero: 9, categoryCode: 'VTE', title: "Gérer un client qui négocie sans perdre la vente ni la marge", pitch: "3 techniques pour répondre à «c'est trop cher»",
  subtitle: "3 techniques pour répondre à 'c'est trop cher' sans se braquer ni se brader.",
  why_it_matters: "La négociation fait partie de la culture d'achat locale. Mal gérée, elle fait perdre soit la vente (en restant trop rigide), soit la marge (en cédant trop vite).",
  key_points: ["Justifie le prix par la qualité/le service avant de parler de réduction", "Propose un petit geste (livraison offerte) plutôt qu'une baisse de prix directe", "Fixe une limite basse pour toi-même avant même que la discussion commence", "Reste ferme avec le sourire — dire non poliment ne fait pas fuir un client sérieux"],
  example: "Une vendeuse de bijoux offrait systématiquement -20% dès qu'on négociait, ce qui grignotait sa marge à chaque vente. En passant à 'Je ne peux pas baisser le prix, mais je t'offre la livraison', elle garde sa marge tout en satisfaisant le client.",
  common_mistake: "Céder immédiatement à la première demande de réduction, ce qui habitue tous les clients à négocier systématiquement.",
  action_step: "Prépare dès maintenant ta phrase-type pour la prochaine négociation : un geste (livraison, petit cadeau) que tu peux offrir à la place d'une baisse de prix." },

{ numero: 75, categoryCode: 'VTE', title: "Vendre sans être insistant", pitch: "La différence entre relancer et harceler, avec des exemples de messages",
  subtitle: "La différence entre relancer et harceler, en exemples concrets.",
  why_it_matters: "Trop insister fait fuir un client hésitant, mais ne jamais relancer fait perdre des ventes qui ne demandaient qu'un petit coup de pouce. La limite est dans la fréquence et le ton.",
  key_points: ["Une relance = une information nouvelle, pas une simple répétition", "Espace tes messages d'au moins 24h entre chaque relance", "Arrête-toi après 2 relances sans réponse", "Privilégie une question ouverte plutôt qu'une pression directe à l'achat"],
  example: "Un vendeur de chaussures envoyait 3 messages par jour à un client hésitant, qui a fini par bloquer le numéro. En espaçant à un message tous les 2 jours avec une info différente à chaque fois, les taux de réponse restent bien meilleurs sur les autres clients.",
  common_mistake: "Envoyer plusieurs messages le même jour à un client qui n'a pas répondu, ce qui est perçu comme du harcèlement.",
  action_step: "Vérifie tes conversations en cours — si tu as envoyé plus d'un message aujourd'hui sans réponse, arrête-toi et attends demain." },

{ numero: 76, categoryCode: 'VTE', title: "La technique du «et avec ça ?»", pitch: "La vente additionnelle simple qui augmente le panier moyen",
  subtitle: "La vente additionnelle simple qui augmente le panier moyen.",
  why_it_matters: "Beaucoup de ventes s'arrêtent à un seul article alors qu'un produit complémentaire proposé au bon moment peut facilement être ajouté sans effort supplémentaire de ta part.",
  key_points: ["Prépare à l'avance les associations logiques (robe + foulard, téléphone + coque)", "Propose l'ajout juste après la confirmation du premier article, pas avant", "Formule-le comme un conseil, pas comme une pression ('beaucoup l'associent avec...')", "Garde le complément à un prix raisonnable pour ne pas freiner la décision"],
  example: "Une boutique de vêtements proposait systématiquement une ceinture ou un foulard assorti juste après confirmation d'une robe : 'Beaucoup la portent avec cette ceinture, tu veux voir ?'. Le panier moyen a augmenté sans effort supplémentaire de prospection.",
  common_mistake: "Ne jamais proposer de produit complémentaire, en pensant que le client demandera lui-même s'il en veut.",
  action_step: "Identifie 2 produits complémentaires que tu peux proposer systématiquement après chaque vente de ton article principal." },

{ numero: 77, categoryCode: 'VTE', title: "Créer l'urgence sans mentir", pitch: "Utiliser la rareté et le temps limité de façon honnête et efficace",
  subtitle: "Utiliser la rareté et le temps limité de façon honnête et efficace.",
  why_it_matters: "L'urgence pousse à la décision, mais une fausse urgence répétée ('dernières pièces' à chaque post) finit par ne plus être crue, et casse la confiance sur le long terme.",
  key_points: ["N'annonce une rareté que si elle est réelle (stock vraiment limité)", "Utilise des délais clairs et vérifiables (offre valable jusqu'à vendredi)", "Varie les types d'urgence : stock, temps, bonus limité", "Ne répète jamais la même urgence sur le même produit indéfiniment"],
  example: "Un vendeur de gadgets annonçait 'dernières pièces' sur presque tous ses posts, même quand ce n'était pas vrai. Ses clients ont fini par ne plus y croire. En réservant cette mention aux vrais cas de stock limité, l'urgence a retrouvé son efficacité.",
  common_mistake: "Annoncer une fausse urgence en permanence, ce qui finit par ne plus convaincre personne.",
  action_step: "Vérifie ton stock actuel — si un article est vraiment limité, annonce-le clairement avec le nombre restant réel." },

{ numero: 78, categoryCode: 'VTE', title: "Le client qui dit «je réfléchis» : que répondre", pitch: "Une méthode pour comprendre le vrai frein derrière cette phrase",
  subtitle: "Une méthode pour comprendre le vrai frein derrière cette phrase.",
  why_it_matters: "'Je réfléchis' cache souvent un vrai frein (prix, doute sur la qualité, comparaison ailleurs) que le client n'ose pas exprimer directement. Comprendre ce frein permet d'y répondre précisément.",
  key_points: ["Demande gentiment : 'Bien sûr, c'est sur le prix, la couleur, ou autre chose que tu hésites ?'", "Ne relance pas avec pression, mais avec une question ouverte", "Propose une info supplémentaire selon la réponse obtenue", "Laisse la porte ouverte sans forcer une réponse immédiate"],
  example: "Une vendeuse de sacs recevait souvent 'je réfléchis' sans jamais creuser plus loin. En posant simplement 'C'est le prix, la couleur, ou tu compares avec un autre modèle ?', elle a découvert que beaucoup hésitaient sur la taille, pas le prix — un frein facile à résoudre avec plus d'infos.",
  common_mistake: "Accepter le 'je réfléchis' sans jamais chercher à comprendre le vrai frein derrière cette phrase.",
  action_step: "La prochaine fois qu'un client dit 'je réfléchis', réponds par une question ouverte pour identifier le vrai frein plutôt que de laisser la conversation s'arrêter là." },

{ numero: 79, categoryCode: 'VTE', title: "Vendre à un client qu'on ne voit jamais en vrai", pitch: "Construire la confiance à distance, sans boutique physique",
  subtitle: "Construire la confiance à distance, sans boutique physique.",
  why_it_matters: "Sans magasin physique, toute la confiance repose sur ce que tu montres en ligne : photos, réponses, avis. Un client qui ne t'a jamais vue a besoin de plus de preuves pour se sentir en sécurité.",
  key_points: ["Montre régulièrement ton visage ou ta voix dans du contenu (pas juste des produits)", "Partage des avis clients avec preuve (capture d'écran, vidéo)", "Sois transparent sur les délais et le processus de commande", "Propose un paiement sécurisé (paiement à la livraison si possible) pour rassurer les nouveaux clients"],
  example: "Une vendeuse en ligne pure, sans boutique physique, a commencé à apparaître dans ses stories pour préparer les commandes. Cette visibilité humaine a réduit les hésitations des nouveaux clients qui ne la connaissaient pas encore.",
  common_mistake: "Rester complètement invisible (jamais de visage, jamais de voix), ce qui laisse planer un doute sur le sérieux de la boutique.",
  action_step: "Ajoute un élément humain à ton prochain contenu — ta voix, ton visage, ou une story où l'on te voit préparer une commande." },

{ numero: 80, categoryCode: 'VTE', title: "Le pouvoir du témoignage au bon moment", pitch: "Insérer un avis client pile au moment du doute de l'acheteur",
  subtitle: "Insérer un avis client pile au moment du doute de l'acheteur.",
  why_it_matters: "Un témoignage n'a pas le même impact selon quand il est montré. Utilisé juste avant la décision d'achat, il peut faire basculer un client hésitant.",
  key_points: ["Garde une banque de 5-10 témoignages prêts à envoyer en message privé", "Envoie un témoignage pertinent juste après une objection ('je ne suis pas sûre de la qualité')", "Choisis un témoignage qui correspond au profil du client hésitant", "Mets aussi en avant les témoignages en story de façon régulière"],
  example: "Une vendeuse de cosmétiques gardait des captures d'écran d'avis clients classées par type de produit. Quand une cliente doutait de l'efficacité d'une crème, elle envoyait directement l'avis d'une autre cliente ayant eu le même doute au départ.",
  common_mistake: "Avoir des témoignages mais ne jamais les utiliser au bon moment dans une conversation de vente.",
  action_step: "Rassemble dès aujourd'hui 3 captures d'écran de tes meilleurs avis clients, classées par type de produit, prêtes à être envoyées." },

{ numero: 81, categoryCode: 'VTE', title: "Transformer un curieux en acheteur", pitch: "Le parcours en 3 étapes du simple «like» jusqu'à la commande",
  subtitle: "Le parcours en 3 étapes du simple 'like' jusqu'à la commande.",
  why_it_matters: "Un like ou un commentaire n'est qu'une première étape. Beaucoup de commerçants attendent passivement que le curieux devienne acheteur tout seul, alors qu'un parcours clair peut l'y amener.",
  key_points: ["Étape 1 : capter l'attention avec un contenu clair et engageant", "Étape 2 : répondre vite et donner confiance dès le premier échange", "Étape 3 : proposer une action simple et précise pour conclure (choix, confirmation, paiement)", "Ne saute jamais une étape — un curieux qu'on pousse trop vite à acheter se braque"],
  example: "Un vendeur d'accessoires recevait beaucoup de likes mais peu de commandes. En structurant systématiquement la conversation en ces 3 étapes après chaque commentaire, son taux de transformation en commandes a nettement augmenté.",
  common_mistake: "Répondre à un commentaire par juste le prix, en sautant l'étape de mise en confiance qui précède la décision d'achat.",
  action_step: "La prochaine fois qu'un curieux commente, prends le temps de le rassurer avant de conclure, plutôt que de sauter directement au prix." },

{ numero: 82, categoryCode: 'VTE', title: "Vendre pendant les périodes creuses", pitch: "4 idées pour maintenir des ventes hors saison forte",
  subtitle: "4 idées pour maintenir des ventes hors saison forte.",
  why_it_matters: "Toutes les boutiques connaissent des mois plus calmes. Attendre passivement que ça reparte fait perdre du chiffre d'affaires qui pourrait être maintenu avec les bonnes actions.",
  key_points: ["Propose une offre de 'saison creuse' différente de tes promos habituelles", "Mets en avant des produits moins saisonniers pendant cette période", "Utilise ce moment pour fidéliser (contenu de valeur, relation client) plutôt que juste vendre", "Prépare déjà la prochaine saison forte pour être prête dès qu'elle arrive"],
  example: "Une boutique de tissus, très active pendant Tabaski, avait des mois très calmes après l'événement. Elle a lancé une gamme d'accessoires simples et abordables pour maintenir un flux de ventes en dehors de la saison forte.",
  common_mistake: "Rester complètement passif pendant les périodes creuses, en attendant simplement que la prochaine saison forte relance les ventes.",
  action_step: "Identifie ton produit le moins saisonnier et prépare une petite mise en avant pour la période calme actuelle." },

{ numero: 83, categoryCode: 'VTE', title: "Le suivi de commande qui rassure et fait vendre encore", pitch: "Utiliser la confirmation de commande comme moment de vente additionnelle",
  subtitle: "Utiliser la confirmation de commande comme moment de vente additionnelle.",
  why_it_matters: "Le moment où un client vient de commander est un moment de confiance élevée — c'est aussi une occasion de rassurer sur la suite et, parfois, de proposer un complément.",
  key_points: ["Confirme immédiatement la commande avec un récapitulatif clair", "Donne un délai précis de livraison ou de préparation", "Profite de ce moment pour proposer un complément à prix doux (pas systématique)", "Envoie une notification quand la commande est prête ou expédiée"],
  example: "Une vendeuse de gâteaux confirmait ses commandes par un simple 'ok reçu'. En passant à un message structuré avec récap, délai précis, et une proposition de topping additionnel à prix doux, elle a augmenté son panier moyen tout en rassurant mieux ses clientes.",
  common_mistake: "Confirmer une commande de façon vague sans donner de délai précis, ce qui laisse le client dans l'incertitude jusqu'à la livraison.",
  action_step: "Rédige dès maintenant un modèle de message de confirmation de commande avec récap et délai précis, à réutiliser pour toutes tes prochaines ventes." },
)

// --- E. SERVICE CLIENT (SC) ---
FICHES.push(
{ numero: 84, categoryCode: 'SC', title: "Gérer un client mécontent sans perdre son calme (ni le client)", pitch: "La méthode en 4 étapes pour désamorcer une réclamation",
  subtitle: "La méthode en 4 étapes pour désamorcer une réclamation.",
  why_it_matters: "Un client mécontent bien géré peut devenir plus fidèle qu'avant le problème. Mal géré, il peut nuire à ta réputation publiquement.",
  key_points: ["Écoute d'abord sans te justifier immédiatement", "Reconnais le problème même si tu penses ne pas être en tort", "Propose une solution concrète (remboursement, échange, geste commercial)", "Fais un suivi après la résolution pour t'assurer que le client est satisfait"],
  example: "Une boutique de vêtements a reçu une réclamation sur une taille erronée. Plutôt que de se justifier, la vendeuse a écouté, proposé un échange gratuit avec livraison offerte, et suivi avec un message après réception. La cliente est restée fidèle et a même recommandé la boutique.",
  common_mistake: "Se justifier immédiatement ou minimiser le problème avant même d'avoir écouté complètement le client.",
  action_step: "La prochaine réclamation que tu reçois, commence ta réponse uniquement par de l'écoute, sans justification, avant de proposer une solution." },

{ numero: 85, categoryCode: 'SC', title: "Le remboursement : quand dire oui, quand dire non", pitch: "Poser une politique claire une fois pour toutes",
  subtitle: "Poser une politique claire une fois pour toutes.",
  why_it_matters: "Sans règle claire, chaque demande de remboursement devient une négociation stressante au cas par cas, et les décisions incohérentes créent de la frustration chez les clients.",
  key_points: ["Définis à l'avance les cas où tu rembourses automatiquement (produit défectueux, erreur de ta part)", "Définis les cas où tu ne rembourses pas (changement d'avis simple, mauvaise utilisation)", "Écris cette politique clairement et partage-la si besoin", "Reste flexible pour les cas exceptionnels, mais garde une base cohérente"],
  example: "Une boutique de cosmétiques remboursait au cas par cas selon son humeur du jour, ce qui créait des incohérences visibles entre clientes. En fixant une règle claire (remboursement uniquement si produit scellé non ouvert), les décisions sont devenues plus simples et plus justes.",
  common_mistake: "Décider au cas par cas sans règle fixe, ce qui crée un sentiment d'injustice entre différents clients.",
  action_step: "Écris aujourd'hui en 3 lignes ta politique de remboursement claire, que tu pourras réutiliser à chaque demande." },

{ numero: 86, categoryCode: 'SC', title: "Répondre à un avis négatif en public", pitch: "Ce qu'il faut écrire (et ne jamais écrire) sous un commentaire négatif",
  subtitle: "Ce qu'il faut écrire (et ne jamais écrire) sous un commentaire négatif.",
  why_it_matters: "Un avis négatif public est vu par tous les autres visiteurs. Une réponse calme et professionnelle rassure ces observateurs, même si le client mécontent lui-même ne change pas d'avis.",
  key_points: ["Réponds toujours, ne jamais ignorer un avis négatif public", "Reste factuel et poli, sans jamais argumenter publiquement", "Propose de continuer la discussion en message privé", "Ne supprime jamais un avis négatif légitime — ça se remarque et nuit à la confiance"],
  example: "Une boutique de bijoux a reçu un commentaire négatif sur un délai de livraison. Elle a répondu publiquement 'Nous sommes désolés pour ce délai, on vous contacte en DM pour trouver une solution', ce qui a montré aux autres visiteurs son professionnalisme.",
  common_mistake: "Répondre avec colère ou justification excessive en public, ce qui donne une mauvaise image à tous ceux qui lisent l'échange.",
  action_step: "Prépare dès maintenant une phrase-type calme à utiliser pour tout futur avis négatif public, redirigeant vers le message privé." },

{ numero: 87, categoryCode: 'SC', title: "Le client qui pose 20 questions avant d'acheter", pitch: "Techniques pour rester patient et closer quand même",
  subtitle: "Techniques pour rester patient et closer quand même.",
  why_it_matters: "Certains clients ont besoin de beaucoup de réassurance avant de se décider. Perdre patience avec eux fait perdre une vente qui était pourtant proche d'aboutir.",
  key_points: ["Réponds à chaque question complètement, sans donner l'impression d'être pressé", "Regroupe les réponses dans un message clair plutôt que plusieurs messages fragmentés", "Après plusieurs questions, propose gentiment de passer à la décision ('Tu as toutes les infos, on valide ?')", "Considère ce client comme potentiellement très fidèle une fois convaincu — il a fait ses recherches sérieusement"],
  example: "Un vendeur de gadgets recevait souvent des clients avec de nombreuses questions techniques. Plutôt que de s'agacer, il préparait des réponses complètes et groupées, ce qui rassurait le client et menait souvent à une vente suivie de recommandations à d'autres clients tout aussi exigeants.",
  common_mistake: "Montrer de l'impatience ou répondre de façon expéditive à un client qui pose beaucoup de questions, ce qui le fait fuir juste avant la décision.",
  action_step: "La prochaine fois qu'un client pose plusieurs questions d'affilée, réponds à toutes en un seul message clair et complet, puis propose gentiment de conclure." },

{ numero: 88, categoryCode: 'SC', title: "Gérer les commandes en retard sans perdre la confiance", pitch: "Communiquer un retard de façon à garder le client",
  subtitle: "Communiquer un retard de façon à garder le client.",
  why_it_matters: "Un retard n'est pas le problème principal pour la plupart des clients — c'est le silence autour du retard qui crée la frustration et la perte de confiance.",
  key_points: ["Préviens le client dès que tu sais qu'il y aura du retard, avant qu'il ne demande", "Explique brièvement la raison sans excuse excessive", "Donne un nouveau délai réaliste, pas optimiste juste pour rassurer sur le moment", "Propose un petit geste si le retard est significatif (livraison offerte, petit cadeau)"],
  example: "Une boutique de tissus attendait un réapprovisionnement en retard chez son fournisseur. Plutôt que d'attendre que les clientes s'inquiètent, elle a envoyé un message groupé expliquant le retard et proposant une réduction pour patienter. Aucune annulation n'a suivi.",
  common_mistake: "Attendre que le client demande des nouvelles avant de communiquer sur un retard, ce qui donne l'impression d'un manque de sérieux.",
  action_step: "Si tu as une commande actuellement en retard, envoie dès maintenant un message proactif au client concerné avec un nouveau délai clair." },

{ numero: 89, categoryCode: 'SC', title: "Le ton de voix de ta boutique", pitch: "Définir une fois pour toutes comment «parler» à tes clients par écrit",
  subtitle: "Définir une fois pour toutes comment 'parler' à tes clients par écrit.",
  why_it_matters: "Un ton incohérent (parfois très formel, parfois familier) donne une image confuse de ta marque. Fixer un ton clair renforce la reconnaissance et la confiance.",
  key_points: ["Choisis 3 mots qui décrivent ton ton idéal (ex : chaleureux, direct, rassurant)", "Vérifie que tes messages, légendes et réponses respectent ce ton", "Adapte légèrement selon le client, mais garde toujours la même base", "Relis tes derniers messages pour repérer les incohérences de ton"],
  example: "Une boutique de mode passait d'un ton très familier en story à un ton très formel en message privé, ce qui créait une impression étrange chez les clientes. En fixant 'chaleureux mais professionnel' comme ton de référence partout, la marque est devenue plus reconnaissable.",
  common_mistake: "Changer de ton selon l'humeur du moment, ce qui rend la marque moins reconnaissable et moins fiable aux yeux des clients.",
  action_step: "Choisis 3 mots qui définissent le ton que tu veux pour ta boutique et note-les quelque part visible — relis-les avant de rédiger ton prochain message important." },

{ numero: 90, categoryCode: 'SC', title: "Dire non à un client sans le perdre", pitch: "Refuser une demande (remise, exception) avec tact",
  subtitle: "Refuser une demande (remise, exception) avec tact.",
  why_it_matters: "Dire oui à tout finit par nuire à ton activité (marge, organisation). Savoir dire non avec tact permet de protéger ton activité sans perdre la relation.",
  key_points: ["Explique brièvement la raison du refus, sans trop te justifier", "Propose une alternative si possible, même modeste", "Reste ferme mais chaleureux dans le ton", "Ne culpabilise jamais le client d'avoir demandé"],
  example: "Une vendeuse de robes sur-mesure recevait souvent des demandes de délai impossible à tenir. Plutôt que d'accepter et de décevoir ensuite, elle répondait 'Je ne peux pas tenir ce délai pour garder la qualité, mais je peux te proposer [alternative]'. Les clientes appréciaient l'honnêteté.",
  common_mistake: "Accepter une demande impossible à tenir juste pour ne pas décevoir sur le moment, et décevoir bien plus fortement plus tard.",
  action_step: "La prochaine fois qu'une demande te semble impossible à honorer, prépare une réponse honnête avec une alternative plutôt que d'accepter par peur de dire non." },

{ numero: 91, categoryCode: 'SC', title: "Le client difficile n'est pas toujours un mauvais client", pitch: "Repérer les signaux d'un client à fidéliser malgré les frictions",
  subtitle: "Repérer les signaux d'un client à fidéliser malgré les frictions.",
  why_it_matters: "Certains clients exigeants ou méfiants au départ deviennent, une fois convaincus, parmi les plus fidèles — car ils ont vérifié sérieusement avant de faire confiance.",
  key_points: ["Distingue un client exigeant (qui pose des questions légitimes) d'un client vraiment toxique (irrespectueux, mauvaise foi)", "Pour un client exigeant, prends le temps de bien répondre plutôt que de t'agacer", "Une fois convaincu, ce type de client recommande souvent activement, car il a 'testé' sérieusement", "Pour un client réellement toxique, il est acceptable de ne pas poursuivre la relation"],
  example: "Une vendeuse de mèches trouvait une cliente 'trop exigeante' avec ses nombreuses questions sur la qualité. Une fois la vente conclue et la cliente satisfaite, celle-ci est devenue l'une des clientes qui recommandait le plus la boutique à son entourage.",
  common_mistake: "Traiter un client simplement exigeant de la même façon qu'un client réellement irrespectueux, et perdre patience trop vite.",
  action_step: "La prochaine fois qu'un client te semble difficile, demande-toi s'il pose des questions légitimes (à prendre au sérieux) ou s'il est réellement irrespectueux (à gérer différemment)." },
)

// --- F. PRODUCTIVITÉ (PRO) ---
FICHES.push(
{ numero: 11, categoryCode: 'PRO', title: "Organiser ses commandes sans se perdre", pitch: "Un système simple (carnet ou tableau) pour ne plus rien oublier",
  subtitle: "Un système simple pour ne plus rien oublier.",
  why_it_matters: "Sans système, les commandes se mélangent dans la tête ou dans des messages dispersés, ce qui crée des erreurs (mauvaise taille envoyée, commande oubliée) qui coûtent cher en confiance.",
  key_points: ["Utilise un cahier ou un tableau simple (Excel, Google Sheets, ou papier)", "Note pour chaque commande : nom, produit, prix, statut (en attente/payée/livrée)", "Mets à jour le statut immédiatement après chaque étape", "Fais un point rapide chaque soir sur les commandes en cours"],
  example: "Une vendeuse de vêtements gérait toutes ses commandes de mémoire et via ses messages WhatsApp éparpillés. Elle a commencé un simple tableau papier avec 4 colonnes (nom, produit, statut, date), ce qui a éliminé ses erreurs de commandes oubliées.",
  common_mistake: "Garder toutes les commandes uniquement en tête ou dispersées dans les messages, sans aucun système centralisé.",
  action_step: "Crée dès maintenant un tableau simple (papier ou téléphone) avec 4 colonnes : nom, produit, statut, date. Note-y tes 3 commandes en cours." },

{ numero: 92, categoryCode: 'PRO', title: "La routine du matin du commerçant qui gère tout seul", pitch: "30 minutes qui structurent toute la journée",
  subtitle: "30 minutes qui structurent toute la journée.",
  why_it_matters: "Sans routine, la journée démarre en réaction aux urgences plutôt qu'en contrôle de ses priorités. Une routine matinale courte évite de courir toute la journée sans avancer sur l'essentiel.",
  key_points: ["Vérifie d'abord les messages urgents de la veille au soir", "Note les 3 priorités du jour avant de te lancer dans le reste", "Prépare le contenu ou le stock nécessaire pour la journée", "Réserve 5 minutes pour vérifier ton calendrier de contenu"],
  example: "Une vendeuse de bijoux commençait sa journée en répondant au hasard à tout ce qui arrivait, sans priorité. En instaurant 30 minutes fixes chaque matin pour noter ses 3 priorités, ses journées sont devenues plus productives et moins stressantes.",
  common_mistake: "Commencer la journée en réagissant uniquement aux messages qui arrivent, sans avoir défini ses priorités à l'avance.",
  action_step: "Demain matin, avant d'ouvrir WhatsApp, prends 5 minutes pour noter tes 3 priorités du jour." },

{ numero: 93, categoryCode: 'PRO', title: "Dire non pour dire oui à l'essentiel", pitch: "Prioriser les 3 tâches qui font vraiment vendre, chaque jour",
  subtitle: "Prioriser les 3 tâches qui font vraiment vendre, chaque jour.",
  why_it_matters: "Le commerçant solo a mille tâches possibles chaque jour, mais seules quelques-unes font vraiment avancer les ventes. Tout faire en même temps dilue l'énergie sur ce qui compte le moins.",
  key_points: ["Identifie chaque jour les 3 tâches qui ont un vrai impact sur les ventes", "Repousse ou délègue les tâches secondaires (rangement, tri, tâches administratives non urgentes)", "Refuse les distractions non essentielles pendant les heures les plus productives", "Termine chaque journée en vérifiant si les 3 priorités ont été faites"],
  example: "Un vendeur de gadgets passait ses matinées à trier son stock au lieu de répondre aux clients et publier du contenu. En se fixant 3 priorités claires chaque matin (répondre aux messages, poster, préparer les commandes), ses ventes ont progressé sans travailler plus d'heures.",
  common_mistake: "Passer du temps sur des tâches secondaires (rangement, tri) au détriment des tâches qui génèrent réellement des ventes.",
  action_step: "Note dès maintenant tes 3 priorités pour demain, celles qui ont un impact direct sur tes ventes — pas les tâches de rangement ou d'organisation secondaire." },

{ numero: 94, categoryCode: 'PRO', title: "Le lot du dimanche soir : préparer sa semaine en 1h", pitch: "Planifier contenu, stock et commandes en une seule session",
  subtitle: "Planifier contenu, stock et commandes en une seule session.",
  why_it_matters: "Préparer sa semaine en une session dédiée évite de tout gérer dans l'urgence jour après jour, et libère l'esprit pour se concentrer sur la vente plutôt que sur l'organisation.",
  key_points: ["Planifie les posts de la semaine (voir fiche calendrier de contenu)", "Vérifie ton stock et anticipe les ruptures possibles", "Prépare les commandes en attente pour la semaine à venir", "Note les échéances importantes (livraisons, rendez-vous fournisseurs)"],
  example: "Une boutique de sacs consacrait chaque dimanche soir 1h à préparer sa semaine : contenu, stock, commandes. Cette habitude a éliminé le stress du 'je ne sais pas quoi poster' qui la rattrapait auparavant chaque lundi matin.",
  common_mistake: "Improviser chaque jour sans aucune préparation globale, ce qui multiplie le stress et les oublis au fil de la semaine.",
  action_step: "Ce dimanche, bloque 1h pour préparer ta semaine : contenu, stock, commandes en attente." },

{ numero: 95, categoryCode: 'PRO', title: "Déléguer sans perdre le contrôle (même seul)", pitch: "Ce qu'on peut déjà externaliser ou automatiser à petit budget",
  subtitle: "Ce qu'on peut déjà externaliser ou automatiser à petit budget.",
  why_it_matters: "Même en solo, certaines tâches peuvent être déléguées ou automatisées à faible coût, libérant du temps pour ce qui fait vraiment vendre — le contact client et le contenu.",
  key_points: ["Identifie les tâches répétitives et sans valeur ajoutée directe (emballage, livraison)", "Cherche des solutions locales à petit prix (livreur ponctuel, aide familiale pour l'emballage)", "Automatise ce qui peut l'être (réponses rapides WhatsApp, planification de posts)", "Garde le contrôle sur ce qui compte vraiment : relation client et décisions stratégiques"],
  example: "Un vendeur de vêtements passait 2h par jour à faire ses livraisons lui-même. En passant à un livreur moto ponctuel pour les commandes hors de son quartier, il a pu consacrer ce temps à répondre aux clients et développer ses ventes.",
  common_mistake: "Vouloir tout faire soi-même par souci de contrôle, jusqu'à l'épuisement, alors que certaines tâches peuvent être déléguées à faible coût.",
  action_step: "Identifie une tâche répétitive que tu pourrais déléguer ou automatiser cette semaine, même à petit budget." },

{ numero: 96, categoryCode: 'PRO', title: "Le burn-out du commerçant solo : les signaux à ne pas ignorer", pitch: "Reconnaître la fatigue avant qu'elle n'affecte les ventes",
  subtitle: "Reconnaître la fatigue avant qu'elle n'affecte les ventes.",
  why_it_matters: "Gérer seul une boutique est épuisant, et l'épuisement fini par affecter la qualité des réponses, des photos, et donc les ventes elles-mêmes. Reconnaître les signaux tôt évite l'effondrement complet.",
  key_points: ["Signal 1 : irritation fréquente face à des questions normales des clients", "Signal 2 : retard généralisé sur les réponses et les commandes", "Signal 3 : perte de motivation pour créer du contenu", "Signal 4 : sommeil perturbé par le stress de la boutique"],
  example: "Une vendeuse de gâteaux a remarqué qu'elle répondait de plus en plus sèchement à ses clientes et repoussait ses publications. En prenant une journée de pause complète et en redéfinissant ses priorités, elle a retrouvé l'énergie qui lui manquait.",
  common_mistake: "Ignorer les signaux de fatigue en se disant qu'on 'n'a pas le choix', jusqu'à ce que la qualité du service en pâtisse fortement.",
  action_step: "Fais le point honnêtement aujourd'hui : reconnais-tu un ou plusieurs de ces 4 signaux chez toi ? Si oui, prévois une vraie pause cette semaine." },

{ numero: 97, categoryCode: 'PRO', title: "Les outils gratuits qui font gagner 1h par jour", pitch: "Une sélection testée d'apps simples pour gérer photos, textes, stock",
  subtitle: "Une sélection testée d'apps simples pour gérer photos, textes, stock.",
  why_it_matters: "De nombreux outils gratuits existent pour simplifier des tâches quotidiennes (retouche photo, planification, gestion de stock), mais beaucoup de commerçants ne les connaissent pas encore.",
  key_points: ["Retouche photo : applications simples de luminosité et cadrage gratuites", "Planification de contenu : outils gratuits pour préparer les posts à l'avance", "Gestion de stock : simple tableau partagé sur téléphone", "Templates de réponses : notes préenregistrées dans le téléphone pour copier-coller vite"],
  example: "Un vendeur d'accessoires passait beaucoup de temps à retoucher ses photos avec des essais-erreurs. En adoptant une application simple de retouche avec des filtres prédéfinis, il a réduit son temps de préparation de moitié tout en gardant des photos de qualité.",
  common_mistake: "Continuer à faire manuellement des tâches que des outils gratuits simples pourraient largement accélérer.",
  action_step: "Choisis une tâche répétitive de ta semaine (photos, planification, stock) et cherche aujourd'hui un outil gratuit qui pourrait te faire gagner du temps dessus." },

{ numero: 98, categoryCode: 'PRO', title: "Travailler avec un(e) associé(e) ou un(e) employé(e) sans conflit", pitch: "Répartir les rôles clairement dès le départ",
  subtitle: "Répartir les rôles clairement dès le départ.",
  why_it_matters: "Beaucoup de tensions entre associés ou avec un(e) employé(e) viennent d'un manque de clarté sur qui fait quoi. Définir les rôles dès le départ évite bien des conflits plus tard.",
  key_points: ["Écris clairement qui gère quoi (stock, réseaux sociaux, livraison, argent)", "Définis les horaires et la charge de travail attendue de chacun", "Prévois un moment régulier (hebdomadaire) pour faire le point ensemble", "Clarifie dès le départ la gestion de l'argent et des décisions importantes"],
  example: "Deux amies ayant lancé une boutique de cosmétiques ensemble avaient des tensions car aucune ne savait précisément qui devait répondre aux clients. En écrivant clairement les rôles de chacune (l'une gère les réseaux, l'autre le stock et les commandes), les tensions ont disparu.",
  common_mistake: "Démarrer un partenariat sans jamais formaliser clairement qui fait quoi, en pensant que 'ça se fera naturellement'.",
  action_step: "Si tu travailles avec quelqu'un, écrivez ensemble aujourd'hui, même sur un simple papier, qui est responsable de quoi dans la boutique." },
)

// --- G. GESTION (GES) ---
FICHES.push(
{ numero: 99, categoryCode: 'GES', title: "Suivre son stock sans logiciel compliqué", pitch: "Une méthode simple pour ne plus vendre un produit épuisé",
  subtitle: "Une méthode simple pour ne plus vendre un produit épuisé.",
  why_it_matters: "Vendre un produit qui n'est plus en stock crée une déception immédiate et une perte de confiance. Un suivi simple, même manuel, évite cette erreur facilement évitable.",
  key_points: ["Note la quantité de chaque produit dans un tableau simple (papier ou téléphone)", "Mets à jour la quantité immédiatement après chaque vente", "Fixe un seuil d'alerte (ex : 3 restants) pour recommander à temps", "Fais un comptage physique complet une fois par semaine pour vérifier la cohérence"],
  example: "Une boutique de tissus vendait régulièrement des coupons déjà épuisés faute de suivi, créant des annulations gênantes. En mettant en place un simple tableau mis à jour après chaque vente, ces erreurs ont totalement disparu.",
  common_mistake: "Se fier uniquement à sa mémoire pour connaître son stock disponible, ce qui mène régulièrement à vendre des produits épuisés.",
  action_step: "Crée aujourd'hui un tableau simple avec tes 10 produits les plus vendus et leur quantité actuelle en stock." },

{ numero: 100, categoryCode: 'GES', title: "Le tableau de bord du commerçant (3 chiffres à suivre chaque semaine)", pitch: "Ventes, marge, taux de réponse : les seuls indicateurs qui comptent au début",
  subtitle: "Ventes, marge, taux de réponse : les seuls indicateurs qui comptent au début.",
  why_it_matters: "Beaucoup de commerçants n'ont aucune vision chiffrée de leur activité et avancent à l'instinct. Suivre juste 3 chiffres simples suffit pour prendre de meilleures décisions rapidement.",
  key_points: ["Chiffre 1 : le total des ventes de la semaine", "Chiffre 2 : la marge réelle (pas juste le chiffre d'affaires)", "Chiffre 3 : le taux de réponse aux messages (répondus vs reçus)", "Note ces 3 chiffres chaque dimanche soir dans un simple carnet"],
  example: "Un vendeur de gadgets pensait bien gagner sa vie en regardant juste ses ventes brutes, sans jamais calculer sa vraie marge après frais. En suivant ces 3 chiffres chaque semaine, il a réalisé que sa marge réelle était plus faible que prévu et a ajusté ses prix.",
  common_mistake: "Suivre uniquement le chiffre d'affaires brut sans jamais calculer la marge réelle après tous les frais.",
  action_step: "Ce dimanche, calcule et note tes 3 chiffres de la semaine : ventes totales, marge réelle, taux de réponse." },

{ numero: 101, categoryCode: 'GES', title: "Choisir ses fournisseurs sans se faire avoir", pitch: "Les questions à poser avant de s'engager avec un nouveau fournisseur",
  subtitle: "Les questions à poser avant de s'engager avec un nouveau fournisseur.",
  why_it_matters: "Un mauvais fournisseur (retards, qualité inconstante, prix qui grimpe sans prévenir) peut mettre en péril toute une activité. Bien le choisir dès le départ évite de nombreux problèmes plus tard.",
  key_points: ["Demande des références ou avis d'autres commerçants ayant déjà travaillé avec ce fournisseur", "Commence par une petite commande test avant de s'engager sur un gros volume", "Clarifie les délais de livraison et les conditions en cas de retard", "Vérifie la stabilité des prix (sont-ils fixes ou fluctuent-ils souvent ?)"],
  example: "Une vendeuse de mèches a testé un nouveau fournisseur avec une petite commande avant de s'engager sur un gros lot. Elle a découvert des délais bien plus longs qu'annoncés, ce qui lui a évité un problème majeur si elle avait commandé en grande quantité directement.",
  common_mistake: "S'engager sur une grosse commande avec un nouveau fournisseur sans jamais avoir testé sa fiabilité au préalable.",
  action_step: "Si tu envisages un nouveau fournisseur, prévois une commande test de petite taille avant tout engagement plus important." },

{ numero: 102, categoryCode: 'GES', title: "Gérer plusieurs canaux de vente sans se noyer", pitch: "Instagram, WhatsApp, TerangaSpot : centraliser sans dédoubler le travail",
  subtitle: "Instagram, WhatsApp, TerangaSpot : centraliser sans dédoubler le travail.",
  why_it_matters: "Vendre sur plusieurs plateformes multiplie les opportunités, mais aussi le risque de se perdre entre les commandes, les stocks et les messages si rien n'est centralisé.",
  key_points: ["Garde un seul système de suivi de commandes, peu importe le canal d'origine", "Synchronise ton stock entre les canaux pour éviter de vendre deux fois le même article", "Définis quel canal sert à quoi (Instagram pour découvrir, WhatsApp pour commander)", "Ne te disperse pas sur trop de canaux si tu ne peux pas tous bien les gérer"],
  example: "Une boutique de vêtements vendait sur Instagram, WhatsApp et TerangaSpot sans jamais croiser les informations, ce qui causait des ventes doubles du même article. En centralisant le suivi de stock dans un seul tableau mis à jour peu importe le canal, ce problème a disparu.",
  common_mistake: "Gérer chaque canal de vente de façon totalement séparée, sans jamais centraliser stock et commandes, ce qui crée des doublons et des erreurs.",
  action_step: "Vérifie aujourd'hui si tu as un seul endroit centralisé pour suivre ton stock, peu importe d'où vient la commande. Si non, crée-le." },

{ numero: 103, categoryCode: 'GES', title: "Anticiper la rupture de stock avant qu'elle arrive", pitch: "Un système d'alerte simple, même sans outil",
  subtitle: "Un système d'alerte simple, même sans outil.",
  why_it_matters: "Une rupture de stock non anticipée fait perdre des ventes au pire moment (souvent en pleine période de forte demande). Un système d'alerte simple permet de recommander à temps.",
  key_points: ["Fixe un seuil minimum pour chaque produit qui déclenche une commande de réapprovisionnement", "Anticipe les délais de ton fournisseur pour commander avant d'être à sec", "Surveille de plus près les produits qui se vendent vite en période forte", "Prévois toujours une petite marge de sécurité sur tes best-sellers"],
  example: "Un vendeur d'accessoires téléphone se retrouvait régulièrement en rupture sur son produit le plus vendu en période de forte demande. En fixant un seuil d'alerte à 10 unités restantes pour recommander automatiquement, il n'a plus jamais raté une vente pour cette raison.",
  common_mistake: "Attendre d'être complètement en rupture de stock pour recommander, sans jamais anticiper le délai de réapprovisionnement du fournisseur.",
  action_step: "Choisis ton produit le plus vendu et fixe dès aujourd'hui un seuil d'alerte à partir duquel tu recommandes automatiquement." },

{ numero: 104, categoryCode: 'GES', title: "Le contrat (même informel) qui évite les malentendus", pitch: "Ce qu'il faut clarifier par écrit avec un fournisseur ou un livreur",
  subtitle: "Ce qu'il faut clarifier par écrit avec un fournisseur ou un livreur.",
  why_it_matters: "Beaucoup d'accords entre commerçants sénégalais restent oraux, ce qui laisse place à des malentendus coûteux. Un simple écrit, même informel, protège les deux parties.",
  key_points: ["Note les prix convenus et les conditions de paiement", "Précise les délais attendus et ce qui se passe en cas de retard", "Clarifie qui est responsable en cas de casse ou perte", "Un simple message WhatsApp récapitulatif vaut déjà mieux qu'un accord uniquement oral"],
  example: "Une vendeuse de gâteaux avait un accord oral avec un livreur, sans jamais clarifier qui payait en cas de colis endommagé. Après un incident, elle a commencé à envoyer un message récapitulatif clair avant chaque livraison importante, évitant tout malentendu futur.",
  common_mistake: "Se contenter d'un accord uniquement oral avec un fournisseur ou livreur, sans aucune trace écrite des conditions convenues.",
  action_step: "Pour ta prochaine collaboration avec un fournisseur ou livreur, envoie un message WhatsApp récapitulatif des conditions convenues, même simple." },

{ numero: 105, categoryCode: 'GES', title: "Faire l'inventaire sans y passer un dimanche entier", pitch: "Une méthode rapide, produit par produit",
  subtitle: "Une méthode rapide, produit par produit.",
  why_it_matters: "L'inventaire semble une corvée longue et fastidieuse, mais avec une méthode simple, il peut se faire rapidement et régulièrement, évitant les grosses surprises de fin de mois.",
  key_points: ["Compte un seul type de produit à la fois, pas tout en même temps", "Compare le chiffre compté avec ton tableau de suivi théorique", "Note les écarts pour comprendre d'où ils viennent (vol, erreur, casse)", "Fais un inventaire complet une fois par mois, et un contrôle rapide chaque semaine sur les best-sellers"],
  example: "Une boutique de bijoux faisait un inventaire complet tous les 3 mois, ce qui prenait une journée entière et révélait de gros écarts inexpliqués. En passant à un contrôle rapide hebdomadaire sur les produits phares, les écarts sont repérés et corrigés bien plus tôt.",
  common_mistake: "Attendre plusieurs mois entre deux inventaires, ce qui rend les écarts difficiles à expliquer et à corriger.",
  action_step: "Choisis tes 5 produits les plus vendus et fais leur comptage rapide dès aujourd'hui, en comparant avec ton tableau théorique." },

{ numero: 106, categoryCode: 'GES', title: "Structurer sa boutique pour la revendre ou la transmettre un jour", pitch: "Penser à long terme même en démarrant petit",
  subtitle: "Penser à long terme même en démarrant petit.",
  why_it_matters: "Même en début d'activité, structurer sa boutique proprement (comptes clairs, processus écrits, marque indépendante de sa personne) lui donne plus de valeur si un jour on veut la revendre, l'agrandir ou la transmettre.",
  key_points: ["Sépare toujours les comptes personnels et professionnels dès le début", "Documente tes processus clés (fournisseurs, prix, façon de travailler)", "Construis une marque qui ne dépend pas uniquement de ton visage ou ta voix", "Garde une trace de tes chiffres clés sur la durée, pas seulement au jour le jour"],
  example: "Une fondatrice de marque de cosmétiques a commencé, dès sa première année, à documenter ses recettes, ses fournisseurs et ses prix dans un carnet structuré. Deux ans plus tard, cette organisation lui a permis d'associer facilement une nouvelle collaboratrice sans tout réexpliquer de mémoire.",
  common_mistake: "Garder toute l'organisation de la boutique uniquement dans sa tête, ce qui la rend impossible à transmettre ou à déléguer un jour.",
  action_step: "Commence aujourd'hui un simple document (papier ou numérique) où tu notes tes prix, fournisseurs et processus clés, même en quelques lignes." },
)

// --- H. BRANDING (BRD) ---
FICHES.push(
{ numero: 107, categoryCode: 'BRD', title: "Choisir un nom de boutique qui reste en tête", pitch: "Les critères d'un bon nom pour le marché sénégalais",
  subtitle: "Les critères d'un bon nom pour le marché sénégalais.",
  why_it_matters: "Un nom difficile à prononcer, à retenir ou à écrire freine le bouche-à-oreille avant même que le produit n'entre en jeu. Le bon nom se retient et se partage facilement.",
  key_points: ["Privilégie un nom court, facile à prononcer en français comme en wolof", "Évite les noms trop proches de marques déjà connues", "Vérifie que le nom est disponible en tant que compte Instagram/TikTok", "Teste le nom à voix haute auprès de 3-4 personnes avant de te décider"],
  example: "Une nouvelle boutique de bijoux hésitait entre un nom anglais compliqué et 'Bijoux Yaye', plus simple et chaleureux. Le second nom, plus facile à retenir et à prononcer, a été choisi et se répète naturellement dans les conversations entre clientes.",
  common_mistake: "Choisir un nom trop long, compliqué à écrire ou difficile à prononcer, qui freine le partage naturel du nom entre clients.",
  action_step: "Teste ton nom de boutique actuel à voix haute auprès de 3 personnes différentes — s'ils hésitent à le répéter, c'est un signal à prendre au sérieux." },

{ numero: 108, categoryCode: 'BRD', title: "Créer un logo sans designer (et sans que ça se voie)", pitch: "Outils gratuits et règles simples pour un logo propre",
  subtitle: "Outils gratuits et règles simples pour un logo propre.",
  why_it_matters: "Un logo amateur ou mal fait donne une impression de sérieux réduite, même si le produit est excellent. Des outils gratuits permettent aujourd'hui de créer un logo propre sans budget.",
  key_points: ["Utilise un outil gratuit comme Canva avec des modèles de logo prêts", "Reste simple : 1-2 couleurs maximum, une police lisible", "Évite les effets trop chargés (ombres excessives, trop de dégradés)", "Teste ton logo en petit format (comme il apparaîtra sur WhatsApp) pour vérifier la lisibilité"],
  example: "Une boutique de tissus utilisait au départ juste le nom en texte simple comme logo. En passant 30 minutes sur un modèle Canva gratuit avec ses couleurs de marque, elle a obtenu un logo propre qui donne une image plus professionnelle sans dépenser un centime.",
  common_mistake: "Créer un logo trop chargé avec trop de couleurs et d'effets, en pensant que 'plus c'est riche, plus c'est pro' — c'est l'inverse qui est vrai.",
  action_step: "Si tu n'as pas encore de logo propre, ouvre Canva aujourd'hui et essaie un modèle simple avec 2 couleurs maximum." },

{ numero: 109, categoryCode: 'BRD', title: "Les couleurs de ta marque ne sont pas un détail", pitch: "Comment une palette cohérente augmente la confiance perçue",
  subtitle: "Comment une palette cohérente augmente la confiance perçue.",
  why_it_matters: "Des couleurs qui changent à chaque post donnent une impression de désordre, même inconsciente. Une palette fixe et répétée renforce la reconnaissance et le sérieux perçu de la marque.",
  key_points: ["Choisis 2-3 couleurs principales qui représentent ta marque", "Utilise ces couleurs de façon cohérente dans tes visuels, ton logo, tes stories", "Évite de changer de palette à chaque nouvelle tendance de couleur", "Vérifie que tes couleurs restent lisibles et agréables ensemble"],
  example: "Une boutique de vêtements changeait de couleurs dominantes à chaque post selon son humeur du moment. En fixant le violet et le doré comme couleurs de marque récurrentes, ses posts sont devenus immédiatement identifiables même sans voir le nom de la boutique.",
  common_mistake: "Changer constamment de couleurs dominantes d'un post à l'autre, ce qui empêche toute reconnaissance visuelle de la marque.",
  action_step: "Choisis dès maintenant 2 couleurs principales pour ta marque et utilise-les dans ton prochain post." },

{ numero: 110, categoryCode: 'BRD', title: "La signature visuelle qui rend tes posts reconnaissables", pitch: "Créer un style photo/texte répétable même sans graphiste",
  subtitle: "Créer un style photo/texte répétable même sans graphiste.",
  why_it_matters: "Un client qui scrolle doit pouvoir reconnaître ton post avant même de lire ton nom, juste par le style. Cette reconnaissance immédiate se construit avec des habitudes visuelles répétées.",
  key_points: ["Utilise toujours le même type de fond ou de cadrage pour tes photos produits", "Garde la même police et le même style de texte sur tes visuels", "Ajoute un élément récurrent (logo en coin, filtre couleur identique)", "Reste cohérent sur plusieurs semaines avant de juger si le style fonctionne"],
  example: "Une vendeuse de bijoux a commencé à toujours poser ses produits sur le même tissu noir avec le même angle de lumière. Après quelques semaines, ses clientes reconnaissaient ses publications avant même de lire son nom, juste au style visuel.",
  common_mistake: "Varier totalement le style visuel à chaque publication, ce qui empêche toute reconnaissance immédiate de la marque dans le flux des réseaux.",
  action_step: "Choisis un élément visuel fixe (fond, angle, filtre) que tu vas répéter sur tes 5 prochaines photos produits." },

{ numero: 111, categoryCode: 'BRD', title: "Ton histoire de marque en 30 secondes", pitch: "Le pitch qu'on peut réciter à n'importe qui, n'importe quand",
  subtitle: "Le pitch qu'on peut réciter à n'importe qui, n'importe quand.",
  why_it_matters: "Que ce soit à un client curieux, un partenaire potentiel ou un journaliste, avoir une histoire de marque courte et claire prête à réciter évite l'improvisation confuse et laisse une impression forte.",
  key_points: ["Résume en 3 phrases : le problème que tu résous, pourquoi toi, ce que tu proposes", "Entraîne-toi à le dire à voix haute jusqu'à ce que ça sonne naturel", "Garde-le assez court pour tenir en 30 secondes, pas plus", "Utilise-le aussi bien à l'oral qu'en légende de présentation"],
  example: "Une fondatrice de marque de cosmétiques improvisait toujours différemment quand on lui demandait de présenter sa marque. En préparant un pitch fixe de 30 secondes, elle a pu le réutiliser aussi bien en interview qu'en story de présentation, avec un message toujours clair.",
  common_mistake: "Improviser à chaque fois sa présentation de marque, ce qui donne un message différent et parfois confus selon le moment.",
  action_step: "Écris et répète à voix haute ton pitch de marque en 3 phrases, jusqu'à pouvoir le dire naturellement en 30 secondes." },

{ numero: 112, categoryCode: 'BRD', title: "Pourquoi la cohérence bat la perfection", pitch: "Mieux vaut un style simple répété qu'un style parfait irrégulier",
  subtitle: "Mieux vaut un style simple répété qu'un style parfait irrégulier.",
  why_it_matters: "Beaucoup de commerçants attendent d'avoir 'le contenu parfait' avant de publier, ce qui ralentit énormément leur rythme. La régularité, même imparfaite, construit plus de confiance sur la durée qu'une perfection rare.",
  key_points: ["Publie régulièrement même si le contenu n'est pas parfait, plutôt que d'attendre la perfection", "Fixe-toi un rythme réaliste que tu peux tenir sur la durée", "Améliore progressivement la qualité plutôt que de viser la perfection dès le départ", "Rappelle-toi que la régularité crée la confiance bien plus que l'exception ponctuelle"],
  example: "Un vendeur de gadgets attendait toujours 'la photo parfaite' avant de poster, ce qui le faisait publier seulement une fois par semaine. En acceptant de poster des photos simples mais régulières trois fois par semaine, sa visibilité a nettement augmenté malgré une qualité photo similaire.",
  common_mistake: "Attendre le contenu parfait avant de publier, ce qui ralentit considérablement le rythme de publication et la visibilité globale.",
  action_step: "Publie aujourd'hui un contenu simple, même imparfait, plutôt que d'attendre d'avoir 'le post parfait'." },

{ numero: 113, categoryCode: 'BRD', title: "Le packaging qui fait remarquer ta boutique", pitch: "Des idées low-cost pour un emballage qui donne envie de partager",
  subtitle: "Des idées low-cost pour un emballage qui donne envie de partager.",
  why_it_matters: "L'emballage est souvent la dernière impression laissée au client avant qu'il n'utilise le produit. Un emballage soigné, même simple, donne envie de le montrer en story, créant une publicité gratuite.",
  key_points: ["Ajoute un petit élément de marque (autocollant, ruban aux couleurs de la boutique)", "Un mot de remerciement manuscrit crée une impression très personnelle", "Garde l'emballage propre et soigné, même si simple", "Pense à ce qui donnerait envie au client de le montrer en story"],
  example: "Une vendeuse de bijoux a commencé à ajouter un petit ruban violet et un mot manuscrit de remerciement dans chaque commande. Ce détail simple a poussé plusieurs clientes à partager en story leur colis, créant une visibilité gratuite pour la boutique.",
  common_mistake: "Envoyer le produit dans un simple sachet plastique sans aucun soin apporté à l'emballage, ce qui donne une impression négligée à la réception.",
  action_step: "Ajoute dès ta prochaine commande un petit élément simple (ruban, mot manuscrit, autocollant) à ton emballage habituel." },

{ numero: 114, categoryCode: 'BRD', title: "Construire une marque qu'on n'oublie pas après un achat", pitch: "Les petits détails qui créent un souvenir de marque",
  subtitle: "Les petits détails qui créent un souvenir de marque.",
  why_it_matters: "Beaucoup de marques sont oubliées dès que le produit est utilisé. Créer un souvenir durable pousse le client à revenir et à recommander, bien après le premier achat.",
  key_points: ["Le message après-vente (voir fiche dédiée) prolonge le lien après l'achat", "Un petit geste inattendu (échantillon, mot personnalisé) marque les esprits", "Une identité visuelle cohérente aide à se souvenir de la marque plus tard", "Rester présent régulièrement en contenu (sans spammer) garde la marque en tête"],
  example: "Une boutique de cosmétiques ajoutait systématiquement un petit échantillon d'un autre produit dans chaque commande, avec un message personnalisé. Beaucoup de clientes se souvenaient précisément de la marque des mois plus tard, uniquement grâce à ce petit geste.",
  common_mistake: "Considérer la relation avec le client comme terminée dès que la vente est conclue, sans rien faire pour rester en mémoire par la suite.",
  action_step: "Réfléchis à un petit geste simple (échantillon, mot, attention) que tu pourrais ajouter systématiquement à tes prochaines commandes pour marquer les esprits." },
)

// --- I. PHOTOS PRODUITS (PHT) ---
FICHES.push(
{ numero: 3, categoryCode: 'PHT', title: "La règle des 3 secondes : la photo qui arrête le scroll", pitch: "Ce qui capte l'œil en premier sur une photo produit",
  subtitle: "Ta photo a 3 secondes pour arrêter le scroll. Sinon, le client passe à autre chose.",
  why_it_matters: "Sur Instagram et TikTok, les gens réagissent d'abord à l'image, avant même de lire la légende. Une photo terne ou encombrée est ignorée avant que ton texte ait sa chance.",
  key_points: ["Fond simple et uni — jamais ton lit ou ton carrelage avec des affaires qui traînent", "Lumière naturelle près d'une fenêtre entre 8h-11h ou après 16h, jamais le flash", "Le produit doit occuper 70-80% de l'image"],
  example: "Une vendeuse de bijoux à Grand-Yoff a remplacé sa photo prise sur le canapé par la même bague posée sur un tissu noir uni près de sa fenêtre à 9h. Même produit, mais qui 'sort' de l'écran au lieu de s'y fondre.",
  common_mistake: "Vouloir tout montrer en une seule photo (produit + carton + reçu + décor). Une photo = un message clair.",
  action_step: "Prends ton produit le plus vendu, pose-le sur un fond uni près d'une fenêtre, prends 3 angles différents, et compare avec ton ancienne photo." },

{ numero: 115, categoryCode: 'PHT', title: "Photographier avec juste un téléphone (guide lumière naturelle)", pitch: "Placement, heure, fond : les 3 réglages qui changent tout",
  subtitle: "Placement, heure, fond : les 3 réglages qui changent tout.",
  why_it_matters: "Un bon téléphone suffit largement pour de belles photos produits — c'est la lumière et le placement qui font toute la différence, pas un appareil cher.",
  key_points: ["Place-toi près d'une fenêtre, jamais en plein soleil direct", "Les meilleurs horaires : 8h-11h ou 16h-18h, lumière douce et naturelle", "Le produit doit faire face à la lumière, pas dos à elle", "Nettoie l'objectif de ton téléphone avant chaque séance — un détail souvent oublié"],
  example: "Une vendeuse de parfums prenait ses photos le soir avec la lumière du plafond, donnant un rendu jaunâtre peu flatteur. En passant ses séances photo près de sa fenêtre entre 9h et 10h, la couleur réelle des flacons est enfin devenue fidèle et attractive.",
  common_mistake: "Utiliser la lumière artificielle du salon ou le flash du téléphone, qui déforme les couleurs et crée des ombres dures.",
  action_step: "Prends ton produit le plus vendu et refais sa photo près d'une fenêtre entre 8h et 11h demain matin, sans flash." },

{ numero: 116, categoryCode: 'PHT', title: "Le fond qui vend mieux que le studio", pitch: "Fonds simples et accessibles (tissu, mur, nature) qui subliment le produit",
  subtitle: "Fonds simples et accessibles qui subliment le produit.",
  why_it_matters: "Pas besoin d'un studio professionnel — un tissu uni, un mur propre ou même un élément naturel bien choisi peuvent donner un rendu aussi qualitatif qu'un vrai studio photo.",
  key_points: ["Un tissu uni (noir, blanc, beige) est le fond le plus polyvalent et facile à trouver", "Un mur propre sans décoration peut suffire pour un rendu épuré", "Un élément naturel (bois, sable, feuilles) peut apporter une touche chaleureuse selon le produit", "Évite absolument les fonds encombrés avec des objets qui n'ont rien à voir avec le produit"],
  example: "Un vendeur de gadgets photographiait ses produits sur son bureau encombré de câbles et papiers. En investissant dans un simple tissu noir uni à 2000 FCFA, ses photos ont immédiatement pris un aspect plus professionnel et vendeur.",
  common_mistake: "Photographier le produit sur une surface encombrée (bureau, lit, table de cuisine) qui distrait l'œil du produit lui-même.",
  action_step: "Trouve chez toi un tissu uni ou un mur propre, et refais la photo de ton produit phare avec ce nouveau fond." },

{ numero: 117, categoryCode: 'PHT', title: "Montrer le produit porté ou utilisé, pas juste posé", pitch: "Pourquoi le contexte d'usage convertit mieux qu'une photo produit seule",
  subtitle: "Pourquoi le contexte d'usage convertit mieux qu'une photo produit seule.",
  why_it_matters: "Une photo produit seul montre ce que c'est, mais une photo en situation montre comment ça s'utilise et à quoi ça ressemble sur une vraie personne — ce qui aide le client à se projeter.",
  key_points: ["Alterne entre photos produit seul et photos portées/utilisées", "Demande à une amie ou cliente de porter le produit pour une photo réelle", "Montre le produit dans un contexte proche de son usage réel (bijou porté en sortie, plat servi à table)", "Le contexte doit rester simple pour ne pas détourner l'attention du produit"],
  example: "Une boutique de vêtements ne montrait que des photos à plat de ses robes. En ajoutant des photos portées par une amie dans un cadre simple, les clientes arrivaient bien mieux à se projeter et posaient moins de questions sur la coupe et le tombé.",
  common_mistake: "Ne montrer que des photos produit seul, sans jamais donner d'exemple concret de la façon dont il se porte ou s'utilise.",
  action_step: "Pour ton prochain post, ajoute au moins une photo montrant le produit porté ou utilisé en situation réelle, en plus de la photo produit seul." },

{ numero: 118, categoryCode: 'PHT', title: "Retoucher sans dénaturer (les apps gratuites qui suffisent)", pitch: "Corriger luminosité et couleur sans tromper le client",
  subtitle: "Corriger luminosité et couleur sans tromper le client.",
  why_it_matters: "Une petite retouche améliore la qualité perçue, mais trop en faire crée un décalage avec le produit réel reçu, ce qui génère de la déception et des retours.",
  key_points: ["Corrige uniquement la luminosité et le contraste, pas la couleur réelle du produit", "Utilise des applications gratuites simples (recadrage, luminosité de base)", "Évite les filtres trop forts qui changent la couleur réelle", "Compare toujours la photo retouchée avec le produit réel avant de publier"],
  example: "Une boutique de cosmétiques retouchait ses photos avec un filtre qui rendait la couleur d'un rouge à lèvres plus claire qu'en réalité. Plusieurs clientes ont été déçues à la réception. En limitant la retouche à la luminosité uniquement, les couleurs sont redevenues fidèles et les retours de déception ont cessé.",
  common_mistake: "Utiliser des filtres qui changent la couleur réelle du produit, créant un décalage avec ce que le client reçoit réellement.",
  action_step: "Reprends ta dernière photo retouchée et compare-la honnêtement avec le produit réel — si la couleur a changé, corrige uniquement la luminosité la prochaine fois." },

{ numero: 119, categoryCode: 'PHT', title: "La photo qui montre l'échelle et le détail", pitch: "Aider le client à visualiser la taille et la qualité réelles",
  subtitle: "Aider le client à visualiser la taille et la qualité réelles.",
  why_it_matters: "Beaucoup de clients hésitent à acheter en ligne car ils ne peuvent pas toucher le produit — montrer clairement sa taille réelle et ses détails de qualité réduit ce frein.",
  key_points: ["Ajoute une photo avec un objet du quotidien pour donner une échelle (main, pièce de monnaie)", "Fais un gros plan sur les détails de finition (couture, fermoir, texture)", "Montre le produit sous plusieurs angles pour une vision complète", "Précise les dimensions exactes en légende en complément de la photo"],
  example: "Une vendeuse de sacs recevait souvent la question 'il fait quelle taille ?' malgré ses belles photos. En ajoutant une photo du sac posé à côté d'une main, la question a quasiment disparu des commentaires.",
  common_mistake: "Ne montrer que des photos rapprochées sans jamais donner de repère de taille, ce qui laisse le client dans le flou sur les dimensions réelles.",
  action_step: "Ajoute à ta prochaine publication une photo avec un repère d'échelle simple (main, objet du quotidien) à côté du produit." },

{ numero: 120, categoryCode: 'PHT', title: "Une seule photo ne suffit jamais", pitch: "La série minimale de 4 photos qu'il faut pour chaque produit",
  subtitle: "La série minimale de 4 photos qu'il faut pour chaque produit.",
  why_it_matters: "Une seule photo laisse trop de questions sans réponse. Une petite série bien pensée répond à la majorité des questions avant même qu'elles ne soient posées.",
  key_points: ["Photo 1 : le produit entier, bien éclairé, sur fond simple", "Photo 2 : un détail ou une texture importante", "Photo 3 : le produit en situation ou porté", "Photo 4 : une échelle ou un élément de comparaison de taille"],
  example: "Un vendeur de chaussures ne postait qu'une seule photo par modèle, ce qui générait beaucoup de questions sur le confort et les détails. En systématisant une série de 4 photos par produit, ses messages de questions ont diminué et ses ventes ont augmenté.",
  common_mistake: "Publier une seule photo par produit et se retrouver à répondre individuellement aux mêmes questions à chaque client.",
  action_step: "Reprends ton produit le plus demandé et complète sa série photo jusqu'à atteindre ces 4 angles essentiels." },

{ numero: 121, categoryCode: 'PHT', title: "Photographier en période de forte chaleur ou de pluie", pitch: "Astuces pratiques pour shooter malgré les contraintes climatiques locales",
  subtitle: "Astuces pratiques pour shooter malgré les contraintes climatiques locales.",
  why_it_matters: "La chaleur intense ou la pluie peuvent compliquer les séances photo en extérieur — savoir s'adapter permet de continuer à produire du bon contenu toute l'année.",
  key_points: ["Par forte chaleur, shoote tôt le matin ou en fin de journée pour éviter la lumière trop dure de midi", "En cas de pluie, utilise la lumière douce près d'une fenêtre en intérieur", "Protège les produits sensibles (tissus, cosmétiques) de l'humidité pendant le shooting", "Prévois toujours un plan B intérieur si la météo ne coopère pas"],
  example: "Une vendeuse de bijoux prévoyait un shooting extérieur qui a été annulé par une pluie soudaine. En se repliant près de sa fenêtre avec un simple fond de tissu, elle a quand même obtenu de belles photos sans attendre le retour du soleil.",
  common_mistake: "Dépendre uniquement de conditions extérieures parfaites pour shooter, ce qui retarde la publication de contenu dès que la météo change.",
  action_step: "Prépare dès aujourd'hui un petit coin intérieur près d'une fenêtre comme plan B photo, utilisable peu importe la météo du jour." },
)

// --- J. LIVRAISON (LIV) ---
FICHES.push(
{ numero: 122, categoryCode: 'LIV', title: "Choisir son mode de livraison selon sa zone", pitch: "Comparer les options (livreur perso, moto, agence) selon Dakar ou régions",
  subtitle: "Comparer les options selon Dakar ou les régions.",
  why_it_matters: "Le bon mode de livraison dépend de la distance, du volume et de la fréquence des commandes. Un mauvais choix peut coûter cher ou ralentir sérieusement les délais.",
  key_points: ["Pour Dakar centre : un livreur moto personnel ou une agence rapide", "Pour la banlieue ou les zones plus larges : comparer les tarifs de plusieurs agences", "Pour les régions : prévoir des délais plus longs et en informer clairement le client", "Ne choisis pas uniquement sur le prix — la fiabilité compte tout autant"],
  example: "Une boutique de tissus livrait uniquement via un livreur personnel, débordé dès que le volume augmentait pendant les périodes fortes. En ajoutant une agence de livraison en renfort pour les pics d'activité, les délais sont restés fiables même en haute saison.",
  common_mistake: "S'appuyer sur un seul mode de livraison sans solution de secours en cas de forte demande ou d'indisponibilité.",
  action_step: "Identifie ton mode de livraison principal actuel et prévois une solution de secours pour les jours de forte demande." },

{ numero: 123, categoryCode: 'LIV', title: "Emballer pour que le produit arrive en bon état", pitch: "Les règles de base d'un emballage qui protège sans coûter cher",
  subtitle: "Les règles de base d'un emballage qui protège sans coûter cher.",
  why_it_matters: "Un produit abîmé pendant le transport crée une déception immédiate et souvent un remboursement ou un échange à ta charge. Un bon emballage protège ta marge autant que ton image.",
  key_points: ["Utilise un rembourrage simple (papier, tissu) pour les objets fragiles", "Ferme correctement les emballages pour éviter toute ouverture pendant le trajet", "Adapte l'emballage au mode de transport (moto = plus de secousses qu'une voiture)", "Teste l'emballage toi-même en le secouant légèrement avant envoi si le produit est fragile"],
  example: "Une boutique de bijoux recevait des retours de boucles d'oreilles cassées pendant le transport en simple sachet plastique. En ajoutant une petite boîte rigide avec rembourrage, les casses ont totalement disparu.",
  common_mistake: "Envoyer des produits fragiles dans un simple sachet sans aucune protection contre les chocs du transport.",
  action_step: "Vérifie l'emballage de ton produit le plus fragile et ajoute une protection simple (boîte, rembourrage) si ce n'est pas déjà le cas." },

{ numero: 124, categoryCode: 'LIV', title: "Communiquer les délais sans décevoir", pitch: "Annoncer un délai réaliste plutôt qu'optimiste",
  subtitle: "Annoncer un délai réaliste plutôt qu'optimiste.",
  why_it_matters: "Promettre un délai trop court pour rassurer sur le moment crée une déception garantie s'il n'est pas tenu. Un délai réaliste, même un peu plus long, construit plus de confiance sur la durée.",
  key_points: ["Annonce toujours un délai légèrement plus large que ton délai habituel réel", "Si tu livres plus tôt que prévu, c'est une bonne surprise plutôt qu'une déception évitée de justesse", "Sois transparent si un délai risque de ne pas être tenu, avant que le client ne le découvre lui-même", "Adapte le délai annoncé selon la zone de livraison réelle"],
  example: "Un vendeur de gadgets annonçait systématiquement 'livraison en 24h' même quand ce n'était pas toujours réaliste, créant de la frustration en cas de retard. En annonçant '24-48h' de façon plus réaliste, les clients étaient satisfaits même en cas de léger délai supplémentaire.",
  common_mistake: "Annoncer un délai optimiste pour rassurer sur le moment, sans être certain de pouvoir le tenir dans tous les cas.",
  action_step: "Vérifie ton délai de livraison annoncé actuellement — s'il est trop optimiste par rapport à ta réalité, ajuste-le dès ta prochaine communication." },

{ numero: 125, categoryCode: 'LIV', title: "Gérer un colis perdu ou endommagé", pitch: "La procédure à suivre pour rassurer le client et limiter la perte",
  subtitle: "La procédure à suivre pour rassurer le client et limiter la perte.",
  why_it_matters: "Un colis perdu ou endommagé arrive tôt ou tard à toute boutique qui livre. Avoir une procédure claire évite l'improvisation stressante et rassure le client rapidement.",
  key_points: ["Contacte immédiatement le livreur ou l'agence pour comprendre la situation", "Informe le client rapidement, sans attendre qu'il s'inquiète lui-même", "Propose une solution rapide (renvoi, remboursement) selon le cas", "Note l'incident pour évaluer si ce mode de livraison reste fiable à l'avenir"],
  example: "Une boutique de vêtements a eu un colis perdu par un livreur ponctuel. Plutôt que d'attendre, elle a contacté la cliente en expliquant la situation et a immédiatement renvoyé un nouveau colis en priorité. La cliente, bien informée, est restée fidèle malgré l'incident.",
  common_mistake: "Attendre que le client s'inquiète et réclame avant de reconnaître et gérer un problème de livraison déjà connu.",
  action_step: "Prépare dès maintenant un plan simple en 3 étapes pour le jour où un colis sera perdu ou endommagé, afin de ne pas improviser dans le stress." },

{ numero: 126, categoryCode: 'LIV', title: "Le paiement à la livraison : avantages, risques, solutions", pitch: "Comment sécuriser ce mode de paiement très demandé localement",
  subtitle: "Comment sécuriser ce mode de paiement très demandé localement.",
  why_it_matters: "Le paiement à la livraison rassure beaucoup de clients qui n'ont pas confiance en payant avant réception, mais il comporte des risques (client absent, refus de payer) qu'il faut savoir gérer.",
  key_points: ["Confirme la commande par message avant l'envoi pour limiter les annulations de dernière minute", "Demande un petit acompte pour les commandes importantes ou pour les nouveaux clients", "Prévois une politique claire en cas de refus à la livraison (qui paie le retour ?)", "Privilégie ce mode pour les clients fidèles ou les zones de confiance"],
  example: "Une vendeuse de vêtements a subi plusieurs refus de paiement à la livraison de nouveaux clients, ce qui lui coûtait les frais de transport à chaque fois. En demandant un petit acompte de confirmation pour les nouveaux clients uniquement, les annulations de dernière minute ont fortement diminué.",
  common_mistake: "Proposer le paiement à la livraison sans aucune sécurité (acompte, confirmation) à tous les clients sans distinction, y compris les inconnus.",
  action_step: "Si tu proposes le paiement à la livraison, réfléchis à un petit acompte de confirmation pour tes nouveaux clients non encore connus." },

{ numero: 127, categoryCode: 'LIV', title: "Zones de livraison : où s'arrêter et pourquoi", pitch: "Définir une zone rentable sans refuser des clients à l'aveugle",
  subtitle: "Définir une zone rentable sans refuser des clients à l'aveugle.",
  why_it_matters: "Livrer partout sans réflexion peut faire perdre de l'argent sur les zones trop éloignées. Définir une zone claire permet de rester rentable tout en sachant précisément quoi répondre aux demandes hors zone.",
  key_points: ["Calcule le coût réel de livraison par zone avant de fixer tes limites", "Définis une zone principale avec un tarif standard, et une zone élargie avec supplément", "Communique clairement tes zones de livraison pour éviter les incompréhensions", "Révise tes zones régulièrement selon la demande et les coûts réels observés"],
  example: "Un vendeur de gâteaux livrait partout dans Dakar au même tarif, perdant de l'argent sur les zones éloignées. En définissant une zone principale à tarif fixe et un supplément clair pour les zones plus lointaines, sa rentabilité par commande s'est stabilisée.",
  common_mistake: "Livrer partout au même tarif sans jamais calculer le coût réel selon la distance, ce qui rend certaines commandes non rentables sans le savoir.",
  action_step: "Calcule le coût de livraison réel de ta dernière commande la plus éloignée et compare-le à ce que tu as facturé — ajuste si besoin." },

{ numero: 128, categoryCode: 'LIV', title: "La livraison comme argument de vente", pitch: "Transformer un service logistique en avantage marketing affiché",
  subtitle: "Transformer un service logistique en avantage marketing affiché.",
  why_it_matters: "Une livraison rapide, fiable ou gratuite peut devenir un vrai argument de vente si elle est mise en avant clairement, plutôt que de rester un simple détail technique caché en bas de page.",
  key_points: ["Affiche clairement tes conditions de livraison dans ta bio ou ton catalogue", "Si ta livraison est rapide, dis-le explicitement ('Livré en 24h à Dakar')", "Utilise la livraison gratuite comme incitation lors d'événements ou de paliers d'achat", "Compare-toi honnêtement à la concurrence sur ce point si tu es réellement meilleur"],
  example: "Une boutique de cosmétiques livrait en 24h sans jamais le mentionner nulle part. En ajoutant 'Livraison en 24h à Dakar' bien visible dans sa bio et ses posts, ce point est devenu un argument régulièrement cité par les clientes pour justifier leur choix face à la concurrence.",
  common_mistake: "Avoir un bon service de livraison sans jamais le communiquer clairement, en pensant que les clients le découvriront tout seuls.",
  action_step: "Si ta livraison est un point fort (rapide, fiable, gratuite dès un certain montant), ajoute cette information clairement dans ta bio dès aujourd'hui." },
)

// --- K. FIDÉLISATION (FID) ---
FICHES.push(
{ numero: 10, categoryCode: 'FID', title: "Le message après-vente qui donne envie de revenir", pitch: "Un simple message de suivi qui transforme un client en client régulier",
  subtitle: "Un simple message de suivi qui transforme un client en client régulier.",
  why_it_matters: "La plupart des commerçants arrêtent tout contact dès la vente conclue. Un simple message après-vente montre qu'on se soucie du client au-delà de son argent, et prépare naturellement le prochain achat.",
  key_points: ["Envoie un message 2-3 jours après réception pour demander si tout va bien", "Ne demande jamais directement un avis positif — laisse le client s'exprimer librement", "Profite du message pour rappeler que tu es disponible pour toute question", "Ce message peut aussi être l'occasion douce d'annoncer une nouveauté, sans forcer la vente"],
  example: "Une vendeuse de cosmétiques envoyait juste 'merci pour votre achat' et s'arrêtait là. En ajoutant 2 jours après un message 'Comment tu trouves le produit ? N'hésite pas si tu as des questions', plusieurs clientes ont répondu spontanément avec des avis positifs, et certaines ont recommandé directement à ce moment-là.",
  common_mistake: "Ne jamais recontacter le client après la vente, laissant la relation s'arrêter net à la livraison.",
  action_step: "Choisis ta dernière vente conclue cette semaine et envoie dès aujourd'hui un message de suivi simple demandant si tout va bien." },

{ numero: 129, categoryCode: 'FID', title: "Créer un programme de fidélité simple (sans app compliquée)", pitch: "Un système de points ou de cadeaux facile à gérer à la main",
  subtitle: "Un système de points ou de cadeaux facile à gérer à la main.",
  why_it_matters: "Un programme de fidélité n'a pas besoin d'être technologique pour fonctionner — un simple système à la main peut suffire à créer un vrai réflexe de retour chez tes clients réguliers.",
  key_points: ["Choisis un système simple : carte tampon, points notés dans un carnet, ou palier de commandes", "Fixe une récompense claire et atteignable (ex : 1 cadeau après 5 commandes)", "Communique le programme clairement à tous tes clients réguliers", "Tiens le suivi rigoureusement pour ne jamais oublier une récompense due"],
  example: "Une boutique de vêtements a mis en place une simple carte tampon papier : 1 tampon par commande, un cadeau à la 6e. Ce système simple, sans aucune app, a créé un vrai réflexe de fidélité chez ses clientes régulières.",
  common_mistake: "Vouloir un système de fidélité complexe avec application dédiée, ce qui retarde indéfiniment la mise en place d'un programme, même simple.",
  action_step: "Choisis dès aujourd'hui un système de fidélité simple (carnet, carte tampon) et propose-le à tes 3 prochains clients réguliers." },

{ numero: 130, categoryCode: 'FID', title: "Le client qui revient vaut plus que 3 nouveaux clients", pitch: "Pourquoi investir dans la rétention avant l'acquisition",
  subtitle: "Pourquoi investir dans la rétention avant l'acquisition.",
  why_it_matters: "Trouver un nouveau client coûte plus de temps et d'énergie que de faire revenir un client déjà convaincu. Beaucoup de commerçants négligent leurs clients existants au profit de la chasse constante à de nouveaux clients.",
  key_points: ["Un client fidèle achète plus souvent et recommande naturellement", "Investir dans le service après-vente coûte moins cher que la publicité pour attirer de nouveaux clients", "Suis la fréquence d'achat de tes clients réguliers pour les relancer au bon moment", "Priorise la satisfaction de tes clients actuels avant de te concentrer uniquement sur l'acquisition"],
  example: "Une vendeuse de bijoux dépensait beaucoup d'énergie à chercher constamment de nouveaux clients via des posts, sans jamais relancer ses clientes déjà convaincues. En consacrant du temps à recontacter ses 20 meilleures clientes, elle a généré plus de ventes qu'avec ses efforts de prospection.",
  common_mistake: "Concentrer tous ses efforts sur l'acquisition de nouveaux clients tout en négligeant totalement le suivi des clients déjà acquis.",
  action_step: "Fais la liste de tes 10 meilleurs clients et envoie à chacun un message personnalisé cette semaine, simplement pour prendre des nouvelles." },

{ numero: 131, categoryCode: 'FID', title: "Célébrer l'anniversaire d'achat de ton client", pitch: "Une attention simple qui crée un attachement durable",
  subtitle: "Une attention simple qui crée un attachement durable.",
  why_it_matters: "Se souvenir d'une date importante pour un client, même simple comme son premier achat, crée un sentiment d'attention personnalisée rare, qui renforce fortement la fidélité.",
  key_points: ["Note la date du premier achat de tes clients réguliers", "Envoie un petit message ou une offre le jour de cet anniversaire", "Garde le geste simple — un message sincère suffit, pas besoin de grand cadeau", "Ce type d'attention fonctionne aussi pour les vrais anniversaires si tu les connais"],
  example: "Une boutique de cosmétiques notait la date du premier achat de ses clientes fidèles dans son tableau de suivi. Un an après, elle envoyait un message 'Ça fait 1 an que tu me fais confiance, merci !' avec une petite réduction. Ce geste simple générait systématiquement un nouvel achat dans la foulée.",
  common_mistake: "Ne jamais marquer aucune date importante dans la relation client, ce qui prive de nombreuses occasions naturelles de recontact chaleureux.",
  action_step: "Choisis un client fidèle dont tu connais approximativement la date du premier achat et prépare un message de remerciement pour cette date." },

{ numero: 132, categoryCode: 'FID', title: "La liste VIP : qui la mérite et comment la traiter", pitch: "Identifier et chouchouter tes 10% de clients les plus fidèles",
  subtitle: "Identifier et chouchouter tes 10% de clients les plus fidèles.",
  why_it_matters: "Tous les clients ne se valent pas en termes de fidélité et de valeur — identifier et traiter différemment tes meilleurs clients renforce leur attachement et les encourage à rester au sommet.",
  key_points: ["Identifie tes clients selon la fréquence et le montant de leurs achats", "Offre un traitement spécial (accès prioritaire, petites attentions) à cette liste VIP", "Ne rends pas ce statut trop visible publiquement pour éviter la jalousie des autres clients", "Révise régulièrement cette liste selon l'évolution du comportement d'achat"],
  example: "Une boutique de tissus a identifié ses 8 clientes les plus fréquentes et leur a donné un accès prioritaire aux nouveaux arrivages avant tout le monde, en message privé. Ces clientes se sont senties valorisées et ont continué à privilégier la boutique face à la concurrence.",
  common_mistake: "Traiter tous les clients de façon identique, sans jamais reconnaître ni valoriser particulièrement les plus fidèles.",
  action_step: "Identifie tes 5 clients les plus fréquents et prévois un petit geste ou accès prioritaire pour eux lors de ton prochain arrivage." },

{ numero: 133, categoryCode: 'FID', title: "Réactiver un client silencieux depuis 3 mois", pitch: "Un message de reconquête qui ne sonne pas commercial",
  subtitle: "Un message de reconquête qui ne sonne pas commercial.",
  why_it_matters: "Un client silencieux n'est pas forcément un client perdu — souvent, il a juste besoin d'un rappel bien formulé pour revenir, plutôt que d'être définitivement abandonné.",
  key_points: ["N'envoie pas juste 'ça fait longtemps' — apporte une info ou une raison de revenir", "Mentionne une nouveauté ou un rappel de ce qu'il avait apprécié auparavant", "Propose éventuellement un petit geste de bienvenue pour son retour", "Accepte que certains ne répondent pas, sans insister davantage après ce message"],
  example: "Une vendeuse de sacs a envoyé à ses clientes silencieuses depuis 3 mois un message 'On a reçu de nouveaux modèles qui pourraient te plaire vu ton style habituel, je te montre ?'. Plusieurs clientes silencieuses ont répondu positivement, se sentant reconnues plutôt que simplement sollicitées.",
  common_mistake: "Envoyer un message de relance générique et vague, sans aucune raison précise donnée au client silencieux de revenir maintenant.",
  action_step: "Repère 3 clients silencieux depuis plusieurs mois et envoie à chacun un message personnalisé avec une vraie raison de revenir (nouveauté, rappel de leur intérêt passé)." },

{ numero: 134, categoryCode: 'FID', title: "Transformer un client en ambassadeur", pitch: "Le système de parrainage simple qui fait venir de nouveaux clients",
  subtitle: "Le système de parrainage simple qui fait venir de nouveaux clients.",
  why_it_matters: "Un client satisfait est souvent prêt à recommander, mais un petit système de parrainage structuré multiplie fortement ce comportement naturel en le rendant concret et gratifiant.",
  key_points: ["Propose un avantage simple aux deux parties (parrain et filleul) à chaque recommandation réussie", "Facilite le partage avec un message ou code prêt à envoyer", "Remercie publiquement (avec accord) les meilleurs ambassadeurs", "Garde le système simple à comprendre et à suivre, sans complexité inutile"],
  example: "Une boutique de mèches offrait une petite réduction à la fois à la cliente qui recommandait et à la nouvelle cliente recommandée. Ce système simple, partagé facilement par message, a généré un flux régulier de nouvelles clientes via le bouche-à-oreille structuré.",
  common_mistake: "Compter uniquement sur le bouche-à-oreille spontané sans jamais structurer ni récompenser ce comportement chez les clients qui le font naturellement.",
  action_step: "Mets en place dès cette semaine un petit avantage simple pour toute cliente qui te recommande une nouvelle personne — annonce-le à tes clientes fidèles." },
)

// --- L. IA & OUTILS (IA) ---
FICHES.push(
{ numero: 135, categoryCode: 'IA', title: "Utiliser l'IA pour écrire tes légendes en 2 minutes", pitch: "Un prompt simple à copier-coller pour générer des textes qui convertissent",
  subtitle: "Un prompt simple à copier-coller pour générer des textes qui convertissent.",
  why_it_matters: "Beaucoup de commerçants passent trop de temps à chercher les bons mots pour leurs légendes, ou n'en écrivent jamais faute d'inspiration. Un outil IA peut générer une base solide en quelques secondes, à ajuster ensuite avec ta propre voix.",
  key_points: ["Décris précisément ton produit, ta cible et le ton souhaité dans ta demande", "Demande plusieurs versions pour choisir celle qui te ressemble le plus", "Ajuste toujours le texte généré avec tes propres mots pour rester authentique", "Ne copie jamais tel quel sans relecture — l'IA propose une base, pas un texte final"],
  example: "Une vendeuse de gâteaux qui bloquait souvent devant une page blanche a commencé à demander à un outil IA une légende pour son gâteau du jour, en précisant le ton chaleureux qu'elle voulait. Elle ajustait ensuite quelques mots pour que ça sonne vraiment comme elle, gagnant un temps précieux chaque jour.",
  common_mistake: "Publier directement le texte généré par l'IA sans aucune relecture ni ajustement personnel, ce qui donne un ton impersonnel et parfois décalé.",
  action_step: "Pour ton prochain post, utilise un outil IA pour générer 3 propositions de légende, puis ajuste la meilleure avec tes propres mots avant de publier." },

{ numero: 136, categoryCode: 'IA', title: "L'IA pour répondre à tes clients plus vite (sans perdre l'authenticité)", pitch: "Où l'automatisation aide, où elle doit rester invisible",
  subtitle: "Où l'automatisation aide, où elle doit rester invisible.",
  why_it_matters: "L'IA peut aider à préparer des réponses rapides pour les questions fréquentes, mais un client qui sent qu'il parle à un robot froid perd confiance. Le juste équilibre est essentiel.",
  key_points: ["Utilise l'IA pour préparer des brouillons de réponses aux questions fréquentes", "Personnalise toujours la réponse finale avec le prénom du client et une touche humaine", "Ne laisse jamais l'IA gérer seule une réclamation ou un moment de tension avec un client", "Garde les conversations importantes (négociation, problème) entièrement humaines"],
  example: "Un vendeur de gadgets utilisait l'IA pour préparer des réponses types aux questions de livraison, mais reformulait toujours avec sa propre touche avant d'envoyer. Ses clients ne remarquaient jamais l'aide de l'IA, tout en bénéficiant de réponses plus rapides et complètes.",
  common_mistake: "Copier-coller directement des réponses générées par IA sans aucune personnalisation, ce qui donne un ton robotique perceptible par le client.",
  action_step: "La prochaine question fréquente que tu reçois, essaie de générer une base de réponse avec l'IA, puis personnalise-la avec le prénom du client avant d'envoyer." },

{ numero: 137, categoryCode: 'IA', title: "Créer des visuels pro avec des outils gratuits (Canva et alternatives)", pitch: "Un gabarit réutilisable pour toutes tes publications",
  subtitle: "Un gabarit réutilisable pour toutes tes publications.",
  why_it_matters: "Créer un visuel de zéro à chaque publication prend du temps. Un gabarit réutilisable, créé une seule fois, permet de produire du contenu cohérent et professionnel rapidement.",
  key_points: ["Crée un gabarit de base sur Canva avec tes couleurs et ta police de marque", "Réutilise ce gabarit pour chaque nouveau produit, juste en changeant la photo et le texte", "Garde plusieurs formats prêts (post carré, story verticale)", "Mets à jour le gabarit occasionnellement pour ne pas devenir monotone, sans tout changer à chaque fois"],
  example: "Une boutique de bijoux créait chaque visuel de zéro, perdant beaucoup de temps chaque semaine. En créant un gabarit Canva unique avec ses couleurs violettes et dorées, elle produit maintenant ses visuels en quelques minutes tout en gardant une identité cohérente.",
  common_mistake: "Repartir de zéro à chaque nouveau visuel, ce qui fait perdre un temps considérable et crée une incohérence visuelle entre les publications.",
  action_step: "Crée aujourd'hui un gabarit simple sur Canva avec tes couleurs de marque, que tu pourras réutiliser pour tous tes prochains posts." },

{ numero: 138, categoryCode: 'IA', title: "L'IA pour comprendre tes chiffres de vente", pitch: "Utiliser un outil simple pour repérer des tendances dans ses ventes",
  subtitle: "Utiliser un outil simple pour repérer des tendances dans ses ventes.",
  why_it_matters: "Beaucoup de commerçants ont des chiffres de vente mais ne prennent jamais le temps de les analyser pour en tirer des décisions. Un outil IA simple peut aider à repérer des tendances sans compétence technique poussée.",
  key_points: ["Note tes ventes régulièrement dans un tableau simple (voir fiche tableau de bord)", "Demande à un outil IA d'analyser tes chiffres et de repérer des tendances (jours forts, produits qui montent)", "Utilise ces tendances pour ajuster ton stock ou ton contenu", "Ne remplace jamais complètement ton propre jugement par l'analyse automatique"],
  example: "Un vendeur de gadgets notait ses ventes chaque semaine sans jamais les analyser en profondeur. En partageant son tableau à un outil IA pour repérer les tendances, il a découvert que ses ventes du jeudi étaient systématiquement plus fortes, et a ajusté son contenu en conséquence.",
  common_mistake: "Collecter des données de vente sans jamais prendre le temps de les analyser pour en tirer de vraies décisions.",
  action_step: "Rassemble tes chiffres de vente du dernier mois et demande à un outil IA de repérer une tendance ou un pattern que tu n'avais pas remarqué." },

{ numero: 139, categoryCode: 'IA', title: "Traduire et adapter ses messages (wolof/français) avec l'IA", pitch: "Toucher plus de clients en s'exprimant naturellement dans les deux langues",
  subtitle: "Toucher plus de clients en s'exprimant naturellement dans les deux langues.",
  why_it_matters: "Beaucoup de clients se sentent plus proches d'une marque qui leur parle dans leur langue naturelle. L'IA peut aider à adapter certains messages en wolof pour toucher un public plus large, sans être expert en traduction.",
  key_points: ["Utilise l'IA pour une première traduction, puis vérifie qu'elle sonne naturelle localement", "Réserve le wolof pour des messages chaleureux ou proches (accueil, remerciement)", "Garde le français pour les infos précises (prix, conditions) pour éviter toute confusion", "Demande à un proche wolofophone de valider si le ton te semble incertain"],
  example: "Une vendeuse de tissus ajoutait parfois une phrase en wolof comme 'Jërëjëf pour ta confiance' à la fin de ses messages, générée puis vérifiée avec l'IA. Ses clientes appréciaient cette proximité linguistique qui rendait la relation plus chaleureuse.",
  common_mistake: "Utiliser une traduction automatique sans vérification, ce qui peut donner un ton étrange ou incorrect en wolof familier.",
  action_step: "Essaie d'ajouter une courte phrase de remerciement en wolof à ton prochain message de confirmation de commande, en vérifiant sa justesse avant de l'envoyer." },

{ numero: 140, categoryCode: 'IA', title: "Les limites de l'IA : ce qu'elle ne doit jamais faire à ta place", pitch: "Préserver la relation humaine qui fait la différence dans le commerce local",
  subtitle: "Préserver la relation humaine qui fait la différence dans le commerce local.",
  why_it_matters: "L'IA est un outil puissant pour gagner du temps, mais la confiance et la relation humaine restent le vrai moteur du commerce de proximité. Trop déléguer à l'IA peut faire perdre ce qui rend justement ta boutique attachante.",
  key_points: ["Ne laisse jamais l'IA gérer seule une réclamation ou un moment sensible avec un client", "Garde ta voix et ta personnalité dans tes contenus, même quand l'IA t'aide à démarrer", "N'utilise pas l'IA pour inventer de faux avis clients ou de fausses informations", "Rappelle-toi que l'IA t'aide à aller plus vite, pas à remplacer le lien humain avec tes clients"],
  example: "Un vendeur de vêtements avait commencé à laisser un outil IA répondre automatiquement à toutes les questions, y compris les réclamations. Une cliente mécontente s'est sentie encore plus frustrée par des réponses impersonnelles. Il est repassé à une gestion humaine des situations sensibles, en gardant l'IA uniquement pour les tâches simples.",
  common_mistake: "Déléguer entièrement la relation client à l'IA, y compris pour les situations sensibles qui demandent une vraie écoute humaine.",
  action_step: "Fais le point sur les tâches où tu utilises l'IA actuellement — assure-toi qu'aucune situation sensible avec un client n'est gérée entièrement par elle." },
)

// --- M. FINANCES (FIN) ---
FICHES.push(
{ numero: 12, categoryCode: 'FIN', title: "Fixer son premier prix sans se brader", pitch: "La méthode simple : coût + temps + marge minimum",
  subtitle: "La méthode simple : coût + temps + marge minimum.",
  why_it_matters: "Beaucoup de commerçants fixent leurs prix au feeling ou en copiant un concurrent, sans jamais calculer leurs vrais coûts. Résultat : ils travaillent parfois à perte sans le savoir.",
  key_points: ["Additionne le coût réel du produit (achat, matière première)", "Ajoute le coût de ton temps de travail, même si tu ne te payes pas encore un salaire fixe", "Ajoute les frais annexes (emballage, livraison, pertes) souvent oubliés", "Ajoute enfin ta marge minimum — jamais en dessous, même pour un ami"],
  example: "Une couturière calculait son prix uniquement sur le prix du tissu acheté, oubliant son temps de travail et les fournitures annexes. En recalculant avec la méthode coût + temps + marge, elle a réalisé qu'elle vendait certaines robes quasiment à perte, et a ajusté ses prix en conséquence.",
  common_mistake: "Fixer un prix en copiant simplement un concurrent, sans jamais calculer ses propres coûts réels et sa marge minimum nécessaire.",
  action_step: "Prends ton produit le plus vendu et recalcule son prix avec la méthode coût + temps + marge — compare avec ton prix actuel." },

{ numero: 141, categoryCode: 'FIN', title: "Séparer l'argent de la boutique et l'argent personnel", pitch: "La règle n°1 pour ne jamais confondre chiffre d'affaires et salaire",
  subtitle: "La règle n°1 pour ne jamais confondre chiffre d'affaires et salaire.",
  why_it_matters: "Mélanger l'argent de la boutique et l'argent personnel rend impossible de savoir si l'activité est réellement rentable, et pousse souvent à dépenser plus qu'on ne devrait sans s'en rendre compte.",
  key_points: ["Ouvre un compte ou un espace séparé (même simple, comme un Wave dédié) pour la boutique", "Fixe-toi un salaire régulier que tu te verses depuis le compte boutique, pas un prélèvement au hasard", "Ne pioche jamais directement dans la caisse boutique pour des dépenses personnelles sans le noter", "Vérifie régulièrement la santé financière réelle de la boutique séparément de tes finances personnelles"],
  example: "Une vendeuse de cosmétiques utilisait le même compte Wave pour ses achats personnels et ceux de la boutique, rendant impossible de savoir si elle gagnait réellement de l'argent. En séparant les deux comptes et en se fixant un salaire fixe mensuel, elle a enfin pu voir clairement la rentabilité de son activité.",
  common_mistake: "Utiliser le même compte ou la même caisse pour les dépenses personnelles et professionnelles, rendant tout suivi financier impossible.",
  action_step: "Si ce n'est pas déjà fait, crée dès aujourd'hui un compte ou espace Wave/Orange Money séparé uniquement dédié à la boutique." },

{ numero: 142, categoryCode: 'FIN', title: "Calculer sa vraie marge (pas juste «j'ai vendu plus cher que j'ai acheté»)", pitch: "Intégrer emballage, livraison, temps, pertes dans le calcul",
  subtitle: "Intégrer emballage, livraison, temps, pertes dans le calcul.",
  why_it_matters: "Beaucoup de commerçants pensent avoir une bonne marge en comparant juste prix d'achat et prix de vente, sans compter tous les frais annexes qui grignotent discrètement cette marge.",
  key_points: ["Intègre le coût de l'emballage dans le calcul, pas juste le produit brut", "Compte les frais de livraison quand ils sont à ta charge, même partiellement", "Prends en compte le temps passé, surtout pour les produits faits main", "N'oublie pas les pertes (produits abîmés, invendus) dans le calcul global"],
  example: "Un vendeur d'accessoires pensait avoir 40% de marge en comparant simplement prix d'achat et prix de vente. En intégrant l'emballage, une partie de la livraison et les quelques pertes du mois, sa vraie marge était en réalité plus proche de 25%, ce qui a changé sa façon de fixer ses prix.",
  common_mistake: "Calculer sa marge uniquement sur la différence entre prix d'achat et prix de vente, sans intégrer tous les frais annexes réels.",
  action_step: "Recalcule la marge réelle de ton produit le plus vendu en intégrant emballage, livraison et pertes moyennes — compare avec le chiffre que tu pensais avoir." },

{ numero: 143, categoryCode: 'FIN', title: "Mettre de l'argent de côté sans y penser", pitch: "Une méthode simple d'épargne automatique pour commerçant",
  subtitle: "Une méthode simple d'épargne automatique pour commerçant.",
  why_it_matters: "Sans épargne, un imprévu (rupture de stock, panne, urgence familiale) peut mettre en péril toute l'activité. Une petite épargne régulière, même automatique, crée une sécurité indispensable.",
  key_points: ["Fixe un petit pourcentage fixe de chaque vente à mettre de côté systématiquement (même 5%)", "Utilise un compte ou une enveloppe séparée pour cette épargne, jamais mélangée au reste", "Ne touche à cette épargne qu'en cas de vrai imprévu, pas pour des envies ponctuelles", "Augmente progressivement le pourcentage une fois l'habitude installée"],
  example: "Une vendeuse de sacs a commencé à mettre systématiquement 5% de chaque vente dans une enveloppe séparée, sans même y penser consciemment à chaque fois. Après quelques mois, cette épargne lui a permis d'absorber une rupture de stock imprévue sans stress financier.",
  common_mistake: "Ne jamais mettre d'argent de côté en se disant qu'on le fera 'quand les affaires iront mieux', ce qui repousse indéfiniment cette habitude essentielle.",
  action_step: "Fixe dès aujourd'hui un petit pourcentage (même 5%) de ta prochaine vente à mettre immédiatement de côté, séparément du reste." },

{ numero: 144, categoryCode: 'FIN', title: "Gérer la trésorerie pendant les périodes creuses", pitch: "Anticiper les mois plus calmes pour ne pas paniquer",
  subtitle: "Anticiper les mois plus calmes pour ne pas paniquer.",
  why_it_matters: "Les périodes creuses reviennent chaque année de façon prévisible pour la plupart des secteurs. Les anticiper financièrement évite le stress et les décisions précipitées (bradage, emprunt risqué) une fois dedans.",
  key_points: ["Identifie tes mois historiquement plus calmes selon ton secteur", "Mets de côté une partie des bons mois pour compenser les mois creux à venir", "Réduis les dépenses non essentielles en anticipation des périodes creuses connues", "Utilise les périodes creuses pour préparer la prochaine saison forte plutôt que paniquer"],
  example: "Une boutique de tissus, très forte pendant Tabaski, connaissait des mois très calmes juste après. En mettant systématiquement de côté une partie des revenus de la période forte, elle a pu traverser les mois creux sans stress financier ni décisions précipitées.",
  common_mistake: "Dépenser l'intégralité des revenus des bons mois sans jamais anticiper les périodes plus calmes qui suivent inévitablement.",
  action_step: "Identifie ton mois historiquement le plus calme et prévois dès maintenant de mettre de côté une partie de tes revenus actuels pour compenser cette période à venir." },

{ numero: 145, categoryCode: 'FIN', title: "Le crédit fournisseur : bon outil ou piège ?", pitch: "Comprendre quand s'endetter pour du stock a du sens, et quand non",
  subtitle: "Comprendre quand s'endetter pour du stock a du sens, et quand non.",
  why_it_matters: "Le crédit fournisseur peut permettre de saisir une opportunité (grosse commande, période forte), mais mal utilisé, il peut créer un endettement dangereux difficile à rembourser si les ventes ne suivent pas comme prévu.",
  key_points: ["N'utilise le crédit fournisseur que pour du stock dont tu es quasiment certain de la vente rapide", "Calcule précisément combien de ventes sont nécessaires pour rembourser ce crédit", "Évite d'accumuler plusieurs crédits fournisseurs en même temps", "Négocie toujours des conditions claires et écrites avant d'accepter un crédit"],
  example: "Un vendeur de gadgets a pris un crédit fournisseur pour un gros arrivage avant Tabaski, période où il était certain de vendre rapidement. Il a calculé à l'avance combien d'unités il devait vendre pour rembourser à temps, et a évité tout stress financier grâce à cette anticipation.",
  common_mistake: "Prendre un crédit fournisseur pour du stock sans être certain de sa vente rapide, créant un risque d'endettement difficile à rembourser.",
  action_step: "Si tu envisages un crédit fournisseur, calcule d'abord précisément combien de ventes tu dois réaliser pour le rembourser, avant d'accepter." },

{ numero: 146, categoryCode: 'FIN', title: "Réinvestir ses bénéfices intelligemment", pitch: "Prioriser stock, marketing ou outils selon le stade de sa boutique",
  subtitle: "Prioriser stock, marketing ou outils selon le stade de sa boutique.",
  why_it_matters: "Réinvestir ses bénéfices est essentiel pour grandir, mais mal priorisé (tout dans le stock, rien dans la visibilité, ou l'inverse), cet investissement peut être inefficace.",
  key_points: ["Si tu manques de clients : priorise le marketing (contenu, éventuellement pub) plutôt que plus de stock", "Si tu manques de stock face à la demande : priorise le réapprovisionnement avant tout le reste", "Si tu perds du temps sur des tâches répétitives : priorise un outil qui te fait gagner du temps", "Ne réinvestis jamais 100% de tes bénéfices — garde toujours une part en épargne de sécurité"],
  example: "Une vendeuse de bijoux avait beaucoup de stock mais peu de visibilité. Plutôt que de continuer à acheter plus de stock, elle a réinvesti dans du contenu de meilleure qualité et quelques boosts ciblés, ce qui a résolu son vrai problème : le manque de clients, pas le manque de produits.",
  common_mistake: "Réinvestir systématiquement dans plus de stock, même quand le vrai problème de la boutique est ailleurs (visibilité, organisation, outils).",
  action_step: "Identifie honnêtement le vrai frein actuel de ta boutique (stock, visibilité, organisation) et oriente ton prochain réinvestissement vers ce point précis." },

{ numero: 147, categoryCode: 'FIN', title: "Préparer sa boutique pour un prêt ou un financement", pitch: "Les documents et chiffres de base à avoir prêts avant de démarcher",
  subtitle: "Les documents et chiffres de base à avoir prêts avant de démarcher.",
  why_it_matters: "Beaucoup de commerçants se présentent devant une institution de financement sans aucun chiffre ni document clair, ce qui réduit fortement leurs chances d'obtenir un financement, même pour une activité qui marche bien.",
  key_points: ["Prépare un historique simple de tes ventes des derniers mois", "Calcule ta marge réelle et ton bénéfice net approximatif", "Rassemble tes documents d'identité et, si possible, un justificatif d'activité", "Prépare une explication claire de l'utilisation prévue du financement demandé"],
  example: "Une couturière souhaitant agrandir son atelier s'est présentée à une institution de microfinance avec juste une explication orale de son activité, sans aucun chiffre. Après avoir préparé un tableau simple de ses ventes des 6 derniers mois et sa marge, sa demande a été bien mieux reçue et acceptée plus rapidement.",
  common_mistake: "Démarcher un financement sans aucun chiffre ni document préparé, en comptant uniquement sur une présentation orale de l'activité.",
  action_step: "Si tu envisages un financement un jour, commence dès maintenant à noter tes ventes mensuelles dans un tableau simple — ce sera ta base de dossier le moment venu." },
)

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
