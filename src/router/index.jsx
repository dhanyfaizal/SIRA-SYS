import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

// Layout
import AppLayout    from '@/components/layout/AppLayout'

// Auth
import Login        from '@/pages/auth/Login'
import AuthCallback from '@/pages/auth/AuthCallback'

// Dashboards
import DashboardDosen   from '@/pages/dashboard/DashboardDosen'
import DashboardKaprodi from '@/pages/dashboard/DashboardKaprodi'
import DashboardAdmin   from '@/pages/dashboard/DashboardAdmin'
import LecturerGradebookPage from '@/pages/dosen/LecturerGradebookPage'

// Public Pages
import PublicDirectoryPage from '@/pages/public/PublicDirectoryPage'
import RpsPublicViewPage   from '@/pages/public/RpsPublicViewPage'
import SiakadIntegrationPage from '@/pages/settings/SiakadIntegrationPage'

// Mata Kuliah & Penugasan (Kaprodi)
import MataKuliahPage from '@/pages/mata-kuliah/MataKuliahPage'
import PenugasanPage  from '@/pages/penugasan/PenugasanPage'

// RPS (Dosen)
import RpsListPage   from '@/pages/rps/RpsListPage'
import RpsFormPage   from '@/pages/rps/RpsFormPage'
import RpsDetailPage from '@/pages/rps/RpsDetailPage'
import RpsEditPage   from '@/pages/rps/RpsEditPage'
import ProdiRpsPage  from '@/pages/rps/ProdiRpsPage'
import RpsPrintPage  from '@/pages/rps/RpsPrintPage'
import ReviewRpsListPage   from '@/pages/rps/ReviewRpsListPage'
import RpsReviewPage       from '@/pages/rps/RpsReviewPage'
import RpsReviewPrintPage  from '@/pages/rps/RpsReviewPrintPage'

// Kurikulum (Kaprodi)
import KurikulumPage       from '@/pages/kurikulum/KurikulumPage'
import KurikulumUploadPage from '@/pages/kurikulum/KurikulumUploadPage'
import KurikulumPrintPage  from '@/pages/kurikulum/KurikulumPrintPage'

// Admin
import AdminUsersPage from '@/pages/admin/AdminUsersPage'
import AdminProdiPage from '@/pages/admin/AdminProdiPage'
import AiSettingsPage from '@/pages/settings/AiSettingsPage'

function UnverifiedScreen() {
  const { signOut, profile } = useAuth()
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await signOut()
    } catch (err) {
      console.error(err)
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: '#f1f5f9', padding: '0 16px', fontFamily: "'Inter', system-ui, sans-serif",
      zIndex: 9999
    }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ height: 4, borderRadius: '8px 8px 0 0', background: 'linear-gradient(to right, #f59e0b, #d97706)' }} />
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderTop: 'none', borderRadius: '0 0 8px 8px', padding: '36px 32px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 24 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 32 }}>⏳</span>
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1f2937', margin: '0 0 8px 0' }}>Akun Belum Aktif</h1>
            <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5, margin: 0 }}>
              Akun Anda <strong>{profile?.email}</strong> terdaftar, tetapi belum disetujui oleh Administrator SIRA-SYS.
            </p>
          </div>
          <div style={{ borderTop: '1px solid #f1f5f9', marginBottom: 20 }} />
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '12px 14px', fontSize: 12.5, color: '#4b5563', lineHeight: 1.6, marginBottom: 24 }}>
            💡 <strong>Langkah Selanjutnya:</strong><br />
            Silakan hubungi Administrator atau Kepala Program Studi Anda untuk memverifikasi dan mengaktifkan akun Anda agar dapat mengakses dashboard SIRA-SYS.
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="btn btn-secondary"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 16px', fontWeight: 600 }}
          >
            {loggingOut ? 'Mengeluarkan...' : 'Keluar dari Akun'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Protected route ────────────────────────────────────────────
function ProtectedRoute({ children, allowedRoles }) {
  const { user, role, profile, loading } = useAuth()

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', flexDirection:'column', gap:16 }}>
      <div className="spinner" />
      <p style={{ fontSize:13, color:'var(--gray-400)' }}>Memuat…</p>
    </div>
  )

  if (!user) return <Navigate to="/login" replace />

  // Gating status verifikasi: jika profile dimuat dan is_verified === false, tampilkan UnverifiedScreen
  if (profile && profile.is_verified === false) {
    return <UnverifiedScreen />
  }

  if (allowedRoles && !allowedRoles.includes(role)) return <Navigate to="/dashboard" replace />
  return children
}

// ── Dashboard router — pilih berdasarkan role ──────────────────
function DashboardRouter() {
  const { role } = useAuth()
  if (role === 'admin')   return <DashboardAdmin />
  if (role === 'kaprodi') return <DashboardKaprodi />
  return <DashboardDosen />  // dosen (default)
}

// ── Placeholder pages ──────────────────────────────────────────
function ComingSoon({ title }) {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{title}</h1>
      </div>
      <div className="card">
        <div className="card-body">
          <div className="empty-state">
            <div className="empty-state-icon">🚧</div>
            <div className="empty-state-text">Halaman Dalam Pengembangan</div>
            <div className="empty-state-sub">Fitur ini akan tersedia pada Fase berikutnya.</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AppRouter() {
  const { user, loading } = useAuth()

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', flexDirection:'column', gap:16 }}>
      <div className="spinner" style={{ width:36, height:36 }} />
      <p style={{ fontSize:13, color:'var(--gray-400)' }}>Memuat SIRA-SYS…</p>
    </div>
  )

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login"         element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Protected app routes */}
        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<DashboardRouter />} />

          {/* Dosen & Kaprodi */}
          <Route path="/rps"          element={<RpsListPage />} />
          <Route path="/rps/new"      element={<RpsFormPage />} />
          <Route path="/rps/:id/edit" element={<RpsEditPage />} />
          <Route path="/rps/:id"      element={<RpsDetailPage />} />
          <Route path="/dosen/gradebook" element={<ProtectedRoute allowedRoles={['dosen', 'kaprodi']}><LecturerGradebookPage /></ProtectedRoute>} />
          <Route path="/profile"      element={<ComingSoon title="Profil Saya" />} />
          <Route path="/settings/ai"  element={<AiSettingsPage />} />
          <Route path="/settings"     element={<ComingSoon title="Pengaturan" />} />

          {/* Kaprodi only */}
          <Route path="/prodi/dashboard" element={<ProtectedRoute allowedRoles={['kaprodi']}><DashboardKaprodi /></ProtectedRoute>} />
          <Route path="/prodi/rps"       element={<ProtectedRoute allowedRoles={['kaprodi']}><ProdiRpsPage /></ProtectedRoute>} />
          <Route path="/prodi/review-rps" element={<ProtectedRoute allowedRoles={['kaprodi']}><ReviewRpsListPage /></ProtectedRoute>} />
          <Route path="/prodi/spmi"      element={<ProtectedRoute allowedRoles={['kaprodi']}><ComingSoon title="Review SPMI" /></ProtectedRoute>} />
          <Route path="/prodi/siakad"    element={<ProtectedRoute allowedRoles={['kaprodi']}><SiakadIntegrationPage /></ProtectedRoute>} />
          <Route path="/kurikulum"       element={<ProtectedRoute allowedRoles={['kaprodi', 'admin']}><KurikulumPage /></ProtectedRoute>} />
          <Route path="/kurikulum/upload" element={<ProtectedRoute allowedRoles={['kaprodi', 'admin']}><KurikulumUploadPage /></ProtectedRoute>} />
          <Route path="/master/mk"       element={<ProtectedRoute allowedRoles={['kaprodi','admin']}><MataKuliahPage /></ProtectedRoute>} />
          <Route path="/master/penugasan" element={<ProtectedRoute allowedRoles={['kaprodi','admin']}><PenugasanPage /></ProtectedRoute>} />
          <Route path="/master/import"   element={<ProtectedRoute allowedRoles={['kaprodi']}><ComingSoon title="Import CSV" /></ProtectedRoute>} />

          {/* Admin only */}
          <Route path="/admin/users"    element={<ProtectedRoute allowedRoles={['admin']}><AdminUsersPage /></ProtectedRoute>} />
          <Route path="/admin/prodi"    element={<ProtectedRoute allowedRoles={['admin']}><AdminProdiPage /></ProtectedRoute>} />
          <Route path="/admin/prodi/:kode" element={<ProtectedRoute allowedRoles={['admin']}><ComingSoon title="Detail Program Studi" /></ProtectedRoute>} />
          <Route path="/admin/roles"    element={<ProtectedRoute allowedRoles={['admin']}><ComingSoon title="Kelola Role" /></ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={['admin']}><ComingSoon title="Pengaturan Sistem" /></ProtectedRoute>} />
          <Route path="/rps/:id/review" element={<ProtectedRoute allowedRoles={['kaprodi','dosen']}><RpsReviewPage /></ProtectedRoute>} />

        </Route>

        {/* Public Routes (No Auth) */}
        <Route path="/public" element={<PublicDirectoryPage />} />
        <Route path="/rps/public/:token" element={<RpsPublicViewPage />} />

        {/* Standalone Protected Print Page */}
        <Route path="/rps/:id/print" element={<ProtectedRoute><RpsPrintPage /></ProtectedRoute>} />
        <Route path="/rps/:id/review/print" element={<ProtectedRoute><RpsReviewPrintPage /></ProtectedRoute>} />
        <Route path="/kurikulum/print" element={<ProtectedRoute allowedRoles={['kaprodi', 'admin']}><KurikulumPrintPage /></ProtectedRoute>} />

        {/* Fallback */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
