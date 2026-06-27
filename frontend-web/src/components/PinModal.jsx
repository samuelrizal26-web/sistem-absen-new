import { useState, useEffect, useRef } from 'react'

export default function PinModal({ employeeName, onConfirm, onCancel, onForgotPin, loading = false, error = '' }) {
  const [pin, setPin] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (pin.trim()) onConfirm(pin.trim())
  }

  const handleDigit = (d) => {
    if (pin.length < 6) setPin((p) => p + d)
  }

  const handleBackspace = () => setPin((p) => p.slice(0, -1))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 pb-8">
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
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(e) }}
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
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 h-12 rounded-2xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={pin.length === 0 || loading}
            className="flex-1 h-12 rounded-2xl bg-primary text-white font-semibold hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                Verifikasi...
              </span>
            ) : 'Masuk'}
          </button>
        </div>
      </div>
    </div>
  )
}
