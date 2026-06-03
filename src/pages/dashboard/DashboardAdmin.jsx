import { Users, GraduationCap, Settings, Shield } from 'lucide-react'

export default function DashboardAdmin() {
  const stats = [
    { label:'Total Pengguna', value:'0', icon:Users,         color:'#eef2ff', iconColor:'#4f46e5' },
    { label:'Program Studi',  value:'4', icon:GraduationCap, color:'#d1fae5', iconColor:'#10b981' },
    { label:'Total RPS',      value:'0', icon:Shield,        color:'#fef3c7', iconColor:'#f59e0b' },
    { label:'Dosen Aktif',    value:'0', icon:Settings,      color:'#ede9fe', iconColor:'#7c3aed' },
  ]
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard Administrator</h1>
        <p className="page-subtitle">Kelola seluruh sistem SIRA-SYS dari sini.</p>
      </div>
      <div className="stats-grid">
        {stats.map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-card-icon" style={{ background: s.color }}>
              <s.icon size={18} color={s.iconColor} />
            </div>
            <div className="stat-card-label">{s.label}</div>
            <div className="stat-card-value">{s.value}</div>
          </div>
        ))}
      </div>
      <div className="card">
        <div className="card-header">
          <span style={{ fontWeight:700, fontSize:14 }}>Program Studi</span>
        </div>
        <div className="card-body">
          {[
            { kode:'SI',  nama:'Sistem Informasi' },
            { kode:'KA',  nama:'Komputerisasi Akuntansi' },
            { kode:'TI',  nama:'Teknik Informatika' },
            { kode:'DKV', nama:'Desain Komunikasi Visual' },
          ].map(p => (
            <div key={p.kode} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid var(--gray-100)' }}>
              <span className="badge-pill badge-indigo">{p.kode}</span>
              <span style={{ fontSize:13, color:'var(--gray-700)', fontWeight:500 }}>{p.nama}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
