import { useState, useEffect } from 'react'
import { useParams, useNavigate, NavLink } from 'react-router-dom'
import {
  ArrowLeft, CheckCircle, AlertCircle, Clock, FileText,
  Share2, Pencil, Send, X, Download, Sparkles, RefreshCw, Trash2
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { dbRPS, dbComments, dbNotifications, dbReviewRps } from '@/lib/db'
import { reviewSpmi } from '@/lib/ai'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import ConfirmModal from '@/components/ui/ConfirmModal'

const STATUS_CONFIG = {
  draft:     { label:'Draft',          class:'rps-status-draft',     icon: Clock        },
  submitted: { label:'Menunggu Review', class:'rps-status-submitted', icon: Clock        },
  approved:  { label:'Disetujui',       class:'rps-status-approved',  icon: CheckCircle  },
  revision:  { label:'Perlu Revisi',    class:'rps-status-revision',  icon: AlertCircle  },
}

// ── Section wrapper ──────────────────────────────────────────────
function Section({ title, children, action }) {
  return (
    <div className="card" style={{ marginBottom:16 }}>
      <div className="card-header">
        <span style={{ fontWeight:700, fontSize:14, color:'#1e293b' }}>{title}</span>
        {action}
      </div>
      <div className="card-body">{children}</div>
    </div>
  )
}

// ── Info grid ─────────────────────────────────────────────────────
function InfoGrid({ items }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:16 }}>
      {items.map(([label, value]) => (
        <div key={label}>
          <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.4px', marginBottom:4 }}>
            {label}
          </div>
          <div style={{ fontSize:13, fontWeight:500, color:'#1e293b' }}>{value || '—'}</div>
        </div>
      ))}
    </div>
  )
}

export default function RpsDetailPage() {
  const { id } = useParams()
  const { user, role } = useAuth()
  const navigate = useNavigate()

  const { profile } = useAuth()
  const [rps,     setRps]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(null) // 'approve' | 'revision'
  const [catatan, setCatatan] = useState('')
  const [saving,  setSaving]  = useState(false)
  const [token,   setToken]   = useState(null)
  const [auditing, setAuditing] = useState(false)

  // Review RPS state
  const [latestReview, setLatestReview] = useState(null)

  // Team teaching states
  const [teamMembers, setTeamMembers] = useState([])
  const [prodiLecturers, setProdiLecturers] = useState([])
  const [manageTeamModal, setManageTeamModal] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState([])

  // Comments states
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [commentSection, setCommentSection] = useState('Umum')

  // Revision step-by-step notes state
  const [stepNotes, setStepNotes] = useState({ 1: '', 2: '', 3: '', 4: '' })

  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Ya',
    cancelText: 'Batal',
    type: 'danger',
    onConfirm: null,
  })

  const openConfirm = (title, message, onConfirm, type = 'danger', confirmText = 'Ya', cancelText = 'Batal') => {
    setConfirmConfig({
      isOpen: true,
      title,
      message,
      confirmText,
      cancelText,
      type,
      onConfirm,
    })
  }

  const closeConfirm = () => {
    setConfirmConfig(p => ({ ...p, isOpen: false }))
  }

  const loadComments = async () => {
    try {
      const { data } = await dbComments.getByRps(id)
      if (data) setComments(data)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data, error } = await dbRPS.getById(id)
      if (error) { toast.error('RPS tidak ditemukan'); navigate('/rps'); return }
      setRps(data)
      setToken(data.public_token)
      
      // Load team members profiles
      if (data.team_dosen && data.team_dosen.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, nama_lengkap')
          .in('id', data.team_dosen)
        if (profiles) setTeamMembers(profiles)
      } else {
        setTeamMembers([])
      }

      setLoading(false)
    }
    load()
    loadComments()
    // Load latest review
    dbReviewRps.getLatestByRpsId(id).then(({ data }) => {
      if (data) setLatestReview(data)
    })
  }, [id])

  const isOwner   = rps?.dosen_id === user?.id
  const isTeam    = rps?.team_dosen && rps?.team_dosen.includes(user?.id)
  const isOwnerOrTeam = isOwner || isTeam
  const isKaprodi = role === 'kaprodi'
  const isAdmin   = role === 'admin'

  async function handleOpenManageTeam() {
    setSelectedTeam(rps?.team_dosen || [])
    setManageTeamModal(true)
    
    const prodiId = rps?.mk?.prodi_id
    if (prodiId) {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, nama_lengkap, email')
          .eq('prodi_id', prodiId)
          .in('role', ['dosen', 'kaprodi'])
          .order('nama_lengkap')
        
        if (data) {
          setProdiLecturers(data.filter(l => l.id !== rps.dosen_id))
        }
      } catch (err) {
        console.error(err)
      }
    }
  }

  async function handleSaveTeam() {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('rps')
        .update({ team_dosen: selectedTeam })
        .eq('id', id)
      
      if (error) throw error
      
      setRps(prev => ({ ...prev, team_dosen: selectedTeam }))
      
      if (selectedTeam.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, nama_lengkap')
          .in('id', selectedTeam)
        if (profiles) setTeamMembers(profiles)
      } else {
        setTeamMembers([])
      }
      
      toast.success('Tim pengajar berhasil diperbarui')
      setManageTeamModal(false)
    } catch (err) {
      console.error(err)
      toast.error('Gagal memperbarui tim pengajar: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleSendComment(e) {
    e.preventDefault()
    if (!newComment.trim()) return

    const commentData = {
      rps_id: id,
      user_id: user.id,
      content: newComment.trim(),
      section: commentSection !== 'Umum' ? commentSection : null
    }

    try {
      const { error } = await dbComments.create(commentData)
      if (error) throw error
      
      await loadComments()
      setNewComment('')
      toast.success('Komentar terkirim')

      const notifyUsers = new Set()
      if (rps.dosen_id !== user.id) notifyUsers.add(rps.dosen_id)
      if (rps.team_dosen) {
        rps.team_dosen.forEach(memberId => {
          if (memberId !== user.id) notifyUsers.add(memberId)
        })
      }
      
      const prodiId = rps?.mk?.prodi_id
      if (role !== 'kaprodi' && prodiId) {
        const { data: kaprodis } = await supabase
          .from('profiles')
          .select('id')
          .eq('prodi_id', prodiId)
          .eq('role', 'kaprodi')
        if (kaprodis) {
          kaprodis.forEach(k => notifyUsers.add(k.id))
        }
      }

      for (const recipientId of notifyUsers) {
        await dbNotifications.create(
          recipientId,
          `Diskusi Baru - ${rps.mk?.kode_mk}`,
          `${profile?.nama_lengkap || 'Seseorang'} menulis komentar: "${newComment.slice(0, 40)}${newComment.length > 40 ? '...' : ''}"`,
          `/rps/${id}`
        )
      }
    } catch (err) {
      console.error(err)
      toast.error('Gagal mengirim komentar: ' + err.message)
    }
  }

  async function handleDeleteComment(commentId) {
    openConfirm(
      'Hapus Komentar',
      'Apakah Anda yakin ingin menghapus komentar Anda?',
      async () => {
        try {
          const { error } = await dbComments.delete(commentId)
          if (error) throw error
          toast.success('Komentar dihapus')
          await loadComments()
        } catch (err) {
          console.error(err)
          toast.error('Gagal menghapus komentar: ' + err.message)
        }
      },
      'danger',
      'Hapus',
      'Batal'
    )
  }

  async function handleSubmit() {
    openConfirm(
      'Ajukan RPS',
      'Ajukan RPS ini untuk direview Kaprodi?',
      async () => {
        setSaving(true)
        const { error } = await dbRPS.updateStatus(id, 'submitted')
        if (error) { toast.error(error.message); setSaving(false); return }
        setRps(p => ({ ...p, status: 'submitted' }))
        toast.success('RPS berhasil diajukan untuk review!')
        setSaving(false)

        try {
          const prodiId = rps?.mk?.prodi_id
          if (prodiId) {
            const { data: kaprodis } = await supabase
              .from('profiles')
              .select('id')
              .eq('prodi_id', prodiId)
              .eq('role', 'kaprodi')
            
            if (kaprodis) {
              for (const k of kaprodis) {
                await dbNotifications.create(
                  k.id,
                  'Pengajuan RPS Baru 📥',
                  `Dosen ${profile?.nama_lengkap || 'Pengampu'} mengajukan RPS untuk MK ${rps.mk?.kode_mk} - ${rps.mk?.nama_mk}.`,
                  `/rps/${id}`
                )
              }
            }
          }
        } catch (err) {
          console.error(err)
        }
      },
      'info',
      'Ajukan',
      'Batal'
    )
  }

  async function handleReview(status) {
    if (status === 'revision' && !catatan.trim()) {
      toast.error('Masukkan catatan revisi terlebih dahulu')
      return
    }
    setSaving(true)

    const aiReviewResult = status === 'revision'
      ? { catatan_kaprodi: catatan, reviewer: user?.id, reviewed_at: new Date().toISOString() }
      : undefined

    const updatePayload = {
      status,
      ai_review_result: aiReviewResult,
      review_notes: status === 'revision' ? stepNotes : {}
    }

    try {
      const { error } = await supabase
        .from('rps')
        .update(updatePayload)
        .eq('id', id)
      
      if (error) throw error

      setRps(p => ({ ...p, status, review_notes: status === 'revision' ? stepNotes : {} }))
      toast.success(status === 'approved' ? 'RPS Disetujui! ✅' : 'Permintaan revisi dikirim')
      setModal(null)

      const notifyUsers = new Set()
      notifyUsers.add(rps.dosen_id)
      if (rps.team_dosen) {
        rps.team_dosen.forEach(memberId => notifyUsers.add(memberId))
      }

      for (const recipientId of notifyUsers) {
        await dbNotifications.create(
          recipientId,
          status === 'approved' ? 'RPS Disetujui! 🎉' : 'RPS Perlu Revisi ⚠️',
          status === 'approved'
            ? `RPS ${rps.mk?.kode_mk} - ${rps.mk?.nama_mk} telah disetujui oleh Kaprodi.`
            : `RPS ${rps.mk?.kode_mk} - ${rps.mk?.nama_mk} dikembalikan untuk direvisi: "${catatan}"`,
          `/rps/${id}`
        )
      }
    } catch (err) {
      console.error(err)
      toast.error('Gagal memproses review: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteRps() {
    openConfirm(
      'Hapus Draf RPS secara Permanen',
      'Apakah Anda yakin ingin menghapus draf RPS ini secara permanen?',
      async () => {
        setSaving(true)
        const { error } = await dbRPS.delete(id)
        if (error) {
          toast.error('Gagal menghapus: ' + error.message)
          setSaving(false)
          return
        }
        toast.success('RPS berhasil dihapus')
        navigate(-1)
      },
      'danger',
      'Hapus',
      'Batal'
    )
  }

  async function handleGenerateToken() {
    const { data, error } = await dbRPS.generateToken(id)
    if (error) { toast.error(error.message); return }
    setToken(data.public_token)
    toast.success('Link publik dibuat!')
  }

  async function handleCopyLink() {
    const t = token || await handleGenerateToken()
    const url = `${window.location.origin}/rps/public/${token}`
    await navigator.clipboard.writeText(url)
    toast.success('Link disalin ke clipboard!')
  }

  async function runAiAudit() {
    setAuditing(true)
    try {
      const result = await reviewSpmi(rps)
      if (result && result.status) {
        const newReviewResult = {
          ...rps.ai_review_result,
          ai_audit: result
        }
        const { error } = await dbRPS.update(id, {
          ai_review_result: newReviewResult
        })
        if (error) throw error
        setRps(p => ({ ...p, ai_review_result: newReviewResult }))
        toast.success('Audit mutu AI berhasil dijalankan! 📑')
      } else {
        throw new Error('Hasil audit AI tidak valid.')
      }
    } catch (err) {
      console.error(err)
      toast.error('Gagal menjalankan audit AI: ' + err.message)
    } finally {
      setAuditing(false)
    }
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:80, flexDirection:'column', gap:16 }}>
      <div className="spinner" style={{ width:32, height:32 }} />
      <p style={{ color:'#94a3b8', fontSize:13 }}>Memuat RPS…</p>
    </div>
  )

  if (!rps) return null

  const cp   = rps.capaian_pembelajaran ?? {}
  const cplList = (cp.cpl && cp.cpl.length > 0) ? cp.cpl : (rps.mk?.cpl ?? [])
  const renc = rps.rencana_pembelajaran ?? []
  const pen  = rps.penilaian ?? {}
  const ref  = rps.referensi ?? []
  const cfg  = STATUS_CONFIG[rps.status] ?? STATUS_CONFIG.draft
  const Icon = cfg.icon

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Back + Status header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20, flexWrap:'wrap' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>
          <ArrowLeft size={14} /> Kembali
        </button>
        <div style={{ flex:1 }} />
        <span className={`badge-pill ${cfg.class}`} style={{ fontSize:12, padding:'4px 12px' }}>
          <Icon size={12} /> {cfg.label}
        </span>

        {/* Aksi Dosen */}
        {isOwnerOrTeam && rps.status === 'draft' && (
          <>
            <NavLink to={`/rps/${id}/edit`} className="btn btn-secondary btn-sm">
              <Pencil size={13} /> Edit
            </NavLink>
            <button className="btn btn-primary btn-sm" onClick={handleSubmit} disabled={saving}>
              <Send size={13} /> Ajukan untuk Review
            </button>
          </>
        )}
        {isOwnerOrTeam && rps.status === 'revision' && (
          <NavLink to={`/rps/${id}/edit`} className="btn btn-primary btn-sm">
            <Pencil size={13} /> Perbaiki & Resubmit
          </NavLink>
        )}

        {/* Aksi Kaprodi */}
        {isKaprodi && rps.status === 'submitted' && (
          <>
            <button className="btn btn-secondary btn-sm" style={{ borderColor:'#f59e0b', color:'#92400e' }}
              onClick={() => setModal('revision')}>
              <AlertCircle size={13} /> Minta Revisi
            </button>
            <button className="btn btn-primary btn-sm" style={{ background:'#10b981' }}
              onClick={() => setModal('approve')}>
              <CheckCircle size={13} /> Setujui RPS
            </button>
          </>
        )}
        {isKaprodi && rps.status === 'draft' && (
          <button className="btn btn-danger btn-sm" onClick={handleDeleteRps} disabled={saving}>
            <Trash2 size={13} /> Hapus Draf RPS
          </button>
        )}

        {/* Share */}
        {(isOwner || isKaprodi || isAdmin) && rps.status === 'approved' && (
          <>
            <button className="btn btn-secondary btn-sm" onClick={() => window.open(`/rps/${id}/print`, '_blank')} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Download size={13} /> Cetak PDF
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleCopyLink}>
              <Share2 size={13} /> {token ? 'Salin Link' : 'Buat Link Publik'}
            </button>
          </>
        )}
      </div>

      {/* ── SECTION 1: Identitas ─────────────────────────────────── */}
      <Section 
        title="Identitas Mata Kuliah"
        action={isOwner && (
          <button 
            className="btn btn-secondary btn-sm" 
            onClick={handleOpenManageTeam}
            style={{ fontSize: 11, padding: '4px 10px' }}
          >
            Kelola Tim Pengajar
          </button>
        )}
      >
        <InfoGrid items={[
          ['Kode MK',          rps.mk?.kode_mk],
          ['Nama MK',          rps.mk?.nama_mk],
          ['SKS',              `${rps.mk?.sks} SKS`],
          ['Semester',         `Semester ${rps.mk?.semester}`],
          ['Program Studi',    rps.mk?.prodi?.nama],
          ['Tahun Akademik',   rps.tahun_akademik],
          ['Semester Aktif',   rps.semester_aktif],
          ['Dosen Pengampu',   rps.dosen?.nama_lengkap],
          ['NIDN',             rps.dosen?.nidn],
          ['Tim Pengajar',     teamMembers.map(m => m.nama_lengkap).join(', ') || '—'],
        ]} />
        {rps.deskripsi_mk && (
          <div style={{ marginTop:16, padding:'12px 14px', background:'#f8fafc', borderRadius:6, border:'1px solid #e2e8f0' }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.4px', marginBottom:6 }}>Deskripsi</div>
            <p style={{ fontSize:13, color:'#334155', lineHeight:1.7, margin:0 }}>{rps.deskripsi_mk}</p>
          </div>
        )}
      </Section>

      {/* ── SECTION: AI Audit SPMI ───────────────────────────────── */}
      <Section
        title="Audit Penjaminan Mutu (SPMI AI)"
        action={
          (isOwner || isKaprodi) && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={runAiAudit}
              disabled={auditing}
              style={{
                background: 'linear-gradient(135deg, var(--indigo-50), #f5f3ff)',
                borderColor: 'var(--indigo-200)',
                color: 'var(--indigo-700)',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              {auditing ? (
                <RefreshCw size={13} className="spinner" style={{ animation: 'spin 1s linear infinite', borderTopColor: 'var(--indigo-600)' }} />
              ) : (
                <Sparkles size={13} color="var(--indigo-600)" />
              )}
              {auditing ? 'Mengaudit...' : rps.ai_review_result?.ai_audit ? 'Audit Ulang' : 'Jalankan Audit'}
            </button>
          )
        }
      >
        {auditing && (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'20px 0', flexDirection:'column', gap:10 }}>
            <div className="spinner" style={{ width:24, height:24 }} />
            <p style={{ color:'#94a3b8', fontSize:12 }}>AI sedang mengevaluasi keselarasan materi dan instrumen SPMI...</p>
          </div>
        )}

        {!auditing && !rps.ai_review_result?.ai_audit && (
          <div style={{ padding: '16px 20px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
            Dokumen RPS ini belum diaudit kelayakannya oleh SPMI AI. Klik <strong>"Jalankan Audit"</strong> di atas.
          </div>
        )}

        {!auditing && rps.ai_review_result?.ai_audit && (
          <div style={{ animation: 'fadeIn 0.25s ease' }}>
            {/* Status indicator row */}
            <div className={`spmi-row spmi-${rps.ai_review_result.ai_audit.status?.toLowerCase()}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
                {rps.ai_review_result.ai_audit.status === 'GREEN' && <span>🟢 Kepatuhan Tinggi (Green)</span>}
                {rps.ai_review_result.ai_audit.status === 'YELLOW' && <span>🟡 Perlu Perbaikan Minor (Yellow)</span>}
                {rps.ai_review_result.ai_audit.status === 'RED' && <span>🔴 Kepatuhan Rendah (Red)</span>}
              </div>
              <div style={{ fontSize: 14, fontWeight: 800 }}>
                Skor Kelayakan: {rps.ai_review_result.ai_audit.score ?? 0}/100
              </div>
            </div>

            {/* Audit summary */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 6 }}>
                Ringkasan Evaluasi
              </div>
              <p style={{ fontSize: 13, color: '#334155', lineHeight: 1.6, margin: 0 }}>
                {rps.ai_review_result.ai_audit.summary}
              </p>
            </div>

            {/* Recommendations */}
            {rps.ai_review_result.ai_audit.recommendations?.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 8 }}>
                  Rekomendasi Perbaikan
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {rps.ai_review_result.ai_audit.recommendations.map((rec, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12 }}>
                      <span style={{ color: 'var(--indigo-600)', fontWeight: 700 }}>✓</span>
                      <span style={{ color: '#475569' }}>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Section>

      {/* ── SECTION 2: CPL & CPMK ───────────────────────────────── */}
      <Section title="Capaian Pembelajaran">
        {cplList.length > 0 && (
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.4px', marginBottom:8 }}>
              CPL — Capaian Program Lulusan
            </div>
            {cplList.map((c, i) => (
              <div key={i} style={{ display:'flex', gap:10, padding:'7px 10px', background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:6, fontSize:12, marginBottom:6 }}>
                <span className="badge-pill badge-indigo" style={{ flexShrink:0 }}>CPL-{i+1}</span>
                <span style={{ color:'#334155' }}>{c}</span>
              </div>
            ))}
          </div>
        )}
        {(cp.cpmk ?? []).length > 0 && (
          <>
            <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.4px', marginBottom:8 }}>
              CPMK — Capaian Mata Kuliah
            </div>
            {(cp.cpmk ?? []).map((c, i) => (
              <div key={i} style={{ display:'flex', gap:10, padding:'8px 12px', background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:6, fontSize:12, marginBottom:6 }}>
                <span className="badge-pill badge-green" style={{ flexShrink:0 }}>{c.kode || `CPMK-${i+1}`}</span>
                <div style={{ flex:1 }}>
                  <div style={{ color:'#334155' }}>{c.deskripsi}</div>
                  {c.cpl_ref?.length > 0 && (
                    <div style={{ marginTop:4, display:'flex', gap:4, flexWrap:'wrap' }}>
                      {c.cpl_ref.map(r => <span key={r} style={{ background:'#eef2ff', color:'#6366f1', borderRadius:99, padding:'1px 8px', fontSize:10, fontWeight:600 }}>{r}</span>)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
      </Section>

      {/* ── SECTION 3: Rencana Pertemuan ─────────────────────────── */}
      <Section title={`Rencana Pembelajaran (${renc.length} Pertemuan)`}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width:40, textAlign:'center' }}>No</th>
                <th>Kemampuan Akhir</th>
                <th>Bahan Kajian</th>
                <th style={{ width:120 }}>Metode</th>
                <th style={{ width:70 }}>Waktu</th>
                <th>Kriteria Penilaian</th>
              </tr>
            </thead>
            <tbody>
              {renc.map((p, i) => (
                <tr key={i} style={{
                  background: p.is_uts ? '#fffbeb' : p.is_uas ? '#f0fdf4' : undefined
                }}>
                  <td style={{ textAlign:'center' }}>
                    <div style={{
                      width:24, height:24, borderRadius:'50%', margin:'auto',
                      background: p.is_uts ? '#f59e0b' : p.is_uas ? '#10b981' : '#e2e8f0',
                      color: (p.is_uts || p.is_uas) ? '#fff' : '#64748b',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:10, fontWeight:700,
                    }}>
                      {p.no}
                    </div>
                    {p.is_uts && <div style={{ fontSize:9, color:'#b45309', fontWeight:700, textAlign:'center' }}>UTS</div>}
                    {p.is_uas && <div style={{ fontSize:9, color:'#065f46', fontWeight:700, textAlign:'center' }}>UAS</div>}
                  </td>
                  <td style={{ fontSize:12 }}>{p.kemampuan_akhir || <span style={{ color:'#cbd5e1' }}>—</span>}</td>
                  <td style={{ fontSize:12 }}>{p.bahan_kajian || <span style={{ color:'#cbd5e1' }}>—</span>}</td>
                  <td style={{ fontSize:12 }}>{p.metode}</td>
                  <td style={{ fontSize:12 }}>{p.waktu} mnt</td>
                  <td style={{ fontSize:12 }}>{p.kriteria_penilaian || <span style={{ color:'#cbd5e1' }}>—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ── SECTION 4: Penilaian ─────────────────────────────────── */}
      <Section title="Komponen Penilaian">
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))', gap:10 }}>
          {Object.entries(pen).filter(([,v]) => Number(v) > 0).map(([k, v]) => (
            <div key={k} style={{
              padding:'12px 14px', background:'#f8fafc', borderRadius:8, border:'1px solid #e2e8f0',
              textAlign:'center',
            }}>
              <div style={{ fontSize:11, color:'#94a3b8', textTransform:'capitalize', marginBottom:6 }}>
                {k === 'uts' ? 'UTS' : k === 'uas' ? 'UAS' : k}
              </div>
              <div style={{ fontSize:24, fontWeight:800, color:'#4f46e5' }}>{v}%</div>
            </div>
          ))}
        </div>
        <div style={{
          marginTop:12, padding:'8px 14px', borderRadius:6,
          background:'#f0fdf4', border:'1px solid #bbf7d0',
          display:'flex', justifyContent:'space-between', alignItems:'center',
        }}>
          <span style={{ fontSize:12, color:'#065f46' }}>Total Bobot</span>
          <span style={{ fontWeight:800, fontSize:16, color:'#10b981' }}>
            {Object.values(pen).reduce((a, b) => a + Number(b || 0), 0)}%
          </span>
        </div>
      </Section>

      {/* ── SECTION 5: Referensi ─────────────────────────────────── */}
      {ref.length > 0 && (
        <Section title="Referensi Pustaka">
          {ref.map((r, i) => (
            <div key={i} style={{ display:'flex', gap:10, padding:'7px 10px', background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:6, fontSize:12, marginBottom:6 }}>
              <span style={{ color:'#6366f1', fontWeight:700, flexShrink:0 }}>[{i+1}]</span>
              <span style={{ color:'#334155' }}>{r}</span>
            </div>
          ))}
        </Section>
      )}

      {/* ── SECTION: Hasil Review RPS ──────────────────────────── */}
      {rps.status === 'approved' && (
        <Section title="Hasil Review RPS">
          {latestReview ? (() => {
            const ALL_KEYS = [
              'a_cpmk_subcpmk',
              'b1_identitas_mk','b2_penanggung_jawab','b3_cpl_cpmk','b4_deskripsi_mk',
              'b5_bahan_kajian','b6_referensi','b7_media_pembelajaran','b8_prasyarat','b9_komposisi',
              'c1_minggu_ke','c2_kemampuan_akhir','c3_bahan_kajian_rps','c4_metode_pembelajaran',
              'c5_waktu','c6_pengalaman_belajar','c7_kriteria_penilaian','c8_bobot_nilai','c9_referensi_rps'
            ]
            const sesuai = ALL_KEYS.filter(k => latestReview[k] === 'sesuai').length
            const cukup = ALL_KEYS.filter(k => latestReview[k] === 'cukup').length
            const tidak = ALL_KEYS.filter(k => latestReview[k] === 'tidak_sesuai').length
            const filled = ALL_KEYS.filter(k => latestReview[k]).length
            return (
              <div>
                <div style={{ display: 'flex', gap: 14, marginBottom: 14, flexWrap: 'wrap' }}>
                  <div style={{ padding: '10px 16px', background: '#d1fae5', borderRadius: 8, textAlign: 'center', flex: '1 1 100px' }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#10b981' }}>{sesuai}</div>
                    <div style={{ fontSize: 11, color: '#065f46', fontWeight: 600 }}>Sesuai</div>
                  </div>
                  <div style={{ padding: '10px 16px', background: '#fef3c7', borderRadius: 8, textAlign: 'center', flex: '1 1 100px' }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#f59e0b' }}>{cukup}</div>
                    <div style={{ fontSize: 11, color: '#92400e', fontWeight: 600 }}>Cukup</div>
                  </div>
                  <div style={{ padding: '10px 16px', background: '#fee2e2', borderRadius: 8, textAlign: 'center', flex: '1 1 100px' }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#ef4444' }}>{tidak}</div>
                    <div style={{ fontSize: 11, color: '#991b1b', fontWeight: 600 }}>Tidak Sesuai</div>
                  </div>
                  <div style={{ padding: '10px 16px', background: '#eef2ff', borderRadius: 8, textAlign: 'center', flex: '1 1 100px' }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#4f46e5' }}>{filled}/19</div>
                    <div style={{ fontSize: 11, color: '#3730a3', fontWeight: 600 }}>Terisi</div>
                  </div>
                </div>
                {latestReview.rekomendasi && (
                  <div style={{ padding: '10px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, marginBottom: 12, fontSize: 12, color: '#334155' }}>
                    <strong style={{ color: '#64748b' }}>Rekomendasi:</strong> {latestReview.rekomendasi}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 6, fontSize: 11, color: '#94a3b8', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Terakhir direview: {new Date(latestReview.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} oleh {latestReview.reviewer?.nama_lengkap || 'Ka. Prodi'}</span>
                  <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/rps/${id}/review`)} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    Lihat Detail Review
                  </button>
                </div>
              </div>
            )
          })() : (
            <div style={{ textAlign: 'center', padding: '16px 20px', color: '#94a3b8', fontSize: 13 }}>
              RPS ini belum direview.
              {isKaprodi && (
                <button className="btn btn-primary btn-sm" onClick={() => navigate(`/rps/${id}/review`)} style={{ marginLeft: 10, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Mulai Review
                </button>
              )}
            </div>
          )}
        </Section>
      )}

      {/* ── Catatan Revisi (jika ada) ────────────────────────────── */}
      {rps.ai_review_result?.catatan_kaprodi && (
        <Section title="Catatan Kaprodi">
          <div style={{ padding:'12px 14px', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:6, marginBottom: 12 }}>
            <p style={{ fontSize:13, color:'#92400e', lineHeight:1.7, margin:0, fontWeight: 700 }}>
              {rps.ai_review_result.catatan_kaprodi}
            </p>
          </div>
          {rps.review_notes && Object.values(rps.review_notes).some(Boolean) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {Object.entries(rps.review_notes).map(([step, note]) => {
                if (!note) return null
                const stepLabel = step === '1' ? 'Langkah 1 (Identitas)' : step === '2' ? 'Langkah 2 (Capaian)' : step === '3' ? 'Langkah 3 (Rencana)' : 'Langkah 4 (Penilaian)'
                return (
                  <div key={step} style={{ padding: '8px 12px', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 6, fontSize: 12, color: '#92400e' }}>
                    <strong>{stepLabel}:</strong> {note}
                  </div>
                )
              })}
            </div>
          )}
        </Section>
      )}

      {/* ── PANEL DISKUSI & KOMENTAR ─────────────────────────────── */}
      <Section title="Diskusi Internal & Catatan Review">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 300, overflowY: 'auto', marginBottom: 16, paddingRight: 6 }}>
          {comments.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
              Belum ada diskusi atau catatan review pada RPS ini. Silakan mulai berdiskusi di bawah.
            </div>
          ) : (
            comments.map(c => {
              const isOwn = c.user_id === user?.id
              const cInitials = c.user?.nama_lengkap
                ? c.user.nama_lengkap.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                : 'U'
              return (
                <div key={c.id} style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start',
                  alignSelf: isOwn ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  background: isOwn ? '#eff6ff' : '#f8fafc',
                  border: isOwn ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: '10px 12px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                }}>
                  {!isOwn && (
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: c.user?.role === 'kaprodi' ? '#4f46e5' : '#64748b',
                      color: '#ffffff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 700, flexShrink: 0
                    }}>
                      {cInitials}
                    </div>
                  )}

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#1e293b' }}>
                        {c.user?.nama_lengkap}
                      </span>
                      <span className="badge-pill" style={{
                        fontSize: 9, padding: '1px 6px',
                        background: c.user?.role === 'kaprodi' ? '#eef2ff' : '#f1f5f9',
                        color: c.user?.role === 'kaprodi' ? '#4f46e5' : '#475569'
                      }}>
                        {c.user?.role === 'kaprodi' ? 'Ka. Prodi' : c.user?.role === 'admin' ? 'Admin' : 'Dosen'}
                      </span>
                      {c.section && (
                        <span className="badge-pill badge-green" style={{ fontSize: 9, padding: '1px 6px' }}>
                          {c.section}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 12.5, color: '#334155', margin: '4px 0', lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>
                      {c.content}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                      <span style={{ fontSize: 9, color: '#94a3b8' }}>
                        {new Date(c.created_at).toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                      </span>
                      {isOwn && (
                        <button 
                          onClick={() => handleDeleteComment(c.id)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}
                          title="Hapus Komentar"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  </div>

                  {isOwn && (
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: '#4f46e5',
                      color: '#ffffff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 700, flexShrink: 0
                    }}>
                      {cInitials}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        <form onSubmit={handleSendComment} style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Sematkan di bagian:</span>
            <select 
              value={commentSection} 
              onChange={e => setCommentSection(e.target.value)}
              className="input" 
              style={{ width: 'auto', padding: '4px 10px', height: 'auto', fontSize: 12 }}
            >
              <option value="Umum">Umum (Tidak disematkan)</option>
              <option value="Identitas">Langkah 1: Identitas</option>
              <option value="Capaian">Langkah 2: CPL & CPMK</option>
              <option value="Rencana">Langkah 3: 16 Pertemuan</option>
              <option value="Penilaian">Langkah 4: Penilaian</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <textarea
              className="input"
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Tulis pesan kolaborasi atau tanggapan..."
              rows={2}
              style={{ resize: 'vertical' }}
            />
            <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-end', height: 42, minWidth: 100 }}>
              Kirim
            </button>
          </div>
        </form>
      </Section>

      {/* ── Modal Kelola Tim Pengajar ────────────────────────────── */}
      {manageTeamModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <span className="modal-title">Kelola Tim Pengajar</span>
              <button className="btn btn-ghost btn-icon" onClick={() => setManageTeamModal(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: 300, overflowY: 'auto' }}>
              <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
                Pilih dosen dari program studi Anda untuk ditambahkan sebagai tim pengajar RPS ini.
              </p>
              {prodiLecturers.length === 0 ? (
                <div style={{ padding: 12, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
                  Tidak ada dosen lain terdaftar di prodi Anda.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {prodiLecturers.map(lecturer => {
                    const isChecked = selectedTeam.includes(lecturer.id)
                    return (
                      <label key={lecturer.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '6px 8px', borderRadius: 6, transition: 'background 0.15s' }} className="hover-bg-slate">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setSelectedTeam(prev => prev.filter(id => id !== lecturer.id))
                            } else {
                              setSelectedTeam(prev => [...prev, lecturer.id])
                            }
                          }}
                          style={{ width: 16, height: 16, accentColor: '#4f46e5' }}
                        />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{lecturer.nama_lengkap}</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>{lecturer.email}</div>
                        </div>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setManageTeamModal(false)}>Batal</button>
              <button className="btn btn-primary" onClick={handleSaveTeam} disabled={saving}>
                {saving ? 'Menyimpan…' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Approve ─────────────────────────────────────────── */}
      {modal === 'approve' && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth:420 }}>
            <div className="modal-header">
              <span className="modal-title">Setujui RPS</span>
              <button className="btn btn-ghost btn-icon" onClick={() => setModal(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize:13, color:'#64748b' }}>
                RPS <strong>{rps.mk?.kode_mk} — {rps.mk?.nama_mk}</strong> oleh{' '}
                <strong>{rps.dosen?.nama_lengkap}</strong> akan disetujui dan status berubah menjadi <strong>Disetujui</strong>.
              </p>
              <div className="input-group">
                <label className="input-label">Catatan (opsional)</label>
                <textarea className="input" rows={3} value={catatan} onChange={e => setCatatan(e.target.value)}
                  placeholder="Catatan untuk dosen…" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Batal</button>
              <button className="btn btn-primary" style={{ background:'#10b981' }}
                onClick={() => handleReview('approved')} disabled={saving}>
                <CheckCircle size={14} /> {saving ? 'Menyimpan…' : 'Setujui RPS'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Revisi (Structured) ────────────────────────────── */}
      {modal === 'revision' && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth:460 }}>
            <div className="modal-header">
              <span className="modal-title">Minta Revisi Terstruktur</span>
              <button className="btn btn-ghost btn-icon" onClick={() => setModal(null)}><X size={16} /></button>
            </div>
            <div className="modal-body" style={{ maxHeight: 400, overflowY: 'auto' }}>
              <p style={{ fontSize:13, color:'#64748b', marginBottom: 12 }}>
                Masukkan ringkasan revisi utama serta catatan spesifik pada bagian langkah form yang perlu diperbaiki.
              </p>
              <div className="input-group" style={{ marginBottom: 14 }}>
                <label className="input-label" style={{ fontWeight: 700 }}>Ringkasan Catatan Utama (Wajib) *</label>
                <textarea className="input" rows={2} value={catatan} onChange={e => setCatatan(e.target.value)}
                  placeholder="Perbaiki bagian CPMK dan total bobot penilaian..." />
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>Catatan Per Langkah (Opsional):</span>
                
                <div className="input-group">
                  <label className="input-label" style={{ fontSize: 11 }}>Langkah 1: Identitas & Deskripsi</label>
                  <input 
                    className="input" 
                    value={stepNotes[1]} 
                    onChange={e => setStepNotes(p => ({ ...p, 1: e.target.value }))}
                    placeholder="Contoh: Deskripsi mata kuliah kurang menggambarkan output OBE..."
                  />
                </div>
                <div className="input-group">
                  <label className="input-label" style={{ fontSize: 11 }}>Langkah 2: CPL & CPMK</label>
                  <input 
                    className="input" 
                    value={stepNotes[2]} 
                    onChange={e => setStepNotes(p => ({ ...p, 2: e.target.value }))}
                    placeholder="Contoh: CPMK-3 tidak selaras dengan CPL-2..."
                  />
                </div>
                <div className="input-group">
                  <label className="input-label" style={{ fontSize: 11 }}>Langkah 3: Rencana Pertemuan</label>
                  <input 
                    className="input" 
                    value={stepNotes[3]} 
                    onChange={e => setStepNotes(p => ({ ...p, 3: e.target.value }))}
                    placeholder="Contoh: Pertemuan 5 bahan kajiannya terlalu padat..."
                  />
                </div>
                <div className="input-group">
                  <label className="input-label" style={{ fontSize: 11 }}>Langkah 4: Penilaian & Referensi</label>
                  <input 
                    className="input" 
                    value={stepNotes[4]} 
                    onChange={e => setStepNotes(p => ({ ...p, 4: e.target.value }))}
                    placeholder="Contoh: Bobot UTS terlalu rendah..."
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Batal</button>
              <button className="btn btn-danger" onClick={() => handleReview('revision')} disabled={saving}>
                <AlertCircle size={14} /> {saving ? 'Menyimpan…' : 'Kirim Revisi'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        cancelText={confirmConfig.cancelText}
        type={confirmConfig.type}
        onConfirm={() => {
          confirmConfig.onConfirm?.()
          closeConfirm()
        }}
        onCancel={closeConfirm}
      />
    </div>
  )
}
