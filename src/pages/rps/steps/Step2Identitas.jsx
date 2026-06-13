import { useState } from 'react'
import { Sparkles, RefreshCw, Plus, Trash2 } from 'lucide-react'
import { generateCourseDescription, generateReferences } from '@/lib/ai'
import AiProgressModal from '@/components/ui/AiProgressModal'
import toast from 'react-hot-toast'

export default function Step2Identitas({ form, setF }) {
  const mk = form.mk
  const referensi = form.referensi || []
  const [newRef, setNewRef] = useState('')
  const [generating, setGenerating] = useState(false)
  const [progressText, setProgressText] = useState('')

  const [generatingRefs, setGeneratingRefs] = useState(false)
  const [refProgressText, setRefProgressText] = useState('')

  // States for custom keyword input modal
  const [showKeywordModal, setShowKeywordModal] = useState(false)
  const [keywords, setKeywords] = useState('')

  function handleOpenKeywordModal() {
    if (!mk?.nama_mk) {
      toast.error('Pilih Mata Kuliah terlebih dahulu di langkah 1.')
      return
    }
    setShowKeywordModal(true)
  }

  async function handleAiGenerateDesc() {
    if (!mk?.nama_mk) {
      toast.error('Pilih Mata Kuliah terlebih dahulu di langkah 1.')
      return
    }

    setShowKeywordModal(false)
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
      const result = await generateCourseDescription(mk.nama_mk, handleProgress, keywords)
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

  async function handleAiGenerateRefs() {
    const courseName = form.mk?.nama_mk
    if (!courseName) {
      toast.error('Nama Mata Kuliah tidak ditemukan. Pastikan Anda sudah melengkapi Langkah 1.')
      return
    }

    setGeneratingRefs(true)
    setRefProgressText("Menghubungi Gateway API Server...")

    let subTimer = null
    const steps = [
      "Menganalisis Nama Mata Kuliah & CPMK...",
      "Mencari Buku Teks Akademik Mutakhir...",
      "Mencari Artikel & Jurnal Ilmiah Terbaru...",
      "Memformat Sitasi dengan Standar APA Style...",
      "Mempersiapkan Rekomendasi Pustaka..."
    ]
    let currentStep = 0

    const handleProgress = (event) => {
      if (typeof event === 'string') {
        if (event === "AI sedang memikirkan materi & merumuskan konten (proses ini memakan waktu)...") {
          setRefProgressText(steps[0])
          subTimer = setInterval(() => {
            currentStep++
            if (currentStep < steps.length) {
              setRefProgressText(steps[currentStep])
            } else {
              setRefProgressText("AI sedang menyusun rujukan pustaka... Mohon tunggu sebentar lagi...")
            }
          }, 2500)
        } else {
          if (subTimer) clearInterval(subTimer)
          setRefProgressText(event)
        }
      } else if (event && event.type === 'chunk') {
        if (subTimer) clearInterval(subTimer)
        const charCount = event.text.length
        setRefProgressText(`AI sedang merumuskan referensi... (${charCount.toLocaleString('id-ID')} karakter)`)
      }
    }

    try {
      const result = await generateReferences(courseName, form.cpmk, handleProgress)
      if (Array.isArray(result) && result.length > 0) {
        const existing = new Set(referensi)
        const newAdded = []
        result.forEach(ref => {
          if (!existing.has(ref)) {
            newAdded.push(ref)
          }
        })
        if (newAdded.length > 0) {
          setF('referensi', [...referensi, ...newAdded])
          toast.success(`Berhasil menambahkan ${newAdded.length} referensi pustaka mutakhir! 🎉`)
        } else {
          toast.info('Referensi yang disarankan AI sudah ada di daftar Anda.')
        }
      } else {
        throw new Error("Format rekomendasi referensi tidak valid.")
      }
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Gagal merekomendasikan referensi.')
    } finally {
      if (subTimer) clearInterval(subTimer)
      setGeneratingRefs(false)
    }
  }

  function addRef() {
    const val = newRef.trim()
    if (!val) return
    setF('referensi', [...referensi, val])
    setNewRef('')
  }

  function removeRef(i) {
    setF('referensi', referensi.filter((_, idx) => idx !== i))
  }

  function updateRef(i, val) {
    const newRefs = [...referensi]
    newRefs[i] = val
    setF('referensi', newRefs)
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
            onClick={handleOpenKeywordModal}
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

      {/* Referensi */}
      <div style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.4px' }}>
            Referensi Pustaka (3 Tahun Terakhir)
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleAiGenerateRefs}
            disabled={generatingRefs}
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
            {generatingRefs ? (
              <RefreshCw size={12} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <Sparkles size={12} color="var(--indigo-600)" />
            )}
            {generatingRefs ? 'Mencari...' : 'Rekomendasi Referensi AI'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input className="input" style={{ flex: 1 }}
            placeholder="Contoh: Pressman, R.S. (2014). Software Engineering. McGraw-Hill."
            value={newRef}
            onChange={e => setNewRef(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addRef() } }}
          />
          <button type="button" className="btn btn-secondary" onClick={addRef}>
            <Plus size={14} /> Tambah
          </button>
        </div>

        {referensi.length === 0 ? (
          <p style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>
            Belum ada referensi. Ketik rujukan di atas lalu tekan Enter atau klik Tambah.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {referensi.map((r, i) => (
              <div key={i} style={{
                display: 'flex', gap: 8, alignItems: 'center',
                padding: '6px 12px', background: '#f8fafc',
                border: '1px solid #e2e8f0', borderRadius: 6
              }}>
                <span style={{ color: '#6366f1', fontWeight: 700, fontSize: 12, width: 24, flexShrink: 0 }}>[{i + 1}]</span>
                
                <input
                  className="input"
                  style={{ flex: 1, fontSize: 12, border: 'none', background: 'transparent', padding: '2px 0' }}
                  value={r}
                  onChange={e => updateRef(i, e.target.value)}
                />

                <button type="button" className="btn btn-ghost btn-icon btn-sm" style={{ padding: 2, flexShrink: 0 }}
                  onClick={() => removeRef(i)}>
                  <Trash2 size={13} color="#ef4444" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Input Kata Kunci / Topik */}
      {showKeywordModal && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
          animation: 'fadeIn .2s ease-out'
        }}>
          <div className="card" style={{
            width: '100%',
            maxWidth: 460,
            padding: 24,
            boxShadow: 'var(--shadow-lg)',
            background: '#fff',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--gray-200)',
            animation: 'scaleIn .2s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'var(--indigo-50)',
                color: 'var(--indigo-600)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Sparkles size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--gray-900)', margin: 0 }}>
                  Generate Deskripsi Mata Kuliah
                </h3>
                <p style={{ fontSize: 12, color: 'var(--gray-500)', margin: 0 }}>
                  Mata Kuliah: <strong>{mk?.nama_mk}</strong>
                </p>
              </div>
            </div>

            <div className="input-group" style={{ marginBottom: 20 }}>
              <label className="input-label" style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-700)', marginBottom: 6 }}>
                Topik atau Kata Kunci Pembelajaran (Opsional)
              </label>
              <textarea
                className="input"
                rows={3}
                placeholder="Contoh: React, Hooks, State Management, API integration, Tailwind CSS"
                value={keywords}
                onChange={e => setKeywords(e.target.value)}
                style={{ resize: 'vertical', fontSize: '13px', lineHeight: 1.5 }}
                autoFocus
              />
              <span className="input-hint" style={{ marginTop: 6 }}>
                Kata kunci di atas akan dijadikan acuan utama oleh AI untuk menyusun deskripsi mata kuliah Anda secara terarah.
              </span>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowKeywordModal(false)
                  setKeywords('')
                }}
                style={{ fontSize: 12, height: 36, padding: '0 16px' }}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleAiGenerateDesc}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  height: 36,
                  padding: '0 16px',
                  background: 'var(--indigo-600)',
                  borderColor: 'var(--indigo-700)',
                  color: '#fff'
                }}
              >
                <Sparkles size={14} />
                Mulai Generate
              </button>
            </div>
          </div>
        </div>
      )}

      <AiProgressModal isOpen={generating} title="Penyusunan Deskripsi MK" progressText={progressText} />
      <AiProgressModal isOpen={generatingRefs} title="Rekomendasi Referensi Pustaka" progressText={refProgressText} />
    </div>
  )
}
