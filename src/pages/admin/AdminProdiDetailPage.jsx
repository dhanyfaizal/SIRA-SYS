import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { GraduationCap, Clock, CheckCircle, AlertCircle, Eye, Trash2, Pencil, ArrowLeft, X, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import ConfirmModal from '@/components/ui/ConfirmModal'

const STATUS_CONFIG = {
  draft:     { label:'Draft',          class:'rps-status-draft',     icon: Clock },
  submitted: { label:'Menunggu Review', class:'rps-status-submitted', icon: Clock },
  approved:  { label:'Disetujui',       class:'rps-status-approved',  icon: CheckCircle },
  revision:  { label:'Perlu Revisi',    class:'rps-status-revision',  icon: AlertCircle },
}

export default function AdminProdiDetailPage() {
  const { kode } = useParams()
  const navigate = useNavigate()

  const [prodi, setProdi] = useState(null)
  const [rpsList, setRpsList] = useState([])
  const [prodiList, setProdiList] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Reassign Modal State
  const [reassignRps, setReassignRps] = useState(null) // stores active rps object being edited
  const [targetProdiId, setTargetProdiId] = useState('')

  // Delete RPS Confirmation State
  const [deleteConfirmRpsId, setDeleteConfirmRpsId] = useState(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      // 1. Fetch Program Studi by Code
      const { data: prodiData, error: prodiError } = await supabase
        .from('program_studi')
        .select('*')
        .eq('kode', kode.toUpperCase())
        .maybeSingle()

      if (prodiError) throw prodiError
      if (!prodiData) {
        toast.error(`Program Studi "${kode}" tidak ditemukan`)
        navigate('/admin/prodi')
        return
      }

      setProdi(prodiData)

      // 2. Fetch RPS and Mata Kuliah details
      const { data: rpsData, error: rpsError } = await supabase
        .from('rps')
        .select(`
          id, status, tahun_akademik, semester_aktif, created_at, updated_at,
          dosen:profiles!dosen_id(nama_lengkap, nidn),
          mk:mata_kuliah!mk_id!inner(id, kode_mk, nama_mk, sks, semester, prodi_id)
        `)
        .eq('mk.prodi_id', prodiData.id)
        .order('updated_at', { ascending: false })

      if (rpsError) throw rpsError
      setRpsList(rpsData ?? [])
    } catch (err) {
      console.error(err)
      toast.error('Gagal memuat data: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [kode, navigate])

  const loadProdiList = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('program_studi')
        .select('id, kode, nama')
        .order('nama')
      if (!error && data) {
        setProdiList(data)
      }
    } catch (err) {
      console.error(err)
    }
  }, [])

  useEffect(() => {
    loadAll()
    loadProdiList()
  }, [loadAll, loadProdiList])

  function openReassignModal(rps) {
    setReassignRps(rps)
    setTargetProdiId(rps.mk?.prodi_id || '')
  }

  async function handleReassignProdi(e) {
    e.preventDefault()
    if (!reassignRps || !targetProdiId) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('mata_kuliah')
        .update({ prodi_id: targetProdiId })
        .eq('id', reassignRps.mk.id)

      if (error) throw error

      toast.success(`Program studi mata kuliah "${reassignRps.mk.nama_mk}" berhasil dipindahkan!`)
      setReassignRps(null)
      loadAll()
    } catch (err) {
      console.error(err)
      toast.error('Gagal memindahkan program studi: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function executeDeleteRps() {
    if (!deleteConfirmRpsId) return
    const id = deleteConfirmRpsId
    setDeleteConfirmRpsId(null)
    try {
      const { error } = await supabase
        .from('rps')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success('RPS berhasil dihapus')
      loadAll()
    } catch (err) {
      console.error(err)
      toast.error('Gagal menghapus RPS: ' + err.message)
    }
  }

  if (loading && !prodi) {
    return (
      <div className="card" style={{ padding: 48, textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 12px' }} />
        Memuat data Program Studi…
      </div>
    )
  }

  if (!prodi) return null

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/prodi')}>
          <ArrowLeft size={14} /> Kembali
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 className="page-title" style={{ margin: 0 }}>Detail Program Studi</h1>
            <span className="badge-pill badge-indigo" style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13 }}>
              {prodi.kode}
            </span>
          </div>
          <p className="page-subtitle" style={{ margin: '4px 0 0 0' }}>{prodi.nama}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={loadAll} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
        <div className="card" style={{ padding: '20px 24px', flex: '1 1 200px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <GraduationCap size={20} color="#6366f1" style={{ margin: 'auto' }} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px' }}>Total RPS Prodi</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#1e293b', marginTop: 2 }}>{rpsList.length}</div>
          </div>
        </div>
        <div className="card" style={{ padding: '20px 24px', flex: '1 1 200px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CheckCircle size={20} color="#10b981" style={{ margin: 'auto' }} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px' }}>RPS Disetujui</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#10b981', marginTop: 2 }}>
              {rpsList.filter(r => r.status === 'approved').length}
            </div>
          </div>
        </div>
      </div>

      {/* Table section */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>Daftar RPS Mata Kuliah</span>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>Memuat data…</div>
          ) : rpsList.length === 0 ? (
            <div className="empty-state" style={{ padding: '48px 20px' }}>
              <div className="empty-state-icon">📄</div>
              <div className="empty-state-text">Belum ada RPS terdaftar</div>
              <div className="empty-state-sub">Mata Kuliah di prodi ini belum memiliki dokumen RPS.</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 120 }}>Kode MK</th>
                    <th>Nama Mata Kuliah</th>
                    <th style={{ width: 60, textAlign: 'center' }}>SKS</th>
                    <th style={{ width: 60, textAlign: 'center' }}>Sem.</th>
                    <th>Dosen Pengampu</th>
                    <th>Tahun / Semester</th>
                    <th>Status</th>
                    <th style={{ width: 180, textAlign: 'center' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {rpsList.map(rps => {
                    const cfg = STATUS_CONFIG[rps.status] ?? STATUS_CONFIG.draft
                    const Icon = cfg.icon
                    return (
                      <tr key={rps.id}>
                        <td>
                          <span className="badge-pill badge-slate" style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                            {rps.mk?.kode_mk}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600, color: '#1e293b' }}>{rps.mk?.nama_mk}</td>
                        <td style={{ textAlign: 'center' }}>{rps.mk?.sks}</td>
                        <td style={{ textAlign: 'center' }}>{rps.mk?.semester}</td>
                        <td style={{ color: '#4f46e5', fontWeight: 500 }}>{rps.dosen?.nama_lengkap || '—'}</td>
                        <td style={{ fontSize: 12, color: '#64748b' }}>
                          {rps.tahun_akademik} / {rps.semester_aktif}
                        </td>
                        <td>
                          <span className={`badge-pill ${cfg.class}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Icon size={11} /> {cfg.label}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: 6 }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => navigate(`/rps/${rps.id}`)}
                              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                            >
                              <Eye size={12} /> Buka
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => openReassignModal(rps)}
                              style={{ display: 'flex', alignItems: 'center', padding: '6px 8px' }}
                              title="Ubah Program Studi"
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => setDeleteConfirmRpsId(rps.id)}
                              style={{ display: 'flex', alignItems: 'center', padding: '6px 8px' }}
                              title="Hapus RPS secara Permanen"
                            >
                              <Trash2 size={12} />
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
      </div>

      {/* Reassign Program Studi Modal */}
      {reassignRps && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <span className="modal-title">Ubah Program Studi RPS</span>
              <button className="btn btn-ghost btn-icon" onClick={() => setReassignRps(null)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleReassignProdi}>
              <div className="modal-body">
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 6, border: '1px solid #e2e8f0', marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Mata Kuliah</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginTop: 4 }}>
                    {reassignRps.mk?.kode_mk} — {reassignRps.mk?.nama_mk}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                    Dosen: {reassignRps.dosen?.nama_lengkap || '—'}
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Program Studi Tujuan *</label>
                  <select
                    className="input"
                    value={targetProdiId}
                    onChange={e => setTargetProdiId(e.target.value)}
                    required
                  >
                    <option value="" disabled>-- Pilih Program Studi --</option>
                    {prodiList.map(p => (
                      <option key={p.id} value={p.id}>{p.kode} — {p.nama}</option>
                    ))}
                  </select>
                  <span className="input-hint">
                    Memindahkan program studi akan memindahkan mata kuliah ini beserta dokumen RPS-nya ke program studi baru.
                  </span>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setReassignRps(null)}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Memproses…' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete RPS Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteConfirmRpsId}
        title="Hapus RPS secara Permanen"
        message="Apakah Anda yakin ingin menghapus RPS ini secara permanen? Data yang dihapus tidak dapat dipulihkan."
        confirmText="Hapus"
        cancelText="Batal"
        type="danger"
        onConfirm={executeDeleteRps}
        onCancel={() => setDeleteConfirmRpsId(null)}
      />
    </div>
  )
}
