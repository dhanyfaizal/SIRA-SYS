import { Toaster } from 'react-hot-toast'
import AuthProvider  from '@/contexts/AuthContext'
import ThemeProvider from '@/contexts/ThemeContext'
import AppRouter     from '@/router'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRouter />
        <Toaster
          position="top-right"
          toastOptions={{
            style: { fontFamily:'Inter, sans-serif', fontSize:13 },
            success: { style: { background:'#d1fae5', color:'#065f46', border:'1px solid #a7f3d0' } },
            error:   { style: { background:'#fee2e2', color:'#991b1b', border:'1px solid #fecaca' } },
          }}
        />
      </AuthProvider>
    </ThemeProvider>
  )
}
