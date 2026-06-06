import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Search, Filter, BookOpen, ExternalLink, RefreshCw, GraduationCap, ChevronRight, LogIn } from 'lucide-react'
import toast from 'react-hot-toast'

export default function PublicDirectoryPage() {
  const navigate = useNavigate()
  
  // States
  const [rpsList, setRpsList] = useState([])
  const [prodiList, setProdiList] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProdi, setSelectedProdi] = useState('')
  const [selectedSemester, setSelectedSemester] = useState('')

  useEffect(() => {
    async function loadPublicData() {
      setLoading(true)
      try {
        // 1. Fetch program_studi
        const { data: prodiData, error: prodiErr } = await supabase
          .from('program_studi')
          .select('id, kode, nama')
          .order('kode')
        if (prodiErr) throw prodiErr
        setProdiList(prodiData || [])

        // 2. Fetch approved RPS with public tokens
        const { data: rpsData, error: rpsErr } = await supabase
          .from('rps')
          .select(`
            id, public_token, tahun_akademik, semester_aktif, updated_at,
            dosen:profiles!dosen_id(nama_lengkap),
            mk:mata_kuliah!mk_id(id, kode_mk, nama_mk, sks, semester, prodi_id)
          `)
          .eq('status', 'approved')
          .not('public_token', 'is', null)

        if (rpsErr) throw rpsErr
        setRpsList(rpsData || [])
      } catch (err) {
        console.error('Error loading public directory:', err)
        toast.error('Gagal memuat direktori: ' + err.message)
      } finally {
        setLoading(false)
      }
    }

    loadPublicData()
  }, [])

  // Filtering in memory
  const filteredRps = rpsList.filter(item => {
    const mk = item.mk || {}
    const matchesSearch = 
      mk.nama_mk?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mk.kode_mk?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.dosen?.nama_lengkap?.toLowerCase().includes(searchQuery.toLowerCase())
      
    const matchesProdi = selectedProdi === '' || mk.prodi_id === selectedProdi
    const matchesSemester = selectedSemester === '' || String(mk.semester) === selectedSemester

    return matchesSearch && matchesProdi && matchesSemester
  })

  return (
    <div style={{ height: '100vh', overflowY: 'auto', backgroundColor: '#f8fafc', paddingBottom: 48, fontFamily: "'Inter', system-ui, sans-serif" }}>
      
      {/* Top Navbar */}
      <header style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '14px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo-sys.png" alt="STIKOM Logo" style={{ width: 36, height: 36, objectFit: 'contain' }} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', letterSpacing: '-0.3px' }}>SIRA-SYS</div>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>Direktori RPS Publik · STIKOM Yos Sudarso</div>
          </div>
        </div>
        
        <NavLink to="/login" className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 6 }}>
          <LogIn size={14} />
          <span>Masuk Sistem</span>
        </NavLink>
      </header>

      {/* Main Container */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>
        
        {/* Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
          borderRadius: 12,
          padding: '36px 32px',
          color: '#ffffff',
          marginBottom: 24,
          boxShadow: '0 4px 12px rgba(79, 70, 229, 0.15)'
        }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>Direktori Rencana Pembelajaran Semester (RPS)</h1>
          <p style={{ margin: '8px 0 0', fontSize: 14, opacity: 0.85, lineHeight: 1.5, maxWidth: 650 }}>
            Selamat datang di direktori kurikulum terbuka. Cari dan akses berkas RPS resmi mata kuliah di STIKOM Yos Sudarso secara mandiri untuk meninjau CPMK, CPL, dan rencana pembelajaran mingguan.
          </p>
        </div>

        {/* Filter Toolbar Card */}
        <div className="card" style={{ padding: '18px 24px', marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            
            {/* Search Input */}
            <div className="input-group" style={{ flex: 2, minWidth: 260, margin: 0 }}>
              <label className="input-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Search size={12} /> Cari Mata Kuliah / Dosen
              </label>
              <input 
                className="input" 
                placeholder="Contoh: Pemrograman Web, CPL-2, nama dosen..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Prodi Dropdown */}
            <div className="input-group" style={{ flex: 1, minWidth: 180, margin: 0 }}>
              <label className="input-label" style={{ fontWeight: 600 }}>Program Studi</label>
              <select className="input" value={selectedProdi} onChange={e => setSelectedProdi(e.target.value)}>
                <option value="">Semua Program Studi</option>
                {prodiList.map(p => (
                  <option key={p.id} value={p.id}>{p.nama}</option>
                ))}
              </select>
            </div>

            {/* Semester Dropdown */}
            <div className="input-group" style={{ flex: 1, minWidth: 120, margin: 0 }}>
              <label className="input-label" style={{ fontWeight: 600 }}>Semester</label>
              <select className="input" value={selectedSemester} onChange={e => setSelectedSemester(e.target.value)}>
                <option value="">Semua</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                  <option key={s} value={String(s)}>Semester {s}</option>
                ))}
              </select>
            </div>

          </div>
        </div>

        {/* Results Info */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, padding: '0 4px' }}>
          <div style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>
            Menampilkan <strong style={{ color: '#1e293b' }}>{filteredRps.length}</strong> dari {rpsList.length} RPS terpublikasi
          </div>
          {loading && <RefreshCw size={14} className="spinner" style={{ animation: 'spin 1s linear infinite', color: '#4f46e5' }} />}
        </div>

        {/* Directory Grid */}
        {loading && rpsList.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, flexDirection: 'column', gap: 12 }}>
            <RefreshCw className="spinner" size={24} style={{ animation: 'spin 1s linear infinite', color: '#4f46e5' }} />
            <p style={{ color: '#94a3b8', fontSize: 12.5 }}>Memuat direktori RPS...</p>
          </div>
        ) : filteredRps.length === 0 ? (
          <div className="card">
            <div className="card-body" style={{ textAlign: 'center', padding: '48px 24px' }}>
              <BookOpen size={36} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b', marginBottom: 4 }}>Tidak Ada RPS Cocok</div>
              <div style={{ fontSize: 12.5, color: '#64748b' }}>Coba ubah kata pencarian atau bersihkan filter prodi/semester Anda.</div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
            {filteredRps.map(item => {
              const mk = item.mk || {}
              const prodi = prodiList.find(p => p.id === mk.prodi_id)
              
              return (
                <div key={item.id} className="card" style={{
                  display: 'flex',
                  flexDirection: 'column',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  transition: 'transform 0.15s, box-shadow 0.15s',
                  background: '#ffffff',
                  cursor: 'pointer'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.04)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
                onClick={() => navigate(`/rps/public/${item.public_token}`)}>
                  
                  {/* Card Header */}
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <span className="badge-pill badge-indigo" style={{ fontSize: 9.5, padding: '2px 8px', fontWeight: 700 }}>
                        {prodi ? prodi.nama : 'STIKOM'}
                      </span>
                      <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
                        Smt {mk.semester} · {mk.sks} SKS
                      </span>
                    </div>
                    
                    <h3 style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', margin: '4px 0', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={mk.nama_mk}>
                      {mk.nama_mk}
                    </h3>
                    <div style={{ fontSize: 11.5, color: '#94a3b8', fontWeight: 600 }}>Kode: {mk.kode_mk}</div>
                  </div>

                  {/* Card Body */}
                  <div style={{ padding: '16px 20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: 12.5, color: '#475569', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#94a3b8' }}>Dosen Pengampu:</span>
                        <strong style={{ color: '#334155' }}>{item.dosen?.nama_lengkap || 'Tim Dosen'}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#94a3b8' }}>Tahun Akademik:</span>
                        <span style={{ fontWeight: 600 }}>{item.tahun_akademik} ({item.semester_aktif})</span>
                      </div>
                    </div>

                    {/* View Button */}
                    <div style={{ marginTop: 18, borderTop: '1px solid #f1f5f9', paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 10, color: '#cbd5e1' }}>
                        Terakhir diupdate: {new Date(item.updated_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      <button className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#4f46e5', fontWeight: 700, paddingRight: 0 }}>
                        Lihat RPS <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>

                </div>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}
