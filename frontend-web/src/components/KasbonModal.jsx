import { useState } from 'react'
import { formatRupiah, formatRupiahInput, parseRupiahInput } from '../utils/format'

export default function KasbonModal({ employee, onConfirm, onCancel, loading = false }) {
  const [amount, setAmount] = useState('')
  const [amountRaw, setAmountRaw] = useState('')
  const [via, setVia] = useState('cash')
  const [note, setNote] = useState('')

  const parsedAmount = parseRupiahInput(amountRaw) || 0

  const handleAmountChange = (e) => {
    const v = formatRupiahInput(e.target.value)
    setAmountRaw(v)
    setAmount(String(parseRupiahInput(v)))
  }

  const handleSubmit = () => {
    if (!parsedAmount || parsedAmount <= 0) return
    onConfirm({ amount: parsedAmount, via, note })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center p-4 justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 pb-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-800">Pengajuan Kasbon</h2>
            <p className="text-sm text-gray-500">{employee?.name}</p>
          </div>
        </div>

        {/* Amount */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Jumlah Kasbon</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">Rp</span>
            <input
              type="text"
              inputMode="numeric"
              value={amountRaw}
              onChange={handleAmountChange}
              placeholder="0"
              className="w-full pl-10 pr-4 py-3.5 rounded-2xl border border-gray-200 text-gray-800 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
          {parsedAmount > 0 && (
            <p className="text-xs text-primary mt-1 ml-1">{formatRupiah(parsedAmount)}</p>
          )}
        </div>

        {/* Via */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Metode Pembayaran</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setVia('cash')}
              className={`flex items-center justify-center gap-2 py-3 rounded-2xl border-2 font-semibold transition-all ${
                via === 'cash'
                  ? 'border-orange-400 bg-orange-50 text-orange-600'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
              </svg>
              Cash
            </button>
            <button
              onClick={() => setVia('transfer')}
              className={`flex items-center justify-center gap-2 py-3 rounded-2xl border-2 font-semibold transition-all ${
                via === 'transfer'
                  ? 'border-teal-500 bg-teal-50 text-teal-600'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              Transfer
            </button>
          </div>
          {via === 'transfer' && (
            <p className="text-xs text-teal-600 mt-2 ml-1 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              Owner akan menerima notifikasi untuk transfer
            </p>
          )}
          {via === 'cash' && (
            <p className="text-xs text-orange-500 mt-2 ml-1 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              Laci kasir akan terbuka otomatis
            </p>
          )}
        </div>

        {/* Note */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Catatan (opsional)</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Keperluan kasbon..."
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 h-12 rounded-2xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={parsedAmount <= 0 || loading}
            className="flex-1 h-12 rounded-2xl bg-primary text-white font-semibold hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                Menyimpan...
              </span>
            ) : 'Ajukan Kasbon'}
          </button>
        </div>
      </div>
    </div>
  )
}
