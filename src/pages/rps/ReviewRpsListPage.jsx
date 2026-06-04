import { useState, useEffect, useCallback } from 'react'
import { FileText, CheckCircle, Clock, Eye, ClipboardCheck, Calendar, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { dbRPS, currentTahunAkademik, TAHUN_AKADEMIK_LIST, SEMESTER_LIST } from '@/lib/db'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function ReviewRpsListPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const cur = currentTahunAkademik()

  const [rpsList, setRpsList] = useState([])
  const [reviewMap, setReviewMap] = useState({}) // rps_id -> latest review
  const [loading, setLoading] = useState(true)
  const [tahun, setTahun] = useState(cur.tahun)
  const [semester, setSemester] = useState(cur.semester)
  const [filter, setFilter] = useState('all') // 'all' | 'reviewed' | 'pending'
  const [search, setSearch] = useState('')

  const prodiId = profile?.prodi_id

  const load = useCallback(async () => {
    if (!prodiId) return
    setLoading(true)
    try {
      // 1. Ambil semua RPS approved di prodi
      const { data: rpsData, error: rpsErr } = await dbRPS.getByProdi(prodiId)
      if (rpsErr) throw rpsErr

      const approved = (rpsData ?? []).filter(r =>
        r.status === 'approved' &&
        r.tahun_akademik === tahun &&
        r.semester_aktif === semester
      )
      setRpsList(approved)

      // 2. Ambil review terbaru per RPS
      if (approved.length > 0) {
        const rpsIds = approved.map(r => r.id)
        const { data: reviews, error: revErr } = await supabase
          .from('rps_reviews')
          .select('id, rps_id, created_at, updated_at, reviewer_id, a_cpmk_subcpmk, b1_identitas_mk, b2_penanggung_jawab, b3_cpl_cpmk, b4_deskripsi_mk, b5_bahan_kajian, b6_referensi, b7_media_pembelajaran, b8_prasyarat, b9_komposisi, c1_minggu_ke, c2_kemampuan_akhir, c3_bahan_kajian_rps, c4_metode_pembelajaran, c5_waktu, c6_pengalaman_belajar, c7_kriteria_penilaian, c8_bobot_nilai, c9_referensi_rps, rekomendasi')
          .in('rps_id', rpsIds)
          .order('created_at', { ascending: false })

        if (revErr) console.error('Error loading reviews:', revErr)
        
        // Map: ambil review terbaru per rps_id
        const map = {}
        ;(reviews ?? []).forEach(rev => {
          if (!map[rev.rps_id]) map[rev.rps_id] = rev
        })
        setReviewMap(map)
      } else {
        setReviewMap({})
      }
    } catch (err) {
      console.error(err)
      toast.error('Gagal memuat daftar RPS: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [prodiId, tahun, semester])

  useEffect(() => { load() }, [load])

  // Count filled aspects in a review
  function countFilledAspects(review) {
    if (!review) return 0
    const fields = [
      'a_cpmk_subcpmk',
      'b1_identitas_mk','b2_penanggung_jawab','b3_cpl_cpmk','b4_deskripsi_mk',
      'b5_bahan_kajian','b6_referensi','b7_media_pembelajaran','b8_prasyarat','b9_komposisi',
      'c1_minggu_ke','c2_kemampuan_akhir','c3_bahan_kajian_rps','c4_metode_pembelajaran',
      'c5_waktu','c6_pengalaman_belajar','c7_kriteria_penilaian','c8_bobot_nilai','c9_referensi_rps'
    ]
    return fields.filter(f => review[f]).length
  }

  function countByStatus(review, status) {
    if (!review) return 0
    const fields = [
      'a_cpmk_subcpmk',
      'b1_identitas_mk','b2_penanggung_jawab','b3_cpl_cpmk','b4_deskripsi_mk',
      'b5_bahan_kajian','b6_referensi','b7_media_pembelajaran','b8_prasyarat','b9_komposisi',
      'c1_minggu_ke','c2_kemampuan_akhir','c3_bahan_kajian_rps','c4_metode_pembelajaran',
      'c5_waktu','c6_pengalaman_belajar','c7_kriteria_penilaian','c8_bobot_nilai','c9_referensi_rps'
    ]
    return fields.filter(f => review[f] === status).length
  }

  // Filter & search
  const displayed = rpsList.filter(rps => {
    if (filter === 'reviewed' && !reviewMap[rps.id]) return false
    if (filter === 'pending' && reviewMap[rps.id]) return false
    if (search) {
      const q = search.toLowerCase()
      const match = (rps.mk?.kode_mk?.toLowerCase().includes(q)) ||
                    (rps.mk?.nama_mk?.toLowerCase().includes(q)) ||
                    (rps.dosen?.nama_lengkap?.toLowerCase().includes(q))
      if (!match) return false
    }
    return true
  })

  const totalReviewed = rpsList.filter(r => reviewMap[r.id]).length
  const totalPending = rpsList.length - totalReviewed

  if (!prodiId) return (
    <div className="page-header">
      <h1 className="page-title">Review RPS</h1>
      <p style={{ color: '#ef4444', fontSize: 13 }}>⚠️ Akun Anda belum ditetapkan ke Program Studi. Hubungi Admin.</p>
    </div>
  )

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Review RPS</h1>
        <p className="page-subtitle">Review kelengkapan dan kesesuaian RPS yang sudah disetujui, sesuai standar Blanko Review STIKOM</p>
      </div>

      {/* Stats strip */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div className="card" style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 160px' }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={18} color="#4f46e5" />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.3px' }}>Total Approved</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#1e293b' }}>{rpsList.length}</div>
          </div>
        </div>
        <div className="card" style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 160px' }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle size={18} color="#10b981" />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.3px' }}>Sudah Direview</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#10b981' }}>{totalReviewed}</div>
          </div>
        </div>
        <div className="card" style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 160px' }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={18} color="#f59e0b" />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.3px' }}>Belum Direview</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#f59e0b' }}>{totalPending}</div>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="card" style={{ padding: '14px 16px', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="input-group" style={{ margin: 0 }}>
            <label className="input-label">Tahun Akademik</label>
            <select className="input" value={tahun} onChange={e => setTahun(e.target.value)} style={{ minWidth: 140 }}>
              {TAHUN_AKADEMIK_LIST.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="input-group" style={{ margin: 0 }}>
            <label className="input-label">Semester</label>
            <select className="input" value={semester} onChange={e => setSemester(e.target.value)}>
              {SEMESTER_LIST.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="input-group" style={{ margin: 0, flex: '1 1 180px' }}>
            <label className="input-label">Cari MK / Dosen</label>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                className="input"
                placeholder="Cari kode MK, nama MK, atau dosen..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: 32 }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
            {[
              { key: 'all', label: 'Semua' },
              { key: 'pending', label: 'Belum Review' },
              { key: 'reviewed', label: 'Sudah Review' },
            ].map(f => (
              <button key={f.key}
                className={`btn btn-sm ${filter === f.key ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          Memuat daftar RPS untuk review…
        </div>
      ) : displayed.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-text">
              {rpsList.length === 0
                ? 'Belum ada RPS approved pada semester ini'
                : filter === 'pending' ? 'Semua RPS sudah direview!' : 'Tidak ada RPS yang cocok dengan filter'}
            </div>
            <div className="empty-state-sub">RPS harus berstatus "Disetujui" sebelum dapat direview.</div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {displayed.map(rps => {
            const review = reviewMap[rps.id]
            const filled = countFilledAspects(review)
            const sesuai = countByStatus(review, 'sesuai')
            const cukup = countByStatus(review, 'cukup')
            const tidakSesuai = countByStatus(review, 'tidak_sesuai')
            const isReviewed = !!review

            return (
              <div key={rps.id} className="card" style={{
                padding: '16px 20px',
                display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
                borderLeft: `3px solid ${isReviewed ? '#10b981' : '#f59e0b'}`,
                transition: 'box-shadow .15s',
              }}>
                {/* MK Info */}
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span className="badge-pill badge-slate" style={{ fontFamily: 'monospace', fontSize: 11 }}>
                      {rps.mk?.kode_mk}
                    </span>
                    {isReviewed ? (
                      <span className="badge-pill badge-green" style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <CheckCircle size={10} /> Sudah Direview
                      </span>
                    ) : (
                      <span className="badge-pill badge-amber" style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Clock size={10} /> Belum Direview
                      </span>
                    )}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{rps.mk?.nama_mk}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span>{rps.mk?.sks} SKS</span>
                    <span>•</span>
                    <span>Sem {rps.mk?.semester}</span>
                    <span>•</span>
                    <span style={{ fontWeight: 500, color: '#4f46e5' }}>Dosen: {rps.dosen?.nama_lengkap || '—'}</span>
                  </div>
                </div>

                {/* Review stats mini */}
                {isReviewed && (
                  <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#64748b' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#10b981' }}>{sesuai}</div>
                      <div>Sesuai</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#f59e0b' }}>{cukup}</div>
                      <div>Cukup</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#ef4444' }}>{tidakSesuai}</div>
                      <div>Tidak</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#6366f1' }}>{filled}/19</div>
                      <div>Terisi</div>
                    </div>
                  </div>
                )}

                {/* Meta */}
                <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'right', minWidth: 100 }}>
                  <div>{rps.tahun_akademik}</div>
                  <div>{rps.semester_aktif}</div>
                  {isReviewed && (
                    <div style={{ marginTop: 4, fontSize: 10, color: '#64748b' }}>
                      Review: {new Date(review.updated_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => navigate(`/rps/${rps.id}/review`)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      background: isReviewed ? '#4f46e5' : '#10b981',
                      borderColor: isReviewed ? '#4338ca' : '#059669',
                    }}
                  >
                    {isReviewed ? <Eye size={13} /> : <ClipboardCheck size={13} />}
                    {isReviewed ? 'Lihat / Edit' : 'Mulai Review'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
