import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCashflow, getCashflowSummary, createCashflow, updateCashflow, getPreviousMonthSummary, exchangeCashDenomination } from '../services/api'
import { formatRupiah, formatDate, formatDateTime, formatRupiahInput, parseRupiahInput } from '../utils/format'
import { openCashDrawerOnly } from '../utils/rawbt'
import StaffPinModal from '../components/StaffPinModal'
import Toast from '../components/Toast'
import { useToast } from '../hooks/useToast'

const TIPE = { PEMASUKAN: 'income', PENGELUARAN: 'expense', TUKAR: 'exchange' }
const TAB = { CASH: 'cash', TRANSFER: 'transfer', PENGELUARAN: 'expense', TUKAR: 'exchange' }

const IN_DENOMINATIONS = [
  { value: 100000, label: '100.000' },
  { value: 50000, label: '50.000' },
  { value: 20000, label: '20.000' },
  { value: 10000, label: '10.000' },
  { value: 5000, label: '5.000' },
  { value: 2000, label: '2.000' },
  { value: 1000, label: '1.000' },
]

const OUT_DENOMINATIONS = [
  { value: 50000, label: '50.000' },
  { value: 20000, label: '20.000' },
  { value: 10000, label: '10.000' },
  { value: 5000, label: '5.000' },
  { value: 2000, label: '2.000' },
  { value: 1000, label: '1.000' },
  { value: 500, label: '500', isCoin: true },
  { value: 200, label: '200', isCoin: true },
  { value: 100, label: '100', isCoin: true },
]

const emptyDenomMap = (list) => Object.fromEntries(list.map(d => [String(d.value), 0]))

export default function CashflowPage() {
  const navigate = useNavigate()
  const { toast, showToast, clearToast } = useToast()

  const [summary, setSummary] = useState(null)
  const [prevMonthSummary, setPrevMonthSummary] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState(TAB.CASH)
  const [searchMonth, setSearchMonth] = useState('')

  // Modal state
  const [showTypePicker, setShowTypePicker] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [selectedType, setSelectedType] = useState(null)
  const [showStaffPin, setShowStaffPin] = useState(false)
  const [pendingForm, setPendingForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [keypadField, setKeypadField] = useState(null) // 'amount', 'customer_cash', or 'edit_amount'
  const [editingId, setEditingId] = useState(null)
  const [editAmountRaw, setEditAmountRaw] = useState('')
  const [editOriginalRaw, setEditOriginalRaw] = useState('')
  const [editPaymentMethod, setEditPaymentMethod] = useState('cash')
  const [showEditStaffPin, setShowEditStaffPin] = useState(false)
  const [pendingEdit, setPendingEdit] = useState(null)

  // ── Tukar Uang State ──
  // exchangeStep: null | 'in' (Langkah 1: input uang yg ditukar) | 'out' (Langkah 2: laci terbuka, isi pecahan yg diambil)
  const [exchangeStep, setExchangeStep] = useState(null)
  const [exchangeInMap, setExchangeInMap] = useState(() => emptyDenomMap(IN_DENOMINATIONS))
  const [exchangeOutMap, setExchangeOutMap] = useState(() => emptyDenomMap(OUT_DENOMINATIONS))
  const [exchangeSaving, setExchangeSaving] = useState(false)

  const [form, setForm] = useState({
    amount: '',
    amount_raw: '',
    payment_method: 'cash',
    customer_cash: '',
    description: '',
    notes: '',
  })

  const loadData = async () => {
    if (items.length === 0) setLoading(true)
    try {
      const currentMonth = new Date().toISOString().slice(0, 7)
      const displayMonth = searchMonth || currentMonth
      const [s, d, prev] = await Promise.all([
        getCashflowSummary(`?month=${displayMonth}`),
        getCashflow(searchMonth ? `?month=${searchMonth}` : ''),
        getPreviousMonthSummary(),
      ])
      setSummary(s)
      setItems(Array.isArray(d) ? d : [])
      setPrevMonthSummary(prev)
    } catch {
      showToast('Gagal memuat data', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [searchMonth])

  const filteredItems = items.filter(i => {
    if (tab === TAB.PENGELUARAN) return i.type === 'expense'
    if (tab === TAB.TUKAR) return i.type === 'exchange'
    if (tab === TAB.CASH) return i.type === 'income' && i.payment_method === 'cash'
    if (tab === TAB.TRANSFER) return i.type === 'income' && i.payment_method === 'transfer'
    return true
  })

  // ── Tukar Uang Helpers & Handlers ──
  const exchangeInTotal = IN_DENOMINATIONS.reduce(
    (sum, d) => sum + d.value * (parseInt(exchangeInMap[String(d.value)], 10) || 0),
    0
  )
  const exchangeOutTotal = OUT_DENOMINATIONS.reduce(
    (sum, d) => sum + d.value * (parseInt(exchangeOutMap[String(d.value)], 10) || 0),
    0
  )
  const exchangeRemaining = exchangeInTotal - exchangeOutTotal

  const openExchangeModal = () => {
    setShowTypePicker(false)
    setExchangeInMap(emptyDenomMap(IN_DENOMINATIONS))
    setExchangeOutMap(emptyDenomMap(OUT_DENOMINATIONS))
    setExchangeStep('in')
  }

  // Langkah 1 -> Klik Tombol "TUKAR": Laci Terbuka & Muncul Popup Pecahan Uang yang Diambil
  const handleStartExchangeDrawer = () => {
    if (exchangeInTotal <= 0) {
      showToast('Pilih / isi jumlah lembar uang yang akan ditukar terlebih dahulu', 'error')
      return
    }
    // Buka laci fisik kasir langsung dalam user-gesture
    openCashDrawerOnly()
    setExchangeOutMap(emptyDenomMap(OUT_DENOMINATIONS))
    setExchangeStep('out')
    showToast('Laci kasir terbuka! Silakan isi pecahan uang yang diambil dari laci.', 'info')
  }

  // Langkah 2 -> Klik Tombol "SELESAI" setelah pecahan yang diambil diisi
  const handleFinishExchange = async () => {
    if (exchangeOutTotal <= 0) {
      showToast('Isi jumlah lembar pecahan yang diambil dari laci', 'error')
      return
    }
    if (exchangeOutTotal !== exchangeInTotal) {
      showToast(
        exchangeRemaining > 0
          ? `Pecahan yang diambil masih kurang ${formatRupiah(exchangeRemaining)}`
          : `Pecahan yang diambil kelebihan ${formatRupiah(Math.abs(exchangeRemaining))}`,
        'error'
      )
      return
    }
    setExchangeSaving(true)
    try {
      await exchangeCashDenomination({
        in_breakdown: exchangeInMap,
        out_breakdown: exchangeOutMap,
      })
      showToast(`Tukar uang ${formatRupiah(exchangeInTotal)} selesai & tercatat!`, 'success')
      setExchangeStep(null)
      setTab(TAB.TUKAR)
      await loadData()
    } catch (e) {
      showToast(e.message || 'Gagal menyimpan tukar uang', 'error')
    } finally {
      setExchangeSaving(false)
    }
  }

  const grouped = filteredItems.reduce((acc, item) => {
    const key = item.date?.slice(0, 7) || 'unknown'
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})

  const handleTypeSelect = (type) => {
    setSelectedType(type)
    setShowTypePicker(false)
    setForm({ amount: '', amount_raw: '', payment_method: 'cash', customer_cash: '', description: '', notes: '' })
    setShowForm(true)
  }

  const handleKeypadInput = (num) => {
    if (!keypadField) return
    if (keypadField === 'edit_amount') {
      const currentRaw = editAmountRaw || ''
      const currentNum = parseRupiahInput(currentRaw) || 0
      let newNum
      if (num === 1000) {
        newNum = currentNum * 1000
      } else {
        newNum = currentNum * 10 + num
      }
      setEditAmountRaw(formatRupiahInput(String(newNum)))
      return
    }
    const currentRaw = keypadField === 'customer_cash' ? (form.customer_cash || '') : (form.amount_raw || '')
    const currentNum = parseRupiahInput(currentRaw) || 0
    let newNum
    if (num === 1000) {
      newNum = currentNum * 1000
    } else {
      newNum = currentNum * 10 + num
    }
    const newRaw = formatRupiahInput(String(newNum))
    if (keypadField === 'customer_cash') {
      setForm(f => ({ ...f, customer_cash: newRaw }))
    } else {
      setForm(f => ({ ...f, amount_raw: newRaw, amount: String(newNum) }))
    }
  }

  const handleKeypadBackspace = () => {
    if (!keypadField) return
    if (keypadField === 'edit_amount') {
      const currentRaw = editAmountRaw || ''
      const currentNum = parseRupiahInput(currentRaw) || 0
      const newNum = Math.floor(currentNum / 10)
      setEditAmountRaw(newNum > 0 ? formatRupiahInput(String(newNum)) : '')
      return
    }
    const currentRaw = keypadField === 'customer_cash' ? (form.customer_cash || '') : (form.amount_raw || '')
    const currentNum = parseRupiahInput(currentRaw) || 0
    const newNum = Math.floor(currentNum / 10)
    const newRaw = newNum > 0 ? formatRupiahInput(String(newNum)) : ''
    if (keypadField === 'customer_cash') {
      setForm(f => ({ ...f, customer_cash: newRaw }))
    } else {
      setForm(f => ({ ...f, amount_raw: newRaw, amount: String(newNum) }))
    }
  }

  const handleKeypadClear = () => {
    if (!keypadField) return
    if (keypadField === 'edit_amount') {
      setEditAmountRaw('')
      return
    }
    if (keypadField === 'customer_cash') {
      setForm(f => ({ ...f, customer_cash: '' }))
    } else {
      setForm(f => ({ ...f, amount_raw: '', amount: '' }))
    }
  }

  const handleCloseKeypad = () => {
    if (keypadField === 'edit_amount' && !editAmountRaw) {
      setEditAmountRaw(editOriginalRaw)
    }
    setKeypadField(null)
  }

  const handleFormSubmit = () => {
    if (!form.amount || !form.description) {
      showToast('Lengkapi jumlah dan deskripsi', 'error'); return
    }
    setPendingForm({ ...form, type: selectedType })
    setShowForm(false)
    setShowStaffPin(true)
  }

  const handleStaffConfirm = async (employee) => {
    setShowStaffPin(false)
    setSaving(true)
    try {
      const isCash = pendingForm.payment_method === 'cash'
      const isExpense = pendingForm.type === TIPE.PENGELUARAN
      // Trigger drawer immediately (still within user-gesture) before awaiting network call
      if (isCash || isExpense) openCashDrawerOnly()
      await createCashflow({
        type: pendingForm.type,
        amount: parseRupiahInput(pendingForm.amount_raw) || parseFloat(pendingForm.amount) || 0,
        payment_method: isExpense ? 'cash' : pendingForm.payment_method,
        description: pendingForm.description,
        notes: pendingForm.notes || null,
        handled_by: employee.name,
        employee_id: employee.id,
        date: new Date().toISOString().split('T')[0],
      })
      showToast(`${isExpense ? 'Pengeluaran' : 'Pemasukan'} berhasil dicatat!${isCash || isExpense ? ' Laci terbuka.' : ''}`, 'success')
      setPendingForm(null)
      await loadData()
    } catch (e) {
      showToast(e.message || 'Gagal menyimpan', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleEditClick = (item) => {
    setEditingId(item.id)
    const raw = formatRupiahInput(String(item.amount || 0))
    setEditOriginalRaw(raw)
    setEditAmountRaw(raw)
    setEditPaymentMethod(item.payment_method || 'cash')
  }

  const handleEditSave = (id) => {
    const amount = editAmountRaw ? (parseRupiahInput(editAmountRaw) || 0) : (parseRupiahInput(editOriginalRaw) || 0)
    setPendingEdit({
      id,
      amount,
      payment_method: editPaymentMethod,
    })
    setKeypadField(null)
    setShowEditStaffPin(true)
  }

  const handleEditStaffConfirm = async (employee) => {
    setShowEditStaffPin(false)
    if (!pendingEdit) return
    setSaving(true)
    try {
      await updateCashflow(pendingEdit.id, {
        amount: pendingEdit.amount,
        payment_method: pendingEdit.payment_method,
        edited_by: employee.name,
        employee_id: employee.id,
      })
      setEditingId(null)
      setEditAmountRaw('')
      setEditOriginalRaw('')
      setPendingEdit(null)
      showToast('Transaksi berhasil diperbarui', 'success')
      await loadData()
    } catch (e) {
      showToast(e.message || 'Gagal memperbarui', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleEditCancel = () => {
    setEditingId(null)
    setKeypadField(null)
    setEditAmountRaw('')
    setEditOriginalRaw('')
    setPendingEdit(null)
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-5"
        style={{ background: 'linear-gradient(160deg, #0d9488 0%, #0f766e 100%)', borderBottomLeftRadius: '1.5rem', borderBottomRightRadius: '1.5rem' }}>
        <button onClick={() => navigate('/home')}
          className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-white text-lg font-bold">Cashflow</h1>
          <p className="text-white/70 text-xs">Catat pemasukan & pengeluaran</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-4 p-4">
        {/* Left Panel - Cards & Controls */}
        <div className="w-full md:w-1/2 flex flex-col gap-4">
          {/* Previous Month Summary */}
          {prevMonthSummary && (
            <div className="bg-gray-100 rounded-2xl p-3 border border-gray-200">
              <p className="text-xs font-semibold text-gray-500 mb-2">Ringkasan Bulan Lalu ({prevMonthSummary.month})</p>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Pemasukan:</span>
                <span className="font-semibold text-green-600">{formatRupiah(prevMonthSummary.manual_income)}</span>
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span className="text-gray-600">Pengeluaran:</span>
                <span className="font-semibold text-red-500">{formatRupiah(prevMonthSummary.manual_expense)}</span>
              </div>
            </div>
          )}
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-500 rounded-2xl p-4 text-white shadow">
              <p className="text-xs opacity-80">Pemasukan</p>
              <p className="text-xl font-bold mt-1">{formatRupiah(summary?.manual_income || summary?.total_income || 0)}</p>
            </div>
            <div className="bg-red-500 rounded-2xl p-4 text-white shadow">
              <p className="text-xs opacity-80">Pengeluaran</p>
              <p className="text-xl font-bold mt-1">{formatRupiah(summary?.manual_expense || summary?.total_expense || 0)}</p>
            </div>
          </div>

          {/* Search */}
          <div className="flex gap-2">
            <input type="month" value={searchMonth} onChange={e => setSearchMonth(e.target.value)}
              className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            {searchMonth && (
              <button onClick={() => setSearchMonth('')} className="px-3 py-2.5 rounded-xl bg-gray-100 text-gray-500 text-sm">Reset</button>
            )}
          </div>

          {/* Add & Tukar Uang Buttons */}
          <div className="grid grid-cols-2 gap-2.5">
            <button onClick={() => setShowTypePicker(true)}
              className="w-full py-3.5 rounded-2xl bg-teal-500 text-white font-semibold flex items-center justify-center gap-2 shadow hover:bg-teal-600 active:scale-95 transition-all text-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Tambah Cashflow
            </button>
            <button onClick={openExchangeModal}
              className="w-full py-3.5 rounded-2xl bg-amber-500 text-white font-bold flex items-center justify-center gap-2 shadow hover:bg-amber-600 active:scale-95 transition-all text-sm">
              <span>🔄</span>
              <span>Tukar Uang</span>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex bg-gray-100 rounded-2xl p-1 gap-1">
            {[['CASH', TAB.CASH], ['TRANSFER', TAB.TRANSFER], ['PENGELUARAN', TAB.PENGELUARAN], ['TUKAR', TAB.TUKAR]].map(([label, val]) => (
              <button key={val} onClick={() => setTab(val)}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${tab === val ? 'bg-white text-primary shadow' : 'text-gray-500'}`}>
                {label}
              </button>
            ))}
          </div>

        </div>

        {/* Right Panel - List */}
        <div className="w-full md:w-1/2 flex flex-col">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex-1 overflow-y-auto">
            <h2 className="text-gray-800 font-bold text-lg mb-4">Daftar Transaksi</h2>
            {loading && items.length === 0 ? (
              <div className="flex justify-center py-8">
                <svg className="w-7 h-7 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
              </div>
            ) : filteredItems.length === 0 ? (
              <p className="text-center text-gray-400 py-16">Belum ada transaksi.</p>
            ) : (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                {Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0])).map(([month, list]) => (
                  <div key={month}>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                      {new Date(month + '-01').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                    </p>
                    <div className="space-y-2">
                      {list.map(item => (
                        <div key={item.id} className={`rounded-xl p-3 flex items-center gap-3 border transition-colors ${item.is_edited ? 'bg-amber-50/70 border-amber-200' : item.type === 'exchange' ? 'bg-blue-50/50 border-blue-100' : 'bg-gray-50 border-gray-100'}`}>
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${item.type === 'income' ? 'bg-green-100' : item.type === 'exchange' ? 'bg-blue-100 text-blue-600 font-bold' : 'bg-red-100'}`}>
                            {item.type === 'exchange' ? (
                              <span>🔄</span>
                            ) : (
                              <svg className={`w-5 h-5 ${item.type === 'income' ? 'text-green-500' : 'text-red-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.type === 'income' ? 'M5 10l7-7m0 0l7 7m-7-7v18' : 'M19 14l-7 7m0 0l-7-7m7 7V3'} />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-semibold text-gray-800 text-sm truncate">{item.description}</p>
                              {item.is_edited && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-amber-200 text-amber-900 border border-amber-300">
                                  Diedit oleh: {item.edited_by || 'Karyawan'}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400">{formatDateTime(item.created_at || item.date)}{item.handled_by ? ` · Dicatat: ${item.handled_by}` : ''}</p>
                            {item.notes && <p className="text-xs text-gray-600 mt-0.5 whitespace-normal">{item.notes}</p>}
                          </div>
                          {editingId === item.id ? (
                            <div className="flex flex-col gap-2 shrink-0 min-w-[140px]">
                              <input
                                type="text"
                                readOnly
                                value={editAmountRaw || 'Rp 0'}
                                onClick={() => { setEditAmountRaw(''); setKeypadField('edit_amount') }}
                                className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                                disabled={saving}
                              />
                              <select
                                value={editPaymentMethod}
                                onChange={e => setEditPaymentMethod(e.target.value)}
                                className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
                                disabled={saving}
                              >
                                <option value="cash">Cash</option>
                                <option value="transfer">Transfer</option>
                              </select>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleEditSave(item.id)}
                                  disabled={saving}
                                  className="flex-1 py-1 rounded-lg bg-teal-500 text-white text-xs font-semibold disabled:opacity-40"
                                >
                                  Simpan
                                </button>
                                <button
                                  onClick={handleEditCancel}
                                  disabled={saving}
                                  className="flex-1 py-1 rounded-lg bg-gray-200 text-gray-600 text-xs font-semibold disabled:opacity-40"
                                >
                                  Batal
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-right shrink-0">
                              {item.is_edited && item.original_amount !== undefined && item.original_amount !== item.amount && (
                                <p className="text-[11px] text-gray-400 line-through">
                                  {formatRupiah(item.original_amount)}
                                </p>
                              )}
                              <p className={`font-bold text-sm ${item.is_edited ? 'text-amber-700' : item.type === 'income' ? 'text-green-600' : item.type === 'exchange' ? 'text-blue-600' : 'text-red-500'}`}>
                                {item.type === 'income' ? '+' : item.type === 'exchange' ? '🔄 ' : '-'}{formatRupiah(item.amount)}
                              </p>
                              {item.type !== 'exchange' && (
                                <button onClick={() => handleEditClick(item)} className="text-xs text-gray-300 hover:text-teal-500 mt-0.5">edit</button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Type Picker Modal */}
      {showTypePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 pb-8">
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-bold text-gray-800">Pilih Tipe Transaksi</h2>
              <button onClick={() => setShowTypePicker(false)} className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => handleTypeSelect(TIPE.PEMASUKAN)}
                className="flex flex-col items-center justify-center gap-3 py-8 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white font-bold shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-105 active:scale-95 transition-all duration-200">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Pemasukan
              </button>
              <button onClick={() => handleTypeSelect(TIPE.PENGELUARAN)}
                className="flex flex-col items-center justify-center gap-3 py-8 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 text-white font-bold shadow-lg shadow-rose-500/30 hover:shadow-rose-500/50 hover:scale-105 active:scale-95 transition-all duration-200">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
                Pengeluaran
              </button>
            </div>
            <button onClick={openExchangeModal}
              className="w-full mt-4 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold shadow-md flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all">
              <span>🔄</span>
              <span>Tukar Uang (Receh / Pecahan)</span>
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL TUKAR UANG (2 Langkah: 1. Input Uang Ditukar -> Buka Laci -> 2. Isi Pecahan Diambil -> Selesai) ── */}
      {exchangeStep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-5 pb-6 max-h-[92vh] flex flex-col">
            <div className="flex justify-between items-center mb-3 shrink-0">
              <div>
                <h2 className="font-bold text-gray-800 text-base sm:text-lg">
                  {exchangeStep === 'in' ? '🔄 Tukar Uang — Uang yang Akan Ditukar' : '💵 Ambil Pecahan Uang dari Laci'}
                </h2>
                <p className="text-xs text-gray-500">
                  {exchangeStep === 'in'
                    ? 'Langkah 1: Pilih / isi jumlah lembar uang yang masuk ke laci'
                    : 'Langkah 2: Laci sudah terbuka, isikan jumlah lembar pecahan yang diambil'}
                </p>
              </div>
              <button
                onClick={() => setExchangeStep(null)}
                className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200"
              >
                ✕
              </button>
            </div>

            {exchangeStep === 'in' ? (
              <div className="flex-1 flex flex-col min-h-0 space-y-3">
                {/* Tombol Cepat 1-Klik */}
                <div>
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Pilih Cepat Uang yang Ditukar:
                  </p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { val: 100000, lbl: 'Rp 100rb' },
                      { val: 50000, lbl: 'Rp 50rb' },
                      { val: 20000, lbl: 'Rp 20rb' },
                      { val: 10000, lbl: 'Rp 10rb' },
                    ].map(q => {
                      const isActive = exchangeInTotal === q.val && (exchangeInMap[String(q.val)] || 0) === 1
                      return (
                        <button
                          key={q.val}
                          type="button"
                          onClick={() => {
                            const next = emptyDenomMap(IN_DENOMINATIONS)
                            next[String(q.val)] = 1
                            setExchangeInMap(next)
                          }}
                          className={`py-2.5 rounded-xl text-xs font-extrabold border transition-all ${
                            isActive
                              ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                              : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                          }`}
                        >
                          {q.lbl}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Daftar Pecahan & Jumlah Lembar Masuk */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 border-t border-b border-gray-100 py-2">
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    Atau Isi Jumlah Lembar Uang yang Masuk ke Laci:
                  </p>
                  {IN_DENOMINATIONS.map(d => {
                    const count = parseInt(exchangeInMap[String(d.value)], 10) || 0
                    return (
                      <div
                        key={d.value}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl border ${
                          count > 0 ? 'bg-amber-50/70 border-amber-300' : 'bg-gray-50 border-gray-100'
                        }`}
                      >
                        <div>
                          <span className="text-sm font-bold text-gray-800">Rp {d.label}</span>
                          {count > 0 && (
                            <span className="block text-[11px] font-semibold text-amber-700">
                              = {formatRupiah(d.value * count)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setExchangeInMap(prev => ({
                                ...prev,
                                [String(d.value)]: Math.max(0, (parseInt(prev[String(d.value)], 10) || 0) - 1),
                              }))
                            }
                            className="w-8 h-8 rounded-lg bg-white border border-gray-200 text-gray-700 font-bold hover:bg-gray-100"
                          >
                            -
                          </button>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              value={count}
                              onChange={e => {
                                const val = Math.max(0, parseInt(e.target.value, 10) || 0)
                                setExchangeInMap(prev => ({ ...prev, [String(d.value)]: val }))
                              }}
                              className="w-14 text-center px-2 py-1.5 rounded-lg border border-gray-200 text-sm font-bold bg-white"
                            />
                            <span className="text-xs text-gray-500 font-medium">lbr</span>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setExchangeInMap(prev => ({
                                ...prev,
                                [String(d.value)]: (parseInt(prev[String(d.value)], 10) || 0) + 1,
                              }))
                            }
                            className="w-8 h-8 rounded-lg bg-amber-500 text-white font-bold hover:bg-amber-600"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Total Uang Masuk & Tombol TUKAR (Buka Laci) */}
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 shrink-0">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-amber-900">Total Uang yang Akan Ditukar:</span>
                    <span className="text-xl font-black text-amber-800">{formatRupiah(exchangeInTotal)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleStartExchangeDrawer}
                  disabled={exchangeInTotal <= 0}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-extrabold shadow-md hover:from-amber-600 hover:to-orange-600 active:scale-95 transition-all disabled:opacity-40 shrink-0"
                >
                  🔓 TUKAR & BUKA LACI
                </button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0 space-y-3">
                {/* Banner Target Uang yang Ditukar */}
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 flex items-center justify-between shrink-0">
                  <div>
                    <p className="text-[11px] font-bold text-blue-700 uppercase">Uang Masuk (Ditukar)</p>
                    <p className="text-lg font-black text-blue-900">{formatRupiah(exchangeInTotal)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExchangeStep('in')}
                    className="px-2.5 py-1.5 rounded-xl bg-white border border-blue-200 text-xs font-bold text-blue-700 hover:bg-blue-100"
                  >
                    ← Ubah Nominal
                  </button>
                </div>

                {/* Daftar Pecahan Uang yang Diambil dari Laci */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    Isikan Jumlah Lembar / Koin Pecahan yang Diambil dari Laci:
                  </p>
                  {OUT_DENOMINATIONS.map(d => {
                    const count = parseInt(exchangeOutMap[String(d.value)], 10) || 0
                    const canFillRest = exchangeRemaining > 0 && exchangeRemaining >= d.value && exchangeRemaining % d.value === 0
                    const restSheets = canFillRest ? exchangeRemaining / d.value : 0
                    return (
                      <div
                        key={d.value}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl border transition-all ${
                          count > 0 ? 'bg-teal-50/80 border-teal-300' : 'bg-gray-50 border-gray-100'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-bold text-gray-800">Rp {d.label}</span>
                            {canFillRest && (
                              <button
                                type="button"
                                onClick={() =>
                                  setExchangeOutMap(prev => ({
                                    ...prev,
                                    [String(d.value)]: (parseInt(prev[String(d.value)], 10) || 0) + restSheets,
                                  }))
                                }
                                className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-800 font-extrabold border border-amber-300"
                                title="Isi otomatis sisa kekurangan dengan pecahan ini"
                              >
                                +{restSheets} {d.isCoin ? 'koin' : 'lbr'} (Pas)
                              </button>
                            )}
                          </div>
                          {count > 0 && (
                            <span className="block text-[11px] font-bold text-teal-700">
                              = {formatRupiah(d.value * count)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              setExchangeOutMap(prev => ({
                                ...prev,
                                [String(d.value)]: Math.max(0, (parseInt(prev[String(d.value)], 10) || 0) - 1),
                              }))
                            }
                            className="w-8 h-8 rounded-lg bg-white border border-gray-200 text-gray-700 font-bold hover:bg-gray-100"
                          >
                            -
                          </button>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              value={count}
                              onChange={e => {
                                const val = Math.max(0, parseInt(e.target.value, 10) || 0)
                                setExchangeOutMap(prev => ({ ...prev, [String(d.value)]: val }))
                              }}
                              className="w-14 text-center px-2 py-1.5 rounded-lg border border-gray-200 text-sm font-bold bg-white"
                            />
                            <span className="text-xs text-gray-500 font-medium">{d.isCoin ? 'koin' : 'lbr'}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setExchangeOutMap(prev => ({
                                ...prev,
                                [String(d.value)]: (parseInt(prev[String(d.value)], 10) || 0) + 1,
                              }))
                            }
                            className="w-8 h-8 rounded-lg bg-teal-500 text-white font-bold hover:bg-teal-600"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Status Ringkasan Pecahan yang Diambil */}
                <div
                  className={`rounded-2xl p-3.5 border-2 shrink-0 ${
                    exchangeRemaining === 0
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-900'
                      : exchangeRemaining > 0
                      ? 'bg-amber-50 border-amber-300 text-amber-900'
                      : 'bg-red-50 border-red-400 text-red-900'
                  }`}
                >
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span>Total Pecahan Diambil:</span>
                    <span className="text-base font-black">{formatRupiah(exchangeOutTotal)}</span>
                  </div>
                  <p className="text-xs font-extrabold mt-1">
                    {exchangeRemaining === 0
                      ? `✅ PAS! Pecahan yang diambil sudah sesuai (${formatRupiah(exchangeInTotal)})`
                      : exchangeRemaining > 0
                      ? `⚠️ Masih kurang ${formatRupiah(exchangeRemaining)} lagi`
                      : `❌ Kelebihan ${formatRupiah(Math.abs(exchangeRemaining))} dari uang yang ditukar`}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleFinishExchange}
                  disabled={exchangeSaving || exchangeRemaining !== 0 || exchangeOutTotal <= 0}
                  className="w-full py-3.5 rounded-2xl bg-teal-600 text-white font-extrabold shadow-md hover:bg-teal-700 active:scale-95 transition-all disabled:opacity-40 shrink-0"
                >
                  {exchangeSaving ? 'Menyimpan...' : '✅ SELESAI TUKAR UANG'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 pb-8">
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-bold text-gray-800">
                Tambah {selectedType === TIPE.PEMASUKAN ? 'Pemasukan' : 'Pengeluaran'}
              </h2>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center">✕</button>
            </div>
            <div className="space-y-3">
              {selectedType === TIPE.PEMASUKAN && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Metode Pembayaran</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['cash', 'transfer'].map(m => (
                      <button key={m} onClick={() => setForm(f => ({ ...f, payment_method: m }))}
                        className={`py-2.5 rounded-2xl border-2 font-semibold text-sm transition-all ${form.payment_method === m ? 'border-teal-500 bg-teal-50 text-teal-600' : 'border-gray-200 text-gray-500'}`}>
                        {m === 'cash' ? '💵 Cash' : '🏦 Transfer'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah (Rp) *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                  <input type="text" readOnly value={form.amount_raw}
                    onClick={() => setKeypadField('amount')}
                    placeholder="0"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/30 text-lg font-semibold cursor-pointer" />
                </div>
              </div>
              {selectedType === TIPE.PEMASUKAN && form.payment_method === 'cash' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Uang Customer (Rp)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                      <input type="text" readOnly value={form.customer_cash}
                        onClick={() => setKeypadField('customer_cash')}
                        placeholder="0"
                        className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/30 text-lg font-semibold cursor-pointer" />
                    </div>
                  </div>
                  {form.customer_cash && form.amount && (
                    <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-blue-700">Kembalian</span>
                        <span className="text-lg font-bold text-blue-600">
                          {formatRupiah(Math.max(0, parseRupiahInput(form.customer_cash) - parseRupiahInput(form.amount_raw)))}
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi *</label>
                <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Keterangan transaksi..."
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catatan (Opsional)</label>
                <input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Catatan tambahan..."
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              {(form.payment_method === 'cash' || selectedType === TIPE.PENGELUARAN) && (
                <p className="text-xs text-orange-500 flex items-center gap-1">
                  <span>⚠️</span> Laci kasir akan terbuka otomatis setelah disimpan
                </p>
              )}
              <button onClick={handleFormSubmit} disabled={!form.amount || !form.description}
                className="w-full py-3.5 rounded-2xl bg-teal-500 text-white font-bold shadow hover:bg-teal-600 disabled:opacity-40 active:scale-95 transition-all">
                Simpan Cashflow
              </button>
            </div>
          </div>
        </div>
      )}

      {showStaffPin && (
        <StaffPinModal title="Dicatat oleh siapa?" onConfirm={handleStaffConfirm} onCancel={() => { setShowStaffPin(false); setShowForm(true) }} />
      )}

      {showEditStaffPin && (
        <StaffPinModal title="Masukkan PIN Karyawan untuk Simpan Edit" onConfirm={handleEditStaffConfirm} onCancel={() => setShowEditStaffPin(false)} />
      )}

      {/* Custom Numeric Keypad */}
      {keypadField && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={handleCloseKeypad}>
          <div className="bg-white p-4 rounded-2xl w-80" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-semibold text-gray-700">
                {keypadField === 'customer_cash' ? 'Uang Customer (Rp)' : keypadField === 'edit_amount' ? 'Edit Jumlah (Rp)' : 'Jumlah (Rp)'}
              </span>
              <button onClick={handleCloseKeypad} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Display current value */}
            <div className="bg-gray-100 rounded-xl p-3 mb-3 text-center">
              <span className="text-xl font-bold text-gray-800">
                {keypadField === 'customer_cash' ? (form.customer_cash || 'Rp 0') : keypadField === 'edit_amount' ? (editAmountRaw || 'Rp 0') : (form.amount_raw || 'Rp 0')}
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
            <button onClick={handleCloseKeypad} className="w-full py-3 rounded-xl bg-teal-500 text-white font-semibold text-sm">
              Selesai
            </button>
          </div>
        </div>
      )}

      {toast && <Toast key={toast.id} message={toast.message} type={toast.type} onClose={clearToast} />}
    </div>
  )
}
