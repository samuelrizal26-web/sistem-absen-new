import { useEffect, useState } from 'react'

const INACTIVITY_TIMEOUT = 5 * 60 * 1000 // 5 minutes in milliseconds

export default function ScreenSaver() {
  const [show, setShow] = useState(false)
  let inactivityTimer

  const resetTimer = () => {
    if (show) setShow(false)
    clearTimeout(inactivityTimer)
    inactivityTimer = setTimeout(() => setShow(true), INACTIVITY_TIMEOUT)
  }

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    
    events.forEach(event => {
      window.addEventListener(event, resetTimer)
    })

    inactivityTimer = setTimeout(() => setShow(true), INACTIVITY_TIMEOUT)

    return () => {
      clearTimeout(inactivityTimer)
      events.forEach(event => {
        window.removeEventListener(event, resetTimer)
      })
    }
  }, [show])

  const handleWake = () => {
    setShow(false)
    resetTimer()
  }

  if (!show) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center cursor-pointer select-none"
      style={{
        background: 'linear-gradient(180deg, #0A4D68 0%, #0d7fa8 60%, #1ab3e8 100%)',
      }}
      onClick={handleWake}
    >
      {/* Logo */}
      <div className="flex flex-col items-center mb-10 animate-fade-in">
        <img
          src="/icon-512.png"
          alt="Logo Labalaba"
          className="w-28 h-28 object-contain drop-shadow-2xl"
        />
        <p className="text-white/70 text-sm mt-3 tracking-widest uppercase">
          ONE_STOP CUTTING STICKER & ADVERTISING
        </p>
      </div>

      {/* Tap prompt */}
      <div className="absolute bottom-16 flex flex-col items-center gap-2 animate-pulse">
        <div className="w-10 h-10 rounded-full border-2 border-white/40 flex items-center justify-center">
          <span className="text-white/70 text-xl">↑</span>
        </div>
        <p className="text-white/60 text-sm tracking-wide">Ketuk untuk bangunkan</p>
      </div>
    </div>
  )
}
