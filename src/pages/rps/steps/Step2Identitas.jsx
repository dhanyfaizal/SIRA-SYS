import { useState } from 'react'
import { Sparkles, RefreshCw } from 'lucide-react'
import { generateCourseDescription } from '@/lib/ai'
import AiProgressModal from '@/components/ui/AiProgressModal'
import toast from 'react-hot-toast'

export default function Step2Identitas({ form, setF }) {
  const mk = form.mk
  const [generating, setGenerating] = useState(false)
  const [progressText, setProgressText] = useState('')

  async function handleAiGenerateDesc() {
    if (!mk?.nama_mk) {
      toast.error('Pilih Mata Kuliah terlebih dahulu di langkah 1.')
      return
    }

    setGenerating(true)
    setProgressText("Menghubungi Gateway API Server...")

    let subTimer = null
    const steps = [
      "Menganalisis Nama Mata Kuliah...",
      "Mengidentifikasi Fokus Utama Pembelajaran...",
      "Menyusun Deskripsi Relevansi Keilmuan...",
      "Menyusun Kompetensi Akhir & Topik Kunci...",
      "Mempersiapkan Deskripsi..."
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
              setProgressText("AI sedang merampungkan deskripsi... Mohon tunggu sebentar lagi...")
            }
          }, 2500)
        } else {
          if (subTimer) clearInterval(subTimer)
          setProgressText(event)
        }
      } else if (event && event.type === 'chunk') {
        if (subTimer) clearInterval(subTimer)
        const charCount = event.text.length
        setProgressText(`AI sedang menulis deskripsi... (${charCount.toLocaleString('id-ID')} karakter)`)
      }
    }

    try {
      const result = await generateCourseDescription(mk.nama_mk, handleProgress)
      if (result && result.deskripsi) {
        setF('deskripsi_mk', result.deskripsi)
        toast.success('Deskripsi Mata Kuliah berhasil dibuat dengan AI! 🎉')
      } else {
        throw new Error("Format respons AI tidak valid.")
      }
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Gagal menghasilkan deskripsi.')
    } finally {
      if (subTimer) clearInterval(subTimer)
      setGenerating(false)
    }
  }

  return (
    <div>
      <h2 style={{ fontSize:16, fontWeight:700, color:'#1e293b', marginBottom:4 }}>
        Identitas & Deskripsi Mata Kuliah
      </h2>
      <p style={{ fontSize:13, color:'#64748b', marginBottom:24 }}>
        Informasi umum tentang mata kuliah ini dalam kurikulum.
      </p>

      {/* Info MK — read only */}
      <div style={{
        display:'grid', gridTemplateColumns:'1fr 1fr', gap:12,
        background:'#f8fafc', border:'1px solid #e2e8f0',
        borderRadius:8, padding:16, marginBottom:24,
      }}>
        {[
          ['Kode MK', mk?.kode_mk],
          ['SKS', `${mk?.sks} SKS`],
          ['Nama MK', mk?.nama_mk],
          ['Semester', `Semester ${mk?.semester}`],
          ['Program Studi', mk?.prodi?.nama],
          ['Tahun Akademik', `${form.tahun_akademik} — ${form.semester_aktif}`],
        ].map(([label, value]) => (
          <div key={label}>
            <div style={{ fontSize:11, fontWeight:600, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.4px' }}>
              {label}
            </div>
            <div style={{ fontSize:13, fontWeight:500, color:'#1e293b', marginTop:2 }}>
              {value || '—'}
            </div>
          </div>
        ))}
      </div>

      {/* Deskripsi */}
      <div className="input-group">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <label className="input-label" style={{ margin: 0 }}>Deskripsi Mata Kuliah *</label>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleAiGenerateDesc}
            disabled={generating}
            style={{
              background: 'linear-gradient(135deg, var(--indigo-50), #f5f3ff)',
              borderColor: 'var(--indigo-200)',
              color: 'var(--indigo-700)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 8px',
              fontSize: '11px',
            }}
          >
            {generating ? (
              <RefreshCw size={12} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <Sparkles size={12} color="var(--indigo-600)" />
            )}
            {generating ? 'Menyusun...' : 'Generate AI'}
          </button>
        </div>
        <textarea
          className="input"
          rows={5}
          placeholder="Jelaskan gambaran umum mata kuliah ini, isi/materi utama, relevansinya dengan program studi, dan capaian yang diharapkan…"
          value={form.deskripsi_mk}
          onChange={e => setF('deskripsi_mk', e.target.value)}
          style={{ resize:'vertical', lineHeight:1.6 }}
        />
        <span className="input-hint">{form.deskripsi_mk.length} karakter · minimal 50 karakter disarankan</span>
      </div>
      <AiProgressModal isOpen={generating} title="Penyusunan Deskripsi MK" progressText={progressText} />
    </div>
  )
}
