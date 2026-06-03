import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, ChevronLeft, Check, BookOpen, FileText, Target, Calendar, BarChart2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { currentTahunAkademik, TAHUN_AKADEMIK_LIST, SEMESTER_LIST, dbRPS } from '@/lib/db'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

// Step components
import Step1Mk        from './steps/Step1Mk'
import Step2Identitas from './steps/Step2Identitas'
import Step3Cpmk      from './steps/Step3Cpmk'
import Step4Pertemuan from './steps/Step4Pertemuan'
import Step5Penilaian from './steps/Step5Penilaian'

const STEPS = [
  { id: 1, label: 'Mata Kuliah',    icon: BookOpen  },
  { id: 2, label: 'Identitas',      icon: FileText  },
  { id: 3, label: 'CPL & CPMK',    icon: Target    },
  { id: 4, label: '16 Pertemuan',  icon: Calendar  },
  { id: 5, label: 'Penilaian',      icon: BarChart2 },
]

// Default 16 pertemuan
function defaultPertemuan() {
  return Array.from({ length: 16 }, (_, i) => ({
    no:                  i + 1,
    kemampuan_akhir:     '',
    bahan_kajian:        '',
    metode:              'Ceramah, Diskusi',
    waktu:               150,
    pengalaman_belajar:  '',
    kriteria_penilaian:  '',
    bobot:               i === 7 ? 0 : i === 15 ? 0 : Math.floor(80 / 14),  // UTS/UAS bobot dari penilaian
    is_uts:              i === 7,
    is_uas:              i === 15,
  }))
}

const DEFAULT_PENILAIAN = {
  uts:      30,
  uas:      35,
  tugas:    20,
  praktikum: 0,
  kehadiran: 5,
  lainnya:  10,
}

export default function RpsFormPage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const cur = currentTahunAkademik()

  const [step,    setStep]    = useState(1)
  const [saving,  setSaving]  = useState(false)
  const [draftId, setDraftId] = useState(null)

  // Form state
  const [form, setForm] = useState({
    // Step 1
    mk:             null,   // full mk object
    tahun_akademik: cur.tahun,
    semester_aktif: cur.semester,

    // Step 2
    deskripsi_mk: '',

    // Step 3
    cpmk: [],   // [{kode, deskripsi, cpl_ref:[]}]

    // Step 4
    pertemuan: defaultPertemuan(),

    // Step 5
    penilaian:  { ...DEFAULT_PENILAIAN },
    referensi:  [],
  })

  const setF = (key, val) => setForm(p => ({ ...p, [key]: val }))

  // Auto-save sebagai draft setiap 30 detik
  useEffect(() => {
    if (!form.mk || !user) return
    const id = setInterval(() => saveDraft(false), 30_000)
    return () => clearInterval(id)
  }, [form, user])

  async function saveDraft(notify = true) {
    if (!form.mk || !user) return
    const payload = buildPayload('draft')
    let result
    if (draftId) {
      result = await dbRPS.update(draftId, payload)
    } else {
      result = await dbRPS.create(payload)
      if (result.data) setDraftId(result.data.id)
    }
    if (notify && !result.error) toast.success('Draft tersimpan')
    if (result.error) console.error('Draft save error:', result.error)
  }

  function buildPayload(status) {
    return {
      dosen_id:       user.id,
      mk_id:          form.mk?.id,
      tahun_akademik: form.tahun_akademik,
      semester_aktif: form.semester_aktif,
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
    // Validasi per step
    if (step === 1 && !form.mk) { toast.error('Pilih Mata Kuliah terlebih dahulu'); return }
    if (step === 2 && !form.deskripsi_mk.trim()) { toast.error('Deskripsi MK wajib diisi'); return }
    if (step === 3 && form.cpmk.length === 0) { toast.error('Tambahkan minimal 1 CPMK'); return }
    if (step < 5) { setStep(s => s + 1); return }

    // Step 5 — submit
    const total = Object.values(form.penilaian).reduce((a, b) => a + Number(b), 0)
    if (total !== 100) { toast.error(`Total bobot penilaian harus 100% (saat ini ${total}%)`); return }

    await handleSubmit()
  }

  async function handleSubmit(asDraft = false) {
    if (!form.mk || !user) return
    setSaving(true)
    const payload = buildPayload(asDraft ? 'draft' : 'submitted')

    let result
    if (draftId) {
      result = await dbRPS.update(draftId, payload)
    } else {
      result = await dbRPS.create(payload)
    }

    setSaving(false)
    if (result.error) { toast.error('Gagal menyimpan: ' + result.error.message); return }

    if (asDraft) {
      toast.success('Tersimpan sebagai Draft')
      navigate('/rps')
    } else {
      toast.success('RPS berhasil diajukan untuk review! 🎉')
      navigate('/rps')
    }
  }

  const pct = ((step - 1) / (STEPS.length - 1)) * 100

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      {/* Page header */}
      <div className="page-header">
        <h1 className="page-title">Buat RPS Baru</h1>
        <p className="page-subtitle">Isi seluruh langkah untuk membuat Rencana Pembelajaran Semester</p>
      </div>

      {/* Stepper */}
      <div className="card" style={{ padding:'20px 24px', marginBottom:24 }}>
        {/* Progress bar */}
        <div style={{ height:4, background:'#e2e8f0', borderRadius:99, marginBottom:20, overflow:'hidden' }}>
          <div style={{
            height:'100%', width:`${pct}%`,
            background:'linear-gradient(to right,#6366f1,#4f46e5)',
            borderRadius:99, transition:'width .4s ease',
          }} />
        </div>

        <div style={{ display:'flex', justifyContent:'space-between', gap:8, flexWrap:'wrap' }}>
          {STEPS.map(s => {
            const done = step > s.id
            const cur  = step === s.id
            const Icon = s.icon
            return (
              <div key={s.id} style={{
                display:'flex', flexDirection:'column', alignItems:'center', gap:6,
                flex:1, minWidth:60, cursor: done ? 'pointer' : 'default',
              }}
                onClick={() => done && setStep(s.id)}
              >
                <div style={{
                  width:36, height:36, borderRadius:'50%',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  background: done ? '#4f46e5' : cur ? '#eef2ff' : '#f8fafc',
                  border: cur ? '2px solid #6366f1' : done ? 'none' : '2px solid #e2e8f0',
                  transition:'all .25s',
                }}>
                  {done
                    ? <Check size={16} color="#fff" strokeWidth={2.5} />
                    : <Icon size={15} color={cur ? '#6366f1' : '#94a3b8'} />
                  }
                </div>
                <span style={{
                  fontSize:11, fontWeight: cur ? 600 : 400,
                  color: cur ? '#4f46e5' : done ? '#6366f1' : '#94a3b8',
                  textAlign:'center', lineHeight:1.3,
                }}>
                  {s.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Step content */}
      <div className="card" style={{ padding:'28px 32px', minHeight:400 }}>
        {step === 1 && <Step1Mk form={form} setF={setF} userId={user?.id} />}
        {step === 2 && <Step2Identitas form={form} setF={setF} />}
        {step === 3 && <Step3Cpmk form={form} setF={setF} />}
        {step === 4 && <Step4Pertemuan form={form} setF={setF} />}
        {step === 5 && <Step5Penilaian form={form} setF={setF} />}
      </div>

      {/* Navigation buttons */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:20 }}>
        <div style={{ display:'flex', gap:10 }}>
          {step > 1 && (
            <button className="btn btn-secondary" onClick={() => setStep(s => s - 1)}>
              <ChevronLeft size={14} /> Sebelumnya
            </button>
          )}
          <button className="btn btn-ghost" onClick={() => handleSubmit(true)} disabled={saving || !form.mk}>
            Simpan Draft
          </button>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleNext}
          disabled={saving}
          style={{ minWidth:140 }}
        >
          {saving
            ? 'Menyimpan…'
            : step === 5
              ? 'Ajukan RPS ✓'
              : <><span>Selanjutnya</span><ChevronRight size={14} /></>
          }
        </button>
      </div>
    </div>
  )
}
