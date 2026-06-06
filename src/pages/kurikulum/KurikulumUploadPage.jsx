import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, Sparkles, RefreshCw, Plus, Trash2, ArrowLeft, Save, AlertCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { extractCurriculum } from '@/lib/ai'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function KurikulumUploadPage() {
  const { user, profile, role } = useAuth()
  const navigate = useNavigate()

  const [namaDokumen, setNamaDokumen] = useState('')
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Extracted data state
  const [extractedData, setExtractedData] = useState({
    profil_lulusan: [],
    cpl: []
  })
  const [hasExtracted, setHasExtracted] = useState(false)

  const [prodiList, setProdiList] = useState([])
  const [selectedProdiId, setSelectedProdiId] = useState('')

  useEffect(() => {
    async function loadProdis() {
      try {
        const { data, error } = await supabase
          .from('program_studi')
          .select('id, kode, nama')
          .order('nama')
        if (error) throw error
        if (data) {
          setProdiList(data)
          if (role === 'admin') {
            const userProdi = data.find(p => p.id === profile?.prodi_id)
            if (userProdi) {
              setSelectedProdiId(userProdi.id)
            } else if (data.length > 0) {
              setSelectedProdiId(data[0].id)
            }
          } else {
            if (profile?.prodi_id) {
              setSelectedProdiId(profile.prodi_id)
            }
          }
        }
      } catch (err) {
        console.error('Gagal memuat Program Studi:', err)
      }
    }
    loadProdis()
  }, [profile?.prodi_id, role])

  // Helper to extract text from PDF using PDF.js CDN
  async function extractTextFromPdf(file) {
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader()
      fileReader.onload = async function () {
        const typedarray = new Uint8Array(this.result)
        try {
          if (!window.pdfjsLib) {
            await new Promise((res, rej) => {
              const script = document.createElement('script')
              script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js'
              script.onload = () => {
                window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js'
                res()
              }
              script.onerror = rej
              document.head.appendChild(script)
            })
          }

          const pdf = await window.pdfjsLib.getDocument({ data: typedarray }).promise
          let text = ''
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i)
            const content = await page.getTextContent()
            const strings = content.items.map(item => item.str)
            text += strings.join(' ') + '\n'
          }
          resolve(text)
        } catch (err) {
          reject(err)
        }
      }
      fileReader.onerror = reject
      fileReader.readAsArrayBuffer(file)
    })
  }

  // Handle file import
  async function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return

    if (!namaDokumen) {
      setNamaDokumen(file.name.replace(/\.[^/.]+$/, ''))
    }

    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      const toastId = toast.loading('Mengekstrak teks dari PDF...')
      try {
        const text = await extractTextFromPdf(file)
        setInputText(text)
        toast.success(`File PDF ${file.name} berhasil diekstraksi!`, { id: toastId })
      } catch (err) {
        console.error(err)
        toast.error('Gagal mengekstrak teks dari PDF: ' + err.message, { id: toastId })
      }
    } else {
      const reader = new FileReader()
      reader.onload = (evt) => {
        setInputText(evt.target.result)
        toast.success(`File ${file.name} berhasil dibaca!`)
      }
      reader.onerror = () => {
        toast.error('Gagal membaca file.')
      }
      reader.readAsText(file)
    }
  }

  // Trigger AI extraction
  async function handleAiExtract() {
    if (!inputText.trim()) {
      toast.error('Masukkan teks kurikulum atau unggah file terlebih dahulu.')
      return
    }

    setLoading(true)
    try {
      const result = await extractCurriculum(inputText)
      if (result && (Array.isArray(result.cpl) || Array.isArray(result.profil_lulusan))) {
        setExtractedData({
          profil_lulusan: result.profil_lulusan ?? [],
          cpl: result.cpl ?? []
        })
        setHasExtracted(true)
        toast.success('Ekstraksi AI berhasil! Silakan periksa hasil di bawah.')
      } else {
        throw new Error('Hasil AI tidak sesuai dengan format kurikulum.')
      }
    } catch (err) {
      console.error(err)
      toast.error('Gagal mengekstrak: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Add/Remove Profil Lulusan
  function addProfil() {
    const nextCode = `PL-${extractedData.profil_lulusan.length + 1}`
    setExtractedData(prev => ({
      ...prev,
      profil_lulusan: [...prev.profil_lulusan, { kode: nextCode, profil: '', deskripsi: '' }]
    }))
  }

  function updateProfil(index, field, value) {
    setExtractedData(prev => ({
      ...prev,
      profil_lulusan: prev.profil_lulusan.map((p, idx) => idx === index ? { ...p, [field]: value } : p)
    }))
  }

  function removeProfil(index) {
    setExtractedData(prev => ({
      ...prev,
      profil_lulusan: prev.profil_lulusan.filter((_, idx) => idx !== index)
    }))
  }

  // Add/Remove CPL
  function addCpl() {
    const nextCode = `CPL-${extractedData.cpl.length + 1}`
    setExtractedData(prev => ({
      ...prev,
      cpl: [...prev.cpl, { kode: nextCode, deskripsi: '' }]
    }))
  }

  function updateCpl(index, field, value) {
    setExtractedData(prev => ({
      ...prev,
      cpl: prev.cpl.map((c, idx) => idx === index ? { ...c, [field]: value } : c)
    }))
  }

  function removeCpl(index) {
    setExtractedData(prev => ({
      ...prev,
      cpl: prev.cpl.filter((_, idx) => idx !== index)
    }))
  }

  // Save to Database
  async function handleSave() {
    if (!selectedProdiId) {
      toast.error('Program Studi wajib dipilih.')
      return
    }
    if (!namaDokumen.trim()) {
      toast.error('Nama Dokumen wajib diisi.')
      return
    }
    if (extractedData.cpl.length === 0 && extractedData.profil_lulusan.length === 0) {
      toast.error('Tambahkan minimal satu CPL atau Profil Lulusan.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        prodi_id: selectedProdiId,
        nama_dokumen: namaDokumen.trim(),
        jenis: 'kurikulum',
        storage_path: 'text-input',
        uploaded_by: user.id,
        extracted_data: extractedData
      }

      const { error } = await supabase.from('kurikulum_docs').insert(payload)
      if (error) throw error

      toast.success('Kurikulum berhasil disimpan!')
      navigate('/kurikulum')
    } catch (err) {
      console.error(err)
      toast.error('Gagal menyimpan: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/kurikulum')}>
          <ArrowLeft size={14} /> Kembali
        </button>
        <div style={{ flex: 1 }}>
          <h1 className="page-title">Upload Kurikulum Baru</h1>
          <p className="page-subtitle">Unggah dokumen kurikulum prodi Anda untuk diekstraksi CPL-nya secara otomatis menggunakan AI</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
        {/* Input Card */}
        <div className="card">
          <div className="card-header">
            <span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>Konten Dokumen Kurikulum</span>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="input-group">
              <label className="input-label">Program Studi *</label>
              <select
                className="input"
                value={selectedProdiId}
                onChange={e => setSelectedProdiId(e.target.value)}
                disabled={role !== 'admin'}
                required
              >
                <option value="" disabled>-- Pilih Program Studi --</option>
                {prodiList.map(p => (
                  <option key={p.id} value={p.id}>{p.kode} — {p.nama}</option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">Nama Dokumen Kurikulum *</label>
              <input
                className="input"
                placeholder="Contoh: Kurikulum Program Studi Sistem Informasi 2026"
                value={namaDokumen}
                onChange={e => setNamaDokumen(e.target.value)}
                required
              />
            </div>

            <div className="form-grid form-grid-2">
              {/* File upload input */}
              <div className="input-group">
                <label className="input-label">Pilih File (.txt, .md, .pdf)</label>
                <div style={{
                  border: '2px dashed #cbd5e1',
                  borderRadius: 8,
                  padding: '16px',
                  textAlign: 'center',
                  background: '#f8fafc',
                  position: 'relative',
                  cursor: 'pointer'
                }}>
                  <Upload size={24} color="#6366f1" style={{ margin: '0 auto 8px' }} />
                  <span style={{ fontSize: 12, color: '#475569', display: 'block' }}>Klik atau drop file (.txt / .md / .pdf) di sini</span>
                  <input
                    type="file"
                    accept=".txt,.md,.pdf"
                    onChange={handleFileChange}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      opacity: 0,
                      cursor: 'pointer'
                    }}
                  />
                </div>
              </div>

              {/* Info panel */}
              <div style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: 8,
                padding: '14px',
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
                fontSize: 12,
                color: '#1e3a8a'
              }}>
                <AlertCircle size={16} color="#3b82f6" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong style={{ display: 'block', marginBottom: 4 }}>Tips Upload Kurikulum:</strong>
                  Unggah file teks kurikulum atau paste teks bagian <strong>Profil Lulusan</strong> dan <strong>Capaian Pembelajaran Lulusan (CPL)</strong> secara langsung pada kolom teks di sebelah kanan. Sistem AI akan mengekstrak struktur data tersebut secara otomatis.
                </div>
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Teks Dokumen Kurikulum (Salin & Paste di sini)</label>
              <textarea
                className="input"
                rows={10}
                placeholder="Tempelkan isi dokumen kurikulum yang berisi profil lulusan dan CPL..."
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                style={{ fontFamily: 'sans-serif', fontSize: 13, lineHeight: 1.6 }}
              />
            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleAiExtract}
              disabled={loading || !inputText.trim()}
              style={{
                alignSelf: 'flex-start',
                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              {loading ? (
                <RefreshCw size={14} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <Sparkles size={14} />
              )}
              {loading ? 'Mengekstrak dengan AI...' : 'Ekstrak dengan AI'}
            </button>
          </div>
        </div>

        {/* Results Area */}
        {hasExtracted && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            {/* Profil Lulusan */}
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>1. Hasil Ekstraksi: Profil Lulusan (PL)</span>
                <button type="button" className="btn btn-secondary btn-sm" onClick={addProfil} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Plus size={12} /> Tambah PL
                </button>
              </div>
              <div className="card-body">
                {extractedData.profil_lulusan.length === 0 ? (
                  <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Tidak ada Profil Lulusan terdeteksi.</div>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th style={{ width: 100 }}>Kode</th>
                          <th style={{ width: 220 }}>Profil Lulusan / Peran</th>
                          <th>Deskripsi Kompetensi</th>
                          <th style={{ width: 60, textAlign: 'center' }}>Hapus</th>
                        </tr>
                      </thead>
                      <tbody>
                        {extractedData.profil_lulusan.map((p, idx) => (
                          <tr key={idx}>
                            <td>
                              <input
                                className="input"
                                style={{ padding: '4px 8px', fontSize: 12 }}
                                value={p.kode}
                                onChange={e => updateProfil(idx, 'kode', e.target.value)}
                              />
                            </td>
                            <td>
                              <input
                                className="input"
                                style={{ padding: '4px 8px', fontSize: 12 }}
                                value={p.profil}
                                onChange={e => updateProfil(idx, 'profil', e.target.value)}
                                placeholder="cth. Web Developer"
                              />
                            </td>
                            <td>
                              <textarea
                                className="input"
                                rows={1}
                                style={{ padding: '4px 8px', fontSize: 12, minHeight: 30, resize: 'vertical' }}
                                value={p.deskripsi}
                                onChange={e => updateProfil(idx, 'deskripsi', e.target.value)}
                                placeholder="cth. Mampu merancang web..."
                              />
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button
                                type="button"
                                className="btn btn-ghost btn-icon btn-sm"
                                style={{ color: '#ef4444' }}
                                onClick={() => removeProfil(idx)}
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* CPL */}
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>2. Hasil Ekstraksi: Capaian Pembelajaran Lulusan (CPL)</span>
                <button type="button" className="btn btn-secondary btn-sm" onClick={addCpl} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Plus size={12} /> Tambah CPL
                </button>
              </div>
              <div className="card-body">
                {extractedData.cpl.length === 0 ? (
                  <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Tidak ada CPL terdeteksi.</div>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th style={{ width: 100 }}>Kode</th>
                          <th>Deskripsi Capaian Pembelajaran</th>
                          <th style={{ width: 60, textAlign: 'center' }}>Hapus</th>
                        </tr>
                      </thead>
                      <tbody>
                        {extractedData.cpl.map((c, idx) => (
                          <tr key={idx}>
                            <td>
                              <input
                                className="input"
                                style={{ padding: '4px 8px', fontSize: 12 }}
                                value={c.kode}
                                onChange={e => updateCpl(idx, 'kode', e.target.value)}
                              />
                            </td>
                            <td>
                              <textarea
                                className="input"
                                rows={2}
                                style={{ padding: '4px 8px', fontSize: 12, minHeight: 45, resize: 'vertical' }}
                                value={c.deskripsi}
                                onChange={e => updateCpl(idx, 'deskripsi', e.target.value)}
                                placeholder="cth. Mampu mengaplikasikan keilmuan..."
                              />
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button
                                type="button"
                                className="btn btn-ghost btn-icon btn-sm"
                                style={{ color: '#ef4444' }}
                                onClick={() => removeCpl(idx)}
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Save bar */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginBottom: 40 }}>
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/kurikulum')}>
                Batal
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving}
                style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 160, justifyContent: 'center' }}
              >
                <Save size={14} />
                {saving ? 'Menyimpan...' : 'Simpan Kurikulum'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
