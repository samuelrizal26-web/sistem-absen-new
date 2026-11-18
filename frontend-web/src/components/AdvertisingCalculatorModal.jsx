import { useState } from 'react'
import AcrylicCalculatorModal from './AcrylicCalculatorModal'

// Satu tombol "Kalkulator" di Home → modal bertab produk.
// Tab yang belum dibangun ditandai "Segera" dan akan diaktifkan bertahap.
const PRODUCT_TABS = [
  { key: 'akrilik', label: 'Akrilik', icon: '🟦', ready: true },
  { key: 'neonbox', label: 'Neonbox', icon: '💡', ready: false },
  { key: 'huruf', label: 'Huruf Timbul', icon: '🔤', ready: false },
  { key: 'rambu', label: 'Rambu / Papan Nama', icon: '🪧', ready: false },
  { key: 'neonflex', label: 'Neonflex', icon: '✨', ready: false },
]

export default function AdvertisingCalculatorModal({ onClose, showToast }) {
  const [active, setActive] = useState('akrilik')
  const current = PRODUCT_TABS.find(t => t.key === active)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="px-6 py-4 flex items-center justify-between text-white"
          style={{ background: 'linear-gradient(135deg, #0A4D68 0%, #088395 100%)' }}>
          <div>
            <h2 className="text-lg font-bold">Kalkulator Advertising</h2>
            <p className="text-xs text-white/80">Pilih produk untuk hitung harga penawaran</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">✕</button>
        </div>

        {/* Tab produk */}
        <div className="flex gap-2 overflow-x-auto px-4 py-3 border-b border-gray-100 bg-gray-50">
          {PRODUCT_TABS.map(t => (
            <button key={t.key} onClick={() => setActive(t.key)}
              className={`shrink-0 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${active === t.key ? 'bg-cyan-600 text-white border-cyan-600 shadow' : 'bg-white text-gray-600 border-gray-200'} ${!t.ready ? 'opacity-70' : ''}`}>
              {t.icon} {t.label}
              {!t.ready && <span className="ml-1 text-[9px] font-semibold opacity-80">Segera</span>}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto">
          {active === 'akrilik' && <AcrylicCalculatorModal embedded onClose={onClose} showToast={showToast} />}
          {!current.ready && (
            <div className="p-10 text-center">
              <p className="text-4xl mb-3">{current.icon}</p>
              <p className="font-bold text-gray-700">{current.label}</p>
              <p className="text-sm text-gray-400 mt-1">Kalkulator ini sedang disiapkan dan akan aktif segera.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
