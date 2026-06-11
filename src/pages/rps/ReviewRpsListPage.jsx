import { useState, useEffect, useCallback } from 'react'
import {
  FileText, CheckCircle, Clock, Eye, ClipboardCheck, Calendar, Search,
  Sparkles, RefreshCw, Printer, X, CheckSquare, Square, AlertTriangle, XCircle
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { dbRPS, currentTahunAkademik, TAHUN_AKADEMIK_LIST, SEMESTER_LIST } from '@/lib/db'
import { supabase } from '@/lib/supabase'
import { generateCompilationReport } from '@/lib/ai'
import AiProgressModal from '@/components/ui/AiProgressModal'
import toast from 'react-hot-toast'

const ASPECT_LABELS = {
  a_cpmk_subcpmk: 'Kesesuaian CPMK/Sub-CPMK dengan CPL',
  b1_identitas_mk: 'Identitas Mata Kuliah',
  b2_penanggung_jawab: 'Penanggung Jawab & Dosen',
  b3_cpl_cpmk: 'CPL-PRODI & CP-MK',
  b4_deskripsi_mk: 'Deskripsi Singkat MK',
  b5_bahan_kajian: 'Bahan Kajian / Materi',
  b6_referensi: 'Daftar Referensi',
  b7_media_pembelajaran: 'Media Pembelajaran',
  b8_prasyarat: 'Pra-Syarat MK',
  b9_komposisi: 'Komposisi Teori & Praktek',
  c1_minggu_ke: 'Minggu Ke (16 Minggu)',
  c2_kemampuan_akhir: 'Kemampuan Akhir per Pertemuan',
  c3_bahan_kajian_rps: 'Bahan Kajian per Pertemuan',
  c4_metode_pembelajaran: 'Metode Pembelajaran per Pertemuan',
  c5_waktu: 'Alokasi Waktu per Pertemuan',
  c6_pengalaman_belajar: 'Pengalaman Belajar Mahasiswa',
  c7_kriteria_penilaian: 'Kriteria Penilaian & Indikator',
  c8_bobot_nilai: 'Bobot Nilai Evaluasi',
  c9_referensi_rps: 'Referensi per Pertemuan'
}

const cleanMarkdown = (text) => {
  if (!text) return '';
  
  let cleaned = text.trim();
  
  // Strip code block markers if present
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[a-zA-Z0-9]*\s*\n?/, '');
    cleaned = cleaned.replace(/\n?\s*```$/, '');
  }
  
  // Clean any starting "markdown" text (case-insensitive)
  if (cleaned.toLowerCase().startsWith('markdown\n')) {
    cleaned = cleaned.substring(9);
  } else if (cleaned.toLowerCase().startsWith('markdown\r\n')) {
    cleaned = cleaned.substring(10);
  } else if (cleaned.toLowerCase().startsWith('markdown ')) {
    cleaned = cleaned.substring(9);
  } else if (cleaned.toLowerCase() === 'markdown') {
    cleaned = '';
  }
  
  return cleaned.trim()
    .split('\n')
    .map(line => {
      let l = line.trim();
      
      // 1. Remove leading headers '#'
      if (l.startsWith('#')) {
        l = l.replace(/^#+\s*/, '');
      }
      
      // 2. Convert bullet points starting with '*' to a clean '-' bullet
      // Only if it's not starting with '**' (bold)
      if (l.startsWith('* ') && !l.startsWith('**')) {
        l = '- ' + l.substring(2);
      }
      
      // 3. Remove all bold/italic markers '**' and '*'
      l = l.replace(/\*\*|\*/g, '');
      
      // Preserve original leading whitespace/indentation if any
      const indent = line.match(/^\s*/)[0];
      return indent + l;
    })
    .join('\n');
};

export default function ReviewRpsListPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const cur = currentTahunAkademik()

  const [rpsList, setRpsList] = useState([])
  const [reviewMap, setReviewMap] = useState({}) // rps_id -> latest review
  const [loading, setLoading] = useState(true)
  const [tahun, setTahun] = useState(cur.tahun)
  const [semester, setSemester] = useState(cur.semester)
  const [filter, setFilter] = useState('all') // 'all' | 'reviewed' | 'pending'
  const [search, setSearch] = useState('')

  // New compilation states
  const [selectedIds, setSelectedIds] = useState([])
  const [showCompileModal, setShowCompileModal] = useState(false)
  const [compilationNotes, setCompilationNotes] = useState('')
  const [compilationAiLoading, setCompilationAiLoading] = useState(false)
  const [progressText, setProgressText] = useState('')
  const [prodi, setProdi] = useState(null)

  const prodiId = profile?.prodi_id

  const load = useCallback(async () => {
    if (!prodiId) return
    setLoading(true)
    setSelectedIds([]) // Reset selection on reload
    try {
      // 0. Ambil detail Program Studi
      const { data: prodiData, error: prodiErr } = await supabase
        .from('program_studi')
        .select('*')
        .eq('id', prodiId)
        .single()
      if (!prodiErr && prodiData) {
        setProdi(prodiData)
      }

      // 1. Ambil semua RPS approved di prodi
      const { data: rpsData, error: rpsErr } = await dbRPS.getByProdi(prodiId)
      if (rpsErr) throw rpsErr

      const approved = (rpsData ?? []).filter(r =>
        r.status === 'approved' &&
        r.tahun_akademik === tahun &&
        r.semester_aktif === semester
      )
      setRpsList(approved)

      // 2. Ambil review terbaru per RPS
      if (approved.length > 0) {
        const rpsIds = approved.map(r => r.id)
        const { data: reviews, error: revErr } = await supabase
          .from('rps_reviews')
          .select('id, rps_id, created_at, updated_at, reviewer_id, a_cpmk_subcpmk, b1_identitas_mk, b2_penanggung_jawab, b3_cpl_cpmk, b4_deskripsi_mk, b5_bahan_kajian, b6_referensi, b7_media_pembelajaran, b8_prasyarat, b9_komposisi, c1_minggu_ke, c2_kemampuan_akhir, c3_bahan_kajian_rps, c4_metode_pembelajaran, c5_waktu, c6_pengalaman_belajar, c7_kriteria_penilaian, c8_bobot_nilai, c9_referensi_rps, rekomendasi')
          .in('rps_id', rpsIds)
          .order('created_at', { ascending: false })

        if (revErr) console.error('Error loading reviews:', revErr)
        
        // Map: ambil review terbaru per rps_id
        const map = {}
        ;(reviews ?? []).forEach(rev => {
          if (!map[rev.rps_id]) map[rev.rps_id] = rev
        })
        setReviewMap(map)
      } else {
        setReviewMap({})
      }
    } catch (err) {
      console.error(err)
      toast.error('Gagal memuat daftar RPS: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [prodiId, tahun, semester])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (showCompileModal) {
      document.body.classList.add('compilation-modal-open')
    } else {
      document.body.classList.remove('compilation-modal-open')
    }
    return () => {
      document.body.classList.remove('compilation-modal-open')
    }
  }, [showCompileModal])

  const handleSelectRps = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleSelectAll = (reviewedDisplayed) => {
    const displayedIds = reviewedDisplayed.map(r => r.id)
    const allSelected = displayedIds.length > 0 && displayedIds.every(id => selectedIds.includes(id))

    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !displayedIds.includes(id)))
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...displayedIds])))
    }
  }

  const calculateCompilationStats = () => {
    const stats = {};
    const ALL_KEYS = [
      'a_cpmk_subcpmk',
      'b1_identitas_mk','b2_penanggung_jawab','b3_cpl_cpmk','b4_deskripsi_mk',
      'b5_bahan_kajian','b6_referensi','b7_media_pembelajaran','b8_prasyarat','b9_komposisi',
      'c1_minggu_ke','c2_kemampuan_akhir','c3_bahan_kajian_rps','c4_metode_pembelajaran',
      'c5_waktu','c6_pengalaman_belajar','c7_kriteria_penilaian','c8_bobot_nilai','c9_referensi_rps'
    ];
    
    const count = selectedIds.length;
    if (count === 0) return { stats: {}, overall: { sesuai: 0, cukup: 0, tidak: 0 } };

    let totalSesuai = 0;
    let totalCukup = 0;
    let totalTidak = 0;
    const totalFields = count * ALL_KEYS.length;

    ALL_KEYS.forEach(key => {
      let sesuai = 0;
      let cukup = 0;
      let tidak = 0;

      selectedIds.forEach(id => {
        const rev = reviewMap[id];
        if (rev) {
          const val = rev[key];
          if (val === 'sesuai') { sesuai++; totalSesuai++; }
          else if (val === 'cukup') { cukup++; totalCukup++; }
          else if (val === 'tidak_sesuai') { tidak++; totalTidak++; }
        }
      });

      stats[key] = {
        sesuai,
        cukup,
        tidak,
        sesuai_pct: Math.round((sesuai / count) * 100),
        cukup_pct: Math.round((cukup / count) * 100),
        tidak_sesuai_pct: Math.round((tidak / count) * 100),
      };
    });

    const overall = {
      sesuai: Math.round((totalSesuai / totalFields) * 100),
      cukup: Math.round((totalCukup / totalFields) * 100),
      tidak: Math.round((totalTidak / totalFields) * 100),
    };

    return { stats, overall };
  };

  const runCompilationAiAnalysis = async () => {
    if (selectedIds.length === 0) return;
    setCompilationAiLoading(true);
    setProgressText("Menghubungi Gateway API Server...");

    let subTimer = null
    const steps = [
      "Membaca Catatan & Hasil Ulasan Asesor...",
      "Menghitung Persentase Kepatuhan Tiap Aspek...",
      "Menganalisis Kekuatan & Kepatuhan Kurikulum (Strengths)...",
      "Mengidentifikasi Akar Masalah & Area Revisi (Weaknesses)...",
      "Merumuskan Rencana Tindak Lanjut & Rekomendasi...",
      "Menyusun Laporan Naratif Kompilasi..."
    ]
    let currentStep = 0

    const handleProgress = (event) => {
      if (typeof event === 'string') {
        if (event === "AI sedang memikirkan materi & merumuskan konten (proses ini memakan waktu)...") {
          setProgressText(steps[0])
          subTimer = setInterval(() => {
            currentStep++
            if (currentStep < steps.length) {
              setProgressText(steps[currentStep])
            } else {
              setProgressText("AI sedang menyusun laporan naratif... Mohon tunggu sebentar lagi...")
            }
          }, 2500)
        } else {
          if (subTimer) clearInterval(subTimer)
          setProgressText(event)
        }
      } else if (event && event.type === 'chunk') {
        if (subTimer) clearInterval(subTimer)
        const charCount = event.text.length
        setProgressText(`AI sedang menyusun: Menulis draft laporan... (${charCount.toLocaleString('id-ID')} karakter)`)
      }
    }

    try {
      const prodiName = prodi?.nama || 'Program Studi';
      const selectedRps = rpsList.filter(r => selectedIds.includes(r.id));
      
      const coursesData = selectedRps.map(r => {
        const rev = reviewMap[r.id];
        const ALL_KEYS = [
          'a_cpmk_subcpmk',
          'b1_identitas_mk','b2_penanggung_jawab','b3_cpl_cpmk','b4_deskripsi_mk',
          'b5_bahan_kajian','b6_referensi','b7_media_pembelajaran','b8_prasyarat','b9_komposisi',
          'c1_minggu_ke','c2_kemampuan_akhir','c3_bahan_kajian_rps','c4_metode_pembelajaran',
          'c5_waktu','c6_pengalaman_belajar','c7_kriteria_penilaian','c8_bobot_nilai','c9_referensi_rps'
        ];
        return {
          nama_mk: r.mk?.nama_mk,
          kode_mk: r.mk?.kode_mk,
          dosen_nama: r.dosen?.nama_lengkap,
          rekomendasi: rev?.rekomendasi,
          sesuai: ALL_KEYS.filter(k => rev?.[k] === 'sesuai').length,
          cukup: ALL_KEYS.filter(k => rev?.[k] === 'cukup').length,
          tidak: ALL_KEYS.filter(k => rev?.[k] === 'tidak_sesuai').length
        };
      });

      const { stats } = calculateCompilationStats();
      const report = await generateCompilationReport(prodiName, coursesData, stats, handleProgress);
      
      if (report) {
        setCompilationNotes(cleanMarkdown(report));
        toast.success('Laporan Analisa Deskriptif berhasil disusun oleh AI! 📑');
      } else {
        throw new Error('Hasil laporan AI kosong.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Gagal menyusun laporan AI: ' + err.message);
    } finally {
      if (subTimer) clearInterval(subTimer)
      setCompilationAiLoading(false);
    }
  };

  const renderFormattedNotes = (text) => {
    if (!text) return null;
    
    let cleanedText = text.trim();
    
    // Strip code block markers if present
    if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```[a-zA-Z0-9]*\s*\n?/, '');
      cleanedText = cleanedText.replace(/\n?\s*```$/, '');
    }
    
    // Clean any starting "markdown" text (case-insensitive)
    if (cleanedText.toLowerCase().startsWith('markdown\n')) {
      cleanedText = cleanedText.substring(9);
    } else if (cleanedText.toLowerCase().startsWith('markdown\r\n')) {
      cleanedText = cleanedText.substring(10);
    } else if (cleanedText.toLowerCase().startsWith('markdown ')) {
      cleanedText = cleanedText.substring(9);
    } else if (cleanedText.toLowerCase() === 'markdown') {
      cleanedText = '';
    }
    
    const lines = cleanedText.split('\n');
    const renderedElements = [];
    
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();
      
      // Check for markdown table (flexible style, with or without leading/trailing pipes)
      if (
        trimmed.includes('|') &&
        i + 1 < lines.length &&
        lines[i + 1].trim().includes('|') &&
        (lines[i + 1].includes(':-') || lines[i + 1].includes('-:') || lines[i + 1].includes('|-') || lines[i + 1].includes('---'))
      ) {
        // Collect table rows
        const tableLines = [];
        while (i < lines.length && lines[i].includes('|')) {
          tableLines.push(lines[i].trim());
          i++;
        }
        
        // Parse row function
        const parseRow = (rowText) => {
          let row = rowText.trim();
          if (row.startsWith('|')) {
            row = row.substring(1);
          }
          if (row.endsWith('|')) {
            row = row.slice(0, -1);
          }
          return row.split('|').map(p => p.trim());
        };
        
        if (tableLines.length >= 2) {
          const headers = parseRow(tableLines[0]);
          const dataRows = [];
          
          // Row 1 is delimiter/separator row (tableLines[1]), skip it
          for (let r = 2; r < tableLines.length; r++) {
            dataRows.push(parseRow(tableLines[r]));
          }
          
          renderedElements.push(
            <div key={`table-${i}`} style={{ overflowX: 'auto', margin: '14px 0' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left', border: '1px solid #cbd5e1' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                    {headers.map((h, hIdx) => (
                      <th key={hIdx} style={{ padding: '8px 10px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>
                        {h.replace(/\*\*|\*/g, '')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dataRows.map((row, rIdx) => (
                    <tr key={rIdx} style={{ borderBottom: '1px solid #e2e8f0', background: rIdx % 2 === 1 ? '#f8fafc' : '#ffffff' }}>
                      {headers.map((_, cIdx) => {
                        const cellText = row[cIdx] || '';
                        return (
                          <td key={cIdx} style={{ padding: '8px 10px', border: '1px solid #cbd5e1', lineHeight: '1.4' }}>
                            {cellText.replace(/\*\*|\*/g, '')}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
          
          continue;
        }
      }
      
      // Horizontal rule
      if (trimmed === '---') {
        renderedElements.push(<hr key={i} style={{ border: 'none', borderTop: '1px solid #cbd5e1', margin: '12px 0' }} />);
        i++;
        continue;
      }
      
      // List items starting with '-' or '•'
      const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('• ');
      if (isBullet) {
        const cleanText = trimmed.replace(/^[-•\s]+/, '').replace(/\*\*|\*/g, '');
        renderedElements.push(
          <div key={i} style={{ display: 'flex', gap: 8, paddingLeft: 12, marginBottom: 4 }}>
            <span style={{ color: '#4f46e5' }}>•</span>
            <span style={{ flex: 1, fontSize: '12px', lineHeight: '1.6' }}>{cleanText}</span>
          </div>
        );
        i++;
        continue;
      }
      
      // Main headers
      const isMainHeader = /^[0-9]+\.\s+[A-Z\s&()\-]+$/.test(trimmed) || /^[IVXLCDM]+\.\s+[A-Z\s&()\-]+$/.test(trimmed);
      if (isMainHeader) {
        renderedElements.push(
          <h3 key={i} style={{ fontSize: '13px', fontWeight: 800, margin: '20px 0 8px 0', color: '#1e293b', textTransform: 'uppercase' }}>
            {trimmed}
          </h3>
        );
        i++;
        continue;
      }
      
      // Subheaders
      const isSubHeader = /^[0-9]+\.[0-9]+\.\s+/.test(trimmed);
      if (isSubHeader) {
        renderedElements.push(
          <h4 key={i} style={{ fontSize: '12px', fontWeight: 700, margin: '14px 0 6px 0', color: '#334155' }}>
            {trimmed}
          </h4>
        );
        i++;
        continue;
      }

      // Fallback clean of any markdown characters
      const cleaned = trimmed.replace(/#+\s/g, '').replace(/\*\*|\*/g, '');
      
      renderedElements.push(
        <p key={i} style={{ margin: '0 0 8px 0', minHeight: cleaned ? 'auto' : '8px', fontSize: '12px', lineHeight: '1.6' }}>
          {cleaned}
        </p>
      );
      i++;
    }
    
    return renderedElements;
  };

  // Count filled aspects in a review
  function countFilledAspects(review) {
    if (!review) return 0
    const fields = [
      'a_cpmk_subcpmk',
      'b1_identitas_mk','b2_penanggung_jawab','b3_cpl_cpmk','b4_deskripsi_mk',
      'b5_bahan_kajian','b6_referensi','b7_media_pembelajaran','b8_prasyarat','b9_komposisi',
      'c1_minggu_ke','c2_kemampuan_akhir','c3_bahan_kajian_rps','c4_metode_pembelajaran',
      'c5_waktu','c6_pengalaman_belajar','c7_kriteria_penilaian','c8_bobot_nilai','c9_referensi_rps'
    ]
    return fields.filter(f => review[f]).length
  }

  function countByStatus(review, status) {
    if (!review) return 0
    const fields = [
      'a_cpmk_subcpmk',
      'b1_identitas_mk','b2_penanggung_jawab','b3_cpl_cpmk','b4_deskripsi_mk',
      'b5_bahan_kajian','b6_referensi','b7_media_pembelajaran','b8_prasyarat','b9_komposisi',
      'c1_minggu_ke','c2_kemampuan_akhir','c3_bahan_kajian_rps','c4_metode_pembelajaran',
      'c5_waktu','c6_pengalaman_belajar','c7_kriteria_penilaian','c8_bobot_nilai','c9_referensi_rps'
    ]
    return fields.filter(f => review[f] === status).length
  }

  // Filter & search
  const displayed = rpsList.filter(rps => {
    if (filter === 'reviewed' && !reviewMap[rps.id]) return false
    if (filter === 'pending' && reviewMap[rps.id]) return false
    if (search) {
      const q = search.toLowerCase()
      const match = (rps.mk?.kode_mk?.toLowerCase().includes(q)) ||
                    (rps.mk?.nama_mk?.toLowerCase().includes(q)) ||
                    (rps.dosen?.nama_lengkap?.toLowerCase().includes(q))
      if (!match) return false
    }
    return true
  })

  const totalReviewed = rpsList.filter(r => reviewMap[r.id]).length
  const totalPending = rpsList.length - totalReviewed

  if (!prodiId) return (
    <div className="page-header">
      <h1 className="page-title">Review RPS</h1>
      <p style={{ color: '#ef4444', fontSize: 13 }}>⚠️ Akun Anda belum ditetapkan ke Program Studi. Hubungi Admin.</p>
    </div>
  )

  return (
    <div>
      <div className="no-print">
        <div className="page-header">
        <h1 className="page-title">Review RPS</h1>
        <p className="page-subtitle">Review kelengkapan dan kesesuaian RPS yang sudah disetujui, sesuai standar Blanko Review STIKOM</p>
      </div>

      {/* Stats strip */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div className="card" style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 160px' }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={18} color="#4f46e5" />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.3px' }}>Total Approved</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#1e293b' }}>{rpsList.length}</div>
          </div>
        </div>
        <div className="card" style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 160px' }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle size={18} color="#10b981" />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.3px' }}>Sudah Direview</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#10b981' }}>{totalReviewed}</div>
          </div>
        </div>
        <div className="card" style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 160px' }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={18} color="#f59e0b" />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.3px' }}>Belum Direview</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#f59e0b' }}>{totalPending}</div>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="card" style={{ padding: '14px 16px', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="input-group" style={{ margin: 0 }}>
            <label className="input-label">Tahun Akademik</label>
            <select className="input" value={tahun} onChange={e => setTahun(e.target.value)} style={{ minWidth: 140 }}>
              {TAHUN_AKADEMIK_LIST.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="input-group" style={{ margin: 0 }}>
            <label className="input-label">Semester</label>
            <select className="input" value={semester} onChange={e => setSemester(e.target.value)}>
              {SEMESTER_LIST.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="input-group" style={{ margin: 0, flex: '1 1 180px' }}>
            <label className="input-label">Cari MK / Dosen</label>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                className="input"
                placeholder="Cari kode MK, nama MK, atau dosen..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: 32 }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, marginLeft: 'auto', alignItems: 'center' }}>
            {filter === 'reviewed' && displayed.some(r => reviewMap[r.id]) && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => handleSelectAll(displayed.filter(r => reviewMap[r.id]))}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px' }}
              >
                <CheckSquare size={13} /> Select/Unselect All
              </button>
            )}
            {[
              { key: 'all', label: 'Semua' },
              { key: 'pending', label: 'Belum Review' },
              { key: 'reviewed', label: 'Sudah Review' },
            ].map(f => (
              <button key={f.key}
                className={`btn btn-sm ${filter === f.key ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          Memuat daftar RPS untuk review…
        </div>
      ) : displayed.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-text">
              {rpsList.length === 0
                ? 'Belum ada RPS approved pada semester ini'
                : filter === 'pending' ? 'Semua RPS sudah direview!' : 'Tidak ada RPS yang cocok dengan filter'}
            </div>
            <div className="empty-state-sub">RPS harus berstatus "Disetujui" sebelum dapat direview.</div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {displayed.map(rps => {
            const review = reviewMap[rps.id]
            const filled = countFilledAspects(review)
            const sesuai = countByStatus(review, 'sesuai')
            const cukup = countByStatus(review, 'cukup')
            const tidakSesuai = countByStatus(review, 'tidak_sesuai')
            const isReviewed = !!review

            return (
              <div key={rps.id} className="card" style={{
                padding: '16px 20px',
                display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
                borderLeft: `3px solid ${isReviewed ? '#10b981' : '#f59e0b'}`,
                transition: 'box-shadow .15s',
              }}>
                {/* Checkbox for Reviewed items */}
                {isReviewed ? (
                  <button
                    onClick={() => handleSelectRps(rps.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 4,
                      cursor: 'pointer',
                      color: selectedIds.includes(rps.id) ? '#4f46e5' : '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 4
                    }}
                  >
                    {selectedIds.includes(rps.id) ? <CheckSquare size={20} /> : <Square size={20} />}
                  </button>
                ) : (
                  <div style={{ width: 28, height: 28 }} className="no-print" /> // Spacer for alignment
                )}

                {/* MK Info */}
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span className="badge-pill badge-slate" style={{ fontFamily: 'monospace', fontSize: 11 }}>
                      {rps.mk?.kode_mk}
                    </span>
                    {isReviewed ? (
                      <span className="badge-pill badge-green" style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <CheckCircle size={10} /> Sudah Direview
                      </span>
                    ) : (
                      <span className="badge-pill badge-amber" style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Clock size={10} /> Belum Direview
                      </span>
                    )}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{rps.mk?.nama_mk}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span>{rps.mk?.sks} SKS</span>
                    <span>•</span>
                    <span>Sem {rps.mk?.semester}</span>
                    <span>•</span>
                    <span style={{ fontWeight: 500, color: '#4f46e5' }}>Dosen: {rps.dosen?.nama_lengkap || '—'}</span>
                  </div>
                </div>

                {/* Review stats mini */}
                {isReviewed && (
                  <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#64748b' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#10b981' }}>{sesuai}</div>
                      <div>Sesuai</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#f59e0b' }}>{cukup}</div>
                      <div>Cukup</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#ef4444' }}>{tidakSesuai}</div>
                      <div>Tidak</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#6366f1' }}>{filled}/19</div>
                      <div>Terisi</div>
                    </div>
                  </div>
                )}

                {/* Meta */}
                <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'right', minWidth: 100 }}>
                  <div>{rps.tahun_akademik}</div>
                  <div>{rps.semester_aktif}</div>
                  {isReviewed && (
                    <div style={{ marginTop: 4, fontSize: 10, color: '#64748b' }}>
                      Review: {new Date(review.updated_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6 }} className="no-print">
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => navigate(`/rps/${rps.id}/review`)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      background: isReviewed ? '#4f46e5' : '#10b981',
                      borderColor: isReviewed ? '#4338ca' : '#059669',
                    }}
                  >
                    {isReviewed ? <Eye size={13} /> : <ClipboardCheck size={13} />}
                    {isReviewed ? 'Lihat / Edit' : 'Mulai Review'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
      </div>

      {/* Floating Action Bar */}
      {selectedIds.length > 0 && (
        <div className="no-print" style={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, #4f46e5 0%, #312e81 100%)',
          color: '#fff',
          padding: '12px 24px',
          borderRadius: 12,
          boxShadow: '0 10px 25px rgba(79, 70, 229, 0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          zIndex: 100,
          animation: 'slideUp .25s ease-out',
        }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>
            {selectedIds.length} Mata Kuliah Terpilih untuk Kompilasi
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-sm"
              onClick={() => setSelectedIds([])}
              style={{ background: 'rgba(255, 255, 255, 0.15)', borderColor: 'transparent', color: '#fff' }}
            >
              Batal
            </button>
            <button
              className="btn btn-sm"
              onClick={() => {
                setCompilationNotes('');
                setShowCompileModal(true);
              }}
              style={{ background: '#10b981', borderColor: 'transparent', color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <ClipboardCheck size={13} /> Buka Laporan Kompilasi
            </button>
          </div>
        </div>
      )}

      {/* Compilation Modal Overlay */}
      {showCompileModal && (() => {
        const { stats, overall } = calculateCompilationStats();
        const selectedRps = rpsList.filter(r => selectedIds.includes(r.id));
        const prodiName = prodi?.nama || 'Program Studi';

        return (
          <div className="compilation-modal-overlay" style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 110,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            animation: 'fadeIn .2s ease-out'
          }}>
            {/* Styles for printing inside this modal */}
            <style dangerouslySetInnerHTML={{__html: `
              @media print {
                /* Force AppLayout shell and wrappers to display statically in print */
                body.compilation-modal-open,
                body.compilation-modal-open #root,
                body.compilation-modal-open #app,
                body.compilation-modal-open .app-shell,
                body.compilation-modal-open .app-main,
                body.compilation-modal-open .app-content {
                  height: auto !important;
                  min-height: 0 !important;
                  overflow: visible !important;
                  display: block !important;
                  position: static !important;
                  background: white !important;
                  padding: 0 !important;
                  margin: 0 !important;
                }
                
                /* Hide sidebar, header, and general navigation elements */
                body.compilation-modal-open .app-sidebar,
                body.compilation-modal-open .app-header,
                body.compilation-modal-open .no-print {
                  display: none !important;
                }

                /* Override compilation overlay styles so it prints statically */
                body.compilation-modal-open .compilation-modal-overlay {
                  position: static !important;
                  background: white !important;
                  padding: 0 !important;
                  display: block !important;
                  height: auto !important;
                  overflow: visible !important;
                  backdrop-filter: none !important;
                }

                body.compilation-modal-open .compilation-modal-card {
                  position: static !important;
                  border: none !important;
                  box-shadow: none !important;
                  width: 100% !important;
                  max-width: 100% !important;
                  height: auto !important;
                  display: block !important;
                  overflow: visible !important;
                  background: white !important;
                }

                body.compilation-modal-open #compilation-print-area {
                  position: static !important;
                  display: block !important;
                  width: 100% !important;
                  height: auto !important;
                  padding: 0 !important;
                  margin: 0 !important;
                  overflow: visible !important;
                  background: white !important;
                }

                body.compilation-modal-open {
                  background: #ffffff !important;
                  color: #000000 !important;
                }

                @page {
                  size: A4;
                  margin: 15mm;
                }
              }
            `}} />

            <div className="card compilation-modal-card" style={{
              width: '100%',
              maxWidth: 1000,
              height: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
              background: '#fff'
            }}>
              {/* Modal Header */}
              <div className="no-print" style={{
                padding: '16px 24px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#f8fafc'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <ClipboardCheck size={20} color="#4f46e5" />
                  <div>
                    <h3 style={{ fontWeight: 800, fontSize: 15, margin: 0, color: '#1e293b' }}>
                      Laporan Kompilasi Review RPS
                    </h3>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      Kompilasi ulasan dari {selectedIds.length} Mata Kuliah Terpilih
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => window.print()}
                    style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <Printer size={13} /> Cetak Laporan
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setShowCompileModal(false)}
                    style={{ padding: 6 }}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Modal Body / Print Container */}
              <div id="compilation-print-area" style={{
                flex: 1,
                overflowY: 'auto',
                padding: 32,
                background: '#fff',
              }}>
                
                {/* KOP SURAT (Hanya muncul saat print atau cetak laporan formal) */}
                <div style={{
                  textAlign: 'center',
                  borderBottom: '2px solid #000',
                  paddingBottom: 12,
                  marginBottom: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 16
                }}>
                  <img src="/logo-sys.png" alt="Logo STIKOM" style={{ height: 60, width: 'auto', display: 'block' }} onError={e => e.currentTarget.style.display = 'none'} />
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Sekolah Tinggi Ilmu Komputer Yos Sudarso
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginTop: 2 }}>
                      PROGRAM STUDI {prodiName}
                    </div>
                    <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                      Jl. Kecamatan No. 25, Karangpucung, Purwokerto Selatan, Kab. Banyumas, Jawa Tengah
                    </div>
                  </div>
                </div>

                {/* JUDUL LAPORAN */}
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 800, textTransform: 'uppercase', margin: '0 0 4px 0' }}>
                    Laporan Evaluasi & Kompilasi Review RPS
                  </h2>
                  <div style={{ fontSize: 12, color: '#475569' }}>
                    Tahun Akademik: <strong>{tahun}</strong> | Semester: <strong>{semester}</strong>
                  </div>
                </div>

                {/* RINGKASAN MATA KULIAH TERKOMPILASI */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.3px', borderBottom: '1px solid #cbd5e1', paddingBottom: 4 }}>
                    I. Daftar Mata Kuliah Terkompilasi ({selectedRps.length} MK)
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                        <th style={{ padding: '8px 10px', width: 40 }}>No</th>
                        <th style={{ padding: '8px 10px', width: 100 }}>Kode MK</th>
                        <th style={{ padding: '8px 10px' }}>Nama Mata Kuliah</th>
                        <th style={{ padding: '8px 10px', width: 80 }}>SKS / Sem</th>
                        <th style={{ padding: '8px 10px' }}>Dosen Pengampu</th>
                        <th style={{ padding: '8px 10px', width: 140, textAlign: 'center' }}>Statistik Review</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRps.map((r, i) => {
                        const rev = reviewMap[r.id];
                        const countSesuai = countByStatus(rev, 'sesuai');
                        const countCukup = countByStatus(rev, 'cukup');
                        const countTidak = countByStatus(rev, 'tidak_sesuai');
                        return (
                          <tr key={r.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '8px 10px' }}>{i + 1}</td>
                            <td style={{ padding: '8px 10px', fontFamily: 'monospace' }}>{r.mk?.kode_mk}</td>
                            <td style={{ padding: '8px 10px', fontWeight: 600 }}>{r.mk?.nama_mk}</td>
                            <td style={{ padding: '8px 10px' }}>{r.mk?.sks} SKS / S{r.mk?.semester}</td>
                            <td style={{ padding: '8px 10px' }}>{r.dosen?.nama_lengkap}</td>
                            <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                              <span style={{ color: '#10b981', fontWeight: 700 }}>S:{countSesuai}</span> |&nbsp;
                              <span style={{ color: '#f59e0b', fontWeight: 700 }}>C:{countCukup}</span> |&nbsp;
                              <span style={{ color: '#ef4444', fontWeight: 700 }}>T:{countTidak}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* II. MATRIKS HASIL EVALUASI PER ASPEK */}
                <div style={{ marginBottom: 24, pageBreakInside: 'avoid' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.3px', borderBottom: '1px solid #cbd5e1', paddingBottom: 4 }}>
                    II. Matriks Hasil Evaluasi Kelengkapan RPS per Aspek
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', textAlign: 'center', tableLayout: 'fixed' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                          <th style={{ padding: '6px 4px', width: '30px', textAlign: 'left' }}>No</th>
                          <th style={{ padding: '6px 4px', width: '140px', textAlign: 'left' }}>Mata Kuliah</th>
                          <th style={{ padding: '6px 2px', width: '22px', fontWeight: 'bold', color: '#4f46e5' }} title="Kesesuaian CPMK/Sub-CPMK dengan CPL">A</th>
                          <th style={{ padding: '6px 2px', width: '22px' }} title="Identitas Mata Kuliah">B1</th>
                          <th style={{ padding: '6px 2px', width: '22px' }} title="Penanggung Jawab & Dosen">B2</th>
                          <th style={{ padding: '6px 2px', width: '22px' }} title="CPL-PRODI & CP-MK">B3</th>
                          <th style={{ padding: '6px 2px', width: '22px' }} title="Deskripsi Singkat MK">B4</th>
                          <th style={{ padding: '6px 2px', width: '22px' }} title="Bahan Kajian / Materi">B5</th>
                          <th style={{ padding: '6px 2px', width: '22px' }} title="Daftar Referensi">B6</th>
                          <th style={{ padding: '6px 2px', width: '22px' }} title="Media Pembelajaran">B7</th>
                          <th style={{ padding: '6px 2px', width: '22px' }} title="Pra-Syarat MK">B8</th>
                          <th style={{ padding: '6px 2px', width: '22px' }} title="Komposisi Teori & Praktek">B9</th>
                          <th style={{ padding: '6px 2px', width: '22px' }} title="Minggu Ke (16 Minggu)">C1</th>
                          <th style={{ padding: '6px 2px', width: '22px' }} title="Kemampuan Akhir per Pertemuan">C2</th>
                          <th style={{ padding: '6px 2px', width: '22px' }} title="Bahan Kajian per Pertemuan">C3</th>
                          <th style={{ padding: '6px 2px', width: '22px' }} title="Metode Pembelajaran per Pertemuan">C4</th>
                          <th style={{ padding: '6px 2px', width: '22px' }} title="Alokasi Waktu per Pertemuan">C5</th>
                          <th style={{ padding: '6px 2px', width: '22px' }} title="Pengalaman Belajar Mahasiswa">C6</th>
                          <th style={{ padding: '6px 2px', width: '22px' }} title="Kriteria Penilaian & Indikator">C7</th>
                          <th style={{ padding: '6px 2px', width: '22px' }} title="Bobot Nilai Evaluasi">C8</th>
                          <th style={{ padding: '6px 2px', width: '22px' }} title="Referensi per Pertemuan">C9</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedRps.map((r, i) => {
                          const rev = reviewMap[r.id] || {};
                          const keys = [
                            'a_cpmk_subcpmk',
                            'b1_identitas_mk', 'b2_penanggung_jawab', 'b3_cpl_cpmk', 'b4_deskripsi_mk',
                            'b5_bahan_kajian', 'b6_referensi', 'b7_media_pembelajaran', 'b8_prasyarat', 'b9_komposisi',
                            'c1_minggu_ke', 'c2_kemampuan_akhir', 'c3_bahan_kajian_rps', 'c4_metode_pembelajaran',
                            'c5_waktu', 'c6_pengalaman_belajar', 'c7_kriteria_penilaian', 'c8_bobot_nilai', 'c9_referensi_rps'
                          ];

                          return (
                            <tr key={r.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <td style={{ padding: '6px 4px', textAlign: 'left' }}>{i + 1}</td>
                              <td style={{ padding: '6px 4px', textAlign: 'left', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.mk?.nama_mk}>
                                {r.mk?.nama_mk}
                              </td>
                              {keys.map((k) => {
                                const val = rev[k];
                                let color = '#64748b';
                                let bg = '#f1f5f9';
                                let text = '—';

                                if (val === 'sesuai') {
                                  color = '#065f46';
                                  bg = '#d1fae5';
                                  text = 'S';
                                } else if (val === 'cukup') {
                                  color = '#92400e';
                                  bg = '#fef3c7';
                                  text = 'C';
                                } else if (val === 'tidak_sesuai') {
                                  color = '#991b1b';
                                  bg = '#fee2e2';
                                  text = 'T';
                                }

                                return (
                                  <td key={k} style={{ padding: '4px 2px', verticalAlign: 'middle' }}>
                                    <div style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      width: '16px',
                                      height: '16px',
                                      borderRadius: '4px',
                                      background: bg,
                                      color: color,
                                      fontWeight: 'bold',
                                      fontSize: '9px'
                                    }}>
                                      {text}
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Keterangan Matriks */}
                  <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, fontSize: '8px', color: '#475569', lineHeight: '1.4', background: '#f8fafc', padding: 8, borderRadius: 6, border: '1px solid #e2e8f0' }}>
                    <div>
                      <div style={{ fontWeight: 'bold', marginBottom: 2 }}>Indikator Nilai:</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <span><strong style={{ color: '#047857' }}>S</strong>: Sesuai</span>
                        <span><strong style={{ color: '#b45309' }}>C</strong>: Cukup</span>
                        <span><strong style={{ color: '#b91c1c' }}>T</strong>: Tidak Sesuai</span>
                        <span><strong>—</strong>: Belum Dinilai</span>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontWeight: 'bold', marginBottom: 2 }}>Aspek Penilaian:</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2px 8px' }}>
                        <span><strong>A</strong>: CPMK & CPL</span>
                        <span><strong>B1</strong>: Identitas MK</span>
                        <span><strong>B2</strong>: Dosen & Tim</span>
                        <span><strong>B3</strong>: CPL & CPMK Mapped</span>
                        <span><strong>B4</strong>: Deskripsi MK</span>
                        <span><strong>B5</strong>: Bahan Kajian</span>
                        <span><strong>B6</strong>: Referensi</span>
                        <span><strong>B7</strong>: Media Ajar</span>
                        <span><strong>B8</strong>: Prasyarat</span>
                        <span><strong>B9</strong>: Teori & Praktek</span>
                        <span><strong>C1</strong>: Minggu Ke</span>
                        <span><strong>C2</strong>: Kemampuan Akhir</span>
                        <span><strong>C3</strong>: Bahan Pertemuan</span>
                        <span><strong>C4</strong>: Metode Ajar</span>
                        <span><strong>C5</strong>: Waktu</span>
                        <span><strong>C6</strong>: Pengalaman Belajar</span>
                        <span><strong>C7</strong>: Kriteria Penilaian</span>
                        <span><strong>C8</strong>: Bobot Evaluasi</span>
                        <span><strong>C9</strong>: Referensi Pertemuan</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* TINGKAT KEPATUHAN & KESELARASAN PRODI */}
                <div style={{ marginBottom: 24, pageBreakInside: 'avoid' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.3px', borderBottom: '1px solid #cbd5e1', paddingBottom: 4 }}>
                    III. Statistik Keselarasan Mutu RPS Prodi
                  </div>
                  
                  {/* Overall Stats Cards */}
                  <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                    <div style={{ flex: 1, padding: '12px', background: '#d1fae5', border: '1px solid #a7f3d0', borderRadius: 8, textAlign: 'center' }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: '#065f46' }}>{overall.sesuai}%</div>
                      <div style={{ fontSize: 11, color: '#047857', fontWeight: 600 }}>Rata-rata Sesuai</div>
                    </div>
                    <div style={{ flex: 1, padding: '12px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, textAlign: 'center' }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: '#92400e' }}>{overall.cukup}%</div>
                      <div style={{ fontSize: 11, color: '#b45309', fontWeight: 600 }}>Rata-rata Cukup</div>
                    </div>
                    <div style={{ flex: 1, padding: '12px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, textAlign: 'center' }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: '#991b1b' }}>{overall.tidak}%</div>
                      <div style={{ fontSize: 11, color: '#b91c1c', fontWeight: 600 }}>Rata-rata Tidak Sesuai</div>
                    </div>
                  </div>

                  {/* Aspects Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '8px 20px', fontSize: '11px' }}>
                    {Object.entries(stats).map(([aspectKey, val]) => (
                      <div key={aspectKey} style={{ padding: '6px 8px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: '#334155' }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>
                            {ASPECT_LABELS[aspectKey]}
                          </span>
                          <span style={{ color: '#4f46e5' }}>Sesuai: {val.sesuai_pct}%</span>
                        </div>
                        {/* Custom Progress Bar Stack */}
                        <div style={{ height: 6, width: '100%', background: '#e2e8f0', borderRadius: 99, overflow: 'hidden', display: 'flex' }}>
                          <div style={{ background: '#10b981', height: '100%', width: `${val.sesuai_pct}%`, transition: 'width 0.3s' }} title={`Sesuai: ${val.sesuai_pct}%`} />
                          <div style={{ background: '#f59e0b', height: '100%', width: `${val.cukup_pct}%`, transition: 'width 0.3s' }} title={`Cukup: ${val.cukup_pct}%`} />
                          <div style={{ background: '#ef4444', height: '100%', width: `${val.tidak_sesuai_pct}%`, transition: 'width 0.3s' }} title={`Tidak Sesuai: ${val.tidak_sesuai_pct}%`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ANALISA DESKRIPTIF / LAPORAN NARATIF */}
                <div style={{ marginBottom: 40 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, borderBottom: '1px solid #cbd5e1', paddingBottom: 4 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                      IV. Analisa Deskriptif & Rekomendasi Naratif
                    </div>
                    <button
                      className="btn btn-secondary btn-xs no-print"
                      onClick={runCompilationAiAnalysis}
                      disabled={compilationAiLoading}
                      style={{
                        background: 'linear-gradient(135deg, #e0e7ff 0%, #f5f3ff 100%)',
                        borderColor: '#c7d2fe',
                        color: '#4338ca',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontWeight: 700,
                        padding: '3px 8px',
                        fontSize: 10
                      }}
                    >
                      {compilationAiLoading ? (
                        <RefreshCw size={10} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                      ) : (
                        <Sparkles size={10} color="#4338ca" />
                      )}
                      {compilationAiLoading ? 'Menyusun...' : 'Hasilkan Analisa AI'}
                    </button>
                  </div>

                  {/* Textarea for Editing (Hidden in Print) */}
                  <div className="no-print" style={{ marginBottom: 12 }}>
                    <textarea
                      className="input"
                      placeholder="Tuliskan analisis deskriptif kompilasi atau klik tombol 'Hasilkan Analisa AI' untuk menyusun otomatis..."
                      rows={10}
                      value={compilationNotes}
                      onChange={e => setCompilationNotes(e.target.value)}
                      style={{ fontSize: 12, resize: 'vertical', minHeight: 180, width: '100%', fontFamily: 'inherit' }}
                    />
                  </div>

                  {/* Formatted preview and print ulasan (Visible in print, and also shown in modal) */}
                  <div style={{
                    fontSize: '12px',
                    color: '#334155',
                    lineHeight: 1.6,
                    fontFamily: 'inherit',
                    padding: compilationNotes ? '12px 16px' : '20px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 6
                  }}>
                    {compilationNotes ? renderFormattedNotes(compilationNotes) : (
                      <span style={{ color: '#94a3b8', fontStyle: 'italic' }} className="no-print">
                        Belum ada laporan naratif. Silakan tulis manual di atas atau klik tombol <strong>"Hasilkan Analisa AI"</strong> untuk pre-fill laporan secara cerdas.
                      </span>
                    )}
                  </div>
                </div>

                {/* SIGNATURE SECTION */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: 12, marginTop: 40, pageBreakInside: 'avoid' }}>
                  <div style={{ textAlign: 'center', width: 220 }}>
                    <div>Purwokerto, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                    <div style={{ fontWeight: 700, marginTop: 4 }}>Ketua Program Studi {prodiName}</div>
                    <div style={{ height: 64 }} /> {/* Sign space */}
                    <div style={{ fontWeight: 800, textDecoration: 'underline' }}>{profile?.nama_lengkap || 'Ka. Prodi'}</div>
                    <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>NIDN: {profile?.nidn || '—'}</div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        );
      })()}
      <AiProgressModal isOpen={compilationAiLoading} title="Kompilasi Laporan Naratif" progressText={progressText} />
    </div>
  )
}
