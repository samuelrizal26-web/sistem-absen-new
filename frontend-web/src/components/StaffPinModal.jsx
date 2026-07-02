import { useState, useRef } from 'react'
import { identifyByPin } from '../services/api'

export default function StaffPinModal({ title = 'Verifikasi Karyawan', onConfirm, onCancel }) {
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)
  const inputRef = useRef(null)

  const handleDigit = (d) => {
    if (pin.length < 6 && !loading) {
      const newPin = pin + d
      setPin(newPin)
      if (newPin.length === 6) {
        handleSubmit(newPin)
      }
    }
  }

  const handleBackspace = () => setPin(p => p.slice(0, -1))

  const handleSubmit = async (pinValue) => {
    const pinToSubmit = pinValue || pin
    if (!pinToSubmit) return
    setLoading(true)
    setError('')
    try {
      const res = await identifyByPin(pinToSubmit)
      onConfirm(res.employee)
    } catch (e) {
      setError(e.message || 'PIN tidak dikenali')
      setPin('')
      setShake(true)
      if (navigator.vibrate) navigator.vibrate(200)
      setTimeout(() => setShake(false), 500)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className={`bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 pb-8 transition-transform ${shake ? 'animate-shake' : ''}`}>
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
          onChange={e => {
            if (!loading) {
              const v = e.target.value.replace(/\D/g, '').slice(0, 6)
              setPin(v)
              if (v.length === 6) handleSubmit(v)
            }
          }}
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

        <button onClick={onCancel} className="w-full h-12 rounded-2xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50">Batal</button>
      </div>
    </div>
  )
}
