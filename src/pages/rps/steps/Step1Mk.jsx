import { useState, useEffect } from 'react'
import { BookOpen } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { TAHUN_AKADEMIK_LIST, SEMESTER_LIST } from '@/lib/db'

export default function Step1Mk({ form, setF, userId }) {
  const [penugasan, setPenugasan] = useState([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    if (!userId) return
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('penugasan_dosen')
        .select(`
          id, tahun_akademik, semester_aktif,
          mk:mata_kuliah!mk_id(
            id, kode_mk, nama_mk, sks, semester, cpl,
            prodi:program_studi!prodi_id(kode, nama)
          )
        `)
        .eq('dosen_id', userId)
        .eq('tahun_akademik', form.tahun_akademik)
        .eq('semester_aktif', form.semester_aktif)
      setPenugasan(data ?? [])
      setLoading(false)
    }
    load()
  }, [userId, form.tahun_akademik, form.semester_aktif])

  return (
    <div>
      <h2 style={{ fontSize:16, fontWeight:700, color:'#1e293b', marginBottom:4 }}>
        Pilih Mata Kuliah
      </h2>
      <p style={{ fontSize:13, color:'#64748b', marginBottom:24 }}>
        RPS akan dibuat berdasarkan penugasan mengajar Anda.
      </p>

      {/* Tahun & Semester */}
      <div className="form-grid form-grid-2" style={{ marginBottom:24 }}>
        <div className="input-group">
          <label className="input-label">Tahun Akademik</label>
          <select className="input" value={form.tahun_akademik}
            onChange={e => { setF('tahun_akademik', e.target.value); setF('mk', null) }}>
            {TAHUN_AKADEMIK_LIST.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="input-group">
          <label className="input-label">Semester</label>
          <select className="input" value={form.semester_aktif}
            onChange={e => { setF('semester_aktif', e.target.value); setF('mk', null) }}>
            {SEMESTER_LIST.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* MK list */}
      <div className="input-group" style={{ marginBottom:8 }}>
        <label className="input-label">Pilih Mata Kuliah yang Anda Ampu *</label>
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:32, color:'#94a3b8' }}>
          <div className="spinner" style={{ margin:'0 auto 10px' }} />
          Memuat penugasan…
        </div>
      ) : penugasan.length === 0 ? (
        <div style={{
          padding:32, borderRadius:8, border:'2px dashed #e2e8f0',
          textAlign:'center', color:'#94a3b8',
        }}>
          <BookOpen size={28} style={{ margin:'0 auto 8px', display:'block' }} />
          <div style={{ fontWeight:600, fontSize:13 }}>Tidak ada penugasan</div>
          <div style={{ fontSize:12 }}>Anda belum ditugaskan ke MK pada {form.semester_aktif} {form.tahun_akademik}.</div>
          <div style={{ fontSize:12 }}>Hubungi Kaprodi untuk penugasan.</div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {penugasan.map(p => {
            const mk = p.mk
            const sel = form.mk?.id === mk?.id
            return (
              <button key={p.id} type="button"
                onClick={() => setF('mk', mk)}
                style={{
                  width:'100%', textAlign:'left', padding:'14px 16px', borderRadius:8,
                  border: sel ? '2px solid #6366f1' : '1px solid #e2e8f0',
                  background: sel ? '#eef2ff' : '#fff',
                  cursor:'pointer', transition:'all .15s',
                  display:'flex', alignItems:'center', gap:14,
                }}
              >
                <div style={{
                  width:40, height:40, borderRadius:8, flexShrink:0,
                  background: sel ? '#6366f1' : '#f8fafc',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  border: sel ? 'none' : '1px solid #e2e8f0',
                }}>
                  <BookOpen size={18} color={sel ? '#fff' : '#94a3b8'} />
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, fontSize:13, color: sel ? '#4338ca' : '#1e293b' }}>
                    {mk?.kode_mk} — {mk?.nama_mk}
                  </div>
                  <div style={{ fontSize:12, color:'#94a3b8', marginTop:2 }}>
                    {mk?.prodi?.nama} · {mk?.sks} SKS · Semester {mk?.semester}
                    {mk?.cpl?.length > 0 && ` · ${mk.cpl.length} CPL`}
                  </div>
                </div>
                {sel && (
                  <div style={{ width:20, height:20, borderRadius:'50%', background:'#6366f1', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
