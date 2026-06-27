'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import Link from 'next/link'
import { UserPlus, Users, Key, Eye, EyeOff, CheckCircle, Trash2 } from 'lucide-react'
import { formatDate, getInitials } from '@/lib/utils'
import type { Profile } from '@/lib/types'

export default function UsersPage() {
  const supabase = createClient()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  const [resetModal, setResetModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('profiles').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setProfiles(data ?? []); setLoading(false) })
  }, [supabase])

  async function handleDeleteUser(p: Profile) {
    if (!confirm(`Supprimer définitivement ${p.email} ? Cette action est irréversible.`)) return
    await fetch('/api/admin/remove-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile_id: p.id, action: 'delete' }),
    })
    setProfiles(prev => prev.filter(u => u.id !== p.id))
  }

  function openReset(p: Profile) {
    setSelectedUser(p)
    setNewPassword('')
    setResetSuccess(false)
    setResetError(null)
    setResetModal(true)
  }

  async function handleReset() {
    if (!selectedUser || !newPassword || newPassword.length < 8) {
      setResetError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }
    setResetting(true)
    setResetError(null)
    const res = await fetch('/api/admin/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: selectedUser.id, new_password: newPassword }),
    })
    const data = await res.json()
    setResetting(false)
    if (!res.ok) { setResetError(data.error || 'Erreur inconnue'); return }
    setResetSuccess(true)
  }

  function generatePassword() {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#'
    let pwd = ''
    for (let i = 0; i < 12; i++) pwd += chars[Math.floor(Math.random() * chars.length)]
    setNewPassword(pwd)
    setShowPassword(true)
  }

  return (
    <div className="p-6 sm:p-8 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Utilisateurs</h1>
          <p className="text-gray-500 text-sm mt-1">{profiles.length} compte(s) enregistré(s)</p>
        </div>
        <Link href="/dashboard/super-admin/create-admin" className="inline-flex items-center gap-2 bg-brand-orange hover:bg-brand-orange-dark text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
          <UserPlus className="w-4 h-4" />Créer admin
        </Link>
      </div>

      {loading ? (
        <div className="text-gray-500 text-sm text-center py-12">Chargement...</div>
      ) : !profiles.length ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-gray-500" />
          </div>
          <h3 className="text-gray-900 font-semibold text-lg mb-2">Aucun utilisateur</h3>
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-100">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Utilisateur</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Rôle</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Restaurant</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Inscrit le</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((p: Profile) => (
                  <tr key={p.id} className="border-b border-gray-200 hover:bg-gray-100 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {getInitials(p.full_name || p.email)}
                        </div>
                        <div>
                          <p className="text-gray-900 text-sm font-medium">{p.full_name || 'Sans nom'}</p>
                          <p className="text-gray-500 text-xs truncate max-w-[200px]">{p.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <Badge variant={p.role === 'super_admin' ? 'orange' : 'info'}>
                        {p.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <Badge variant={p.restaurant_id ? 'success' : 'warning'}>
                        {p.restaurant_id ? 'Assigné' : 'Non assigné'}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-gray-500 text-xs hidden lg:table-cell">{formatDate(p.created_at)}</td>
                    <td className="px-5 py-4">
                      {p.role !== 'super_admin' && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openReset(p)}
                            className="inline-flex items-center gap-1.5 bg-gray-200 hover:bg-gray-200 text-gray-500 hover:text-gray-900 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                          >
                            <Key className="w-3 h-3" />Mot de passe
                          </button>
                          <button
                            onClick={() => handleDeleteUser(p)}
                            className="inline-flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />Supprimer
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reset password modal */}
      <Modal open={resetModal} onClose={() => setResetModal(false)} title="Réinitialiser le mot de passe" size="sm">
        {resetSuccess ? (
          <div className="flex flex-col items-center text-center py-4 gap-3">
            <CheckCircle className="w-12 h-12 text-green-400" />
            <p className="text-gray-900 font-semibold">Mot de passe mis à jour !</p>
            <p className="text-gray-500 text-sm">Le nouveau mot de passe a été enregistré avec succès.</p>
            <div className="w-full bg-gray-100 rounded-xl px-4 py-3 font-mono text-brand-orange text-sm break-all text-center">
              {newPassword}
            </div>
            <p className="text-gray-500 text-xs">Copiez et transmettez ce mot de passe à l&apos;administrateur.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-gray-100 rounded-xl px-4 py-3">
              <p className="text-gray-500 text-xs mb-0.5">Compte</p>
              <p className="text-gray-900 text-sm font-medium">{selectedUser?.full_name || selectedUser?.email}</p>
            </div>
            {resetError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">{resetError}</div>
            )}
            <div>
              <label className="text-gray-500 text-xs block mb-1.5">Nouveau mot de passe</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 caractères"
                  className="w-full bg-gray-100 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/50 pr-10"
                />
                <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-900 transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button onClick={generatePassword} className="w-full text-sm text-brand-orange hover:underline text-left">
              Générer un mot de passe aléatoire
            </button>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setResetModal(false)} className="flex-1 bg-gray-100 hover:bg-gray-100 text-gray-900 py-2.5 rounded-xl text-sm font-semibold transition-colors">
                Annuler
              </button>
              <button
                onClick={handleReset}
                disabled={resetting}
                className="flex-1 bg-brand-orange hover:bg-brand-orange-dark text-white py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60"
              >
                {resetting ? 'En cours...' : 'Mettre à jour'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
