import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, UserCheck, Search } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { dbMK, dbPenugasan, dbProfiles, TAHUN_AKADEMIK_LIST, SEMESTER_LIST, currentTahunAkademik } from '@/lib/db'
import toast from 'react-hot-toast'

export default function PenugasanPage() {
  const { profile } = useAuth()
  const prodiId = profile?.prodi_id

  const cur = currentTahunAkademik()
  const [tahun,    setTahun]    = useState(cur.tahun)
  const [semester, setSemester] = useState(cur.semester)
  const [mklist,   setMklist]   = useState([])
  const [dosenList,setDosenList]= useState([])
  const [penugasan,setPenugasan]= useState([])  // [{id, mk:{...}, dosen:{...}}]
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(null)  // null | mkObj
  const [selDosen, setSelDosen] = useState('')

  const load = useCallback(async () => {
    if (!prodiId) return
    setLoading(true)
    const { supabase } = await import('@/lib/supabase')
    const [resMK, resDosen, resPen] = await Promise.all([
      dbMK.getByProdi(prodiId),
      // Ambil SEMUA dosen/kaprodi — tidak filter prodi_id agar lintas prodi bisa dipilih
      supabase
        .from('profiles')
        .select('id, nama_lengkap, nidn, email, prodi_id, program_studi(kode)')
        .in('role', ['dosen', 'kaprodi'])
        .order('nama_lengkap'),
      supabaseDirectPenugasan(prodiId, tahun, semester),
    ])
    setMklist(resMK.data ?? [])
    setDosenList(resDosen.data ?? [])
    setPenugasan(resPen)
    setLoading(false)
  }, [prodiId, tahun, semester])

  useEffect(() => { load() }, [load])

  async function handleAssign() {
    if (!selDosen || !modal?.id) { toast.error('Pilih dosen terlebih dahulu'); return }
    const dup = penugasan.find(p => p.mk_id === modal.id && p.dosen_id === selDosen)
    if (dup) { toast.error('Dosen sudah ditugaskan ke MK ini'); return }

    const { error } = await import('@/lib/supabase').then(m =>
      m.supabase.from('penugasan_dosen').insert({
        mk_id: modal.id, dosen_id: selDosen,
        tahun_akademik: tahun, semester_aktif: semester,
      })
    )
    if (error) { toast.error(error.message); return }
    toast.success('Penugasan berhasil ditambahkan')
    setModal(null)
    setSelDosen('')
    load()
  }

  async function handleDelete(id) {
    const { error } = await import('@/lib/db').then(m => m.dbPenugasan.delete(id))
    if (error) { toast.error(error.message); return }
    toast.success('Penugasan dihapus')
    load()
  }

  if (!prodiId) return (
    <div className="page-header">
      <h1 className="page-title">Penugasan Dosen</h1>
      <p style={{ color:'#ef4444', fontSize:13 }}>⚠️ Akun belum ditetapkan ke Program Studi.</p>
    </div>
  )

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Penugasan Dosen</h1>
        <p className="page-subtitle">Tetapkan dosen pengampu untuk setiap mata kuliah per semester</p>
      </div>

      {/* Filter bar */}
      <div className="card" style={{ padding:'14px 16px', marginBottom:20 }}>
        <div style={{ display:'flex', gap:12, flexWrap:'wrap', alignItems:'center' }}>
          <div className="input-group" style={{ margin:0 }}>
            <label className="input-label">Tahun Akademik</label>
            <select className="input" value={tahun} onChange={e => setTahun(e.target.value)} style={{ minWidth:140 }}>
              {TAHUN_AKADEMIK_LIST.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="input-group" style={{ margin:0 }}>
            <label className="input-label">Semester</label>
            <select className="input" value={semester} onChange={e => setSemester(e.target.value)}>
              {SEMESTER_LIST.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card card-body" style={{ textAlign:'center', padding:48 }}>
          <div className="spinner" style={{ margin:'0 auto 12px' }} />
          Memuat…
        </div>
      ) : mklist.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-text">Belum ada mata kuliah</div>
            <div className="empty-state-sub">Tambahkan MK terlebih dahulu di menu Mata Kuliah</div>
          </div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {mklist.map(mk => {
            const assigned = penugasan.filter(p => p.mk_id === mk.id)
            return (
              <div key={mk.id} className="card">
                <div style={{ padding:'14px 20px', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                  <span className="badge-pill badge-slate" style={{ fontFamily:'monospace', fontSize:12 }}>
                    {mk.kode_mk}
                  </span>
                  <div style={{ flex:1, minWidth:200 }}>
                    <div style={{ fontWeight:600, fontSize:13, color:'#1e293b' }}>{mk.nama_mk}</div>
                    <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>
                      Semester {mk.semester} · {mk.sks} SKS
                    </div>
                  </div>
                  <button className="btn btn-secondary btn-sm"
                    onClick={() => { setModal(mk); setSelDosen('') }}>
                    <UserCheck size={13} /> Tugaskan Dosen
                  </button>
                </div>

                {assigned.length > 0 && (
                  <div style={{ borderTop:'1px solid #f1f5f9', padding:'10px 20px', display:'flex', flexWrap:'wrap', gap:8 }}>
                    {assigned.map(p => {
                      const d = dosenList.find(d => d.id === p.dosen_id)
                      return d ? (
                        <div key={p.id} style={{
                          display:'flex', alignItems:'center', gap:6,
                          background:'#eef2ff', border:'1px solid #c7d2fe',
                          borderRadius:20, padding:'4px 12px 4px 4px',
                          fontSize:12,
                        }}>
                          <div style={{
                            width:24, height:24, borderRadius:'50%',
                            background:'#6366f1', color:'#fff',
                            display:'flex', alignItems:'center', justifyContent:'center',
                            fontSize:10, fontWeight:700, flexShrink:0,
                          }}>
                            {d.nama_lengkap.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
                          </div>
                          <span style={{ color:'#4338ca', fontWeight:500 }}>{d.nama_lengkap}</span>
                          <button onClick={() => handleDelete(p.id)}
                            style={{ background:'none', border:'none', cursor:'pointer', padding:0, marginLeft:2 }}>
                            <Trash2 size={11} color="#ef4444" />
                          </button>
                        </div>
                      ) : null
                    })}
                  </div>
                )}

                {assigned.length === 0 && (
                  <div style={{ borderTop:'1px solid #f1f5f9', padding:'8px 20px' }}>
                    <span style={{ fontSize:12, color:'#cbd5e1', fontStyle:'italic' }}>Belum ada dosen yang ditugaskan</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal tugaskan dosen */}
      {modal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth:420 }}>
            <div className="modal-header">
              <span className="modal-title">Tugaskan Dosen</span>
            </div>
            <div className="modal-body">
              <p style={{ fontSize:13, color:'#64748b' }}>
                Mata Kuliah: <strong>{modal.kode_mk} — {modal.nama_mk}</strong>
              </p>
              <div className="input-group">
                <label className="input-label">Pilih Dosen</label>
                <select className="input" value={selDosen} onChange={e => setSelDosen(e.target.value)}>
                  <option value="">— Pilih dosen —</option>
                  {dosenList.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.nama_lengkap}
                      {d.program_studi?.kode ? ` — ${d.program_studi.kode}` : ' — (prodi belum ditetapkan)'}
                      {d.nidn ? ` [${d.nidn}]` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Batal</button>
              <button className="btn btn-primary" onClick={handleAssign}>
                <UserCheck size={14} /> Tugaskan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Helper langsung query tanpa join problem
async function supabaseDirectPenugasan(prodiId, tahun, semester) {
  const { supabase } = await import('@/lib/supabase')
  const { data } = await supabase
    .from('penugasan_dosen')
    .select('id, mk_id, dosen_id, tahun_akademik, semester_aktif')
    .eq('tahun_akademik', tahun)
    .eq('semester_aktif', semester)
  return data ?? []
}
