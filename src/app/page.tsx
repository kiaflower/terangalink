import Link from 'next/link'
import { ShoppingBag, Store, ArrowRight, MapPin, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Footer } from '@/components/layout/Footer'
import { RealRestaurantsMarquee } from '@/components/landing/RealRestaurantsMarquee'
import { ProductPhotosGrid } from '@/components/landing/ProductPhotosGrid'
import { Logo } from '@/components/ui/Logo'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function HomePage() {
  const supabase = createClient()

  // Chiffres réels (annuaire) et restaurants réels (vendeurs) chargés côté serveur pour
  // que les deux moitiés de la page — acheteur et vendeur — s'appuient sur des faits
  // vérifiables plutôt qu'une seule preuve sociale unilatérale (côté vendeur uniquement).
  const [{ data: marqueeRestaurants }, { count: restaurantCount }, { count: productCount }, { data: photoProducts }] = await Promise.all([
    supabase
      .from('restaurants')
      .select('name, slug, cuisine_type, logo_url, primary_color')
      .eq('is_active', true)
      .eq('is_demo', false)
      .order('created_at', { ascending: true })
      .limit(12),
    supabase
      .from('restaurants')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .eq('is_demo', false),
    supabase
      .from('menu_items')
      .select('id, restaurants!inner(is_active,is_demo)', { count: 'exact', head: true })
      .eq('is_available', true)
      .eq('restaurants.is_active', true)
      .eq('restaurants.is_demo', false),
    supabase
      .from('menu_items')
      .select('slug, image_url, images_urls, restaurants!inner(slug, is_active, is_demo)')
      .eq('is_available', true)
      .eq('restaurants.is_active', true)
      .eq('restaurants.is_demo', false)
      .limit(24),
  ])

  const realRestaurants = (marqueeRestaurants ?? []).map(b => ({ ...b, name: b.name.trim() }))

  // Juste les photos, sans prix/nom/description — un aperçu visuel du menu plutôt
  // qu'un CTA qui répétait les cartes acheteur/vendeur du haut de page. Chaque photo
  // reste cliquable vers sa vraie page plat dans l'annuaire.
  const productPhotos = (photoProducts ?? [])
    .map(p => {
      const src = p.image_url ?? p.images_urls?.[0] ?? null
      const restaurant = Array.isArray(p.restaurants) ? p.restaurants[0] : p.restaurants
      if (!src || !restaurant?.slug) return null
      return { src, href: `/${restaurant.slug}/plat/${p.slug}?from=accueil` }
    })
    .filter((photo): photo is { src: string; href: string } => Boolean(photo))

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFFFFF' }}>

      <header className="px-6 py-5 flex items-center justify-between" style={{ borderBottom: '1px solid #F3F4F6' }}>
        <Link href="/">
          <Logo textClassName="font-bold text-xl" textStyle={{ color: '#111111' }} />
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/login"
            className="text-sm font-medium px-4 py-2 rounded-xl transition-colors hover:text-brand-orange"
            style={{ color: '#6B7280', border: '1px solid #E5E7EB' }}>
            Se connecter
          </Link>
        </div>
      </header>

      <main className="flex-1">

        <section className="px-4 pt-16 pb-12 max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6 text-xs font-semibold"
              style={{ backgroundColor: 'rgba(249,115,22,0.08)', color: '#F97316', border: '1px solid rgba(249,115,22,0.15)' }}>
              <MapPin className="w-3.5 h-3.5" />
              Sénégal
            </div>
            <h1 className="font-black text-4xl sm:text-5xl mb-4 leading-tight" style={{ color: '#111111' }}>
              Achetez. Vendez.<br />
              Tout le <span className="text-gradient">Sénégal</span>, un seul endroit.
            </h1>
            <p className="text-lg max-w-md mx-auto" style={{ color: '#6B7280' }}>
              La plateforme qui connecte les commerçants et leurs clients
            </p>
          </div>

          {/* Les deux chemins (acheteur / vendeur) portent la même quantité d'info :
              même structure de carte, même longueur de texte, et chacun sa propre
              pastille de preuve — un chiffre réel côté acheteur, une garantie côté
              vendeur — pour ne pas faire pencher la page d'un côté. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">

            <Link href="/restaurants"
              className="group flex flex-col items-center text-center p-8 rounded-3xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              style={{ backgroundColor: '#F5F3FF', border: '2px solid #DDD6FE' }}>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110"
                style={{ backgroundColor: '#F97316' }}>
                <ShoppingBag className="w-8 h-8 text-white" />
              </div>
              <h2 className="font-black text-2xl mb-2" style={{ color: '#111111' }}>
                Je veux acheter
              </h2>
              <p className="text-sm mb-4 leading-relaxed" style={{ color: '#6B7280' }}>
                Découvrez les meilleurs restaurants du Sénégal et faites-vous livrer facilement
              </p>
              {Boolean(restaurantCount) && Boolean(productCount) && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold mb-6 px-3 py-1 rounded-full"
                  style={{ backgroundColor: 'rgba(249,115,22,0.1)', color: '#F97316' }}>
                  <Store className="w-3.5 h-3.5" />
                  {restaurantCount} restaurants · {productCount} plats
                </span>
              )}
              <span className="inline-flex items-center gap-2 font-bold text-sm px-5 py-2.5 rounded-xl text-white mt-auto"
                style={{ backgroundColor: '#F97316' }}>
                Voir les restaurants
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>

            <Link href="/pour-les-restaurants"
              className="group flex flex-col items-center text-center p-8 rounded-3xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              style={{ backgroundColor: '#FFFFFF', border: '2px solid #E5E7EB' }}>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110"
                style={{ backgroundColor: '#111111' }}>
                <Store className="w-8 h-8 text-white" />
              </div>
              <h2 className="font-black text-2xl mb-2" style={{ color: '#111111' }}>
                J&apos;ai un restaurant
              </h2>
              <p className="text-sm mb-4 leading-relaxed" style={{ color: '#6B7280' }}>
                Rangez vos commandes Instagram et WhatsApp dans un lien unique, gratuitement
              </p>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold mb-6 px-3 py-1 rounded-full"
                style={{ backgroundColor: 'rgba(17,17,17,0.06)', color: '#111111' }}>
                <Check className="w-3.5 h-3.5" />
                Gratuit, sans limite de durée
              </span>
              <span
                className="inline-flex items-center gap-2 font-bold text-sm px-5 py-2.5 rounded-xl transition-all group-hover:bg-brand-orange group-hover:text-white group-hover:border-brand-orange mt-auto"
                style={{ border: '2px solid #111111', color: '#111111' }}>
                Créer mon restaurant
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>

          </div>
        </section>

        {realRestaurants.length > 0 && (
          <section className="pb-4">
            <p className="text-sm text-gray-400 text-center mb-3">
              Elles sont déjà sur TerangaLink
            </p>
            <RealRestaurantsMarquee restaurants={realRestaurants} />
          </section>
        )}

        {/* Aperçu du menu — 4 photos de plats réels de l'annuaire, sans prix ni
            nom ni description, qui tournent toutes les 5s. Remplace le CTA du bas qui
            répétait les cartes acheteur/vendeur du haut de page. */}
        {productPhotos.length > 0 && (
          <section className="py-16 px-4">
            <div className="max-w-2xl mx-auto">
              <p className="text-sm text-gray-400 text-center mb-6">
                Un aperçu de ce qui s&apos;achète déjà sur TerangaLink
              </p>
              <ProductPhotosGrid photos={productPhotos} />
            </div>
          </section>
        )}

        {/* CTA final — fond orange, un bouton par audience, poids égal des deux côtés. */}
        <section style={{ backgroundColor: '#F97316' }} className="py-16 px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="font-black text-2xl sm:text-3xl leading-tight mb-8 text-white">
              Deux façons de profiter de TerangaLink
            </h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/pour-les-restaurants"
                className="inline-flex items-center gap-2 font-bold text-sm px-6 py-3 rounded-xl transition-all hover:opacity-90 group w-full sm:w-auto justify-center"
                style={{ backgroundColor: '#FFFFFF', color: '#111111' }}>
                <Store className="w-4 h-4" />
                Je veux créer mon site
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link href="/restaurants"
                className="inline-flex items-center gap-2 font-bold text-sm px-6 py-3 rounded-xl transition-all hover:opacity-90 group w-full sm:w-auto justify-center"
                style={{ backgroundColor: '#FFFFFF', color: '#F97316' }}>
                <ShoppingBag className="w-4 h-4" />
                Je veux commander
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  )
}
