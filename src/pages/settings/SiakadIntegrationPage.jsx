import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Database, Terminal, Code, Copy, Check, Play, FileText, Info } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SiakadIntegrationPage() {
  const { profile } = useAuth()
  
  // States
  const [rpsList, setRpsList] = useState([])
  const [selectedRpsId, setSelectedRpsId] = useState('')
  const [selectedRps, setSelectedRps] = useState(null)
  
  const [loading, setLoading] = useState(true)
  const [copiedKey, setCopiedKey] = useState('') // 'key' | 'curl' | 'url'
  
  // API Config
  const apiBaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xezzmppsklkpmiesblvw.supabase.co'
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key'

  useEffect(() => {
    async function loadApprovedRps() {
      if (!profile?.prodi_id) return
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('rps')
          .select(`
            id, tahun_akademik, semester_aktif, capaian_pembelajaran, rencana_pembelajaran, penilaian,
            mk:mata_kuliah!mk_id(id, kode_mk, nama_mk, sks, semester, prodi_id)
          `)
          .eq('status', 'approved')
          .eq('mk.prodi_id', profile.prodi_id)

        if (error) throw error
        setRpsList(data || [])
        if (data && data.length > 0) {
          setSelectedRpsId(data[0].id)
          setSelectedRps(data[0])
        }
      } catch (err) {
        console.error(err)
        toast.error('Gagal memuat daftar RPS: ' + err.message)
      } finally {
        setLoading(false)
      }
    }

    loadApprovedRps()
  }, [profile])

  const handleSelectRps = (id) => {
    setSelectedRpsId(id)
    const found = rpsList.find(r => r.id === id)
    setSelectedRps(found)
  }

  // Generate payload for preview
  const generatePayload = () => {
    if (!selectedRps) return null
    return {
      id: selectedRps.id,
      kode_mata_kuliah: selectedRps.mk?.kode_mk,
      nama_mata_kuliah: selectedRps.mk?.nama_mk,
      sks: selectedRps.mk?.sks,
      semester: selectedRps.mk?.semester,
      tahun_akademik: selectedRps.tahun_akademik,
      semester_aktif: selectedRps.semester_aktif,
      capaian_pembelajaran: selectedRps.capaian_pembelajaran,
      rencana_pembelajaran_16_pertemuan: selectedRps.rencana_pembelajaran,
      bobot_penilaian: selectedRps.penilaian
    }
  }

  const payload = generatePayload()
  
  // URL & cURL command strings
  const testUrl = `${apiBaseUrl}/rest/v1/rps?id=eq.${selectedRpsId || 'UUID-RPS'}&select=id,tahun_akademik,semester_aktif,capaian_pembelajaran,rencana_pembelajaran,penilaian,mk:mata_kuliah(kode_mk,nama_mk,sks,semester)`
  const curlCommand = `curl -X GET "${testUrl}" \\\n  -H "apikey: ${anonKey.slice(0, 20)}..." \\\n  -H "Authorization: Bearer ${anonKey.slice(0, 20)}..."`

  const handleCopyText = (text, type) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(type)
    toast.success('Berhasil disalin ke clipboard!')
    setTimeout(() => setCopiedKey(''), 2000)
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Integrasi API SIAKAD</h1>
        <p className="page-subtitle">Hubungkan draf RPS dan rencana pembelajaran mingguan SIRA-SYS ke portal SIAKAD kampus secara real-time.</p>
      </div>

      <div className="dashboard-grid">
        
        {/* API Docs & Guides */}
        <div className="card span-1">
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Database size={16} color="#4f46e5" />
            <span style={{ fontWeight: 700, fontSize: 14 }}>Spesifikasi Integrasi REST API</span>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            
            <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
              Supabase secara otomatis memetakan seluruh tabel SIRA-SYS menjadi endpoint REST API yang aman dan siap digunakan. 
              Sistem SIAKAD kampus dapat melakukan request HTTP GET untuk mengambil rencana perkuliahan dan menampilkannya di halaman dashboard mahasiswa masing-masing.
            </div>

            {/* Base Endpoint info */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 6 }}>
                Base Endpoint URL
              </div>
              <div style={{
                background: '#f1f5f9', border: '1px solid #cbd5e1',
                padding: '10px 14px', borderRadius: 6, display: 'flex',
                alignItems: 'center', justifyContent: 'space-between', fontSize: 12.5
              }}>
                <code style={{ color: '#4f46e5', fontWeight: 600 }}>{apiBaseUrl}/rest/v1</code>
                <button 
                  className="btn btn-ghost btn-icon btn-sm"
                  onClick={() => handleCopyText(`${apiBaseUrl}/rest/v1`, 'base')}
                  style={{ padding: 4 }}
                >
                  {copiedKey === 'base' ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                </button>
              </div>
            </div>

            {/* Auth Headers */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 8 }}>
                Header Autentikasi API
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', gap: 10, padding: '8px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, width: 90, color: 'var(--gray-600)' }}>apikey:</span>
                  <span style={{ fontFamily: 'monospace', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{anonKey}</span>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleCopyText(anonKey, 'apikey')} style={{ padding: 2 }}>
                    {copiedKey === 'apikey' ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 10, padding: '8px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, width: 90, color: 'var(--gray-600)' }}>Authorization:</span>
                  <span style={{ fontFamily: 'monospace', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Bearer [anon_key]</span>
                </div>
              </div>
            </div>

            {/* Query parameters list */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 8 }}>
                Contoh Filter Query (HTTP GET)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12 }}>
                <div style={{ padding: '8px 12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6 }}>
                  <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: 2 }}>Ambil Semua RPS Disetujui:</div>
                  <code style={{ color: '#4f46e5', fontSize: 11, display: 'block', margin: '4px 0', wordBreak: 'break-all' }}>/rps?status=eq.approved</code>
                </div>
                <div style={{ padding: '8px 12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6 }}>
                  <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: 2 }}>Ambil Pertemuan per Mata Kuliah:</div>
                  <code style={{ color: '#4f46e5', fontSize: 11, display: 'block', margin: '4px 0', wordBreak: 'break-all' }}>/rps?mk_id=eq.[mk-uuid]&select=rencana_pembelajaran</code>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Sandbox Playground */}
        <div className="card span-1" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Terminal size={16} color="#4f46e5" />
              <span style={{ fontWeight: 700, fontSize: 14 }}>Playground API & Preview JSON</span>
            </div>
            
            {/* Select RPS dropdown */}
            {rpsList.length > 0 && (
              <select 
                className="input" 
                value={selectedRpsId} 
                onChange={e => handleSelectRps(e.target.value)}
                style={{ width: 220, padding: '4px 8px', fontSize: 12, margin: 0 }}
              >
                {rpsList.map(r => (
                  <option key={r.id} value={r.id}>{r.mk?.kode_mk} - {r.mk?.nama_mk}</option>
                ))}
              </select>
            )}
          </div>
          
          <div className="card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, flex: 1 }}>
                <div className="spinner" style={{ width: 20, height: 20 }} />
              </div>
            ) : rpsList.length === 0 ? (
              <div className="empty-state" style={{ padding: 24 }}>
                <div className="empty-state-icon">📊</div>
                <div className="empty-state-text" style={{ fontSize: 12.5 }}>Data RPS Approved Belum Ada</div>
                <div className="empty-state-sub" style={{ fontSize: 11.5 }}>Harus ada minimal 1 RPS berstatus 'Approved' di prodi ini untuk memulai playground.</div>
              </div>
            ) : (
              <>
                {/* Generated cURL command */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.4px' }}>
                      cURL Command
                    </span>
                    <button 
                      className="btn btn-ghost btn-sm" 
                      onClick={() => handleCopyText(`curl -X GET "${testUrl}" -H "apikey: ${anonKey}" -H "Authorization: Bearer ${anonKey}"`, 'curl')}
                      style={{ fontSize: 10, display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px' }}
                    >
                      {copiedKey === 'curl' ? <Check size={11} color="#10b981" /> : <Copy size={11} />} Salin cURL
                    </button>
                  </div>
                  <pre style={{
                    margin: 0, padding: '10px 14px', background: '#1e293b', color: '#38bdf8',
                    fontFamily: 'monospace', fontSize: '11px', borderRadius: 6, overflow: 'auto',
                    border: '1px solid #0f172a', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-all'
                  }}>
                    {curlCommand}
                  </pre>
                </div>

                {/* API Request URL */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.4px' }}>
                      HTTP Request URL
                    </span>
                    <button 
                      className="btn btn-ghost btn-sm" 
                      onClick={() => handleCopyText(testUrl, 'url')}
                      style={{ fontSize: 10, display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px' }}
                    >
                      {copiedKey === 'url' ? <Check size={11} color="#10b981" /> : <Copy size={11} />} Salin URL
                    </button>
                  </div>
                  <div style={{
                    padding: '8px 12px', background: '#f8fafc', border: '1px solid #cbd5e1',
                    borderRadius: 6, fontSize: '11px', fontFamily: 'monospace', color: '#097eed',
                    wordBreak: 'break-all', lineHeight: 1.4
                  }}>
                    {testUrl}
                  </div>
                </div>

                {/* JSON payload output */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 6 }}>
                    Response Payload (JSON)
                  </div>
                  <pre style={{
                    margin: 0, padding: '12px 16px', background: '#0f172a', color: '#e2e8f0',
                    fontFamily: 'monospace', fontSize: '11px', borderRadius: 8, overflow: 'auto',
                    border: '1px solid #1e293b', lineHeight: 1.5, flex: 1, maxHeight: '250px'
                  }}>
                    {JSON.stringify(payload, null, 2)}
                  </pre>
                </div>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
