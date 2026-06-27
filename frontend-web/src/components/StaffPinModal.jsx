import { useState, useRef, useEffect } from 'react'
import { identifyByPin } from '../services/api'

export default function StaffPinModal({ title = 'Verifikasi Karyawan', onConfirm, onCancel }) {
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const handleDigit = (d) => { if (pin.length < 6) setPin(p => p + d) }
  const handleBackspace = () => setPin(p => p.slice(0, -1))

  const handleSubmit = async () => {
    if (!pin) return
    setLoading(true)
    setError('')
    try {
      const res = await identifyByPin(pin)
      onConfirm(res.employee)
    } catch (e) {
      setError(e.message || 'PIN tidak dikenali')
      setPin('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 pb-8">
        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h2 className="text-base font-bold text-gray-800">{title}</h2>
          <p className="text-sm text-gray-500 mt-0.5">Masukkan PIN karyawan yang melayani</p>
        </div>

        <div className="flex justify-center gap-3 mb-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${i < pin.length ? 'bg-primary scale-110' : 'bg-gray-300'}`} />
          ))}
        </div>

        {error && <p className="text-red-500 text-center text-sm mb-3">{error}</p>}

        <input ref={inputRef} type="password" inputMode="numeric" maxLength={6} value={pin}
          onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
          className="sr-only" />

        <div className="grid grid-cols-3 gap-3 mb-4">
          {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((d, i) => {
            if (d === '') return <div key={i} />
            const isBack = d === '⌫'
            return (
              <button key={i} onClick={() => isBack ? handleBackspace() : handleDigit(d)}
                className={`h-14 rounded-2xl text-xl font-semibold transition-all active:scale-95 ${isBack ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-gray-50 text-gray-800 hover:bg-primary/10 hover:text-primary'}`}>
                {d}
              </button>
            )
          })}
        </div>

        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 h-12 rounded-2xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50">Batal</button>
          <button onClick={handleSubmit} disabled={pin.length === 0 || loading}
            className="flex-1 h-12 rounded-2xl bg-primary text-white font-semibold hover:bg-primary-dark disabled:opacity-40 transition-colors">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                Cek...
              </span>
            ) : 'Lanjut'}
          </button>
        </div>
      </div>
    </div>
  )
}
