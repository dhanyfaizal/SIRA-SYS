import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Printer, ArrowLeft, Loader } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function KurikulumPrintPage() {
  const { profile, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [prodi, setProdi] = useState(null)
  const [activeDoc, setActiveDoc] = useState(null)
  const [courses, setCourses] = useState([])
  const [kaprodi, setKaprodi] = useState(null)

  useEffect(() => {
    if (authLoading) return

    const queryParams = new URLSearchParams(window.location.search)
    const prodiId = queryParams.get('prodi_id') || profile?.prodi_id

    if (!prodiId) {
      toast.error('Akun Anda belum terhubung dengan Program Studi')
      navigate('/kurikulum')
      return
    }

    async function loadAllData() {
      setLoading(true)
      try {

        // 1. Fetch Program Studi
        const { data: prodiData, error: prodiError } = await supabase
          .from('program_studi')
          .select('*')
          .eq('id', prodiId)
          .single()
        if (prodiError) throw prodiError
        setProdi(prodiData)

        // 2. Fetch Active Curriculum Document
        const { data: docData, error: docError } = await supabase
          .from('kurikulum_docs')
          .select('*')
          .eq('prodi_id', prodiId)
          .eq('jenis', 'kurikulum')
          .eq('is_active', true)
          .limit(1)
        
        if (docError) throw docError
        
        let chosenDoc = null
        if (docData && docData.length > 0) {
          chosenDoc = docData[0]
        } else {
          // Fallback to latest
          const { data: latestDocs, error: latestError } = await supabase
            .from('kurikulum_docs')
            .select('*')
            .eq('prodi_id', prodiId)
            .eq('jenis', 'kurikulum')
            .order('created_at', { ascending: false })
            .limit(1)
          if (!latestError && latestDocs && latestDocs.length > 0) {
            chosenDoc = latestDocs[0]
          }
        }
        
        if (!chosenDoc) {
          toast.error('Belum ada dokumen kurikulum terdaftar')
          navigate('/kurikulum')
          return
        }
        setActiveDoc(chosenDoc)

        // 3. Fetch Courses (Mata Kuliah)
        const { data: courseData, error: courseError } = await supabase
          .from('mata_kuliah')
          .select('*')
          .eq('prodi_id', prodiId)
          .order('semester')
          .order('kode_mk')
        if (courseError) throw courseError
        setCourses(courseData ?? [])

        // 4. Fetch Kaprodi
        const { data: kaprodiData, error: kaprodiError } = await supabase
          .from('profiles')
          .select('nama_lengkap, nidn')
          .eq('prodi_id', prodiId)
          .eq('role', 'kaprodi')
          .limit(1)
        if (!kaprodiError && kaprodiData && kaprodiData.length > 0) {
          setKaprodi(kaprodiData[0])
        }
      } catch (err) {
        console.error(err)
        toast.error('Gagal memuat data cetak kurikulum: ' + err.message)
      } finally {
        setLoading(false)
      }
    }

    loadAllData()
  }, [profile, authLoading, navigate])

  // Automatic Print Trigger
  useEffect(() => {
    if (!loading && activeDoc) {
      const timer = setTimeout(() => {
        window.print()
      }, 1200)
      return () => clearTimeout(timer)
    }
  }, [loading, activeDoc])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 16 }}>
      <Loader size={36} className="spinner animate-spin" style={{ color: '#4f46e5' }} />
      <p style={{ fontSize: 13, color: '#64748b' }}>Mempersiapkan Buku Kurikulum & CPL…</p>
    </div>
  )

  if (!activeDoc) return null

  const profilLulusan = activeDoc.extracted_data?.profil_lulusan ?? []
  const cplList = activeDoc.extracted_data?.cpl ?? []
  const tglTerbit = new Date(activeDoc.created_at).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  const getProdiColor = (prodiName) => {
    const name = prodiName?.toLowerCase() || ''
    if (name.includes('sistem informasi')) return '#7f1d1d'
    if (name.includes('komputerisasi akuntansi')) return '#064e3b'
    if (name.includes('teknik informatika')) return '#9a3412'
    if (name.includes('desain komunikasi visual')) return '#581c87'
    return '#312e81'
  }
  const prodiColor = prodi?.nama ? getProdiColor(prodi.nama) : '#312e81'

  return (
    <div className="print-container" style={{ '--prodi-cover-color': prodiColor }}>
      <style>{`
        @media print {
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
          .cover-page {
            background-color: var(--prodi-cover-color, #4f46e5) !important;
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
          .kop-table, .kop-table td {
            border: none !important;
          }
          .kop-border-line {
            border-bottom: 3px double #000000 !important;
          }
          table.print-table th {
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
          height: 297mm;
          width: 100%;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-items: center;
          padding: 80px 50px;
          text-align: center;
          background-color: var(--prodi-cover-color, #4f46e5);
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

        /* Kop & Tabel Standard */
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
          background-color: #f1f5f9;
          padding: 6px 12px;
          border: 1.5px solid #000;
          text-align: center;
          margin-bottom: 15px;
        }

        table.print-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          border: 1.5px solid #000;
        }

        table.print-table th, table.print-table td {
          border: 1px solid #000000;
          padding: 8px 10px;
          font-size: 9.5pt;
          text-align: left;
          vertical-align: top;
          line-height: 1.4;
        }

        table.print-table th {
          font-weight: bold;
          text-align: center;
          background-color: #f1f5f9;
        }

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

        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Button Floating Bar (Screen view only) */}
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
          Dokumen Kurikulum &<br />Capaian Pembelajaran Lulusan (CPL)<br />OBE
        </div>
        
        <img 
          src="/logo-sys.png" 
          alt="STIKOM Logo" 
          className="cover-logo" 
          onError={e => e.target.src = 'https://xezzmppsklkpmiesblvw.supabase.co/storage/v1/object/public/public-assets/logo-stikom.png'} 
        />

        <table className="cover-info-table">
          <tbody>
            <tr>
              <td style={{ width: '40%', fontWeight: 'bold' }}>Program Studi</td>
              <td style={{ width: '5%' }}>:</td>
              <td style={{ width: '55%', fontWeight: 'bold' }}>{prodi?.nama || '—'}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 'bold' }}>Kode Program Studi</td>
              <td>:</td>
              <td>{prodi?.kode || '—'}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 'bold' }}>Nama Dokumen</td>
              <td>:</td>
              <td style={{ fontWeight: 'bold' }}>{activeDoc.nama_dokumen}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 'bold' }}>Jumlah Profil Lulusan</td>
              <td>:</td>
              <td>{profilLulusan.length} Peran/Profil</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 'bold' }}>Jumlah CPL Kurikulum</td>
              <td>:</td>
              <td>{cplList.length} CPL</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 'bold' }}>Total Mata Kuliah</td>
              <td>:</td>
              <td>{courses.length} Mata Kuliah ({courses.reduce((a,c)=>a+c.sks, 0)} SKS)</td>
            </tr>
          </tbody>
        </table>

        <div className="cover-footer">
          Sekolah Tinggi Ilmu Komputer Yos Sudarso<br />
          Purwokerto<br />
          {tglTerbit}
        </div>
      </div>

      <div className="page-break" />

      {/* ── HALAMAN 2: DAFTAR PROFIL LULUSAN ─────────────────────── */}
      <div style={{ padding: '10px 0' }}>
        <table className="kop-table">
          <tbody>
            <tr>
              <td style={{ width: '20%' }}>
                <img 
                  src="/logo-sys.png" 
                  alt="STIKOM Logo" 
                  className="kop-logo" 
                  onError={e => e.target.src = 'https://xezzmppsklkpmiesblvw.supabase.co/storage/v1/object/public/public-assets/logo-stikom.png'} 
                />
              </td>
              <td style={{ width: '80%' }}>
                <div className="kop-institution">Sekolah Tinggi Ilmu Komputer (STIKOM)<br />Yos Sudarso</div>
                <div className="kop-address">Jln. SMP 5 Karangklesem, Telp. (0281) 6845088, Fax 6845089 Purwokerto 53144</div>
              </td>
            </tr>
          </tbody>
        </table>
        <div className="kop-border-line" />

        <div className="section-header-title">
          Bagian I. Peran & Profil Lulusan (PL)
        </div>

        <p style={{ fontSize: '10.5pt', marginBottom: 15, textIndent: '30px', textAlign: 'justify' }}>
          Profil lulusan merupakan peran yang diharapkan dapat dilakukan oleh lulusan program studi di bidang kerja atau masyarakat setelah menyelesaikan studinya di program studi {prodi?.nama} Sekolah Tinggi Ilmu Komputer Yos Sudarso Purwokerto. Berikut adalah tabel profil lulusan yang ditetapkan dalam kurikulum ini:
        </p>

        <table className="print-table">
          <thead>
            <tr>
              <th style={{ width: '12%', textAlign: 'center' }}>Kode PL</th>
              <th style={{ width: '30%' }}>Peran / Profil Lulusan</th>
              <th>Deskripsi Kompetensi & Profil Kelulusan</th>
            </tr>
          </thead>
          <tbody>
            {profilLulusan.map((pl, idx) => (
              <tr key={idx}>
                <td style={{ textAlign: 'center', fontWeight: 'bold', fontFamily: 'monospace' }}>{pl.kode}</td>
                <td style={{ fontWeight: 'bold' }}>{pl.profil}</td>
                <td>{pl.deskripsi}</td>
              </tr>
            ))}
            {profilLulusan.length === 0 && (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>Belum ada data profil lulusan.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="page-break" />

      {/* ── HALAMAN 3: DAFTAR CAPAIAN PEMBELAJARAN LULUSAN ────────── */}
      <div style={{ padding: '10px 0' }}>
        <table className="kop-table">
          <tbody>
            <tr>
              <td style={{ width: '20%' }}>
                <img 
                  src="/logo-sys.png" 
                  alt="STIKOM Logo" 
                  className="kop-logo" 
                  onError={e => e.target.src = 'https://xezzmppsklkpmiesblvw.supabase.co/storage/v1/object/public/public-assets/logo-stikom.png'} 
                />
              </td>
              <td style={{ width: '80%' }}>
                <div className="kop-institution">Sekolah Tinggi Ilmu Komputer (STIKOM)<br />Yos Sudarso</div>
                <div className="kop-address">Jln. SMP 5 Karangklesem, Telp. (0281) 6845088, Fax 6845089 Purwokerto 53144</div>
              </td>
            </tr>
          </tbody>
        </table>
        <div className="kop-border-line" />

        <div className="section-header-title">
          Bagian II. Capaian Pembelajaran Lulusan (CPL)
        </div>

        <p style={{ fontSize: '10.5pt', marginBottom: 15, textIndent: '30px', textAlign: 'justify' }}>
          Capaian Pembelajaran Lulusan (CPL) adalah internalisasi dan akumulasi ilmu pengetahuan, pengetahuan praktis, keterampilan, afeksi, dan kompetensi yang dicapai melalui proses pembelajaran yang terstruktur di Program Studi {prodi?.nama}. Berikut rincian CPL OBE yang dibebankan pada program studi:
        </p>

        <table className="print-table">
          <thead>
            <tr>
              <th style={{ width: '15%', textAlign: 'center' }}>Kode CPL</th>
              <th>Deskripsi Capaian Pembelajaran Lulusan (Learning Outcomes)</th>
            </tr>
          </thead>
          <tbody>
            {cplList.map((cpl, idx) => (
              <tr key={idx}>
                <td style={{ textAlign: 'center', fontWeight: 'bold', fontFamily: 'monospace' }}>{cpl.kode}</td>
                <td>{cpl.deskripsi}</td>
              </tr>
            ))}
            {cplList.length === 0 && (
              <tr>
                <td colSpan={2} style={{ textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>Belum ada data CPL.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="page-break" />

      {/* ── HALAMAN 4: MATRIKS CPL VS MATA KULIAH ─────────────────── */}
      <div style={{ padding: '10px 0' }}>
        <table className="kop-table">
          <tbody>
            <tr>
              <td style={{ width: '20%' }}>
                <img 
                  src="/logo-sys.png" 
                  alt="STIKOM Logo" 
                  className="kop-logo" 
                  onError={e => e.target.src = 'https://xezzmppsklkpmiesblvw.supabase.co/storage/v1/object/public/public-assets/logo-stikom.png'} 
                />
              </td>
              <td style={{ width: '80%' }}>
                <div className="kop-institution">Sekolah Tinggi Ilmu Komputer (STIKOM)<br />Yos Sudarso</div>
                <div className="kop-address">Jln. SMP 5 Karangklesem, Telp. (0281) 6845088, Fax 6845089 Purwokerto 53144</div>
              </td>
            </tr>
          </tbody>
        </table>
        <div className="kop-border-line" />

        <div className="section-header-title">
          Bagian III. Matriks Pemetaan CPL vs Mata Kuliah
        </div>

        <p style={{ fontSize: '10.5pt', marginBottom: 15, textIndent: '30px', textAlign: 'justify' }}>
          Matriks kurikulum di bawah ini memetakan korelasi pembelajaran antara Capaian Pembelajaran Lulusan (CPL) program studi dengan seluruh mata kuliah yang ditawarkan pada kurikulum program studi {prodi?.nama} STIKOM Yos Sudarso Purwokerto:
        </p>

        <table className="print-table" style={{ fontSize: '8.5pt' }}>
          <thead>
            <tr>
              <th style={{ width: '12%', textAlign: 'center' }}>Kode MK</th>
              <th style={{ width: '40%' }}>Nama Mata Kuliah</th>
              <th style={{ width: '8%', textAlign: 'center' }}>SKS</th>
              <th style={{ width: '8%', textAlign: 'center' }}>Sem</th>
              {cplList.map((c, idx) => (
                <th key={idx} style={{ textAlign: 'center', fontSize: '8pt', padding: '6px 2px' }} title={c.deskripsi}>
                  {c.kode}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {courses.map((course, idx) => {
              const courseCpl = course.cpl || []
              return (
                <tr key={idx}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{course.kode_mk}</td>
                  <td>{course.nama_mk}</td>
                  <td style={{ textAlign: 'center' }}>{course.sks}</td>
                  <td style={{ textAlign: 'center' }}>{course.semester}</td>
                  {cplList.map((c, i) => (
                    <td key={i} style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '10pt' }}>
                      {courseCpl.includes(c.kode) ? '✔' : ''}
                    </td>
                  ))}
                </tr>
              )
            })}
            {courses.length === 0 && (
              <tr>
                <td colSpan={4 + cplList.length} style={{ textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>Belum ada data mata kuliah.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="page-break" />

      {/* ── HALAMAN 5: RINGKASAN MATA KULIAH & PRODI SIGNATURE ──────── */}
      <div style={{ padding: '10px 0' }}>
        <table className="kop-table">
          <tbody>
            <tr>
              <td style={{ width: '20%' }}>
                <img 
                  src="/logo-sys.png" 
                  alt="STIKOM Logo" 
                  className="kop-logo" 
                  onError={e => e.target.src = 'https://xezzmppsklkpmiesblvw.supabase.co/storage/v1/object/public/public-assets/logo-stikom.png'} 
                />
              </td>
              <td style={{ width: '80%' }}>
                <div className="kop-institution">Sekolah Tinggi Ilmu Komputer (STIKOM)<br />Yos Sudarso</div>
                <div className="kop-address">Jln. SMP 5 Karangklesem, Telp. (0281) 6845088, Fax 6845089 Purwokerto 53144</div>
              </td>
            </tr>
          </tbody>
        </table>
        <div className="kop-border-line" />

        <div className="section-header-title">
          Bagian IV. Daftar Mata Kuliah Kurikulum
        </div>

        <table className="print-table">
          <thead>
            <tr>
              <th style={{ width: '12%', textAlign: 'center' }}>Kode MK</th>
              <th>Nama Mata Kuliah</th>
              <th style={{ width: '10%', textAlign: 'center' }}>SKS</th>
              <th style={{ width: '10%', textAlign: 'center' }}>Sem</th>
              <th style={{ width: '35%' }}>CPL yang Dibebankan</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((course, idx) => (
              <tr key={idx}>
                <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{course.kode_mk}</td>
                <td style={{ fontWeight: '600' }}>{course.nama_mk}</td>
                <td style={{ textAlign: 'center' }}>{course.sks}</td>
                <td style={{ textAlign: 'center' }}>{course.semester}</td>
                <td style={{ fontSize: '9pt' }}>
                  {course.cpl && course.cpl.length > 0 ? (
                    course.cpl.join(', ')
                  ) : (
                    <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Tidak dibebani CPL</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Tanda Tangan Pengesahan */}
        <div className="signature-section">
          <div className="signature-box">
            <div>Disusun Oleh,</div>
            <div style={{ marginTop: 60 }}>
              <div style={{ fontWeight: 'bold', textDecoration: 'underline' }}>{kaprodi?.nama_lengkap || '(Nama Ka. Prodi Belum Ditetapkan)'}</div>
              <div>Ketua Program Studi {prodi?.nama}</div>
              {kaprodi?.nidn && <div>NIDN. {kaprodi.nidn}</div>}
            </div>
          </div>
          <div className="signature-box">
            <div>Mengetahui & Mengesahkan,<br />Wakil Ketua I Bidang Akademik</div>
            <div style={{ marginTop: 60 }}>
              <div style={{ fontWeight: 'bold', textDecoration: 'underline' }}>Widiyono, S.Kom., M.Kom.</div>
              <div>Wakil Ketua I</div>
              <div>NIDN. 0627038101</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
