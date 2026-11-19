import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getKasbonSummary, createKasbon, getKasbonByEmployee, getKasbonMonthly } from '../services/api'
import { formatRupiah, formatDate, formatRupiahInput, parseRupiahInput, getInitials } from '../utils/format'
import { openCashDrawerOnly } from '../utils/rawbt'
import Toast from '../components/Toast'
import { useToast } from '../hooks/useToast'

const KASBON_LIMIT = 1500000

export default function KasbonDashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const employee = location.state?.employee
  const { toast, showToast, clearToast } = useToast()

  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [monthly, setMonthly] = useState([])
  const [loadingMonthly, setLoadingMonthly] = useState(true)

  // Ajukan kasbon flow
  const [step, setStep] = useState(null) // null | 'method' | 'form' | 'warning'
  const [via, setVia] = useState('cash')
  const [amountRaw, setAmountRaw] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [keypadField, setKeypadField] = useState(null) // 'amount' or null
  const [currentTotal, setCurrentTotal] = useState(0)

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

  const loadMonthly = () => {
    if (!employee) return
    setLoadingMonthly(true)
    getKasbonMonthly(employee.id)
      .then((data) => setMonthly(Array.isArray(data) ? data : []))
      .catch(() => showToast('Gagal memuat riwayat bulanan', 'error'))
      .finally(() => setLoadingMonthly(false))
  }

  useEffect(() => { loadSummary(); loadMonthly() }, [employee])

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
      // Cek total kasbon saat ini (hanya yang belum settled)
      const kasbonList = await getKasbonByEmployee(employee.id, true)
      const totalKasbon = (kasbonList || []).reduce((sum, k) => sum + (k.amount || 0), 0)
      const newTotal = totalKasbon + parsedAmount

      if (newTotal >= KASBON_LIMIT) {
        setCurrentTotal(newTotal)
        setSaving(false)
        setStep('warning')
        return
      }

      await submitKasbon()
    } catch (e) {
      showToast(e.message || 'Gagal mengecek kasbon', 'error')
      setSaving(false)
    }
  }

  const submitKasbon = async () => {
    try {
      // Trigger drawer immediately (still within user-gesture) before awaiting network call
      if (via === 'cash') openCashDrawerOnly()
      await createKasbon({
        employee_id: employee.id,
        amount: parsedAmount,
        payment_method: via,
        notes: note || `Kasbon via ${via}`,
      })
      if (via === 'cash') {
        showToast('Kasbon berhasil! Laci kasir dibuka.', 'success')
      } else {
        showToast('Kasbon berhasil! Owner akan segera transfer.', 'info')
      }
      resetForm()
      loadSummary()
      loadMonthly()
    } catch (e) {
      showToast(e.message || 'Gagal menyimpan kasbon', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleContinueAnyway = async () => {
    setSaving(true)
    await submitKasbon()
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
    <div className="min-h-screen flex flex-col bg-slate-100/90 text-slate-800 pb-12">
      {/* Modern Header */}
      <div
        className="px-4 sm:px-6 pt-10 pb-5 shadow-xl shadow-amber-950/15 border-b border-amber-400/20"
        style={{
          background: 'linear-gradient(135deg, #b45309 0%, #d97706 50%, #f59e0b 100%)',
          borderBottomLeftRadius: '2rem',
          borderBottomRightRadius: '2rem',
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <button
              onClick={() => navigate('/home')}
              className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center text-white hover:bg-white/25 active:scale-95 transition-all shadow-sm shrink-0"
              title="Kembali ke Beranda"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-black/15 text-white/95 border border-white/10">
                  KASBON REGISTER
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                <span className="text-[10px] text-amber-100/90 font-bold hidden sm:inline">EMPLOYEE SALARY ADVANCE</span>
              </div>
              <h1 className="text-white text-xl sm:text-2xl font-black tracking-tight leading-tight">Dashboard Kasbon</h1>
              <p className="text-amber-100/80 text-xs font-medium">Labalaba Advertising · Pencatatan & pengajuan kasbon mandiri karyawan</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col md:flex-row gap-5">
        {/* Left Side - Employee Details */}
        <div className="w-full md:w-2/5 flex flex-col gap-4">
          {/* Employee Profile Card */}
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-900/5 p-6 border border-slate-200/80 flex flex-col items-center text-center">
            <div className="w-36 h-36 rounded-3xl bg-gradient-to-br from-amber-100 via-orange-100 to-amber-200 flex items-center justify-center shrink-0 overflow-hidden border-4 border-white shadow-xl mb-4">
              {employee.photo ? (
                <img src={employee.photo} alt={employee.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-amber-700 font-black text-5xl">{getInitials(employee.name)}</span>
              )}
            </div>
            <h2 className="text-2xl font-black text-slate-900 leading-tight">{employee.name}</h2>
            <div className="mt-1">
              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-black uppercase tracking-wider">
                {employee.position || 'Karyawan'}
              </span>
            </div>
            <div className="w-full h-px bg-slate-100 my-4" />
            <div className="w-full space-y-3 text-left">
              {[
                ['Kota Asal', employee.birthplace || '-'],
                ['Tanggal Lahir', employee.birthdate ? formatDate(employee.birthdate) : '-'],
                ['No. WhatsApp', employee.whatsapp || '-'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-400 uppercase tracking-wider">{label}</span>
                  <span className="font-black text-slate-800 text-sm">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Total Kasbon Card */}
          <div className="relative overflow-hidden rounded-3xl shadow-xl shadow-amber-950/15 p-6 text-white border border-amber-300/30 bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 transition-all">
            <div className="absolute -top-10 -right-10 w-36 h-36 bg-white/15 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-black uppercase tracking-wider text-amber-100/90">
                {new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-black tracking-widest text-white border border-white/25">
                TOTAL KASBON
              </span>
            </div>
            <p className="text-3xl sm:text-4xl font-black tracking-tight mt-2 drop-shadow-sm">{formatRupiah(total)}</p>
            <p className="text-amber-100/90 text-xs font-bold mt-1.5 flex items-center gap-1.5">
              <span>💳</span> {items.length} transaksi kasbon tercatat
            </p>
          </div>
        </div>

        {/* Right Side - Kasbon List & Button */}
        <div className="w-full md:w-3/5 flex flex-col gap-4">
          {/* Tombol Ajukan Kasbon */}
          <button
            onClick={() => setStep('method')}
            className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-white font-black text-base shadow-xl shadow-amber-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 border border-amber-300/30"
          >
            <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <span>Ajukan Kasbon Baru</span>
          </button>

          {/* List kasbon bulan ini */}
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-900/5 p-5 sm:p-6 border border-slate-200/80 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-4 bg-amber-500 rounded-full" />
                <h2 className="text-slate-900 font-black text-lg tracking-tight">Riwayat Kasbon Bulan Ini</h2>
              </div>
              <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                {items.length} Transaksi
              </span>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-16">
                <svg className="w-8 h-8 animate-spin text-amber-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
              </div>
            ) : items.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3 border border-slate-200">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="font-bold text-slate-600 text-sm">Belum ada kasbon bulan ini.</p>
                <p className="text-xs text-slate-400 mt-1">Data kasbon akan direset setelah gaji bulanan ditransfer.</p>
              </div>
            ) : (
              <div className="space-y-2.5 overflow-y-auto max-h-64 pr-1">
                {items.map((k) => (
                  <div key={k.id} className="group rounded-2xl p-4 flex items-center justify-between border transition-all bg-white hover:bg-slate-50/80 border-slate-200/80 hover:border-amber-200 hover:shadow-sm shadow-xs">
                    <div className="min-w-0">
                      <p className="font-black text-slate-900 text-base">{formatRupiah(k.amount)}</p>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">{formatDate(k.date)}</p>
                      {k.notes && <p className="text-xs text-slate-600 mt-1 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/60 truncate">{k.notes}</p>}
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider shrink-0 ${
                      k.payment_method === 'transfer'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}>
                      {k.payment_method === 'transfer' ? 'Transfer' : 'Cash'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Riwayat Kasbon per Bulan */}
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-900/5 p-5 sm:p-6 border border-slate-200/80 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-4 bg-amber-500 rounded-full" />
                <h2 className="text-slate-900 font-black text-lg tracking-tight">Riwayat Kasbon per Bulan</h2>
              </div>
              <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                {monthly.length} Periode
              </span>
            </div>

            {loadingMonthly ? (
              <div className="flex justify-center items-center py-16">
                <svg className="w-8 h-8 animate-spin text-amber-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
              </div>
            ) : monthly.length === 0 ? (
              <p className="text-center text-slate-400 py-12 text-sm font-medium">Belum ada riwayat kasbon bulanan sebelumnya.</p>
            ) : (
              <div className="space-y-2.5 overflow-y-auto max-h-64 pr-1">
                {monthly.map((m) => (
                  <div key={m.month} className={`rounded-2xl p-4 flex items-center justify-between border transition-all ${
                    m.status === 'CLEAR'
                      ? 'bg-emerald-50/50 hover:bg-emerald-50 border-emerald-200/80'
                      : 'bg-rose-50/50 hover:bg-rose-50 border-rose-200/80'
                  }`}>
                    <div className="min-w-0">
                      <p className="font-black text-slate-900 text-sm sm:text-base">{m.month}</p>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">Total Kasbon: <span className="font-bold text-slate-700">{formatRupiah(m.total_kasbon)}</span></p>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">Sisa Belum Lunas: <span className="font-bold text-slate-700">{formatRupiah(m.kasbon_belum_lunas)}</span></p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider shrink-0 ${
                      m.status === 'CLEAR'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                    }`}>
                      {m.status === 'CLEAR' ? 'CLEAR' : 'BELUM'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Method Picker Modal */}
      {step === 'method' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6">
            <h3 className="text-center text-slate-800 font-black text-lg mb-1">Pilih Metode Kasbon</h3>
            <p className="text-center text-slate-400 text-xs mb-5">Tentukan bagaimana kasbon akan diambil/diberikan</p>
            <div className="grid grid-cols-2 gap-3.5 mb-4">
              <button
                onClick={() => { setVia('cash'); setStep('form') }}
                className="flex flex-col items-center justify-center gap-2.5 py-7 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-black text-base shadow-lg shadow-emerald-500/25 active:scale-95 transition-all border border-emerald-400/30"
              >
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  </svg>
                </div>
                <span>CASH</span>
              </button>
              <button
                onClick={() => { setVia('transfer'); setStep('form') }}
                className="flex flex-col items-center justify-center gap-2.5 py-7 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-base shadow-lg shadow-blue-500/25 active:scale-95 transition-all border border-blue-400/30"
              >
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <span>TRANSFER</span>
              </button>
            </div>
            <button
              onClick={resetForm}
              className="w-full py-3 rounded-2xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {step === 'form' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                via === 'cash' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}>
                Metode: {via === 'cash' ? '💵 Cash' : '🏦 Transfer'}
              </span>
              <button onClick={resetForm} className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-sm font-bold">✕</button>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">Masukkan Nominal Kasbon *</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black">Rp</span>
                <input
                  type="text"
                  readOnly
                  value={amountRaw}
                  onClick={() => setKeypadField('amount')}
                  placeholder="0"
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 text-xl font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30 cursor-pointer bg-white"
                />
              </div>
              {parsedAmount > 0 && <p className="text-xs text-amber-600 font-black mt-1 ml-1">{formatRupiah(parsedAmount)}</p>}
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">Catatan Keperluan (Opsional)</label>
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Contoh: Keperluan mendadak..."
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/30 text-sm font-semibold"
              />
            </div>

            {via === 'cash' && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 font-medium flex items-center gap-2">
                <span>⚠️</span>
                <span>Laci kasir akan otomatis terbuka setelah kasbon disetujui.</span>
              </div>
            )}
            {via === 'transfer' && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800 font-medium flex items-center gap-2">
                <span>ℹ️</span>
                <span>Owner akan menerima notifikasi untuk transfer ke rekening kamu.</span>
              </div>
            )}

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setStep('method')}
                className="flex-1 py-3.5 rounded-2xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-all"
              >
                ← Kembali
              </button>
              <button
                onClick={handleSubmit}
                disabled={!parsedAmount || saving}
                className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-sm shadow-lg shadow-amber-500/25 hover:from-amber-600 hover:to-orange-600 disabled:opacity-40 active:scale-95 transition-all"
              >
                {saving ? 'Menyimpan...' : 'Ajukan Kasbon'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Warning Modal */}
      {step === 'warning' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3">
                <span className="text-3xl">⚠️</span>
              </div>
              <h3 className="font-black text-slate-900 text-lg mb-2">KASBON KAMU SUDAH {formatRupiah(currentTotal)} LHO!!</h3>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed font-medium">
                TAPI MASIH BISA KASBON LAGI KO, AMAAAN<br />
                JANGAN BOROS BOROS, DI PAKAI BUAT YANG PENTING PENTING AJA,<br />
                OKEEE, LOVE YOUUUU
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setStep('form')}
                className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-all"
              >
                ← Kembali
              </button>
              <button
                onClick={handleContinueAnyway}
                disabled={saving}
                className="flex-1 py-3 rounded-2xl bg-amber-500 text-white font-black text-sm hover:bg-amber-600 disabled:opacity-40 transition-all"
              >
                {saving ? 'Menyimpan...' : 'Lanjutkan Kasih'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Numeric Keypad */}
      {keypadField && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setKeypadField(null)}>
          <div className="bg-white p-5 rounded-3xl w-full max-w-[340px] sm:max-w-[360px] mx-auto shadow-2xl border border-slate-100 flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-black text-slate-800">Nominal Kasbon (Rp)</span>
              <button onClick={() => setKeypadField(null)} className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-sm font-bold transition-all">
                ✕
              </button>
            </div>
            {/* Display current value */}
            <div className="w-full bg-slate-900 text-amber-400 rounded-2xl py-3.5 px-4 mb-3.5 text-center font-mono font-black text-2xl tracking-wider shadow-inner">
              {amountRaw || 'Rp 0'}
            </div>
            <div className="grid grid-cols-3 gap-2.5 mb-2.5">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeypadInput(num)}
                  className="h-12 w-full rounded-2xl bg-slate-100 text-slate-800 font-black text-xl hover:bg-slate-200 active:scale-95 transition-all shadow-xs flex items-center justify-center"
                >
                  {num}
                </button>
              ))}
              <button type="button" onClick={handleKeypadClear} className="h-12 w-full rounded-2xl bg-red-100 text-red-600 font-black text-lg hover:bg-red-200 active:scale-95 transition-all shadow-xs flex items-center justify-center">
                C
              </button>
              <button type="button" onClick={() => handleKeypadInput(0)} className="h-12 w-full rounded-2xl bg-slate-100 text-slate-800 font-black text-xl hover:bg-slate-200 active:scale-95 transition-all shadow-xs flex items-center justify-center">
                0
              </button>
              <button type="button" onClick={handleKeypadBackspace} className="h-12 w-full rounded-2xl bg-amber-100 text-amber-700 font-black text-lg hover:bg-amber-200 active:scale-95 transition-all shadow-xs flex items-center justify-center">
                ⌫
              </button>
            </div>
            <button type="button" onClick={() => handleKeypadInput(1000)} className="h-11 w-full rounded-2xl bg-blue-100 text-blue-700 font-black text-sm hover:bg-blue-200 active:scale-95 transition-all mb-2 flex items-center justify-center shadow-xs">
              +000 (Ribu)
            </button>
            <button type="button" onClick={() => setKeypadField(null)} className="h-12 w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-sm shadow-md shadow-amber-500/25 active:scale-95 transition-all flex items-center justify-center">
              Selesai
            </button>
          </div>
        </div>
      )}

      {toast && <Toast key={toast.id} message={toast.message} type={toast.type} onClose={clearToast} />}
    </div>
  )
}
