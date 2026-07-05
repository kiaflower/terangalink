import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getCityTaxonomy, getCityCategoryPairs, getRestaurantsForCity, getSpecialtyTaxonomy } from '@/lib/taxonomy'
import { RestaurantCardLite } from '@/components/restaurant/RestaurantCardLite'
import { Breadcrumb } from '@/components/seo/Breadcrumb'
import { Footer } from '@/components/layout/Footer'
import { getPlatformSettings } from '@/lib/settings'
import { SITE_URL, SITE_NAME, buildBreadcrumbSchema, buildCityIntro } from '@/lib/seo'

export const revalidate = 3600
export const dynamicParams = true

interface Props { params: { city: string } }

export async function generateStaticParams() {
  const cities = await getCityTaxonomy()
  return cities.map(c => ({ city: c.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const cities = await getCityTaxonomy()
  const match = cities.find(c => c.slug === params.city)
  if (!match) return { title: 'Restaurants introuvables', robots: { index: false } }

  // Le layout racine ajoute déjà " | TerangaLink" — ne pas le dupliquer ici.
  const rawTitle = `Restaurants à ${match.label} — commande WhatsApp`
  const maxLen = 60 - ` | ${SITE_NAME}`.length
  const title = rawTitle.length <= maxLen ? rawTitle : rawTitle.slice(0, maxLen - 1) + '…'
  const description = `${match.count} restaurant${match.count > 1 ? 's' : ''} à ${match.label} sur ${SITE_NAME} : fast-food, africain, pâtisserie et plus. Commandez en ligne via WhatsApp.`
  const canonical = `${SITE_URL}/restaurants/${match.slug}`

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, siteName: SITE_NAME, locale: 'fr_SN', type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function CityPage({ params }: Props) {
  const [cities, pairs, settings] = await Promise.all([
    getCityTaxonomy(),
    getCityCategoryPairs(),
    getPlatformSettings(),
  ])

  const match = cities.find(c => c.slug === params.city)
  if (!match) notFound()

  const [restaurants, allSpecialties] = await Promise.all([
    getRestaurantsForCity(match.slug, { limit: 60 }),
    getSpecialtyTaxonomy(),
  ])

  if (restaurants.length === 0) notFound()

  const specialtySlugsForCity = new Set(pairs.filter(p => p.citySlug === match.slug).map(p => p.categorySlug))
  const specialtiesForCity = allSpecialties.filter(s => specialtySlugsForCity.has(s.slug)).slice(0, 20)

  const canonical = `${SITE_URL}/restaurants/${match.slug}`
  const breadcrumbItems = [
    { label: 'Accueil', href: '/' },
    { label: 'Restaurants', href: '/restaurants' },
    { label: match.label },
  ]
  const breadcrumbSchema = buildBreadcrumbSchema(
    breadcrumbItems.map(b => ({ name: b.label, url: b.href ? `${SITE_URL}${b.href}` : canonical }))
  )

  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Restaurants à ${match.label}`,
    numberOfItems: restaurants.length,
    itemListElement: restaurants.map((r, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: { '@type': 'Restaurant', name: r.name, url: `${SITE_URL}/${r.slug}` },
    })),
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F9FAFB' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />

      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo-terangalink.jpg" alt="TerangaLink" className="w-8 h-8 rounded-lg object-cover" />
            <span className="font-bold text-lg text-gray-900">Teranga<span className="text-brand-orange">Link</span></span>
          </Link>
          <Link href="/restaurants" className="text-sm text-gray-600 hover:text-gray-900">Tous les restaurants</Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <Breadcrumb items={breadcrumbItems} />
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Restaurants à {match.label}
        </h1>
        <p className="text-gray-600 max-w-3xl mb-6">{buildCityIntro(match.label, match.count)}</p>

        {specialtiesForCity.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {specialtiesForCity.map(s => (
              <Link
                key={s.slug}
                href={`/restaurants/${match.slug}/${s.slug}`}
                className="text-xs font-medium px-3 py-1.5 rounded-full bg-white border border-gray-200 text-gray-700 hover:border-brand-orange hover:text-brand-orange transition-colors"
              >
                {s.label} à {match.label}
              </Link>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {restaurants.map(r => <RestaurantCardLite key={r.id} restaurant={r} />)}
        </div>
      </main>

      <Footer whatsapp={settings.whatsapp} email={settings.email} city={settings.city} />
    </div>
  )
}
