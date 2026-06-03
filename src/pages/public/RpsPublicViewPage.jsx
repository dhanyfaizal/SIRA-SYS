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

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', paddingBottom: 60, fontFamily: "'Inter', system-ui, sans-serif" }}>
      
      {/* ===== Print-only styles ===== */}
      <style>{`
        @media print {
          /* Reset global overflow & layout constraints */
          html, body, #root, #app, .app-shell, .app-main, .app-content {
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            display: block !important;
            position: static !important;
            background: #ffffff !important;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            color: #000000 !important;
            font-family: 'Times New Roman', serif !important;
            font-size: 11pt !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          @page {
            size: A4;
            margin: 15mm;
          }

          /* Hide all non-print elements */
          .no-print {
            display: none !important;
          }

          /* ── Main container resets ── */
          .public-rps-root {
            min-height: auto !important;
            background: #ffffff !important;
            padding: 0 !important;
            font-family: 'Times New Roman', serif !important;
          }
          .public-rps-body {
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* ── Hide the gradient hero card, replace with formal header ── */
          .public-hero-card {
            display: none !important;
          }
          .print-formal-header {
            display: block !important;
          }

          /* ── Cards → clean bordered sections ── */
          .card {
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            margin-bottom: 16px !important;
            page-break-inside: avoid;
          }
          .card-header {
            border-bottom: 2px solid #000000 !important;
            background: none !important;
            padding: 6px 0 4px !important;
          }
          .card-header span {
            font-size: 12pt !important;
            font-weight: bold !important;
            text-transform: uppercase !important;
            color: #000000 !important;
          }
          .card-body {
            padding: 12px 0 !important;
          }

          /* ── CPL/CPMK items ── */
          .cp-item {
            background: none !important;
            border: 1px solid #cccccc !important;
            border-radius: 2px !important;
            padding: 6px 10px !important;
            margin-bottom: 4px !important;
            font-size: 10pt !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* ── Badges in print ── */
          .badge-pill {
            background: #eeeeee !important;
            color: #000000 !important;
            border: 1px solid #999999 !important;
            font-size: 9pt !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* ── Table ── */
          .public-rps-table {
            border: 1.5px solid #000 !important;
            border-collapse: collapse !important;
            width: 100% !important;
            font-size: 9.5pt !important;
          }
          .public-rps-table th,
          .public-rps-table td {
            border: 1px solid #000000 !important;
            padding: 6px 8px !important;
            color: #000000 !important;
            vertical-align: top !important;
          }
          .public-rps-table th {
            background-color: #f1f5f9 !important;
            font-weight: bold !important;
            text-align: center !important;
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

          /* ── UTS/UAS row highlights in print ── */
          .public-rps-table tr.row-uts {
            background-color: #fffbeb !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .public-rps-table tr.row-uas {
            background-color: #f0fdf4 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* ── Penilaian grid ── */
          .penilaian-grid {
            display: grid !important;
            grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)) !important;
          }
          .penilaian-card {
            background: none !important;
            border: 1px solid #cccccc !important;
            text-align: center !important;
            padding: 8px !important;
          }
          .penilaian-value {
            color: #000000 !important;
            font-size: 16pt !important;
          }

          /* ── Identitas grid ── */
          .identitas-grid {
            display: grid !important;
            grid-template-columns: 1fr 1fr 1fr !important;
          }
          .identitas-label {
            color: #666666 !important;
          }
          .identitas-value {
            color: #000000 !important;
          }

          /* ── Deskripsi box ── */
          .deskripsi-box {
            background: none !important;
            border: 1px solid #cccccc !important;
          }

          /* ── Referensi ── */
          .ref-item {
            background: none !important;
            border: 1px solid #cccccc !important;
            color: #000000 !important;
          }
          .ref-item span {
            color: #000000 !important;
          }

          /* ── Page breaks ── */
          .print-page-break {
            page-break-before: always !important;
            break-before: page !important;
          }

          /* ── Kop Surat (print-only formal header) ── */
          .print-kop-table {
            width: 100% !important;
            border: none !important;
            border-collapse: collapse !important;
            margin-bottom: 5px !important;
          }
          .print-kop-table td {
            border: none !important;
            padding: 8px !important;
            text-align: center !important;
            vertical-align: middle !important;
          }
          .print-kop-border {
            border-bottom: 3px double #000000 !important;
            margin-bottom: 20px !important;
            width: 100% !important;
          }
          .print-section-title {
            font-size: 12pt !important;
            font-weight: bold !important;
            text-transform: uppercase !important;
            background-color: #fef08a !important;
            padding: 6px 12px !important;
            border: 1.5px solid #000 !important;
            text-align: center !important;
            margin-bottom: 15px !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* ── Identitas table (formal print format) ── */
          .print-identitas-table {
            width: 100% !important;
            border-collapse: collapse !important;
            border: 1.5px solid #000 !important;
            margin-bottom: 16px !important;
          }
          .print-identitas-table th,
          .print-identitas-table td {
            border: 1px solid #000 !important;
            padding: 8px 10px !important;
            font-size: 10pt !important;
            color: #000000 !important;
            vertical-align: top !important;
          }
          .print-identitas-table th {
            background-color: #f1f5f9 !important;
            font-weight: bold !important;
            text-align: center !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-identitas-table .label-cell {
            width: 20% !important;
            font-weight: bold !important;
            background-color: #f8fafc !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

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
      <div style={{ maxWidth: 860, margin: '24px auto 0', padding: '0 16px' }} className="public-rps-body">
        
        {/* ── Print-only: Kop Surat Formal ── */}
        <div className="print-formal-header" style={{ display: 'none' }}>
          <table className="print-kop-table">
            <tbody>
              <tr>
                <td style={{ width: '20%' }}>
                  <img src="/logo-sys.png" alt="STIKOM Logo" style={{ width: 70, height: 70, objectFit: 'contain' }} 
                    onError={e => e.target.src = 'https://xezzmppsklkpmiesblvw.supabase.co/storage/v1/object/public/public-assets/logo-stikom.png'} />
                </td>
                <td style={{ width: '80%' }}>
                  <div style={{ fontSize: '14pt', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Sekolah Tinggi Ilmu Komputer (STIKOM)<br />Yos Sudarso
                  </div>
                  <div style={{ fontSize: '9pt', marginTop: 4 }}>
                    Jln. SMP 5 Karangklesem, Telp. (0281) 6845088, Fax 6845089 Purwokerto 53144
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <div className="print-kop-border" />
          <div className="print-section-title">
            Rencana Pembelajaran Semester (RPS)
          </div>

          {/* Print-only formal identity table */}
          <table className="print-identitas-table">
            <thead>
              <tr>
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
              <tr>
                <th colSpan={2}>Dosen Pengampu MK</th>
                <th colSpan={2}>Tahun Akademik</th>
                <th>Tgl. Publikasi</th>
              </tr>
              <tr>
                <td colSpan={2}>{rps.dosen?.nama_lengkap || '—'}</td>
                <td colSpan={2} style={{ textAlign: 'center' }}>{rps.tahun_akademik} ({rps.semester_aktif})</td>
                <td>{tglPenyusunan}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Course Main Title Header (screen only, hidden in print) */}
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
            {(cp.cpl ?? []).length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 8 }}>
                  CPL — Capaian Pembelajaran Lulusan (Prodi)
                </div>
                {(cp.cpl ?? []).map((c, i) => (
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
        <div className="card print-page-break" style={{ marginBottom: 20 }}>
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

            {/* Print-only: formal penilaian table */}
            <div className="print-formal-header" style={{ display: 'none', marginTop: 16 }}>
              <table className="print-identitas-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Komponen Penilaian</th>
                    <th style={{ width: '30%' }}>Persentase (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(pen).filter(([, v]) => Number(v) > 0).map(([k, v]) => (
                    <tr key={k}>
                      <td style={{ textTransform: 'capitalize' }}>{k === 'uts' ? 'UTS' : k === 'uas' ? 'UAS' : k}</td>
                      <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{v}%</td>
                    </tr>
                  ))}
                  <tr>
                    <td style={{ fontWeight: 'bold' }}>JUMLAH</td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{totalPenilaian}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* SECTION 5: Bahan Kajian (print-only dedicated section) */}
        {listBahanKajian.length > 0 && (
          <div className="card print-formal-header" style={{ display: 'none', marginBottom: 20 }}>
            <div className="card-header">
              <span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>Bahan Kajian / Materi Pembelajaran</span>
            </div>
            <div className="card-body">
              <ol style={{ margin: 0, paddingLeft: 20, fontSize: '10pt', lineHeight: 1.6 }}>
                {listBahanKajian.map((bk, i) => (
                  <li key={i} style={{ marginBottom: 3 }}>{bk}</li>
                ))}
              </ol>
            </div>
          </div>
        )}

        {/* SECTION 6: Referensi Pustaka */}
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
  )
}
