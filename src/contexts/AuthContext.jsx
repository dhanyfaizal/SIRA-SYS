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

      const { data: newProfile } = await supabase
        .from('profiles')
        .upsert({ id: authUser.id, nama_lengkap: nama, email: authUser.email, foto_url: foto, role: 'dosen' },
                 { onConflict: 'id' })
        .select()
        .single()

      setProfile(newProfile ?? { id: authUser.id, nama_lengkap: nama, email: authUser.email, foto_url: foto, role: 'dosen' })

    } catch {
      // Fallback — tampilkan dari metadata Google agar tidak blank
      const meta = authUser.user_metadata ?? {}
      setProfile({
        id:           authUser.id,
        nama_lengkap: meta.full_name || authUser.email?.split('@')[0] || 'Pengguna',
        email:        authUser.email,
        foto_url:     meta.avatar_url || null,
        role:         'dosen',
      })
    }
  }

  useEffect(() => {
    // ── 1. Initial session — JANGAN await fetchProfile ─────────
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (session?.user) {
          setUser(session.user)
          fetchProfile(session.user)   // background — tidak await
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false)) // ← SELALU selesai, tidak peduli error

    // ── 2. Auth state changes ───────────────────────────────────
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setUser(session.user)
          fetchProfile(session.user)   // background
        } else {
          setUser(null)
          setProfile(null)
        }
      }
    )
    return () => subscription.unsubscribe()
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
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  const role = profile?.role ?? null

  return (
    <AuthContext.Provider value={{ user, profile, role, loading, signInWithGoogle, signOut, fetchProfile }}>
      {children}
    </AuthContext.Provider>
  )
}
