import { useState, useEffect, useCallback } from 'react'
import { Plus, FileText, Clock, CheckCircle, AlertCircle, Eye } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { dbRPS, currentTahunAkademik, TAHUN_AKADEMIK_LIST, SEMESTER_LIST } from '@/lib/db'

const STATUS_CONFIG = {
  draft:     { label:'Draft',      class:'rps-status-draft',     icon: Clock },
  submitted: { label:'Menunggu',   class:'rps-status-submitted', icon: Clock },
  approved:  { label:'Disetujui',  class:'rps-status-approved',  icon: CheckCircle },
  revision:  { label:'Perlu Revisi',class:'rps-status-revision', icon: AlertCircle },
}

export default function RpsListPage() {
  const { profile, user } = useAuth()
  const navigate = useNavigate()
  const cur = currentTahunAkademik()

  const [rpsList, setRpsList] = useState([])
  const [loading, setLoading] = useState(true)
  const [tahun,   setTahun]   = useState(cur.tahun)
  const [semester,setSemester]= useState('Semua')
  const [filter,  setFilter]  = useState('all')

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await dbRPS.getByDosen(user.id)
    if (!error) {
      const filtered = (data ?? []).filter(r =>
        r.tahun_akademik === tahun && (semester === 'Semua' || r.semester_aktif === semester)
      )
      setRpsList(filtered)
    }
    setLoading(false)
  }, [user, tahun, semester])

  useEffect(() => { load() }, [load])

  const displayed = filter === 'all'
    ? rpsList
    : rpsList.filter(r => r.status === filter)

  return (
    <div>
      <div className="page-header" style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 className="page-title">RPS Saya</h1>
          <p className="page-subtitle">Daftar Rencana Pembelajaran Semester yang Anda buat</p>
        </div>
        <NavLink to="/rps/new" className="btn btn-primary">
          <Plus size={14} /> Buat RPS Baru
        </NavLink>
      </div>

      {/* Filter bar */}
      <div className="card" style={{ padding:'14px 16px', marginBottom:20 }}>
        <div style={{ display:'flex', gap:12, flexWrap:'wrap', alignItems:'flex-end' }}>
          <div className="input-group" style={{ margin:0 }}>
            <label className="input-label">Tahun Akademik</label>
            <select className="input" value={tahun} onChange={e => setTahun(e.target.value)} style={{ minWidth:140 }}>
              {TAHUN_AKADEMIK_LIST.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="input-group" style={{ margin:0 }}>
            <label className="input-label">Semester</label>
            <select className="input" value={semester} onChange={e => setSemester(e.target.value)}>
              <option value="Semua">Semua</option>
              {SEMESTER_LIST.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ display:'flex', gap:6, marginLeft:'auto', flexWrap:'wrap' }}>
            {['all','draft','submitted','approved','revision'].map(f => (
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
      <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap' }}>
        {Object.entries(STATUS_CONFIG).map(([k, cfg]) => {
          const count = rpsList.filter(r => r.status === k).length
          const Icon = cfg.icon
          return (
            <div key={k} className="card" style={{ padding:'10px 16px', display:'flex', alignItems:'center', gap:8, flex:'1 1 140px' }}>
              <Icon size={14} />
              <span style={{ fontSize:12, color:'#64748b' }}>{cfg.label}</span>
              <span style={{ fontWeight:700, fontSize:18, marginLeft:'auto' }}>{count}</span>
            </div>
          )
        })}
      </div>

      {/* List */}
      {loading ? (
        <div className="card" style={{ padding:48, textAlign:'center' }}>
          <div className="spinner" style={{ margin:'0 auto 12px' }} />
          Memuat RPS…
        </div>
      ) : displayed.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📄</div>
            <div className="empty-state-text">
              {filter === 'all' ? 'Belum ada RPS pada semester ini' : `Tidak ada RPS dengan status "${STATUS_CONFIG[filter]?.label}"`}
            </div>
            <div className="empty-state-sub">Buat RPS baru dengan klik tombol di atas</div>
            {filter === 'all' && (
              <NavLink to="/rps/new" className="btn btn-primary btn-sm" style={{ marginTop:8 }}>
                <Plus size={13} /> Buat RPS Baru
              </NavLink>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {displayed.map(rps => {
            const cfg = STATUS_CONFIG[rps.status] ?? STATUS_CONFIG.draft
            const Icon = cfg.icon
            return (
              <div key={rps.id} className="card" style={{ padding:'16px 20px', display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
                {/* MK Info */}
                <div style={{ flex:1, minWidth:220 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                    <span className="badge-pill badge-slate" style={{ fontFamily:'monospace', fontSize:11 }}>
                      {rps.mk?.kode_mk}
                    </span>
                    <span className={`badge-pill ${cfg.class}`}>
                      <Icon size={11} /> {cfg.label}
                    </span>
                  </div>
                  <div style={{ fontWeight:600, fontSize:14, color:'#1e293b' }}>{rps.mk?.nama_mk}</div>
                  <div style={{ fontSize:12, color:'#94a3b8', marginTop:2 }}>
                    {rps.mk?.prodi?.nama} · {rps.mk?.sks} SKS · Sem {rps.mk?.semester}
                  </div>
                </div>
                {/* Meta */}
                <div style={{ fontSize:12, color:'#94a3b8', textAlign:'right' }}>
                  <div>{rps.tahun_akademik} — {rps.semester_aktif}</div>
                  <div style={{ marginTop:2 }}>
                    Diperbarui {new Date(rps.updated_at).toLocaleDateString('id-ID', { day:'numeric', month:'short' })}
                  </div>
                </div>
                {/* Action */}
                <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/rps/${rps.id}`)}>
                  <Eye size={13} /> Buka
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
