import { useState } from 'react'
import { Plus, Trash2, Sparkles, RefreshCw } from 'lucide-react'
import { generateReferences } from '@/lib/ai'
import AiProgressModal from '@/components/ui/AiProgressModal'
import toast from 'react-hot-toast'

export default function Step5Penilaian({ form, setF }) {
  const penilaian = form.penilaian
  const referensi = form.referensi
  const [newRef, setNewRef] = useState('')
  const [generating, setGenerating] = useState(false)
  const [progressText, setProgressText] = useState('')

  async function handleAiGenerateRefs() {
    const courseName = form.mk?.nama_mk
    if (!courseName) {
      toast.error('Nama Mata Kuliah tidak ditemukan. Pastikan Anda sudah melengkapi Langkah 1.')
      return
    }

    setGenerating(true)
    setProgressText("Menghubungi Gateway API Server...")

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
          setProgressText(steps[0])
          subTimer = setInterval(() => {
            currentStep++
            if (currentStep < steps.length) {
              setProgressText(steps[currentStep])
            } else {
              setProgressText("AI sedang menyusun rujukan pustaka... Mohon tunggu sebentar lagi...")
            }
          }, 2500)
        } else {
          if (subTimer) clearInterval(subTimer)
          setProgressText(event)
        }
      } else if (event && event.type === 'chunk') {
        if (subTimer) clearInterval(subTimer)
        const charCount = event.text.length
        setProgressText(`AI sedang merumuskan referensi... (${charCount.toLocaleString('id-ID')} karakter)`)
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
      setGenerating(false)
    }
  }

  // Local state for dynamic evaluation components
  const [items, setItems] = useState(() => {
    const entries = Object.entries(penilaian || {})
    if (entries.length === 0) {
      // Default initial components
      return [
        { id: '1', label: 'UTS (Ujian Tengah Semester)', bobot: 30 },
        { id: '2', label: 'UAS (Ujian Akhir Semester)', bobot: 35 },
        { id: '3', label: 'Tugas / Kuis', bobot: 20 },
        { id: '4', label: 'Kehadiran', bobot: 5 },
        { id: '5', label: 'Lainnya', bobot: 10 }
      ]
    }
    return entries.map(([k, v], idx) => {
      let label = k
      if (k === 'uts') label = 'UTS (Ujian Tengah Semester)'
      else if (k === 'uas') label = 'UAS (Ujian Akhir Semester)'
      else if (k === 'tugas') label = 'Tugas / Kuis'
      else if (k === 'praktikum') label = 'Praktikum'
      else if (k === 'kehadiran') label = 'Kehadiran'
      return { id: String(idx + 1), label, bobot: Number(v || 0) }
    })
  })

  // Sync items array to parent form state object
  function syncToForm(newItems) {
    const obj = {}
    newItems.forEach(item => {
      const key = item.label.trim()
      if (key) {
        obj[key] = item.bobot
      }
    })
    setF('penilaian', obj)
  }

  // Bobot calculations
  const total = items.reduce((a, b) => a + Number(b.bobot || 0), 0)
  const ok = total === 100

  // Mutate component item
  function updateItem(id, field, val) {
    const newItems = items.map(item => {
      if (item.id === id) {
        if (field === 'bobot') {
          const num = Math.max(0, Math.min(100, Number(val) || 0))
          return { ...item, bobot: num }
        }
        return { ...item, [field]: val }
      }
      return item
    })
    setItems(newItems)
    syncToForm(newItems)
  }

  function addComponent() {
    const newItems = [...items, { id: String(Date.now()), label: '', bobot: 0 }]
    setItems(newItems)
    syncToForm(newItems)
  }

  function removeComponent(id) {
    const newItems = items.filter(item => item.id !== id)
    setItems(newItems)
    syncToForm(newItems)
  }

  // References actions
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
      <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
        Penilaian & Referensi
      </h2>
      <p style={{ fontSize: 13, color: '#64748b', marginBottom: 24 }}>
        Tentukan bobot komponen penilaian (total harus 100%) dan daftar referensi pustaka.
      </p>

      {/* Komponen Penilaian */}
      <div style={{ marginBottom: 28 }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.4px' }}>
            Komponen Penilaian
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={addComponent} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Plus size={12} /> Tambah Komponen
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map(item => (
            <div key={item.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '8px 12px', borderRadius: 8,
              border: '1px solid #e2e8f0', background: '#fff',
            }}>
              {/* Component name input */}
              <input
                className="input"
                style={{ flex: 1, border: 'none', background: 'transparent', padding: '4px 0', fontSize: 13, fontWeight: 500 }}
                value={item.label}
                onChange={e => updateItem(item.id, 'label', e.target.value)}
                placeholder="cth. Ujian Tengah Semester (UTS) / Kuis Mandiri"
              />

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="number" min={0} max={100}
                  className="input"
                  style={{ width: 70, textAlign: 'center', padding: '4px 6px' }}
                  value={item.bobot}
                  onChange={e => updateItem(item.id, 'bobot', e.target.value)}
                />
                <span style={{ fontSize: 12, color: '#94a3b8', width: 12 }}>%</span>
                <button
                  type="button"
                  className="btn btn-ghost btn-icon btn-sm"
                  style={{ color: '#ef4444', padding: 2 }}
                  onClick={() => removeComponent(item.id)}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Total indicator */}
        <div style={{
          marginTop: 12, padding: '10px 14px', borderRadius: 8,
          background: ok ? '#f0fdf4' : total > 100 ? '#fef2f2' : '#fffbeb',
          border: ok ? '1px solid #bbf7d0' : total > 100 ? '1px solid #fecaca' : '1px solid #fde68a',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: ok ? '#065f46' : total > 100 ? '#991b1b' : '#92400e' }}>
            {ok ? '✓ Total bobot sudah tepat' : total > 100 ? '⚠ Total melebihi 100%' : '⚠ Total belum mencapai 100%'}
          </span>
          <span style={{
            fontSize: 22, fontWeight: 800,
            color: ok ? '#10b981' : total > 100 ? '#ef4444' : '#f59e0b',
          }}>
            {total}%
          </span>
        </div>

        {/* Progress bar bobot */}
        <div style={{ height: 6, background: '#e2e8f0', borderRadius: 99, marginTop: 8, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${Math.min(total, 100)}%`,
            background: ok ? '#10b981' : total > 100 ? '#ef4444' : '#f59e0b',
            borderRadius: 99, transition: 'width .3s',
          }} />
        </div>
      </div>

      {/* Referensi */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.4px' }}>
            Referensi Pustaka (3 Tahun Terakhir)
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleAiGenerateRefs}
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
            {generating ? 'Mencari...' : 'Rekomendasi Referensi AI'}
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
                
                {/* Reference item editable input */}
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
      <AiProgressModal isOpen={generating} title="Rekomendasi Referensi Pustaka" progressText={progressText} />
    </div>
  )
}
