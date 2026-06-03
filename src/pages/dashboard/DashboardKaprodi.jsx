import { useState, useEffect } from 'react'
import { FileText, Users, Shield, BookOpen, AlertCircle, TrendingUp, Award } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

function getComponentType(label) {
  const l = label.toLowerCase()
  if (l.includes('uts') || l.includes('tengah')) return 'uts'
  if (l.includes('uas') || l.includes('akhir')) return 'uas'
  if (l.includes('tugas') || l.includes('kuis')) return 'tugas'
  if (l.includes('kehadiran') || l.includes('presensi') || l.includes('absen')) return 'kehadiran'
  if (l.includes('praktikum') || l.includes('lab')) return 'praktikum'
  return 'lainnya'
}

export default function DashboardKaprodi() {
  const { profile } = useAuth()
  const nama = profile?.nama_lengkap?.split(' ')[0] || 'Ka. Prodi'

  const [loading, setLoading] = useState(true)
  const [statsData, setStatsData] = useState({
    totalRps: 0,
    activeDosen: 0,
    waitingRps: 0,
    totalMk: 0
  })
  const [cplAverages, setCplAverages] = useState({})

  useEffect(() => {
    async function loadStatsAndCpl() {
      if (!profile?.prodi_id) return
      setLoading(true)
      
      try {
        // 1. Fetch total Mata Kuliah in prodi
        const { count: mkCount } = await supabase
          .from('mata_kuliah')
          .select('*', { count: 'exact', head: true })
          .eq('prodi_id', profile.prodi_id)

        // 2. Fetch all RPS in prodi to aggregate stats
        const { data: rpsInProdi, error: rpsErr } = await supabase
          .from('rps')
          .select(`
            id, status, dosen_id,
            mk:mata_kuliah!mk_id(prodi_id)
          `)
          .eq('mk.prodi_id', profile.prodi_id)

        if (rpsErr) throw rpsErr

        const totalRps = rpsInProdi?.length || 0
        const waitingRps = rpsInProdi?.filter(r => r.status === 'submitted').length || 0
        const activeDosen = new Set(rpsInProdi?.map(r => r.dosen_id)).size || 0

        setStatsData({
          totalRps,
          activeDosen,
          waitingRps,
          totalMk: mkCount || 0
        })

        // 3. Fetch data for CPL analysis
        // Get all approved RPS in prodi
        const { data: approvedRps, error: appRpsErr } = await supabase
          .from('rps')
          .select(`
            id, mk_id, capaian_pembelajaran, penilaian,
            mk:mata_kuliah!mk_id(id, kode_mk, nama_mk, cpl, prodi_id)
          `)
          .eq('status', 'approved')
          .eq('mk.prodi_id', profile.prodi_id)

        if (appRpsErr) throw appRpsErr

        if (approvedRps && approvedRps.length > 0) {
          const rpsIds = approvedRps.map(r => r.id)
          const mkIds = approvedRps.map(r => r.mk_id)

          // Fetch assessments mapping
          const { data: assessments } = await supabase
            .from('asesmen_obe')
            .select('*')
            .in('rps_id', rpsIds)

          // Fetch enrolled students
          const { data: enrollments } = await supabase
            .from('kelas_mahasiswa')
            .select('mahasiswa_id, mk_id')
            .in('mk_id', mkIds)

          // Fetch grades
          if (assessments && assessments.length > 0 && enrollments && enrollments.length > 0) {
            const assIds = assessments.map(a => a.id)
            const { data: grades } = await supabase
              .from('nilai_asesmen_mahasiswa')
              .select('*')
              .in('asesmen_id', assIds)

            if (grades && grades.length > 0) {
              // Group grades by student
              const studentGrades = {}
              grades.forEach(g => {
                if (!studentGrades[g.mahasiswa_id]) {
                  studentGrades[g.mahasiswa_id] = {}
                }
                studentGrades[g.mahasiswa_id][g.asesmen_id] = g.nilai
              })

              const cplScores = {} // CPL Key -> array of scores

              // Loop through enrollments
              enrollments.forEach(en => {
                const rps = approvedRps.find(r => r.mk_id === en.mk_id)
                const sGrades = studentGrades[en.mahasiswa_id]

                // Skip if student doesn't have grades recorded yet for this enrollment
                if (rps && sGrades) {
                  const rpsCpmks = rps.capaian_pembelajaran?.cpmk || []
                  const courseAss = assessments.filter(a => a.rps_id === rps.id)

                  // Calculate CPMK achievements for this student in this course
                  const cpmkScores = {}
                  rpsCpmks.forEach(c => {
                    const matchingAss = courseAss.filter(a => a.cpmk_kode === c.kode)
                    if (matchingAss.length > 0) {
                      const sumWeights = matchingAss.reduce((sum, a) => sum + Number(a.bobot_persen), 0)
                      const weightedSum = matchingAss.reduce((sum, a) => {
                        const score = sGrades[a.id] !== undefined ? Number(sGrades[a.id]) : 0
                        return sum + (score * Number(a.bobot_persen))
                      }, 0)
                      cpmkScores[c.kode] = sumWeights > 0 ? (weightedSum / sumWeights) : 0
                    } else {
                      cpmkScores[c.kode] = 0
                    }
                  })

                  // Map CPMK scores to CPLs
                  const courseCplList = rps.mk?.cpl || []
                  courseCplList.forEach((cplItem, ci) => {
                    const cplName = `CPL-${ci + 1}`
                    const matchingCpmks = rpsCpmks.filter(c => c.cpl_ref && c.cpl_ref.includes(cplName))
                    
                    if (matchingCpmks.length > 0) {
                      const sumCpmk = matchingCpmks.reduce((sum, c) => sum + (cpmkScores[c.kode] || 0), 0)
                      const score = sumCpmk / matchingCpmks.length
                      
                      if (!cplScores[cplName]) {
                        cplScores[cplName] = []
                      }
                      cplScores[cplName].push(score)
                    }
                  })
                }
              })

              // Calculate final prodi-wide averages per CPL
              const finalCpls = {}
              Object.entries(cplScores).forEach(([cpl, arr]) => {
                if (arr.length > 0) {
                  finalCpls[cpl] = arr.reduce((a, b) => a + b, 0) / arr.length
                }
              })
              setCplAverages(finalCpls)
            }
          }
        }
      } catch (err) {
        console.error('Error loading Kaprodi Dashboard metrics:', err)
      } finally {
        setLoading(false)
      }
    }

    loadStatsAndCpl()
  }, [profile])

  const stats = [
    { label: 'Total RPS Prodi', value: String(statsData.totalRps), sub: 'Telah terdaftar', icon: FileText, color: '#eef2ff', iconColor: '#4f46e5' },
    { label: 'Dosen Aktif', value: String(statsData.activeDosen), sub: 'Mengajar prodi', icon: Users, color: '#d1fae5', iconColor: '#10b981' },
    { label: 'Review SPMI', value: String(statsData.waitingRps), sub: 'Perlu ditinjau', icon: Shield, color: '#fef3c7', iconColor: '#f59e0b' },
    { label: 'Mata Kuliah', value: String(statsData.totalMk), sub: 'Dalam kurikulum', icon: BookOpen, color: '#ede9fe', iconColor: '#7c3aed' },
  ]

  const cplKeys = Object.keys(cplAverages)
  const sortedCpls = cplKeys.sort()

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard Ka. Prodi — {nama}</h1>
        <p className="page-subtitle">Pantau seluruh RPS, mutu pembelajaran, dan evaluasi ketercapaian CPL lulusan prodi.</p>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {stats.map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-card-icon" style={{ background: s.color }}>
              <s.icon size={18} color={s.iconColor} />
            </div>
            <div className="stat-card-label">{s.label}</div>
            <div className="stat-card-value">{s.value}</div>
            <div className="stat-card-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Analytics Grid */}
      <div className="dashboard-grid">
        
        {/* CPL Analytics Panel */}
        <div className="card span-1" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--gray-900)' }}>Analisis Ketercapaian CPL Lulusan</span>
            <span style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 11, color: '#10b981', fontWeight: 600 }}>
              <TrendingUp size={12} /> Target Prodi: ≥75%
            </span>
          </div>
          <div className="card-body">
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
                <div className="spinner" style={{ width: 20, height: 20 }} />
              </div>
            ) : sortedCpls.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px' }}>
                <div className="empty-state-icon">📊</div>
                <div className="empty-state-text" style={{ fontSize: 12.5 }}>Data CPL Mahasiswa Belum Tersedia</div>
                <div className="empty-state-sub" style={{ fontSize: 11.5 }}>Masukkan nilai mahasiswa di Buku Nilai untuk melihat statistik.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {sortedCpls.map(cpl => {
                  const score = cplAverages[cpl] || 0
                  const isStruggling = score < 75
                  
                  return (
                    <div key={cpl}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, fontSize: 12 }}>
                        <span style={{ fontWeight: 700, color: 'var(--gray-700)' }}>{cpl}</span>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          {isStruggling && (
                            <span style={{ fontSize: 9, background: '#fef2f2', color: '#ef4444', border: '1px solid #fee2e2', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                              Di bawah target
                            </span>
                          )}
                          <span style={{ fontWeight: 800, color: isStruggling ? '#ef4444' : '#10b981' }}>
                            {score.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div style={{ height: 8, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${score}%`,
                          background: score >= 75 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444',
                          borderRadius: 99,
                          transition: 'width .4s ease'
                        }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Audit Mutu SPMI Panel */}
        <div className="card span-1">
          <div className="card-header">
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--gray-900)' }}>Status Penjaminan Mutu (SPMI)</span>
          </div>
          <div className="card-body">
            <div className="empty-state" style={{ padding: '24px' }}>
              <div className="empty-state-icon">🛡️</div>
              <div className="empty-state-text" style={{ fontSize: 12.5 }}>Review SPMI Terpusat</div>
              <div className="empty-state-sub" style={{ fontSize: 11.5 }}>
                Kelola kepatuhan kurikulum dan keselarasan CPL di menu <strong>"Semua RPS Prodi"</strong> atau <strong>"Review SPMI"</strong> di sidebar.
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
