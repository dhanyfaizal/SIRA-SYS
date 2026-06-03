import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Printer, ArrowLeft, Loader } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { dbRPS } from '@/lib/db'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function RpsPrintPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [rps, setRps] = useState(null)
  const [kaprodi, setKaprodi] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const { data, error } = await dbRPS.getById(id)
        if (error || !data) {
          toast.error('RPS tidak ditemukan')
          navigate('/rps')
          return
        }
        setRps(data)

        // Ambil data Kaprodi untuk tanda tangan
        const prodiId = data.mk?.prodi?.id || data.mk?.prodi_id
        console.log('[SIRA-SYS] RpsPrintPage - prodiId:', prodiId, 'from mk:', data.mk)
        
        if (prodiId) {
          const { data: kaprodiData, error: kaprodiError } = await supabase
            .from('profiles')
            .select('nama_lengkap, nidn')
            .eq('prodi_id', prodiId)
            .eq('role', 'kaprodi')
            .limit(1)
          
          if (kaprodiError) {
            console.error('[SIRA-SYS] Error loading Kaprodi:', kaprodiError)
          } else {
            console.log('[SIRA-SYS] Loaded Kaprodi:', kaprodiData)
          }
          
          if (kaprodiData && kaprodiData.length > 0) {
            setKaprodi(kaprodiData[0])
          }
        }
      } catch (err) {
        console.error(err)
        toast.error('Gagal memuat data cetak')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [id, navigate])

  // Picu dialog cetak browser otomatis setelah data termuat
  useEffect(() => {
    if (!loading && rps) {
      const timer = setTimeout(() => {
        window.print()
      }, 1200)
      return () => clearTimeout(timer)
    }
  }, [loading, rps])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 16 }}>
      <Loader size={36} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
      <p style={{ fontSize: 13, color: 'var(--gray-400)' }}>Mempersiapkan dokumen cetak RPS…</p>
    </div>
  )

  if (!rps) return null

  const cp = rps.capaian_pembelajaran ?? {}
  const cplList = cp.cpl ?? []
  const cpmkList = cp.cpmk ?? []
  const renc = rps.rencana_pembelajaran ?? []
  const pen = rps.penilaian ?? {}
  const ref = rps.referensi ?? []

  // Hitung total penilaian
  const totalPenilaian = Object.values(pen).reduce((a, b) => a + Number(b || 0), 0)

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
  const flowchartSubCpmks = [...uniqueSubCpmks].reverse().slice(0, 6) // Maksimal 6 node diagram alur

  // Dapatkan tanggal penyusunan
  const tglPenyusunan = new Date(rps.created_at).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  // Perolehan list bahan kajian dari pertemuan (untuk Section Bahan Kajian)
  const listBahanKajian = renc
    .filter(p => !p.is_uts && !p.is_uas && p.bahan_kajian?.trim())
    .map(p => p.bahan_kajian.trim())
    .filter((v, i, self) => self.indexOf(v) === i) // filter duplicate
    .slice(0, 12) // Batasi agar pas di satu halaman

  return (
    <div className="print-container">
      {/* Styles khusus cetak PDF dan Layout */}
      <style>{`
        @media print {
          /* Reset root limits to allow printing all pages */
          html, body, #root, #app, .app-shell, .app-main, .app-content {
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            display: block !important;
            position: static !important;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            font-family: 'Times New Roman', serif;
          }
          .no-print {
            display: none !important;
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
          }
          .flowchart-page {
            height: calc(297mm - 30mm) !important;
            min-height: calc(297mm - 30mm) !important;
            box-sizing: border-box !important;
            padding: 30px !important;
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
          /* Repeat table headers and avoid break inside rows */
          thead {
            display: table-header-group !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          /* Force colors on print */
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
          /* Ensure signature alignment on print */
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
        }

        /* Screen Preview Styles */
        .print-container {
          font-family: 'Times New Roman', serif;
          color: #1e293b;
          line-height: 1.5;
        }
        
        .print-btn-bar {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 1000;
          display: flex;
          gap: 10px;
        }

        /* 1. Halaman Cover */
        .cover-page {
          height: 297mm; /* Tinggi A4 */
          width: 100%;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-items: center;
          padding: 80px 50px;
          text-align: center;
          background-color: #4f46e5;
          color: #ffffff;
          border: 3px double #ffffff;
        }

        .cover-title {
          font-size: 22pt;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 1px;
          line-height: 1.4;
          margin-top: 20px;
        }

        .cover-logo {
          width: 160px;
          height: 160px;
          margin: 30px 0;
          object-fit: contain;
          background: white;
          padding: 10px;
          border-radius: 50%;
        }

        .cover-info-table {
          width: 85%;
          margin: 40px auto;
          font-size: 13pt;
        }

        .cover-info-table td {
          padding: 6px 12px;
          border: none !important;
          color: inherit !important;
          text-align: left;
        }

        .cover-footer {
          font-size: 13pt;
          font-weight: bold;
          text-transform: uppercase;
          line-height: 1.6;
        }

        /* 2. Peta Capaian Pembelajaran */
        .flowchart-page {
          height: 297mm;
          width: 100%;
          box-sizing: border-box;
          border: none;
          padding: 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .flowchart-title {
          background-color: #d1fae5;
          color: #b91c1c;
          border: 2px solid #16a34a;
          padding: 10px 24px;
          font-size: 14pt;
          font-weight: bold;
          border-radius: 4px;
          margin-bottom: 30px;
          text-align: center;
          width: 70%;
          text-transform: uppercase;
        }

        .cpmk-box {
          background-color: #eff6ff;
          border: 2px solid #2563eb;
          padding: 14px 20px;
          width: 85%;
          text-align: center;
          border-radius: 6px;
          font-size: 11pt;
          font-weight: bold;
          color: #1e3a8a;
          margin-bottom: 10px;
        }

        .flowchart-node {
          background-color: #f8fafc;
          border: 1.5px solid #64748b;
          padding: 10px 18px;
          width: 80%;
          text-align: center;
          border-radius: 6px;
          font-size: 10pt;
          color: #334155;
        }

        .flowchart-arrow {
          font-size: 14pt;
          color: #4f46e5;
          font-weight: bold;
          margin: 2px 0;
        }

        /* 3. Kop & Tabel Standard */
        .kop-table {
          width: 100%;
          border: none;
          border-collapse: collapse;
          margin-bottom: 5px;
        }

        .kop-table td {
          border: none;
          padding: 8px;
          text-align: center;
          vertical-align: middle;
        }

        .kop-border-line {
          border-bottom: 3px double #000000;
          margin-bottom: 20px;
          width: 100%;
        }

        .kop-logo {
          width: 70px;
          height: 70px;
          object-fit: contain;
        }

        .kop-institution {
          font-size: 14pt;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .kop-address {
          font-size: 9pt;
          margin-top: 4px;
          font-weight: normal;
        }

        .section-header-title {
          font-size: 12pt;
          font-weight: bold;
          text-transform: uppercase;
          background-color: #fef08a;
          padding: 6px 12px;
          border: 1.5px solid #000;
          text-align: center;
          margin-bottom: 15px;
        }

        /* Tabel Matriks */
        table.rps-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          border: 1.5px solid #000;
        }

        table.rps-table th, table.rps-table td {
          border: 1px solid #000000;
          padding: 8px 10px;
          font-size: 9.5pt;
          text-align: left;
          vertical-align: top;
          line-height: 1.4;
        }

        table.rps-table th {
          font-weight: bold;
          text-align: center;
          background-color: #f1f5f9;
        }

        /* Aturan & Tanda Tangan */
        .signature-section {
          margin-top: 50px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          text-align: center;
          font-size: 11pt;
          page-break-inside: avoid;
        }

        .signature-box {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 140px;
        }
      `}</style>

      {/* Button Floating Bar (Hanya terlihat di layar) */}
      <div className="print-btn-bar no-print">
        <button className="btn btn-secondary" onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <ArrowLeft size={14} /> Kembali
        </button>
        <button className="btn btn-primary" onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Printer size={14} /> Cetak Sekarang
        </button>
      </div>

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
              <td style={{ width: '55%', fontWeight: 'bold' }}>{rps.mk?.nama_mk}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 'bold' }}>Kode / SKS</td>
              <td>:</td>
              <td>{rps.mk?.kode_mk} / {rps.mk?.sks} SKS</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 'bold' }}>Semester / Tahun</td>
              <td>:</td>
              <td>{rps.mk?.semester} / {rps.tahun_akademik}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 'bold' }}>Program Studi</td>
              <td>:</td>
              <td>{rps.mk?.prodi?.nama}</td>
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
              <td style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>{rps.mk?.kode_mk}</td>
              <td style={{ fontWeight: 'bold' }}>{rps.mk?.nama_mk}</td>
              <td style={{ textAlign: 'center' }}>{rps.mk?.sks}</td>
              <td style={{ textAlign: 'center' }}>{rps.mk?.semester}</td>
              <td>{rps.mk?.prodi?.nama}</td>
            </tr>
            <tr className="gray-header">
              <th colSpan={2}>Dosen Pengampu MK</th>
              <th colSpan={2}>Ketua Program Studi</th>
              <th>Tgl. Penyusunan</th>
            </tr>
            <tr>
              <td colSpan={2}>{rps.dosen?.nama_lengkap}</td>
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
                  {listBahanKajian.map((bk, i) => (
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

      {/* ── HALAMAN 5-11: RENCANA MATRIKS PEMBELAJARAN (16 PERTEMUAN) ── */}
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
                {Object.entries(pen).map(([k, v]) => (
                  <tr key={k}>
                    <td style={{ textTransform: 'capitalize' }}>{k}</td>
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
            <div>Ketua Program Studi {rps.mk?.prodi?.nama || '—'},</div>
            <div style={{ fontWeight: 'bold', textDecoration: 'underline' }}>
              {kaprodi?.nama_lengkap || '(Belum Ditetapkan)'}
            </div>
            <div style={{ fontSize: 9.5, color: '#475569' }}>
              NIDN. {kaprodi?.nidn || '—'}
            </div>
          </div>
          <div className="signature-box">
            <div>Dosen Pengampu,</div>
            <div style={{ fontWeight: 'bold', textDecoration: 'underline' }}>
              {rps.dosen?.nama_lengkap}
            </div>
            <div style={{ fontSize: 9.5, color: '#475569' }}>
              NIDN. {rps.dosen?.nidn || '—'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
