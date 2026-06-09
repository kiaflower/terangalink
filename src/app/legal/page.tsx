import Link from 'next/link'
import { Zap, ArrowLeft } from 'lucide-react'
import { getPlatformSettings } from '@/lib/settings'

export const metadata = {
  title: 'Mentions légales & CGU — TerangaLink',
  description: 'Conditions générales d\'utilisation et mentions légales de TerangaLink.',
}

export default async function LegalPage() {
  const settings = await getPlatformSettings()
  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <div className="border-b border-surface-200 py-4 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand-orange rounded-lg flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-white">TerangaLink</span>
          </Link>
          <Link href="/" className="flex items-center gap-1.5 text-gray-500 hover:text-white text-sm transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Retour
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-3xl font-bold text-white mb-2">Mentions légales & CGU</h1>
        <p className="text-gray-500 text-sm mb-10">Dernière mise à jour : janvier 2026</p>

        <div className="space-y-10 text-gray-400 text-sm leading-relaxed">

          {/* Éditeur */}
          <section>
            <h2 id="editeur" className="text-white font-bold text-lg mb-3">1. Éditeur du service</h2>
            <div className="bg-surface-50 border border-surface-200 rounded-2xl p-5 space-y-1.5">
              <p><span className="text-gray-300 font-medium">Nom :</span> TerangaLink</p>
              <p><span className="text-gray-300 font-medium">Siège :</span> Dakar, Sénégal</p>
              <p><span className="text-gray-300 font-medium">Email :</span>{' '}
                <a href="mailto:{settings.email}" className="text-brand-orange hover:underline">{settings.email}</a>
              </p>
              <p><span className="text-gray-300 font-medium">WhatsApp :</span>{' '}
                <a href="{`https://wa.me/${settings.whatsapp}`}" target="_blank" rel="noopener noreferrer" className="text-brand-orange hover:underline">+{settings.whatsapp}</a>
              </p>
            </div>
          </section>

          {/* Objet */}
          <section>
            <h2 className="text-white font-bold text-lg mb-3">2. Objet du service</h2>
            <p>
              TerangaLink est une plateforme SaaS (Software as a Service) qui permet aux restaurateurs de créer
              et gérer un site de commande en ligne. Les clients des restaurants peuvent parcourir les menus
              et passer commande via WhatsApp.
            </p>
          </section>

          {/* Conditions utilisation */}
          <section>
            <h2 className="text-white font-bold text-lg mb-3">3. Conditions d&apos;utilisation</h2>
            <div className="space-y-3">
              <p><span className="text-gray-300 font-medium">3.1 Accès :</span> L&apos;accès à la plateforme est réservé aux professionnels de la restauration ayant souscrit un abonnement valide.</p>
              <p><span className="text-gray-300 font-medium">3.2 Compte :</span> Chaque restaurant dispose d&apos;un compte administrateur unique. L&apos;utilisateur est responsable de la confidentialité de ses identifiants.</p>
              <p><span className="text-gray-300 font-medium">3.3 Contenu :</span> L&apos;utilisateur s&apos;engage à publier des informations exactes sur son restaurant, ses produits et ses prix. TerangaLink se réserve le droit de suspendre tout compte publiant des contenus illicites ou trompeurs.</p>
              <p><span className="text-gray-300 font-medium">3.4 Usage :</span> La plateforme est destinée à un usage professionnel. Toute revente ou exploitation commerciale non autorisée est interdite.</p>
            </div>
          </section>

          {/* Abonnements */}
          <section>
            <h2 className="text-white font-bold text-lg mb-3">4. Abonnements et paiements</h2>
            <div className="space-y-3">
              <p>TerangaLink propose deux formules d&apos;abonnement :</p>
              <div className="bg-surface-50 border border-surface-200 rounded-xl p-4 space-y-2">
                <p>• <span className="text-gray-300 font-medium">Starter :</span> 9 000 FCFA / mois</p>
                <p>• <span className="text-gray-300 font-medium">Pro :</span> 15 000 FCFA / mois</p>
              </div>
              <p>Les paiements sont gérés directement entre TerangaLink et le client. En cas de non-paiement, le compte peut être suspendu sans préavis.</p>
              <p>Les abonnements Starter et Pro sont renouvelables à la demande et peuvent être résiliés à tout moment, avec effet à la fin de la période mensuelle en cours.</p>
            </div>
          </section>

          {/* Données personnelles */}
          <section>
            <h2 id="confidentialite" className="text-white font-bold text-lg mb-3">5. Données personnelles</h2>
            <div className="space-y-3">
              <p>TerangaLink collecte les données suivantes dans le cadre de son service :</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Informations du restaurant (nom, adresse, téléphone)</li>
                <li>Données de connexion (email, mot de passe chiffré)</li>
                <li>Données analytiques anonymisées (vues de pages, interactions menu)</li>
              </ul>
              <p>Ces données sont hébergées sur les serveurs de Supabase (infrastructure sécurisée, conforme RGPD). Elles ne sont jamais vendues à des tiers.</p>
              <p>Conformément aux lois en vigueur, vous disposez d&apos;un droit d&apos;accès, de modification et de suppression de vos données. Pour exercer ce droit, contactez-nous à{' '}
                <a href="mailto:{settings.email}" className="text-brand-orange hover:underline">{settings.email}</a>.
              </p>
            </div>
          </section>

          {/* Responsabilité */}
          <section>
            <h2 className="text-white font-bold text-lg mb-3">6. Limitation de responsabilité</h2>
            <p>
              TerangaLink s&apos;engage à assurer la disponibilité de la plateforme mais ne peut garantir une disponibilité ininterrompue. TerangaLink ne saurait être tenu responsable des pertes de revenus liées à une indisponibilité temporaire du service. Le contenu des menus et la gestion des commandes relèvent de la responsabilité exclusive du restaurant.
            </p>
          </section>

          {/* Propriété intellectuelle */}
          <section>
            <h2 className="text-white font-bold text-lg mb-3">7. Propriété intellectuelle</h2>
            <p>
              La marque TerangaLink, son interface et ses composants graphiques sont la propriété exclusive de TerangaLink. Toute reproduction partielle ou totale sans autorisation écrite est interdite. Les contenus publiés par les restaurants (photos, descriptions, prix) restent la propriété de leurs auteurs.
            </p>
          </section>

          {/* Droit applicable */}
          <section>
            <h2 className="text-white font-bold text-lg mb-3">8. Droit applicable</h2>
            <p>
              Les présentes conditions sont régies par le droit sénégalais. En cas de litige, les parties s&apos;engagent à rechercher une solution amiable avant tout recours judiciaire. À défaut, les tribunaux compétents de Dakar seront saisis.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-white font-bold text-lg mb-3">9. Contact</h2>
            <p>Pour toute question relative aux présentes mentions légales :</p>
            <div className="mt-3 flex flex-col gap-2">
              <a href="mailto:{settings.email}" className="text-brand-orange hover:underline">{settings.email}</a>
              <a href="{`https://wa.me/${settings.whatsapp}`}" target="_blank" rel="noopener noreferrer" className="text-brand-orange hover:underline">WhatsApp : +{settings.whatsapp}</a>
            </div>
          </section>

        </div>
      </div>
    </div>
  )
}
