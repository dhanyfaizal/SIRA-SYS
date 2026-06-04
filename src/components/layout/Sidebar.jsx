import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, FileText, PlusCircle, BookOpen,
  ChevronRight, ChevronDown, LogOut,
  Users, Settings, GraduationCap, Shield, ClipboardCheck,
  BarChart2, Upload, Database, FolderOpen, Building2,
} from 'lucide-react'
import { useAuth }    from '@/contexts/AuthContext'
import { useSidebar } from './AppLayout'
import { useState, useEffect }   from 'react'
import { supabase }  from '@/lib/supabase'

const LOGO_URL = '/logo-sys.png'

const ROLE_META = {
  admin:    { label: 'Administrator',  color: 'badge-red'    },
  kaprodi:  { label: 'Ka. Prodi',      color: 'badge-indigo' },
  dosen:    { label: 'Dosen',          color: 'badge-amber'  },
  mahasiswa:{ label: 'Mahasiswa',      color: 'badge-green'  },
}

// ── Simple nav item ────────────────────────────────────────────
function NavItem({ label, icon: Icon, to, badge }) {
  return (
    <NavLink to={to} end={to === '/dashboard'}
      className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}>
      <Icon size={16} className="sidebar-icon" />
      {label}
      {badge && <span className="sidebar-badge">{badge}</span>}
    </NavLink>
  )
}

// ── Collapsible section ────────────────────────────────────────
function CollapseSection({ label, icon: Icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <button onClick={() => setOpen(v => !v)} style={{
        display:'flex', alignItems:'center', gap:8,
        width:'100%', padding:'8px 16px',
        background:'transparent', border:'none', cursor:'pointer',
        fontSize:13, fontWeight:500, color:'var(--gray-600)',
        borderRadius:6, transition:'background .15s', textAlign:'left',
      }}>
        <Icon size={16} style={{ color:'var(--gray-400)', flexShrink:0 }} />
        <span style={{ flex:1 }}>{label}</span>
        {open
          ? <ChevronDown size={13} style={{ color:'var(--gray-400)' }} />
          : <ChevronRight size={13} style={{ color:'var(--gray-400)' }} />
        }
      </button>
      {open && (
        <div style={{ position:'relative', marginLeft:16 }}>
          <div style={{ position:'absolute', left:15, top:0, bottom:4, width:1, background:'var(--gray-200)' }} />
          {children}
        </div>
      )}
    </div>
  )
}

// ── Indented sub-item ──────────────────────────────────────────
function SubItem({ label, icon: Icon, to }) {
  return (
    <NavLink to={to}
      className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
      style={{ paddingLeft: 30, fontSize: 12 }}>
      <Icon size={13} className="sidebar-icon" />
      {label}
    </NavLink>
  )
}

// ── Menu Dosen (dipakai juga oleh Kaprodi) ────────────────────
function DosenMenu() {
  return (
    <>
      <div className="sidebar-section-label">Beranda</div>
      <NavItem label="Dashboard" icon={LayoutDashboard} to="/dashboard" />

      <div className="sidebar-section-label">RPS Saya</div>
      <NavItem label="Daftar RPS"  icon={FileText}    to="/rps" />
      <NavItem label="Buat RPS Baru" icon={PlusCircle} to="/rps/new" />

      <div className="sidebar-section-label">Perkuliahan</div>
      <NavItem label="Buku Nilai (OBE)" icon={BarChart2} to="/dosen/gradebook" />
      <CollapseSection label="Mata Kuliah" icon={BookOpen}>
        {/* Diisi dinamis dari DB */}
        <div style={{ padding:'6px 16px 4px 32px', fontSize:11, color:'var(--gray-300)' }}>
          Belum ada mata kuliah
        </div>
      </CollapseSection>
    </>
  )
}

// ── Menu Mahasiswa ────────────────────────────────────────────
function MahasiswaMenu() {
  return (
    <>
      <div className="sidebar-section-label">Beranda</div>
      <NavItem label="Dashboard Saya" icon={LayoutDashboard} to="/dashboard" />
    </>
  )
}

// ── Menu Kaprodi (hanya muncul untuk role kaprodi) ────────────
function KaprodiMenu() {
  return (
    <>
      <div className="sidebar-divider" />
      <div className="sidebar-section-label">Manajemen Prodi</div>
      <NavItem label="Dashboard Prodi" icon={BarChart2}    to="/prodi/dashboard" />
      <NavItem label="Semua RPS Prodi" icon={FolderOpen}   to="/prodi/rps" />
      <NavItem label="Review RPS"     icon={ClipboardCheck} to="/prodi/review-rps" />
      <NavItem label="Review SPMI"     icon={Shield}        to="/prodi/spmi" />
      <NavItem label="Integrasi SIAKAD" icon={Database}      to="/prodi/siakad" />

      <div className="sidebar-section-label">Kurikulum & RAG</div>
      <NavItem label="Upload Kurikulum"    icon={Upload}   to="/kurikulum/upload" />
      <NavItem label="Repositori Kurikulum" icon={Database} to="/kurikulum" />

      <div className="sidebar-section-label">Data Master</div>
      <NavItem label="Daftar Mata Kuliah" icon={BookOpen}      to="/master/mk" />
      <NavItem label="Penugasan Dosen"    icon={Users}         to="/master/penugasan" />
      <NavItem label="Import CSV"         icon={Upload}        to="/master/import" />
    </>
  )
}

// ── Menu Admin ─────────────────────────────────────────────────
function AdminMenu() {
  const [prodiList, setProdiList] = useState([])

  useEffect(() => {
    supabase.from('program_studi').select('id, kode, nama').order('kode')
      .then(({ data }) => setProdiList(data ?? []))
  }, [])

  return (
    <>
      <div className="sidebar-section-label">Beranda</div>
      <NavItem label="Dashboard Admin" icon={LayoutDashboard} to="/dashboard" />

      <div className="sidebar-section-label">Manajemen Pengguna</div>
      <NavItem label="Daftar Pengguna" icon={Users}         to="/admin/users" />

      <div className="sidebar-section-label">Program Studi</div>
      <NavItem label="Daftar Prodi" icon={Building2} to="/admin/prodi" />
      {prodiList.map(p => (
        <SubItem key={p.id} label={p.nama} icon={GraduationCap} to={`/admin/prodi/${p.kode.toLowerCase()}`} />
      ))}

      <div className="sidebar-section-label">Sistem</div>
      <NavItem label="Pengaturan" icon={Settings} to="/admin/settings" />
    </>
  )
}

// ── Main Sidebar ───────────────────────────────────────────────
export default function Sidebar() {
  const { role, profile, signOut } = useAuth()
  const { open } = useSidebar()

  const roleMeta    = ROLE_META[role]
  const showDosen   = role === 'dosen' || role === 'kaprodi'
  const showKaprodi = role === 'kaprodi'
  const showAdmin   = role === 'admin'
  const showMahasiswa = role === 'mahasiswa'

  return (
    <aside className="app-sidebar"
      style={{ width: open ? 'var(--sidebar-w)' : 0, overflow: open ? 'visible' : 'hidden', transition:'width .22s ease', minWidth: open ? 'var(--sidebar-w)' : 0 }}>

      {/* Logo */}
      <div className="sidebar-logo">
        <img src={LOGO_URL} alt="STIKOM" className="sidebar-logo-img" onError={e => e.target.style.display='none'} />
        <div>
          <div className="sidebar-logo-brand">SIRA-SYS</div>
          <div className="sidebar-logo-sub">STIKOM Yos Sudarso</div>
        </div>
      </div>

      {/* Role badge */}
      <div style={{ padding:'10px 16px 4px', minHeight:34 }}>
        {roleMeta
          ? <span className={`badge-pill ${roleMeta.color}`}>{roleMeta.label}</span>
          : <div style={{ height:20, width:80, borderRadius:99 }} className="skeleton" />
        }
      </div>

      {/* Navigation */}
      <nav style={{ flex:1, paddingBottom:8, overflowY:'auto' }}>
        {showDosen  && <DosenMenu />}
        {showKaprodi && <KaprodiMenu />}
        {showAdmin  && <AdminMenu />}
        {showMahasiswa && <MahasiswaMenu />}

        {/* Profil & Pengaturan — semua role */}
        {role && (
          <>
            <div className="sidebar-divider" />
            <div className="sidebar-section-label">Profil & Pengaturan</div>
            <NavItem label="Profil Saya"      icon={GraduationCap} to="/profile" />
            <NavItem label="Pengaturan AI Key" icon={Settings}      to="/settings/ai" />
          </>
        )}
      </nav>

      {/* Logout */}
      <div style={{ borderTop:'1px solid var(--gray-100)', padding:'10px 8px' }}>
        {profile && (
          <div style={{ padding:'4px 8px 8px', fontSize:12, color:'var(--gray-400)', fontWeight:500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
            {profile.nama_lengkap}
            {profile.nidn && <span style={{ marginLeft:6, opacity:.6 }}>{profile.nidn}</span>}
          </div>
        )}
        <button onClick={signOut}
          style={{ display:'flex', alignItems:'center', gap:8, width:'100%', padding:'8px 12px', borderRadius:6, border:'1px solid #fecaca', background:'#fff1f2', color:'#dc2626', fontSize:13, fontWeight:600, cursor:'pointer', transition:'background .12s' }}
          onMouseEnter={e => e.currentTarget.style.background='#fee2e2'}
          onMouseLeave={e => e.currentTarget.style.background='#fff1f2'}>
          <LogOut size={15} />
          Keluar
        </button>
      </div>
    </aside>
  )
}
