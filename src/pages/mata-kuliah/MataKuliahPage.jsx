import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Pencil, Trash2, BookOpen, ChevronDown, ChevronRight } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { dbMK, dbProdi } from '@/lib/db'
import toast from 'react-hot-toast'
import MataKuliahForm from './MataKuliahForm'

// Kelompok MK berdasarkan semester
function groupBySemester(list) {
  return list.reduce((acc, mk) => {
    const s = mk.semester
    if (!acc[s]) acc[s] = []
    acc[s].push(mk)
    return acc
  }, {})
}

export default function MataKuliahPage() {
  const { profile } = useAuth()
  const [mklist,  setMklist]  = useState([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [modal,   setModal]   = useState(null)   // null | 'create' | mkObj
  const [delId,   setDelId]   = useState(null)
  const [expanded,setExpanded]= useState({})

  const prodiId = profile?.prodi_id

  const load = useCallback(async () => {
    if (!prodiId) return
    setLoading(true)
    const { data, error } = await dbMK.getByProdi(prodiId)
    if (!error) setMklist(data ?? [])
    setLoading(false)
  }, [prodiId])

  useEffect(() => { load() }, [load])

  // Filter
  const filtered = mklist.filter(mk =>
    mk.kode_mk.toLowerCase().includes(search.toLowerCase()) ||
    mk.nama_mk.toLowerCase().includes(search.toLowerCase())
  )
  const grouped = groupBySemester(filtered)
  const semesters = Object.keys(grouped).map(Number).sort()

  // Delete
  async function handleDelete(id) {
    const { error } = await dbMK.delete(id)
    if (error) { toast.error('Gagal hapus: ' + error.message); return }
    toast.success('Mata kuliah dihapus')
    setDelId(null)
    load()
  }

  function toggleSem(s) {
    setExpanded(p => ({ ...p, [s]: !p[s] }))
  }

  if (!prodiId) return (
    <div className="page-header">
      <h1 className="page-title">Mata Kuliah</h1>
      <p style={{ color:'#ef4444', fontSize:13 }}>⚠️ Akun Anda belum ditetapkan ke Program Studi. Hubungi Admin.</p>
    </div>
  )

  return (
    <div>
      <div className="page-header" style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 className="page-title">Mata Kuliah</h1>
          <p className="page-subtitle">Kelola daftar mata kuliah dalam program studi Anda</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('create')}>
          <Plus size={14} /> Tambah MK
        </button>
      </div>

      {/* Search */}
      <div className="card" style={{ marginBottom:20, padding:'14px 16px' }}>
        <div style={{ position:'relative', maxWidth:360 }}>
          <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#94a3b8' }} />
          <input
            className="input"
            style={{ paddingLeft:32 }}
            placeholder="Cari kode atau nama mata kuliah…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Stat chips */}
      <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap' }}>
        <span className="badge-pill badge-indigo" style={{ fontSize:12, padding:'4px 12px' }}>
          <BookOpen size={12} /> Total {mklist.length} MK
        </span>
        <span className="badge-pill badge-slate" style={{ fontSize:12, padding:'4px 12px' }}>
          {semesters.length} Semester
        </span>
        <span className="badge-pill badge-green" style={{ fontSize:12, padding:'4px 12px' }}>
          {mklist.reduce((a,m)=>a+m.sks,0)} Total SKS
        </span>
      </div>

      {/* List by semester */}
      {loading ? (
        <div className="card card-body" style={{ textAlign:'center', padding:48, color:'#94a3b8' }}>
          <div className="spinner" style={{ margin:'0 auto 12px' }} />
          Memuat data…
        </div>
      ) : semesters.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📚</div>
            <div className="empty-state-text">Belum ada mata kuliah</div>
            <div className="empty-state-sub">Tambahkan mata kuliah pertama untuk program studi Anda</div>
            <button className="btn btn-primary btn-sm" style={{ marginTop:8 }} onClick={() => setModal('create')}>
              <Plus size={12} /> Tambah MK
            </button>
          </div>
        </div>
      ) : (
        semesters.map(sem => {
          const items = grouped[sem]
          const isOpen = expanded[sem] !== false  // default open
          return (
            <div key={sem} className="card" style={{ marginBottom:12 }}>
              {/* Semester header */}
              <button
                onClick={() => toggleSem(sem)}
                style={{
                  width:'100%', display:'flex', alignItems:'center', gap:10,
                  padding:'14px 20px', background:'none', border:'none', cursor:'pointer',
                  borderBottom: isOpen ? '1px solid #f1f5f9' : 'none',
                }}
              >
                {isOpen ? <ChevronDown size={16} color="#6366f1" /> : <ChevronRight size={16} color="#94a3b8" />}
                <span style={{ fontWeight:700, fontSize:14, color:'#1e293b' }}>
                  Semester {sem}
                </span>
                <span className="badge-pill badge-indigo" style={{ marginLeft:'auto' }}>
                  {items.length} MK · {items.reduce((a,m)=>a+m.sks,0)} SKS
                </span>
              </button>

              {isOpen && (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Kode MK</th>
                        <th>Nama Mata Kuliah</th>
                        <th style={{ textAlign:'center' }}>SKS</th>
                        <th>CPL</th>
                        <th style={{ width:100 }}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(mk => (
                        <tr key={mk.id}>
                          <td>
                            <span className="badge-pill badge-slate" style={{ fontFamily:'monospace', fontSize:12 }}>
                              {mk.kode_mk}
                            </span>
                          </td>
                          <td style={{ fontWeight:500, color:'#1e293b' }}>{mk.nama_mk}</td>
                          <td style={{ textAlign:'center' }}>
                            <span className="badge-pill badge-indigo">{mk.sks} SKS</span>
                          </td>
                          <td style={{ fontSize:12, color:'#64748b' }}>
                            {mk.cpl?.length > 0 ? `${mk.cpl.length} CPL` : <span style={{ color:'#cbd5e1' }}>—</span>}
                          </td>
                          <td>
                            <div style={{ display:'flex', gap:4 }}>
                              <button className="btn btn-ghost btn-icon btn-sm" title="Edit" onClick={() => setModal(mk)}>
                                <Pencil size={13} />
                              </button>
                              <button className="btn btn-ghost btn-icon btn-sm" title="Hapus"
                                style={{ color:'#ef4444' }}
                                onClick={() => setDelId(mk.id)}>
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })
      )}

      {/* Modal Form */}
      {modal && (
        <MataKuliahForm
          mk={modal === 'create' ? null : modal}
          prodiId={prodiId}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load() }}
        />
      )}

      {/* Confirm Delete */}
      {delId && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth:380 }}>
            <div className="modal-header">
              <span className="modal-title">Hapus Mata Kuliah?</span>
            </div>
            <div className="modal-body">
              <p style={{ fontSize:13, color:'#64748b' }}>
                Mata kuliah yang sudah terhubung dengan RPS tidak dapat dihapus.
                Tindakan ini <strong>tidak dapat dibatalkan</strong>.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDelId(null)}>Batal</button>
              <button className="btn btn-danger" onClick={() => handleDelete(delId)}>Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
