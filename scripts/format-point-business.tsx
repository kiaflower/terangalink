// Applique une mise en forme riche (gras/italique/couleur violette) au contenu déjà en
// base des 12 numéros du Point Business. Ne change pas le texte, seulement le balisage.
// Usage : npx tsx --tsconfig scripts/tsconfig.format.json scripts/format-point-business.tsx

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { sanitizeRichText } from '../src/lib/newsletter/sanitizeHtml'

function loadEnvLocal() {
  const content = readFileSync(path.join(__dirname, '..', '.env.local'), 'utf-8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1)
    if (!(key in process.env)) process.env[key] = value
  }
}
loadEnvLocal()

const V = 'color: #7C3AED; font-weight: bold'

// Ordre exact des blocs (Titre/Paragraphe alterné) tel que déjà en base pour chaque numéro —
// même texte, balisage b/i/span ajouté.
const FORMATTED: Record<string, string[]> = {
  'Le Point Business #001': [
    'Le mot de Kia',
    "Cette semaine, en discutant avec plusieurs boutiques, une phrase est revenue trois fois, presque mot pour mot : <i>« Je passe plus de temps à répondre aux mêmes questions qu'à vendre. »</i>",
    "Ce n'est pas un problème de désorganisation personnelle. <b>C'est un problème de structure</b> : une conversation WhatsApp n'a jamais été pensée pour porter un catalogue entier. Regardons ensemble où part vraiment votre temps — et comment le reprendre.",
    'Là où part vraiment votre temps',
    "Le problème n'est pas le volume de messages, c'est leur répétitivité. Une cliente demande la couleur, une autre le prix, une troisième la livraison — toujours les mêmes questions, jamais écrites une seule fois quelque part où elles pourraient se répondre seules. <b>Ce n'est pas le temps de réponse qui coûte cher : c'est le temps de re-tapage.</b>",
    "À ça s'ajoute un deuxième piège : chercher dans votre propre catalogue. Sans un endroit unique et clair, chaque question devient une <i>mini-enquête</i> — scroller les photos, vérifier un carnet, chercher de mémoire. Ce sont des interruptions permanentes qui cassent votre concentration.",
    "Et un troisième : sans vue d'ensemble, vous reconstruisez chaque matin l'état de votre activité dans votre tête — <b>ce qui crée oublis et doublons.</b>",
    "Ces trois pièges ne sont pas des défauts personnels. Même la commerçante la plus rigoureuse tomberait dedans avec cette structure. La solution n'est pas <i>« travaillez plus vite »</i> — <b>c'est changer la structure elle-même.</b>",
    `À exploiter cette semaine : <span style="${V}">TerangaSpot</span>`,
    `Les <span style="${V}">catégories</span> répondent à <i>« vous avez ça ? »</i> avant qu'on vous la pose : la cliente navigue seule dans votre boutique en ligne, au lieu de vous écrire d'abord.<br>Les <span style="${V}">descriptions complètes</span> tuent le re-tapage : une fiche remplie une fois (couleurs, tailles, prix) répond à toutes les clientes futures, sans que vous soyez présente.<br>Le <span style="${V}">tableau de bord</span> remplace la reconstruction mentale du matin : vous voyez vos commandes en cours d'un coup d'œil, au lieu de tout retenir de mémoire.`,
    "<b>Le principe à retenir : chaque information structurée une fois est une information que vous ne retaperez plus jamais.</b>",
    'La checklist de la semaine',
    "1. Notez vos 3 questions les plus répétées de la semaine.<br>2. Vérifiez si la réponse est déjà sur votre fiche produit — sinon, complétez-la aujourd'hui.<br>3. Rangez au moins 5 produits dans une catégorie claire.<br>4. Ouvrez votre dashboard chaque matin, à heure fixe.",
    'Le défi de la semaine',
    "La prochaine fois qu'on vous pose une question déjà présente sur une fiche produit, <b>envoyez juste le lien du produit au lieu de retaper la réponse.</b> Comptez combien de fois vous l'avez fait cette semaine.",
    'Pour finir',
    "Ce Point Business est nourri par ce que je vois chez vous chaque semaine. Une idée, un problème, une astuce trouvée de votre côté — <i>écrivez-moi.</i> Vous construisez les prochains numéros.",
    'À la semaine prochaine, Kia',
  ],

  'Le Point Business #002': [
    'Le mot de Kia',
    "Cette semaine, j'ai comparé deux boutiques qui reçoivent à peu près le même nombre de messages par jour. La première répond deux fois plus vite que la seconde — pas parce qu'elle tape plus vite, mais parce que sa cliente pose deux fois moins de questions. <b>Son catalogue est rangé d'une façon qui laisse deviner les réponses avant même qu'on les demande.</b>",
    "Un catalogue mal rangé coûte plus cher qu'il n'y paraît",
    `Une catégorie manquante, ce n'est pas un détail esthétique. C'est une question en plus dans votre boîte de réception. Si <i>« tenues homme »</i> et <i>« tenues femme »</i> sont mélangées, la cliente ne peut pas filtrer elle-même — elle vous écrit <i>« vous avez ça pour homme ? »</i>. Si les prix ne sont pas affichés produit par produit, elle vous écrit pour demander. <b>Chaque trou dans l'organisation se transforme en message entrant, jour après jour.</b>`,
    `À exploiter cette semaine : <span style="${V}">TerangaSpot</span>`,
    `Les <span style="${V}">catégories</span> doivent regrouper vos produits par la façon dont une cliente cherche, pas par la façon dont vous les avez achetés. <i>« Nouveautés »</i> n'aide personne à trouver un produit précis — <i>« Robes de soirée »</i> si. Une <span style="${V}">fiche produit complète</span> (prix, tailles, matière) est une question en moins à chaque fois qu'elle est visitée. Et si votre catalogue permet la <span style="${V}">recherche par mot-clé</span>, une cliente qui tape <i>« rouge »</i> trouve directement, sans vous écrire.`,
    'La checklist de la semaine',
    `1. Listez vos catégories actuelles et repérez celles qui ne veulent rien dire pour une cliente. 2. Vérifiez qu'aucun produit n'est <i>« orphelin »</i> sans catégorie. 3. Complétez le prix sur les 5 produits qui n'en ont pas encore. 4. Testez une recherche vous-même, comme le ferait une cliente pressée.`,
    'Le défi de la semaine',
    `Choisissez votre catégorie la plus fournie et redécoupez-la en deux si elle est trop large (<i>« Vêtements »</i> en <i>« Robes »</i> et <i>« Ensembles »</i> par exemple). <b>Observez si les questions sur cette catégorie diminuent dans les jours qui suivent.</b>`,
    'Pour finir',
    `Si une catégorie vous pose problème ou si vous ne savez pas comment ranger un type de produit particulier, <i>dites-le-moi</i> — je veux que ce numéro serve vraiment, pas juste qu'il se lise.`,
  ],

  'Le Point Business #003': [
    'Le mot de Kia',
    `Une commerçante m'a raconté une commande livrée deux fois à la même cliente, et une autre jamais livrée du tout, parce que les deux étaient notées au même endroit — un carnet, un fil WhatsApp — mélangées avec des dizaines d'autres conversations. <b>Ce n'est pas un manque de sérieux. C'est un manque de système.</b>`,
    'Pourquoi les commandes se perdent',
    `Une commande vit d'abord dans un message. Puis elle doit être préparée, confirmée, livrée. Entre chaque étape, si rien ne la <i>« retient »</i> quelque part de visible, elle dépend uniquement de votre mémoire — ou de votre capacité à retrouver un message vieux de trois jours au milieu de cinquante autres. Plus votre activité grandit, plus ce système à base de mémoire devient fragile. <b>Ce n'est pas une question de rigueur personnelle : c'est une question de capacité humaine à retenir des dizaines de statuts en tête en même temps.</b>`,
    `À exploiter cette semaine : <span style="${V}">TerangaSpot</span>`,
    `La <span style="${V}">gestion des commandes</span> centralise chaque commande avec son statut — reçue, en préparation, livrée — à un seul endroit, visible d'un coup d'œil. Vous n'avez plus à vous souvenir <i>« est-ce que j'ai déjà répondu à celle-là ? »</i> : le statut vous le dit. <b>C'est la différence entre porter chaque commande dans votre tête, et la voir posée devant vous.</b>`,
    'La checklist de la semaine',
    `1. Listez vos commandes en cours actuellement, où qu'elles soient notées. 2. Mettez à jour leur statut réel dans votre dashboard. 3. Identifiez celle qui traîne depuis le plus longtemps sans réponse. 4. Traitez-la aujourd'hui, avant d'en accepter une nouvelle.`,
    'Le défi de la semaine',
    `Cette semaine, avant de répondre à un nouveau message de commande, <b>prenez l'habitude de vérifier d'abord votre tableau de commandes — pas votre mémoire.</b> Voyez si ça change votre sérénité en fin de journée.`,
    'Pour finir',
    `Racontez-moi une erreur de commande qui vous est arrivée — sans jugement, ça arrive à tout le monde. <i>C'est souvent de ces histoires-là que viennent les meilleures idées pour améliorer TerangaSpot.</i>`,
  ],

  'Le Point Business #004': [
    'Le mot de Kia',
    `Après trois numéros sur le temps perdu, on m'a posé une question simple : <i>« Concrètement, par où je commence chaque matin ? »</i> Cette semaine, je réponds à ça — pas avec une nouvelle idée, mais avec un vrai rituel, minute par minute.`,
    'Le problème n\'est pas de savoir quoi faire, c\'est de le faire dans le désordre',
    `La plupart des commerçantes savent déjà ce qu'il faut faire — vérifier les commandes, répondre aux messages, ranger le catalogue. Le problème, c'est de le faire sans ordre fixe : on commence par ce qui arrive en premier sous les yeux, pas par ce qui est le plus urgent. <b>Ce désordre crée des allers-retours permanents entre les tâches, et chaque aller-retour a un coût de concentration invisible mais réel.</b>`,
    `À exploiter cette semaine : <span style="${V}">TerangaSpot</span>`,
    `Le <span style="${V}">dashboard</span> donne un ordre naturel à suivre chaque matin : d'abord les <span style="${V}">commandes en attente</span> (ce qui a un impact direct sur une cliente qui attend), puis les messages, puis l'organisation du catalogue si le temps le permet. <b>Suivre cet ordre, dans cet ordre, chaque jour, transforme une routine chaotique en rituel de 15 minutes qui couvre l'essentiel.</b>`,
    'La checklist de la semaine',
    `1. Fixez une heure quotidienne pour ouvrir votre dashboard, toujours la même. 2. Traitez toujours les commandes en attente en premier. 3. Ensuite seulement, les messages. 4. Réservez le catalogue pour un moment calme, pas dans l'urgence du matin.`,
    'Le défi de la semaine',
    `Suivez ce même ordre 5 jours d'affilée, à la même heure. <b>Notez le temps que ça vous prend le premier jour, puis le cinquième</b> — l'écart est souvent plus grand qu'on ne l'imagine.`,
    'Pour finir',
    `Le mois prochain, on quitte le temps pour parler de ventes. <i>Dites-moi si un sujet précis sur « gagner du temps » vous a manqué</i> — je peux y revenir.`,
  ],

  'Le Point Business #005': [
    'Le mot de Kia',
    `Une boutique m'a montré ses statistiques de visites : beaucoup de monde regarde le catalogue, très peu commandent. Ce mois-ci, on parle de vente — et cette semaine, on commence par comprendre <b>pourquoi une cliente intéressée n'achète parfois jamais.</b>`,
    'Le doute est le premier obstacle, pas le prix',
    `On pense souvent que si une cliente n'achète pas, c'est une question de prix. En réalité, <b>le premier frein est presque toujours le doute</b> : est-ce que ce produit va vraiment ressembler à la photo ? Est-ce que la taille annoncée correspond vraiment ? Est-ce que cette boutique livre vraiment, et à temps ? Une cliente qui hésite ne dit pas toujours pourquoi — <i>elle disparaît simplement, sans message, sans explication.</i>`,
    `À exploiter cette semaine : <span style="${V}">TerangaSpot</span>`,
    `Une <span style="${V}">fiche produit</span> qui répond aux doutes avant qu'ils soient formulés (photos sous plusieurs angles, description honnête sur la matière et la coupe, mention claire des délais de livraison) réduit ce frein invisible. Le <span style="${V}">lien de votre boutique</span>, propre et professionnel, rassure aussi simplement en donnant une impression de sérieux — bien plus qu'une conversation WhatsApp isolée ne peut le faire.`,
    'La checklist de la semaine',
    `1. Choisissez 3 produits qui se vendent peu malgré des vues. 2. Relisez leur fiche comme si vous étiez une cliente qui ne vous connaît pas. 3. Ajoutez une information qui manque (taille réelle, matière, délai). 4. Ajoutez une deuxième photo si vous n'en avez qu'une.`,
    'Le défi de la semaine',
    `Demandez à une amie qui ne connaît pas votre boutique de regarder une fiche produit et de vous dire, honnêtement, <i>ce qui la ferait hésiter à acheter.</i>`,
    'Pour finir',
    `Quel est le doute le plus fréquent que vos clientes vous expriment avant d'acheter ? <i>Partagez-le-moi</i>, ça peut nourrir un futur numéro.`,
  ],

  'Le Point Business #006': [
    'Le mot de Kia',
    `Certaines boutiques ont <i>« leur »</i> produit — celui qu'on leur réclame, qu'on partage entre amies, qui se vend presque sans effort. En regardant plusieurs de ces produits coup de cœur, j'ai remarqué qu'ils partagent tous les mêmes ingrédients, et <b>ce n'est jamais le hasard.</b>`,
    "Un coup de cœur, ce n'est pas juste un joli produit",
    `Un produit qui devient <i>« le »</i> produit d'une boutique répond en général à un besoin très précis, pas à un besoin vague. Il ne dit pas <i>« un joli sac »</i> — il dit <i>« le sac qui passe du bureau au dîner sans qu'on ait besoin d'en changer »</i>. <b>Cette précision donne une raison claire de préférer ce produit à un autre, presque identique, ailleurs.</b>`,
    `À exploiter cette semaine : <span style="${V}">TerangaSpot</span>`,
    `Mettre un produit en avant sur votre boutique (en haut de catalogue, ou signalé comme favori) ne sert à rien si sa description reste vague. Le vrai travail est dans la <span style="${V}">fiche</span> : remplacez <i>« beau produit »</i> par la situation précise où il change la vie de la cliente. Une variante bien pensée (couleur, taille) élargit aussi son public sans diluer son identité.`,
    'La checklist de la semaine',
    `1. Identifiez le produit qui revient le plus dans vos ventes. 2. Écrivez en une phrase le besoin précis qu'il résout. 3. Réécrivez sa fiche autour de cette phrase. 4. Mettez-le en avant sur votre boutique.`,
    'Le défi de la semaine',
    `Demandez à trois clientes fidèles pourquoi elles ont acheté ce produit précis. <b>Leurs mots, souvent, disent exactement la phrase qu'il fallait mettre dans la description.</b>`,
    'Pour finir',
    `Quel est votre produit coup de cœur en ce moment ? <i>Racontez-moi son histoire</i>, j'adore les découvrir.`,
  ],

  'Le Point Business #007': [
    'Le mot de Kia',
    `Ce ne sont presque jamais les grandes fautes qui font fuir une cliente — <b>c'est une accumulation de petits détails négligés</b> qui, mis bout à bout, donnent l'impression d'un manque de sérieux. Cette semaine, on regarde ces détails de près.`,
    'La première impression se joue en quelques secondes',
    `Une photo floue, un prix absent, une réponse qui tarde de plusieurs heures : chacun de ces détails, pris seul, semble mineur. Mais une cliente qui hésite déjà entre plusieurs boutiques n'a besoin que d'un seul de ces signaux pour partir vers une autre, sans jamais vous le dire. <b>Le silence d'une cliente qui ne répond plus est rarement un désintérêt total — c'est souvent un petit détail qui a fait pencher la balance ailleurs.</b>`,
    `À exploiter cette semaine : <span style="${V}">TerangaSpot</span>`,
    `Une <span style="${V}">boutique bien tenue</span> (catégories claires, prix visibles, photos nettes) élimine mécaniquement une grande partie de ces petits signaux négatifs, sans effort répété de votre part — l'organisation initiale travaille pour vous en continu. Le <span style="${V}">lien de votre boutique</span> devient alors un argument de confiance à lui seul, avant même la première conversation.`,
    'La checklist de la semaine',
    `1. Regardez votre boutique comme une inconnue la découvrirait. 2. Repérez une photo floue ou trop sombre et remplacez-la. 3. Vérifiez qu'aucun prix n'est manquant. 4. Chronométrez votre temps de réponse moyen cette semaine.`,
    'Le défi de la semaine',
    `Demandez à une personne extérieure de naviguer sur votre boutique sans commentaire de votre part, puis demandez-lui <i>ce qui l'a le plus surprise, en bien ou en mal.</i>`,
    'Pour finir',
    `Quel petit détail avez-vous corrigé récemment qui a fait une vraie différence ? <i>Je veux le partager</i> aux autres boutiques.`,
  ],

  'Le Point Business #008': [
    'Le mot de Kia',
    `Une boutique m'a montré ses chiffres : la même annonce, publiée deux fois, avec une seule différence — une date limite ajoutée la deuxième fois. <b>Les ventes ont presque doublé sur cette même semaine.</b> On termine ce mois sur les ventes en regardant pourquoi.`,
    "Ce n'est pas la réduction qui vend, c'est la limite",
    `Une offre disponible <i>« tout le temps »</i> ne crée aucune urgence à agir maintenant plutôt que la semaine prochaine — et <i>« la semaine prochaine »</i> devient souvent <i>« jamais »</i>. Une date ou une quantité limitée change la décision d'achat : ce n'est plus <i>« est-ce que je veux ce produit »</i>, c'est <i>« est-ce que je veux le rater »</i>. <b>C'est un mécanisme humain, pas une astuce marketing agressive, tant qu'elle reste honnête et réellement limitée.</b>`,
    `À exploiter cette semaine : <span style="${V}">TerangaSpot</span>`,
    `Une <span style="${V}">promotion</span> clairement affichée sur un produit, avec une date de fin réelle, transforme une simple annonce en décision urgente. Le <span style="${V}">lien direct de votre boutique</span> permet de partager cette offre précise, sans détour, à un moment choisi — plutôt que de la noyer dans une longue conversation WhatsApp où l'urgence se dilue.`,
    'La checklist de la semaine',
    `1. Choisissez un produit à mettre en avant cette semaine. 2. Fixez une vraie date de fin, courte (3 à 5 jours). 3. Annoncez-la clairement sur la fiche produit. 4. Partagez le lien direct plutôt qu'un message générique.`,
    'Le défi de la semaine',
    `Lancez une offre limitée sur un seul produit cette semaine, et <b>observez si le rythme des commandes change</b> par rapport à une semaine sans offre.`,
    'Pour finir',
    `Le mois prochain, on parle réseaux sociaux. <i>Dites-moi sur quelle plateforme vous passez le plus de temps</i> sans forcément voir de résultats — ça orientera les prochains numéros.`,
  ],

  'Le Point Business #009': [
    'Le mot de Kia',
    `On me demande souvent <i>« faut-il être sur TikTok ? »</i>. La vraie question n'est pas la plateforme, <b>c'est ce qu'on y montre.</b> Ce mois-ci, on parle réseaux sociaux — et on commence là où beaucoup de boutiques perdent du temps sans résultat.`,
    "TikTok ne récompense pas la qualité, il récompense l'authenticité",
    `Beaucoup de commerçantes évitent TikTok en pensant qu'il faut du matériel professionnel, un montage soigné, une mise en scène parfaite. En réalité, les vidéos qui vendent le mieux sur cette plateforme sont souvent tournées à la main, avec une vraie voix, un vrai visage, un vrai geste (déballer, montrer, essayer). <b>L'algorithme et les spectateurs préfèrent une vidéo imparfaite mais vraie à une publicité trop lisse qui sent la vente forcée.</b>`,
    `À exploiter cette semaine : <span style="${V}">TerangaSpot</span>`,
    `Le <span style="${V}">lien direct de votre boutique</span>, placé en bio ou mentionné à l'oral dans la vidéo, transforme une audience qui découvre votre visage en cliente qui peut acheter en un geste — sans avoir à chercher votre boutique par elle-même, ce qui fait perdre la majorité des personnes intéressées.`,
    'La checklist de la semaine',
    `1. Filmez un produit avec votre téléphone, sans montage. 2. Parlez comme à une amie, pas comme dans une publicité. 3. Mettez le lien de votre boutique en bio. 4. Publiez, même si la vidéo vous semble imparfaite.`,
    'Le défi de la semaine',
    `Publiez une vidéo où vous montrez un produit exactement comme vous le feriez à une amie qui passe à la boutique, <i>sans filtre ni script.</i>`,
    'Pour finir',
    `Quelle est la vidéo qui vous a le plus mal à l'aise à publier ? <b>C'est souvent celle-là qui fonctionne le mieux</b> — dites-moi si vous tentez l'expérience.`,
  ],

  'Le Point Business #010': [
    'Le mot de Kia',
    `Beaucoup de vues, peu de ventes — c'est une plainte fréquente sur les Reels. Cette semaine, on regarde <b>pourquoi un contenu populaire ne se transforme pas toujours en commande.</b>`,
    "Un Reel qui divertit n'est pas un Reel qui vend",
    `Certains formats sont pensés pour faire sourire ou surprendre, mais oublient de montrer clairement le produit et comment l'obtenir. Résultat : beaucoup de vues, peu de clics vers la boutique. <b>Les Reels qui vendent le mieux montrent toujours le produit en usage réel</b> — porté, utilisé, comparé avant/après — pas juste posé joliment sur une table.`,
    `À exploiter cette semaine : <span style="${V}">TerangaSpot</span>`,
    `Chaque Reel devrait se terminer par une indication claire : <i>« lien en bio »</i> ou mention directe de votre boutique. Sans cette étape, même le Reel le plus vu ne convertit personne — le spectateur ne sait simplement pas où aller pour acheter.`,
    'La checklist de la semaine',
    `1. Regardez vos 3 derniers Reels : montrent-ils le produit en usage réel ? 2. Ajoutez toujours une mention claire de la boutique en fin de vidéo. 3. Filmez un avant/après si le produit s'y prête. 4. Vérifiez que le lien en bio est à jour.`,
    'Le défi de la semaine',
    `Publiez un Reel qui montre un produit en usage réel, avec une mention claire de votre boutique à la fin, et <i>comparez son taux de clic à vos publications habituelles.</i>`,
    'Pour finir',
    `Quel Reel vous a rapporté le plus de commandes jusqu'ici ? <i>J'aimerais comprendre ce qui a fonctionné.</i>`,
  ],

  'Le Point Business #011': [
    'Le mot de Kia',
    `Les Stories sont souvent traitées comme un contenu secondaire, presque accessoire. Pourtant, plusieurs boutiques que j'ai observées <b>vendent régulièrement grâce à elles</b>, plus qu'avec leurs publications principales. Cette semaine, on regarde pourquoi.`,
    'Les Stories vendent par la répétition, pas par la performance',
    `Une Story disparaît en 24h, ce qui pousse à en publier souvent, sans pression de perfection. Cette répétition garde votre boutique présente dans l'esprit de vos clientes, jour après jour — <b>l'effet ne vient pas d'une Story exceptionnelle, mais de la fréquence à laquelle votre nom apparaît dans leur quotidien.</b>`,
    `À exploiter cette semaine : <span style="${V}">TerangaSpot</span>`,
    `Une Story qui montre un produit avec le <span style="${V}">lien direct de la boutique</span> en swipe up (ou mentionné à l'oral si le lien n'est pas cliquable) transforme un simple rappel de présence en occasion d'achat immédiate, pendant que la cliente y pense encore.`,
    'La checklist de la semaine',
    `1. Publiez une Story chaque jour cette semaine, même simple. 2. Montrez un produit différent à chaque fois. 3. Mentionnez le lien de votre boutique au moins une fois sur deux. 4. Répondez à toute réaction reçue en story dans la journée.`,
    'Le défi de la semaine',
    `Tenez une Story quotidienne pendant 7 jours d'affilée, même les jours où vous n'avez <i>« rien de spécial »</i> à montrer — un produit du quotidien suffit.`,
    'Pour finir',
    `Est-ce que les Stories vous semblent utiles ou juste chronophages actuellement ? <i>Votre retour m'aide à ajuster les prochains conseils.</i>`,
  ],

  'Le Point Business #012': [
    'Le mot de Kia',
    `On termine ce mois sur les réseaux sociaux avec la question qui revient le plus souvent : <i>« je n'ai pas le temps de créer du contenu tous les jours. »</i> Cette semaine, <b>on inverse le problème.</b>`,
    'Le vrai problème n\'est pas le temps, c\'est le rythme de création',
    `Créer un contenu par jour, chaque jour, demande une énergie créative renouvelée en permanence — épuisant à tenir. Créer plusieurs contenus d'un coup, une fois par semaine ou par mois, demande la même énergie créative, mais une seule fois, suivie seulement de publication. <b>C'est un changement de rythme, pas un changement d'effort total.</b>`,
    `À exploiter cette semaine : <span style="${V}">TerangaSpot</span>`,
    `Votre <span style="${V}">catalogue</span> déjà organisé devient une source de contenu toute prête : chaque produit bien décrit peut devenir une Story ou un Reel sans réflexion supplémentaire — vous piochez dans ce qui existe déjà plutôt que d'inventer un sujet à chaque fois.`,
    'La checklist de la semaine',
    `1. Bloquez une heure cette semaine, une seule fois. 2. Filmez ou photographiez 5 produits d'affilée pendant ce créneau. 3. Préparez les légendes à l'avance pour les 5. 4. Programmez leur publication sur plusieurs jours.`,
    'Le défi de la semaine',
    `Testez cette session unique cette semaine, puis <i>comparez votre niveau de fatigue à une semaine où vous créez au jour le jour.</i>`,
    'Pour finir',
    `On a fini trois mois ensemble — temps, ventes, réseaux sociaux. Le mois prochain, on parle des clientes. <b>Dites-moi ce que vous avez le plus appliqué jusqu'ici</b>, ça compte énormément pour moi.`,
  ],
}

type Block = { id: string; type: string; text: string; align?: string; [k: string]: unknown }

async function main() {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL as string, process.env.SUPABASE_SERVICE_ROLE_KEY as string, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  for (const [name, texts] of Object.entries(FORMATTED)) {
    const { data, error } = await admin.from('newsletter_campaigns').select('id, blocks').eq('name', name).maybeSingle()
    if (error) { console.error(`${name}: erreur lecture —`, error.message); continue }
    if (!data) { console.error(`${name}: introuvable en base, ignoré.`); continue }

    const blocks = data.blocks as Block[]
    if (blocks.length !== texts.length) {
      console.error(`${name}: ${blocks.length} blocs en base mais ${texts.length} textes fournis — abandon pour ce numéro.`)
      continue
    }

    const newBlocks = blocks.map((b, i) => ({ ...b, text: sanitizeRichText(texts[i]) }))

    const { error: updateError } = await admin
      .from('newsletter_campaigns')
      .update({ blocks: newBlocks, updated_at: new Date().toISOString() })
      .eq('id', data.id)

    if (updateError) console.error(`${name}: erreur mise à jour —`, updateError.message)
    else console.log(`${name}: mise en forme appliquée (${newBlocks.length} blocs).`)
  }
}

main()
