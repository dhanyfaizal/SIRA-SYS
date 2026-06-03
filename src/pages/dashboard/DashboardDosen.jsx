import { FileText, PlusCircle, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export default function DashboardDosen() {
  const { profile } = useAuth()
  const nama = profile?.nama_lengkap?.split(' ')[0] || 'Dosen'

  const stats = [
    { label:'Total RPS',   value:'0', sub:'Semester ini',   icon:FileText,      color:'#eef2ff', iconColor:'#4f46e5' },
    { label:'Disetujui',   value:'0', sub:'Selesai review', icon:CheckCircle,   color:'#d1fae5', iconColor:'#10b981' },
    { label:'Menunggu',    value:'0', sub:'Belum disubmit', icon:Clock,         color:'#fef3c7', iconColor:'#f59e0b' },
    { label:'Perlu Revisi',value:'0', sub:'Ada catatan',    icon:AlertCircle,   color:'#fee2e2', iconColor:'#ef4444' },
  ]

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Selamat datang, {nama} 👋</h1>
        <p className="page-subtitle">Kelola Rencana Pembelajaran Semester Anda di sini.</p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {stats.map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-card-icon" style={{ background: s.color }}>
              <s.icon size={18} color={s.iconColor} />
            </div>
            <div className="stat-card-label">{s.label}</div>
            <div className="stat-card-value">{s.value}</div>
            <div className="stat-card-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="dashboard-grid">
        <div className="card span-2">
          <div className="card-header">
            <span style={{ fontWeight:700, fontSize:14, color:'var(--gray-900)' }}>RPS Terbaru</span>
            <NavLink to="/rps" className="btn btn-ghost btn-sm">Lihat semua</NavLink>
          </div>
          <div className="card-body">
            <div className="empty-state">
              <div className="empty-state-icon">📄</div>
              <div className="empty-state-text">Belum ada RPS</div>
              <div className="empty-state-sub">Mulai buat RPS pertama Anda</div>
              <NavLink to="/rps/new" className="btn btn-primary btn-sm" style={{ marginTop:8 }}>
                <PlusCircle size={14} /> Buat RPS Baru
              </NavLink>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
