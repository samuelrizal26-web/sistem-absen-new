import { useNavigate } from 'react-router-dom'

export default function PlaceholderPage({ title }) {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div
        className="flex items-center gap-3 px-4 pt-12 pb-5"
        style={{ background: 'linear-gradient(160deg, #0A4D68 0%, #0d7fa8 100%)' }}
      >
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-white text-lg font-bold">{title}</h1>
      </div>
      <div className="flex-1 flex items-center justify-center p-8 text-center">
        <div>
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-primary/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <p className="text-gray-400 font-medium">Halaman {title}</p>
          <p className="text-gray-300 text-sm mt-1">Akan dibangun pada langkah berikutnya</p>
        </div>
      </div>
    </div>
  )
}
