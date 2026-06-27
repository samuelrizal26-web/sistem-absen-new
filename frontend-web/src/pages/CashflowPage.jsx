import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCashflow, getCashflowSummary, createCashflow, updateCashflow, deleteCashflow } from '../services/api'
import { formatRupiah, formatDate, formatRupiahInput, parseRupiahInput } from '../utils/format'
import { openCashDrawerOnly } from '../utils/rawbt'
import StaffPinModal from '../components/StaffPinModal'
import Toast from '../components/Toast'
import { useToast } from '../hooks/useToast'

const TIPE = { PEMASUKAN: 'income', PENGELUARAN: 'expense' }
const TAB = { CASH: 'cash', TRANSFER: 'transfer', PENGELUARAN: 'expense' }

export default function CashflowPage() {
  const navigate = useNavigate()
  const { toast, showToast, clearToast } = useToast()

  const [summary, setSummary] = useState(null)
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

  const [form, setForm] = useState({
    amount: '',
    amount_raw: '',
    payment_method: 'cash',
    customer_cash: '',
    description: '',
    notes: '',
  })

  const loadData = async () => {
    setLoading(true)
    try {
      const [s, d] = await Promise.all([
        getCashflowSummary(),
        getCashflow(searchMonth ? `?month=${searchMonth}` : ''),
      ])
      setSummary(s)
      setItems(Array.isArray(d) ? d : [])
    } catch {
      showToast('Gagal memuat data', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [searchMonth])

  const filteredItems = items.filter(i => {
    if (tab === TAB.PENGELUARAN) return i.type === 'expense'
    if (tab === TAB.CASH) return i.type === 'income' && i.payment_method === 'cash'
    if (tab === TAB.TRANSFER) return i.type === 'income' && i.payment_method === 'transfer'
    return true
  })

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
      await createCashflow({
        type: pendingForm.type,
        amount: parseRupiahInput(pendingForm.amount_raw) || parseFloat(pendingForm.amount) || 0,
        payment_method: isExpense ? 'cash' : pendingForm.payment_method,
        description: pendingForm.description,
        notes: pendingForm.notes || null,
        handled_by: employee.name,
        date: new Date().toISOString().split('T')[0],
      })
      if (isCash || isExpense) openCashDrawerOnly()
      showToast(`${isExpense ? 'Pengeluaran' : 'Pemasukan'} berhasil dicatat!${isCash || isExpense ? ' Laci terbuka.' : ''}`, 'success')
      setPendingForm(null)
      await loadData()
    } catch (e) {
      showToast(e.message || 'Gagal menyimpan', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus transaksi ini?')) return
    try {
      await deleteCashflow(id)
      showToast('Transaksi dihapus', 'info')
      await loadData()
    } catch (e) {
      showToast(e.message || 'Gagal menghapus', 'error')
    }
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

      <div className="flex-1 p-4 space-y-4">
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

        {/* Add Button */}
        <button onClick={() => setShowTypePicker(true)}
          className="w-full py-3.5 rounded-2xl bg-teal-500 text-white font-semibold flex items-center justify-center gap-2 shadow hover:bg-teal-600 active:scale-95 transition-all">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Tambah Cashflow
        </button>

        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-2xl p-1 gap-1">
          {[['CASH', TAB.CASH], ['TRANSFER', TAB.TRANSFER], ['PENGELUARAN', TAB.PENGELUARAN]].map(([label, val]) => (
            <button key={val} onClick={() => setTab(val)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${tab === val ? 'bg-white text-primary shadow' : 'text-gray-500'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-8">
            <svg className="w-7 h-7 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
          </div>
        ) : filteredItems.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">Belum ada transaksi</p>
        ) : (
          Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0])).map(([month, list]) => (
            <div key={month}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                {new Date(month + '-01').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
              </p>
              <div className="space-y-2">
                {list.map(item => (
                  <div key={item.id} className="bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm border border-gray-100">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${item.type === 'income' ? 'bg-green-100' : 'bg-red-100'}`}>
                      <svg className={`w-5 h-5 ${item.type === 'income' ? 'text-green-500' : 'text-red-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.type === 'income' ? 'M5 10l7-7m0 0l7 7m-7-7v18' : 'M19 14l-7 7m0 0l-7-7m7 7V3'} />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm truncate">{item.description}</p>
                      <p className="text-xs text-gray-400">{formatDate(item.date)} · {item.handled_by || '-'}</p>
                      {item.notes && <p className="text-xs text-gray-400 truncate">{item.notes}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`font-bold text-sm ${item.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                        {item.type === 'income' ? '+' : '-'}{formatRupiah(item.amount)}
                      </p>
                      <button onClick={() => handleDelete(item.id)} className="text-xs text-gray-300 hover:text-red-400 mt-0.5">hapus</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
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
                className="flex flex-col items-center justify-center gap-2 py-6 rounded-2xl border-2 border-green-400 bg-green-50 text-green-600 font-bold hover:bg-green-100 active:scale-95 transition-all">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
                Pemasukan
              </button>
              <button onClick={() => handleTypeSelect(TIPE.PENGELUARAN)}
                className="flex flex-col items-center justify-center gap-2 py-6 rounded-2xl border-2 border-red-400 bg-red-50 text-red-500 font-bold hover:bg-red-100 active:scale-95 transition-all">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                Pengeluaran
              </button>
            </div>
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
                  <input type="text" inputMode="numeric" value={form.amount_raw}
                    onChange={e => { const v = formatRupiahInput(e.target.value); setForm(f => ({ ...f, amount_raw: v, amount: String(parseRupiahInput(v)) })) }}
                    placeholder="0"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/30 text-lg font-semibold" />
                </div>
              </div>
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

      {toast && <Toast key={toast.id} message={toast.message} type={toast.type} onClose={clearToast} />}
    </div>
  )
}
