import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Database, GraduationCap, Target, Clock, FileText, Calendar, Trash2, Printer } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import ConfirmModal from '@/components/ui/ConfirmModal'

export default function KurikulumPage() {
  const { profile, role } = useAuth()
  const navigate = useNavigate()

  const [docs, setDocs] = useState([])
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('cpl') // 'cpl' | 'profil' | 'matrix' | 'history'
  const [deleteConfirmDocId, setDeleteConfirmDocId] = useState(null)

  const [prodiList, setProdiList] = useState([])
  const [selectedProdiId, setSelectedProdiId] = useState('')

  // Load program studi list
  useEffect(() => {
    async function loadProdis() {
      try {
        const { data, error } = await supabase
          .from('program_studi')
          .select('id, kode, nama')
          .order('nama')
        if (error) throw error
        if (data) {
          setProdiList(data)
          if (role === 'admin') {
            const userProdi = data.find(p => p.id === profile?.prodi_id)
            if (userProdi) {
              setSelectedProdiId(userProdi.id)
            } else if (data.length > 0) {
              setSelectedProdiId(data[0].id)
            }
          } else {
            if (profile?.prodi_id) {
              setSelectedProdiId(profile.prodi_id)
            }
          }
        }
      } catch (err) {
        console.error('Gagal memuat Program Studi:', err)
      }
    }
    loadProdis()
  }, [profile?.prodi_id, role])

  async function load() {
    if (!selectedProdiId) return
    setLoading(true)
    try {
      // 1. Fetch kurikulum docs
      const { data: docData, error: docError } = await supabase
        .from('kurikulum_docs')
        .select(`
          id, nama_dokumen, jenis, storage_path, created_at, extracted_data, is_active,
          uploader:profiles!uploaded_by(nama_lengkap)
        `)
        .eq('prodi_id', selectedProdiId)
        .eq('jenis', 'kurikulum')
        .order('created_at', { ascending: false })

      if (docError) throw docError
      setDocs(docData ?? [])

      // 2. Fetch courses (mata kuliah)
      const { data: courseData, error: courseError } = await supabase
        .from('mata_kuliah')
        .select('*')
        .eq('prodi_id', selectedProdiId)
        .order('semester')
        .order('kode_mk')

      if (courseError) throw courseError
      setCourses(courseData ?? [])
    } catch (err) {
      console.error(err)
      toast.error('Gagal memuat data kurikulum: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [selectedProdiId])

  async function handleSetActive(id) {
    try {
      const { error } = await supabase
        .from('kurikulum_docs')
        .update({ is_active: true })
        .eq('id', id)
      
      if (error) throw error
      toast.success('Kurikulum aktif diperbarui')
      load()
    } catch (err) {
      console.error(err)
      toast.error('Gagal mengaktifkan kurikulum: ' + err.message)
    }
  }

  async function handleToggleMatrix(courseId, cplCode, currentCplArray) {
    let newCplArray = Array.isArray(currentCplArray) ? [...currentCplArray] : []
    
    const isMatched = (item) => {
      if (!item) return false
      const trimmed = item.trim()
      return trimmed === cplCode || trimmed.startsWith(cplCode + ':') || trimmed.startsWith(cplCode + ' ')
    }

    if (newCplArray.some(isMatched)) {
      newCplArray = newCplArray.filter(item => !isMatched(item))
    } else {
      // Find the full CPL description from cplList to construct the standard "Kode: Deskripsi" format
      const matchCpl = cplList.find(c => c.kode === cplCode)
      const fullCplString = matchCpl ? `${matchCpl.kode}: ${matchCpl.deskripsi}` : cplCode
      newCplArray.push(fullCplString)
    }
    
    // Optimistic UI update
    setCourses(prev => prev.map(c => c.id === courseId ? { ...c, cpl: newCplArray } : c))
    
    try {
      const { error } = await supabase
        .from('mata_kuliah')
        .update({ cpl: newCplArray })
        .eq('id', courseId)
      
      if (error) throw error
      toast.success('Pemetaan CPL diperbarui')
    } catch (err) {
      console.error(err)
      toast.error('Gagal memperbarui pemetaan CPL: ' + err.message)
      // Revert on error
      setCourses(prev => prev.map(c => c.id === courseId ? { ...c, cpl: currentCplArray } : c))
    }
  }

  async function handleDeleteDoc(id) {
    setDeleteConfirmDocId(id)
  }

  async function executeDeleteDoc() {
    if (!deleteConfirmDocId) return
    const id = deleteConfirmDocId
    setDeleteConfirmDocId(null)
    try {
      const { error } = await supabase.from('kurikulum_docs').delete().eq('id', id)
      if (error) throw error
      toast.success('Kurikulum dihapus')
      load()
    } catch (err) {
      console.error(err)
      toast.error('Gagal menghapus: ' + err.message)
    }
  }

  if (loading && prodiList.length === 0) {
    return (
      <div className="card card-body" style={{ textAlign: 'center', padding: 48, color: '#94a3b8' }}>
        <div className="spinner" style={{ margin: '0 auto 12px' }} />
        Memuat data…
      </div>
    )
  }

  if (role !== 'admin' && !profile?.prodi_id) {
    return (
      <div className="page-header">
        <h1 className="page-title">Kurikulum & CPL</h1>
        <p style={{ color: '#ef4444', fontSize: 13 }}>⚠️ Akun Anda belum ditetapkan ke Program Studi. Hubungi Admin.</p>
      </div>
    )
  }

  if (prodiList.length === 0) {
    return (
      <div className="page-header">
        <h1 className="page-title">Kurikulum & CPL</h1>
        <p style={{ color: '#ef4444', fontSize: 13 }}>⚠️ Tidak ada data Program Studi tersedia. Hubungi Admin.</p>
      </div>
    )
  }

  const activeDoc = docs.find(d => d.is_active) || docs[0]
  const hasData = docs.length > 0
  const profilLulusan = activeDoc?.extracted_data?.profil_lulusan ?? []
  const cplList = activeDoc?.extracted_data?.cpl ?? []

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Repositori Kurikulum & CPL</h1>
          <p className="page-subtitle">Kelola Profil Lulusan dan Capaian Pembelajaran Lulusan (CPL) program studi Anda</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => window.open(`/kurikulum/print?prodi_id=${selectedProdiId}`, '_blank')}
            disabled={!selectedProdiId}
          >
            <Printer size={14} style={{ marginRight: 6 }} /> Cetak Buku Kurikulum
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/kurikulum/upload')}>
            <Plus size={14} /> Upload Kurikulum Baru
          </button>
        </div>
      </div>

      {/* Program Studi Selector (Only for Admin) */}
      {role === 'admin' && (
        <div className="card" style={{ padding: '16px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <GraduationCap size={20} color="#6366f1" />
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>Program Studi</label>
              <select
                value={selectedProdiId}
                onChange={e => setSelectedProdiId(e.target.value)}
                style={{
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  padding: '6px 32px 6px 12px',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#1e293b',
                  background: '#fff',
                  cursor: 'pointer',
                  minWidth: 260
                }}
              >
                {prodiList.map(p => (
                  <option key={p.id} value={p.id}>{p.kode} — {p.nama}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card card-body" style={{ textAlign: 'center', padding: 48, color: '#94a3b8' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          Memuat data…
        </div>
      ) : !hasData ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📚</div>
            <div className="empty-state-text">Belum ada kurikulum yang diunggah</div>
            <div className="empty-state-sub">Unggah dokumen kurikulum prodi Anda terlebih dahulu untuk mendefinisikan Profil Lulusan dan CPL.</div>
            <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => navigate('/kurikulum/upload')}>
              <Plus size={12} /> Upload Kurikulum Pertama
            </button>
          </div>
        </div>
      ) : (
        <div>
          {/* Active Curriculum Banner */}
          <div className="card" style={{
            background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
            color: '#ffffff',
            padding: '24px 28px',
            marginBottom: 20,
            border: 'none',
            borderRadius: 12,
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.15)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <Database size={18} color="#e0e7ff" />
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#e0e7ff' }}>
                Kurikulum Aktif
              </span>
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 6px 0', color: '#fff' }}>
              {activeDoc.nama_dokumen}
            </h2>
            <div style={{ display: 'flex', gap: 14, fontSize: 12, color: '#e0e7ff', flexWrap: 'wrap' }}>
              <span>Diupload oleh: {activeDoc.uploader?.nama_lengkap || 'Kaprodi'}</span>
              <span>•</span>
              <span>Tanggal: {new Date(activeDoc.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              <span>•</span>
              <span>{profilLulusan.length} Profil Lulusan</span>
              <span>•</span>
              <span>{cplList.length} CPL</span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid #e2e8f0',
            marginBottom: 20,
            gap: 16
          }}>
            <button
              onClick={() => setActiveTab('cpl')}
              style={{
                background: 'none',
                border: 'none',
                padding: '10px 16px',
                fontSize: 13,
                fontWeight: 600,
                color: activeTab === 'cpl' ? '#4f46e5' : '#64748b',
                borderBottom: activeTab === 'cpl' ? '2px solid #4f46e5' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <Target size={14} /> Capaian Pembelajaran Lulusan (CPL)
            </button>
            <button
              onClick={() => setActiveTab('profil')}
              style={{
                background: 'none',
                border: 'none',
                padding: '10px 16px',
                fontSize: 13,
                fontWeight: 600,
                color: activeTab === 'profil' ? '#4f46e5' : '#64748b',
                borderBottom: activeTab === 'profil' ? '2px solid #4f46e5' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <GraduationCap size={14} /> Profil Lulusan (PL)
            </button>
            <button
              onClick={() => setActiveTab('matrix')}
              style={{
                background: 'none',
                border: 'none',
                padding: '10px 16px',
                fontSize: 13,
                fontWeight: 600,
                color: activeTab === 'matrix' ? '#4f46e5' : '#64748b',
                borderBottom: activeTab === 'matrix' ? '2px solid #4f46e5' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <Database size={14} /> Matriks Kurikulum
            </button>
            <button
              onClick={() => setActiveTab('history')}
              style={{
                background: 'none',
                border: 'none',
                padding: '10px 16px',
                fontSize: 13,
                fontWeight: 600,
                color: activeTab === 'history' ? '#4f46e5' : '#64748b',
                borderBottom: activeTab === 'history' ? '2px solid #4f46e5' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <Clock size={14} /> Riwayat Kurikulum
            </button>
          </div>

          {/* Tab Content */}
          <div style={{ animation: 'fadeIn 0.2s ease' }}>
            {/* CPL Tab */}
            {activeTab === 'cpl' && (
              <div className="card">
                <div className="card-header">
                  <span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>Daftar Capaian Pembelajaran Lulusan</span>
                </div>
                <div className="card-body">
                  {cplList.length === 0 ? (
                    <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Belum ada CPL didefinisikan.</div>
                  ) : (
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th style={{ width: 120 }}>Kode CPL</th>
                            <th>Deskripsi Capaian Pembelajaran</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cplList.map((c, i) => (
                            <tr key={i}>
                              <td>
                                <span className="badge-pill badge-indigo" style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                                  {c.kode}
                                </span>
                              </td>
                              <td style={{ color: '#334155', fontWeight: 500, fontSize: 13 }}>{c.deskripsi}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Profil Lulusan Tab */}
            {activeTab === 'profil' && (
              <div className="card">
                <div className="card-header">
                  <span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>Daftar Peran & Profil Lulusan</span>
                </div>
                <div className="card-body">
                  {profilLulusan.length === 0 ? (
                    <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Belum ada Profil Lulusan didefinisikan.</div>
                  ) : (
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th style={{ width: 100 }}>Kode</th>
                            <th style={{ width: 220 }}>Profil Lulusan / Peran</th>
                            <th>Deskripsi Kompetensi / Profil Kelulusan</th>
                          </tr>
                        </thead>
                        <tbody>
                          {profilLulusan.map((p, i) => (
                            <tr key={i}>
                              <td>
                                <span className="badge-pill badge-slate" style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                                  {p.kode}
                                </span>
                              </td>
                              <td style={{ color: '#1e293b', fontWeight: 700, fontSize: 13 }}>{p.profil}</td>
                              <td style={{ color: '#475569', fontSize: 13, lineHeight: 1.6 }}>{p.deskripsi}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Matriks Kurikulum Tab */}
            {activeTab === 'matrix' && (
              <div className="card">
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>
                    Matriks Pemetaan CPL vs Mata Kuliah
                  </span>
                  <span style={{ fontSize: 12, color: '#64748b' }}>
                    Centang kotak untuk menghubungkan mata kuliah dengan Capaian Pembelajaran Lulusan (CPL) kurikulum aktif.
                  </span>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                  {cplList.length === 0 ? (
                    <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                      Belum ada CPL aktif yang didefinisikan. Silakan unggah dokumen kurikulum terlebih dahulu.
                    </div>
                  ) : courses.length === 0 ? (
                    <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                      Belum ada mata kuliah yang terdaftar untuk program studi Anda.
                    </div>
                  ) : (
                    <div className="table-wrap" style={{ overflowX: 'auto' }}>
                      <table style={{ minWidth: '100%' }}>
                        <thead>
                          <tr>
                            <th style={{ width: 100 }}>Kode MK</th>
                            <th style={{ width: 280 }}>Nama Mata Kuliah</th>
                            <th style={{ width: 60, textAlign: 'center' }}>SKS</th>
                            <th style={{ width: 60, textAlign: 'center' }}>Sem.</th>
                            {cplList.map((c, i) => (
                              <th 
                                key={i} 
                                style={{ 
                                  textAlign: 'center', 
                                  cursor: 'help',
                                  whiteSpace: 'nowrap',
                                  padding: '10px 8px',
                                  fontSize: 11
                                }}
                                title={c.deskripsi}
                              >
                                <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
                                  <span style={{ fontSize: 11, fontWeight: 700, color: '#4f46e5' }}>{c.kode}</span>
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {courses.map(course => {
                            const courseCplArray = course.cpl || []
                            return (
                              <tr key={course.id}>
                                <td>
                                  <span className="badge-pill badge-slate" style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                                    {course.kode_mk}
                                  </span>
                                </td>
                                <td style={{ fontWeight: 600, color: '#1e293b', fontSize: 13 }}>
                                  {course.nama_mk}
                                </td>
                                <td style={{ textAlign: 'center', fontSize: 12, fontWeight: 500 }}>
                                  {course.sks}
                                </td>
                                <td style={{ textAlign: 'center', fontSize: 12, fontWeight: 500 }}>
                                  {course.semester}
                                </td>
                                {cplList.map((c, i) => {
                                  const isChecked = courseCplArray.some(item => {
                                    if (!item) return false
                                    const trimmed = item.trim()
                                    return trimmed === c.kode || trimmed.startsWith(c.kode + ':') || trimmed.startsWith(c.kode + ' ')
                                  })
                                  return (
                                    <td key={i} style={{ textAlign: 'center', padding: '8px' }}>
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => handleToggleMatrix(course.id, c.kode, courseCplArray)}
                                        style={{ 
                                          width: 16, 
                                          height: 16, 
                                          accentColor: '#4f46e5',
                                          cursor: 'pointer' 
                                        }}
                                      />
                                    </td>
                                  )
                                })}
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <div className="card">
                <div className="card-header">
                  <span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>Riwayat Unggahan Kurikulum</span>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Nama Dokumen</th>
                          <th>Tanggal Unggah</th>
                          <th>Pengunggah</th>
                          <th>Status</th>
                          <th style={{ width: 140, textAlign: 'center' }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {docs.map((doc) => (
                          <tr key={doc.id}>
                            <td style={{ fontWeight: 600, color: '#1e293b' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <FileText size={15} color="#64748b" />
                                {doc.nama_dokumen}
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b' }}>
                                <Calendar size={13} />
                                {new Date(doc.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </td>
                            <td>{doc.uploader?.nama_lengkap || 'Kaprodi'}</td>
                            <td>
                              {doc.is_active ? (
                                <span className="badge-pill badge-indigo" style={{ fontSize: 10 }}>Aktif</span>
                              ) : (
                                <span className="badge-pill badge-slate" style={{ fontSize: 10 }}>Arsip</span>
                              )}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                {!doc.is_active && (
                                  <button
                                    className="btn btn-secondary btn-sm"
                                    style={{ fontSize: 11, padding: '4px 8px' }}
                                    onClick={() => handleSetActive(doc.id)}
                                  >
                                    Jadikan Aktif
                                  </button>
                                )}
                                {!doc.is_active ? (
                                  <button
                                    className="btn btn-ghost btn-icon btn-sm"
                                    style={{ color: '#ef4444' }}
                                    onClick={() => handleDeleteDoc(doc.id)}
                                    title="Hapus"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                ) : (
                                  <span style={{ color: '#64748b', fontSize: 11, fontStyle: 'italic' }}>Aktif</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      <ConfirmModal
        isOpen={!!deleteConfirmDocId}
        title="Hapus Dokumen Kurikulum"
        message="Apakah Anda yakin ingin menghapus dokumen kurikulum ini dari riwayat?"
        confirmText="Hapus"
        cancelText="Batal"
        type="danger"
        onConfirm={executeDeleteDoc}
        onCancel={() => setDeleteConfirmDocId(null)}
      />
    </div>
  )
}
