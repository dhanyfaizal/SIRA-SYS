import { useState } from 'react'
import { Plus, Trash2, Link2, Sparkles, RefreshCw } from 'lucide-react'
import { generateCpmk } from '@/lib/ai'
import toast from 'react-hot-toast'

const EMPTY_CPMK = { kode:'', deskripsi:'', cpl_ref:[] }

export default function Step3Cpmk({ form, setF }) {
  const cpl  = form.mk?.cpl ?? []
  const cpmk = form.cpmk
  const [generating, setGenerating] = useState(false)

  function addCpmk() {
    const next = cpmk.length + 1
    setF('cpmk', [...cpmk, { ...EMPTY_CPMK, kode:`CPMK-${next}` }])
  }

  async function handleAiGenerate() {
    if (!form.mk) {
      toast.error('Pilih Mata Kuliah terlebih dahulu di langkah 1.')
      return
    }

    setGenerating(true)
    try {
      const result = await generateCpmk(
        form.mk.nama_mk,
        form.deskripsi_mk,
        cpl
      )

      if (Array.isArray(result) && result.length > 0) {
        // Ganti CPMK form dengan hasil AI
        setF('cpmk', result)
        toast.success(`Berhasil merekomendasikan ${result.length} CPMK dengan AI! 🎉`)
      } else {
        throw new Error("Format respon AI tidak valid.")
      }
    } catch (err) {
      console.error(err)
      toast.error('Gagal membuat CPMK: ' + err.message)
    } finally {
      setGenerating(false)
    }
  }

  function removeCpmk(i) {
    setF('cpmk', cpmk.filter((_, idx) => idx !== i))
  }

  function updateCpmk(i, key, val) {
    setF('cpmk', cpmk.map((c, idx) => idx === i ? { ...c, [key]: val } : c))
  }

  function toggleCplRef(i, cplItem) {
    const cur = cpmk[i].cpl_ref ?? []
    const next = cur.includes(cplItem)
      ? cur.filter(x => x !== cplItem)
      : [...cur, cplItem]
    updateCpmk(i, 'cpl_ref', next)
  }

  return (
    <div>
      <h2 style={{ fontSize:16, fontWeight:700, color:'#1e293b', marginBottom:4 }}>
        Capaian Pembelajaran
      </h2>
      <p style={{ fontSize:13, color:'#64748b', marginBottom:24 }}>
        Tentukan CPMK (Capaian Pembelajaran Mata Kuliah) berdasarkan CPL yang relevan.
      </p>

      {/* CPL dari MK — read only */}
      {cpl.length > 0 && (
        <div style={{ marginBottom:24 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.4px', marginBottom:8 }}>
            CPL Mata Kuliah (dari kurikulum)
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {cpl.map((c, i) => (
              <div key={i} style={{
                display:'flex', gap:10, padding:'8px 12px',
                background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:6, fontSize:12,
              }}>
                <span className="badge-pill badge-indigo" style={{ flexShrink:0 }}>CPL-{i+1}</span>
                <span style={{ color:'#334155' }}>{c}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CPMK */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12, gap:8, flexWrap:'wrap' }}>
        <div style={{ fontSize:12, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.4px' }}>
          CPMK — Capaian Mata Kuliah
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleAiGenerate} disabled={generating}
            style={{
              background: 'linear-gradient(135deg, var(--indigo-50), #f5f3ff)',
              borderColor: 'var(--indigo-200)',
              color: 'var(--indigo-700)',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}>
            {generating ? (
              <RefreshCw size={13} className="spinner" style={{ animation: 'spin 1s linear infinite', borderTopColor: 'var(--indigo-600)' }} />
            ) : (
              <Sparkles size={13} color="var(--indigo-600)" />
            )}
            {generating ? 'Menyusun...' : 'Rekomendasi AI'}
          </button>
          
          <button type="button" className="btn btn-secondary btn-sm" onClick={addCpmk} disabled={generating}>
            <Plus size={13} /> Tambah CPMK
          </button>
        </div>
      </div>

      {cpmk.length === 0 ? (
        <div style={{
          padding:32, borderRadius:8, border:'2px dashed #e2e8f0',
          textAlign:'center', color:'#94a3b8',
        }}>
          <div style={{ fontSize:13, fontWeight:500 }}>Belum ada CPMK</div>
          <div style={{ fontSize:12 }}>Klik "+ Tambah CPMK" untuk mulai</div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {cpmk.map((c, i) => (
            <div key={i} style={{
              padding:'16px 18px', borderRadius:8,
              border:'1px solid #e2e8f0', background:'#fff',
            }}>
              <div style={{ display:'flex', gap:10, marginBottom:10 }}>
                <div className="input-group" style={{ width:120, margin:0 }}>
                  <label className="input-label">Kode</label>
                  <input className="input" value={c.kode}
                    onChange={e => updateCpmk(i, 'kode', e.target.value)}
                    placeholder="CPMK-1" />
                </div>
                <div className="input-group" style={{ flex:1, margin:0 }}>
                  <label className="input-label">Deskripsi Capaian *</label>
                  <input className="input" value={c.deskripsi}
                    onChange={e => updateCpmk(i, 'deskripsi', e.target.value)}
                    placeholder="Mahasiswa mampu…" />
                </div>
                <button type="button" className="btn btn-ghost btn-icon btn-sm"
                  style={{ marginTop:18, color:'#ef4444', flexShrink:0 }}
                  onClick={() => removeCpmk(i)}>
                  <Trash2 size={14} />
                </button>
              </div>

              {/* CPL ref */}
              {cpl.length > 0 && (
                <div>
                  <div style={{ fontSize:11, color:'#94a3b8', marginBottom:6, display:'flex', alignItems:'center', gap:4 }}>
                    <Link2 size={11} /> Terhubung ke CPL:
                  </div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                    {cpl.map((_, ci) => {
                      const label = `CPL-${ci+1}`
                      const sel   = (c.cpl_ref ?? []).includes(label)
                      return (
                        <button key={ci} type="button"
                          onClick={() => toggleCplRef(i, label)}
                          style={{
                            padding:'3px 10px', borderRadius:99, fontSize:11, fontWeight:600,
                            border: sel ? '1px solid #6366f1' : '1px solid #e2e8f0',
                            background: sel ? '#eef2ff' : '#f8fafc',
                            color: sel ? '#4338ca' : '#94a3b8',
                            cursor:'pointer', transition:'all .15s',
                          }}>
                          {label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
