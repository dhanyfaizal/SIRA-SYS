import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronRight, ChevronLeft, Check, BookOpen, FileText, Target, Calendar, BarChart2, AlertCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { dbRPS } from '@/lib/db'
import toast from 'react-hot-toast'

import Step2Identitas from './steps/Step2Identitas'
import Step3Cpmk      from './steps/Step3Cpmk'
import Step4Pertemuan from './steps/Step4Pertemuan'
import Step5Penilaian from './steps/Step5Penilaian'

const STEPS = [
  { id: 1, label: 'Identitas',     icon: FileText  },
  { id: 2, label: 'CPL & CPMK',   icon: Target    },
  { id: 3, label: '16 Pertemuan', icon: Calendar  },
  { id: 4, label: 'Penilaian',    icon: BarChart2 },
]

export default function RpsEditPage() {
  const { id }   = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [step,    setStep]    = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [form,    setForm]    = useState(null)
  
  const [rpsStatus, setRpsStatus] = useState('draft')
  const [reviewNotes, setReviewNotes] = useState({})

  // Load existing RPS
  useEffect(() => {
    async function load() {
      const { data, error } = await dbRPS.getById(id)
      if (error || !data) { toast.error('RPS tidak ditemukan'); navigate('/rps'); return }
      
      const isOwnerOrTeam = data.dosen_id === user?.id || (data.team_dosen && data.team_dosen.includes(user?.id))
      if (!isOwnerOrTeam) { toast.error('Anda tidak memiliki akses ke RPS ini'); navigate('/rps'); return }
      
      if (!['draft','revision'].includes(data.status)) {
        toast.error('RPS ini tidak dapat diedit (status: ' + data.status + ')')
        navigate(`/rps/${id}`)
        return
      }

      setRpsStatus(data.status)
      setReviewNotes(data.review_notes ?? {})

      const cp = data.capaian_pembelajaran ?? {}
      setForm({
        mk:             data.mk,
        tahun_akademik: data.tahun_akademik,
        semester_aktif: data.semester_aktif,
        deskripsi_mk:   data.deskripsi_mk ?? '',
        cpmk:           cp.cpmk ?? [],
        pertemuan:      data.rencana_pembelajaran ?? [],
        penilaian:      data.penilaian ?? { uts:30, uas:35, tugas:20, praktikum:0, kehadiran:5, lainnya:10 },
        referensi:      data.referensi ?? [],
      })
      setLoading(false)
    }
    load()
  }, [id, user])

  const setF = (key, val) => setForm(p => ({ ...p, [key]: val }))

  function buildPayload(status) {
    return {
      status,
      deskripsi_mk:   form.deskripsi_mk,
      capaian_pembelajaran: {
        cpl:  form.mk?.cpl ?? [],
        cpmk: form.cpmk,
      },
      rencana_pembelajaran: form.pertemuan,
      penilaian:  form.penilaian,
      referensi:  form.referensi,
    }
  }

  async function handleNext() {
    if (step === 1 && !form.deskripsi_mk.trim()) { toast.error('Deskripsi MK wajib diisi'); return }
    if (step === 2 && form.cpmk.length === 0)    { toast.error('Tambahkan minimal 1 CPMK'); return }
    if (step < 4) { setStep(s => s + 1); return }

    // Step 4 — submit or save
    const total = Object.values(form.penilaian).reduce((a, b) => a + Number(b), 0)
    if (total !== 100) { toast.error(`Total bobot harus 100% (saat ini ${total}%)`); return }
    await handleSave('submitted')
  }

  async function handleSave(status = 'draft') {
    setSaving(true)
    const { error } = await dbRPS.update(id, buildPayload(status))
    setSaving(false)
    if (error) { toast.error('Gagal menyimpan: ' + error.message); return }
    toast.success(status === 'submitted' ? 'RPS diajukan ulang untuk review! ✅' : 'Draft tersimpan')
    navigate(`/rps/${id}`)
  }

  const pct = ((step - 1) / (STEPS.length - 1)) * 100

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:80, flexDirection:'column', gap:16 }}>
      <div className="spinner" style={{ width:32, height:32 }} />
      <p style={{ color:'#94a3b8', fontSize:13 }}>Memuat RPS…</p>
    </div>
  )

  return (
    <div style={{ maxWidth:860, margin:'0 auto' }}>
      <div className="page-header">
        <h1 className="page-title">Edit RPS</h1>
        <p className="page-subtitle">
          {form?.mk?.kode_mk} — {form?.mk?.nama_mk} · {form?.tahun_akademik} {form?.semester_aktif}
        </p>
      </div>

      {/* Stepper */}
      <div className="card" style={{ padding:'20px 24px', marginBottom:24 }}>
        <div style={{ height:4, background:'#e2e8f0', borderRadius:99, marginBottom:20, overflow:'hidden' }}>
          <div style={{
            height:'100%', width:`${pct}%`,
            background:'linear-gradient(to right,#6366f1,#4f46e5)',
            borderRadius:99, transition:'width .4s ease',
          }} />
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', gap:8 }}>
          {STEPS.map(s => {
            const done = step > s.id
            const cur  = step === s.id
            const Icon = s.icon
            return (
              <div key={s.id} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, flex:1, cursor: done ? 'pointer' : 'default' }}
                onClick={() => done && setStep(s.id)}>
                <div style={{
                  width:36, height:36, borderRadius:'50%',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  background: done ? '#4f46e5' : cur ? '#eef2ff' : '#f8fafc',
                  border: cur ? '2px solid #6366f1' : done ? 'none' : '2px solid #e2e8f0',
                  transition:'all .25s',
                }}>
                  {done ? <Check size={16} color="#fff" strokeWidth={2.5} /> : <Icon size={15} color={cur ? '#6366f1' : '#94a3b8'} />}
                </div>
                <span style={{ fontSize:11, fontWeight: cur ? 600 : 400, color: cur ? '#4f46e5' : done ? '#6366f1' : '#94a3b8', textAlign:'center' }}>
                  {s.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Step content — step 1 dari edit = Step2Identitas (karena MK sudah tetap) */}
      <div className="card" style={{ padding:'28px 32px', minHeight:400 }}>
        {rpsStatus === 'revision' && reviewNotes[step] && (
          <div style={{
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 20,
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start'
          }}>
            <AlertCircle size={16} color="#d97706" style={{ marginTop: 2, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#b45309', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 2 }}>
                Catatan Revisi Langkah {step} ({STEPS[step-1]?.label})
              </div>
              <div style={{ fontSize: 13, color: '#92400e', lineHeight: 1.5 }}>
                {reviewNotes[step]}
              </div>
            </div>
          </div>
        )}
        {step === 1 && <Step2Identitas form={form} setF={setF} />}
        {step === 2 && <Step3Cpmk     form={form} setF={setF} />}
        {step === 3 && <Step4Pertemuan form={form} setF={setF} />}
        {step === 4 && <Step5Penilaian form={form} setF={setF} />}
      </div>

      {/* Navigation */}
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:20 }}>
        <div style={{ display:'flex', gap:10 }}>
          {step > 1 && (
            <button className="btn btn-secondary" onClick={() => setStep(s => s - 1)}>
              <ChevronLeft size={14} /> Sebelumnya
            </button>
          )}
          <button className="btn btn-ghost" onClick={() => handleSave('draft')} disabled={saving}>
            Simpan Draft
          </button>
        </div>
        <button className="btn btn-primary" onClick={handleNext} disabled={saving} style={{ minWidth:140 }}>
          {saving ? 'Menyimpan…' : step === 4 ? 'Ajukan Ulang ✓' : <><span>Selanjutnya</span><ChevronRight size={14} /></>}
        </button>
      </div>
    </div>
  )
}
