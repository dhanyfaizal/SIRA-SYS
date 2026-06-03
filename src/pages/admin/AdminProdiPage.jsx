import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, X, GraduationCap, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

const EMPTY = { kode: '', nama: '' }

export default function AdminProdiPage() {
  const [list,    setList]    = useState([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(null)   // null | 'create' | prodiObj
  const [form,    setForm]    = useState(EMPTY)
  const [saving,  setSaving]  = useState(false)
  const [delId,   setDelId]   = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('program_studi')
      .select('id, kode, nama, created_at')
      .order('kode')
    if (!error) setList(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setForm(EMPTY)
    setModal('create')
  }

  function openEdit(prodi) {
    setForm({ kode: prodi.kode, nama: prodi.nama })
    setModal(prodi)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.kode.trim() || !form.nama.trim()) {
      toast.error('Kode dan Nama prodi wajib diisi')
      return
    }
    setSaving(true)
    const payload = { kode: form.kode.trim().toUpperCase(), nama: form.nama.trim() }
    const isEdit  = modal !== 'create'

    const { error } = isEdit
      ? await supabase.from('program_studi').update(payload).eq('id', modal.id)
      : await supabase.from('program_studi').insert(payload)

    setSaving(false)
    if (error) {
      toast.error(error.code === '23505'
        ? `Kode prodi "${payload.kode}" sudah ada`
        : error.message)
      return
    }
    toast.success(isEdit ? 'Program studi diperbarui' : 'Program studi ditambahkan ✅')
    setModal(null)
    load()
  }

  async function handleDelete(id) {
    const { error } = await supabase.from('program_studi').delete().eq('id', id)
    if (error) {
      toast.error('Gagal hapus — pastikan tidak ada MK atau pengguna yang terhubung')
      setDelId(null)
      return
    }
    toast.success('Program studi dihapus')
    setDelId(null)
    load()
  }

  return (
    <div>
      <div className="page-header" style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 className="page-title">Program Studi</h1>
          <p className="page-subtitle">Kelola daftar program studi yang tersedia di STIKOM Yos Sudarso</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-secondary" onClick={load} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
          </button>
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={14} /> Tambah Prodi
          </button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="card" style={{ padding:48, textAlign:'center' }}>
          <div className="spinner" style={{ margin:'0 auto 12px' }} />
          Memuat…
        </div>
      ) : list.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">🎓</div>
            <div className="empty-state-text">Belum ada program studi</div>
            <div className="empty-state-sub">Tambahkan program studi pertama</div>
            <button className="btn btn-primary btn-sm" style={{ marginTop:8 }} onClick={openCreate}>
              <Plus size={12} /> Tambah Prodi
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:14 }}>
          {list.map(p => (
            <div key={p.id} className="card" style={{ padding:'20px 22px', display:'flex', gap:16, alignItems:'flex-start' }}>
              {/* Icon */}
              <div style={{
                width:48, height:48, borderRadius:12, background:'#eef2ff',
                display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
              }}>
                <GraduationCap size={22} color="#6366f1" />
              </div>

              {/* Info */}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                  <span className="badge-pill badge-indigo" style={{ fontFamily:'monospace', fontWeight:700 }}>
                    {p.kode}
                  </span>
                </div>
                <div style={{ fontWeight:700, fontSize:14, color:'#1e293b', lineHeight:1.4 }}>
                  {p.nama}
                </div>
                <div style={{ fontSize:11, color:'#94a3b8', marginTop:4 }}>
                  Ditambahkan {new Date(p.created_at).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' })}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display:'flex', flexDirection:'column', gap:4, flexShrink:0 }}>
                <button className="btn btn-ghost btn-icon btn-sm" title="Edit" onClick={() => openEdit(p)}>
                  <Pencil size={13} />
                </button>
                <button className="btn btn-ghost btn-icon btn-sm" title="Hapus"
                  style={{ color:'#ef4444' }}
                  onClick={() => setDelId(p.id)}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {list.length > 0 && (
        <div style={{ marginTop:16, padding:'10px 16px', background:'#f8fafc', borderRadius:8, border:'1px solid #e2e8f0', display:'flex', gap:16, fontSize:12, color:'#64748b' }}>
          <span><strong style={{ color:'#1e293b' }}>{list.length}</strong> program studi terdaftar</span>
          <span>Kode: {list.map(p => p.kode).join(', ')}</span>
        </div>
      )}

      {/* Modal Form */}
      {modal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth:400 }}>
            <div className="modal-header">
              <span className="modal-title">
                {modal === 'create' ? 'Tambah Program Studi' : `Edit — ${modal.nama}`}
              </span>
              <button className="btn btn-ghost btn-icon" onClick={() => setModal(null)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="input-group">
                  <label className="input-label">Kode Prodi *</label>
                  <input
                    className="input"
                    placeholder="SI, TI, KA, DKV…"
                    value={form.kode}
                    onChange={e => setForm(p => ({ ...p, kode: e.target.value.toUpperCase() }))}
                    maxLength={10}
                    required
                    autoFocus
                  />
                  <span className="input-hint">Singkatan kapital, maks 10 karakter</span>
                </div>
                <div className="input-group">
                  <label className="input-label">Nama Program Studi *</label>
                  <input
                    className="input"
                    placeholder="Teknik Informatika"
                    value={form.nama}
                    onChange={e => setForm(p => ({ ...p, nama: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Menyimpan…' : modal === 'create' ? 'Tambah Prodi' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      {delId && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth:380 }}>
            <div className="modal-header">
              <span className="modal-title">Hapus Program Studi?</span>
            </div>
            <div className="modal-body">
              <p style={{ fontSize:13, color:'#64748b' }}>
                Jika ada pengguna atau mata kuliah yang terhubung ke prodi ini, penghapusan akan gagal.
                Pindahkan data terlebih dahulu sebelum menghapus.
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
