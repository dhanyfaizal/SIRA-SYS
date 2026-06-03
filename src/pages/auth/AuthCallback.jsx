import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth }  from '@/contexts/AuthContext'

export default function AuthCallback() {
  const navigate     = useNavigate()
  const { fetchProfile } = useAuth()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        // fetchProfile sudah dipanggil di AuthContext via onAuthStateChange
        navigate('/dashboard', { replace: true })
      } else {
        navigate('/login', { replace: true })
      }
    })
  }, [])

  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', flexDirection:'column', gap:16 }}>
      <div className="spinner" />
      <p style={{ fontSize:14, color:'var(--gray-500)' }}>Memverifikasi akun…</p>
    </div>
  )
}
