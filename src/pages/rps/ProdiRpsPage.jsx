import { useState, useEffect, useCallback } from 'react'
import { FileText, Clock, CheckCircle, AlertCircle, Eye, Trash2, Calendar, BookOpen } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { dbRPS, currentTahunAkademik, TAHUN_AKADEMIK_LIST, SEMESTER_LIST } from '@/lib/db'
import toast from 'react-hot-toast'

const STATUS_CONFIG = {
  draft:     { label:'Draft',          class:'rps-status-draft',     icon: Clock },
  submitted: { label:'Menunggu Review', class:'rps-status-submitted', icon: Clock },
  approved:  { label:'Disetujui',       class:'rps-status-approved',  icon: CheckCircle },
  revision:  { label:'Perlu Revisi',    class:'rps-status-revision',  icon: AlertCircle },
}

export default function ProdiRpsPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const cur = currentTahunAkademik()

  const [rpsList, setRpsList] = useState([])
  const [loading, setLoading] = useState(true)
  const [tahun,   setTahun]   = useState(cur.tahun)
  const [semester,setSemester]= useState(cur.semester)
  const [filter,  setFilter]  = useState('all')

  const prodiId = profile?.prodi_id

  const load = useCallback(async () => {
    if (!prodiId) return
    setLoading(true)
    try {
      const { data, error } = await dbRPS.getByProdi(prodiId)
      if (error) throw error
      
      const filtered = (data ?? []).filter(r =>
        r.tahun_akademik === tahun && r.semester_aktif === semester
      )
      setRpsList(filtered)
    } catch (err) {
      console.error(err)
      toast.error('Gagal memuat daftar RPS: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [prodiId, tahun, semester])

  useEffect(() => {
    load()
  }, [load])

  async function handleDelete(id) {
    if (!window.confirm('Apakah Anda yakin ingin menghapus draf RPS ini secara permanen?')) return
    try {
      const { error } = await dbRPS.delete(id)
      if (error) throw error
      toast.success('RPS berhasil dihapus')
      load()
    } catch (err) {
      console.error(err)
      toast.error('Gagal menghapus: ' + err.message)
    }
  }

  const displayed = filter === 'all'
    ? rpsList
    : rpsList.filter(r => r.status === filter)

  if (!prodiId) return (
    <div className="page-header">
      <h1 className="page-title">RPS Prodi</h1>
      <p style={{ color: '#ef4444', fontSize: 13 }}>⚠️ Akun Anda belum ditetapkan ke Program Studi. Hubungi Admin.</p>
    </div>
  )

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Semua RPS Prodi</h1>
        <p className="page-subtitle">Pantau, tinjau, dan kelola seluruh RPS yang dibuat oleh dosen di program studi Anda</p>
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
          <div style={{ display: 'flex', gap: 6, marginLeft: 'auto', flexWrap: 'wrap' }}>
            {['all', 'draft', 'submitted', 'approved', 'revision'].map(f => (
              <button key={f}
                className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'Semua' : STATUS_CONFIG[f]?.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {Object.entries(STATUS_CONFIG).map(([k, cfg]) => {
          const count = rpsList.filter(r => r.status === k).length
          const Icon = cfg.icon
          return (
            <div key={k} className="card" style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 140px' }}>
              <Icon size={14} className="sidebar-icon" />
              <span style={{ fontSize: 12, color: '#64748b' }}>{cfg.label}</span>
              <span style={{ fontWeight: 700, fontSize: 18, marginLeft: 'auto' }}>{count}</span>
            </div>
          )
        })}
      </div>

      {/* List */}
      {loading ? (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          Memuat daftar RPS Prodi…
        </div>
      ) : displayed.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📄</div>
            <div className="empty-state-text">
              {filter === 'all' ? 'Belum ada dosen yang membuat RPS pada semester ini' : `Tidak ada RPS prodi dengan status "${STATUS_CONFIG[filter]?.label}"`}
            </div>
            <div className="empty-state-sub">Silakan hubungi dosen pengampu untuk mengajukan draf RPS mereka.</div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {displayed.map(rps => {
            const cfg = STATUS_CONFIG[rps.status] ?? STATUS_CONFIG.draft
            const Icon = cfg.icon
            return (
              <div key={rps.id} className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                {/* MK Info */}
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span className="badge-pill badge-slate" style={{ fontFamily: 'monospace', fontSize: 11 }}>
                      {rps.mk?.kode_mk}
                    </span>
                    <span className={`badge-pill ${cfg.class}`}>
                      <Icon size={11} /> {cfg.label}
                    </span>
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

                {/* Meta */}
                <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'right' }}>
                  <div>{rps.tahun_akademik} — {rps.semester_aktif}</div>
                  <div style={{ marginTop: 2 }}>
                    Diperbarui {new Date(rps.updated_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/rps/${rps.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Eye size={13} /> Buka
                  </button>
                  {rps.status === 'draft' && (
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(rps.id)} style={{ padding: 8 }} title="Hapus Draf RPS">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
