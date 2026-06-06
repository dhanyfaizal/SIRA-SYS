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
  const [teamMembers, setTeamMembers] = useState([])
  const [kaprodi, setKaprodi] = useState(null)
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

        // Ambil data Kaprodi untuk tanda tangan
        const prodiId = data.mk?.prodi?.id || data.mk?.prodi_id
        if (prodiId) {
          const { data: kaprodiData, error: kaprodiError } = await supabase
            .from('profiles')
            .select('nama_lengkap, nidn')
            .eq('prodi_id', prodiId)
            .eq('role', 'kaprodi')
            .limit(1)
          if (!kaprodiError && kaprodiData && kaprodiData.length > 0) {
            setKaprodi(kaprodiData[0])
          }
        }

        // Ambil data tim pengajar
        if (data.team_dosen && data.team_dosen.length > 0) {
          const { data: profiles, error: profilesErr } = await supabase
            .from('profiles')
            .select('id, nama_lengkap')
            .in('id', data.team_dosen)
          if (!profilesErr && profiles) {
            setTeamMembers(profiles)
          }
        } else {
          setTeamMembers([])
        }
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
  const cplList = (cp.cpl && cp.cpl.length > 0) ? cp.cpl : (mk.cpl ?? [])

  // Hitung total penilaian
  const totalPenilaian = Object.values(pen).reduce((a, b) => a + Number(b || 0), 0)

  // Tanggal penyusunan
  const tglPenyusunan = rps.created_at
    ? new Date(rps.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—'

  // Bahan kajian unik
  const listBahanKajian = renc
    .filter(p => !p.is_uts && !p.is_uas && p.bahan_kajian?.trim())
    .map(p => p.bahan_kajian.trim())
    .filter((v, i, self) => self.indexOf(v) === i)

  // Ekstrak Sub-CPMK unik (Kemampuan Akhir) secara terbalik (dari akhir ke awal) untuk diagram alur
  const uniqueSubCpmks = []
  const seen = new Set()
  renc.forEach(p => {
    if (p.is_uts || p.is_uas || !p.kemampuan_akhir?.trim()) return
    const text = p.kemampuan_akhir.trim()
    if (!seen.has(text)) {
      seen.add(text)
      uniqueSubCpmks.push(text)
    }
  })
  const flowchartSubCpmks = [...uniqueSubCpmks].reverse().slice(0, 6)

  const cpmkList = cp.cpmk ?? []

  return (
    <>
      {/* Styles khusus cetak PDF dan Layout */}
      <style>{`
        /* By default, hide print layout on screen */
        .print-layout-only {
          display: none !important;
        }

        @media print {
          /* Reset root limits to allow printing all pages */
          html, body, #root, #app, .app-shell, .app-main, .app-content, .public-scroll-container {
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            display: block !important;
            position: static !important;
            background: #ffffff !important;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            font-family: 'Times New Roman', serif !important;
          }
          .no-print, .public-scroll-container {
            display: none !important;
          }
          .print-layout-only {
            display: block !important;
            background: #ffffff !important;
            color: #000000 !important;
            font-family: 'Times New Roman', serif !important;
            line-height: 1.5 !important;
          }
          .page-break {
            page-break-before: always !important;
            break-before: page !important;
            height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
          }
          @page {
            size: A4;
            margin: 15mm;
          }
          /* Cover & Flowchart Page A4 Page Scaling */
          .cover-page {
            background-color: #4f46e5 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color: #ffffff !important;
            height: calc(297mm - 30mm) !important;
            min-height: calc(297mm - 30mm) !important;
            box-sizing: border-box !important;
            padding: 40px 30px !important;
            border: 3px double #ffffff !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            align-items: center !important;
            text-align: center !important;
          }
          .flowchart-page {
            height: calc(297mm - 30mm) !important;
            min-height: calc(297mm - 30mm) !important;
            box-sizing: border-box !important;
            padding: 15px 30px !important;
            border: none !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
          }
          .kop-table, .kop-table td {
            border: none !important;
          }
          .kop-border-line {
            border-bottom: 3px double #000000 !important;
          }
          .flowchart-node {
            background-color: #f1f5f9 !important;
            border: 1px solid #94a3b8 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          table.rps-table th {
            background-color: #f1f5f9 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          thead {
            display: table-header-group !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .yellow-header {
            background-color: #fef08a !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .gray-header {
            background-color: #f1f5f9 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .green-box {
            background-color: #d1fae5 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .blue-node {
            background-color: #eff6ff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .signature-section {
            display: flex !important;
            flex-direction: row !important;
            justify-content: space-around !important;
            align-items: stretch !important;
            margin-top: 50px !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .signature-box {
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            height: 140px !important;
            width: 45% !important;
          }
          
          .cover-title {
            font-size: 22pt !important;
            font-weight: bold !important;
            text-transform: uppercase !important;
            letter-spacing: 1px !important;
            line-height: 1.4 !important;
            margin-top: 20px !important;
          }
          .cover-logo {
            width: 160px !important;
            height: 160px !important;
            margin: 30px 0 !important;
            object-fit: contain !important;
            background: white !important;
            padding: 10px !important;
            border-radius: 50% !important;
          }
          .cover-info-table {
            width: 85% !important;
            margin: 40px auto !important;
            font-size: 13pt !important;
          }
          .cover-info-table td {
            padding: 6px 12px !important;
            border: none !important;
            color: inherit !important;
            text-align: left !important;
          }
          .cover-footer {
            font-size: 13pt !important;
            font-weight: bold !important;
            text-transform: uppercase !important;
            line-height: 1.6 !important;
          }
          .flowchart-title {
            background-color: #d1fae5 !important;
            color: #b91c1c !important;
            border: 2px solid #16a34a !important;
            padding: 6px 16px !important;
            font-size: 11pt !important;
            font-weight: bold !important;
            border-radius: 4px !important;
            margin-bottom: 15px !important;
            text-align: center !important;
            width: 70% !important;
            text-transform: uppercase !important;
          }
          .cpmk-box {
            background-color: #eff6ff !important;
            border: 2px solid #2563eb !important;
            padding: 8px 12px !important;
            width: 85% !important;
            text-align: center !important;
            border-radius: 6px !important;
            font-size: 9.5pt !important;
            font-weight: bold !important;
            color: #1e3a8a !important;
            margin-bottom: 6px !important;
          }
          .flowchart-node {
            background-color: #f8fafc !important;
            border: 1.5px solid #64748b !important;
            padding: 6px 12px !important;
            width: 80% !important;
            text-align: center !important;
            border-radius: 6px !important;
            font-size: 8.5pt !important;
            color: #334155 !important;
          }
          .flowchart-arrow {
            font-size: 10pt !important;
            color: #4f46e5 !important;
            font-weight: bold !important;
            margin: 1px 0 !important;
          }
          .kop-logo {
            width: 70px !important;
            height: 70px !important;
            object-fit: contain !important;
          }
          .kop-institution {
            font-size: 14pt !important;
            font-weight: bold !important;
            text-transform: uppercase !important;
            letter-spacing: 0.5px !important;
          }
          .kop-address {
            font-size: 9pt !important;
            margin-top: 4px !important;
            font-weight: normal !important;
          }
          .section-header-title {
            font-size: 12pt !important;
            font-weight: bold !important;
            text-transform: uppercase !important;
            background-color: #fef08a !important;
            padding: 6px 12px !important;
            border: 1.5px solid #000 !important;
            text-align: center !important;
            margin-bottom: 15px !important;
          }
          table.rps-table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-bottom: 20px !important;
            border: 1.5px solid #000 !important;
          }
          table.rps-table th, table.rps-table td {
            border: 1px solid #000000 !important;
            padding: 8px 10px !important;
            font-size: 9.5pt !important;
            text-align: left !important;
            vertical-align: top !important;
            line-height: 1.4 !important;
            color: #000000 !important;
          }
          table.rps-table th {
            font-weight: bold !important;
            text-align: center !important;
            background-color: #f1f5f9 !important;
          }
        }
      `}</style>

      {/* ===== Screen View ===== */}
      <div className="public-scroll-container no-print" style={{ height: '100vh', overflowY: 'auto', backgroundColor: '#f8fafc', paddingBottom: 60, fontFamily: "'Inter', system-ui, sans-serif" }}>
        {/* Top action header (sticky) — hidden on print */}
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
        }}>
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
        <div style={{ maxWidth: 860, margin: '24px auto 0', padding: '0 16px' }} className="public-rps-body">
          
          {/* Course Main Title Header (screen only) */}
          <div className="card public-hero-card" style={{ marginBottom: 20, background: 'linear-gradient(135deg, #4f46e5 0%, #312e81 100%)', color: '#ffffff', border: 'none' }}>
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
              <div className="identitas-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                <div>
                  <div className="identitas-label" style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 2 }}>Dosen Pengampu Utama</div>
                  <div className="identitas-value" style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{rps.dosen?.nama_lengkap || '—'}</div>
                </div>
                {teamMembers.length > 0 && (
                  <div>
                    <div className="identitas-label" style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 2 }}>Tim Pengajar</div>
                    <div className="identitas-value" style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{teamMembers.map(m => m.nama_lengkap).join(', ')}</div>
                  </div>
                )}
                <div>
                  <div className="identitas-label" style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 2 }}>NIDN</div>
                  <div className="identitas-value" style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{rps.dosen?.nidn || '—'}</div>
                </div>
                <div>
                  <div className="identitas-label" style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 2 }}>Status Dokumen</div>
                  <div className="identitas-value" style={{ fontSize: 13, fontWeight: 600, color: '#10b981' }}>Disetujui Ka. Prodi</div>
                </div>
              </div>

              {rps.deskripsi_mk && (
                <div className="deskripsi-box" style={{ marginTop: 18, padding: '12px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
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
              {cplList.length > 0 && (
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 8 }}>
                    CPL — Capaian Pembelajaran Lulusan (Prodi)
                  </div>
                  {cplList.map((c, i) => (
                    <div key={i} className="cp-item" style={{ display: 'flex', gap: 10, padding: '8px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, marginBottom: 6 }}>
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
                    <div key={i} className="cp-item" style={{ display: 'flex', gap: 10, padding: '10px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, marginBottom: 6 }}>
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
                <table className="public-rps-table" style={{ borderCollapse: 'collapse', width: '100%' }}>
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
                      <tr key={i} className={p.is_uts ? 'row-uts' : p.is_uas ? 'row-uas' : ''} style={{ 
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
              <div className="penilaian-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
                {Object.entries(pen).filter(([, v]) => Number(v) > 0).map(([k, v]) => (
                  <div key={k} className="penilaian-card" style={{ padding: '12px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>
                      {k === 'uts' ? 'UTS' : k === 'uas' ? 'UAS' : k}
                    </div>
                    <div className="penilaian-value" style={{ fontSize: 22, fontWeight: 800, color: '#4f46e5' }}>{v}%</div>
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
                  <div key={i} className="ref-item" style={{ display: 'flex', gap: 10, padding: '8px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, marginBottom: 6 }}>
                    <span style={{ color: '#6366f1', fontWeight: 700 }}>[{i + 1}]</span>
                    <span style={{ color: '#334155' }}>{r}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ===== Print View ===== */}
      <div className="print-layout-only">
        {/* ── HALAMAN 1: COVER PAGE (PURPLE) ────────────────────────── */}
        <div className="cover-page">
          <div className="cover-title">
            Rencana Pembelajaran Semester<br />(RPS)
          </div>
          
          <img src="/logo-sys.png" alt="STIKOM Logo" className="cover-logo" onError={e => e.target.src = 'https://xezzmppsklkpmiesblvw.supabase.co/storage/v1/object/public/public-assets/logo-stikom.png'} />

          <table className="cover-info-table">
            <tbody>
              <tr>
                <td style={{ width: '40%', fontWeight: 'bold' }}>Nama Mata Kuliah</td>
                <td style={{ width: '5%' }}>:</td>
                <td style={{ width: '55%', fontWeight: 'bold' }}>{mk.nama_mk}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 'bold' }}>Kode / SKS</td>
                <td>:</td>
                <td>{mk.kode_mk} / {mk.sks} SKS</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 'bold' }}>Semester / Tahun</td>
                <td>:</td>
                <td>{mk.semester} / {rps.tahun_akademik}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 'bold' }}>Program Studi</td>
                <td>:</td>
                <td>{mk.prodi?.nama}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 'bold' }}>Status Mata Kuliah</td>
                <td>:</td>
                <td>Wajib</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 'bold' }}>Prasyarat</td>
                <td>:</td>
                <td>—</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 'bold' }}>Dosen Pengampu</td>
                <td>:</td>
                <td style={{ fontWeight: 'bold' }}>{rps.dosen?.nama_lengkap}</td>
              </tr>
              {teamMembers.length > 0 && (
                <tr>
                  <td style={{ fontWeight: 'bold' }}>Tim Pengajar</td>
                  <td>:</td>
                  <td style={{ fontWeight: 'bold' }}>{teamMembers.map(m => m.nama_lengkap).join(', ')}</td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="cover-footer">
            Sekolah Tinggi Ilmu Komputer Yos Sudarso<br />
            Purwokerto<br />
            {tglPenyusunan}
          </div>
        </div>

        <div className="page-break" />

        {/* ── HALAMAN 2: PETA CAPAIAN PEMBELAJARAN ──────────────────── */}
        <div className="flowchart-page">
          <div className="flowchart-title green-box">
            Peta Capaian Pembelajaran
          </div>

          {cpmkList.length > 0 && (
            <div className="cpmk-box blue-node">
              CPMK:<br />
              {cpmkList[0]?.deskripsi}
            </div>
          )}

          {flowchartSubCpmks.map((sub, idx) => (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
              <div className="flowchart-arrow">▲</div>
              <div className="flowchart-node">
                <strong>Sub-CPMK {flowchartSubCpmks.length - idx}</strong><br />
                {sub}
              </div>
            </div>
          ))}
        </div>

        <div className="page-break" />

        {/* ── HALAMAN 3: IDENTITAS & CAPAIAN PEMBELAJARAN (CP) ────────── */}
        <div>
          {/* Kop Surat STIKOM */}
          <table className="kop-table">
            <tbody>
              <tr>
                <td style={{ width: '20%' }}>
                  <img src="/logo-sys.png" alt="STIKOM Logo" className="kop-logo" onError={e => e.target.src = 'https://xezzmppsklkpmiesblvw.supabase.co/storage/v1/object/public/public-assets/logo-stikom.png'} />
                </td>
                <td style={{ width: '80%' }}>
                  <div className="kop-institution">Sekolah Tinggi Ilmu Komputer (STIKOM)<br />Yos Sudarso</div>
                  <div className="kop-address">Jln. SMP 5 Karangklesem, Telp. (0281) 6845088, Fax 6845089 Purwokerto 53144</div>
                </td>
              </tr>
            </tbody>
          </table>
          <div className="kop-border-line" />

          <div className="section-header-title yellow-header">
            Rencana Pembelajaran Semester (RPS)
          </div>

          <table className="rps-table">
            <thead>
              <tr className="gray-header">
                <th>Kode MK</th>
                <th>Nama Mata Kuliah</th>
                <th>SKS</th>
                <th>Smt</th>
                <th>Program Studi</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>{mk.kode_mk}</td>
                <td style={{ fontWeight: 'bold' }}>{mk.nama_mk}</td>
                <td style={{ textAlign: 'center' }}>{mk.sks}</td>
                <td style={{ textAlign: 'center' }}>{mk.semester}</td>
                <td>{mk.prodi?.nama}</td>
              </tr>
              <tr className="gray-header">
                <th colSpan={2}>Dosen Pengampu MK</th>
                <th colSpan={2}>Ketua Program Studi</th>
                <th>Tgl. Penyusunan</th>
              </tr>
              <tr>
                <td colSpan={2}>
                  <div>{rps.dosen?.nama_lengkap}</div>
                  {teamMembers.length > 0 && (
                    <div style={{ fontSize: '8.5pt', color: '#475569', marginTop: 4 }}>
                      Tim: {teamMembers.map(m => m.nama_lengkap).join(', ')}
                    </div>
                  )}
                </td>
                <td colSpan={2}>{kaprodi?.nama_lengkap || '(Nama Ka. Prodi Belum Ditetapkan)'}</td>
                <td>{tglPenyusunan}</td>
              </tr>
            </tbody>
          </table>

          <table className="rps-table">
            <tbody>
              <tr>
                <td style={{ width: '20%', fontWeight: 'bold', backgroundColor: '#f8fafc' }}>
                  Capaian Pembelajaran (CP)
                </td>
                <td>
                  <div style={{ fontWeight: 'bold', marginBottom: 6, textDecoration: 'underline' }}>CPL-PRODI Yang Dibebankan Pada Mata Kuliah:</div>
                  <ol style={{ margin: '0 0 16px 0', paddingLeft: 20 }}>
                    {cplList.map((c, i) => (
                      <li key={i} style={{ marginBottom: 4 }}>{c}</li>
                    ))}
                  </ol>

                  <div style={{ fontWeight: 'bold', marginBottom: 6, textDecoration: 'underline' }}>CP-MATA KULIAH (CPMK):</div>
                  <ol style={{ margin: 0, paddingLeft: 20 }}>
                    {cpmkList.map((c, i) => (
                      <li key={i} style={{ marginBottom: 4 }}>
                        <strong>{c.kode || `CPMK-${i+1}`}:</strong> {c.deskripsi}
                      </li>
                    ))}
                  </ol>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="page-break" />

        {/* ── HALAMAN 4: DETAIL INFORMASI MATA KULIAH ─────────────────── */}
        <div>
          <table className="rps-table">
            <tbody>
              <tr>
                <td style={{ width: '25%', fontWeight: 'bold', backgroundColor: '#f8fafc' }}>Deskripsi Singkat Mata Kuliah</td>
                <td>{rps.deskripsi_mk || 'Tidak ada deskripsi.'}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 'bold', backgroundColor: '#f8fafc' }}>Bahan Kajian / Materi Pembelajaran</td>
                <td>
                  <ol style={{ margin: 0, paddingLeft: 20 }}>
                    {listBahanKajian.slice(0, 12).map((bk, i) => (
                      <li key={i} style={{ marginBottom: 3 }}>{bk}</li>
                    ))}
                    {listBahanKajian.length === 0 && (
                      <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Tidak ada data bahan kajian khusus.</span>
                    )}
                  </ol>
                </td>
              </tr>
              <tr>
                <td style={{ fontWeight: 'bold', backgroundColor: '#f8fafc' }}>Daftar Referensi</td>
                <td>
                  <ol style={{ margin: 0, paddingLeft: 20 }}>
                    {ref.map((r, i) => (
                      <li key={i} style={{ marginBottom: 4 }}>{r}</li>
                    ))}
                    {ref.length === 0 && (
                      <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Belum ada daftar pustaka.</span>
                    )}
                  </ol>
                </td>
              </tr>
              <tr>
                <td style={{ fontWeight: 'bold', backgroundColor: '#f8fafc' }}>Media Pembelajaran</td>
                <td>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                    <div>
                      <strong style={{ display: 'block', marginBottom: 4, textDecoration: 'underline' }}>Perangkat Lunak:</strong>
                      1. Google Classroom<br />
                      2. Google Meet<br />
                      3. PowerPoint / PDF Reader
                    </div>
                    <div>
                      <strong style={{ display: 'block', marginBottom: 4, textDecoration: 'underline' }}>Perangkat Keras:</strong>
                      1. Laptop<br />
                      2. Koneksi Internet<br />
                      3. Proyektor
                    </div>
                  </div>
                </td>
              </tr>
              <tr>
                <td style={{ fontWeight: 'bold', backgroundColor: '#f8fafc' }}>MK Prasyarat</td>
                <td>Jaringan Komputer (atau sesuai ketentuan kurikulum)</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="page-break" />

        {/* ── HALAMAN 5: RENCANA MATRIKS PEMBELAJARAN (16 PERTEMUAN) ── */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 8, textAlign: 'center' }}>
            Rencana Pembelajaran Mingguan (16 Pertemuan)
          </div>

          <table className="rps-table" style={{ fontSize: '8.5pt' }}>
            <thead>
              <tr className="gray-header">
                <th style={{ width: '5%', textAlign: 'center' }}>Mg. Ke</th>
                <th style={{ width: '22%' }}>Sub-CPMK (Kemampuan Akhir)</th>
                <th style={{ width: '23%' }}>Bahan Kajian (Materi)</th>
                <th style={{ width: '15%' }}>Metode & Bentuk Pembelajaran</th>
                <th style={{ width: '8%', textAlign: 'center' }}>Waktu</th>
                <th style={{ width: '17%' }}>Pengalaman Belajar</th>
                <th style={{ width: '10%', textAlign: 'center' }}>Bobot (%)</th>
              </tr>
            </thead>
            <tbody>
              {renc.map((p, idx) => (
                <tr key={idx} style={{
                  backgroundColor: p.is_uts ? '#fffbeb' : p.is_uas ? '#f0fdf4' : undefined,
                  fontWeight: (p.is_uts || p.is_uas) ? 'bold' : 'normal'
                }}>
                  <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{p.no}</td>
                  <td>{p.kemampuan_akhir || (p.is_uts ? 'Ujian Tengah Semester (UTS)' : p.is_uas ? 'Ujian Akhir Semester (UAS)' : '—')}</td>
                  <td>{p.bahan_kajian || '—'}</td>
                  <td>{p.metode || 'Ceramah, Diskusi'}</td>
                  <td style={{ textAlign: 'center' }}>{p.waktu} mnt</td>
                  <td>{p.pengalaman_belajar || '—'}</td>
                  <td style={{ textAlign: 'center' }}>{p.bobot}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="page-break" />

        {/* ── HALAMAN 12: MONEV PEMBELAJARAN & ATURAN ────────────────── */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 12 }}>
            A. Monev Pembelajaran & Kriteria Asesmen
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 20, marginBottom: 20 }}>
            {/* Komponen Penilaian */}
            <div>
              <div style={{ fontSize: 9.5, fontWeight: 'bold', marginBottom: 6, textDecoration: 'underline' }}>Persentase Pembagian Komponen Evaluasi:</div>
              <table className="rps-table">
                <thead>
                  <tr className="gray-header">
                    <th>Komponen Penilaian</th>
                    <th style={{ width: '40%', textAlign: 'center' }}>Persentase (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(pen).filter(([, v]) => Number(v) > 0).map(([k, v]) => (
                    <tr key={k}>
                      <td style={{ textTransform: 'capitalize' }}>{k === 'uts' ? 'UTS' : k === 'uas' ? 'UAS' : k}</td>
                      <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{v}%</td>
                    </tr>
                  ))}
                  <tr className="gray-header" style={{ fontWeight: 'bold' }}>
                    <td>JUMLAH</td>
                    <td style={{ textAlign: 'center' }}>{totalPenilaian}%</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* PAP criteria */}
            <div>
              <div style={{ fontSize: 9.5, fontWeight: 'bold', marginBottom: 6, textDecoration: 'underline' }}>Kriteria Penilaian Acuan Pedoman (PAP):</div>
              <table className="rps-table" style={{ fontSize: '8pt' }}>
                <thead>
                  <tr className="gray-header">
                    <th>Nilai</th>
                    <th>Kriteria</th>
                    <th>Mutu</th>
                    <th>Skala</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['A', 'Sangat Baik', '4', '80 - 100'],
                    ['B', 'Baik', '3', '66 - 79.99'],
                    ['C', 'Sedang', '2', '56 - 65.99'],
                    ['D', 'Kurang', '1', '46 - 55.99'],
                    ['E', 'Tidak Lulus', '0', '< 46'],
                  ].map(([n, k, m, s]) => (
                    <tr key={n}>
                      <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{n}</td>
                      <td>{k}</td>
                      <td style={{ textAlign: 'center' }}>{m}</td>
                      <td style={{ textAlign: 'center' }}>{s}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 6, marginTop: 20 }}>
            B. Aturan Perkuliahan
          </div>
          <ol style={{ margin: 0, paddingLeft: 20, fontSize: '9.5pt', lineHeight: 1.6 }}>
            <li style={{ marginBottom: 4 }}>Mahasiswa wajib mengikuti perkuliahan minimum 75% dari total jumlah pertemuan yang terjadwal dalam semester yang bersangkutan.</li>
            <li style={{ marginBottom: 4 }}>Mahasiswa yang tidak memenuhi aturan (1) tidak diijinkan mengikuti Ujian Akhir Semester (UAS), penilaian selanjutnya dinyatakan Tidak Lengkap.</li>
            <li style={{ marginBottom: 4 }}>Mahasiswa wajib melaksanakan semua penilaian yang termasuk dalam komponen penilaian, baik mandiri maupun kelompok secara jujur dan berintegritas.</li>
            <li style={{ marginBottom: 4 }}>Segala bentuk plagiarisme dan kecurangan dalam ujian akan dikenakan sanksi pembatalan nilai mata kuliah secara otomatis.</li>
          </ol>
        </div>

        <div className="page-break" />

        {/* ── HALAMAN 13: REFERENSI, BANK SOAL & TANDA TANGAN ─────────── */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 8 }}>
            C. Pustaka Pilihan Utama
          </div>
          <ol style={{ margin: '0 0 20px 0', paddingLeft: 20, fontSize: '9.5pt' }}>
            {ref.slice(0, 4).map((r, i) => (
              <li key={i} style={{ marginBottom: 4 }}>{r}</li>
            ))}
            {ref.length === 0 && (
              <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Tidak ada referensi tambahan.</span>
            )}
          </ol>

          <div style={{ fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 8 }}>
            D. Contoh Soal Evaluasi (Bank Soal)
          </div>
          <ol style={{ margin: '0 0 40px 0', paddingLeft: 20, fontSize: '9.5pt', lineHeight: 1.6 }}>
            <li style={{ marginBottom: 4 }}>Jelaskan apa yang dimaksud dengan Capaian Pembelajaran Lulusan (CPL) pada mata kuliah ini!</li>
            <li style={{ marginBottom: 4 }}>Sebutkan dan jelaskan kompetensi kognitif yang ingin dicapai pada CPMK-1!</li>
            <li style={{ marginBottom: 4 }}>Bagaimana keselarasan (*constructive alignment*) antara materi pembelajaran mingguan dengan bentuk evaluasi asesmen Anda?</li>
          </ol>

          {/* Tanda Tangan */}
          <div className="signature-section">
            <div className="signature-box">
              <div>Ketua Program Studi {mk.prodi?.nama || '—'},</div>
              <div style={{ fontWeight: 'bold', textDecoration: 'underline' }}>
                {kaprodi?.nama_lengkap || '(Belum Ditetapkan)'}
              </div>
              <div style={{ fontSize: 9.5, color: '#475569' }}>
                NIDN. {kaprodi?.nidn || '—'}
              </div>
            </div>
            <div className="signature-box">
              <div>Dosen Pengampu / Tim Pengajar,</div>
              <div style={{ fontWeight: 'bold', textDecoration: 'underline' }}>
                {rps.dosen?.nama_lengkap}
              </div>
              <div style={{ fontSize: 9.5, color: '#475569' }}>
                {teamMembers.length > 0 ? `Tim: ${teamMembers.map(m => m.nama_lengkap).join(', ')}` : `NIDN. ${rps.dosen?.nidn || '—'}`}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
