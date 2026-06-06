import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

export default function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Fetch atau buat profile — berjalan di background, tidak memblokir loading
  async function fetchProfile(authUser) {
    if (!authUser?.id) return

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (!error && data) {
        // Kalau nama masih kosong, update dari Google metadata
        const meta = authUser.user_metadata ?? {}
        if (!data.nama_lengkap && meta.full_name) {
          await supabase.from('profiles').update({
            nama_lengkap: meta.full_name,
            foto_url:     meta.avatar_url || meta.picture || null,
          }).eq('id', authUser.id)
          setProfile({ ...data, nama_lengkap: meta.full_name, foto_url: meta.avatar_url || null })
        } else {
          setProfile(data)
        }
        return
      }

      // Profile tidak ada — buat dari Google metadata
      const meta   = authUser.user_metadata ?? {}
      const nama   = meta.full_name || meta.name || authUser.email?.split('@')[0] || 'Pengguna'
      const foto   = meta.avatar_url || meta.picture || null

      const { data: newProfile, error: upsertError } = await supabase
        .from('profiles')
        .upsert({ id: authUser.id, nama_lengkap: nama, email: authUser.email, foto_url: foto, role: 'dosen' },
                 { onConflict: 'id' })
        .select()
        .single()

      if (upsertError || !newProfile) {
        console.error('Failed to create user profile:', upsertError)
        await signOut()
        return
      }

      setProfile(newProfile)

    } catch (err) {
      console.error('Error in fetchProfile:', err)
      await signOut()
    }
  }

  useEffect(() => {
    let active = true

    async function initializeAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user && active) {
          setUser(session.user)
          fetchProfile(session.user).catch(console.error)
        }
      } catch (err) {
        console.error('Error during auth initialization:', err)
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    initializeAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          setUser(session.user)
          fetchProfile(session.user).catch(console.error)
        } else {
          setUser(null)
          setProfile(null)
        }
      }
    )

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        // hd dihapus — domain check dilakukan di fetchProfile (whitelist by profiles table)
      },
    })
    if (error) throw error
  }

  async function signOut() {
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.error('Error during supabase.auth.signOut:', err)
    } finally {
      setUser(null)
      setProfile(null)
    }
  }

  const role = profile?.role ?? null

  return (
    <AuthContext.Provider value={{ user, profile, role, loading, signInWithGoogle, signOut, fetchProfile }}>
      {children}
    </AuthContext.Provider>
  )
}
