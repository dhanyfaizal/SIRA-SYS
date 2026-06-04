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
import DashboardMahasiswa from '@/pages/dashboard/DashboardMahasiswa'
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

// ── Protected route ────────────────────────────────────────────
function ProtectedRoute({ children, allowedRoles }) {
  const { user, role, loading } = useAuth()

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', flexDirection:'column', gap:16 }}>
      <div className="spinner" />
      <p style={{ fontSize:13, color:'var(--gray-400)' }}>Memuat…</p>
    </div>
  )

  if (!user) return <Navigate to="/login" replace />
  if (allowedRoles && !allowedRoles.includes(role)) return <Navigate to="/dashboard" replace />
  return children
}

// ── Dashboard router — pilih berdasarkan role ──────────────────
function DashboardRouter() {
  const { role } = useAuth()
  if (role === 'admin')   return <DashboardAdmin />
  if (role === 'kaprodi') return <DashboardKaprodi />
  if (role === 'mahasiswa') return <DashboardMahasiswa />
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
          <Route path="/kurikulum"       element={<ProtectedRoute allowedRoles={['kaprodi']}><KurikulumPage /></ProtectedRoute>} />
          <Route path="/kurikulum/upload" element={<ProtectedRoute allowedRoles={['kaprodi']}><KurikulumUploadPage /></ProtectedRoute>} />
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
        <Route path="/kurikulum/print" element={<ProtectedRoute allowedRoles={['kaprodi']}><KurikulumPrintPage /></ProtectedRoute>} />

        {/* Fallback */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
