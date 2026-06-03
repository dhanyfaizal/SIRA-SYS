import { useState, useEffect } from 'react'
import { KeyRound, Server, CheckCircle2, XCircle, RotateCcw, Save, Sparkles, RefreshCw, Eye, EyeOff } from 'lucide-react'
import { getAiConfig, saveAiConfig, resetAiConfig, testConnection } from '@/lib/ai'
import toast from 'react-hot-toast'

export default function AiSettingsPage() {
  const [key, setKey] = useState('')
  const [url, setUrl] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null) // null, 'success', 'error'
  const [testError, setTestError] = useState('')
  const [isCustom, setIsCustom] = useState(false)

  // Muat konfigurasi awal
  useEffect(() => {
    loadConfig()
  }, [])

  function loadConfig() {
    const config = getAiConfig()
    // Jika custom, isi input form. Jika default, biarkan kosong/tunjukkan placeholder
    if (config.isCustom) {
      setKey(config.apiKey)
      setUrl(config.apiUrl)
    } else {
      setKey('')
      setUrl('')
    }
    setIsCustom(config.isCustom)
    setTestResult(null)
    setTestError('')
  }

  async function handleTest() {
    if (!key.trim()) {
      toast.error('Masukkan API Key terlebih dahulu untuk menguji.')
      return
    }

    setTesting(true)
    setTestResult(null)
    setTestError('')

    try {
      await testConnection(key.trim(), url.trim() || 'https://ai.sumopod.com/v1')
      setTestResult('success')
      toast.success('Koneksi AI Berhasil!')
    } catch (err) {
      setTestResult('error')
      setTestError(err.message || 'Koneksi gagal. Periksa kembali Key dan URL Anda.')
      toast.error('Koneksi AI Gagal.')
    } finally {
      setTesting(false)
    }
  }

  function handleSave() {
    if (key.trim() && !url.trim()) {
      toast.error('Harap isi API Endpoint URL jika Anda memasukkan API Key kustom.')
      return
    }

    saveAiConfig(key, url)
    loadConfig()
    toast.success('Pengaturan AI Key berhasil disimpan!')
  }

  function handleReset() {
    resetAiConfig()
    loadConfig()
    toast.success('Pengaturan AI telah dikembalikan ke default sistem (WebSlide).')
  }

  const systemConfig = {
    url: import.meta.env.VITE_SUMOPOD_API_URL || 'https://ai.sumopod.com/v1',
    key: import.meta.env.VITE_SUMOPOD_API_KEY || 'sk-4eU68ckHgBeC5OoZwiK1ng'
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', animation: 'slideUp 0.3s ease' }}>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={22} color="var(--indigo-600)" />
            Pengaturan AI Key
          </h1>
          <p className="page-subtitle">Hubungkan SIRASYS ke mesin kecerdasan buatan untuk otomatisasi RPS dan audit SPMI</p>
        </div>
        <span className={`badge-pill ${isCustom ? 'badge-amber' : 'badge-indigo'}`}>
          {isCustom ? 'Mode BYOK (Kustom)' : 'Kunci Sistem (WebSlide)'}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Info Box */}
        <div className="card" style={{
          background: 'linear-gradient(135deg, var(--indigo-50), #f5f3ff)',
          borderColor: 'var(--indigo-100)',
          padding: '16px 20px',
          color: 'var(--indigo-700)',
          fontSize: 13,
          lineHeight: 1.5
        }}>
          <strong>Tentang Skema BYOK (Bring Your Own Key):</strong>
          <p style={{ marginTop: 4 }}>
            Secara bawaan, aplikasi ini menggunakan kredensial API dari **Project WebSlide**.
            Anda dapat memasukkan API Key dan Endpoint URL OpenAI-compatible Anda sendiri di bawah ini jika ingin menggunakan kuota atau model AI pribadi. Kunci pribadi disimpan secara aman di peramban lokal Anda dan tidak akan pernah diunggah ke server kami.
          </p>
        </div>

        {/* Configuration Card */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <KeyRound size={16} color="var(--gray-500)" />
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Kredensial AI Service</h3>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            
            {/* Input URL */}
            <div className="input-group">
              <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Server size={14} color="var(--gray-400)" />
                API Endpoint URL
              </label>
              <input
                className="input"
                type="text"
                placeholder={systemConfig.url}
                value={url}
                onChange={e => setUrl(e.target.value)}
              />
              <span className="input-hint">
                Endpoint URL yang kompatibel dengan format OpenAI (contoh: <code>https://ai.sumopod.com/v1</code>). Kosongkan untuk menggunakan default.
              </span>
            </div>

            {/* Input Key */}
            <div className="input-group">
              <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <KeyRound size={14} color="var(--gray-400)" />
                API Key
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input"
                  type={showKey ? 'text' : 'password'}
                  placeholder={isCustom ? 'Masukkan API Key baru...' : `Menggunakan kunci default: ${systemConfig.key.slice(0, 8)}...`}
                  value={key}
                  onChange={e => setKey(e.target.value)}
                  style={{ paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'var(--gray-400)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                  }}
                >
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <span className="input-hint">
                Kunci otorisasi API Key Anda. Disimpan secara lokal di browser per perangkat.
              </span>
            </div>

            {/* Test Connection Section */}
            <div style={{
              marginTop: 10,
              padding: '12px 16px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--gray-50)',
              border: '1px dashed var(--gray-200)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-600)' }}>
                  Uji validitas kredensial sebelum menyimpan:
                </span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleTest}
                  disabled={testing || !key.trim()}
                  style={{ minWidth: 100 }}
                >
                  {testing ? (
                    <>
                      <RefreshCw size={13} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                      Menguji...
                    </>
                  ) : 'Uji Koneksi'}
                </button>
              </div>

              {testResult === 'success' && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, fontSize: 12,
                  color: 'var(--success)', background: '#d1fae5', padding: '8px 12px', borderRadius: 4
                }}>
                  <CheckCircle2 size={15} />
                  Koneksi berhasil! Kredensial AI Anda valid dan siap digunakan.
                </div>
              )}

              {testResult === 'error' && (
                <div style={{
                  display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12,
                  color: 'var(--danger)', background: '#fee2e2', padding: '8px 12px', borderRadius: 4
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                    <XCircle size={15} />
                    Kesalahan Koneksi
                  </div>
                  <div style={{ opacity: 0.9, paddingLeft: 23 }}>{testError}</div>
                </div>
              )}
            </div>

          </div>

          <div className="card-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-ghost text-danger"
              onClick={handleReset}
              disabled={!isCustom}
              style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <RotateCcw size={14} />
              Kembalikan Default
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSave}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Save size={14} />
              Simpan Pengaturan
            </button>
          </div>
        </div>

        {/* Model info card */}
        <div className="card" style={{ padding: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-700)', marginBottom: 8 }}>
            Model AI yang Digunakan
          </h4>
          <p style={{ fontSize: 12, color: 'var(--gray-500)', lineHeight: 1.6 }}>
            Sistem asisten AI SIRASYS dikonfigurasi untuk mencoba model-model berikut secara berurutan (*fallback loop*) guna menjamin ketersediaan layanan meskipun terjadi kehabisan kuota pada salah satu model:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            {['deepseek-v4-pro', 'qwen3.6-plus', 'glm-5.1', 'glm-5', 'deepseek-v4-flash', 'qwen3.6-flash', 'glm-5-turbo'].map(m => (
              <span key={m} className="badge-pill badge-slate" style={{ fontSize: 10 }}>
                {m}
              </span>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
