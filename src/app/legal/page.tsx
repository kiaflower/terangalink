import Link from 'next/link'
import type { Metadata } from 'next'
import { getPlatformSettings } from '@/lib/platform-settings'

export const metadata: Metadata = { title: 'Mentions légales & Confidentialité — TerangaLink' }

export default async function LegalPage() {
  const settings = await getPlatformSettings()

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <Link href="/" className="text-brand-orange text-sm hover:underline">← Retour à l&apos;accueil</Link>
      <h1 className="text-3xl font-bold text-gray-900 mt-6 mb-8">Mentions légales & Confidentialité</h1>

      <div className="prose prose-gray max-w-none">
        <h2>Mentions légales</h2>

        <h3>Éditeur du site</h3>
        <p>
          TerangaLink est édité depuis Dakar, Sénégal. Pour toute question relative à l&apos;édition du
          site ou à son contenu, vous pouvez nous contacter à l&apos;adresse{' '}
          <a href={`mailto:${settings.support_email}`}>{settings.support_email}</a>.
        </p>

        <h3>Objet du service</h3>
        <p>
          TerangaLink est une plateforme de mise en relation entre des commerçants et leurs clients au
          Sénégal. Elle permet à chaque commerçant de créer une vitrine en ligne présentant son
          menu, et de recevoir des commandes directement sur WhatsApp. TerangaLink n&apos;intervient
          pas dans la transaction commerciale elle-même (paiement, livraison), qui se règle directement
          entre le commerçant et son client.
        </p>

        <h3>Responsabilité des vendeurs</h3>
        <p>
          Chaque restaurant inscrite sur TerangaLink est seule responsable de l&apos;exactitude de son
          menu (plats, prix, descriptions, disponibilité), du traitement de ses commandes et de
          la bonne exécution de ses transactions avec ses clients. TerangaLink ne garantit ni la qualité
          des plats vendus, ni la conformité des transactions effectuées entre commerçants et clients.
        </p>

        <h3>Propriété intellectuelle</h3>
        <p>
          La marque TerangaLink, son logo, son interface et l&apos;ensemble des éléments graphiques du site
          sont la propriété de TerangaLink et ne peuvent être replats sans autorisation. Chaque
          commerçant reste propriétaire des contenus (textes, photos, logo) qu&apos;il publie sur sa
          vitrine.
        </p>

        <h2 id="confidentialite">Confidentialité</h2>

        <h3>Données collectées</h3>
        <p>
          Nous collectons les informations nécessaires au fonctionnement du service : nom, adresse email,
          numéro de téléphone et de WhatsApp, ainsi que le contenu du menu (plats, images,
          descriptions) renseigné par chaque commerçant. Les commandes passées par les clients
          (nom, téléphone, adresse de livraison) sont également enregistrées afin d&apos;être transmises au
          commerçant concerné.
        </p>

        <h3>Utilisation des données</h3>
        <p>
          Ces données servent exclusivement au fonctionnement de TerangaLink : affichage des vitrines,
          transmission des commandes aux commerçants, statistiques internes et support client. Elles ne
          sont ni vendues, ni louées, ni transmises à des tiers à des fins commerciales.
        </p>

        <h3>Hébergement</h3>
        <p>
          Les données sont hébergées auprès de Supabase, sur des serveurs situés en Europe, ainsi que sur
          Vercel pour l&apos;hébergement applicatif.
        </p>

        <h3>Vos droits</h3>
        <p>
          Vous pouvez à tout moment demander l&apos;accès, la correction ou la suppression de vos données
          personnelles en nous contactant aux coordonnées ci-dessous.
        </p>

        <h3>Cookies</h3>
        <p>
          TerangaLink n&apos;utilise que des cookies techniques, nécessaires au bon fonctionnement du site
          (connexion, panier, préférences). Aucun cookie publicitaire ou de traçage tiers n&apos;est utilisé.
        </p>

        <h2>Contact</h2>
        <p>
          Pour toute question concernant ces mentions légales ou vos données personnelles :
        </p>
        <ul>
          <li>Email : <a href={`mailto:${settings.support_email}`}>{settings.support_email}</a></li>
          <li>
            WhatsApp :{' '}
            <a href={`https://wa.me/${settings.support_whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
              +{settings.support_whatsapp}
            </a>
          </li>
        </ul>
      </div>
    </div>
  )
}
