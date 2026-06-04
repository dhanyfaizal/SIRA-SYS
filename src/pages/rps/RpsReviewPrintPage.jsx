import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Printer, ArrowLeft, Loader } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { dbRPS, dbReviewRps } from '@/lib/db'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

const REVIEW_ITEMS = [
  { group: 'A', title: 'Peta Capaian Pembelajaran', items: [
    { key: 'a_cpmk_subcpmk', label: 'CPMK dan Sub-CPMK', desc: 'CPMK dan Sub, CPMK' },
  ]},
  { group: 'B', title: 'Profil Mata Kuliah', items: [
    { key: 'b1_identitas_mk', label: 'Identitas MK', desc: 'Kode mk, nama mk, sks, semester, dan program studi.' },
    { key: 'b2_penanggung_jawab', label: 'Penanggung Jawab', desc: 'Penanggung jawab mk, dosen pengampu mk, kaprodi, dan tanggal penyusunan' },
    { key: 'b3_cpl_cpmk', label: 'CPL & CPMK', desc: 'CPL-PRODI Yang dibebankan Pada Mata Kuliah, dan CP-MATA KULIAH' },
    { key: 'b4_deskripsi_mk', label: 'Deskripsi Singkat MK', desc: 'Diskripsi Singkat Mata Kuliah' },
    { key: 'b5_bahan_kajian', label: 'Bahan Kajian', desc: 'Bahan Kajian/Materi Pembelajaran' },
    { key: 'b6_referensi', label: 'Daftar Referensi', desc: 'Daftar Referensi' },
    { key: 'b7_media_pembelajaran', label: 'Media Pembelajaran', desc: 'Media Pembelajaran : perangkat lunak dan perangkat Keras' },
    { key: 'b8_prasyarat', label: 'Pra-Syarat MK', desc: 'Pra-Syarat Mata Kuliah' },
    { key: 'b9_komposisi', label: 'Komposisi', desc: 'Komposisi (%) : Teori dan praktek' },
  ]},
  { group: 'C.', title: 'Rencana Pembelajaran Semester (RPS)', items: [
    { key: 'c1_minggu_ke', label: 'Minggu Ke', desc: 'Minggu Ke' },
    { key: 'c2_kemampuan_akhir', label: 'Kemampuan Akhir', desc: 'Kemampuan Akhir Yang Direncanakan' },
    { key: 'c3_bahan_kajian_rps', label: 'Bahan Kajian', desc: 'Bahan Kajian (materi ajar)' },
    { key: 'c4_metode_pembelajaran', label: 'Metode Pembelajaran', desc: 'Metode Pembelajaran' },
    { key: 'c5_waktu', label: 'Waktu', desc: 'Waktu' },
    { key: 'c6_pengalaman_belajar', label: 'Pengalaman Belajar', desc: 'Pengalaman Belajar' },
    { key: 'c7_kriteria_penilaian', label: 'Kriteria Penilaian', desc: 'Kriteria Penilaian Dan Indikator' },
    { key: 'c8_bobot_nilai', label: 'Bobot Nilai', desc: 'Bobot Nilai' },
    { key: 'c9_referensi_rps', label: 'Referensi', desc: 'Referensi' },
  ]},
]

function statusLabel(val) {
  if (val === 'sesuai') return '☑ Sesuai'
  if (val === 'cukup') return '☑ Cukup'
  if (val === 'tidak_sesuai') return '☑ Tidak Sesuai'
  return '—'
}

function statusChecks(val) {
  return {
    sesuai: val === 'sesuai' ? '■' : '□',
    cukup: val === 'cukup' ? '■' : '□',
    tidak: val === 'tidak_sesuai' ? '■' : '□',
  }
}

export default function RpsReviewPrintPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [rps, setRps] = useState(null)
  const [review, setReview] = useState(null)
  const [kaprodi, setKaprodi] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const { data: rpsData } = await dbRPS.getById(id)
        if (!rpsData) { toast.error('RPS tidak ditemukan'); navigate(-1); return }
        setRps(rpsData)

        const { data: reviewData } = await dbReviewRps.getLatestByRpsId(id)
        setReview(reviewData)

        // Load Kaprodi
        const prodiId = rpsData.mk?.prodi?.id || rpsData.mk?.prodi_id
        if (prodiId) {
          const { data: kp } = await supabase
            .from('profiles')
            .select('nama_lengkap, nidn')
            .eq('prodi_id', prodiId)
            .eq('role', 'kaprodi')
            .limit(1)
          if (kp && kp.length > 0) setKaprodi(kp[0])
        }
      } catch (err) {
        console.error(err)
        toast.error('Gagal memuat data cetak')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  useEffect(() => {
    if (!loading && rps && review) {
      const timer = setTimeout(() => window.print(), 1200)
      return () => clearTimeout(timer)
    }
  }, [loading, rps, review])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 16 }}>
      <Loader size={36} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
      <p style={{ fontSize: 13, color: 'var(--gray-400)' }}>Mempersiapkan dokumen cetak Review RPS…</p>
    </div>
  )

  if (!rps) return null

  const tglReview = review?.created_at
    ? new Date(review.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="print-container">
      <style>{`
        @media print {
          html, body, #root, .app-shell, .app-main, .app-content {
            height: auto !important; min-height: 0 !important;
            overflow: visible !important; display: block !important; position: static !important;
          }
          body { background: #fff !important; color: #000 !important; margin: 0 !important; padding: 0 !important;
            font-family: 'Times New Roman', serif; }
          .no-print { display: none !important; }
          .page-break { page-break-before: always !important; break-before: page !important; }
          @page { size: A4; margin: 15mm; }
          .kop-table, .kop-table td { border: none !important; }
          .kop-border-line { border-bottom: 3px double #000 !important; }
          table.review-table { border: 1.5px solid #000 !important; }
          table.review-table th, table.review-table td { border: 1px solid #000 !important; }
          table.review-table th { background-color: #f1f5f9 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          thead { display: table-header-group !important; }
          tr { page-break-inside: avoid !important; break-inside: avoid !important; }
          .signature-section { page-break-inside: avoid !important; break-inside: avoid !important; }
        }

        .print-container { font-family: 'Times New Roman', serif; color: #1e293b; line-height: 1.5; }
        .print-btn-bar { position: fixed; top: 20px; right: 20px; z-index: 1000; display: flex; gap: 10px; }
        .kop-table { width: 100%; border: none; border-collapse: collapse; margin-bottom: 5px; }
        .kop-table td { border: none; padding: 8px; text-align: center; vertical-align: middle; }
        .kop-border-line { border-bottom: 3px double #000; margin-bottom: 20px; width: 100%; }
        .kop-logo { width: 70px; height: 70px; object-fit: contain; }
        .kop-institution { font-size: 14pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
        .kop-address { font-size: 9pt; margin-top: 4px; }
        .section-header-title { font-size: 12pt; font-weight: bold; text-transform: uppercase; background-color: #fef08a;
          padding: 6px 12px; border: 1.5px solid #000; text-align: center; margin-bottom: 15px; }
        table.review-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 1.5px solid #000; }
        table.review-table th, table.review-table td { border: 1px solid #000; padding: 6px 8px; font-size: 9.5pt;
          text-align: left; vertical-align: top; line-height: 1.4; }
        table.review-table th { font-weight: bold; text-align: center; background-color: #f1f5f9; }
        .signature-section { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; text-align: center; font-size: 11pt; }
        .signature-box { display: flex; flex-direction: column; justify-content: space-between; height: 140px; }
      `}</style>

      {/* Floating buttons */}
      <div className="print-btn-bar no-print">
        <button className="btn btn-secondary" onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <ArrowLeft size={14} /> Kembali
        </button>
        <button className="btn btn-primary" onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Printer size={14} /> Cetak Sekarang
        </button>
      </div>

      {/* Kop Surat */}
      <table className="kop-table">
        <tbody>
          <tr>
            <td style={{ width: '20%' }}>
              <img src="/logo-sys.png" alt="STIKOM" className="kop-logo"
                onError={e => e.target.src = 'https://xezzmppsklkpmiesblvw.supabase.co/storage/v1/object/public/public-assets/logo-stikom.png'} />
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
        Lembar Review Rencana Pembelajaran Semester (RPS)
      </div>

      {/* Identitas MK */}
      <table className="review-table" style={{ marginBottom: 12 }}>
        <tbody>
          <tr><td style={{ width: '30%', fontWeight: 'bold' }}>Nama Mata Kuliah</td><td>: {rps.mk?.nama_mk}</td></tr>
          <tr><td style={{ fontWeight: 'bold' }}>Kode / SKS</td><td>: {rps.mk?.kode_mk} / {rps.mk?.sks} SKS</td></tr>
          <tr><td style={{ fontWeight: 'bold' }}>Semester / Tahun</td><td>: {rps.mk?.semester} / {rps.tahun_akademik}</td></tr>
          <tr><td style={{ fontWeight: 'bold' }}>Program Studi</td><td>: {rps.mk?.prodi?.nama}</td></tr>
          <tr><td style={{ fontWeight: 'bold' }}>Dosen Pengampu</td><td>: {rps.dosen?.nama_lengkap}</td></tr>
        </tbody>
      </table>

      {/* Tabel Review Utama */}
      <table className="review-table">
        <thead>
          <tr>
            <th style={{ width: '5%' }}>No.</th>
            <th style={{ width: '18%' }}>POKOK BAHASAN</th>
            <th style={{ width: '27%' }}>SUB. POKOK BAHASAN</th>
            <th style={{ width: '50%' }}>HASIL REVIEW</th>
          </tr>
        </thead>
        <tbody>
          {REVIEW_ITEMS.map(section => (
            section.items.map((item, idx) => {
              const val = review?.[item.key]
              const catatan = review?.[`${item.key}_catatan`]
              const checks = statusChecks(val)
              return (
                <tr key={item.key}>
                  {idx === 0 && (
                    <td rowSpan={section.items.length} style={{ textAlign: 'center', fontWeight: 'bold', verticalAlign: 'top' }}>
                      {section.group}
                    </td>
                  )}
                  {idx === 0 && (
                    <td rowSpan={section.items.length} style={{ fontWeight: 'bold', verticalAlign: 'top' }}>
                      {section.title}
                    </td>
                  )}
                  <td>{item.desc}</td>
                  <td>
                    <div style={{ marginBottom: 4 }}>
                      <span style={{ marginRight: 12 }}>{checks.sesuai} Sesuai</span>
                      <span style={{ marginRight: 12 }}>{checks.cukup} Cukup</span>
                      <span>{checks.tidak} Tidak Sesuai</span>
                    </div>
                    {catatan && (
                      <div style={{ fontSize: '9pt', color: '#334155' }}>
                        Catatan : {catatan}
                      </div>
                    )}
                    {!catatan && (
                      <div style={{ fontSize: '9pt', color: '#94a3b8' }}>
                        Catatan :
                      </div>
                    )}
                  </td>
                </tr>
              )
            })
          ))}
        </tbody>
      </table>

      {/* Rekomendasi */}
      <div style={{ marginBottom: 30 }}>
        <div style={{ fontWeight: 'bold', fontSize: '10pt', marginBottom: 6 }}>Rekomendasi :</div>
        <div style={{
          border: '1px solid #000', padding: '10px 12px', minHeight: 60,
          fontSize: '10pt', lineHeight: 1.6,
        }}>
          {review?.rekomendasi || ''}
        </div>
      </div>

      {/* Tanda Tangan */}
      <div style={{ textAlign: 'right', marginBottom: 10, fontSize: '10pt' }}>
        Purwokerto, {tglReview}
      </div>
      <div className="signature-section">
        <div className="signature-box">
          <div>AUDITEE</div>
          <div>
            <div style={{ fontWeight: 'bold', textDecoration: 'underline' }}>
              {rps.dosen?.nama_lengkap}
            </div>
            <div style={{ fontSize: '9.5pt', color: '#475569' }}>
              NIDN. {rps.dosen?.nidn || '—'}
            </div>
          </div>
        </div>
        <div className="signature-box">
          <div>AUDITOR,</div>
          <div>
            <div style={{ fontWeight: 'bold', textDecoration: 'underline' }}>
              {kaprodi?.nama_lengkap || review?.reviewer?.nama_lengkap || '(Ka. Prodi)'}
            </div>
            <div style={{ fontSize: '9.5pt', color: '#475569' }}>
              NIDN. {kaprodi?.nidn || review?.reviewer?.nidn || '—'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
