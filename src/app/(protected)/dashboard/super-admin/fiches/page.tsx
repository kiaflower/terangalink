'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Plus, RefreshCw, Search } from 'lucide-react'
import { FicheRow, FicheRowData } from './FicheRow'
import { FichesProgressGauge } from './FichesProgressGauge'
import { ficheCategoryIcon } from '@/lib/fiche-icons'

interface Category {
  id: string
  code: string
  name: string
  color: string
  icon: string
  sort_order: number
}

interface FicheRecord {
  id: string
  numero: number
  title: string
  status: string
  category_id: string
  last_generated_at: string | null
  sent_at: string | null
}

export default function FichesPage() {
  const supabase = createClient()
  const [categories, setCategories] = useState<Category[]>([])
  const [fiches, setFiches] = useState<FicheRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<string | 'all'>('all')
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: cats }, { data: fs }] = await Promise.all([
      supabase.from('fiche_categories').select('id, code, name, color, icon, sort_order').order('sort_order'),
      supabase.from('fiches').select('id, numero, title, status, category_id, last_generated_at, sent_at').order('numero'),
    ])
    setCategories((cats ?? []) as Category[])
    setFiches((fs ?? []) as FicheRecord[])
    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  const categoryById = useMemo(() => {
    const map: Record<string, Category> = {}
    for (const c of categories) map[c.id] = c
    return map
  }, [categories])

  const categoryRankByFicheId = useMemo(() => {
    const ranks: Record<string, number> = {}
    const byCategory: Record<string, FicheRecord[]> = {}
    for (const f of fiches) {
      if (!byCategory[f.category_id]) byCategory[f.category_id] = []
      byCategory[f.category_id].push(f)
    }
    for (const list of Object.values(byCategory)) {
      list.sort((a, b) => a.numero - b.numero)
      list.forEach((f, i) => { ranks[f.id] = i + 1 })
    }
    return ranks
  }, [fiches])

  const statusCounts = useMemo(() => ({
    brouillon: fiches.filter(f => f.status === 'brouillon').length,
    prete: fiches.filter(f => f.status === 'prete').length,
    envoyee: fiches.filter(f => f.status === 'envoyee').length,
  }), [fiches])

  const filtered = fiches.filter(f => {
    if (activeCategory !== 'all' && f.category_id !== activeCategory) return false
    if (search && !f.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const rows: FicheRowData[] = filtered.map(f => ({
    id: f.id,
    numero: f.numero,
    title: f.title,
    status: f.status,
    category: categoryById[f.category_id] ? { code: categoryById[f.category_id].code, name: categoryById[f.category_id].name, color: categoryById[f.category_id].color } : null,
    categoryRank: categoryRankByFicheId[f.id] ?? 1,
    lastGeneratedAt: f.last_generated_at,
    sentAt: f.sent_at,
  }))

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fiches Business</h1>
          <p className="text-gray-500 text-sm mt-1">{fiches.length} fiche{fiches.length !== 1 ? 's' : ''} · bibliothèque éducative pour les commerçants</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/dashboard/super-admin/fiches/new"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-brand-violet hover:bg-brand-violet-dark rounded-lg px-3 py-2 transition-colors">
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Nouvelle fiche</span>
          </Link>
          <button onClick={load} className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
            <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <FichesProgressGauge counts={statusCounts} />

      <div className="flex items-center gap-2 overflow-x-auto pb-1 mb-4 -mx-1 px-1">
        <button onClick={() => setActiveCategory('all')}
          className="shrink-0 text-xs font-semibold px-3.5 py-2 rounded-full border transition-colors"
          style={activeCategory === 'all'
            ? { backgroundColor: 'rgba(124,58,237,0.08)', borderColor: '#7C3AED', color: '#7C3AED' }
            : { backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', color: '#6B7280' }}>
          Tous
        </button>
        {categories.map(c => {
          const Icon = ficheCategoryIcon(c.icon)
          const active = activeCategory === c.id
          return (
            <button key={c.id} onClick={() => setActiveCategory(c.id)}
              className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-full border transition-colors"
              style={active
                ? { backgroundColor: c.color + '15', borderColor: c.color, color: c.color }
                : { backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', color: '#6B7280' }}>
              <Icon className="w-3.5 h-3.5" />
              {c.name}
            </button>
          )
        })}
      </div>

      <div className="relative mb-6">
        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher une fiche par titre…"
          className="w-full sm:w-80 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-brand-violet transition-colors" />
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-gray-50 border border-gray-100 rounded-2xl p-4 animate-pulse h-20" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-gray-50 border border-gray-100 rounded-2xl py-20 text-center">
          <p className="text-sm text-gray-400">Aucune fiche{search || activeCategory !== 'all' ? ' pour ce filtre' : ''}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map(fiche => <FicheRow key={fiche.id} fiche={fiche} onChanged={load} />)}
        </div>
      )}
    </div>
  )
}
