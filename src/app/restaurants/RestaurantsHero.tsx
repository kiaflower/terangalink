'use client'

import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'

const DEFAULT_GREETING = "Qu'est-ce qu'on achète aujourd'hui ?"

function getGreetingPhrase(): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return "Qu'est-ce qu'on achète ce matin ?"
  if (hour >= 12 && hour < 18) return "Qu'est-ce qu'on achète cet après-midi ?"
  return "Qu'est-ce qu'on achète ce soir ?"
}

interface Props {
  q?: string
  category?: string
  city?: string
  sort?: string
  categoryOptions: string[]
}

export function RestaurantsHero({ q, category, city, sort, categoryOptions }: Props) {
  const [greeting, setGreeting] = useState(DEFAULT_GREETING)

  useEffect(() => {
    setGreeting(getGreetingPhrase())
  }, [])

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        <svg viewBox="0 0 1600 500" preserveAspectRatio="xMidYMid slice" className="w-full h-full" aria-hidden="true">
          <defs>
            <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#4C1D95" />
              <stop offset="100%" stopColor="#111111" />
            </linearGradient>
          </defs>
          <rect width="1600" height="500" fill="url(#bgGrad)" />
          {/* Shopping bags, scattered — no people */}
          <g opacity="0.9">
            <rect x="180" y="220" width="150" height="180" rx="10" fill="#F97316" />
            <rect x="200" y="180" width="20" height="60" rx="8" fill="none" stroke="#F97316" strokeWidth="10" />
            <rect x="290" y="180" width="20" height="60" rx="8" fill="none" stroke="#F97316" strokeWidth="10" />
            <rect x="210" y="270" width="110" height="8" fill="rgba(255,255,255,0.25)" />
          </g>
          <g opacity="0.85">
            <rect x="360" y="260" width="130" height="150" rx="10" fill="#F5B700" />
            <rect x="378" y="225" width="18" height="55" rx="7" fill="none" stroke="#F5B700" strokeWidth="9" />
            <rect x="452" y="225" width="18" height="55" rx="7" fill="none" stroke="#F5B700" strokeWidth="9" />
            <rect x="385" y="300" width="90" height="7" fill="rgba(255,255,255,0.3)" />
          </g>
          <g opacity="0.75">
            <rect x="1050" y="200" width="160" height="190" rx="10" fill="#DB2777" />
            <rect x="1072" y="158" width="20" height="62" rx="8" fill="none" stroke="#DB2777" strokeWidth="10" />
            <rect x="1170" y="158" width="20" height="62" rx="8" fill="none" stroke="#DB2777" strokeWidth="10" />
            <rect x="1082" y="250" width="115" height="8" fill="rgba(255,255,255,0.25)" />
          </g>
          <g opacity="0.7">
            <rect x="1240" y="260" width="120" height="140" rx="10" fill="#2563EB" />
            <rect x="1256" y="228" width="17" height="50" rx="6" fill="none" stroke="#2563EB" strokeWidth="8" />
            <rect x="1326" y="228" width="17" height="50" rx="6" fill="none" stroke="#2563EB" strokeWidth="8" />
          </g>
        </svg>
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(180deg, rgba(17,17,17,0.55) 0%, rgba(17,17,17,0.8) 100%)'
        }} />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 pt-20 pb-12 text-center">
        <h1 className="text-3xl sm:text-5xl font-black text-white mb-3 leading-tight">
          {greeting}
        </h1>
        <p className="text-white/80 text-base sm:text-lg mb-8">
          Découvrez les restaurants du Sénégal et commandez directement
        </p>

        <form method="GET" className="bg-white rounded-2xl p-3 sm:p-4 shadow-xl flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Rechercher un restaurant ou un plat..."
              className="w-full pl-9 pr-4 py-3 rounded-xl text-sm focus:outline-none bg-gray-50 border border-transparent focus:border-brand-orange"
            />
          </div>
          <select
            name="category"
            defaultValue={category}
            className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-orange bg-gray-50"
          >
            {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input
            name="city"
            defaultValue={city}
            placeholder="Ville..."
            className="w-full sm:w-36 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-orange bg-gray-50"
          />
          <select
            name="sort"
            defaultValue={sort ?? 'score'}
            className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-orange bg-gray-50"
          >
            <option value="score">Pertinence</option>
            <option value="price_asc">Prix croissant</option>
            <option value="price_desc">Prix décroissant</option>
          </select>
          <button type="submit"
            className="px-6 py-3 rounded-xl text-sm font-semibold text-white transition-colors hover:opacity-90 flex-shrink-0"
            style={{ backgroundColor: '#F97316' }}>
            Filtrer
          </button>
        </form>
      </div>
    </section>
  )
}
