'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { AuthUser } from '@/lib/types'

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchUser = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      setUser(null)
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, restaurant_id, full_name')
      .eq('id', authUser.id)
      .single()

    setUser({
      id: authUser.id,
      email: authUser.email!,
      role: profile?.role ?? 'restaurant_admin',
      restaurant_id: profile?.restaurant_id ?? null,
      full_name: profile?.full_name ?? null,
    })
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchUser()
    })

    return () => subscription.unsubscribe()
  }, [fetchUser, supabase.auth])

  const signOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return { user, loading, signOut, refetch: fetchUser }
}
