import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getCityTaxonomy, getCityCategoryPairs, getRestaurantsForCityAndSpecialty, getSpecialtyTaxonomy } from '@/lib/taxonomy'
import { RestaurantCardLite } from '@/components/restaurant/RestaurantCardLite'
import { Breadcrumb } from '@/components/seo/Breadcrumb'
import { Footer } from '@/components/layout/Footer'
import { getPlatformSettings } from '@/lib/settings'
import { SITE_URL, SITE_NAME, buildBreadcrumbSchema, buildSpecialtyIntro } from '@/lib/seo'

export const revalidate = 3600
export const dynamicParams = true

interface Props { params: { city: string; category: string } }

export async function generateStaticParams() {
  const pairs = await getCityCategoryPairs()
  return pairs.map(p => ({ city: p.citySlug, category: p.categorySlug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [cities, specialties] = await Promise.all([getCityTaxonomy(), getSpecialtyTaxonomy()])
  const city = cities.find(c => c.slug === params.city)
  const specialty = specialties.find(s => s.slug === params.category)
  if (!city || !specialty) return { title: 'Restaurants introuvables', robots: { index: false } }

  // Le layout racine ajoute déjà " | TerangaLink" — ne pas le dupliquer ici.
  const rawTitle = `${specialty.label} à ${city.label} — commande WhatsApp`
  const maxLen = 60 - ` | ${SITE_NAME}`.length
  const title = rawTitle.length <= maxLen ? rawTitle : rawTitle.slice(0, maxLen - 1) + '…'
  const description = `Commandez ${specialty.label.toLowerCase()} à ${city.label} sur ${SITE_NAME}. Comparez les restaurants et commandez en ligne via WhatsApp, livraison rapide.`
  const canonical = `${SITE_URL}/restaurants/${city.slug}/${specialty.slug}`

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, siteName: SITE_NAME, locale: 'fr_SN', type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function CityCategoryPage({ params }: Props) {
  const [cities, specialties, settings] = await Promise.all([
    getCityTaxonomy(),
    getSpecialtyTaxonomy(),
    getPlatformSettings(),
  ])

  const city = cities.find(c => c.slug === params.city)
  const specialty = specialties.find(s => s.slug === params.category)
  if (!city || !specialty) notFound()

  const restaurants = await getRestaurantsForCityAndSpecialty(city.slug, specialty.slug, { limit: 60 })
  if (restaurants.length === 0) notFound()

  const canonical = `${SITE_URL}/restaurants/${city.slug}/${specialty.slug}`
  const breadcrumbItems = [
    { label: 'Accueil', href: '/' },
    { label: 'Restaurants', href: '/restaurants' },
    { label: city.label, href: `/restaurants/${city.slug}` },
    { label: specialty.label },
  ]
  const breadcrumbSchema = buildBreadcrumbSchema(
    breadcrumbItems.map(b => ({ name: b.label, url: b.href ? `${SITE_URL}${b.href}` : canonical }))
  )

  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${specialty.label} à ${city.label}`,
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
          <Link href={`/restaurants/${city.slug}`} className="text-sm text-gray-600 hover:text-gray-900">
            Tous les restaurants à {city.label}
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <Breadcrumb items={breadcrumbItems} />
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          {specialty.label} à {city.label}
        </h1>
        <p className="text-gray-600 max-w-3xl mb-6">{buildSpecialtyIntro(city.label, specialty.label, restaurants.length)}</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {restaurants.map(r => <RestaurantCardLite key={r.id} restaurant={r} />)}
        </div>
      </main>

      <Footer whatsapp={settings.whatsapp} email={settings.email} city={settings.city} />
    </div>
  )
}
