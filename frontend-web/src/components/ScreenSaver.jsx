import { useEffect, useState, useRef, useCallback } from 'react'

const INACTIVITY_TIMEOUT = 5 * 60 * 1000 // 5 minutes inactivity

export default function ScreenSaver() {
  const [show, setShow] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const timerRef = useRef(null)

  // Update clock every second while screensaver is visible
  useEffect(() => {
    if (!show) return
    setCurrentTime(new Date())
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(clockInterval)
  }, [show])

  // Reset inactivity timer
  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
    timerRef.current = setTimeout(() => {
      setShow(true)
    }, INACTIVITY_TIMEOUT)
  }, [])

  // Listen for user activity when screensaver is NOT active
  useEffect(() => {
    if (show) return // When screensaver is showing, do not listen to window events

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart']
    const handleActivity = () => {
      resetTimer()
    }

    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true })
    })

    resetTimer()

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity)
      })
    }
  }, [show, resetTimer])

  // Safe wake up handler that completely swallows touch/click events to prevent click-through
  const handleWake = (e) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    // Safety shield: capture and swallow any lingering clicks or touch gestures in capture phase for 400ms
    const swallow = (evt) => {
      evt.stopImmediatePropagation()
      evt.preventDefault()
    }

    window.addEventListener('click', swallow, true)
    window.addEventListener('pointerup', swallow, true)
    window.addEventListener('touchend', swallow, true)
    window.addEventListener('mouseup', swallow, true)

    setTimeout(() => {
      window.removeEventListener('click', swallow, true)
      window.removeEventListener('pointerup', swallow, true)
      window.removeEventListener('touchend', swallow, true)
      window.removeEventListener('mouseup', swallow, true)
    }, 400)

    setShow(false)
    resetTimer()
  }

  if (!show) return null

  // Format date and time
  const timeStr = currentTime.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  const dateStr = currentTime.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Layar Istirahat - Sentuh untuk bangunkan"
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-between py-12 px-6 cursor-pointer select-none overflow-hidden animate-fade-in touch-none"
      style={{
        background: 'radial-gradient(circle at 50% 20%, #0d4b68 0%, #061a29 55%, #020c15 100%)',
      }}
      onPointerDown={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
      onTouchStart={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
      onClick={handleWake}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleWake(e)
        }
      }}
    >
      {/* Ambient background glow accents */}
      <div className="absolute top-1/4 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 w-80 h-80 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />

      {/* Top Header / Status Pill */}
      <div className="relative z-10 flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-lg">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
        <span className="text-xs font-semibold text-emerald-300 tracking-wider uppercase">
          Sistem Standby
        </span>
        <span className="text-white/20">|</span>
        <span className="text-xs text-slate-300 font-medium">Labalaba Advertising</span>
      </div>

      {/* Center Display: Logo, Clock & Date */}
      <div className="relative z-10 flex flex-col items-center text-center my-auto">
        <div className="relative mb-6 p-4 rounded-3xl bg-gradient-to-b from-white/10 to-white/[0.02] border border-white/15 backdrop-blur-xl shadow-2xl">
          <img
            src="/icon-512.png"
            alt="Logo Labalaba"
            className="w-24 h-24 sm:w-28 sm:h-28 object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]"
          />
        </div>

        {/* Live Clock */}
        <div className="text-5xl sm:text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-cyan-200 tracking-tight drop-shadow font-mono">
          {timeStr}
        </div>

        {/* Date Display */}
        <div className="mt-2 text-base sm:text-lg font-medium text-cyan-200/90 tracking-wide capitalize">
          {dateStr}
        </div>

        <p className="text-white/40 text-xs sm:text-sm mt-3 tracking-widest uppercase font-semibold">
          ONE_STOP CUTTING STICKER & ADVERTISING
        </p>
      </div>

      {/* Bottom Prompt to Wake */}
      <div className="relative z-10 flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center text-cyan-300 shadow-xl animate-bounce">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
            />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-white/90 text-sm font-semibold tracking-wide">
            Ketuk layar untuk melanjutkan
          </p>
          <p className="text-white/40 text-xs mt-0.5">
            Sentuh di mana saja untuk kembali ke aplikasi
          </p>
        </div>
      </div>
    </div>
  )
}
