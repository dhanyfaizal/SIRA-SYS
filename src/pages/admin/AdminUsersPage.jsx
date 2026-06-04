import { useState, useEffect, useCallback } from 'react'
import { Search, Shield, UserCheck, RefreshCw, ChevronDown, Trash2, CheckCircle, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { dbProdi } from '@/lib/db'
import toast from 'react-hot-toast'
import ConfirmModal from '@/components/ui/ConfirmModal'

const ROLES = ['dosen', 'kaprodi', 'admin']
const ROLE_LABELS = {
  admin:     { label: 'Administrator', class: 'badge-red'    },
  kaprodi:   { label: 'Ka. Prodi',     class: 'badge-indigo' },
  dosen:     { label: 'Dosen',         class: 'badge-green'  },
}

export default function AdminUsersPage() {
  const [users,    setUsers]    = useState([])
  const [prodi,    setProdi]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [saving,   setSaving]   = useState({})
  const [deleteConfirmUser, setDeleteConfirmUser] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: profiles }, { data: prodiData }] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, nama_lengkap, nidn, email, role, prodi_id, foto_url, created_at, is_verified, program_studi(kode, nama)')
          .order('created_at', { ascending: false }),
        supabase.from('program_studi').select('id, kode, nama').order('nama'),
      ])
      setUsers(profiles ?? [])
      setProdi(prodiData ?? [])
    } catch (err) {
      console.error(err)
      toast.error('Gagal memuat data pengguna: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    const matchSearch = !q || u.nama_lengkap?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.nidn?.includes(q)
    const matchRole = roleFilter === 'all' || u.role === roleFilter
    return matchSearch && matchRole
  })

  async function updateUser(id, field, value) {
    setSaving(p => ({ ...p, [id]: true }))
    const { error } = await supabase
      .from('profiles')
      .update({ [field]: value })
      .eq('id', id)

    if (error) {
      toast.error('Gagal memperbarui: ' + error.message)
    } else {
      setUsers(prev => prev.map(u => u.id === id ? { ...u, [field]: value } : u))
      toast.success('Berhasil diperbarui')
    }
    setSaving(p => ({ ...p, [id]: false }))
  }

  const deleteUser = (id, name) => {
    setDeleteConfirmUser({ id, name })
  }

  async function handleDeleteUser() {
    if (!deleteConfirmUser) return
    const { id, name } = deleteConfirmUser
    setDeleteConfirmUser(null)

    setSaving(p => ({ ...p, [id]: true }))
    try {
      const { error } = await supabase.rpc('delete_user_by_admin', { target_user_id: id })
      if (error) throw error

      setUsers(prev => prev.filter(u => u.id !== id))
      toast.success(`Pengguna "${name}" berhasil dihapus secara permanen! 🗑️`)
    } catch (err) {
      console.error(err)
      toast.error('Gagal menghapus pengguna: ' + err.message)
    } finally {
      setSaving(p => ({ ...p, [id]: false }))
    }
  }

  // Stats
  const stats = ROLES.reduce((acc, r) => {
    acc[r] = users.filter(u => u.role === r).length
    return acc
  }, {})

  const unverifiedCount = users.filter(u => !u.is_verified).length

  return (
    <div>
      <div className="page-header" style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 className="page-title">Daftar Pengguna</h1>
          <p className="page-subtitle">Kelola akun, role, persetujuan verifikasi, dan penugasan program studi semua pengguna</p>
        </div>
        <button className="btn btn-secondary" onClick={load} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom:20 }}>
        <div className="stat-card">
          <div className="stat-card-label">Total Pengguna</div>
          <div className="stat-card-value">{users.length}</div>
        </div>
        <div className="stat-card" style={{ borderLeft: '3px solid #f59e0b' }}>
          <div className="stat-card-label" style={{ color: '#d97706', fontWeight: 600 }}>Butuh Verifikasi</div>
          <div className="stat-card-value" style={{ color: '#d97706' }}>{unverifiedCount}</div>
        </div>
        {ROLES.map(r => {
          const cfg = ROLE_LABELS[r]
          return (
            <div key={r} className="stat-card" style={{ cursor:'pointer' }}
              onClick={() => setRoleFilter(roleFilter === r ? 'all' : r)}>
              <div className="stat-card-label">{cfg.label}</div>
              <div className="stat-card-value">{stats[r] ?? 0}</div>
            </div>
          )
        })}
      </div>

      {/* Filter bar */}
      <div className="card" style={{ padding:'14px 16px', marginBottom:20, display:'flex', gap:12, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ position:'relative', flex:1, minWidth:200 }}>
          <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#94a3b8' }} />
          <input className="input" style={{ paddingLeft:32 }}
            placeholder="Cari nama, email, atau NIDN…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {['all', ...ROLES].map(r => (
            <button key={r}
              className={`btn btn-sm ${roleFilter === r ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setRoleFilter(r)}>
              {r === 'all' ? 'Semua' : ROLE_LABELS[r]?.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <div style={{ padding:48, textAlign:'center' }}>
            <div className="spinner" style={{ margin:'0 auto 12px' }} />
            Memuat pengguna…
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👤</div>
            <div className="empty-state-text">Tidak ada pengguna ditemukan</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Pengguna</th>
                  <th>NIDN</th>
                  <th style={{ width: 140 }}>Role</th>
                  <th style={{ width: 180 }}>Program Studi</th>
                  <th style={{ width: 150, textAlign:'center' }}>Status Verifikasi</th>
                  <th style={{ width: 90 }}>Bergabung</th>
                  <th style={{ width: 120, textAlign:'center' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => {
                  const isSaving = saving[u.id]
                  const initials = (u.nama_lengkap || u.email || 'U')
                    .split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

                  return (
                    <tr key={u.id} style={{ opacity: u.is_verified ? 1 : 0.85, background: u.is_verified ? 'transparent' : '#fffbeb' }}>
                      {/* Avatar + name */}
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          {u.foto_url ? (
                            <img src={u.foto_url} alt="" style={{ width:32, height:32, borderRadius:'50%', objectFit:'cover' }} />
                          ) : (
                            <div style={{
                              width:32, height:32, borderRadius:'50%',
                              background: u.is_verified ? '#eef2ff' : '#fff3cd',
                              color: u.is_verified ? '#6366f1' : '#d97706',
                              display:'flex', alignItems:'center', justifyContent:'center',
                              fontSize:11, fontWeight:700, flexShrink:0,
                            }}>
                              {initials}
                            </div>
                          )}
                          <div>
                            <div style={{ fontWeight:600, fontSize:13, color:'#1e293b', display:'flex', alignItems:'center', gap:6 }}>
                              {u.nama_lengkap || '—'}
                              {!u.is_verified && <span className="badge-pill badge-amber" style={{ fontSize: 9, padding: '2px 6px' }}>Baru</span>}
                            </div>
                            <div style={{ fontSize:11, color:'#94a3b8' }}>{u.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* NIDN */}
                      <td>
                        <input
                          className="input"
                          style={{ padding:'4px 8px', fontSize:12, width:95 }}
                          defaultValue={u.nidn || ''}
                          placeholder="—"
                          onBlur={e => {
                            if (e.target.value !== (u.nidn || ''))
                              updateUser(u.id, 'nidn', e.target.value)
                          }}
                        />
                      </td>

                      {/* Role */}
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <select
                            className="input"
                            style={{ padding:'4px 8px', fontSize:12, width:'100%' }}
                            value={u.role}
                            disabled={isSaving}
                            onChange={e => updateUser(u.id, 'role', e.target.value)}
                          >
                            {ROLES.map(r => (
                              <option key={r} value={r}>{ROLE_LABELS[r].label}</option>
                            ))}
                          </select>
                          {isSaving && <div className="spinner" style={{ width:14, height:14, flexShrink:0 }} />}
                        </div>
                      </td>

                      {/* Prodi */}
                      <td>
                        <select
                          className="input"
                          style={{ padding:'4px 8px', fontSize:12, width:'100%' }}
                          value={u.prodi_id || ''}
                          disabled={isSaving}
                          onChange={e => updateUser(u.id, 'prodi_id', e.target.value || null)}
                        >
                          <option value="">— Belum ditetapkan —</option>
                          {prodi.map(p => (
                            <option key={p.id} value={p.id}>{p.kode} — {p.nama}</option>
                          ))}
                        </select>
                      </td>

                      {/* Status Verifikasi */}
                      <td style={{ textAlign: 'center' }}>
                        {u.is_verified ? (
                          <span className="badge-pill badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <CheckCircle size={10} /> Terverifikasi
                          </span>
                        ) : (
                          <span className="badge-pill badge-amber" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <AlertTriangle size={10} /> Butuh Aktivasi
                          </span>
                        )}
                      </td>

                      {/* Bergabung */}
                      <td style={{ fontSize:11, color:'#94a3b8', whiteSpace:'nowrap' }}>
                        {new Date(u.created_at).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'2-digit' })}
                      </td>

                      {/* Aksi */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                          {!u.is_verified && (
                            <button
                              className="btn btn-primary btn-xs"
                              disabled={isSaving}
                              onClick={() => updateUser(u.id, 'is_verified', true)}
                              style={{
                                background: '#10b981',
                                borderColor: '#059669',
                                color: '#fff',
                                fontWeight: 700,
                                fontSize: '10px',
                                padding: '4px 10px',
                              }}
                            >
                              Terima
                            </button>
                          )}
                          {u.is_verified && (
                            <button
                              className="btn btn-secondary btn-xs"
                              disabled={isSaving}
                              onClick={() => updateUser(u.id, 'is_verified', false)}
                              style={{
                                fontSize: '10px',
                                padding: '4px 8px',
                              }}
                            >
                              Blokir
                            </button>
                          )}
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            disabled={isSaving}
                            onClick={() => deleteUser(u.id, u.nama_lengkap)}
                            style={{ color: '#ef4444', padding: 4 }}
                            title="Hapus Pengguna Permanen"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p style={{ fontSize:11, color:'#94a3b8', marginTop:12 }}>
        {filtered.length} dari {users.length} pengguna ditampilkan · Perubahan langsung tersimpan ke database
      </p>

      {/* Custom Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteConfirmUser}
        title="Hapus Pengguna Permanen"
        message={deleteConfirmUser ? `Apakah Anda yakin ingin menghapus pengguna "${deleteConfirmUser.name}"? Semua data terkait (seperti draf RPS) akan terhapus permanen dari auth database.` : ''}
        confirmText="Hapus"
        cancelText="Batal"
        type="danger"
        onConfirm={handleDeleteUser}
        onCancel={() => setDeleteConfirmUser(null)}
      />
    </div>
  )
}
