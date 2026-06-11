import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'

export default function Step5Penilaian({ form, setF }) {
  const penilaian = form.penilaian

  // Local state for dynamic evaluation components
  const [items, setItems] = useState(() => {
    const entries = Object.entries(penilaian || {})
    if (entries.length === 0) {
      // Default initial components
      return [
        { id: '1', label: 'UTS (Ujian Tengah Semester)', bobot: 30 },
        { id: '2', label: 'UAS (Ujian Akhir Semester)', bobot: 35 },
        { id: '3', label: 'Tugas / Kuis', bobot: 20 },
        { id: '4', label: 'Kehadiran', bobot: 5 },
        { id: '5', label: 'Lainnya', bobot: 10 }
      ]
    }
    return entries.map(([k, v], idx) => {
      let label = k
      if (k === 'uts') label = 'UTS (Ujian Tengah Semester)'
      else if (k === 'uas') label = 'UAS (Ujian Akhir Semester)'
      else if (k === 'tugas') label = 'Tugas / Kuis'
      else if (k === 'praktikum') label = 'Praktikum'
      else if (k === 'kehadiran') label = 'Kehadiran'
      return { id: String(idx + 1), label, bobot: Number(v || 0) }
    })
  })

  // Sync items array to parent form state object
  function syncToForm(newItems) {
    const obj = {}
    newItems.forEach(item => {
      const key = item.label.trim()
      if (key) {
        obj[key] = item.bobot
      }
    })
    setF('penilaian', obj)
  }

  // Bobot calculations
  const total = items.reduce((a, b) => a + Number(b.bobot || 0), 0)
  const ok = total === 100

  // Mutate component item
  function updateItem(id, field, val) {
    const newItems = items.map(item => {
      if (item.id === id) {
        if (field === 'bobot') {
          const num = Math.max(0, Math.min(100, Number(val) || 0))
          return { ...item, bobot: num }
        }
        return { ...item, [field]: val }
      }
      return item
    })
    setItems(newItems)
    syncToForm(newItems)
  }

  function addComponent() {
    const newItems = [...items, { id: String(Date.now()), label: '', bobot: 0 }]
    setItems(newItems)
    syncToForm(newItems)
  }

  function removeComponent(id) {
    const newItems = items.filter(item => item.id !== id)
    setItems(newItems)
    syncToForm(newItems)
  }

  return (
    <div>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
        Bobot Penilaian
      </h2>
      <p style={{ fontSize: 13, color: '#64748b', marginBottom: 24 }}>
        Tentukan bobot komponen penilaian (total harus 100%).
      </p>

      {/* Komponen Penilaian */}
      <div style={{ marginBottom: 28 }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.4px' }}>
            Komponen Penilaian
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={addComponent} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Plus size={12} /> Tambah Komponen
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map(item => (
            <div key={item.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '8px 12px', borderRadius: 8,
              border: '1px solid #e2e8f0', background: '#fff',
            }}>
              {/* Component name input */}
              <input
                className="input"
                style={{ flex: 1, border: 'none', background: 'transparent', padding: '4px 0', fontSize: 13, fontWeight: 500 }}
                value={item.label}
                onChange={e => updateItem(item.id, 'label', e.target.value)}
                placeholder="cth. Ujian Tengah Semester (UTS) / Kuis Mandiri"
              />

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="number" min={0} max={100}
                  className="input"
                  style={{ width: 70, textAlign: 'center', padding: '4px 6px' }}
                  value={item.bobot}
                  onChange={e => updateItem(item.id, 'bobot', e.target.value)}
                />
                <span style={{ fontSize: 12, color: '#94a3b8', width: 12 }}>%</span>
                <button
                  type="button"
                  className="btn btn-ghost btn-icon btn-sm"
                  style={{ color: '#ef4444', padding: 2 }}
                  onClick={() => removeComponent(item.id)}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Total indicator */}
        <div style={{
          marginTop: 12, padding: '10px 14px', borderRadius: 8,
          background: ok ? '#f0fdf4' : total > 100 ? '#fef2f2' : '#fffbeb',
          border: ok ? '1px solid #bbf7d0' : total > 100 ? '1px solid #fecaca' : '1px solid #fde68a',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: ok ? '#065f46' : total > 100 ? '#991b1b' : '#92400e' }}>
            {ok ? '✓ Total bobot sudah tepat' : total > 100 ? '⚠ Total melebihi 100%' : '⚠ Total belum mencapai 100%'}
          </span>
          <span style={{
            fontSize: 22, fontWeight: 800,
            color: ok ? '#10b981' : total > 100 ? '#ef4444' : '#f59e0b',
          }}>
            {total}%
          </span>
        </div>

        {/* Progress bar bobot */}
        <div style={{ height: 6, background: '#e2e8f0', borderRadius: 99, marginTop: 8, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${Math.min(total, 100)}%`,
            background: ok ? '#10b981' : total > 100 ? '#ef4444' : '#f59e0b',
            borderRadius: 99, transition: 'width .3s',
          }} />
        </div>
      </div>

    </div>
  )
}
