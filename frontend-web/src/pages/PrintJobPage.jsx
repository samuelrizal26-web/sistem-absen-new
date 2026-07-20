import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { getPrintJobsSummary, getPrintJobs, createPrintJob, updatePrintJob, deletePrintJob, getStock, getFloatingMenu } from '../services/api'
import { formatRupiah, formatDate, formatRupiahInput, parseRupiahInput } from '../utils/format'
import { buildPrintJobReceipt, triggerBrowserPrint } from '../utils/rawbt'
import { printReceiptNative } from '../utils/nativePrint'
import StaffPinModal from '../components/StaffPinModal'
import Toast from '../components/Toast'
import FloatingButton from '../components/FloatingButton'
import PiketModal from '../components/PiketModal'
import { useToast } from '../hooks/useToast'

const MATERIALS_KEY = 'print'

const STEP = { LIST: 'list', FORM: 'form', SUMMARY: 'summary', PIN_PRINT: 'pin_print', PIN_SAVE: 'pin_save', DETAIL: 'detail' }

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
    materials: [], // Array of { name, quantity, harga_normal, harga_diskon, harga_normal_raw, harga_diskon_raw, stock_id, is_custom, unit }
    payment_method: 'cash',
    customer_name: '',
    notes: '',
    customer_cash: '',
    customer_cash_raw: ''
  })
  const [savedJob, setSavedJob] = useState(null)
  const [cashier, setCashier] = useState(null)
  const [saving, setSaving] = useState(false)
  const [menuItems, setMenuItems] = useState([])
  const [showPiketModal, setShowPiketModal] = useState(false)
  const [selectedPiketGroupId, setSelectedPiketGroupId] = useState(null)
  const [editJob, setEditJob] = useState(null)
  const [editForm, setEditForm] = useState(null)
  const [keypadField, setKeypadField] = useState(null) // 'harga_normal' or 'harga_diskon' or null
  const [isEditMode, setIsEditMode] = useState(false)
  const [showLainLainModal, setShowLainLainModal] = useState(false)
  const [lainLainForm, setLainLainForm] = useState({ name: '', harga: '', harga_raw: '', quantity: '' })

  const totalPrice = form.materials.reduce((sum, m) => {
    const hn = parseRupiahInput(m.harga_normal_raw) || parseFloat(m.harga_normal) || 0
    const hd = parseRupiahInput(m.harga_diskon_raw) || parseFloat(m.harga_diskon) || 0
    const qty = parseFloat(m.quantity) || 0
    const hasDiskon = hd > 0 && hd < hn
    const getDiskon = qty >= 10 && hasDiskon
    const hargaBerlaku = getDiskon ? hd : hn
    return sum + qty * hargaBerlaku
  }, 0)
  const change = Math.max(0, (parseRupiahInput(form.customer_cash_raw) || parseFloat(form.customer_cash) || 0) - totalPrice)

  const handleKeypadInput = (num) => {
    if (!keypadField) return

    if (keypadField.startsWith('quantity_')) {
      const idx = parseInt(keypadField.split('_')[1])
      const currentQty = parseFloat(form.materials[idx]?.quantity || 0)
      let newQty = num === 1000 ? currentQty * 1000 : currentQty * 10 + num
      const newMaterials = [...form.materials]
      newMaterials[idx] = { ...newMaterials[idx], quantity: String(newQty) }
      setForm(f => ({ ...f, materials: newMaterials }))
    } else if (keypadField.startsWith('harga_normal_')) {
      const idx = parseInt(keypadField.split('_')[2])
      const currentRaw = form.materials[idx]?.harga_normal_raw || ''
      const currentNum = parseRupiahInput(currentRaw) || 0
      let newNum = num === 1000 ? currentNum * 1000 : currentNum * 10 + num
      const newRaw = formatRupiahInput(String(newNum))
      const newMaterials = [...form.materials]
      newMaterials[idx] = { ...newMaterials[idx], harga_normal_raw: newRaw, harga_normal: String(newNum) }
      setForm(f => ({ ...f, materials: newMaterials }))
    } else if (keypadField.startsWith('harga_diskon_')) {
      const idx = parseInt(keypadField.split('_')[2])
      const currentRaw = form.materials[idx]?.harga_diskon_raw || ''
      const currentNum = parseRupiahInput(currentRaw) || 0
      let newNum = num === 1000 ? currentNum * 1000 : currentNum * 10 + num
      const newRaw = formatRupiahInput(String(newNum))
      const newMaterials = [...form.materials]
      newMaterials[idx] = { ...newMaterials[idx], harga_diskon_raw: newRaw, harga_diskon: String(newNum) }
      setForm(f => ({ ...f, materials: newMaterials }))
    } else if (keypadField === 'lain_lain_harga') {
      const currentRaw = lainLainForm.harga_raw || ''
      const currentNum = parseRupiahInput(currentRaw) || 0
      let newNum = num === 1000 ? currentNum * 1000 : currentNum * 10 + num
      const newRaw = formatRupiahInput(String(newNum))
      setLainLainForm(f => ({ ...f, harga_raw: newRaw, harga: String(newNum) }))
    } else if (keypadField === 'lain_lain_qty') {
      const currentQty = parseFloat(lainLainForm.quantity || 0)
      let newQty = num === 1000 ? currentQty * 1000 : currentQty * 10 + num
      setLainLainForm(f => ({ ...f, quantity: String(newQty) }))
    } else if (isEditMode) {
      // Handle edit mode fields
      if (keypadField === 'quantity') {
        const currentQty = parseFloat(editForm.quantity || 0)
        let newQty = num === 1000 ? currentQty * 1000 : currentQty * 10 + num
        setEditForm(f => ({ ...f, quantity: String(newQty) }))
      } else if (keypadField === 'harga_normal' || keypadField === 'harga_diskon') {
        const currentRaw = editForm[`${keypadField}_raw`] || ''
        const currentNum = parseRupiahInput(currentRaw) || 0
        let newNum = num === 1000 ? currentNum * 1000 : currentNum * 10 + num
        const newRaw = formatRupiahInput(String(newNum))
        setEditForm(f => ({ ...f, [`${keypadField}_raw`]: newRaw, [keypadField]: String(newNum) }))
      }
    }
  }

  const handleKeypadBackspace = () => {
    if (!keypadField) return

    if (keypadField.startsWith('quantity_')) {
      const idx = parseInt(keypadField.split('_')[1])
      const currentQty = parseFloat(form.materials[idx]?.quantity || 0)
      const newQty = Math.floor(currentQty / 10)
      const newMaterials = [...form.materials]
      newMaterials[idx] = { ...newMaterials[idx], quantity: String(newQty) }
      setForm(f => ({ ...f, materials: newMaterials }))
    } else if (keypadField.startsWith('harga_normal_') || keypadField.startsWith('harga_diskon_')) {
      const idx = parseInt(keypadField.split('_')[2])
      const field = keypadField.split('_')[1]
      const currentRaw = form.materials[idx]?.[`${field}_raw`] || 'Rp 0'
      const currentNum = parseRupiahInput(currentRaw) || 0
      const newNum = Math.floor(currentNum / 10)
      const newRaw = newNum > 0 ? formatRupiahInput(String(newNum)) : ''
      const newMaterials = [...form.materials]
      newMaterials[idx] = { ...newMaterials[idx], [`${field}_raw`]: newRaw, [field]: String(newNum) }
      setForm(f => ({ ...f, materials: newMaterials }))
    } else if (keypadField === 'lain_lain_harga') {
      const currentRaw = lainLainForm.harga_raw || ''
      const currentNum = parseRupiahInput(currentRaw) || 0
      const newNum = Math.floor(currentNum / 10)
      const newRaw = newNum > 0 ? formatRupiahInput(String(newNum)) : ''
      setLainLainForm(f => ({ ...f, harga_raw: newRaw, harga: String(newNum) }))
    } else if (keypadField === 'lain_lain_qty') {
      const currentQty = parseFloat(lainLainForm.quantity || 0)
      const newQty = Math.floor(currentQty / 10)
      setLainLainForm(f => ({ ...f, quantity: String(newQty) }))
    } else if (keypadField === 'customer_cash') {
      const currentRaw = form.customer_cash_raw || ''
      const currentNum = parseRupiahInput(currentRaw) || 0
      const newNum = Math.floor(currentNum / 10)
      const newRaw = newNum > 0 ? formatRupiahInput(String(newNum)) : ''
      setForm(f => ({ ...f, customer_cash_raw: newRaw, customer_cash: String(newNum) }))
    } else if (isEditMode) {
      // Handle edit mode fields
      if (keypadField === 'quantity') {
        const currentQty = parseFloat(editForm.quantity || 0)
        const newQty = Math.floor(currentQty / 10)
        setEditForm(f => ({ ...f, quantity: String(newQty) }))
      } else if (keypadField === 'harga_normal' || keypadField === 'harga_diskon') {
        const currentRaw = editForm[`${keypadField}_raw`] || ''
        const currentNum = parseRupiahInput(currentRaw) || 0
        const newNum = Math.floor(currentNum / 10)
        const newRaw = newNum > 0 ? formatRupiahInput(String(newNum)) : ''
        setEditForm(f => ({ ...f, [`${keypadField}_raw`]: newRaw, [keypadField]: String(newNum) }))
      }
    }
  }

  const handleKeypadClear = () => {
    if (!keypadField) return

    if (keypadField.startsWith('quantity_')) {
      const idx = parseInt(keypadField.split('_')[1])
      const newMaterials = [...form.materials]
      newMaterials[idx] = { ...newMaterials[idx], quantity: '' }
      setForm(f => ({ ...f, materials: newMaterials }))
    } else if (keypadField.startsWith('harga_normal_') || keypadField.startsWith('harga_diskon_')) {
      const idx = parseInt(keypadField.split('_')[2])
      const field = keypadField.split('_')[1]
      const newMaterials = [...form.materials]
      newMaterials[idx] = { ...newMaterials[idx], [`${field}_raw`]: '', [field]: '' }
      setForm(f => ({ ...f, materials: newMaterials }))
    } else if (keypadField === 'lain_lain_harga') {
      setLainLainForm(f => ({ ...f, harga_raw: '', harga: '' }))
    } else if (keypadField === 'lain_lain_qty') {
      setLainLainForm(f => ({ ...f, quantity: '' }))
    } else if (keypadField === 'customer_cash') {
      setForm(f => ({ ...f, customer_cash_raw: '', customer_cash: '' }))
    } else if (isEditMode) {
      // Handle edit mode fields
      if (keypadField === 'quantity') {
        setEditForm(f => ({ ...f, quantity: '' }))
      } else if (keypadField === 'harga_normal' || keypadField === 'harga_diskon') {
        setEditForm(f => ({ ...f, [`${keypadField}_raw`]: '', [keypadField]: '' }))
      }
    }
  }

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

  useEffect(() => {
    loadFloatingMenu()
  }, [])

  const loadFloatingMenu = async () => {
    try {
      const data = await getFloatingMenu()
      setMenuItems(data || [])
    } catch {
      setMenuItems([])
    }
  }

  const handleFloatingMenuItemClick = (item) => {
    if (item.type === 'navigation' && item.target) {
      navigate(item.target)
    } else if (item.type === 'piket' && item.target) {
      setSelectedPiketGroupId(item.target)
      setShowPiketModal(true)
    }
  }

  const handleFormChange = (field, value) => setForm(f => ({ ...f, [field]: value }))

  const handleAddMaterial = (materialName) => {
    const stock = stocks.find(s => s.name === materialName)
    const newMaterial = {
      name: materialName,
      quantity: '',
      harga_normal: '',
      harga_normal_raw: '',
      harga_diskon: '',
      harga_diskon_raw: '',
      stock_id: stock?.id,
      is_custom: false,
      unit: stock?.unit || 'pcs'
    }
    setForm(f => ({ ...f, materials: [...f.materials, newMaterial] }))
  }

  const handleRemoveMaterial = (index) => {
    setForm(f => ({ ...f, materials: f.materials.filter((_, i) => i !== index) }))
  }

  const handleAddLainLain = () => {
    if (!lainLainForm.name || !lainLainForm.harga || !lainLainForm.quantity) {
      showToast('Lengkapi nama, harga dan jumlah', 'error')
      return
    }
    const newMaterial = {
      name: lainLainForm.name,
      quantity: lainLainForm.quantity,
      harga_normal: lainLainForm.harga,
      harga_normal_raw: lainLainForm.harga_raw,
      harga_diskon: '',
      harga_diskon_raw: '',
      stock_id: null,
      is_custom: true,
      unit: 'pcs'
    }
    setForm(f => ({ ...f, materials: [...f.materials, newMaterial] }))
    setLainLainForm({ name: '', harga: '', harga_raw: '', quantity: '' })
    setShowLainLainModal(false)
  }

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
    if (form.materials.length === 0) {
      showToast('Tambah minimal 1 bahan', 'error'); return
    }
    // Validate all materials have required fields
    for (let i = 0; i < form.materials.length; i++) {
      const m = form.materials[i]
      if (!m.name || !m.quantity || !m.harga_normal_raw) {
        showToast(`Lengkapi field bahan #${i + 1}`, 'error'); return
      }
    }
    // Show PIN modal to capture cashier info
    setStep(STEP.PIN_SAVE)
  }

  const handlePinSaveConfirm = async (employee) => {
    setSaving(true)
    setCashier(employee.name)
    console.log('Employee dari PIN:', JSON.stringify(employee))
    try {
      const materialsPayload = form.materials.map(m => ({
        name: m.name,
        quantity: parseFloat(m.quantity) || 0,
        unit: m.unit || 'pcs',
        harga_normal: parseRupiahInput(m.harga_normal_raw) || parseFloat(m.harga_normal) || 0,
        harga_diskon: parseRupiahInput(m.harga_diskon_raw) || parseFloat(m.harga_diskon) || null,
        stock_id: m.stock_id,
        is_custom: m.is_custom || false
      }))
      const payload = {
        date: form.date,
        materials: materialsPayload,
        payment_method: form.payment_method,
        customer_name: form.customer_name || null,
        notes: form.notes || null,
        cashier: employee.name,
        cashier_id: employee.id,
      }
      console.log('Payload yang dikirim:', JSON.stringify(payload))
      const res = await createPrintJob(payload)
      console.log('Response dari backend:', JSON.stringify(res))
      setSavedJob({ ...payload, id: res.id || res._id, total_price: totalPrice })
      setStep(STEP.SUMMARY)
      await loadData()
    } catch (e) {
      showToast(e.message || 'Gagal menyimpan', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handlePrintConfirm = async () => {
    setStep(STEP.LIST)
  }

  const handlePrint = async () => {
    if (!savedJob) return
    const isNative = Capacitor.isNativePlatform()
    if (isNative) {
      try {
        await printReceiptNative({ job: { ...savedJob, cashier }, cashier, change, openDrawer: savedJob.payment_method === 'cash' })
        showToast('Struk dicetak!', 'success')
        setStep(STEP.LIST)
      } catch (e) {
        showToast(e.message || 'Gagal mencetak. Cek koneksi Bluetooth printer.', 'error')
      }
    } else {
      const receipt = buildPrintJobReceipt({ job: { ...savedJob, cashier }, cashier, change })
      triggerBrowserPrint(receipt)
      showToast('Struk dicetak!', 'success')
      setStep(STEP.LIST)
    }
    setForm({ date: new Date().toISOString().split('T')[0], materials: [], payment_method: 'cash', customer_name: '', notes: '', customer_cash: '', customer_cash_raw: '' })
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
        <div className="flex-1 flex flex-col p-4 gap-4">
          {/* Top 2-Column Layout */}
          <div className="flex flex-col md:flex-row gap-4">
            {/* Left Panel - Summary & Materials */}
            <div className="w-full md:w-1/2 flex flex-col gap-4">
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
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                  <p className="text-sm font-semibold text-gray-600 mb-3">Pendapatan per Bahan</p>
                  <div className="space-y-2">
                    {pendapatanPerBahan.map(b => (
                      <button key={b.name} onClick={() => setDetailBahan(b)}
                        className="w-full bg-gray-50 rounded-xl p-3 text-left hover:bg-gray-100 active:scale-95 transition-all">
                        <p className="text-xs text-gray-500 truncate">{b.name}</p>
                        <p className="text-base font-bold text-primary mt-0.5">{formatRupiah(b.total)}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Panel - Form */}
            <div className="w-full md:w-1/2 flex flex-col">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex-1 overflow-y-auto">
                <p className="text-sm font-semibold text-gray-600 mb-3">Tambah Pekerjaan Printing</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Tanggal *</label>
                    <input type="date" value={form.date} onChange={e => handleFormChange('date', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>

                  {/* Materials List */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-medium text-gray-700">Bahan *</label>
                      <div className="flex gap-1">
                        <select value="" onChange={e => { if (e.target.value) handleAddMaterial(e.target.value) }}
                          className="px-2 py-1 rounded-lg border border-gray-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-primary/30">
                          <option value="">+ Tambah</option>
                          {stocks.map(s => (
                            <option key={s.id} value={s.name}>{s.name}</option>
                          ))}
                        </select>
                        <button onClick={() => setShowLainLainModal(true)}
                          className="px-2 py-1 rounded-lg bg-purple-100 text-purple-700 text-xs font-semibold hover:bg-purple-200">
                          + Lain Lain
                        </button>
                      </div>
                    </div>
                    {form.materials.length === 0 ? (
                      <p className="text-xs text-gray-400 italic mt-1">Belum ada bahan ditambahkan</p>
                    ) : (
                      <div className="space-y-2 mt-2 max-h-48 overflow-y-auto">
                        {form.materials.map((m, idx) => (
                          <div key={idx} className="bg-gray-50 rounded-xl p-2 border border-gray-200">
                            <div className="flex justify-between items-start mb-1">
                              <span className="text-xs font-semibold text-gray-700">{m.name}</span>
                              <button onClick={() => handleRemoveMaterial(idx)} className="text-red-400 hover:text-red-600">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[10px] text-gray-500 mb-1">Jumlah</label>
                                <input type="text" readOnly value={m.quantity}
                                  onClick={() => { setIsEditMode(false); setKeypadField(`quantity_${idx}`) }}
                                  placeholder="0"
                                  className="w-full px-2 py-1 rounded-lg border border-gray-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer" />
                              </div>
                              <div>
                                <label className="block text-[10px] text-gray-500 mb-1">Harga Normal</label>
                                <div className="relative">
                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">Rp</span>
                                  <input type="text" readOnly value={m.harga_normal_raw}
                                    onClick={() => { setIsEditMode(false); setKeypadField(`harga_normal_${idx}`) }}
                                    placeholder="30.000"
                                    className="w-full pl-6 pr-2 py-1 rounded-lg border border-gray-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer" />
                                </div>
                              </div>
                            </div>
                            <div className="mt-1">
                              <label className="block text-[10px] text-gray-500 mb-1">Harga Diskon (≥10 pcs)</label>
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">Rp</span>
                                <input type="text" readOnly value={m.harga_diskon_raw}
                                  onClick={() => { setIsEditMode(false); setKeypadField(`harga_diskon_${idx}`) }}
                                  placeholder="Opsional"
                                  className="w-full pl-6 pr-2 py-1 rounded-lg border border-gray-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Metode Pembayaran *</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['cash', 'transfer'].map(m => (
                        <button key={m} onClick={() => handleFormChange('payment_method', m)}
                          className={`py-2 rounded-xl border-2 font-semibold text-xs transition-all ${form.payment_method === m ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 text-gray-500'}`}>
                          {m === 'cash' ? '💵 Cash' : '🏦 Transfer'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Total harga semua materials */}
                  {form.materials.length > 0 && (
                    <div className="bg-primary/5 rounded-xl p-3 border border-primary/20">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-semibold text-gray-700">Total Harga</span>
                        <span className="text-lg font-bold text-primary">{formatRupiah(totalPrice)}</span>
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Nama Customer</label>
                    <input type="text" value={form.customer_name} onChange={e => handleFormChange('customer_name', e.target.value)} placeholder="Nama customer..."
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Catatan</label>
                    <input type="text" value={form.notes} onChange={e => handleFormChange('notes', e.target.value)} placeholder="Catatan tambahan..."
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <button onClick={handleSaveJob} disabled={saving || form.materials.length === 0}
                    className="w-full py-3 rounded-xl bg-amber-400 text-white font-bold text-sm shadow hover:bg-amber-500 disabled:opacity-40 active:scale-95 transition-all">
                    {saving ? 'Menyimpan...' : 'Simpan Pekerjaan'}
                  </button>
                </div>
              </div>

              {/* Custom Numeric Keypad */}
              {keypadField && !isEditMode && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setKeypadField(null)}>
                  <div className="bg-white p-4 rounded-2xl w-80" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-semibold text-gray-700">
                        {keypadField.startsWith('quantity_') ? 'Jumlah Pcs' :
                         keypadField.startsWith('harga_normal_') ? 'Harga Normal' :
                         keypadField.startsWith('harga_diskon_') ? 'Harga Diskon' :
                         keypadField === 'lain_lain_harga' ? 'Harga Item' :
                         keypadField === 'lain_lain_qty' ? 'Jumlah Item' :
                         'Input'}
                      </span>
                      <button onClick={() => setKeypadField(null)} className="text-gray-400 hover:text-gray-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    {/* Display current value */}
                    <div className="bg-gray-100 rounded-xl p-3 mb-3 text-center">
                      <span className="text-xl font-bold text-gray-800">
                        {(() => {
                          if (keypadField.startsWith('quantity_')) {
                            const idx = parseInt(keypadField.split('_')[1])
                            return form.materials[idx]?.quantity || '0'
                          } else if (keypadField.startsWith('harga_normal_')) {
                            const idx = parseInt(keypadField.split('_')[2])
                            return form.materials[idx]?.harga_normal_raw || 'Rp 0'
                          } else if (keypadField.startsWith('harga_diskon_')) {
                            const idx = parseInt(keypadField.split('_')[2])
                            return form.materials[idx]?.harga_diskon_raw || 'Rp 0'
                          } else if (keypadField === 'lain_lain_harga') {
                            return lainLainForm.harga_raw || 'Rp 0'
                          } else if (keypadField === 'lain_lain_qty') {
                            return lainLainForm.quantity || '0'
                          }
                          return '0'
                        })()}
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
                      <button onClick={handleKeypadBackspace} className="py-3 rounded-xl bg-orange-100 text-lg font-semibold text-orange-600 hover:bg-orange-200 active:bg-orange-300 transition-all">
                        ⌫
                      </button>
                    </div>
                    <button onClick={() => handleKeypadInput(1000)} className="w-full py-3 rounded-xl bg-blue-100 text-lg font-semibold text-blue-600 hover:bg-blue-200 active:bg-blue-300 transition-all mb-2">
                      000
                    </button>
                    <button onClick={() => setKeypadField(null)} className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm">
                      Selesai
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom - Full Width Job List */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-gray-800 font-bold text-lg">Daftar Pekerjaan</h2>
              <div className="flex items-center gap-2">
                <input type="month" value={searchMonth} onChange={e => setSearchMonth(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30" />
                {searchMonth && (
                  <button onClick={() => setSearchMonth('')} className="px-3 py-2 rounded-xl bg-gray-100 text-gray-500 text-xs">Reset</button>
                )}
              </div>
            </div>
            {loading ? (
              <div className="flex justify-center py-8">
                <svg className="w-7 h-7 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
              </div>
            ) : Object.keys(grouped).length === 0 ? (
              <p className="text-center text-gray-400 py-16">Belum ada pekerjaan.</p>
            ) : (
              <div className="space-y-4 overflow-y-auto max-h-[40vh]">
                {Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0])).map(([month, items]) => (
                  <div key={month}>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                      {new Date(month + '-01').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                    </p>
                    <div className="space-y-2">
                      {items.map(j => (
                        <div key={j.id} className="bg-gray-50 rounded-xl px-3 py-2.5 flex items-center gap-2.5 border border-gray-100">
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
                ))}
              </div>
            )}
          </div>
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
              <input type="text" readOnly value={form.quantity}
                onClick={() => { setIsEditMode(false); setKeypadField('quantity') }}
                placeholder="0"
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer" />
            </div>

            {/* Harga */}
            <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-700">Harga Satuan</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Harga Normal / pcs *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">Rp</span>
                    <input type="text" readOnly value={form.harga_normal_raw}
                      onClick={() => { setIsEditMode(false); setKeypadField('harga_normal') }}
                      placeholder="30.000"
                      className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm cursor-pointer" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Harga Diskon ≥10 pcs</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">Rp</span>
                    <input type="text" readOnly value={form.harga_diskon_raw}
                      onClick={() => { setIsEditMode(false); setKeypadField('harga_diskon') }}
                      placeholder="20.000 (opsional)"
                      className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm cursor-pointer" />
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

          <button onClick={handlePrint}
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

      {/* Lain Lain Modal */}
      {showLainLainModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-5">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Tambah Item Lain-Lain</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nama Item *</label>
                <input type="text" value={lainLainForm.name} onChange={e => setLainLainForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Contoh: Jasa desain"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Harga *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">Rp</span>
                  <input type="text" readOnly value={lainLainForm.harga_raw}
                    onClick={() => setKeypadField('lain_lain_harga')}
                    placeholder="0"
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Jumlah *</label>
                <input type="text" readOnly value={lainLainForm.quantity}
                  onClick={() => setKeypadField('lain_lain_qty')}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer" />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => { setShowLainLainModal(false); setLainLainForm({ name: '', harga: '', harga_raw: '', quantity: '' }) }}
                  className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50">
                  Batal
                </button>
                <button onClick={handleAddLainLain}
                  className="flex-1 py-2 rounded-xl bg-purple-500 text-white font-semibold text-sm hover:bg-purple-600">
                  Tambah
                </button>
              </div>
            </div>
          </div>
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

      {/* Staff PIN Modal untuk Save */}
      {step === STEP.PIN_SAVE && (
        <StaffPinModal title="Siapa yang melayani?" onConfirm={handlePinSaveConfirm} onCancel={() => setStep(STEP.FORM)} />
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
            <input type="text" readOnly value={editForm.quantity}
              onClick={() => { setIsEditMode(true); setKeypadField('quantity') }}
              placeholder="Jumlah pcs *"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer" />
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">Rp</span>
                <input type="text" readOnly value={editForm.harga_normal_raw}
                  onClick={() => { setIsEditMode(true); setKeypadField('harga_normal') }}
                  placeholder="Harga normal *"
                  className="w-full pl-8 pr-2 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer" />
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">Rp</span>
                <input type="text" readOnly value={editForm.harga_diskon_raw}
                  onClick={() => { setIsEditMode(true); setKeypadField('harga_diskon') }}
                  placeholder="Harga diskon"
                  className="w-full pl-8 pr-2 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer" />
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
            
            {/* Custom Numeric Keypad for Edit Mode */}
            {keypadField && isEditMode && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => { setKeypadField(null); setIsEditMode(false) }}>
                <div className="bg-white p-4 rounded-2xl w-80" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-semibold text-gray-700">
                      {keypadField === 'quantity' ? 'Jumlah Pcs' : (keypadField === 'harga_normal' ? 'Harga Normal' : 'Harga Diskon')}
                    </span>
                    <button onClick={() => { setKeypadField(null); setIsEditMode(false) }} className="text-gray-400 hover:text-gray-600">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  {/* Display current value */}
                  <div className="bg-gray-100 rounded-xl p-3 mb-3 text-center">
                    <span className="text-xl font-bold text-gray-800">
                      {keypadField === 'quantity' 
                        ? (editForm.quantity || '0') 
                        : (keypadField === 'harga_normal' ? (editForm.harga_normal_raw || 'Rp 0') : (editForm.harga_diskon_raw || 'Rp 0'))}
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
                    <button onClick={handleKeypadBackspace} className="py-3 rounded-xl bg-orange-100 text-lg font-semibold text-orange-600 hover:bg-orange-200 active:bg-orange-300 transition-all">
                      ⌫
                    </button>
                  </div>
                  <button onClick={() => handleKeypadInput(1000)} className="w-full py-3 rounded-xl bg-blue-100 text-lg font-semibold text-blue-600 hover:bg-blue-200 active:bg-blue-300 transition-all mb-2">
                    000
                  </button>
                  <button onClick={() => { setKeypadField(null); setIsEditMode(false) }} className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm">
                    Selesai
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {toast && <Toast key={toast.id} message={toast.message} type={toast.type} onClose={clearToast} />}
      <FloatingButton menuItems={menuItems} onItemClick={handleFloatingMenuItemClick} />
      {showPiketModal && (
        <PiketModal
          groupId={selectedPiketGroupId}
          onClose={() => setShowPiketModal(false)}
          showToast={showToast}
        />
      )}
    </div>
  )
}
