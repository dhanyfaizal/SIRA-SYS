import { RefreshCw, Sparkles } from 'lucide-react'

export default function AiProgressModal({ isOpen, title = 'Pemrosesan AI', progressText }) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" style={{ zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="modal" style={{ maxWidth: 440, padding: '28px 32px', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          {/* Animated Loader Icon */}
          <div style={{ position: 'relative', display: 'inline-flex' }}>
            <RefreshCw className="spinner" size={44} style={{ color: 'var(--indigo-600)', animation: 'spin 1.2s linear infinite' }} />
            <Sparkles size={20} color="var(--indigo-500)" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
            <span style={{ 
              fontSize: 10, 
              fontWeight: 700, 
              color: 'var(--indigo-600)', 
              background: 'var(--indigo-50)', 
              padding: '3px 10px', 
              borderRadius: 12,
              textTransform: 'uppercase',
              letterSpacing: '.5px',
              alignSelf: 'center',
              width: 'fit-content'
            }}>
              {title}
            </span>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#1e293b', minHeight: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s', marginTop: 4, px: 10 }}>
              {progressText || 'Menghubungi server AI...'}
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', maxWidth: 320, marginTop: 4, alignSelf: 'center' }}>
              AI SIRA-SYS sedang memproses permintaan Anda secara mendalam. Mohon tunggu beberapa saat.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
