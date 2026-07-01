import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getKasbonSummary, createKasbon } from '../services/api'
import { formatRupiah, formatDate, formatRupiahInput, parseRupiahInput, getInitials } from '../utils/format'
import { openCashDrawerOnly } from '../utils/rawbt'
import Toast from '../components/Toast'
import { useToast } from '../hooks/useToast'

export default function KasbonDashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const employee = location.state?.employee
  const { toast, showToast, clearToast } = useToast()

  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  // Ajukan kasbon flow
  const [step, setStep] = useState(null) // null | 'method' | 'form'
  const [via, setVia] = useState('cash')
  const [amountRaw, setAmountRaw] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [keypadField, setKeypadField] = useState(null) // 'amount' or null

  const parsedAmount = parseRupiahInput(amountRaw) || 0

  useEffect(() => {
    if (!employee) {
      navigate('/home', { replace: true })
    }
  }, [employee, navigate])

  const loadSummary = () => {
    if (!employee) return
    setLoading(true)
    getKasbonSummary(employee.id)
      .then((data) => {
        setItems(Array.isArray(data.items) ? data.items : [])
        setTotal(data.total || 0)
      })
      .catch(() => showToast('Gagal memuat data kasbon', 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadSummary() }, [employee])

  const resetForm = () => {
    setStep(null)
    setVia('cash')
    setAmountRaw('')
    setNote('')
  }

  const handleSubmit = async () => {
    if (!parsedAmount) { showToast('Masukkan nominal kasbon', 'error'); return }
    setSaving(true)
    try {
      await createKasbon({
        employee_id: employee.id,
        amount: parsedAmount,
        payment_method: via,
        notes: note || `Kasbon via ${via}`,
      })
      if (via === 'cash') {
        openCashDrawerOnly()
        showToast('Kasbon berhasil! Laci kasir dibuka.', 'success')
      } else {
        showToast('Kasbon berhasil! Owner akan segera transfer.', 'info')
      }
      resetForm()
      loadSummary()
    } catch (e) {
      showToast(e.message || 'Gagal menyimpan kasbon', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleKeypadInput = (num) => {
    if (!keypadField) return
    const currentRaw = amountRaw || ''
    const currentNum = parseRupiahInput(currentRaw) || 0
    let newNum
    if (num === 1000) {
      newNum = currentNum * 1000
    } else {
      newNum = currentNum * 10 + num
    }
    const newRaw = formatRupiahInput(String(newNum))
    setAmountRaw(newRaw)
  }

  const handleKeypadBackspace = () => {
    if (!keypadField) return
    const currentRaw = amountRaw || ''
    const currentNum = parseRupiahInput(currentRaw) || 0
    const newNum = Math.floor(currentNum / 10)
    const newRaw = newNum > 0 ? formatRupiahInput(String(newNum)) : ''
    setAmountRaw(newRaw)
  }

  const handleKeypadClear = () => {
    if (!keypadField) return
    setAmountRaw('')
  }

  if (!employee) return null

  return (
    <div className="min-h-screen bg-background pb-10">
      {/* Header */}
      <div
        className="relative flex items-center gap-3 px-5 pt-8 pb-6"
        style={{
          background: 'linear-gradient(160deg, #0A4D68 0%, #0d7fa8 70%, #1ab3e8 100%)',
          borderBottomLeftRadius: '2rem',
          borderBottomRightRadius: '2rem',
        }}
      >
        <button onClick={() => navigate('/home')}
          className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white">
          ←
        </button>
        <h1 className="text-white text-lg font-bold">Dashboard Kasbon</h1>
      </div>

      <div className="px-4 -mt-3">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Left Side - Employee Details */}
          <div className="w-full md:w-2/5 space-y-4">
            {/* Employee Profile Card */}
            <div className="bg-white rounded-3xl shadow-sm p-6 border border-gray-100">
              <div className="flex flex-col items-center text-center">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center shrink-0 overflow-hidden border-4 border-white shadow-lg mb-4">
                  {employee.photo ? (
                    <img src={employee.photo} alt={employee.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-blue-600 font-bold text-4xl">{getInitials(employee.name)}</span>
                  )}
                </div>
                <h2 className="text-2xl font-bold text-gray-800">{employee.name}</h2>
                <p className="text-sm text-gray-500 mt-1">{employee.position || 'Karyawan'}</p>
                <div className="w-full h-px bg-gray-100 my-4"></div>
                <div className="w-full space-y-3 text-left">
                  {[
                    ['Kota', employee.birthplace || '-'],
                    ['Tanggal Lahir', employee.birthdate ? formatDate(employee.birthdate) : '-'],
                    ['No. WhatsApp', employee.whatsapp || '-'],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">{label}</span>
                      <span className="text-sm font-semibold text-gray-800">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Total Kasbon Card */}
            <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl shadow-md p-6 text-white">
              <p className="text-white/80 text-sm">TOTAL KASBON</p>
              <p className="text-4xl font-extrabold mt-2">{formatRupiah(total)}</p>
              <p className="text-white/70 text-xs mt-1">{items.length} transaksi</p>
            </div>
          </div>

          {/* Right Side - Kasbon List & Button */}
          <div className="w-full md:w-3/5 space-y-4">
            {/* Tombol Ajukan Kasbon */}
            <button onClick={() => setStep('method')}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold text-base shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Ajukan Kasbon
            </button>

            {/* List kasbon */}
            <div className="bg-white rounded-3xl shadow-sm p-5 border border-gray-100">
              <p className="text-sm font-semibold text-gray-600 mb-3">Riwayat Kasbon Bulan Ini</p>
              {loading ? (
                <div className="flex justify-center py-10">
                  <svg className="w-7 h-7 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                </div>
              ) : items.length === 0 ? (
                <p className="text-center text-gray-400 py-10 text-sm">Belum ada kasbon. Tampilan akan kosong setelah gaji ditransfer.</p>
              ) : (
                <div className="space-y-2.5">
                  {items.map((k) => (
                    <div key={k.id} className="bg-gray-50 rounded-2xl p-4 flex items-center justify-between border border-gray-100">
                      <div className="min-w-0">
                        <p className="font-bold text-gray-800">{formatRupiah(k.amount)}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{formatDate(k.date)}</p>
                        {k.notes && <p className="text-xs text-gray-500 mt-0.5 truncate">{k.notes}</p>}
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${k.payment_method === 'transfer' ? 'bg-primary/10 text-primary' : 'bg-green-100 text-green-600'}`}>
                        {k.payment_method === 'transfer' ? 'Transfer' : 'Cash'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Method Picker Modal */}
      {step === 'method' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6">
            <p className="text-center text-gray-600 font-semibold mb-5">Metode Kasbon</p>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <button onClick={() => { setVia('cash'); setStep('form') }}
                className="flex flex-col items-center justify-center gap-2 py-7 rounded-2xl bg-green-500 text-white font-bold text-lg shadow hover:bg-green-600 active:scale-95 transition-all">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
                </svg>
                CASH
              </button>
              <button onClick={() => { setVia('transfer'); setStep('form') }}
                className="flex flex-col items-center justify-center gap-2 py-7 rounded-2xl bg-primary text-white font-bold text-lg shadow hover:bg-primary-dark active:scale-95 transition-all">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                TRANSFER
              </button>
            </div>
            <button onClick={resetForm} className="w-full py-2.5 rounded-2xl border border-gray-200 text-gray-500 text-sm">Batal</button>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {step === 'form' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${via === 'cash' ? 'bg-green-100 text-green-600' : 'bg-primary/10 text-primary'}`}>
                via {via === 'cash' ? 'Cash' : 'Transfer'}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Masukkan Nominal</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">Rp</span>
                <input type="text" readOnly value={amountRaw}
                  onClick={() => setKeypadField('amount')}
                  placeholder="0"
                  className="w-full pl-10 pr-4 py-3.5 rounded-2xl border border-gray-200 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer" />
              </div>
              {parsedAmount > 0 && <p className="text-xs text-primary mt-1 ml-1">{formatRupiah(parsedAmount)}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Catatan (Opsional)</label>
              <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Keperluan mendadak..."
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            {via === 'cash' && <p className="text-xs text-orange-500">⚠️ Laci kasir akan terbuka otomatis</p>}
            {via === 'transfer' && <p className="text-xs text-teal-600">ℹ️ Owner akan menerima notifikasi untuk transfer</p>}
            <div className="flex gap-3 pt-1">
              <button onClick={() => setStep('method')} className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-600 font-medium">← Kembali</button>
              <button onClick={handleSubmit} disabled={!parsedAmount || saving}
                className="flex-1 py-3 rounded-2xl bg-primary text-white font-bold hover:bg-primary-dark disabled:opacity-40 transition-all">
                {saving ? 'Menyimpan...' : '▶ Ajukan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Numeric Keypad */}
      {keypadField && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setKeypadField(null)}>
          <div className="bg-white p-4 rounded-2xl w-80" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-semibold text-gray-700">Nominal Kasbon (Rp)</span>
              <button onClick={() => setKeypadField(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Display current value */}
            <div className="bg-gray-100 rounded-xl p-3 mb-3 text-center">
              <span className="text-xl font-bold text-gray-800">
                {amountRaw || 'Rp 0'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button
                  key={num}
                  onClick={() => handleKeypadInput(num)}
                  className="py-3 rounded-xl bg-gray-100 text-xl font-semibold text-gray-800 hover:bg-gray-200 active:bg-gray-300 transition-all"
                >
                  {num}
                </button>
              ))}
              <button onClick={handleKeypadClear} className="py-3 rounded-xl bg-red-100 text-lg font-semibold text-red-600 hover:bg-red-200 active:bg-red-300 transition-all">
                C
              </button>
              <button onClick={() => handleKeypadInput(0)} className="py-3 rounded-xl bg-gray-100 text-xl font-semibold text-gray-800 hover:bg-gray-200 active:bg-gray-300 transition-all">
                0
              </button>
              <button onClick={handleKeypadBackspace} className="py-3 rounded-xl bg-gray-100 text-lg font-semibold text-gray-600 hover:bg-gray-200 active:bg-gray-300 transition-all">
                ⌫
              </button>
            </div>
            <button onClick={() => handleKeypadInput(1000)} className="w-full py-3 rounded-xl bg-gray-100 text-lg font-semibold text-gray-700 hover:bg-gray-200 active:bg-gray-300 transition-all mb-2">
              000
            </button>
            <button onClick={() => setKeypadField(null)} className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm">
              Selesai
            </button>
          </div>
        </div>
      )}

      {toast && <Toast key={toast.id} message={toast.message} type={toast.type} onClose={clearToast} />}
    </div>
  )
}
