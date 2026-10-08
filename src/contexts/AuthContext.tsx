import React, { createContext, useContext, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

interface AdminProfile {
  id: string
  username: string
  full_name: string
  last_login: string | null
}

interface AuthContextType {
  user: User | null
  adminProfile: AdminProfile | null
  isAdmin: boolean
  isLoading: boolean
  login: (usernameOrEmail: string, password: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null)
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const fetchAdminProfile = async (userId: string): Promise<AdminProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (!error && data) {
        setAdminProfile(data as AdminProfile)
        setIsAdmin(true)
        return data as AdminProfile
      } else {
        setAdminProfile(null)
        setIsAdmin(false)
        return null
      }
    } catch (e) {
      console.error('Error fetching admin profile:', e)
      setIsAdmin(false)
      setAdminProfile(null)
      return null
    }
  }

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setIsLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (currentUser) {
        fetchAdminProfile(currentUser.id).finally(() => setIsLoading(false))
      } else {
        setIsLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (currentUser) {
        fetchAdminProfile(currentUser.id)
      } else {
        setAdminProfile(null)
        setIsAdmin(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const login = async (usernameOrEmail: string, password: string) => {
    if (!isSupabaseConfigured()) {
      return { ok: false, error: 'Supabase belum dikonfigurasi pada file .env' }
    }

    const email = usernameOrEmail.includes('@')
      ? usernameOrEmail.trim()
      : `${usernameOrEmail.trim().toLowerCase()}@nkksmart.local`

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return { ok: false, error: 'Username atau password salah' }
      }

      if (data.user) {
        const profile = await fetchAdminProfile(data.user.id)
        if (!profile) {
          await supabase.auth.signOut()
          return { ok: false, error: 'Username atau password salah' }
        }
        // Update last login
        await supabase
          .from('admins')
          .update({ last_login: new Date().toISOString() })
          .eq('id', data.user.id)
      }

      return data.user ? { ok: true } : { ok: false, error: 'Username atau password salah' }
    } catch (err: unknown) {
      console.error('Admin login failed:', err)
      return { ok: false, error: 'Username atau password salah' }
    }
  }

  const logout = async () => {
    try {
      await supabase.auth.signOut()
    } finally {
      setUser(null)
      setAdminProfile(null)
      setIsAdmin(false)
    }
  }

  return (
    <AuthContext.Provider value={{ user, adminProfile, isAdmin, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
