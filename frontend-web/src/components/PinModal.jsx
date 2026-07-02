import { useState, useEffect, useRef } from 'react'

export default function PinModal({ employeeName, onConfirm, onCancel, onForgotPin, loading = false, error = '' }) {
  const [pin, setPin] = useState('')
  const [shake, setShake] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (error) {
      setPin('')
      setShake(true)
      if (navigator.vibrate) navigator.vibrate(200)
      setTimeout(() => setShake(false), 500)
    }
  }, [error])

  const handleDigit = (d) => {
    if (pin.length < 6 && !loading) {
      const newPin = pin + d
      setPin(newPin)
      if (newPin.length === 6) setTimeout(() => onConfirm(newPin), 100)
    }
  }

  const handleBackspace = () => setPin((p) => p.slice(0, -1))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className={`bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 pb-8 transition-transform ${shake ? 'animate-shake' : ''}`}>
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-800">{employeeName}</h2>
          <p className="text-sm text-gray-500 mt-0.5">Masukkan PIN kamu</p>
        </div>

        {/* PIN dots */}
        <div className="flex justify-center gap-3 mb-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                i < pin.length ? 'bg-primary scale-110' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Error */}
        {error && (
          <p className="text-red-500 text-center text-sm mb-3">{error}</p>
        )}

        {/* Hidden input for keyboard support */}
        <input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={pin}
          onChange={(e) => {
            if (!loading) {
              const v = e.target.value.replace(/\D/g, '').slice(0, 6)
              setPin(v)
              if (v.length === 6) setTimeout(() => onConfirm(v), 100)
            }
          }}
          className="sr-only"
        />

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((d, i) => {
            if (d === '') return <div key={i} />
            const isBack = d === '⌫'
            return (
              <button
                key={i}
                onClick={() => isBack ? handleBackspace() : handleDigit(d)}
                className={`h-14 rounded-2xl text-xl font-semibold transition-all active:scale-95 ${
                  isBack
                    ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    : 'bg-gray-50 text-gray-800 hover:bg-primary/10 hover:text-primary'
                }`}
              >
                {d}
              </button>
            )
          })}
        </div>

        {/* Lupa PIN */}
        {onForgotPin && (
          <button onClick={onForgotPin} className="w-full text-center text-sm text-primary/70 hover:text-primary mb-2 transition-colors">
            Lupa PIN?
          </button>
        )}

        {/* Actions */}
        <button
          onClick={onCancel}
          className="w-full h-12 rounded-2xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
        >
          Batal
        </button>
      </div>
    </div>
  )
}
