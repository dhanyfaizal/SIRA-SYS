import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { 
  Plus, Trash2, Save, Calculator, AlertTriangle, CheckCircle, 
  RefreshCw, UserPlus, Info, BookOpen, Settings, BarChart2, Sparkles
} from 'lucide-react'
import toast from 'react-hot-toast'
import { generateObeMapping } from '@/lib/ai'

// Client-side UUID generator helper (RFC4122 v4 compliant)
function generateUUID() {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Standard keywords for components in RPS
const COMPONENT_TYPES = [
  { value: 'uts', label: 'UTS (Ujian Tengah Semester)' },
  { value: 'uas', label: 'UAS (Ujian Akhir Semester)' },
  { value: 'tugas', label: 'Tugas / Kuis' },
  { value: 'kehadiran', label: 'Kehadiran' },
  { value: 'praktikum', label: 'Praktikum' },
  { value: 'lainnya', label: 'Lainnya' }
]

function getComponentType(label) {
  const l = label.toLowerCase()
  if (l.includes('uts') || l.includes('tengah')) return 'uts'
  if (l.includes('uas') || l.includes('akhir')) return 'uas'
  if (l.includes('tugas') || l.includes('kuis')) return 'tugas'
  if (l.includes('kehadiran') || l.includes('presensi') || l.includes('absen')) return 'kehadiran'
  if (l.includes('praktikum') || l.includes('lab')) return 'praktikum'
  return 'lainnya'
}

function getGradeLetter(score) {
  if (score >= 80) return 'A'
  if (score >= 75) return 'B+'
  if (score >= 70) return 'B'
  if (score >= 65) return 'C+'
  if (score >= 60) return 'C'
  if (score >= 50) return 'D'
  return 'E'
}

export default function LecturerGradebookPage() {
  const { user, profile } = useAuth()
  
  // Loading & Data States
  const [rpsList, setRpsList] = useState([])
  const [selectedRpsId, setSelectedRpsId] = useState('')
  const [selectedRps, setSelectedRps] = useState(null)
  
  const [assessments, setAssessments] = useState([])
  const [students, setStudents] = useState([])
  const [grades, setGrades] = useState({})
  
  const [loading, setLoading] = useState(true)
  const [saving, setLoadingSave] = useState(false)
  const [activeTab, setActiveTab] = useState('input-nilai') // 'input-nilai' | 'konfigurasi'
  
  // Local state for configuration edits
  const [localAssessments, setLocalAssessments] = useState([])

  // Load RPS list on mount
  useEffect(() => {
    async function loadRps() {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('rps')
          .select(`
            id, mk_id, status, tahun_akademik, semester_aktif, capaian_pembelajaran, penilaian, dosen_id, team_dosen,
            mk:mata_kuliah!mk_id(id, kode_mk, nama_mk, sks, semester, cpl, prodi_id)
          `)
          .eq('status', 'approved')

        if (error) throw error

        let filtered = data || []
        if (profile?.role === 'dosen') {
          filtered = (data || []).filter(r => r.dosen_id === user?.id || (r.team_dosen && r.team_dosen.includes(user?.id)))
        } else if (profile?.role === 'kaprodi') {
          filtered = (data || []).filter(r => r.mk?.prodi_id === profile?.prodi_id)
        }

        setRpsList(filtered)
        if (filtered.length > 0) {
          setSelectedRpsId(filtered[0].id)
        }
      } catch (err) {
        console.error(err)
        toast.error('Gagal memuat mata kuliah: ' + err.message)
      } finally {
        setLoading(false)
      }
    }
    
    if (user && profile) {
      loadRps()
    }
  }, [user, profile])

  // Load selected class data when selection changes
  const loadRpsData = async (rpsId) => {
    if (!rpsId) return
    const rps = rpsList.find(r => r.id === rpsId)
    setSelectedRps(rps)
    
    try {
      // 1. Fetch assessments
      const { data: assData, error: assError } = await supabase
        .from('asesmen_obe')
        .select('*')
        .eq('rps_id', rpsId)
        .order('created_at')

      if (assError) throw assError
      setAssessments(assData || [])
      setLocalAssessments(assData || [])

      // 2. Fetch enrolled students
      const { data: enrolledData, error: enrolledError } = await supabase
        .from('kelas_mahasiswa')
        .select(`
          mahasiswa_id,
          mahasiswa:profiles!mahasiswa_id(id, nama_lengkap, email)
        `)
        .eq('mk_id', rps.mk_id)
        .eq('tahun_akademik', rps.tahun_akademik)
        .eq('semester_aktif', rps.semester_aktif)

      if (enrolledError) throw enrolledError
      
      const parsedStudents = (enrolledData || [])
        .map(e => e.mahasiswa)
        .filter(Boolean)
      setStudents(parsedStudents)

      // 3. Fetch grades
      if (assData && assData.length > 0) {
        const assIds = assData.map(a => a.id)
        const { data: gradesData, error: gradesError } = await supabase
          .from('nilai_asesmen_mahasiswa')
          .select('*')
          .in('asesmen_id', assIds)

        if (gradesError) throw gradesError

        const initialGrades = {}
        parsedStudents.forEach(s => {
          initialGrades[s.id] = {}
        })
        gradesData?.forEach(g => {
          if (!initialGrades[g.mahasiswa_id]) {
            initialGrades[g.mahasiswa_id] = {}
          }
          initialGrades[g.mahasiswa_id][g.asesmen_id] = g.nilai
        })
        setGrades(initialGrades)
      } else {
        setGrades({})
      }
    } catch (err) {
      console.error(err)
      toast.error('Gagal memuat data kelas: ' + err.message)
    }
  }

  useEffect(() => {
    if (selectedRpsId) {
      loadRpsData(selectedRpsId)
    }
  }, [selectedRpsId])

  // Enroll dummy students Aditya, Budi, Citra
  const handleEnrollDummy = async () => {
    if (!selectedRps) return
    setLoadingSave(true)
    try {
      const dummyIds = [
        '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222',
        '33333333-3333-3333-3333-333333333333'
      ]

      // Verify profiles exist
      const { data: existingProfiles, error: profileErr } = await supabase
        .from('profiles')
        .select('id')
        .in('id', dummyIds)

      if (profileErr) throw profileErr

      if (!existingProfiles || existingProfiles.length === 0) {
        toast.error('Mahasiswa dummy belum terbuat di database. Harap jalankan migrasi 004_fase3_asesmen_obe.sql di Supabase SQL Editor.')
        return
      }

      // Enroll profiles in kelas_mahasiswa
      const enrollments = existingProfiles.map(p => ({
        mahasiswa_id: p.id,
        mk_id: selectedRps.mk_id,
        tahun_akademik: selectedRps.tahun_akademik,
        semester_aktif: selectedRps.semester_aktif
      }))

      const { error: enrollError } = await supabase
        .from('kelas_mahasiswa')
        .insert(enrollments)
        .select()

      if (enrollError) {
        if (enrollError.code === '23505') {
          toast.error('Beberapa mahasiswa dummy sudah terdaftar di kelas ini.')
        } else {
          throw enrollError
        }
      } else {
        toast.success('Berhasil mendaftarkan mahasiswa dummy ke kelas!')
      }
      
      await loadRpsData(selectedRpsId)
    } catch (err) {
      console.error(err)
      toast.error('Gagal mendaftarkan mahasiswa dummy: ' + err.message)
    } finally {
      setLoadingSave(false)
    }
  }

  // Handle local assessment item additions/deletions/updates
  const handleAddLocalAssessment = (compType) => {
    const defaultCpmk = selectedRps?.capaian_pembelajaran?.cpmk?.[0]?.kode || 'CPMK-1'
    const newItem = {
      id: generateUUID(), // Generate a UUID immediately
      rps_id: selectedRpsId,
      nama_asesmen: compType,
      nama_soal: `Soal ${localAssessments.filter(a => a.nama_asesmen === compType).length + 1}`,
      bobot_persen: 0,
      cpmk_kode: defaultCpmk
    }
    setLocalAssessments([...localAssessments, newItem])
  }

  const handleRemoveLocalAssessment = (index) => {
    const next = [...localAssessments]
    next.splice(index, 1)
    setLocalAssessments(next)
  }

  const handleUpdateLocalAssessment = (index, key, value) => {
    const next = localAssessments.map((item, idx) => {
      if (idx === index) {
        if (key === 'bobot_persen') {
          return { ...item, [key]: Math.max(0, Math.min(100, Number(value) || 0)) }
        }
        return { ...item, [key]: value }
      }
      return item
    })
    setLocalAssessments(next)
  }

  // Save assessments config
  const handleSaveConfig = async () => {
    // Validate weights sum to 100% for components that have subcomponents defined
    const rpsPenilaian = selectedRps?.penilaian || {}
    let validationFailed = false
    
    Object.keys(rpsPenilaian).forEach(compName => {
      const compType = getComponentType(compName)
      const subitems = localAssessments.filter(a => a.nama_asesmen === compType)
      if (subitems.length > 0) {
        const sum = subitems.reduce((acc, x) => acc + Number(x.bobot_persen), 0)
        if (sum !== 100) {
          toast.error(`Total bobot sub-komponen untuk ${compName} harus 100% (saat ini ${sum}%)`)
          validationFailed = true
        }
      }
    })

    if (validationFailed) return

    setLoadingSave(true)
    try {
      // 1. Identify deleted assessments
      const originalIds = assessments.map(a => a.id).filter(Boolean)
      const currentIds = localAssessments.map(a => a.id).filter(Boolean)
      const deletedIds = originalIds.filter(id => !currentIds.includes(id))

      if (deletedIds.length > 0) {
        const { error: delError } = await supabase
          .from('asesmen_obe')
          .delete()
          .in('id', deletedIds)
        if (delError) throw delError
      }

      // 2. Upsert remaining/new assessments
      const upsertPayload = localAssessments.map(a => ({
        id: a.id, // ID is always a valid UUID (either database-loaded or client-generated)
        rps_id: selectedRpsId,
        nama_asesmen: a.nama_asesmen,
        nama_soal: a.nama_soal.trim(),
        bobot_persen: Number(a.bobot_persen),
        cpmk_kode: a.cpmk_kode
      }))

      if (upsertPayload.length > 0) {
        const { error: upsertError } = await supabase
          .from('asesmen_obe')
          .upsert(upsertPayload)
        if (upsertError) throw upsertError
      }

      toast.success('Konfigurasi asesmen berhasil disimpan!')
      await loadRpsData(selectedRpsId)
      setActiveTab('input-nilai')
    } catch (err) {
      console.error(err)
      toast.error('Gagal menyimpan konfigurasi: ' + err.message)
    } finally {
      setLoadingSave(false)
    }
  }

  const [aiLoading, setAiLoading] = useState(false)

  const handleAiRecommendMapping = async () => {
    if (!selectedRps) return
    
    // Prepare input parameters
    const courseName = selectedRps.mk?.nama_mk || ''
    const cpmkList = selectedRps.capaian_pembelajaran?.cpmk || []
    
    if (cpmkList.length === 0) {
      toast.error('RPS untuk mata kuliah ini belum memiliki daftar CPMK. Silakan susun CPMK di RPS terlebih dahulu.')
      return
    }

    const rpsPenilaian = selectedRps.penilaian || {}
    const activeComponents = Object.entries(rpsPenilaian)
      .filter(([, val]) => Number(val) > 0)
      .map(([name, weight]) => ({
        name: getComponentType(name),
        weight: Number(weight)
      }))

    if (activeComponents.length === 0) {
      toast.error('Mata kuliah ini belum memiliki konfigurasi komponen penilaian di RPS.')
      return
    }

    setAiLoading(true)
    const loadToast = toast.loading('AI sedang merancang rekomendasi pemetaan soal ke CPMK... 🤖')

    try {
      const recommendations = await generateObeMapping(courseName, cpmkList, activeComponents)
      
      if (recommendations && recommendations.length > 0) {
        // Map the recommendations to our localAssessments schema
        const mapped = recommendations.map(rec => ({
          id: generateUUID(), // Generate a UUID immediately
          rps_id: selectedRpsId,
          nama_asesmen: rec.nama_asesmen,
          nama_soal: rec.nama_soal || 'Soal',
          bobot_persen: Number(rec.bobot_persen) || 0,
          cpmk_kode: rec.cpmk_kode || 'CPMK-1'
        }))

        setLocalAssessments(mapped)
        toast.dismiss(loadToast)
        toast.success('Rekomendasi pemetaan OBE berhasil dibuat oleh AI! Silakan tinjau dan simpan jika sudah sesuai.')
      } else {
        throw new Error('Hasil rekomendasi AI kosong.')
      }
    } catch (err) {
      console.error(err)
      toast.dismiss(loadToast)
      toast.error('Gagal membuat rekomendasi AI: ' + err.message)
    } finally {
      setAiLoading(false)
    }
  }

  // Save student grades in bulk
  const handleSaveGrades = async () => {
    setLoadingSave(true)
    try {
      const upsertPayload = []
      
      students.forEach(s => {
        assessments.forEach(ass => {
          const score = grades[s.id]?.[ass.id]
          if (score !== undefined && score !== '') {
            upsertPayload.push({
              mahasiswa_id: s.id,
              asesmen_id: ass.id,
              nilai: Number(score)
            })
          }
        })
      })

      if (upsertPayload.length > 0) {
        const { error } = await supabase
          .from('nilai_asesmen_mahasiswa')
          .upsert(upsertPayload, { onConflict: 'asesmen_id,mahasiswa_id' })
        if (error) throw error
        toast.success('Buku nilai OBE berhasil disimpan!')
      } else {
        toast.error('Belum ada nilai yang dimasukkan.')
      }
      
      await loadRpsData(selectedRpsId)
    } catch (err) {
      console.error(err)
      toast.error('Gagal menyimpan nilai: ' + err.message)
    } finally {
      setLoadingSave(false)
    }
  }

  // Trigonometry calculation for CPLs and CPMKs
  const calculateStudentResult = (studentId) => {
    const studentGrades = grades[studentId] || {}
    const results = {
      componentScores: {},
      totalGrade: 0,
      gradeLetter: 'E',
      cpmkAchievements: {},
      cplAchievements: {}
    }

    // 1. Calculate Component Scores
    const components = selectedRps?.penilaian || {}
    Object.entries(components).forEach(([compName, compWeight]) => {
      const compType = getComponentType(compName)
      const subAss = assessments.filter(a => a.nama_asesmen === compType)

      if (subAss.length > 0) {
        const sumWeights = subAss.reduce((sum, a) => sum + Number(a.bobot_persen), 0)
        const weightedSum = subAss.reduce((sum, a) => {
          const score = Number(studentGrades[a.id] || 0)
          return sum + (score * Number(a.bobot_persen))
        }, 0)

        results.componentScores[compType] = sumWeights > 0 ? (weightedSum / sumWeights) : 0
      } else {
        results.componentScores[compType] = 0
      }

      // Add component score contributions
      results.totalGrade += (results.componentScores[compType] || 0) * (Number(compWeight) / 100)
    })

    results.gradeLetter = getGradeLetter(results.totalGrade)

    // 2. Calculate CPMK Achievements
    const cpmkList = selectedRps?.capaian_pembelajaran?.cpmk || []
    cpmkList.forEach(c => {
      const matchingAss = assessments.filter(a => a.cpmk_kode === c.kode)
      if (matchingAss.length > 0) {
        const sumWeights = matchingAss.reduce((sum, a) => sum + Number(a.bobot_persen), 0)
        const weightedSum = matchingAss.reduce((sum, a) => {
          const score = Number(studentGrades[a.id] || 0)
          return sum + (score * Number(a.bobot_persen))
        }, 0)
        results.cpmkAchievements[c.kode] = sumWeights > 0 ? (weightedSum / sumWeights) : 0
      } else {
        results.cpmkAchievements[c.kode] = 0
      }
    })

    // 3. Calculate CPL Achievements
    const cplList = selectedRps?.mk?.cpl || []
    cplList.forEach((cplItem, ci) => {
      const cplName = `CPL-${ci + 1}`
      const matchingCpmks = cpmkList.filter(c => c.cpl_ref && c.cpl_ref.includes(cplName))
      if (matchingCpmks.length > 0) {
        const sumCpmk = matchingCpmks.reduce((sum, c) => sum + (results.cpmkAchievements[c.kode] || 0), 0)
        results.cplAchievements[cplName] = sumCpmk / matchingCpmks.length
      } else {
        results.cplAchievements[cplName] = 0
      }
    })

    return results
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80, flexDirection: 'column', gap: 16 }}>
        <RefreshCw className="spinner" size={32} style={{ animation: 'spin 1s linear infinite', color: '#4f46e5' }} />
        <p style={{ color: '#64748b', fontSize: 13 }}>Memuat Buku Nilai SIRA-SYS…</p>
      </div>
    )
  }

  if (rpsList.length === 0) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">Buku Nilai OBE</h1>
          <p className="page-subtitle">Input nilai kelayakan OBE mahasiswa terintegrasi CPMK & CPL.</p>
        </div>
        <div className="card">
          <div className="card-body">
            <div className="empty-state">
              <div className="empty-state-icon">📊</div>
              <div className="empty-state-text">Tidak Ada Kelas Aktif</div>
              <div className="empty-state-sub">Anda tidak memiliki mata kuliah dengan RPS berstatus disetujui (Approved) untuk dinilai.</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const rpsPenilaian = selectedRps?.penilaian || {}
  const rpsCpmks = selectedRps?.capaian_pembelajaran?.cpmk || []

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="page-title">Buku Nilai (OBE)</h1>
          <p className="page-subtitle">Pemetaan CPMK, evaluasi nilai mahasiswa se-kelas, dan analisis CPL secara langsung.</p>
        </div>
        
        {/* Class selector */}
        <div className="input-group" style={{ margin: 0, minWidth: 320 }}>
          <label className="input-label" style={{ fontWeight: 600 }}>Kelas Perkuliahan</label>
          <select 
            className="input" 
            value={selectedRpsId} 
            onChange={e => setSelectedRpsId(e.target.value)}
            style={{ borderColor: 'var(--indigo-200)', background: '#fff', fontSize: 13 }}
          >
            {rpsList.map(r => (
              <option key={r.id} value={r.id}>
                {r.mk?.kode_mk} - {r.mk?.nama_mk} ({r.tahun_akademik} {r.semester_aktif})
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedRps && (
        <div style={{ marginBottom: 24 }}>
          {/* Tab Navigation */}
          <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--gray-200)', paddingBottom: 1, marginBottom: 20 }}>
            <button 
              onClick={() => setActiveTab('input-nilai')}
              className={`btn btn-sm ${activeTab === 'input-nilai' ? 'btn-primary' : 'btn-ghost'}`}
              style={{
                borderRadius: '6px 6px 0 0',
                padding: '10px 16px',
                borderBottom: activeTab === 'input-nilai' ? '2px solid #4f46e5' : 'none',
                background: activeTab === 'input-nilai' ? 'var(--indigo-50)' : 'transparent',
                color: activeTab === 'input-nilai' ? '#4f46e5' : 'var(--gray-600)',
                fontWeight: activeTab === 'input-nilai' ? '700' : '500',
              }}
            >
              <BarChart2 size={14} style={{ marginRight: 6 }} /> Input Nilai Mahasiswa
            </button>
            <button 
              onClick={() => {
                setActiveTab('konfigurasi')
                setLocalAssessments(assessments)
              }}
              className={`btn btn-sm ${activeTab === 'konfigurasi' ? 'btn-primary' : 'btn-ghost'}`}
              style={{
                borderRadius: '6px 6px 0 0',
                padding: '10px 16px',
                borderBottom: activeTab === 'konfigurasi' ? '2px solid #4f46e5' : 'none',
                background: activeTab === 'konfigurasi' ? 'var(--indigo-50)' : 'transparent',
                color: activeTab === 'konfigurasi' ? '#4f46e5' : 'var(--gray-600)',
                fontWeight: activeTab === 'konfigurasi' ? '700' : '500',
              }}
            >
              <Settings size={14} style={{ marginRight: 6 }} /> Konfigurasi Pemetaan Soal ke CPMK
            </button>
          </div>

          {/* TAB 1: KONFIGURASI ASESMEN */}
          {activeTab === 'konfigurasi' && (
            <div style={{ animation: 'fadeIn 0.2s ease' }}>
              <div className="card" style={{ marginBottom: 16 }}>
                <div className="card-header" style={{ background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Info size={16} color="#4f46e5" />
                    <span style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>Petunjuk Pemetaan OBE</span>
                  </div>
                  
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleAiRecommendMapping}
                    disabled={aiLoading}
                    style={{
                      background: 'linear-gradient(135deg, #e0e7ff 0%, #f5f3ff 100%)',
                      borderColor: '#c7d2fe',
                      color: '#4338ca',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontWeight: 700
                    }}
                  >
                    {aiLoading ? (
                      <RefreshCw size={13} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <Sparkles size={13} color="#4338ca" />
                    )}
                    {aiLoading ? 'Merancang...' : 'Rekomendasi Pemetaan AI'}
                  </button>
                </div>
                <div className="card-body" style={{ fontSize: 12.5, lineHeight: 1.6, color: '#475569' }}>
                  Petakan sub-komponen (seperti soal ujian, tugas spesifik, atau kuis) ke capaian pembelajaran mata kuliah (CPMK) yang diuji. 
                  Bobot persen masing-masing sub-komponen adalah persentase kontribusinya terhadap bobot komponen utama. 
                  <strong> Contoh:</strong> UTS bernilai 30% di RPS. Jika UTS dipecah menjadi UTS Soal 1 (CPMK-1, Bobot 50%) dan UTS Soal 2 (CPMK-2, Bobot 50%), maka jumlah bobot sub-komponen di bawah UTS harus 100%.
                </div>
              </div>

              {Object.entries(rpsPenilaian).filter(([, val]) => Number(val) > 0).map(([compName, compWeight]) => {
                const compType = getComponentType(compName)
                const subitems = localAssessments.filter(a => a.nama_asesmen === compType)
                const totalWeight = subitems.reduce((acc, x) => acc + Number(x.bobot_persen), 0)
                const isWeightOk = totalWeight === 100

                return (
                  <div key={compName} className="card" style={{ marginBottom: 16, borderLeft: '4px solid #4f46e5' }}>
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                      <div>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{compName}</span>
                        <span style={{ marginLeft: 8, background: '#e0e7ff', color: '#4f46e5', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
                          Bobot MK: {compWeight}%
                        </span>
                      </div>
                      
                      <button 
                        type="button" 
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleAddLocalAssessment(compType)}
                      >
                        <Plus size={13} /> Tambah Sub-komponen
                      </button>
                    </div>
                    
                    <div className="card-body">
                      {subitems.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8', fontSize: 13, border: '2px dashed #f1f5f9', borderRadius: 8 }}>
                          Belum ada sub-komponen. Tambahkan sub-komponen untuk memecah nilai dan menguji CPMK.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {localAssessments.map((a, idx) => {
                            if (a.nama_asesmen !== compType) return null
                            return (
                              <div key={idx} style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1, minWidth: 180 }}>
                                  <input 
                                    className="input" 
                                    placeholder="Contoh: Soal UTS 1 / Tugas 1" 
                                    value={a.nama_soal}
                                    onChange={e => handleUpdateLocalAssessment(idx, 'nama_soal', e.target.value)}
                                  />
                                </div>
                                <div style={{ width: 180 }}>
                                  <select 
                                    className="input"
                                    value={a.cpmk_kode}
                                    onChange={e => handleUpdateLocalAssessment(idx, 'cpmk_kode', e.target.value)}
                                  >
                                    {rpsCpmks.map(c => (
                                      <option key={c.kode} value={c.kode}>
                                        {c.kode} ({c.deskripsi.slice(0, 30)}...)
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: 110 }}>
                                  <input 
                                    type="number" 
                                    className="input" 
                                    style={{ textAlign: 'center' }}
                                    placeholder="Bobot"
                                    value={a.bobot_persen || ''}
                                    onChange={e => handleUpdateLocalAssessment(idx, 'bobot_persen', e.target.value)}
                                  />
                                  <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>%</span>
                                </div>
                                <button 
                                  type="button" 
                                  className="btn btn-ghost btn-icon btn-sm"
                                  onClick={() => handleRemoveLocalAssessment(idx)}
                                  style={{ color: '#ef4444' }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            )
                          })}

                          {/* Bobot summary per component */}
                          <div style={{
                            marginTop: 10, padding: '8px 14px', borderRadius: 6,
                            background: isWeightOk ? '#f0fdf4' : totalWeight > 100 ? '#fef2f2' : '#fffbeb',
                            border: isWeightOk ? '1px solid #bbf7d0' : totalWeight > 100 ? '1px solid #fecaca' : '1px solid #fde68a',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12
                          }}>
                            <span style={{ fontWeight: 600, color: isWeightOk ? '#065f46' : totalWeight > 100 ? '#991b1b' : '#92400e' }}>
                              {isWeightOk ? '✓ Bobot pas 100%' : `⚠ Total bobot harus 100% (saat ini ${totalWeight}%)`}
                            </span>
                            <span style={{ fontWeight: 800 }}>{totalWeight}%</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* Action buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button className="btn btn-secondary" onClick={() => setActiveTab('input-nilai')}>
                  Batal
                </button>
                <button className="btn btn-primary" onClick={handleSaveConfig} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {saving ? <RefreshCw className="spinner" size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
                  Simpan Konfigurasi
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: INPUT NILAI GRADINGS GRID */}
          {activeTab === 'input-nilai' && (
            <div style={{ animation: 'fadeIn 0.2s ease' }}>
              {assessments.length === 0 ? (
                <div className="card">
                  <div className="card-body" style={{ textAlign: 'center', padding: '36px 20px' }}>
                    <AlertTriangle size={36} color="#f59e0b" style={{ margin: '0 auto 12px' }} />
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b', marginBottom: 6 }}>Pemetaan Soal Belum Diatur</div>
                    <p style={{ color: '#64748b', fontSize: 13, maxWidth: 450, margin: '0 auto 16px' }}>
                      Sebelum menginput nilai mahasiswa, Anda harus membuat pemetaan sub-komponen soal (misalnya UTS Soal 1, Tugas 1) dan menetapkan referensi CPMK-nya terlebih dahulu.
                    </p>
                    <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('konfigurasi')}>
                      Mulai Atur Pemetaan Soal
                    </button>
                  </div>
                </div>
              ) : students.length === 0 ? (
                <div className="card">
                  <div className="card-body" style={{ textAlign: 'center', padding: '36px 20px' }}>
                    <UserPlus size={36} color="#4f46e5" style={{ margin: '0 auto 12px' }} />
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b', marginBottom: 6 }}>Tidak Ada Mahasiswa Terdaftar</div>
                    <p style={{ color: '#64748b', fontSize: 13, maxWidth: 450, margin: '0 auto 16px' }}>
                      Belum ada mahasiswa yang terdaftar (enrolled) mengambil kelas mata kuliah ini pada tahun akademik dan semester yang bersangkutan.
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
                      <button className="btn btn-primary btn-sm" onClick={handleEnrollDummy} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {saving ? <RefreshCw className="spinner" size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <UserPlus size={14} />}
                        Daftarkan 3 Mahasiswa Dummy
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  {/* Grid Table Container */}
                  <div className="card" style={{ marginBottom: 20 }}>
                    <div className="card-header" style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <Calculator size={16} color="#4f46e5" />
                        <span style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>Grid Tabel Penilaian Langsung (Excel-Style)</span>
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11, color: '#64748b' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }}></span> A (≥80)
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block', marginLeft: 6 }}></span> E (&lt;50)
                      </div>
                    </div>
                    
                    <div className="table-wrap" style={{ overflowX: 'auto', maxHeight: '550px' }}>
                      <table style={{ minWidth: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                            <th style={{ padding: '12px', textAlign: 'left', minWidth: '180px', position: 'sticky', left: 0, background: '#f1f5f9', zIndex: 2, borderRight: '1px solid #cbd5e1' }}>
                              Mahasiswa (NIM / Email)
                            </th>
                            {/* Component headers */}
                            {assessments.map(ass => (
                              <th key={ass.id} style={{ padding: '8px 12px', textAlign: 'center', minWidth: '110px', borderRight: '1px solid #cbd5e1' }} title={`${ass.nama_asesmen.toUpperCase()} - CPMK: ${ass.cpmk_kode}`}>
                                <div style={{ fontWeight: 700, color: '#1e293b' }}>{ass.nama_soal}</div>
                                <div style={{ fontSize: '10px', color: '#4f46e5', fontWeight: 600, marginTop: '2px' }}>
                                  {ass.cpmk_kode}
                                </div>
                                <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 500 }}>
                                  Bobot: {ass.bobot_persen}%
                                </div>
                              </th>
                            ))}
                            {/* Auto summary headers */}
                            <th style={{ padding: '8px 12px', textAlign: 'center', minWidth: '90px', borderRight: '1px solid #cbd5e1', background: '#eef2ff' }}>
                              Nilai Akhir
                            </th>
                            <th style={{ padding: '8px 12px', textAlign: 'center', minWidth: '60px', borderRight: '1px solid #cbd5e1', background: '#eef2ff' }}>
                              Huruf
                            </th>
                            {/* CPMK summary headers */}
                            {rpsCpmks.map(c => (
                              <th key={c.kode} style={{ padding: '8px 12px', textAlign: 'center', minWidth: '95px', borderRight: '1px solid #e2e8f0', background: '#f0fdf4' }}>
                                Nilai {c.kode}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {students.map(s => {
                            const res = calculateStudentResult(s.id)
                            const initial = s.nama_lengkap.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase()
                            
                            return (
                              <tr key={s.id} style={{ borderBottom: '1px solid #e2e8f0' }} className="grid-table-row">
                                {/* Student Profile Cell */}
                                <td style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, position: 'sticky', left: 0, background: '#ffffff', zIndex: 1, borderRight: '1px solid #cbd5e1' }}>
                                  <div style={{
                                    width: '28px', height: '28px', borderRadius: '50%',
                                    background: '#4f46e5', color: '#fff',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '11px', fontWeight: 700
                                  }}>
                                    {initial}
                                  </div>
                                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{s.nama_lengkap}</div>
                                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>{s.email}</div>
                                  </div>
                                </td>

                                {/* Input Grade Cells */}
                                {assessments.map(ass => {
                                  const val = grades[s.id]?.[ass.id]
                                  const cellBg = val === undefined || val === '' 
                                    ? '#fcfcfc' 
                                    : Number(val) >= 80 
                                      ? '#f0fdf4' 
                                      : Number(val) < 50 
                                        ? '#fef2f2' 
                                        : 'transparent'
                                        
                                  return (
                                    <td key={ass.id} style={{ padding: 0, borderRight: '1px solid #cbd5e1', background: cellBg, transition: 'background .15s' }}>
                                      <input 
                                        type="number"
                                        min="0"
                                        max="100"
                                        className="grid-cell-input"
                                        value={val ?? ''}
                                        onChange={e => {
                                          const valRaw = e.target.value
                                          const numVal = valRaw === '' ? '' : Math.max(0, Math.min(100, Number(valRaw)))
                                          setGrades(prev => ({
                                            ...prev,
                                            [s.id]: {
                                              ...(prev[s.id] || {}),
                                              [ass.id]: numVal
                                            }
                                          }))
                                        }}
                                        style={{
                                          width: '100%',
                                          height: '42px',
                                          border: 'none',
                                          background: 'transparent',
                                          textAlign: 'center',
                                          fontSize: '13px',
                                          fontWeight: '600',
                                          outline: 'none',
                                          color: val !== undefined && val !== '' && Number(val) < 50 ? '#ef4444' : '#1e293b'
                                        }}
                                      />
                                    </td>
                                  )
                                })}

                                {/* Calculated results */}
                                <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 800, color: '#4f46e5', borderRight: '1px solid #cbd5e1', background: '#eef2ff' }}>
                                  {res.totalGrade.toFixed(1)}
                                </td>
                                <td style={{ padding: '8px 12px', textAlign: 'center', borderRight: '1px solid #cbd5e1', background: '#eef2ff' }}>
                                  <span className={`badge-pill ${
                                    res.gradeLetter === 'A' ? 'badge-green' : 
                                    res.gradeLetter.startsWith('B') ? 'badge-indigo' : 
                                    res.gradeLetter.startsWith('C') ? 'badge-amber' : 'badge-red'
                                  }`} style={{ fontSize: '10px', padding: '2px 8px', fontWeight: 700 }}>
                                    {res.gradeLetter}
                                  </span>
                                </td>

                                {/* CPMK achievements */}
                                {rpsCpmks.map(c => {
                                  const cpmkVal = res.cpmkAchievements[c.kode] || 0
                                  return (
                                    <td key={c.kode} style={{ padding: '8px 12px', textAlign: 'center', borderRight: '1px solid #e2e8f0', background: '#f0fdf4', fontWeight: 600, color: cpmkVal >= 75 ? '#15803d' : '#b45309' }}>
                                      {cpmkVal.toFixed(1)}%
                                    </td>
                                  )
                                })}
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: '12px', color: '#64748b' }}>
                      <Info size={14} color="#6366f1" />
                      <span>Semua perhitungan final dan CPMK di atas dihitung secara dinamis dan real-time.</span>
                    </div>
                    
                    <button className="btn btn-primary" onClick={handleSaveGrades} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 160 }}>
                      {saving ? <RefreshCw className="spinner" size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
                      Simpan Nilai
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
