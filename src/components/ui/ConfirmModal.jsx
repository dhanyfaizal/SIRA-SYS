import React from 'react'
import { AlertTriangle, Info, HelpCircle } from 'lucide-react'

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Ya, Hapus',
  cancelText = 'Batal',
  type = 'danger', // 'danger' | 'warning' | 'info'
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null

  const typeConfig = {
    danger: {
      bg: '#fee2e2',
      color: '#ef4444',
      icon: <AlertTriangle size={24} />,
      confirmBg: '#ef4444',
      confirmBorder: '#dc2626',
      confirmText: '#fff',
    },
    warning: {
      bg: '#fef3c7',
      color: '#d97706',
      icon: <AlertTriangle size={24} />,
      confirmBg: '#d97706',
      confirmBorder: '#b45309',
      confirmText: '#fff',
    },
    info: {
      bg: '#eef2ff',
      color: '#6366f1',
      icon: <Info size={24} />,
      confirmBg: '#6366f1',
      confirmBorder: '#4f46e5',
      confirmText: '#fff',
    },
  }

  const cfg = typeConfig[type] || typeConfig.info

  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.4)',
      backdropFilter: 'blur(4px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      animation: 'fadeIn .2s ease-out'
    }}>
      <div className="card" style={{
        width: '100%',
        maxWidth: 400,
        padding: 24,
        boxShadow: 'var(--shadow-lg)',
        textAlign: 'center',
        background: '#fff',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--gray-200)',
        animation: 'scaleIn .2s ease'
      }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: cfg.bg,
          color: cfg.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px'
        }}>
          {cfg.icon}
        </div>
        
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--gray-900)', marginBottom: 8 }}>
          {title}
        </h3>
        
        <p style={{ fontSize: 13, color: 'var(--gray-500)', lineHeight: 1.5, marginBottom: 24 }}>
          {message}
        </p>
        
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button
            className="btn btn-secondary"
            onClick={onCancel}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            {cancelText}
          </button>
          <button
            className="btn"
            onClick={onConfirm}
            style={{
              flex: 1,
              justifyContent: 'center',
              background: cfg.confirmBg,
              borderColor: cfg.confirmBorder,
              color: cfg.confirmText,
              fontWeight: 600
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
