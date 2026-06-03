import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { dbRPS } from '@/lib/db'
import { 
  ArrowLeft, Download, FileText, CheckCircle, 
  Clock, AlertCircle, Info, BookOpen, Calendar, BarChart2 
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function RpsPublicViewPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  
  const [rps, setRps] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadPublicRps() {
      setLoading(true)
      try {
        const { data, error } = await dbRPS.getByPublicToken(token)
        if (error || !data) {
          toast.error('Dokumen RPS publik tidak ditemukan atau token tidak valid.')
          navigate('/public')
          return
        }
        setRps(data)
      } catch (err) {
        console.error('Error fetching public rps:', err)
        toast.error('Gagal memuat dokumen: ' + err.message)
        navigate('/public')
      } finally {
        setLoading(false)
      }
    }

    if (token) {
      loadPublicRps()
    }
  }, [token])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 16 }}>
        <div className="spinner" style={{ width: 32, height: 32 }} />
        <p style={{ color: '#94a3b8', fontSize: 13 }}>Memuat berkas RPS publik...</p>
      </div>
    )
  }

  if (!rps) return null

  const cp = rps.capaian_pembelajaran ?? {}
  const renc = rps.rencana_pembelajaran ?? []
  const pen = rps.penilaian ?? {}
  const ref = rps.referensi ?? []
  const mk = rps.mk ?? {}

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', paddingBottom: 60, fontFamily: "'Inter', system-ui, sans-serif" }}>
      
      {/* Top action header (sticky) */}
      <div style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
      }} className="no-print">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/public')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <ArrowLeft size={14} /> Kembali ke Direktori
        </button>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="badge-pill badge-green" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', fontSize: '11px', fontWeight: 700 }}>
            <CheckCircle size={12} /> RPS Resmi Terpublikasi
          </span>
          <button 
            className="btn btn-secondary btn-sm" 
            onClick={() => window.print()}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Download size={13} /> Cetak / PDF
          </button>
        </div>
      </div>

      {/* Main Document Content */}
      <div style={{ maxWidth: 860, margin: '24px auto 0', padding: '0 16px' }} className="print-container">
        
        {/* Course Main Title Header */}
        <div className="card" style={{ marginBottom: 20, background: 'linear-gradient(135deg, #4f46e5 0%, #312e81 100%)', color: '#ffffff', border: 'none' }}>
          <div className="card-body" style={{ padding: '28px 32px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', opacity: 0.8, marginBottom: 6 }}>
              {mk.prodi?.nama || 'Program Studi STIKOM'}
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.5px', lineHeight: 1.3 }}>
              {mk.nama_mk}
            </h1>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, opacity: 0.9, fontWeight: 500 }}>
              <span>Kode: <strong>{mk.kode_mk}</strong></span>
              <span>•</span>
              <span>Beban: <strong>{mk.sks} SKS</strong></span>
              <span>•</span>
              <span>Semester: <strong>{mk.semester}</strong></span>
              <span>•</span>
              <span>T.A: <strong>{rps.tahun_akademik} ({rps.semester_aktif})</strong></span>
            </div>
          </div>
        </div>

        {/* SECTION 1: Identitas & Deskripsi */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>Identitas & Deskripsi Mata Kuliah</span>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 2 }}>Dosen Pengampu Utama</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{rps.dosen?.nama_lengkap || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 2 }}>NIDN</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{rps.dosen?.nidn || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 2 }}>Status Dokumen</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#10b981' }}>Disetujui Ka. Prodi</div>
              </div>
            </div>

            {rps.deskripsi_mk && (
              <div style={{ marginTop: 18, padding: '12px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 6 }}>Deskripsi Perkuliahan</div>
                <p style={{ fontSize: 13, color: '#334155', lineHeight: 1.6, margin: 0 }}>{rps.deskripsi_mk}</p>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 2: Capaian Pembelajaran (OBE) */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>Capaian Pembelajaran (OBE)</span>
          </div>
          <div className="card-body">
            {/* CPL */}
            {(cp.cpl ?? []).length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 8 }}>
                  CPL — Capaian Pembelajaran Lulusan (Prodi)
                </div>
                {(cp.cpl ?? []).map((c, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, marginBottom: 6 }}>
                    <span className="badge-pill badge-indigo" style={{ flexShrink: 0 }}>CPL-{i + 1}</span>
                    <span style={{ color: '#334155' }}>{c}</span>
                  </div>
                ))}
              </div>
            )}

            {/* CPMK */}
            {(cp.cpmk ?? []).length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 8 }}>
                  CPMK — Capaian Pembelajaran Mata Kuliah
                </div>
                {(cp.cpmk ?? []).map((c, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, marginBottom: 6 }}>
                    <span className="badge-pill badge-green" style={{ flexShrink: 0 }}>{c.kode || `CPMK-${i + 1}`}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#334155', fontWeight: 600 }}>{c.deskripsi}</div>
                      {c.cpl_ref?.length > 0 && (
                        <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {c.cpl_ref.map(r => (
                            <span key={r} style={{ background: '#eef2ff', color: '#6366f1', borderRadius: 99, padding: '1px 8px', fontSize: 10, fontWeight: 700 }}>
                              Terhubung {r}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* SECTION 3: Rencana Pembelajaran 16 Pertemuan */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>Matriks Rencana Pertemuan Mingguan</span>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ width: 50, textAlign: 'center', padding: '12px' }}>Minggu</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Kemampuan Akhir / Bahan Kajian</th>
                    <th style={{ width: 140, padding: '12px', textAlign: 'left' }}>Metode Ajar</th>
                    <th style={{ width: 80, padding: '12px', textAlign: 'center' }}>Waktu</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Kriteria Penilaian</th>
                  </tr>
                </thead>
                <tbody>
                  {renc.map((p, i) => (
                    <tr key={i} style={{ 
                      background: p.is_uts ? '#fffbeb' : p.is_uas ? '#f0fdf4' : undefined,
                      borderBottom: '1px solid #e2e8f0'
                    }}>
                      <td style={{ textAlign: 'center', padding: '12px' }}>
                        <div style={{
                          width: 24, height: 24, borderRadius: '50%', margin: 'auto',
                          background: p.is_uts ? '#f59e0b' : p.is_uas ? '#10b981' : '#f1f5f9',
                          color: (p.is_uts || p.is_uas) ? '#fff' : '#64748b',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, fontWeight: 700
                        }}>
                          {p.no}
                        </div>
                        {p.is_uts && <div style={{ fontSize: 9, color: '#b45309', fontWeight: 700, marginTop: 2 }}>UTS</div>}
                        {p.is_uas && <div style={{ fontSize: 9, color: '#065f46', fontWeight: 700, marginTop: 2 }}>UAS</div>}
                      </td>
                      <td style={{ padding: '12px', fontSize: 12.5 }}>
                        <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>{p.kemampuan_akhir}</div>
                        <div style={{ color: '#64748b' }}>{p.bahan_kajian}</div>
                      </td>
                      <td style={{ padding: '12px', fontSize: 12 }}>{p.metode}</td>
                      <td style={{ padding: '12px', fontSize: 12, textAlign: 'center' }}>{p.waktu} mnt</td>
                      <td style={{ padding: '12px', fontSize: 12 }}>{p.kriteria_penilaian || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* SECTION 4: Komponen Penilaian */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>Komponen Penilaian Mata Kuliah</span>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
              {Object.entries(pen).filter(([, v]) => Number(v) > 0).map(([k, v]) => (
                <div key={k} style={{ padding: '12px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>
                    {k === 'uts' ? 'UTS' : k === 'uas' ? 'UAS' : k}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#4f46e5' }}>{v}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SECTION 5: Referensi Pustaka */}
        {ref.length > 0 && (
          <div className="card">
            <div className="card-header">
              <span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>Referensi Pustaka</span>
            </div>
            <div className="card-body">
              {ref.map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, marginBottom: 6 }}>
                  <span style={{ color: '#6366f1', fontWeight: 700 }}>[{i + 1}]</span>
                  <span style={{ color: '#334155' }}>{r}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
