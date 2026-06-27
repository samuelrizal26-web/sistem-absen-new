import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getEmployees, verifyEmployeePin, resetPinByBirthdate } from '../services/api'
import { getInitials } from '../utils/format'
import PinModal from '../components/PinModal'
import CrewDashboard from './CrewDashboard'
import Toast from '../components/Toast'
import { useToast } from '../hooks/useToast'

const NAV_BUTTONS = [
  {
    label: 'Print',
    path: '/print',
    color: 'from-orange-400 to-orange-500',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M17 17H7A2 2 0 015 15V9a2 2 0 012-2h10a2 2 0 012 2v6a2 2 0 01-2 2zM7 9V5a2 2 0 012-2h6a2 2 0 012 2v4M9 17v2m6-2v2" />
      </svg>
    ),
  },
  {
    label: 'Cashflow',
    path: '/cashflow',
    color: 'from-teal-400 to-teal-500',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    label: 'Project',
    path: '/project',
    color: 'from-blue-500 to-blue-600',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    label: 'Admin',
    path: '/admin',
    color: 'from-purple-500 to-purple-600',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
]

export default function HomeScreen() {
  const navigate = useNavigate()
  const { toast, showToast, clearToast } = useToast()

  const [employees, setEmployees] = useState([])
  const [loadingEmployees, setLoadingEmployees] = useState(true)

  // Modal state
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [step, setStep] = useState(null) // 'pin' | 'crew' | 'reset_pin'
  const [pinLoading, setPinLoading] = useState(false)
  const [pinError, setPinError] = useState('')

  // Reset PIN state
  const [resetStep, setResetStep] = useState('birthdate') // 'birthdate' | 'newpin'
  const [birthdateInput, setBirthdateInput] = useState('')
  const [newPin, setNewPin] = useState('')
  const [newPinConfirm, setNewPinConfirm] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetError, setResetError] = useState('')

  useEffect(() => {
    getEmployees()
      .then((data) => setEmployees(Array.isArray(data) ? data : []))
      .catch(() => showToast('Gagal memuat data karyawan', 'error'))
      .finally(() => setLoadingEmployees(false))
  }, [])

  const handleEmployeeClick = (emp) => {
    setSelectedEmployee(emp)
    setPinError('')
    setStep('pin')
  }

  const handlePinConfirm = async (pin) => {
    setPinLoading(true)
    setPinError('')
    try {
      await verifyEmployeePin(selectedEmployee.id, pin)
      setStep('crew')
    } catch (e) {
      setPinError(e.message || 'PIN salah, coba lagi')
    } finally {
      setPinLoading(false)
    }
  }

  const handleForgotPin = () => {
    setResetStep('birthdate')
    setBirthdateInput('')
    setNewPin('')
    setNewPinConfirm('')
    setResetError('')
    setStep('reset_pin')
  }

  const handleVerifyBirthdate = async () => {
    if (!birthdateInput) { setResetError('Masukkan tanggal lahir'); return }
    setResetLoading(true)
    setResetError('')
    try {
      await resetPinByBirthdate(selectedEmployee.id, birthdateInput, '000000')
      setResetStep('newpin')
    } catch (e) {
      setResetError('Tanggal lahir tidak cocok')
    } finally {
      setResetLoading(false)
    }
  }

  const handleSetNewPin = async () => {
    if (newPin.length < 6) { setResetError('PIN minimal 6 digit'); return }
    if (newPin !== newPinConfirm) { setResetError('PIN tidak cocok'); return }
    setResetLoading(true)
    setResetError('')
    try {
      await resetPinByBirthdate(selectedEmployee.id, birthdateInput, newPin)
      showToast('PIN berhasil diubah!', 'success')
      closeModals()
    } catch (e) {
      setResetError(e.message || 'Gagal reset PIN')
    } finally {
      setResetLoading(false)
    }
  }

  const closeModals = () => {
    setSelectedEmployee(null)
    setStep(null)
    setPinError('')
    setResetError('')
    setBirthdateInput('')
    setNewPin('')
    setNewPinConfirm('')
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <div
        className="relative flex flex-col items-center pt-10 pb-8 px-5"
        style={{
          background: 'linear-gradient(160deg, #0A4D68 0%, #0d7fa8 70%, #1ab3e8 100%)',
          borderBottomLeftRadius: '2rem',
          borderBottomRightRadius: '2rem',
        }}
      >
        {/* Logo + tagline */}
        <img src="/icon-512.png" alt="Logo" className="w-14 h-14 object-contain mb-1" />
        <p className="text-white/60 text-xs tracking-widest uppercase mb-3">
          One Stop Cutting Sticker
        </p>
        <h1 className="text-white text-2xl font-bold mb-0.5">Sistem Absensi Crew</h1>
        <p className="text-white/70 text-sm">Pilih nama Anda untuk kasbon</p>

        {/* Nav Buttons */}
        <div className="grid grid-cols-2 gap-3 w-full mt-6">
          {NAV_BUTTONS.map((btn) => (
            <button
              key={btn.label}
              onClick={() => navigate(btn.path)}
              className={`flex items-center justify-center gap-2.5 py-3.5 rounded-2xl text-white font-semibold text-sm shadow-lg active:scale-95 transition-all bg-gradient-to-r ${btn.color}`}
            >
              {btn.icon}
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Employee Grid */}
      <div className="flex-1 px-4 py-5">
        {loadingEmployees ? (
          <div className="flex justify-center items-center py-16">
            <svg className="w-8 h-8 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
          </div>
        ) : employees.length === 0 ? (
          <p className="text-center text-gray-400 py-16">Belum ada data karyawan.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {employees.map((emp) => (
              <button
                key={emp.id}
                onClick={() => handleEmployeeClick(emp)}
                className="bg-white rounded-2xl shadow-sm p-4 flex flex-col items-center gap-2 active:scale-95 transition-all hover:shadow-md border border-gray-100"
              >
                {/* Avatar */}
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-bold text-lg">
                    {getInitials(emp.name)}
                  </span>
                </div>
                <p className="font-semibold text-gray-800 text-sm text-center leading-tight">{emp.name}</p>
                <p className="text-xs text-gray-400 text-center">{emp.position || emp.role || '-'}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* PIN Modal */}
      {step === 'pin' && selectedEmployee && (
        <PinModal
          employeeName={selectedEmployee.name}
          onConfirm={handlePinConfirm}
          onCancel={closeModals}
          onForgotPin={handleForgotPin}
          loading={pinLoading}
          error={pinError}
        />
      )}

      {/* Crew Dashboard */}
      {step === 'crew' && selectedEmployee && (
        <CrewDashboard employee={selectedEmployee} onClose={closeModals} />
      )}

      {/* Reset PIN Modal */}
      {step === 'reset_pin' && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 pb-8">
            <div className="text-center mb-5">
              <h2 className="font-bold text-gray-800">Reset PIN</h2>
              <p className="text-sm text-gray-500 mt-0.5">{selectedEmployee.name}</p>
            </div>

            {resetStep === 'birthdate' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 text-center">Masukkan tanggal lahir kamu untuk verifikasi</p>
                <input type="date" value={birthdateInput} onChange={e => setBirthdateInput(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/30" />
                {resetError && <p className="text-red-500 text-sm text-center">{resetError}</p>}
                <div className="flex gap-3">
                  <button onClick={closeModals} className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-600">Batal</button>
                  <button onClick={handleVerifyBirthdate} disabled={resetLoading || !birthdateInput}
                    className="flex-1 py-3 rounded-2xl bg-primary text-white font-bold disabled:opacity-40">
                    {resetLoading ? 'Verifikasi...' : 'Lanjut'}
                  </button>
                </div>
              </div>
            )}

            {resetStep === 'newpin' && (
              <div className="space-y-4">
                <p className="text-sm text-green-600 text-center">✓ Verifikasi berhasil. Buat PIN baru.</p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PIN Baru (6 digit)</label>
                  <input type="password" inputMode="numeric" maxLength={6} value={newPin}
                    onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/30 text-center text-2xl tracking-widest" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Konfirmasi PIN</label>
                  <input type="password" inputMode="numeric" maxLength={6} value={newPinConfirm}
                    onChange={e => setNewPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/30 text-center text-2xl tracking-widest" />
                </div>
                {resetError && <p className="text-red-500 text-sm text-center">{resetError}</p>}
                <button onClick={handleSetNewPin} disabled={resetLoading || newPin.length < 6}
                  className="w-full py-3.5 rounded-2xl bg-primary text-white font-bold disabled:opacity-40">
                  {resetLoading ? 'Menyimpan...' : 'Simpan PIN Baru'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <Toast key={toast.id} message={toast.message} type={toast.type} onClose={clearToast} />
      )}
    </div>
  )
}
