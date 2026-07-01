import { useState } from 'react'
import { createAdvance } from '../services/api'
import { formatRupiah, formatRupiahInput, parseRupiahInput } from '../utils/format'
import { openCashDrawerOnly } from '../utils/rawbt'
import Toast from '../components/Toast'
import { useToast } from '../hooks/useToast'

export default function CrewDashboard({ employee, onClose }) {
  const { toast, showToast, clearToast } = useToast()
  const [step, setStep] = useState('menu') // menu | method | form
  const [via, setVia] = useState('cash')
  const [amount, setAmount] = useState('')
  const [amountRaw, setAmountRaw] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  const parsedAmount = parseRupiahInput(amountRaw) || 0

  const handleSubmit = async () => {
    if (!parsedAmount) { showToast('Masukkan nominal kasbon', 'error'); return }
    setLoading(true)
    try {
      const noteText = note ? `${note} [via ${via}]` : `Kasbon via ${via}`
      // Trigger drawer immediately (still within user-gesture) before awaiting network call
      if (via === 'cash') openCashDrawerOnly()
      await createAdvance({
        employee_id: employee.id,
        amount: parsedAmount,
        note: noteText,
      })
      if (via === 'cash') {
        showToast('Kasbon berhasil! Laci kasir dibuka.', 'success')
      } else {
        showToast('Kasbon berhasil! Owner akan segera transfer.', 'info')
      }
      setTimeout(onClose, 1800)
    } catch (e) {
      showToast(e.message || 'Gagal menyimpan kasbon', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-blue-500 p-5 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <p className="text-white font-bold">{employee.name}</p>
            <p className="text-white/70 text-sm">{employee.position || '-'}</p>
          </div>
          <button onClick={onClose} className="ml-auto w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white">✕</button>
        </div>

        {/* Menu */}
        {step === 'menu' && (
          <div className="p-6 space-y-3">
            <p className="text-center text-gray-500 text-sm mb-4">Pilih aksi</p>
            <button onClick={() => setStep('method')}
              className="w-full py-4 rounded-2xl bg-amber-400 text-white font-bold text-base shadow hover:bg-amber-500 active:scale-95 transition-all flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
              </svg>
              Kasbon
            </button>
            <button onClick={onClose}
              className="w-full py-4 rounded-2xl bg-primary text-white font-bold text-base shadow hover:bg-primary-dark active:scale-95 transition-all flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Keluar
            </button>
          </div>
        )}

        {/* Method Picker */}
        {step === 'method' && (
          <div className="p-6">
            <p className="text-center text-gray-600 font-semibold mb-5">Metode Kasbon</p>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <button onClick={() => { setVia('cash'); setStep('form') }}
                className="flex flex-col items-center justify-center gap-2 py-7 rounded-2xl bg-green-500 text-white font-bold text-lg shadow hover:bg-green-600 active:scale-95 transition-all">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
                </svg>
                CASH
              </button>
              <button onClick={() => { setVia('transfer'); setStep('form') }}
                className="flex flex-col items-center justify-center gap-2 py-7 rounded-2xl bg-primary text-white font-bold text-lg shadow hover:bg-primary-dark active:scale-95 transition-all">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                TRANSFER
              </button>
            </div>
            <button onClick={() => setStep('menu')} className="w-full py-2.5 rounded-2xl border border-gray-200 text-gray-500 text-sm">← Kembali</button>
          </div>
        )}

        {/* Form */}
        {step === 'form' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${via === 'cash' ? 'bg-green-100 text-green-600' : 'bg-primary/10 text-primary'}`}>
                via {via === 'cash' ? 'Cash' : 'Transfer'}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Masukkan Nominal</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">Rp</span>
                <input type="text" inputMode="numeric"
                  value={amountRaw}
                  onChange={e => { const v = formatRupiahInput(e.target.value); setAmountRaw(v); setAmount(String(parseRupiahInput(v))) }}
                  placeholder="0"
                  className="w-full pl-10 pr-4 py-3.5 rounded-2xl border border-gray-200 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              {parsedAmount > 0 && <p className="text-xs text-primary mt-1 ml-1">{formatRupiah(parsedAmount)}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Catatan (Opsional)</label>
              <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Keperluan mendadak..."
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            {via === 'cash' && (
              <p className="text-xs text-orange-500 flex items-center gap-1">⚠️ Laci kasir akan terbuka otomatis</p>
            )}
            {via === 'transfer' && (
              <p className="text-xs text-teal-600 flex items-center gap-1">ℹ️ Owner akan menerima notifikasi untuk transfer</p>
            )}
            <div className="flex gap-3 pt-1">
              <button onClick={() => setStep('method')} className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-600 font-medium">← Kembali</button>
              <button onClick={handleSubmit} disabled={!parsedAmount || loading}
                className="flex-1 py-3 rounded-2xl bg-primary text-white font-bold hover:bg-primary-dark disabled:opacity-40 transition-all">
                {loading ? 'Menyimpan...' : '▶ Ajukan'}
              </button>
            </div>
          </div>
        )}
      </div>

      {toast && <Toast key={toast.id} message={toast.message} type={toast.type} onClose={clearToast} />}
    </div>
  )
}
