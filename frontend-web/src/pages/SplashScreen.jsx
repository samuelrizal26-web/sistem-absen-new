import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function SplashScreen() {
  const navigate = useNavigate()

  const goHome = () => navigate('/home')

  useEffect(() => {
    const handleKey = () => goHome()
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center cursor-pointer select-none"
      style={{
        background: 'linear-gradient(180deg, #0A4D68 0%, #0d7fa8 60%, #1ab3e8 100%)',
      }}
      onClick={goHome}
    >
      {/* Logo */}
      <div className="flex flex-col items-center mb-10 animate-fade-in">
        <img
          src="/icon-512.png"
          alt="Logo Labalaba"
          className="w-28 h-28 object-contain drop-shadow-2xl"
        />
        <p className="text-white/70 text-sm mt-3 tracking-widest uppercase">
          One Stop Cutting Sticker
        </p>
      </div>

      {/* App name */}
      <div className="text-center mb-24">
        <h1 className="text-white text-3xl font-bold tracking-tight drop-shadow">
          Sistem Absen
        </h1>
        <p className="text-white/60 text-sm mt-1">Labalaba Advertising</p>
      </div>

      {/* Tap prompt */}
      <div className="absolute bottom-16 flex flex-col items-center gap-2 animate-pulse">
        <div className="w-10 h-10 rounded-full border-2 border-white/40 flex items-center justify-center">
          <span className="text-white/70 text-xl">↑</span>
        </div>
        <p className="text-white/60 text-sm tracking-wide">Ketuk untuk masuk</p>
      </div>
    </div>
  )
}
