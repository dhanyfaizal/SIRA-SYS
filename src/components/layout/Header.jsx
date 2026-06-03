import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  PanelLeftOpen, PanelLeftClose, Sun, Moon,
  ChevronDown, LogOut, User, KeyRound, Settings, Bell,
} from 'lucide-react'
import { useAuth }    from '@/contexts/AuthContext'
import { useTheme }   from '@/contexts/ThemeContext'
import { useSidebar } from './AppLayout'
import { dbNotifications } from '@/lib/db'
import toast from 'react-hot-toast'

export default function Header() {
  const { profile, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { open, toggle }     = useSidebar()
  const navigate             = useNavigate()

  const [dropOpen, setDropOpen] = useState(false)
  const dropRef = useRef(null)

  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const notifRef = useRef(null)

  const loadNotifications = async () => {
    if (!profile?.id) return
    try {
      const { data } = await dbNotifications.getAll(profile.id)
      setNotifications(data ?? [])
      const { count } = await dbNotifications.getUnreadCount(profile.id)
      setUnreadCount(count ?? 0)
    } catch (err) {
      console.error('Error loading notifications:', err)
    }
  }

  useEffect(() => {
    loadNotifications()
    // Poll every 60 seconds for notification count/updates
    const interval = setInterval(loadNotifications, 60_000)
    return () => clearInterval(interval)
  }, [profile?.id])

  useEffect(() => {
    function handler(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false)
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleMarkAllRead = async () => {
    if (!profile?.id) return
    try {
      await dbNotifications.markAllAsRead(profile.id)
      setUnreadCount(0)
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      toast.success('Semua notifikasi ditandai sebagai terbaca')
    } catch (err) {
      console.error(err)
    }
  }

  const handleNotifClick = async (notif) => {
    setNotifOpen(false)
    if (!notif.is_read) {
      try {
        await dbNotifications.markAsRead(notif.id)
        setUnreadCount(prev => Math.max(0, prev - 1))
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n))
      } catch (err) {
        console.error(err)
      }
    }
    if (notif.link) {
      navigate(notif.link)
    }
  }

  const initials = profile?.nama_lengkap
    ? profile.nama_lengkap.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U'

  return (
    <header className="app-header">
      {/* Sidebar toggle */}
      <button onClick={toggle} className="btn btn-ghost btn-icon" title={open ? 'Sembunyikan sidebar' : 'Tampilkan sidebar'}>
        {open ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
      </button>

      <span className="header-sep" />

      {/* Brand */}
      <span style={{ fontSize:15, fontWeight:800, color:'var(--gray-900)', letterSpacing:'-.3px' }}>
        SIRA-SYS
      </span>

      {/* Actions */}
      <div className="header-actions">
        {/* Theme toggle */}
        <button className="btn btn-ghost btn-icon" onClick={toggleTheme} title={theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}>
          {theme === 'dark' ? <Sun size={16} color="#fbbf24" /> : <Moon size={16} />}
        </button>

        {/* Notifications */}
        <div ref={notifRef} style={{ position:'relative' }}>
          <button className="btn btn-ghost btn-icon" onClick={() => setNotifOpen(v => !v)} title="Notifikasi" style={{ position: 'relative' }}>
            <Bell size={16} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: 4,
                right: 4,
                background: '#ef4444',
                color: '#ffffff',
                fontSize: '9px',
                fontWeight: 700,
                borderRadius: '50%',
                width: 14,
                height: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 0 2px var(--header-bg, #ffffff)'
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="dropdown-menu" style={{ width: 320, right: 0, padding: 0, maxHeight: 400, overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid var(--gray-100)' }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--gray-900)' }}>Notifikasi</span>
                {unreadCount > 0 && (
                  <button 
                    onClick={handleMarkAllRead} 
                    style={{ background: 'none', border: 'none', color: '#4f46e5', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Tandai semua terbaca
                  </button>
                )}
              </div>

              <div style={{ padding: '6px 0' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--gray-400)', fontSize: 12 }}>
                    Tidak ada notifikasi baru
                  </div>
                ) : (
                  notifications.map(n => (
                    <div 
                      key={n.id} 
                      onClick={() => handleNotifClick(n)}
                      style={{
                        padding: '10px 14px',
                        borderBottom: '1px solid var(--gray-50)',
                        cursor: 'pointer',
                        background: n.is_read ? 'transparent' : 'var(--indigo-50, #f5f3ff)',
                        transition: 'background 0.15s'
                      }}
                      className="dropdown-item-notif"
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: n.is_read ? 600 : 700, fontSize: 12, color: 'var(--gray-900)' }}>{n.title}</span>
                          {!n.is_read && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4f46e5', flexShrink: 0 }} />}
                        </div>
                        <p style={{ fontSize: 11, color: 'var(--gray-500)', margin: 0, lineHeight: 1.4 }}>{n.message}</p>
                        <span style={{ fontSize: 9, color: 'var(--gray-400)', marginTop: 4 }}>
                          {new Date(n.created_at).toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User dropdown */}
        <div ref={dropRef} style={{ position:'relative' }}>
          <button className="avatar-btn" onClick={() => setDropOpen(v => !v)}>
            <div className="avatar">
              {profile?.foto_url
                ? <img src={profile.foto_url} alt={profile.nama_lengkap} />
                : initials
              }
            </div>
            <span className="avatar-name" style={{ maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {profile?.nama_lengkap || 'Pengguna'}
            </span>
            <ChevronDown size={12} color="var(--gray-400)" />
          </button>

          {dropOpen && (
            <div className="dropdown-menu">
              <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--gray-100)' }}>
                <div style={{ fontWeight:600, fontSize:13, color:'var(--gray-900)' }}>
                  {profile?.nama_lengkap || 'Pengguna'}
                </div>
                <div style={{ fontSize:11, color:'var(--gray-400)', marginTop:2 }}>
                  {profile?.role?.toUpperCase()}
                  {profile?.nidn ? ` · ${profile.nidn}` : ''}
                </div>
              </div>

              <button className="dropdown-item" onClick={() => { navigate('/profile'); setDropOpen(false) }}>
                <User size={14} /> Profil Saya
              </button>
              <button className="dropdown-item" onClick={() => { navigate('/settings/ai'); setDropOpen(false) }}>
                <KeyRound size={14} /> Pengaturan AI Key
              </button>
              <button className="dropdown-item" onClick={() => { navigate('/settings'); setDropOpen(false) }}>
                <Settings size={14} /> Pengaturan
              </button>

              <div className="dropdown-sep" />

              <button className="dropdown-item danger" onClick={signOut}>
                <LogOut size={14} /> Keluar
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
