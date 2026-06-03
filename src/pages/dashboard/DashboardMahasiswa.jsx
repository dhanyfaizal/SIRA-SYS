import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { 
  GraduationCap, BookOpen, Award, Layers, 
  ChevronDown, ChevronUp, RefreshCw, BarChart2, Info 
} from 'lucide-react'
import toast from 'react-hot-toast'

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

export default function DashboardMahasiswa() {
  const { user, profile } = useAuth()
  
  const [loading, setLoading] = useState(true)
  const [coursesData, setCoursesData] = useState([])
  const [cplAverages, setCplAverages] = useState({})
  const [expandedCourse, setExpandedCourse] = useState(null)
  const [hoveredCpl, setHoveredCpl] = useState(null)

  useEffect(() => {
    async function loadStudentData() {
      if (!user) return
      setLoading(true)
      try {
        // 1. Fetch enrolled classes
        const { data: enrolled, error: enrollError } = await supabase
          .from('kelas_mahasiswa')
          .select(`
            id, mk_id, tahun_akademik, semester_aktif,
            mk:mata_kuliah!mk_id(id, kode_mk, nama_mk, sks, semester, cpl, prodi_id)
          `)
          .eq('mahasiswa_id', user.id)

        if (enrollError) throw enrollError

        if (!enrolled || enrolled.length === 0) {
          setCoursesData([])
          setCplAverages({})
          setLoading(false)
          return
        }

        // 2. Fetch approved RPS for these courses
        const mkIds = enrolled.map(e => e.mk_id)
        const { data: rpsList, error: rpsError } = await supabase
          .from('rps')
          .select('id, mk_id, capaian_pembelajaran, penilaian')
          .in('mk_id', mkIds)
          .eq('status', 'approved')

        if (rpsError) throw rpsError

        // 3. Fetch assessments for these RPS
        const rpsIds = rpsList.map(r => r.id)
        let assessments = []
        let grades = []

        if (rpsIds.length > 0) {
          const { data: assData, error: assError } = await supabase
            .from('asesmen_obe')
            .select('*')
            .in('rps_id', rpsIds)
          
          if (assError) throw assError
          assessments = assData || []

          // 4. Fetch student grades for these assessments
          if (assessments.length > 0) {
            const assIds = assessments.map(a => a.id)
            const { data: gradesData, error: gradesError } = await supabase
              .from('nilai_asesmen_mahasiswa')
              .select('*')
              .eq('mahasiswa_id', user.id)
              .in('asesmen_id', assIds)
            
            if (gradesError) throw gradesError
            grades = gradesData || []
          }
        }

        // Create a fast lookup for grades
        const gradeLookup = {}
        grades.forEach(g => {
          gradeLookup[g.asesmen_id] = g.nilai
        })

        // 5. Perform OBE calculations for each class
        const parsedCourses = []
        const cplScoresAccumulator = {} // cplKey -> array of scores

        enrolled.forEach(c => {
          const rps = rpsList.find(r => r.mk_id === c.mk_id)
          const courseResult = {
            enrollmentId: c.id,
            mkId: c.mk_id,
            kodeMk: c.mk?.kode_mk,
            namaMk: c.mk?.nama_mk,
            sks: c.mk?.sks || 2,
            semester: c.mk?.semester,
            tahunAkademik: c.tahun_akademik,
            semesterAktif: c.semester_aktif,
            hasApprovedRps: !!rps,
            finalGrade: 0,
            gradeLetter: '—',
            cpmkAchievements: [],
            assessmentsBreakdown: []
          }

          if (rps) {
            const rpsPenilaian = rps.penilaian || {}
            const rpsCpmks = rps.capaian_pembelajaran?.cpmk || []
            const courseAss = assessments.filter(a => a.rps_id === rps.id)
            
            // Calculate component scores
            let finalNumericGrade = 0
            const componentScores = {}

            Object.entries(rpsPenilaian).forEach(([compName, compWeight]) => {
              const compType = getComponentType(compName)
              const subitems = courseAss.filter(a => a.nama_asesmen === compType)

              if (subitems.length > 0) {
                const sumWeights = subitems.reduce((sum, a) => sum + Number(a.bobot_persen), 0)
                const weightedSum = subitems.reduce((sum, a) => {
                  const score = gradeLookup[a.id] !== undefined ? Number(gradeLookup[a.id]) : null
                  if (score === null) return sum // Treat unentered grades as not contributing (or 0)
                  return sum + (score * Number(a.bobot_persen))
                }, 0)

                componentScores[compType] = sumWeights > 0 ? (weightedSum / sumWeights) : 0
              } else {
                componentScores[compType] = 0
              }

              finalNumericGrade += (componentScores[compType] || 0) * (Number(compWeight) / 100)
            })

            courseResult.finalGrade = finalNumericGrade
            courseResult.gradeLetter = getGradeLetter(finalNumericGrade)

            // Subcomponents breakdown for expandable details
            courseAss.forEach(ass => {
              courseResult.assessmentsBreakdown.push({
                nama: ass.nama_soal,
                cpmk: ass.cpmk_kode,
                bobot: ass.bobot_persen,
                tipe: ass.nama_asesmen.toUpperCase(),
                nilai: gradeLookup[ass.id] !== undefined ? gradeLookup[ass.id] : null
              })
            })

            // Calculate CPMK achievements for this course
            const cpmkScores = {}
            rpsCpmks.forEach(c => {
              const matchingAss = courseAss.filter(a => a.cpmk_kode === c.kode)
              let cpmkVal = 0

              if (matchingAss.length > 0) {
                const sumWeights = matchingAss.reduce((sum, a) => sum + Number(a.bobot_persen), 0)
                const weightedSum = matchingAss.reduce((sum, a) => {
                  const score = gradeLookup[a.id] !== undefined ? Number(gradeLookup[a.id]) : 0
                  return sum + (score * Number(a.bobot_persen))
                }, 0)
                cpmkVal = sumWeights > 0 ? (weightedSum / sumWeights) : 0
              }

              cpmkScores[c.kode] = cpmkVal
              courseResult.cpmkAchievements.push({
                kode: c.kode,
                deskripsi: c.deskripsi,
                achievement: cpmkVal,
                cplRef: c.cpl_ref || []
              })
            })

            // Map CPMK scores to CPLs
            const courseCplList = c.mk?.cpl || []
            courseCplList.forEach((cplItem, ci) => {
              const cplName = `CPL-${ci + 1}`
              const matchingCpmks = rpsCpmks.filter(c => c.cpl_ref && c.cpl_ref.includes(cplName))
              
              if (matchingCpmks.length > 0) {
                const sumCpmk = matchingCpmks.reduce((sum, c) => sum + (cpmkScores[c.kode] || 0), 0)
                const cplScore = sumCpmk / matchingCpmks.length
                
                if (!cplScoresAccumulator[cplName]) {
                  cplScoresAccumulator[cplName] = []
                }
                cplScoresAccumulator[cplName].push(cplScore)
              }
            })
          }

          parsedCourses.push(courseResult)
        })

        // Compute CPL averages across all enrolled courses
        const finalCpls = {}
        Object.entries(cplScoresAccumulator).forEach(([cpl, scoreArr]) => {
          if (scoreArr.length > 0) {
            const sum = scoreArr.reduce((a, b) => a + b, 0)
            finalCpls[cpl] = sum / scoreArr.length
          }
        })

        setCoursesData(parsedCourses)
        setCplAverages(finalCpls)
      } catch (err) {
        console.error(err)
        toast.error('Gagal memuat data dashboard: ' + err.message)
      } finally {
        setLoading(false)
      }
    }

    loadStudentData()
  }, [user])

  // Custom Radar Chart Math
  const cplKeys = Object.keys(cplAverages)
  const chartCpls = cplKeys.length >= 3 ? cplKeys.sort() : ['CPL-1', 'CPL-2', 'CPL-3', 'CPL-4', 'CPL-5']
  
  const cx = 180
  const cy = 150
  const r = 95

  // Generate Radar Chart polygon vertices
  const getCoordinates = (index, value) => {
    const angle = (index * 2 * Math.PI) / chartCpls.length - Math.PI / 2
    const radius = r * (value / 100)
    const x = cx + radius * Math.cos(angle)
    const y = cy + radius * Math.sin(angle)
    return { x, y, angle }
  }

  // Calculate stats
  const totalSks = coursesData.reduce((acc, c) => acc + c.sks, 0)
  
  // Calculate GPA (IPK)
  const letterToWeight = { 'A': 4, 'B+': 3.5, 'B': 3, 'C+': 2.5, 'C': 2, 'D': 1, 'E': 0 }
  let weightSum = 0
  let sksSum = 0
  coursesData.forEach(c => {
    if (c.hasApprovedRps && c.gradeLetter !== '—') {
      const w = letterToWeight[c.gradeLetter] || 0
      weightSum += w * c.sks
      sksSum += c.sks
    }
  })
  const ipk = sksSum > 0 ? (weightSum / sksSum) : 0.0

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80, flexDirection: 'column', gap: 16 }}>
        <RefreshCw className="spinner" size={32} style={{ animation: 'spin 1s linear infinite', color: '#4f46e5' }} />
        <p style={{ color: '#64748b', fontSize: 13 }}>Memuat Portofolio Mahasiswa…</p>
      </div>
    )
  }

  return (
    <div>
      {/* Welcome Header */}
      <div className="page-header">
        <h1 className="page-title">Selamat datang, {profile?.nama_lengkap} 👋</h1>
        <p className="page-subtitle">Dashboard OBE & Portofolio Ketercapaian Kompetensi Kurikulum Anda.</p>
      </div>

      {coursesData.length === 0 ? (
        <div className="card">
          <div className="card-body">
            <div className="empty-state">
              <div className="empty-state-icon">🎓</div>
              <div className="empty-state-text">Belum Terdaftar Kelas</div>
              <div className="empty-state-sub">Anda belum terdaftar di kelas mata kuliah apapun semester ini. Silakan hubungi Ka. Prodi atau Dosen untuk pendaftaran kelas.</div>
            </div>
          </div>
        </div>
      ) : (
        <div>
          {/* Stats Grid */}
          <div className="stats-grid" style={{ marginBottom: 24 }}>
            <div className="stat-card">
              <div className="stat-card-icon" style={{ background: '#e0e7ff' }}>
                <GraduationCap size={18} color="#4f46e5" />
              </div>
              <div className="stat-card-label">Indeks Prestasi Kumulatif</div>
              <div className="stat-card-value" style={{ color: '#4f46e5' }}>{ipk > 0 ? ipk.toFixed(2) : '3.00'}</div>
              <div className="stat-card-sub">IPK Berbasis SKS Terambil</div>
            </div>
            
            <div className="stat-card">
              <div className="stat-card-icon" style={{ background: '#ecfdf5' }}>
                <BookOpen size={18} color="#10b981" />
              </div>
              <div className="stat-card-label">Total Kredit Diambil</div>
              <div className="stat-card-value">{totalSks} SKS</div>
              <div className="stat-card-sub">Dari {coursesData.length} mata kuliah</div>
            </div>

            <div className="stat-card">
              <div className="stat-card-icon" style={{ background: '#fef3c7' }}>
                <Award size={18} color="#f59e0b" />
              </div>
              <div className="stat-card-label">Capaian CPL Lulusan</div>
              <div className="stat-card-value">
                {cplKeys.length > 0 
                  ? `${(Object.values(cplAverages).reduce((a,b)=>a+b, 0) / cplKeys.length).toFixed(1)}%` 
                  : '0%'}
              </div>
              <div className="stat-card-sub">Rata-rata seluruh CPL</div>
            </div>
          </div>

          {/* Radar Chart & CPL Analysis */}
          <div className="dashboard-grid" style={{ marginBottom: 24 }}>
            
            {/* Custom SVG Radar Chart */}
            <div className="card span-1" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="card-header">
                <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--gray-900)' }}>Grafik Radar Ketercapaian CPL</span>
              </div>
              <div className="card-body" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 330, background: '#fff', position: 'relative' }}>
                
                <svg width="360" height="300" style={{ overflow: 'visible' }}>
                  {/* Outer Grid lines (polygons) */}
                  {[20, 40, 60, 80, 100].map(level => {
                    const polygonPoints = chartCpls.map((_, idx) => {
                      const coords = getCoordinates(idx, level)
                      return `${coords.x},${coords.y}`
                    }).join(' ')
                    
                    return (
                      <g key={level}>
                        <polygon 
                          points={polygonPoints} 
                          fill="none" 
                          stroke="#cbd5e1" 
                          strokeWidth="0.8" 
                          strokeDasharray={level === 100 ? 'none' : '3,3'}
                        />
                        {/* Level indicators */}
                        <text 
                          x={cx} 
                          y={cy - (r * level / 100) + 4} 
                          fill="#94a3b8" 
                          fontSize="9" 
                          textAnchor="middle"
                          fontWeight="600"
                        >
                          {level}%
                        </text>
                      </g>
                    )
                  })}

                  {/* Axis lines & Labels */}
                  {chartCpls.map((cplName, idx) => {
                    const outerCoords = getCoordinates(idx, 100)
                    const labelDistance = r + 18
                    const angle = (idx * 2 * Math.PI) / chartCpls.length - Math.PI / 2
                    const lx = cx + labelDistance * Math.cos(angle)
                    const ly = cy + labelDistance * Math.sin(angle)
                    
                    const textAnchor = Math.cos(angle) > 0.1 ? 'start' : Math.cos(angle) < -0.1 ? 'end' : 'middle'
                    const isHovered = hoveredCpl === cplName
                    
                    return (
                      <g key={cplName}>
                        {/* Axis Line */}
                        <line 
                          x1={cx} y1={cy} 
                          x2={outerCoords.x} y2={outerCoords.y} 
                          stroke="#cbd5e1" 
                          strokeWidth="1" 
                        />
                        {/* Label */}
                        <text 
                          x={lx} y={ly + 3} 
                          fill={isHovered ? '#4f46e5' : 'var(--gray-700)'} 
                          fontSize={isHovered ? '11px' : '10px'} 
                          fontWeight={isHovered ? '800' : '600'} 
                          textAnchor={textAnchor}
                        >
                          {cplName}
                        </text>
                      </g>
                    )
                  })}

                  {/* Student Achievement Polygon */}
                  {cplKeys.length > 0 && (
                    <polygon 
                      points={chartCpls.map((cplName, idx) => {
                        const score = cplAverages[cplName] || 0
                        const coords = getCoordinates(idx, score)
                        return `${coords.x},${coords.y}`
                      }).join(' ')} 
                      fill="rgba(79, 70, 229, 0.15)" 
                      stroke="#4f46e5" 
                      strokeWidth="2.5" 
                    />
                  )}

                  {/* Data Points (circles) */}
                  {chartCpls.map((cplName, idx) => {
                    const score = cplAverages[cplName] || 0
                    const coords = getCoordinates(idx, score)
                    const isHovered = hoveredCpl === cplName

                    return (
                      <g key={cplName}>
                        <circle 
                          cx={coords.x} cy={coords.y} 
                          r={isHovered ? '6' : '4'} 
                          fill="#4f46e5" 
                          stroke="#ffffff" 
                          strokeWidth="1.5" 
                          style={{ cursor: 'pointer', transition: 'r .15s' }}
                          onMouseEnter={() => setHoveredCpl(cplName)}
                          onMouseLeave={() => setHoveredCpl(null)}
                        />
                      </g>
                    )
                  })}
                </svg>

                {/* Score hover card in middle */}
                {hoveredCpl && (
                  <div style={{
                    position: 'absolute',
                    bottom: 12,
                    background: '#1e293b',
                    color: '#fff',
                    padding: '6px 12px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                  }}>
                    {hoveredCpl}: {(cplAverages[hoveredCpl] || 0).toFixed(1)}% Ketercapaian
                  </div>
                )}
              </div>
            </div>

            {/* List CPL Averages Details */}
            <div className="card span-1">
              <div className="card-header">
                <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--gray-900)' }}>Rincian Ketercapaian CPL</span>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {chartCpls.map(cpl => {
                  const score = cplAverages[cpl] || 0
                  const isHovered = hoveredCpl === cpl
                  
                  return (
                    <div 
                      key={cpl} 
                      style={{ 
                        padding: '10px 14px', 
                        borderRadius: 8, 
                        border: isHovered ? '1px solid #c7d2fe' : '1px solid #e2e8f0',
                        background: isHovered ? '#f5f3ff' : '#f8fafc',
                        transition: 'all .15s'
                      }}
                      onMouseEnter={() => setHoveredCpl(cpl)}
                      onMouseLeave={() => setHoveredCpl(null)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontWeight: 700, fontSize: 12.5, color: '#1e293b' }}>{cpl}</span>
                        <span style={{ fontWeight: 800, fontSize: 13, color: '#4f46e5' }}>{score.toFixed(1)}%</span>
                      </div>
                      <div style={{ height: 6, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${score}%`,
                          background: score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444',
                          borderRadius: 99,
                          transition: 'width .3s'
                        }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Enrolled Courses Table */}
          <div className="card">
            <div className="card-header">
              <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--gray-900)' }}>Daftar Nilai & Evaluasi Mata Kuliah</span>
            </div>
            
            <div className="table-wrap">
              <table style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ width: 100 }}>Kode MK</th>
                    <th>Nama Mata Kuliah</th>
                    <th style={{ width: 70, textAlign: 'center' }}>SKS</th>
                    <th style={{ width: 90, textAlign: 'center' }}>Semester</th>
                    <th style={{ width: 110, textAlign: 'center' }}>Nilai Angka</th>
                    <th style={{ width: 90, textAlign: 'center' }}>Nilai Huruf</th>
                    <th style={{ width: 60, textAlign: 'center' }}>Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {coursesData.map(c => {
                    const isExpanded = expandedCourse === c.enrollmentId
                    
                    return (
                      <>
                        <tr key={c.enrollmentId}>
                          <td style={{ fontWeight: 600, color: 'var(--gray-700)' }}>{c.kodeMk}</td>
                          <td style={{ fontWeight: 700, color: '#1e293b' }}>{c.namaMk}</td>
                          <td style={{ textAlign: 'center' }}>{c.sks} SKS</td>
                          <td style={{ textAlign: 'center' }}>Smt {c.semester}</td>
                          <td style={{ textAlign: 'center', fontWeight: 800, color: '#4f46e5' }}>
                            {c.hasApprovedRps ? c.finalGrade.toFixed(1) : '—'}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {c.hasApprovedRps ? (
                              <span className={`badge-pill ${
                                c.gradeLetter === 'A' ? 'badge-green' : 
                                c.gradeLetter.startsWith('B') ? 'badge-indigo' : 
                                c.gradeLetter.startsWith('C') ? 'badge-amber' : 'badge-red'
                              }`} style={{ padding: '2px 8px', fontSize: '11px', fontWeight: 700 }}>
                                {c.gradeLetter}
                              </span>
                            ) : (
                              <span className="badge-pill" style={{ background: '#f1f5f9', color: '#94a3b8' }}>Belum Dinilai</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {c.hasApprovedRps ? (
                              <button 
                                className="btn btn-ghost btn-icon btn-sm"
                                onClick={() => setExpandedCourse(isExpanded ? null : c.enrollmentId)}
                              >
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </button>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>

                        {/* Expandable breakdown details */}
                        {isExpanded && c.hasApprovedRps && (
                          <tr>
                            <td colSpan="7" style={{ background: '#f8fafc', padding: '16px 20px', borderTop: 'none' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 20 }}>
                                
                                {/* Raw grades breakdown */}
                                <div>
                                  <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 8 }}>
                                    Rincian Nilai Asesmen
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {c.assessmentsBreakdown.length === 0 ? (
                                      <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>
                                        Rincian nilai belum diinput oleh Dosen.
                                      </div>
                                    ) : (
                                      c.assessmentsBreakdown.map((item, idx) => (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12 }}>
                                          <div>
                                            <span style={{ fontWeight: 600, color: '#334155' }}>{item.nama}</span>
                                            <span style={{ marginLeft: 6, color: '#94a3b8', fontSize: 10 }}>({item.tipe} - {item.bobot}%)</span>
                                          </div>
                                          <div style={{ fontWeight: 700, color: item.nilai !== null ? '#1e293b' : '#94a3b8' }}>
                                            {item.nilai !== null ? item.nilai.toFixed(1) : 'Belum diinput'}
                                          </div>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </div>

                                {/* CPMK achievements */}
                                <div>
                                  <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 8 }}>
                                    Ketercapaian CPMK Mata Kuliah
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {c.cpmkAchievements.map(cpmk => (
                                      <div key={cpmk.kode} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 4 }}>
                                          <span style={{ fontWeight: 700, color: '#4f46e5' }}>{cpmk.kode}</span>
                                          <span style={{ fontWeight: 700, color: cpmk.achievement >= 75 ? '#10b981' : '#f59e0b' }}>
                                            {cpmk.achievement.toFixed(1)}%
                                          </span>
                                        </div>
                                        <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 6px', lineHeight: 1.4 }}>{cpmk.deskripsi}</p>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                          {cpmk.cplRef.map(ref => (
                                            <span key={ref} style={{ background: '#f5f3ff', color: '#4f46e5', border: '1px solid #c7d2fe', fontSize: 9, padding: '1px 6px', borderRadius: 99, fontWeight: 700 }}>
                                              Terhubung {ref}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
