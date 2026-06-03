import { useState } from 'react'
import { Sparkles, RefreshCw } from 'lucide-react'
import { generateWeeklyPlan } from '@/lib/ai'
import toast from 'react-hot-toast'

const METODE_OPTIONS = [
  'Ceramah', 'Diskusi', 'Tanya Jawab', 'Problem Based Learning',
  'Project Based Learning', 'Case Study', 'Demonstrasi', 'Simulasi',
  'Praktikum', 'Presentasi', 'Seminar', 'Self Learning',
]

function PertemuanRow({ p, idx, onChange }) {
  const [open, setOpen] = useState(false)

  const isSpecial = p.is_uts || p.is_uas
  const bgColor   = p.is_uts ? '#fffbeb' : p.is_uas ? '#f0fdf4' : '#fff'
  const border    = p.is_uts ? '1px solid #fde68a' : p.is_uas ? '1px solid #bbf7d0' : '1px solid #e2e8f0'

  return (
    <div style={{ border, borderRadius:8, background:bgColor, marginBottom:8, overflow:'hidden' }}>
      {/* Row header */}
      <div
        style={{
          display:'flex', alignItems:'center', gap:12, padding:'10px 14px',
          cursor:'pointer', userSelect:'none',
        }}
        onClick={() => setOpen(o => !o)}
      >
        <div style={{
          width:28, height:28, borderRadius:'50%', flexShrink:0,
          background: p.is_uts ? '#f59e0b' : p.is_uas ? '#10b981' : '#6366f1',
          color:'#fff', display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:11, fontWeight:700,
        }}>
          {p.no}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:500, color:'#1e293b', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
            {p.kemampuan_akhir || <span style={{ color:'#cbd5e1', fontStyle:'italic' }}>Kemampuan akhir belum diisi</span>}
          </div>
          <div style={{ fontSize:11, color:'#94a3b8', marginTop:1 }}>
            {p.metode} · {p.waktu} menit
            {p.is_uts && <span style={{ color:'#b45309', fontWeight:600, marginLeft:6 }}>📝 UTS</span>}
            {p.is_uas && <span style={{ color:'#065f46', fontWeight:600, marginLeft:6 }}>📝 UAS</span>}
          </div>
        </div>
        <span style={{ fontSize:12, color:'#94a3b8', flexShrink:0 }}>
          {open ? '▲' : '▼'}
        </span>
      </div>

      {/* Expanded */}
      {open && (
        <div style={{ padding:'14px 16px', borderTop:'1px solid rgba(0,0,0,.06)', display:'flex', flexDirection:'column', gap:12 }}>
          <div className="input-group" style={{ margin:0 }}>
            <label className="input-label">Kemampuan Akhir yang Diharapkan</label>
            <textarea className="input" rows={2} value={p.kemampuan_akhir}
              onChange={e => onChange({ kemampuan_akhir: e.target.value })}
              placeholder="Mahasiswa mampu…" style={{ resize:'vertical' }} />
          </div>
          <div className="form-grid form-grid-2">
            <div className="input-group" style={{ margin:0 }}>
              <label className="input-label">Bahan Kajian / Materi</label>
              <textarea className="input" rows={2} value={p.bahan_kajian}
                onChange={e => onChange({ bahan_kajian: e.target.value })}
                placeholder="Topik / Sub-topik" style={{ resize:'vertical' }} />
            </div>
            <div className="input-group" style={{ margin:0 }}>
              <label className="input-label">Pengalaman Belajar Mahasiswa</label>
              <textarea className="input" rows={2} value={p.pengalaman_belajar}
                onChange={e => onChange({ pengalaman_belajar: e.target.value })}
                placeholder="Kegiatan yang dilakukan…" style={{ resize:'vertical' }} />
            </div>
          </div>
          <div className="form-grid form-grid-2">
            <div className="input-group" style={{ margin:0 }}>
              <label className="input-label">Metode Pembelajaran</label>
              <select className="input" value={p.metode}
                onChange={e => onChange({ metode: e.target.value })}>
                {METODE_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                <option value="Ceramah, Diskusi">Ceramah & Diskusi</option>
                <option value="Ceramah, Praktikum">Ceramah & Praktikum</option>
              </select>
            </div>
            <div className="input-group" style={{ margin:0 }}>
              <label className="input-label">Waktu (menit)</label>
              <select className="input" value={p.waktu}
                onChange={e => onChange({ waktu: Number(e.target.value) })}>
                {[50, 100, 150, 200, 250, 300].map(m => (
                  <option key={m} value={m}>{m} menit</option>
                ))}
              </select>
            </div>
          </div>
          <div className="input-group" style={{ margin:0 }}>
            <label className="input-label">Kriteria Penilaian</label>
            <input className="input" value={p.kriteria_penilaian}
              onChange={e => onChange({ kriteria_penilaian: e.target.value })}
              placeholder="Kuis, tugas, partisipasi…" />
          </div>
        </div>
      )}
    </div>
  )
}

export default function Step4Pertemuan({ form, setF }) {
  const pertemuan = form.pertemuan
  const [generating, setGenerating] = useState(false)

  function update(idx, changes) {
    setF('pertemuan', pertemuan.map((p, i) => i === idx ? { ...p, ...changes } : p))
  }

  async function handleAiGenerate() {
    if (!form.mk) {
      toast.error('Pilih Mata Kuliah terlebih dahulu di langkah 1.')
      return
    }
    if (!form.cpmk || form.cpmk.length === 0) {
      toast.error('Tambahkan minimal 1 CPMK terlebih dahulu di langkah 3.')
      return
    }

    setGenerating(true)
    try {
      const result = await generateWeeklyPlan(
        form.mk.nama_mk,
        form.deskripsi_mk,
        form.cpmk
      )

      if (Array.isArray(result) && result.length === 16) {
        setF('pertemuan', result)
        toast.success('Rencana 16 pertemuan berhasil disusun otomatis dengan AI! 🎉')
      } else {
        throw new Error("Format respons AI tidak valid.")
      }
    } catch (err) {
      console.error(err)
      toast.error('Gagal membuat rencana pertemuan: ' + err.message)
    } finally {
      setGenerating(false)
    }
  }

  function fillAll() {
    // Isi metode & waktu default untuk yang masih kosong
    setF('pertemuan', pertemuan.map(p => ({
      ...p,
      metode: p.metode || 'Ceramah, Diskusi',
      waktu:  p.waktu  || 150,
    })))
  }

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4, gap:8, flexWrap:'wrap' }}>
        <h2 style={{ fontSize:16, fontWeight:700, color:'#1e293b' }}>Rencana 16 Pertemuan</h2>
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
            {generating ? 'Menyusun...' : 'Rencana Mingguan AI'}
          </button>
          
          <button type="button" className="btn btn-secondary btn-sm" onClick={fillAll} disabled={generating}>
            Isi Default
          </button>
        </div>
      </div>
      <p style={{ fontSize:13, color:'#64748b', marginBottom:20 }}>
        Klik setiap pertemuan untuk mengisi detailnya. Pertemuan 8 (UTS) dan 16 (UAS) sudah ditandai.
      </p>

      {/* Legend */}
      <div style={{ display:'flex', gap:12, marginBottom:16, flexWrap:'wrap' }}>
        {[
          { bg:'#6366f1', label:'Pertemuan Biasa' },
          { bg:'#f59e0b', label:'UTS (Pertemuan 8)' },
          { bg:'#10b981', label:'UAS (Pertemuan 16)' },
        ].map(({ bg, label }) => (
          <div key={label} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#64748b' }}>
            <div style={{ width:12, height:12, borderRadius:'50%', background:bg }} />
            {label}
          </div>
        ))}
      </div>

      {pertemuan.map((p, i) => (
        <PertemuanRow key={i} p={p} idx={i} onChange={changes => update(i, changes)} />
      ))}
    </div>
  )
}
