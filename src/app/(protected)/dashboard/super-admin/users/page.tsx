'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, RefreshCw, UserCircle } from 'lucide-react'
import { UserRowActions } from './UserRowActions'

interface BoutiqueAdmin {
  id: string
  full_name: string | null
  email: string
  role: string
  boutique_id: string | null
  admin_role: 'principal' | 'secondaire' | null
  created_at: string
  boutique: { id: string; name: string; slug: string } | null
  subscription: { plan: string; status: string } | null
}

interface Boutique { id: string; name: string; slug: string }

const iCls = 'w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-brand-violet transition-colors'

function generatePassword() {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  return Array.from({ length: 10 }, () => c[Math.floor(Math.random() * c.length)]).join('')
}

export default function UsersPage() {
  const supabase = createClient()
  const [admins, setAdmins] = useState<BoutiqueAdmin[]>([])
  const [boutiques, setBoutiques] = useState<Boutique[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Add admin modal
  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState({ boutique_id: '', full_name: '', email: '', password: generatePassword() })
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState('')
  const [addResult, setAddResult] = useState<{ email: string; password: string; boutique: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, boutique_id, admin_role, created_at, boutique:boutiques(id, name, slug)')
      .eq('role', 'boutique_admin')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(200)

    if (profiles) {
      // Fetch subscription for each boutique
      const boutiqueIds = Array.from(new Set(profiles.map(p => p.boutique_id).filter(Boolean))) as string[]
      const { data: subs } = boutiqueIds.length
        ? await supabase.from('subscriptions').select('boutique_id, plan, status').in('boutique_id', boutiqueIds)
        : { data: [] }

      const subMap = Object.fromEntries((subs ?? []).map(s => [s.boutique_id, s]))

      setAdmins(profiles.map(p => ({
        ...p,
        boutique: (p.boutique as unknown as { id: string; name: string; slug: string } | null),
        subscription: p.boutique_id ? (subMap[p.boutique_id] ?? null) : null,
      })))
    }

    const { data: b } = await supabase.from('boutiques').select('id, name, slug').order('name')
    setBoutiques(b ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function deleteUser(userId: string, name: string) {
    if (!confirm(`Supprimer l'admin "${name}" ? Cette action supprimera définitivement son accès.`)) return
    setDeleting(userId)
    const res = await fetch('/api/super-admin/delete-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    })
    if (res.ok) { await load() }
    else { const data = await res.json().catch(() => ({})); alert(data.error || 'Erreur lors de la suppression') }
    setDeleting(null)
  }

  async function addAdmin() {
    setAddError('')
    if (!addForm.boutique_id || !addForm.full_name || !addForm.email) {
      setAddError('Tous les champs sont requis.'); return
    }
    // Check plan limits
    const boutique = boutiques.find(b => b.id === addForm.boutique_id)
    const existingCount = admins.filter(a => a.boutique_id === addForm.boutique_id).length
    const { data: sub } = await supabase.from('subscriptions').select('plan').eq('boutique_id', addForm.boutique_id).single()
    const maxAdmins = sub?.plan === 'pro' ? 5 : 1
    if (existingCount >= maxAdmins) {
      setAddError(`Plan ${sub?.plan ?? 'starter'} : maximum ${maxAdmins} admin(s) par boutique. Déjà ${existingCount} admin(s).`)
      return
    }
    // Un mot de passe ne peut être fixé que pour le tout premier admin d'une
    // boutique — au-delà, le serveur impose systématiquement le mot de passe
    // partagé déjà en place, quoi qu'on lui envoie ici.
    const isFirstAdmin = existingCount === 0
    setAddLoading(true)
    const res = await fetch('/api/super-admin/add-boutique-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...addForm, password: isFirstAdmin ? addForm.password : undefined }),
    })
    const data = await res.json()
    if (!res.ok) { setAddError(data.error || 'Erreur'); setAddLoading(false); return }
    setAddResult({ email: data.email ?? addForm.email, password: data.password ?? addForm.password, boutique: boutique?.name ?? '' })
    setAddLoading(false)
    await load()
  }

  // Group admins by boutique
  const grouped = boutiques
    .map(b => ({ boutique: b, admins: admins.filter(a => a.boutique_id === b.id) }))
    .filter(g => g.admins.length > 0)
  const unlinked = admins.filter(a => !a.boutique_id)

  const planColor: Record<string, string> = { pro: '#7C3AED', starter: '#6B7280', trial: '#D97706' }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Utilisateurs</h1>
          <p className="text-gray-500 text-sm mt-1">{admins.length} admin(s) boutique</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
            <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => { setAddOpen(true); setAddResult(null); setAddError('') }}
            className="inline-flex items-center gap-2 bg-brand-violet text-white text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-brand-violet-dark transition-colors">
            <Plus className="w-4 h-4" /> Ajouter un admin
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center text-sm text-gray-400">Chargement…</div>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ boutique, admins: bAdmins }) => {
            const sub = bAdmins[0]?.subscription
            const plan = sub?.plan ?? 'starter'
            const maxAdmins = plan === 'pro' ? 5 : 1
            return (
              <div key={boutique.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <div className="px-5 py-3.5 flex items-center justify-between gap-3 border-b border-gray-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs"
                      style={{ backgroundColor: planColor[plan] }}>
                      {boutique.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{boutique.name}</p>
                      <p className="text-xs text-gray-400">/{boutique.slug}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full text-white" style={{ backgroundColor: planColor[plan] }}>
                      {plan} · {bAdmins.length}/{maxAdmins} admin{maxAdmins > 1 ? 's' : ''}
                    </span>
                    <UserRowActions boutiqueId={boutique.id} boutiqueName={boutique.name} />
                  </div>
                </div>
                {bAdmins.map((a, i) => (
                  <div key={a.id} className={`px-5 py-3.5 flex items-center justify-between gap-4 ${i < bAdmins.length - 1 ? 'border-b border-gray-50' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                        {a.full_name?.charAt(0) ?? a.email.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {a.full_name ?? '—'} {a.admin_role && (
                            <span className={`ml-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${a.admin_role === 'principal' ? 'bg-violet-100 text-brand-violet' : 'bg-gray-100 text-gray-500'}`}>
                              {a.admin_role === 'principal' ? 'Principal' : 'Secondaire'}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-400">{a.email}</p>
                      </div>
                    </div>
                    <button onClick={() => deleteUser(a.id, a.full_name ?? a.email)}
                      disabled={deleting === a.id}
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )
          })}

          {unlinked.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-500">Sans boutique associée</p>
              </div>
              {unlinked.map((a, i) => (
                <div key={a.id} className={`px-5 py-3.5 flex items-center justify-between gap-4 ${i < unlinked.length - 1 ? 'border-b border-gray-50' : ''}`}>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{a.full_name ?? '—'}</p>
                    <p className="text-xs text-gray-400">{a.email}</p>
                  </div>
                  <button onClick={() => deleteUser(a.id, a.full_name ?? a.email)} disabled={deleting === a.id}
                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {grouped.length === 0 && unlinked.length === 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
              <UserCircle className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">Aucun admin boutique</p>
            </div>
          )}
        </div>
      )}

      {/* Add admin modal */}
      {addOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">{addResult ? 'Admin créé !' : 'Ajouter un admin'}</h3>
              <button onClick={() => setAddOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="p-6">
              {addResult ? (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-2xl p-4 space-y-2 text-sm">
                    <p className="text-green-800 font-semibold">Admin créé pour {addResult.boutique}</p>
                    <p className="text-green-700">Email : <span className="font-mono">{addResult.email}</span></p>
                    <p className="text-green-700">Mot de passe : <span className="font-mono font-bold">{addResult.password}</span></p>
                  </div>
                  <button onClick={() => { setAddOpen(false); setAddResult(null); setAddForm({ boutique_id: '', full_name: '', email: '', password: generatePassword() }) }}
                    className="w-full bg-brand-violet text-white py-3 rounded-xl font-semibold text-sm">
                    Fermer
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {addError && <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{addError}</p>}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Boutique *</label>
                    <select value={addForm.boutique_id} onChange={e => setAddForm(f => ({ ...f, boutique_id: e.target.value }))} className={iCls}>
                      <option value="">Sélectionner une boutique…</option>
                      {boutiques.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Nom complet *</label>
                    <input type="text" value={addForm.full_name} onChange={e => setAddForm(f => ({ ...f, full_name: e.target.value }))}
                      placeholder="Prénom Nom" className={iCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Email *</label>
                    <input type="email" value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="admin@boutique.com" className={iCls} />
                  </div>
                  {addForm.boutique_id && admins.filter(a => a.boutique_id === addForm.boutique_id).length === 0 ? (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5 flex items-center justify-between">
                        <span>Mot de passe temporaire</span>
                        <button type="button" onClick={() => setAddForm(f => ({ ...f, password: generatePassword() }))}
                          className="text-brand-violet text-xs font-medium hover:underline">Regénérer</button>
                      </label>
                      <input type="text" value={addForm.password} onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))}
                        className={`${iCls} font-mono`} />
                    </div>
                  ) : addForm.boutique_id ? (
                    <p className="text-xs text-gray-400 bg-gray-50 rounded-xl px-3 py-2.5">
                      Le mot de passe partagé actuel de la boutique lui sera envoyé par email — aucun mot de passe à saisir ici.
                    </p>
                  ) : null}
                  <button onClick={addAdmin} disabled={addLoading}
                    className="w-full bg-brand-violet text-white py-3 rounded-xl font-semibold text-sm hover:bg-brand-violet-dark transition-colors disabled:opacity-50 mt-2">
                    {addLoading ? 'Création…' : 'Créer l\'admin'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
