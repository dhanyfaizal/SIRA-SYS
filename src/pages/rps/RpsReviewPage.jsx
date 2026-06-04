import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Save, Printer, CheckCircle, AlertTriangle, XCircle,
  ChevronDown, ChevronRight, History, Clock
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { dbRPS, dbReviewRps, dbNotifications } from '@/lib/db'
import toast from 'react-hot-toast'

// ── Definisi 19 aspek review sesuai Blanko ────────────────────────
const REVIEW_SECTIONS = [
  {
    group: 'A',
    title: 'Peta Capaian Pembelajaran',
    color: '#10b981',
    bgColor: '#d1fae5',
    items: [
      { key: 'a_cpmk_subcpmk', label: 'CPMK dan Sub-CPMK', desc: 'Kesesuaian CPMK dan Sub-CPMK dengan CPL yang dibebankan pada mata kuliah' },
    ]
  },
  {
    group: 'B',
    title: 'Profil Mata Kuliah',
    color: '#3b82f6',
    bgColor: '#dbeafe',
    items: [
      { key: 'b1_identitas_mk', label: 'Identitas Mata Kuliah', desc: 'Kode MK, nama MK, SKS, semester, dan program studi' },
      { key: 'b2_penanggung_jawab', label: 'Penanggung Jawab & Dosen', desc: 'Penanggung jawab MK, dosen pengampu MK, kaprodi, dan tanggal penyusunan' },
      { key: 'b3_cpl_cpmk', label: 'CPL-PRODI & CP-MK', desc: 'CPL-PRODI yang dibebankan pada mata kuliah, dan CP-Mata Kuliah' },
      { key: 'b4_deskripsi_mk', label: 'Deskripsi Singkat MK', desc: 'Deskripsi singkat mata kuliah' },
      { key: 'b5_bahan_kajian', label: 'Bahan Kajian / Materi', desc: 'Bahan kajian / materi pembelajaran' },
      { key: 'b6_referensi', label: 'Daftar Referensi', desc: 'Daftar referensi dan pustaka yang digunakan' },
      { key: 'b7_media_pembelajaran', label: 'Media Pembelajaran', desc: 'Perangkat lunak dan perangkat keras yang digunakan' },
      { key: 'b8_prasyarat', label: 'Pra-Syarat MK', desc: 'Mata kuliah prasyarat yang harus ditempuh sebelumnya' },
      { key: 'b9_komposisi', label: 'Komposisi Teori & Praktek', desc: 'Persentase komposisi antara teori dan praktek' },
    ]
  },
  {
    group: 'C',
    title: 'Rencana Pembelajaran Semester (RPS)',
    color: '#8b5cf6',
    bgColor: '#ede9fe',
    items: [
      { key: 'c1_minggu_ke', label: 'Minggu Ke', desc: 'Kelengkapan rencana pertemuan mingguan (16 minggu)' },
      { key: 'c2_kemampuan_akhir', label: 'Kemampuan Akhir', desc: 'Kemampuan akhir yang direncanakan pada setiap pertemuan' },
      { key: 'c3_bahan_kajian_rps', label: 'Bahan Kajian (Materi Ajar)', desc: 'Materi ajar yang sesuai dengan kemampuan akhir' },
      { key: 'c4_metode_pembelajaran', label: 'Metode Pembelajaran', desc: 'Metode dan bentuk pembelajaran yang digunakan' },
      { key: 'c5_waktu', label: 'Waktu', desc: 'Alokasi waktu untuk setiap pertemuan' },
      { key: 'c6_pengalaman_belajar', label: 'Pengalaman Belajar', desc: 'Pengalaman belajar mahasiswa yang direncanakan' },
      { key: 'c7_kriteria_penilaian', label: 'Kriteria Penilaian & Indikator', desc: 'Kriteria penilaian dan indikator capaian' },
      { key: 'c8_bobot_nilai', label: 'Bobot Nilai', desc: 'Bobot nilai untuk setiap komponen penilaian' },
      { key: 'c9_referensi_rps', label: 'Referensi', desc: 'Referensi yang digunakan per pertemuan' },
    ]
  },
]

const ALL_KEYS = REVIEW_SECTIONS.flatMap(s => s.items.map(i => i.key))

const RATING_OPTIONS = [
  { value: 'sesuai', label: 'Sesuai', icon: CheckCircle, color: '#10b981', bg: '#d1fae5', border: '#6ee7b7' },
  { value: 'cukup', label: 'Cukup', icon: AlertTriangle, color: '#f59e0b', bg: '#fef3c7', border: '#fcd34d' },
  { value: 'tidak_sesuai', label: 'Tidak Sesuai', icon: XCircle, color: '#ef4444', bg: '#fee2e2', border: '#fca5a5' },
]

export default function RpsReviewPage() {
  const { id } = useParams()
  const { user, role } = useAuth()
  const navigate = useNavigate()

  const [rps, setRps] = useState(null)
  const [review, setReview] = useState({})
  const [reviewId, setReviewId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [history, setHistory] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [expandedSections, setExpandedSections] = useState({ A: true, B: true, C: true })

  const isKaprodi = role === 'kaprodi'

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        // Load RPS data
        const { data: rpsData, error: rpsErr } = await dbRPS.getById(id)
        if (rpsErr || !rpsData) {
          toast.error('RPS tidak ditemukan')
          navigate(-1)
          return
        }
        setRps(rpsData)

        // Load latest review
        const { data: latestReview } = await dbReviewRps.getLatestByRpsId(id)
        if (latestReview) {
          setReview(latestReview)
          setReviewId(latestReview.id)
        }

        // Load history
        const { data: allReviews } = await dbReviewRps.getAllByRpsId(id)
        if (allReviews) setHistory(allReviews)
      } catch (err) {
        console.error(err)
        toast.error('Gagal memuat data: ' + err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  function setField(key, value) {
    setReview(prev => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      // Build data payload
      const payload = { rps_id: id, reviewer_id: user.id }
      ALL_KEYS.forEach(key => {
        payload[key] = review[key] || null
        payload[`${key}_catatan`] = review[`${key}_catatan`] || null
      })
      payload.rekomendasi = review.rekomendasi || null

      let result
      if (isKaprodi) {
        // Kaprodi: selalu buat review baru (simpan riwayat)
        const { data, error } = await dbReviewRps.create(payload)
        if (error) throw error
        result = data
        setReviewId(data.id)
        toast.success('Review berhasil disimpan! 📋')
      } else {
        toast.error('Hanya Ka. Prodi yang dapat menyimpan review.')
        setSaving(false)
        return
      }

      // Refresh history
      const { data: allReviews } = await dbReviewRps.getAllByRpsId(id)
      if (allReviews) setHistory(allReviews)

      // Kirim notifikasi ke dosen
      if (rps?.dosen_id && rps.dosen_id !== user.id) {
        await dbNotifications.create(
          rps.dosen_id,
          'Review RPS Baru 📋',
          `Ka. Prodi telah melakukan review pada RPS ${rps.mk?.kode_mk} - ${rps.mk?.nama_mk}. Silakan periksa hasilnya.`,
          `/rps/${id}`
        )
      }
      // Notifikasi tim pengajar
      if (rps?.team_dosen) {
        for (const memberId of rps.team_dosen) {
          if (memberId !== user.id) {
            await dbNotifications.create(
              memberId,
              'Review RPS Baru 📋',
              `Ka. Prodi telah melakukan review pada RPS ${rps.mk?.kode_mk} - ${rps.mk?.nama_mk}.`,
              `/rps/${id}`
            )
          }
        }
      }
    } catch (err) {
      console.error(err)
      toast.error('Gagal menyimpan review: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  function loadHistoryEntry(entry) {
    setReview(entry)
    setReviewId(entry.id)
    setShowHistory(false)
    toast.success('Riwayat review dimuat')
  }

  // Progress stats
  const filledCount = ALL_KEYS.filter(k => review[k]).length
  const sesuaiCount = ALL_KEYS.filter(k => review[k] === 'sesuai').length
  const cukupCount = ALL_KEYS.filter(k => review[k] === 'cukup').length
  const tidakCount = ALL_KEYS.filter(k => review[k] === 'tidak_sesuai').length

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80, flexDirection: 'column', gap: 16 }}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
      <p style={{ color: '#94a3b8', fontSize: 13 }}>Memuat formulir review RPS…</p>
    </div>
  )

  if (!rps) return null

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>
          <ArrowLeft size={14} /> Kembali
        </button>
        <div style={{ flex: 1 }} />

        {history.length > 0 && (
          <button className="btn btn-secondary btn-sm" onClick={() => setShowHistory(!showHistory)} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <History size={13} /> Riwayat ({history.length})
          </button>
        )}

        <button
          className="btn btn-secondary btn-sm"
          onClick={() => window.open(`/rps/${id}/review/print`, '_blank')}
          style={{ display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <Printer size={13} /> Cetak Laporan
        </button>

        {isKaprodi && (
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Save size={13} /> {saving ? 'Menyimpan...' : 'Simpan Review'}
          </button>
        )}
      </div>

      {/* History panel */}
      {showHistory && history.length > 0 && (
        <div className="card" style={{ marginBottom: 16, animation: 'slideUp .2s ease' }}>
          <div className="card-header">
            <span style={{ fontWeight: 700, fontSize: 14 }}>Riwayat Review</span>
          </div>
          <div className="card-body" style={{ maxHeight: 200, overflowY: 'auto' }}>
            {history.map((h, idx) => (
              <div key={h.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px',
                background: idx === 0 ? '#eef2ff' : '#f8fafc',
                border: '1px solid #e2e8f0', borderRadius: 6, marginBottom: 6, cursor: 'pointer',
                transition: 'background .12s',
              }}
                onClick={() => loadHistoryEntry(h)}
                onMouseEnter={e => e.currentTarget.style.background = '#eef2ff'}
                onMouseLeave={e => { if (idx !== 0) e.currentTarget.style.background = '#f8fafc' }}
              >
                <Clock size={14} color="#64748b" />
                <div style={{ flex: 1, fontSize: 12 }}>
                  <span style={{ fontWeight: 600, color: '#1e293b' }}>
                    {new Date(h.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span style={{ color: '#94a3b8', marginLeft: 8 }}>
                    oleh {h.reviewer?.nama_lengkap || 'Ka. Prodi'}
                  </span>
                </div>
                {idx === 0 && (
                  <span className="badge-pill badge-indigo" style={{ fontSize: 9 }}>Terbaru</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RPS Info Card */}
      <div className="card" style={{ marginBottom: 16, background: 'linear-gradient(135deg, #4f46e5 0%, #312e81 100%)', color: '#fff', border: 'none' }}>
        <div className="card-body" style={{ padding: '20px 24px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', opacity: .8, marginBottom: 4 }}>
            Lembar Review RPS
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 6px', letterSpacing: '-.3px' }}>
            {rps.mk?.nama_mk}
          </h2>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12, opacity: .9 }}>
            <span>Kode: <strong>{rps.mk?.kode_mk}</strong></span>
            <span>•</span>
            <span>{rps.mk?.sks} SKS</span>
            <span>•</span>
            <span>Semester {rps.mk?.semester}</span>
            <span>•</span>
            <span>Dosen: <strong>{rps.dosen?.nama_lengkap}</strong></span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="card" style={{ marginBottom: 20, padding: '14px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>Progress Review</span>
          <span style={{ fontSize: 12, fontWeight: 800, color: '#4f46e5' }}>{filledCount} / 19 aspek</span>
        </div>
        <div style={{ height: 8, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden', marginBottom: 10 }}>
          <div style={{
            height: '100%',
            width: `${(filledCount / 19) * 100}%`,
            background: filledCount === 19 ? '#10b981' : 'linear-gradient(90deg, #4f46e5, #6366f1)',
            borderRadius: 99,
            transition: 'width .3s ease',
          }} />
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 11, color: '#64748b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
            Sesuai: <strong style={{ color: '#10b981' }}>{sesuaiCount}</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
            Cukup: <strong style={{ color: '#f59e0b' }}>{cukupCount}</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
            Tidak Sesuai: <strong style={{ color: '#ef4444' }}>{tidakCount}</strong>
          </div>
        </div>
      </div>

      {/* Review Sections */}
      {REVIEW_SECTIONS.map(section => {
        const isOpen = expandedSections[section.group]
        const sectionFilled = section.items.filter(i => review[i.key]).length

        return (
          <div key={section.group} className="card" style={{ marginBottom: 16 }}>
            {/* Section header */}
            <div
              className="card-header"
              style={{ cursor: 'pointer', userSelect: 'none' }}
              onClick={() => setExpandedSections(prev => ({ ...prev, [section.group]: !prev[section.group] }))}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 6,
                  background: section.bgColor, color: section.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 800,
                }}>
                  {section.group}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>{section.title}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>
                    {sectionFilled} / {section.items.length} aspek terisi
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Mini indicator dots */}
                <div style={{ display: 'flex', gap: 3 }}>
                  {section.items.map(item => {
                    const val = review[item.key]
                    const dotColor = val === 'sesuai' ? '#10b981' : val === 'cukup' ? '#f59e0b' : val === 'tidak_sesuai' ? '#ef4444' : '#e2e8f0'
                    return <div key={item.key} style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, transition: 'background .2s' }} />
                  })}
                </div>
                {isOpen ? <ChevronDown size={16} color="#94a3b8" /> : <ChevronRight size={16} color="#94a3b8" />}
              </div>
            </div>

            {/* Section body */}
            {isOpen && (
              <div className="card-body" style={{ padding: '12px 20px 20px' }}>
                {section.items.map((item, idx) => (
                  <div key={item.key} style={{
                    padding: '16px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    marginBottom: idx < section.items.length - 1 ? 10 : 0,
                    transition: 'border-color .15s',
                    borderColor: review[item.key]
                      ? (review[item.key] === 'sesuai' ? '#6ee7b7' : review[item.key] === 'cukup' ? '#fcd34d' : '#fca5a5')
                      : '#e2e8f0',
                  }}>
                    {/* Item header */}
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 2 }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{item.desc}</div>
                    </div>

                    {/* Rating buttons */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                      {RATING_OPTIONS.map(opt => {
                        const isSelected = review[item.key] === opt.value
                        const Icon = opt.icon
                        return (
                          <button
                            key={opt.value}
                            onClick={() => isKaprodi && setField(item.key, isSelected ? null : opt.value)}
                            disabled={!isKaprodi}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 5,
                              padding: '6px 14px',
                              fontSize: 12, fontWeight: isSelected ? 700 : 500,
                              border: `1.5px solid ${isSelected ? opt.border : '#e2e8f0'}`,
                              borderRadius: 6,
                              background: isSelected ? opt.bg : '#ffffff',
                              color: isSelected ? opt.color : '#64748b',
                              cursor: isKaprodi ? 'pointer' : 'default',
                              transition: 'all .15s ease',
                              transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                              boxShadow: isSelected ? `0 2px 8px ${opt.color}20` : 'none',
                            }}
                          >
                            <Icon size={13} />
                            {opt.label}
                          </button>
                        )
                      })}
                    </div>

                    {/* Catatan textarea */}
                    <textarea
                      className="input"
                      placeholder="Catatan analisis deskriptif untuk aspek ini..."
                      rows={2}
                      value={review[`${item.key}_catatan`] || ''}
                      onChange={e => isKaprodi && setField(`${item.key}_catatan`, e.target.value)}
                      readOnly={!isKaprodi}
                      style={{ fontSize: 12, resize: 'vertical', minHeight: 48, background: '#ffffff' }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {/* Rekomendasi */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>Rekomendasi Umum</span>
        </div>
        <div className="card-body">
          <textarea
            className="input"
            placeholder="Tuliskan rekomendasi umum hasil review RPS ini..."
            rows={4}
            value={review.rekomendasi || ''}
            onChange={e => isKaprodi && setField('rekomendasi', e.target.value)}
            readOnly={!isKaprodi}
            style={{ fontSize: 13, resize: 'vertical', minHeight: 80 }}
          />
        </div>
      </div>

      {/* Bottom actions */}
      {isKaprodi && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 40 }}>
          <button className="btn btn-secondary" onClick={() => navigate(-1)}>
            Batal
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Save size={14} /> {saving ? 'Menyimpan...' : 'Simpan Review Baru'}
          </button>
        </div>
      )}
    </div>
  )
}
