import Link from 'next/link'
import Image from 'next/image'
import { UtensilsCrossed, Store, ArrowRight, MapPin, MessageCircle } from 'lucide-react'
import { Footer } from '@/components/layout/Footer'
import { MarqueeRestaurants } from '@/components/landing/MarqueeRestaurants'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPlatformSettings } from '@/lib/settings'

const WHATSAPP_URL = `https://wa.me/221774739266?text=${encodeURIComponent("Bonjour, je souhaite inscrire mon restaurant sur TerangaLink.")}`

const FOOD_PHOTOS = [
  'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&q=80',
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
  'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=600&q=80',
]


export default async function HomePage() {
  const admin = createAdminClient()
  const [{ data: restaurants }, settings] = await Promise.all([
    admin.from('restaurants').select('name').eq('is_active', true).eq('is_demo', false).order('name'),
    getPlatformSettings(),
  ])

  const restaurantNames = (restaurants ?? []).map(r => r.name)

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFFFFF' }}>

      {/* Header minimal */}
      <header className="px-6 py-5" style={{ borderBottom: '1px solid #F3F4F6' }}>
        <Link href="/" className="inline-flex items-center gap-2">
          <img src="/logo-terangalink.jpg" alt="TerangaLink" className="w-8 h-8 rounded-lg object-cover" />
          <span className="font-bold text-xl" style={{ color: '#111111' }}>TerangaLink</span>
        </Link>
      </header>

      <main className="flex-1">

        {/* ── Hero : accroche + deux cartes ── */}
        <section className="px-4 pt-16 pb-12 max-w-3xl mx-auto">

          {/* Accroche */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6 text-xs font-semibold"
              style={{ backgroundColor: 'rgba(249,115,22,0.08)', color: '#F97316', border: '1px solid rgba(249,115,22,0.15)' }}>
              <MapPin className="w-3.5 h-3.5" />
              Sénégal
            </div>
            <h1 className="font-black text-4xl sm:text-5xl mb-4 leading-tight" style={{ color: '#111111' }}>
              Commandez local. Gérez simple.
            </h1>
            <p className="text-lg max-w-md mx-auto" style={{ color: '#6B7280' }}>
              La plateforme qui connecte restaurants et clients au Sénégal
            </p>
          </div>

          {/* Deux cartes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">

            {/* Carte client */}
            <Link
              href="/restaurants"
              className="group flex flex-col items-center text-center p-8 rounded-3xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              style={{ backgroundColor: '#FFF7ED', border: '2px solid #FED7AA' }}
            >
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110"
                style={{ backgroundColor: '#F97316' }}>
                <UtensilsCrossed className="w-8 h-8 text-white" />
              </div>
              <h2 className="font-black text-2xl mb-2" style={{ color: '#111111' }}>
                Je veux commander
              </h2>
              <p className="text-sm mb-6 leading-relaxed" style={{ color: '#6B7280' }}>
                Découvrez les meilleurs restaurants de Dakar et commandez directement via WhatsApp
              </p>
              <span className="inline-flex items-center gap-2 font-bold text-sm px-5 py-2.5 rounded-xl text-white"
                style={{ backgroundColor: '#F97316' }}>
                Voir les restaurants
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>

            {/* Carte restaurateur */}
            <Link
              href="/pour-les-restaurants"
              className="group flex flex-col items-center text-center p-8 rounded-3xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              style={{ backgroundColor: '#FFFFFF', border: '2px solid #E5E7EB' }}
            >
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110"
                style={{ backgroundColor: '#111111' }}>
                <Store className="w-8 h-8 text-white" />
              </div>
              <h2 className="font-black text-2xl mb-2" style={{ color: '#111111' }}>
                J&apos;ai un restaurant
              </h2>
              <p className="text-sm mb-6 leading-relaxed" style={{ color: '#6B7280' }}>
                Créez votre site de commande et gagnez en visibilité auprès de vos clients au Sénégal
              </p>
              <span
                className="inline-flex items-center gap-2 font-bold text-sm px-5 py-2.5 rounded-xl transition-all group-hover:bg-orange-500 group-hover:text-white group-hover:border-orange-500"
                style={{ border: '2px solid #111111', color: '#111111' }}
              >
                Créer mon restaurant
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>

          </div>
        </section>

        {/* ── Défilement noms de restaurants (vrais, dynamiques) ── */}
        {/* Titre au-dessus du ticker */}
        {restaurantNames.length > 0 && (
          <p className="text-sm text-gray-400 text-center mt-12 mb-3">
            Ils sont déjà sur TerangaLink
          </p>
        )}
        <MarqueeRestaurants names={restaurantNames} />

        {/* ── Mosaïque photos ── */}
        <section className="px-4 py-12 max-w-3xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {FOOD_PHOTOS.map((src, i) => (
              <div key={i}
                className={`relative overflow-hidden ${i === 2 ? 'col-span-2 sm:col-span-1' : ''}`}
                style={{ borderRadius: 16, height: 200, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
                <Image src={src} alt={`Plat ${i + 1}`} fill className="object-cover" unoptimized />
              </div>
            ))}
          </div>
        </section>

        {/* ── Section finale orange ── */}
        <section style={{ backgroundColor: '#F97316' }} className="py-16 px-4">
          <div className="max-w-2xl mx-auto text-center text-white">
            <h2 className="font-black text-3xl sm:text-4xl leading-tight mb-4">
              Votre restaurant. Vos clients. Un seul lien.
            </h2>
            <p className="text-base mb-8 max-w-lg mx-auto" style={{ color: 'rgba(255,255,255,0.85)' }}>
              Sans appli, sans friction — juste WhatsApp et un menu qui se commande en un clic.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/restaurants"
                className="inline-flex items-center gap-2 font-bold text-sm px-6 py-3 rounded-xl transition-all hover:opacity-90 group"
                style={{ backgroundColor: '#FFFFFF', color: '#F97316' }}>
                <UtensilsCrossed className="w-4 h-4" />
                Voir les restaurants
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 font-bold text-sm px-6 py-3 rounded-xl transition-all hover:bg-white/10 group"
                style={{ color: '#FFFFFF', border: '2px solid rgba(255,255,255,0.6)' }}>
                <MessageCircle className="w-4 h-4" />
                Créer mon restaurant
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </a>
            </div>
          </div>
        </section>

      </main>

      <Footer whatsapp={settings.whatsapp} email={settings.email} city={settings.city} />

    </div>
  )
}
