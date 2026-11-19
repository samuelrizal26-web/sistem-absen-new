import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { getPrintJobsSummary, getPrintJobs, createPrintJob, updatePrintJob, deletePrintJob, getStock } from '../services/api'
import { formatRupiah, formatDate, formatDateTime, formatRupiahInput, parseRupiahInput } from '../utils/format'
import { buildPrintJobReceipt, triggerBrowserPrint } from '../utils/rawbt'
import { printReceiptNative } from '../utils/nativePrint'
import StaffPinModal from '../components/StaffPinModal'
import Toast from '../components/Toast'
import { useToast } from '../hooks/useToast'

const MATERIALS_KEY = 'print'

const STEP = { LIST: 'list', FORM: 'form', SUMMARY: 'summary', PIN_PRINT: 'pin_print', PIN_SAVE: 'pin_save', DETAIL: 'detail' }

// Periode ringkasan & daftar selalu YYYY-MM. Bulan berjalan memakai WIB (UTC+7), sama dengan default backend.
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/
const currentMonthWIB = () => new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 7)

export default function PrintJobPage() {
  const navigate = useNavigate()
  const { toast, showToast, clearToast } = useToast()

  const [step, setStep] = useState(STEP.LIST)
  const [summary, setSummary] = useState(null)
  const [jobs, setJobs] = useState([])
  const [stocks, setStocks] = useState([])
  const [loading, setLoading] = useState(true)
  const [detailBahan, setDetailBahan] = useState(null)
  const [searchMonth, setSearchMonth] = useState(() => currentMonthWIB())
  const searchMonthRef = useRef(searchMonth)
  searchMonthRef.current = searchMonth // selalu bulan terbaru; dipakai loadData agar tidak memakai closure lama
  const loadSeq = useRef(0)
  // Kartu hanya tampil bila ringkasannya memang untuk bulan yang sedang aktif.
  const summaryData = summary && summary.month === searchMonth ? summary.data : null

  const handleMonthChange = (value) => {
    if (!value) { setSearchMonth(currentMonthWIB()); return } // input dikosongkan -> bulan berjalan
    if (MONTH_RE.test(value)) setSearchMonth(value)            // nilai tidak valid diabaikan
  }

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
    } else if (keypadField.startsWith('harga_normal_')) {
      const idx = parseInt(keypadField.split('_')[2])
      const currentRaw = form.materials[idx]?.harga_normal_raw || ''
      const currentNum = parseRupiahInput(currentRaw) || 0
      const newNum = Math.floor(currentNum / 10)
      const newRaw = newNum > 0 ? formatRupiahInput(String(newNum)) : ''
      const newMaterials = [...form.materials]
      newMaterials[idx] = { ...newMaterials[idx], harga_normal_raw: newRaw, harga_normal: String(newNum) }
      setForm(f => ({ ...f, materials: newMaterials }))
    } else if (keypadField.startsWith('harga_diskon_')) {
      const idx = parseInt(keypadField.split('_')[2])
      const currentRaw = form.materials[idx]?.harga_diskon_raw || ''
      const currentNum = parseRupiahInput(currentRaw) || 0
      const newNum = Math.floor(currentNum / 10)
      const newRaw = newNum > 0 ? formatRupiahInput(String(newNum)) : ''
      const newMaterials = [...form.materials]
      newMaterials[idx] = { ...newMaterials[idx], harga_diskon_raw: newRaw, harga_diskon: String(newNum) }
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

  // Satu pemuatan = satu periode: daftar dan ringkasan memakai snapshot `month` yang SAMA.
  // `loadSeq` membuang respons kedaluwarsa (mis. pengguna ganti bulan saat request sebelumnya berjalan).
  const loadData = async () => {
    const month = searchMonthRef.current
    const seq = ++loadSeq.current
    if (jobs.length === 0) setLoading(true)
    const [jobsRes, stockRes, summaryRes] = await Promise.allSettled([
      getPrintJobs(`?month=${encodeURIComponent(month)}`),
      getStock(),
      getPrintJobsSummary(month),
    ])
    if (seq !== loadSeq.current) return // ada pemuatan yang lebih baru; abaikan hasil ini

    if (jobsRes.status === 'fulfilled') {
      setJobs(Array.isArray(jobsRes.value) ? jobsRes.value : [])
    } else {
      setJobs([]) // jangan biarkan daftar bulan sebelumnya tampil di bawah bulan baru
    }
    if (stockRes.status === 'fulfilled') {
      const st = stockRes.value
      setStocks(Array.isArray(st) ? st.filter(s => {
        const cat = (s.usage_category || s.category || '').toString().toUpperCase()
        return cat === '' || cat === 'PRINT'
      }) : [])
    }
    if (jobsRes.status === 'rejected' || stockRes.status === 'rejected') {
      showToast('Gagal memuat data', 'error')
    }

    if (summaryRes.status === 'fulfilled') {
      setSummary({ month, data: summaryRes.value })
    } else {
      setSummary(null) // kartu disembunyikan; angka bulan sebelumnya tidak tertinggal
    }
    setLoading(false)
  }

  useEffect(() => { loadData() }, [searchMonth])

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
    <div className="min-h-screen flex flex-col bg-slate-50/70 text-slate-800">
      {/* Header */}
      <div
        className="px-4 sm:px-6 pt-10 pb-5 shadow-lg shadow-orange-950/10"
        style={{
          background: 'linear-gradient(135deg, #ea580c 0%, #f59e0b 60%, #d97706 100%)',
          borderBottomLeftRadius: '2rem',
          borderBottomRightRadius: '2rem'
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => step !== STEP.LIST ? setStep(STEP.LIST) : navigate('/home')}
              className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center text-white hover:bg-white/25 active:scale-95 transition-all shadow-sm shrink-0"
              title="Kembali"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-black/15 text-white/90 border border-white/10">
                  POS PRINTING
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                <span className="text-[10px] text-white/80 font-bold hidden sm:inline">LIVE REGISTER</span>
              </div>
              <h1 className="text-white text-lg sm:text-2xl font-black tracking-tight leading-tight">
                {step === STEP.FORM ? 'Tambah Pekerjaan' : step === STEP.SUMMARY ? 'Ringkasan Print Job' : 'Pekerjaan Printing'}
              </h1>
              <p className="text-white/80 text-xs font-medium">Labalaba Advertising · One Stop Cutting Sticker & Advertising</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── LIST VIEW (2-Column Dashboard) ── */}
      {step === STEP.LIST && (
        <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-5 flex flex-col gap-5">
          {/* 2-Column Layout */}
          <div className="flex flex-col lg:flex-row gap-5 items-start">
            {/* Left Panel - Summary & Job List */}
            <div className="w-full lg:w-1/2 flex flex-col gap-4">
              {/* Summary Card */}
              {summaryData && (
                <div className="relative overflow-hidden rounded-3xl p-5 text-white shadow-xl shadow-emerald-950/10 border border-emerald-400/25 bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 transition-all">
                  {/* Glowing background accents */}
                  <div className="absolute -top-12 -right-12 w-44 h-44 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-teal-400/15 rounded-full blur-2xl pointer-events-none" />

                  <div className="relative z-10">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                          <span className="text-[11px] font-black uppercase tracking-wider text-emerald-200">
                            Total Pendapatan
                          </span>
                        </div>
                        <p className="text-3xl sm:text-4xl font-black tracking-tight mt-1 text-white drop-shadow-sm">
                          {formatRupiah(summaryData.total_revenue || 0)}
                        </p>
                      </div>
                      <span className="px-3 py-1.5 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 text-xs font-extrabold text-white shrink-0 shadow-sm">
                        📅 {searchMonth}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-4">
                      <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-2.5 flex flex-col justify-between hover:bg-white/15 transition-all">
                        <span className="text-[10px] sm:text-[11px] text-emerald-100 font-semibold flex items-center gap-1">
                          📋 Pekerjaan
                        </span>
                        <span className="text-xl sm:text-2xl font-black text-white mt-1">
                          {summaryData.total_jobs || 0}
                        </span>
                      </div>
                      <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-2.5 flex flex-col justify-between hover:bg-white/15 transition-all">
                        <span className="text-[10px] sm:text-[11px] text-emerald-100 font-semibold flex items-center gap-1">
                          💵 Cash
                        </span>
                        <span className="text-xs sm:text-sm font-black text-white mt-1 truncate">
                          {formatRupiah(summaryData.cash_revenue || 0)}
                        </span>
                      </div>
                      <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-2.5 flex flex-col justify-between hover:bg-white/15 transition-all">
                        <span className="text-[10px] sm:text-[11px] text-emerald-100 font-semibold flex items-center gap-1">
                          💳 Transfer
                        </span>
                        <span className="text-xs sm:text-sm font-black text-white mt-1 truncate">
                          {formatRupiah(summaryData.transfer_revenue || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Job List Card */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-5 flex-1 flex flex-col">
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm shadow-xs">
                      📋
                    </div>
                    <div>
                      <h2 className="text-slate-800 font-black text-base sm:text-lg tracking-tight">Daftar Pekerjaan</h2>
                      <p className="text-[11px] text-slate-400 font-medium">Riwayat transaksi per bulan</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="month"
                      value={searchMonth}
                      onChange={e => handleMonthChange(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400/40 shadow-xs transition-all"
                    />
                    {searchMonth !== currentMonthWIB() && (
                      <button
                        onClick={() => setSearchMonth(currentMonthWIB())}
                        className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-all active:scale-95 shadow-xs"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                {loading && jobs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
                    <svg className="w-8 h-8 animate-spin text-orange-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <p className="text-xs font-medium">Memuat data pekerjaan...</p>
                  </div>
                ) : Object.keys(grouped).length === 0 ? (
                  <div className="text-center py-12 flex flex-col items-center justify-center text-slate-400">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl mb-2 shadow-inner">
                      📄
                    </div>
                    <p className="text-sm font-bold text-slate-700">Belum ada pekerjaan</p>
                    <p className="text-xs text-slate-400 mt-0.5">Pekerjaan printing di bulan ini akan tercatat di sini.</p>
                  </div>
                ) : (
                  <div className="space-y-4 overflow-y-auto max-h-[55vh] pr-1">
                    {Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0])).map(([month, items]) => (
                      <div key={month}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider bg-slate-100 px-2.5 py-0.5 rounded-lg">
                            {new Date(month + '-01').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold">({items.length} transaksi)</span>
                        </div>
                        <div className="space-y-2">
                          {items.map(j => (
                            <div
                              key={j.id}
                              className="group p-3 rounded-2xl bg-slate-50/80 hover:bg-white border border-slate-200/80 hover:border-orange-200 hover:shadow-md transition-all flex items-center justify-between gap-3"
                            >
                              <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 shadow-xs font-bold text-xs">
                                🖨️
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="font-bold text-slate-800 text-xs sm:text-sm truncate">
                                    {j.customer_name || 'Tanpa Customer'}
                                  </p>
                                  <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase ${
                                    j.payment_method === 'cash' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                                  }`}>
                                    {j.payment_method === 'cash' ? '💵 Cash' : '💳 Transfer'}
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                                  🕒 {formatDateTime(j.created_at || j.date)}
                                </p>
                                <p className="text-[11px] text-slate-600 truncate mt-0.5 font-medium">
                                  {j.materials?.map(m => `${m.name} (${m.quantity})`).join(', ') || j.material || '-'}
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="font-black text-slate-900 text-xs sm:text-sm tracking-tight">
                                  {formatRupiah(j.total_price)}
                                </p>
                                <button
                                  onClick={() => handleDeleteJob(j.id)}
                                  className="w-7 h-7 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-all ml-auto mt-1"
                                  title="Hapus transaksi"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
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

            {/* Right Panel - Form Tambah Pekerjaan Printing */}
            <div className="w-full lg:w-1/2 flex flex-col">
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-5 flex-1 flex flex-col overflow-y-auto">
                <div className="flex items-center gap-2.5 pb-3 mb-4 border-b border-slate-100">
                  <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-md shadow-orange-500/20 text-sm font-bold">
                    ✨
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-800 tracking-tight">Tambah Pekerjaan Printing</h2>
                    <p className="text-[11px] text-slate-400 font-medium">Input pesanan cetak & pemakaian stok bahan</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Tanggal */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal *</label>
                    <input
                      type="date"
                      value={form.date}
                      onChange={e => handleFormChange('date', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50/60 focus:bg-white text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400/40 shadow-xs transition-all"
                    />
                  </div>

                  {/* Materials List */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <label className="block text-xs font-bold text-slate-700">Bahan Cetak *</label>
                        {form.materials.length > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-orange-100 text-orange-700">
                            {form.materials.length} item
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1.5">
                        <select
                          value=""
                          onChange={e => { if (e.target.value) handleAddMaterial(e.target.value) }}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-400/40 cursor-pointer shadow-xs transition-all"
                        >
                          <option value="">+ Tambah Bahan</option>
                          {stocks.map(s => (
                            <option key={s.id} value={s.name}>{s.name} ({s.quantity} {s.unit})</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setShowLainLainModal(true)}
                          className="px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 text-xs font-bold transition-all active:scale-95 shadow-xs"
                        >
                          + Lain Lain
                        </button>
                      </div>
                    </div>

                    {form.materials.length === 0 ? (
                      <div className="p-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 text-center text-xs text-slate-400">
                        Belum ada bahan ditambahkan. Klik <span className="font-bold text-orange-600">+ Tambah Bahan</span> untuk memilih dari stok gudang atau <span className="font-bold text-purple-600">+ Lain Lain</span> untuk jasa/custom.
                      </div>
                    ) : (
                      <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                        {form.materials.map((m, idx) => (
                          <div
                            key={idx}
                            className="bg-gradient-to-br from-slate-50 to-white rounded-2xl p-3 border border-slate-200/90 shadow-xs space-y-2"
                          >
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                                {m.name} {m.is_custom ? '(Kustom)' : ''}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveMaterial(idx)}
                                className="w-6 h-6 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-all"
                                title="Hapus bahan ini"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Jumlah ({m.unit || 'pcs'})</label>
                                <input
                                  type="text"
                                  readOnly
                                  value={m.quantity}
                                  onClick={() => { setIsEditMode(false); setKeypadField(`quantity_${idx}`) }}
                                  placeholder="0"
                                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:border-orange-300 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400/40 cursor-pointer shadow-xs transition-all text-center"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Harga Normal</label>
                                <div className="relative">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold">Rp</span>
                                  <input
                                    type="text"
                                    readOnly
                                    value={m.harga_normal_raw}
                                    onClick={() => { setIsEditMode(false); setKeypadField(`harga_normal_${idx}`) }}
                                    placeholder="0"
                                    className="w-full pl-7 pr-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:border-orange-300 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400/40 cursor-pointer shadow-xs transition-all text-right"
                                  />
                                </div>
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between items-center mb-0.5">
                                <label className="block text-[10px] font-bold text-slate-500">Harga Diskon (≥10 pcs)</label>
                                <span className="text-[9px] text-slate-400 font-semibold">Opsional</span>
                              </div>
                              <div className="relative">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold">Rp</span>
                                <input
                                  type="text"
                                  readOnly
                                  value={m.harga_diskon_raw}
                                  onClick={() => { setIsEditMode(false); setKeypadField(`harga_diskon_${idx}`) }}
                                  placeholder="Harga grosir diskon"
                                  className="w-full pl-7 pr-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:border-orange-300 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400/40 cursor-pointer shadow-xs transition-all text-right"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Metode Pembayaran */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Metode Pembayaran *</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleFormChange('payment_method', 'cash')}
                        className={`py-2.5 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-1.5 ${
                          form.payment_method === 'cash'
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 border border-emerald-600'
                            : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        💵 Tunai (Cash)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFormChange('payment_method', 'transfer')}
                        className={`py-2.5 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-1.5 ${
                          form.payment_method === 'transfer'
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 border border-indigo-600'
                            : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        💳 Transfer Bank
                      </button>
                    </div>
                  </div>

                  {/* Total Tagihan Bar */}
                  {form.materials.length > 0 && (
                    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-4 shadow-lg flex items-center justify-between border border-slate-700/60">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Tagihan</p>
                        <p className="text-xs text-slate-300 font-semibold">{form.materials.length} rincian bahan</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-emerald-400 tracking-tight drop-shadow-sm">
                          {formatRupiah(totalPrice)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Nama Customer */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nama Customer</label>
                    <input
                      type="text"
                      value={form.customer_name}
                      onChange={e => handleFormChange('customer_name', e.target.value)}
                      placeholder="Nama customer / pemesan..."
                      className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50/60 focus:bg-white text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400/40 shadow-xs transition-all"
                    />
                  </div>

                  {/* Catatan */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Tambahan</label>
                    <input
                      type="text"
                      value={form.notes}
                      onChange={e => handleFormChange('notes', e.target.value)}
                      placeholder="Keterangan spesifikasi / catatan..."
                      className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50/60 focus:bg-white text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400/40 shadow-xs transition-all"
                    />
                  </div>

                  {/* Tombol Simpan Pekerjaan */}
                  <button
                    onClick={handleSaveJob}
                    disabled={saving || form.materials.length === 0}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white font-black text-sm shadow-lg shadow-orange-500/25 active:scale-98 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <span>💾</span>
                    <span>{saving ? 'Menyimpan...' : 'Simpan Pekerjaan'}</span>
                  </button>
                </div>
              </div>

              {/* Custom Numeric Keypad */}
              {keypadField && !isEditMode && (
                <div
                  className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-50 p-4"
                  onClick={() => setKeypadField(null)}
                >
                  <div
                    className="bg-white p-5 rounded-3xl w-84 shadow-2xl border border-slate-100 flex flex-col"
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-black text-slate-800 tracking-tight">
                        {keypadField.startsWith('quantity_') ? '🔢 Jumlah Pcs' :
                         keypadField.startsWith('harga_normal_') ? '💵 Harga Normal' :
                         keypadField.startsWith('harga_diskon_') ? '🎉 Harga Diskon' :
                         keypadField === 'lain_lain_harga' ? '💵 Harga Item' :
                         keypadField === 'lain_lain_qty' ? '🔢 Jumlah Item' :
                         'Input'}
                      </span>
                      <button
                        onClick={() => setKeypadField(null)}
                        className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-sm font-bold transition-all"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Display current value */}
                    <div className="bg-slate-900 text-emerald-400 rounded-2xl p-4 mb-3.5 text-center font-mono font-black text-2xl tracking-wider shadow-inner">
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
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-2">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => handleKeypadInput(num)}
                          className="py-3.5 rounded-2xl bg-slate-100 text-slate-800 font-black text-xl hover:bg-slate-200 active:bg-slate-300 active:scale-95 transition-all shadow-xs"
                        >
                          {num}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={handleKeypadClear}
                        className="py-3.5 rounded-2xl bg-red-100 text-red-600 font-black text-lg hover:bg-red-200 active:scale-95 transition-all shadow-xs"
                      >
                        C
                      </button>
                      <button
                        type="button"
                        onClick={() => handleKeypadInput(0)}
                        className="py-3.5 rounded-2xl bg-slate-100 text-slate-800 font-black text-xl hover:bg-slate-200 active:scale-95 transition-all shadow-xs"
                      >
                        0
                      </button>
                      <button
                        type="button"
                        onClick={handleKeypadBackspace}
                        className="py-3.5 rounded-2xl bg-amber-100 text-amber-700 font-black text-lg hover:bg-amber-200 active:scale-95 transition-all shadow-xs"
                      >
                        ⌫
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleKeypadInput(1000)}
                      className="w-full py-3 rounded-2xl bg-blue-100 text-blue-700 font-black text-base hover:bg-blue-200 active:scale-95 transition-all mb-2 shadow-xs"
                    >
                      +000 (Ribu)
                    </button>
                    <button
                      type="button"
                      onClick={() => setKeypadField(null)}
                      className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-sm shadow-md shadow-orange-500/25 active:scale-95 transition-all"
                    >
                      Selesai
                    </button>
                  </div>
                </div>
              )}
            </div>
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
              ['Material', savedJob.materials?.map(m => m.name).join(', ') || '-'],
              ['Quantity', `${savedJob.materials?.reduce((sum, m) => sum + (m.quantity || 0), 0) || 0} pcs`],
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
              {savedJob.materials?.map((m, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">{m.name}</span>
                    <span>{formatRupiah(m.harga_normal)} × {m.quantity}</span>
                  </div>
                  {m.harga_diskon && m.quantity >= 10 && (
                    <div className="flex justify-between text-xs text-green-600">
                      <span>Diskon ≥10 pcs</span>
                      <span>-{formatRupiah((m.harga_normal - m.harga_diskon) * m.quantity)}</span>
                    </div>
                  )}
                </div>
              ))}
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
    </div>
  )
}
