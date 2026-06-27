import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPrintJobsSummary, getPrintJobs, createPrintJob, updatePrintJob, deletePrintJob, getStock } from '../services/api'
import { formatRupiah, formatDate, formatRupiahInput, parseRupiahInput } from '../utils/format'
import { buildPrintJobReceipt, triggerRawBTPrint } from '../utils/rawbt'
import StaffPinModal from '../components/StaffPinModal'
import Toast from '../components/Toast'
import { useToast } from '../hooks/useToast'

const MATERIALS_KEY = 'print'

const STEP = { LIST: 'list', FORM: 'form', SUMMARY: 'summary', PIN_PRINT: 'pin_print', DETAIL: 'detail' }

export default function PrintJobPage() {
  const navigate = useNavigate()
  const { toast, showToast, clearToast } = useToast()

  const [step, setStep] = useState(STEP.LIST)
  const [summary, setSummary] = useState(null)
  const [jobs, setJobs] = useState([])
  const [stocks, setStocks] = useState([])
  const [loading, setLoading] = useState(true)
  const [detailBahan, setDetailBahan] = useState(null)
  const [searchMonth, setSearchMonth] = useState('')

  // Form state
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    material: '',
    payment_method: 'cash',
    quantity: '',
    harga_normal: '',   // harga satuan tanpa diskon (< 10 pcs)
    harga_diskon: '',   // harga satuan jika qty >= 10 (opsional)
    customer_name: '',
    notes: '',
    customer_cash: '',
    harga_normal_raw: '',
    harga_diskon_raw: '',
    customer_cash_raw: ''
  })
  const [savedJob, setSavedJob] = useState(null)
  const [cashier, setCashier] = useState(null)
  const [saving, setSaving] = useState(false)
  const [editJob, setEditJob] = useState(null)
  const [editForm, setEditForm] = useState(null)

  const qty = parseFloat(form.quantity) || 0
  const hargaNormal = parseRupiahInput(form.harga_normal_raw) || parseFloat(form.harga_normal) || 0
  const hargaDiskon = parseRupiahInput(form.harga_diskon_raw) || parseFloat(form.harga_diskon) || 0
  const stockAvailable = stocks.find(s => s.name === form.material)

  // Tentukan harga yang berlaku
  const hasDiskon = hargaDiskon > 0 && hargaDiskon < hargaNormal
  const getDiskon = qty >= 10 && hasDiskon
  const hargaBerlaku = getDiskon ? hargaDiskon : hargaNormal
  const totalPrice = qty * hargaBerlaku
  const diskonNominal = getDiskon ? qty * (hargaNormal - hargaDiskon) : 0
  const change = Math.max(0, (parseRupiahInput(form.customer_cash_raw) || parseFloat(form.customer_cash) || 0) - totalPrice)

  const loadData = async () => {
    setLoading(true)
    try {
      const [j, st] = await Promise.all([
        getPrintJobs(searchMonth ? `?month=${searchMonth}` : ''),
        getStock(),
      ])
      setJobs(Array.isArray(j) ? j : [])
      setStocks(Array.isArray(st) ? st.filter(s => {
        const cat = (s.usage_category || s.category || '').toString().toUpperCase()
        return cat === '' || cat === 'PRINT'
      }) : [])
    } catch {
      showToast('Gagal memuat data', 'error')
    } finally {
      setLoading(false)
    }
    try {
      const s = await getPrintJobsSummary()
      setSummary(s)
    } catch {
      setSummary(null)
    }
  }

  useEffect(() => { loadData() }, [searchMonth])

  const handleFormChange = (field, value) => setForm(f => ({ ...f, [field]: value }))

  const handleDeleteJob = async (id) => {
    if (!window.confirm('Hapus pekerjaan ini?')) return
    try { await deletePrintJob(id); showToast('Dihapus', 'info'); await loadData() }
    catch (e) { showToast(e.message || 'Gagal menghapus', 'error') }
  }

  const handleOpenEdit = (j) => {
    setEditJob(j)
    setEditForm({
      date: j.date, material: j.material, payment_method: j.payment_method,
      quantity: String(j.quantity), customer_name: j.customer_name || '', notes: j.notes || '',
      harga_normal_raw: formatRupiahInput(String(j.harga_normal || j.price_per_unit || 0)),
      harga_diskon_raw: formatRupiahInput(String(j.harga_diskon || '')),
    })
  }

  const handleSaveEdit = async () => {
    if (!editForm.material || !editForm.quantity || !editForm.harga_normal_raw) {
      showToast('Lengkapi field wajib', 'error'); return
    }
    const hn = parseRupiahInput(editForm.harga_normal_raw)
    const hd = parseRupiahInput(editForm.harga_diskon_raw)
    const q = parseFloat(editForm.quantity) || 0
    const hasD = hd > 0 && hd < hn
    const getD = q >= 10 && hasD
    const hb = getD ? hd : hn
    try {
      await updatePrintJob(editJob.id, {
        date: editForm.date, material: editForm.material,
        payment_method: editForm.payment_method, quantity: q,
        harga_normal: hn, harga_diskon: hasD ? hd : null,
        price_per_unit: hb, total_price: q * hb,
        diskon_nominal: getD ? q * (hn - hd) : 0,
        dapat_diskon: getD,
        customer_name: editForm.customer_name || null,
        notes: editForm.notes || null,
      })
      showToast('Berhasil diperbarui!', 'success')
      setEditJob(null); setEditForm(null)
      await loadData()
    } catch (e) { showToast(e.message || 'Gagal menyimpan', 'error') }
  }

  const handleSaveJob = async () => {
    if (!form.material || !form.quantity || !form.harga_normal_raw) {
      showToast('Lengkapi semua field wajib', 'error'); return
    }
    setSaving(true)
    try {
      const payload = {
        date: form.date,
        material: form.material,
        payment_method: form.payment_method,
        quantity: qty,
        price_per_unit: hargaBerlaku,
        harga_normal: hargaNormal,
        harga_diskon: hasDiskon ? hargaDiskon : null,
        diskon_nominal: diskonNominal,
        dapat_diskon: getDiskon,
        total_price: totalPrice,
        customer_name: form.customer_name || null,
        notes: form.notes || null,
      }
      const res = await createPrintJob(payload)
      setSavedJob({ ...payload, id: res.id || res._id })
      setStep(STEP.SUMMARY)
      await loadData()
    } catch (e) {
      showToast(e.message || 'Gagal menyimpan', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handlePrintConfirm = (employee) => {
    setCashier(employee.name)
    setStep(STEP.LIST)
    const receipt = buildPrintJobReceipt({ job: savedJob, cashier: employee.name, change })
    triggerRawBTPrint(receipt, savedJob.payment_method === 'cash')
    showToast(savedJob.payment_method === 'cash' ? 'Struk dicetak! Laci terbuka.' : 'Struk dicetak!', 'success')
    setForm({ date: new Date().toISOString().split('T')[0], material: '', payment_method: 'cash', quantity: '', harga_normal: '', harga_diskon: '', customer_name: '', notes: '', customer_cash: '' })
  }

  // Group jobs by month
  const grouped = jobs.reduce((acc, j) => {
    const key = j.date?.slice(0, 7) || 'unknown'
    if (!acc[key]) acc[key] = []
    acc[key].push(j)
    return acc
  }, {})

  const bahanList = [...new Set(jobs.map(j => j.material).filter(Boolean))]
  const pendapatanPerBahan = bahanList.map(b => ({
    name: b,
    total: jobs.filter(j => j.material === b).reduce((s, j) => s + (j.total_price || 0), 0),
    jobs: jobs.filter(j => j.material === b),
  }))

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-5"
        style={{ background: 'linear-gradient(160deg, #e8650a 0%, #f59e0b 100%)', borderBottomLeftRadius: '1.5rem', borderBottomRightRadius: '1.5rem' }}>
        <button onClick={() => step !== STEP.LIST ? setStep(STEP.LIST) : navigate('/home')}
          className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-white text-lg font-bold">
            {step === STEP.FORM ? 'Tambah Pekerjaan' : step === STEP.SUMMARY ? 'Ringkasan Print Job' : 'Pekerjaan Printing'}
          </h1>
          <p className="text-white/70 text-xs">Labalaba Advertising</p>
        </div>
      </div>

      {/* ── LIST VIEW ── */}
      {step === STEP.LIST && (
        <div className="flex-1 p-4 space-y-4">
          {/* Summary Card */}
          {summary && (
            <div className="bg-green-500 rounded-2xl p-4 text-white shadow">
              <p className="text-sm opacity-80">Total Pendapatan</p>
              <p className="text-3xl font-bold mt-1">{formatRupiah(summary.total_revenue || 0)}</p>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div className="bg-white/20 rounded-xl p-2.5">
                  <p className="text-xs opacity-80">Total Pekerjaan</p>
                  <p className="text-xl font-bold">{summary.total_jobs || 0}</p>
                </div>
                <div className="bg-white/20 rounded-xl p-2.5 grid grid-cols-2 gap-1">
                  <div>
                    <p className="text-xs opacity-80">Cash</p>
                    <p className="text-sm font-semibold">{formatRupiah(summary.cash_revenue || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs opacity-80">Transfer</p>
                    <p className="text-sm font-semibold">{formatRupiah(summary.transfer_revenue || 0)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Pendapatan Per Bahan */}
          {pendapatanPerBahan.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-600 mb-2">Pendapatan per Bahan</p>
              <div className="grid grid-cols-2 gap-2">
                {pendapatanPerBahan.map(b => (
                  <button key={b.name} onClick={() => setDetailBahan(b)}
                    className="bg-white rounded-2xl p-3 text-left shadow-sm border border-gray-100 hover:shadow-md active:scale-95 transition-all">
                    <p className="text-xs text-gray-500 truncate">{b.name}</p>
                    <p className="text-base font-bold text-primary mt-0.5">{formatRupiah(b.total)}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search */}
          <div className="flex items-center gap-2">
            <input type="month" value={searchMonth} onChange={e => setSearchMonth(e.target.value)}
              className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            {searchMonth && (
              <button onClick={() => setSearchMonth('')} className="px-3 py-2.5 rounded-xl bg-gray-100 text-gray-500 text-sm">Reset</button>
            )}
          </div>

          {/* Add Button */}
          <button onClick={() => setStep(STEP.FORM)}
            className="w-full py-3.5 rounded-2xl bg-primary text-white font-semibold flex items-center justify-center gap-2 shadow hover:bg-primary-dark active:scale-95 transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Tambah Pekerjaan Printing
          </button>

          {/* Job List */}
          {loading ? (
            <div className="flex justify-center py-8">
              <svg className="w-7 h-7 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
            </div>
          ) : (
            Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0])).map(([month, items]) => (
              <div key={month}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  {new Date(month + '-01').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                </p>
                <div className="space-y-2">
                  {items.map(j => (
                    <div key={j.id} className="bg-white rounded-xl px-3 py-2.5 flex items-center gap-2.5 shadow-sm border border-gray-100">
                      <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17H7A2 2 0 015 15V9a2 2 0 012-2h10a2 2 0 012 2v6a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 text-xs truncate">{j.material} · {j.customer_name || '-'}</p>
                        <p className="text-[10px] text-gray-400">{formatDate(j.date)} · {j.payment_method === 'cash' ? 'Cash' : 'Transfer'} · {j.quantity} pcs</p>
                      </div>
                      <p className="font-bold text-gray-800 text-xs shrink-0">{formatRupiah(j.total_price)}</p>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => handleOpenEdit(j)} className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center hover:bg-blue-100 active:scale-95">
                          <svg className="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => handleDeleteJob(j.id)} className="w-6 h-6 rounded-lg bg-red-50 flex items-center justify-center hover:bg-red-100 active:scale-95">
                          <svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── FORM VIEW ── */}
      {step === STEP.FORM && (
        <div className="flex-1 p-4 space-y-4">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal *</label>
              <input type="date" value={form.date} onChange={e => handleFormChange('date', e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bahan *</label>
              <select value={form.material} onChange={e => handleFormChange('material', e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">-- Pilih Bahan --</option>
                {stocks.map(s => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
              {stockAvailable && (
                <p className="text-xs text-green-600 mt-1 ml-1">✓ Stok tersedia: {stockAvailable.quantity} {stockAvailable.unit}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Metode Pembayaran *</label>
              <div className="grid grid-cols-2 gap-3">
                {['cash', 'transfer'].map(m => (
                  <button key={m} onClick={() => handleFormChange('payment_method', m)}
                    className={`py-3 rounded-2xl border-2 font-semibold text-sm transition-all ${form.payment_method === m ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 text-gray-500'}`}>
                    {m === 'cash' ? '💵 Cash' : '🏦 Transfer'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah (pcs) *</label>
              <input type="number" value={form.quantity} onChange={e => handleFormChange('quantity', e.target.value)} placeholder="0"
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>

            {/* Harga */}
            <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-700">Harga Satuan</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Harga Normal / pcs *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">Rp</span>
                    <input type="text" inputMode="numeric" value={form.harga_normal_raw}
                      onChange={e => { const v = formatRupiahInput(e.target.value); handleFormChange('harga_normal_raw', v); handleFormChange('harga_normal', String(parseRupiahInput(v))) }}
                      placeholder="30.000"
                      className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Harga Diskon ≥10 pcs</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">Rp</span>
                    <input type="text" inputMode="numeric" value={form.harga_diskon_raw}
                      onChange={e => { const v = formatRupiahInput(e.target.value); handleFormChange('harga_diskon_raw', v); handleFormChange('harga_diskon', String(parseRupiahInput(v))) }}
                      placeholder="20.000 (opsional)"
                      className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
                  </div>
                </div>
              </div>

              {/* Preview harga berlaku */}
              {hargaNormal > 0 && qty > 0 && (
                <div className={`rounded-xl px-3 py-2.5 ${getDiskon ? 'bg-green-50 border border-green-200' : 'bg-primary/5'}`}>
                  {getDiskon ? (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Harga normal: {formatRupiah(hargaNormal)} × {qty}</span>
                        <span className="line-through">{formatRupiah(hargaNormal * qty)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-green-600 font-medium">
                        <span>🎉 Diskon ≥10 pcs: -{formatRupiah(hargaNormal - hargaDiskon)}/pcs</span>
                        <span>-{formatRupiah(diskonNominal)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-green-700">
                        <span>Total</span>
                        <span>{formatRupiah(totalPrice)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Pekerjaan</span>
                      <span className="font-bold text-primary text-lg">{formatRupiah(totalPrice)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Customer (Opsional)</label>
              <input type="text" value={form.customer_name} onChange={e => handleFormChange('customer_name', e.target.value)} placeholder="Nama customer..."
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Catatan (Opsional)</label>
              <input type="text" value={form.notes} onChange={e => handleFormChange('notes', e.target.value)} placeholder="Catatan tambahan..."
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
          <button onClick={handleSaveJob} disabled={saving || !form.material || !form.quantity || !form.harga_normal}
            className="w-full py-4 rounded-2xl bg-amber-400 text-white font-bold text-base shadow hover:bg-amber-500 disabled:opacity-40 active:scale-95 transition-all">
            {saving ? 'Menyimpan...' : 'Simpan Pekerjaan'}
          </button>
        </div>
      )}

      {/* ── SUMMARY VIEW ── */}
      {step === STEP.SUMMARY && savedJob && (
        <div className="flex-1 p-4 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
            <p className="font-bold text-gray-800 text-base">Ringkasan Pekerjaan</p>
            {[
              ['Tanggal', formatDate(savedJob.date)],
              ['Material', savedJob.material],
              ['Quantity', `${savedJob.quantity} pcs`],
              ['Metode', savedJob.payment_method === 'cash' ? '💵 Cash' : '🏦 Transfer'],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between text-sm">
                <span className="text-gray-500">{l}</span>
                <span className="font-medium text-gray-800">{v}</span>
              </div>
            ))}
            {savedJob.customer_name && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Customer</span>
                <span className="font-medium">{savedJob.customer_name}</span>
              </div>
            )}
            <div className="border-t border-gray-100 pt-3 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Harga normal</span>
                <span>{formatRupiah(savedJob.harga_normal)} × {savedJob.quantity}</span>
              </div>
              {savedJob.dapat_diskon && savedJob.diskon_nominal > 0 && (
                <div className="flex justify-between text-sm text-green-600 font-medium">
                  <span>🎉 Diskon (≥10 pcs)</span>
                  <span>-{formatRupiah(savedJob.diskon_nominal)}</span>
                </div>
              )}
              <div className="flex justify-between pt-1 border-t border-gray-100">
                <span className="font-bold text-gray-700">Total Pekerjaan</span>
                <span className="font-bold text-primary text-lg">{formatRupiah(savedJob.total_price)}</span>
              </div>
            </div>
          </div>

          {/* Hitung Kembalian */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
            <p className="font-bold text-gray-800 text-base">Hitung Kembalian</p>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total Pekerjaan</span>
              <span className="font-semibold">{formatRupiah(savedJob.total_price)}</span>
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Uang Customer</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                <input type="text" inputMode="numeric" value={form.customer_cash_raw}
                  onChange={e => { const v = formatRupiahInput(e.target.value); handleFormChange('customer_cash_raw', v); handleFormChange('customer_cash', String(parseRupiahInput(v))) }}
                  placeholder="0"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/30 text-lg font-semibold" />
              </div>
            </div>
            {form.customer_cash && (
              <div className={`flex justify-between pt-2 border-t border-gray-100 ${change >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                <span className="font-bold">Kembalian</span>
                <span className="font-bold text-xl">{formatRupiah(change)}</span>
              </div>
            )}
          </div>

          <button onClick={() => setStep(STEP.PIN_PRINT)}
            className="w-full py-4 rounded-2xl bg-teal-500 text-white font-bold text-base shadow hover:bg-teal-600 active:scale-95 transition-all flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17H7A2 2 0 015 15V9a2 2 0 012-2h10a2 2 0 012 2v6a2 2 0 01-2 2z" />
            </svg>
            Print Struk
          </button>
          <button onClick={() => setStep(STEP.LIST)} className="w-full py-3 rounded-2xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50">
            ← Kembali ke Daftar
          </button>
        </div>
      )}

      {/* Detail Bahan Modal */}
      {detailBahan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-5 pb-8 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-bold text-gray-800">{detailBahan.name}</p>
                <p className="text-sm text-gray-500">Total: {formatRupiah(detailBahan.total)}</p>
              </div>
              <button onClick={() => setDetailBahan(null)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">✕</button>
            </div>
            <div className="overflow-y-auto space-y-2">
              {detailBahan.jobs.sort((a, b) => new Date(b.date) - new Date(a.date)).map(j => (
                <div key={j.id} className="border border-gray-100 rounded-2xl p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-semibold text-gray-700">{formatDate(j.date)}</p>
                      <p className="text-xs text-gray-400">Qty: {j.quantity} · Customer: {j.customer_name || '-'}</p>
                      {j.notes && <p className="text-xs text-gray-400">Catatan: {j.notes}</p>}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm text-gray-800">{formatRupiah(j.total_price)}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${j.payment_method === 'cash' ? 'bg-orange-100 text-orange-600' : 'bg-teal-100 text-teal-600'}`}>
                        {j.payment_method === 'cash' ? 'Cash' : 'Transfer'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Staff PIN Modal untuk Print */}
      {step === STEP.PIN_PRINT && (
        <StaffPinModal title="Siapa yang melayani?" onConfirm={handlePrintConfirm} onCancel={() => setStep(STEP.SUMMARY)} />
      )}

      {/* ── MODAL EDIT PRINT JOB ── */}
      {editJob && editForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-t-3xl p-5 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between mb-1">
              <p className="font-bold text-gray-800">Edit Print Job</p>
              <button onClick={() => { setEditJob(null); setEditForm(null) }} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">✕</button>
            </div>
            <input type="date" value={editForm.date} onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <select value={editForm.material} onChange={e => setEditForm(f => ({ ...f, material: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
              {stocks.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              {['cash','transfer'].map(m => (
                <button key={m} onClick={() => setEditForm(f => ({ ...f, payment_method: m }))}
                  className={`py-2 rounded-xl border-2 text-sm font-semibold ${editForm.payment_method === m ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 text-gray-500'}`}>
                  {m === 'cash' ? '💵 Cash' : '🏦 Transfer'}
                </button>
              ))}
            </div>
            <input type="number" value={editForm.quantity} onChange={e => setEditForm(f => ({ ...f, quantity: e.target.value }))} placeholder="Jumlah pcs *"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">Rp</span>
                <input type="text" inputMode="numeric" value={editForm.harga_normal_raw}
                  onChange={e => setEditForm(f => ({ ...f, harga_normal_raw: formatRupiahInput(e.target.value) }))}
                  placeholder="Harga normal *"
                  className="w-full pl-8 pr-2 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">Rp</span>
                <input type="text" inputMode="numeric" value={editForm.harga_diskon_raw}
                  onChange={e => setEditForm(f => ({ ...f, harga_diskon_raw: formatRupiahInput(e.target.value) }))}
                  placeholder="Harga diskon"
                  className="w-full pl-8 pr-2 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>
            <input type="text" value={editForm.customer_name} onChange={e => setEditForm(f => ({ ...f, customer_name: e.target.value }))} placeholder="Nama Customer"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <input type="text" value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} placeholder="Catatan"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <button onClick={handleSaveEdit}
              className="w-full py-3 rounded-2xl bg-primary text-white font-bold hover:bg-primary-dark active:scale-95">
              Simpan Perubahan
            </button>
          </div>
        </div>
      )}

      {toast && <Toast key={toast.id} message={toast.message} type={toast.type} onClose={clearToast} />}
    </div>
  )
}
