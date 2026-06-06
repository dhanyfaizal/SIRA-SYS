import { useState, useEffect } from 'react'
import { X, Plus, Trash2, Sparkles, RefreshCw } from 'lucide-react'
import { dbMK } from '@/lib/db'
import { supabase } from '@/lib/supabase'
import { generateCplForCourse } from '@/lib/ai'
import toast from 'react-hot-toast'

const EMPTY = { kode_mk:'', nama_mk:'', sks:2, semester:1, cpl:[] }

export default function MataKuliahForm({ mk, prodiId, onClose, onSaved }) {
  const isEdit = !!mk
  const [form,    setForm]    = useState(isEdit ? { ...mk, cpl: mk.cpl ?? [] } : { ...EMPTY })
  const [saving,  setSaving]  = useState(false)
  const [newCpl,  setNewCpl]  = useState('')
  const [generatingCpl, setGeneratingCpl] = useState(false)

  // State for curriculum CPLs
  const [curriculumCpls, setCurriculumCpls] = useState([])
  const [selectedCpl, setSelectedCpl] = useState('')

  useEffect(() => {
    async function loadCurriculum() {
      if (!prodiId) return
      
      // Try active first
      let { data, error } = await supabase
        .from('kurikulum_docs')
        .select('extracted_data')
        .eq('prodi_id', prodiId)
        .eq('jenis', 'kurikulum')
        .eq('is_active', true)
        .limit(1)

      // Fallback to latest
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
        setCurriculumCpls(data[0].extracted_data?.cpl ?? [])
      }
    }
    loadCurriculum()
  }, [prodiId])

  async function handleAiGenerateCpl() {
    if (!form.nama_mk.trim()) {
      toast.error('Masukkan Nama Mata Kuliah terlebih dahulu.')
      return
    }

    if (curriculumCpls.length === 0) {
      toast.error('Unggah dokumen kurikulum terlebih dahulu di menu Upload Kurikulum untuk menggunakan fitur rekomendasi CPL.')
      return
    }

    setGeneratingCpl(true)
    try {
      const result = await generateCplForCourse(form.nama_mk, curriculumCpls)
      if (Array.isArray(result) && result.length > 0) {
        // Petakan kode CPL (misal CPL-1) kembali ke deskripsi lengkapnya dari kurikulum
        const mappedCpls = result.map(code => {
          const match = curriculumCpls.find(c => c.kode === code)
          return match ? `${match.kode}: ${match.deskripsi}` : null
        }).filter(Boolean)

        if (mappedCpls.length === 0) {
          toast.error('Rekomendasi CPL AI tidak cocok dengan kode di dokumen kurikulum.')
          return
        }

        const uniqueResult = mappedCpls.filter(c => !form.cpl.includes(c))
        if (uniqueResult.length === 0) {
          toast.error('Semua rekomendasi CPL AI sudah ada dalam daftar.')
          return
        }
        set('cpl', [...form.cpl, ...uniqueResult])
        toast.success(`Berhasil menambahkan ${uniqueResult.length} rekomendasi CPL dari kurikulum! 🎉`)
      } else {
        throw new Error("Format respons AI tidak valid.")
      }
    } catch (err) {
      console.error(err)
      toast.error('Gagal merekomendasikan CPL: ' + err.message)
    } finally {
      setGeneratingCpl(false)
    }
  }

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  function addCpl() {
    const val = newCpl.trim()
    if (!val) return
    set('cpl', [...form.cpl, val])
    setNewCpl('')
  }

  function addSelectedCpl() {
    if (!selectedCpl) return
    if (form.cpl.includes(selectedCpl)) {
      toast.error('CPL ini sudah ditambahkan.')
      return
    }
    set('cpl', [...form.cpl, selectedCpl])
    setSelectedCpl('')
  }

  function removeCpl(i) {
    set('cpl', form.cpl.filter((_, idx) => idx !== i))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.kode_mk.trim() || !form.nama_mk.trim()) {
      toast.error('Kode MK dan Nama MK wajib diisi')
      return
    }
    setSaving(true)
    const payload = { ...form, prodi_id: prodiId, sks: Number(form.sks), semester: Number(form.semester) }
    const { error } = isEdit
      ? await dbMK.update(mk.id, payload)
      : await dbMK.create(payload)

    if (error) {
      toast.error(error.message)
      setSaving(false)
      return
    }
    toast.success(isEdit ? 'Mata kuliah diperbarui' : 'Mata kuliah ditambahkan')
    onSaved()
  }

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth:520 }}>
        <div className="modal-header">
          <span className="modal-title">{isEdit ? 'Edit Mata Kuliah' : 'Tambah Mata Kuliah'}</span>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">

            {/* Kode & SKS */}
            <div className="form-grid form-grid-2">
              <div className="input-group">
                <label className="input-label">Kode MK *</label>
                <input className="input" placeholder="SI301" value={form.kode_mk}
                  onChange={e => set('kode_mk', e.target.value.toUpperCase())} required />
              </div>
              <div className="input-group">
                <label className="input-label">SKS *</label>
                <select className="input" value={form.sks} onChange={e => set('sks', e.target.value)}>
                  {[1,2,3,4,6].map(n => <option key={n} value={n}>{n} SKS</option>)}
                </select>
              </div>
            </div>

            {/* Nama MK */}
            <div className="input-group">
              <label className="input-label">Nama Mata Kuliah *</label>
              <input className="input" placeholder="Pemrograman Web" value={form.nama_mk}
                onChange={e => set('nama_mk', e.target.value)} required />
            </div>

            {/* Semester */}
            <div className="input-group">
              <label className="input-label">Semester *</label>
              <select className="input" value={form.semester} onChange={e => set('semester', e.target.value)}>
                {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>Semester {n}</option>)}
              </select>
            </div>

            {/* CPL */}
            <div className="input-group">
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                <label className="input-label" style={{ margin:0 }}>Capaian Pembelajaran Lulusan (CPL)</label>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleAiGenerateCpl}
                  disabled={generatingCpl}
                  style={{
                    background: 'linear-gradient(135deg, var(--indigo-50), #f5f3ff)',
                    borderColor: 'var(--indigo-200)',
                    color: 'var(--indigo-700)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '3px 10px',
                    fontSize: 11
                  }}
                >
                  {generatingCpl ? (
                    <RefreshCw size={11} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <Sparkles size={11} color="var(--indigo-600)" />
                  )}
                  Rekomendasi AI
                </button>
              </div>
              
              {/* Dropdown pilihan CPL dari kurikulum */}
              {curriculumCpls.length > 0 && (
                <div style={{ display:'flex', gap:8, marginBottom:8 }}>
                  <select 
                    className="input" 
                    style={{ flex:1 }}
                    value={selectedCpl}
                    onChange={e => setSelectedCpl(e.target.value)}
                  >
                    <option value="">-- Pilih CPL dari Kurikulum --</option>
                    {curriculumCpls.map(c => {
                      const label = `${c.kode}: ${c.deskripsi}`
                      return <option key={c.kode} value={label}>{label}</option>
                    })}
                  </select>
                  <button type="button" className="btn btn-secondary" onClick={addSelectedCpl} disabled={!selectedCpl}>
                    Pilih
                  </button>
                </div>
              )}

              {/* Input manual sebagai fallback */}
              <div style={{ display:'flex', gap:8, marginBottom:8 }}>
                <input className="input" style={{ flex:1 }}
                  placeholder={curriculumCpls.length > 0 ? "Atau input manual CPL kustom..." : "CPL-1: Mampu menerapkan …"}
                  value={newCpl}
                  onChange={e => setNewCpl(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCpl() } }}
                />
                <button type="button" className="btn btn-secondary" onClick={addCpl}>
                  <Plus size={14} />
                </button>
              </div>
              {form.cpl.length > 0 ? (
                <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                  {form.cpl.map((c, i) => (
                    <div key={i} style={{
                      display:'flex', alignItems:'center', gap:8,
                      padding:'6px 10px', background:'#f8fafc',
                      border:'1px solid #e2e8f0', borderRadius:6, fontSize:12,
                    }}>
                      <span className="badge-pill badge-indigo">CPL-{i+1}</span>
                      <span style={{ flex:1, color:'#334155' }}>{c}</span>
                      <button type="button" className="btn btn-ghost btn-icon" style={{ padding:2 }}
                        onClick={() => removeCpl(i)}>
                        <Trash2 size={11} color="#ef4444" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize:12, color:'#94a3b8' }}>Belum ada CPL. Tekan Enter untuk menambah.</p>
              )}
            </div>

          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Menyimpan…' : isEdit ? 'Simpan Perubahan' : 'Tambah MK'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
