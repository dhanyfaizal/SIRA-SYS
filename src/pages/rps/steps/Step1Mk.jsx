import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { TAHUN_AKADEMIK_LIST, SEMESTER_LIST } from '@/lib/db'

export default function Step1Mk({ form, setF, userId, userProdiId }) {
  const [prodiList, setProdiList] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadProdis() {
      setLoading(true)
      try {
        const { data } = await supabase
          .from('program_studi')
          .select('id, kode, nama')
          .order('nama')
        setProdiList(data ?? [])

        // Default to user's prodi if not set
        if (data && data.length > 0 && !form.manualProdiId) {
          const defaultProdi = data.find(p => p.id === userProdiId) || data[0]
          setF('manualProdiId', defaultProdi.id)
        }
      } catch (err) {
        console.error('Gagal memuat Program Studi:', err)
      } finally {
        setLoading(false)
      }
    }
    loadProdis()
  }, [userProdiId])

  useEffect(() => {
    const isGanjil = form.semester_aktif === 'Ganjil'
    const allowed = isGanjil ? [1, 3, 5, 7] : [2, 4, 6, 8]
    if (!allowed.includes(Number(form.manualSemester))) {
      setF('manualSemester', allowed[0])
    }
  }, [form.semester_aktif, form.manualSemester, setF])

  return (
    <div>
      <h2 style={{ fontSize:16, fontWeight:700, color:'#1e293b', marginBottom:4 }}>
        Informasi Mata Kuliah & Akademik
      </h2>
      <p style={{ fontSize:13, color:'#64748b', marginBottom:24 }}>
        Pilih Program Studi dan masukkan informasi Mata Kuliah yang akan Anda buat RPS-nya.
      </p>

      {/* Tahun & Semester */}
      <div className="form-grid form-grid-2" style={{ marginBottom:20 }}>
        <div className="input-group">
          <label className="input-label">Tahun Akademik</label>
          <select className="input" value={form.tahun_akademik}
            onChange={e => setF('tahun_akademik', e.target.value)}>
            {TAHUN_AKADEMIK_LIST.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="input-group">
          <label className="input-label">Semester Aktif</label>
          <select className="input" value={form.semester_aktif}
            onChange={e => setF('semester_aktif', e.target.value)}>
            {SEMESTER_LIST.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:32, color:'#94a3b8' }}>
          <div className="spinner" style={{ margin:'0 auto 10px' }} />
          Memuat Program Studi…
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {/* Program Studi */}
          <div className="input-group">
            <label className="input-label">Program Studi Pengampu Mata Kuliah *</label>
            <select className="input" value={form.manualProdiId}
              onChange={e => setF('manualProdiId', e.target.value)}>
              <option value="" disabled>-- Pilih Program Studi --</option>
              {prodiList.map(p => (
                <option key={p.id} value={p.id}>{p.kode} — {p.nama}</option>
              ))}
            </select>
          </div>

          {/* Form Grid Kode & Nama MK */}
          <div className="form-grid form-grid-2" style={{ gap:16 }}>
            <div className="input-group" style={{ margin:0 }}>
              <label className="input-label">Kode Mata Kuliah *</label>
              <input
                className="input"
                placeholder="Contoh: INF-101"
                value={form.manualKodeMk}
                onChange={e => setF('manualKodeMk', e.target.value)}
              />
            </div>
            <div className="input-group" style={{ margin:0 }}>
              <label className="input-label">Nama Mata Kuliah *</label>
              <input
                className="input"
                placeholder="Contoh: Pemrograman Web"
                value={form.manualNamaMk}
                onChange={e => setF('manualNamaMk', e.target.value)}
              />
            </div>
          </div>

          {/* Form Grid SKS & Semester */}
          <div className="form-grid form-grid-2" style={{ gap:16 }}>
            <div className="input-group" style={{ margin:0 }}>
              <label className="input-label">Jumlah SKS *</label>
              <input
                type="number"
                className="input"
                min="1"
                max="6"
                value={form.manualSks}
                onChange={e => setF('manualSks', Number(e.target.value))}
              />
            </div>
            <div className="input-group" style={{ margin:0 }}>
              <label className="input-label">Semester Mata Kuliah *</label>
              <select
                className="input"
                value={form.manualSemester}
                onChange={e => setF('manualSemester', Number(e.target.value))}
              >
                {(form.semester_aktif === 'Ganjil' ? [1, 3, 5, 7] : [2, 4, 6, 8]).map(sem => (
                  <option key={sem} value={sem}>Semester {sem}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
