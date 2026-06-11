import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, ChevronLeft, Check, BookOpen, FileText, Target, Calendar, BarChart2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { currentTahunAkademik, TAHUN_AKADEMIK_LIST, SEMESTER_LIST, dbRPS } from '@/lib/db'
import { supabase } from '@/lib/supabase'
import { distributeWeeklyBobot } from '@/lib/rpsUtils'
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
    waktu:               100,
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
    manualProdiId:  '',
    manualKodeMk:   '',
    manualNamaMk:   '',
    manualSks:      2,
    manualSemester: 1,

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

  // Ref to always get the latest form state inside the interval
  const formRef = useRef(form)
  useEffect(() => {
    formRef.current = form
  }, [form])

  // Ref to always get the latest user state inside the interval
  const userRef = useRef(user)
  useEffect(() => {
    userRef.current = user
  }, [user])

  // Ref to always get the latest draftId state inside the interval
  const draftIdRef = useRef(draftId)
  useEffect(() => {
    draftIdRef.current = draftId
  }, [draftId])

  // Ref for saveDraft function to prevent calling old closures
  const saveDraftRef = useRef(null)
  saveDraftRef.current = async function(notify = true) {
    const currentForm = formRef.current
    const currentUser = userRef.current
    const currentDraftId = draftIdRef.current

    if (!currentForm.mk || !currentUser) return { error: new Error('Mata kuliah not selected or user not logged in') }

    const payload = {
      dosen_id:       currentUser.id,
      mk_id:          currentForm.mk?.id,
      tahun_akademik: currentForm.tahun_akademik,
      semester_aktif: currentForm.semester_aktif,
      status:         'draft',
      deskripsi_mk:   currentForm.deskripsi_mk,
      capaian_pembelajaran: {
        cpl:  currentForm.mk?.cpl ?? [],
        cpmk: currentForm.cpmk,
      },
      rencana_pembelajaran: distributeWeeklyBobot(currentForm.pertemuan, currentForm.penilaian),
      penilaian:  currentForm.penilaian,
      referensi:  currentForm.referensi,
    }

    let result
    if (currentDraftId) {
      result = await dbRPS.update(currentDraftId, payload)
    } else {
      result = await dbRPS.create(payload)
      if (result.data) setDraftId(result.data.id)
    }
    if (notify && !result.error) toast.success('Draft tersimpan')
    if (result.error) console.error('Draft save error:', result.error)
    return result
  }

  const saveDraft = useCallback((notify = true) => {
    if (saveDraftRef.current) {
      return saveDraftRef.current(notify)
    }
  }, [])

  // Auto-save sebagai draft setiap 30 detik
  useEffect(() => {
    if (!user) return
    const id = setInterval(() => {
      if (formRef.current.mk) {
        saveDraft(false)
      }
    }, 30_000)
    return () => clearInterval(id)
  }, [user, saveDraft])

  // Auto-fetch curriculum CPL if course doesn't have CPL mapped
  useEffect(() => {
    if (!form.mk) return
    if (form.mk.cpl && form.mk.cpl.length > 0) return

    async function loadCurriculumCpl() {
      const prodiId = form.mk.prodi_id || form.manualProdiId
      if (!prodiId) return
      try {
        // Try fetching active curriculum first
        let { data, error } = await supabase
          .from('kurikulum_docs')
          .select('extracted_data')
          .eq('prodi_id', prodiId)
          .eq('jenis', 'kurikulum')
          .eq('is_active', true)
          .limit(1)

        // Fallback to latest if no active curriculum
        if (error || !data || data.length === 0) {
          const { data: latestData, error: latestError } = await supabase
            .from('kurikulum_docs')
            .select('extracted_data')
            .eq('prodi_id', prodiId)
            .eq('jenis', 'kurikulum')
            .order('created_at', { ascending: false })
            .limit(1)
          if (!latestError && latestData) {
            data = latestData
          }
        }

        if (data && data.length > 0) {
          const list = data[0].extracted_data?.cpl ?? []
          const cplArray = list.map(c => `${c.kode}: ${c.deskripsi}`)
          setForm(prev => ({
            ...prev,
            mk: {
              ...prev.mk,
              cpl: cplArray
            }
          }))
        }
      } catch (err) {
        console.error('Error fetching curriculum CPLs:', err)
      }
    }
    loadCurriculumCpl()
  }, [form.mk?.id, form.mk?.prodi_id, form.manualProdiId])

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
      rencana_pembelajaran: distributeWeeklyBobot(form.pertemuan, form.penilaian),
      penilaian:  form.penilaian,
      referensi:  form.referensi,
    }
  }

  async function handleNext() {
    // Validasi per step
    if (step === 1) {
      if (!form.manualProdiId) { toast.error('Pilih Program Studi terlebih dahulu'); return }
      if (!form.manualKodeMk.trim()) { toast.error('Kode Mata Kuliah wajib diisi'); return }
      if (!form.manualNamaMk.trim()) { toast.error('Nama Mata Kuliah wajib diisi'); return }
      if (!form.manualSks || form.manualSks < 1) { toast.error('SKS tidak valid'); return }
      if (!form.manualSemester || form.manualSemester < 1 || form.manualSemester > 8) { toast.error('Semester tidak valid'); return }

      setSaving(true)
      const loadToast = toast.loading('Memproses data mata kuliah...')
      try {
        // Cek apakah MK sudah ada di database
        const { data: existingMk } = await supabase
          .from('mata_kuliah')
          .select('*, prodi:program_studi!prodi_id(id, kode, nama)')
          .eq('prodi_id', form.manualProdiId)
          .eq('kode_mk', form.manualKodeMk.trim().toUpperCase())
          .maybeSingle()

        let mkData
        if (existingMk) {
          const hasChanged = existingMk.nama_mk !== form.manualNamaMk.trim() ||
                             existingMk.sks !== Number(form.manualSks) ||
                             existingMk.semester !== Number(form.manualSemester)

          if (hasChanged) {
            // Update data jika berubah
            const { data: updatedMk, error: updateErr } = await supabase
              .from('mata_kuliah')
              .update({
                nama_mk: form.manualNamaMk.trim(),
                sks: Number(form.manualSks),
                semester: Number(form.manualSemester)
              })
              .eq('id', existingMk.id)
              .select('id, kode_mk, nama_mk, sks, semester, cpl, prodi_id, prodi:program_studi!prodi_id(id, kode, nama)')
              .single()

            if (updateErr) throw updateErr
            mkData = updatedMk
          } else {
            mkData = existingMk
          }
        } else {
          // Buat data MK baru
          const { data: newMk, error: insertErr } = await supabase
            .from('mata_kuliah')
            .insert({
              prodi_id: form.manualProdiId,
              kode_mk: form.manualKodeMk.trim().toUpperCase(),
              nama_mk: form.manualNamaMk.trim(),
              sks: Number(form.manualSks),
              semester: Number(form.manualSemester)
            })
            .select('id, kode_mk, nama_mk, sks, semester, cpl, prodi_id, prodi:program_studi!prodi_id(id, kode, nama)')
            .single()

          if (insertErr) throw insertErr
          mkData = newMk
        }

        const sks = mkData?.sks || Number(form.manualSks) || 3
        const calculatedWaktu = sks * 50
        setForm(p => ({
          ...p,
          mk: mkData,
          pertemuan: p.pertemuan.map(pt => ({
            ...pt,
            waktu: calculatedWaktu
          }))
        }))
        toast.dismiss(loadToast)
      } catch (err) {
        console.error(err)
        toast.dismiss(loadToast)
        toast.error('Gagal menetapkan Mata Kuliah: ' + err.message)
        setSaving(false)
        return
      }
      setSaving(false)
    }
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
        {step === 1 && <Step1Mk form={form} setF={setF} userId={user?.id} userProdiId={profile?.prodi_id} />}
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
