import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { getProjects, createProject, updateProject, deleteProject, getStock, getFloatingMenu } from '../services/api'
import { formatRupiah, formatDate, formatRupiahInput, parseRupiahInput } from '../utils/format'
import Toast from '../components/Toast'
import FloatingButton from '../components/FloatingButton'
import PiketModal from '../components/PiketModal'
import { useToast } from '../hooks/useToast'

const STEP = { DASHBOARD: 'dashboard', FORM: 'form', EDIT: 'edit' }

export default function ProjectPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { toast, showToast, clearToast } = useToast()

  const [step, setStep] = useState(STEP.DASHBOARD)

  const [projects, setProjects] = useState([])
  const [stocks, setStocks] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchMonth, setSearchMonth] = useState('')
  const [detailProject, setDetailProject] = useState(null)

  // Form state
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    project_name: '',
    customer_name: '',
    payment_method: 'transfer',
    selling_price_raw: '',
    dp_amount_raw: '',
    progress_status: 'pending',
    notes: '',
  })
  const [materials, setMaterials] = useState([]) // [{name, quantity, unit, price, stock_id, is_custom}]
  const [showStockPicker, setShowStockPicker] = useState(false)
  const [showCustomMaterial, setShowCustomMaterial] = useState(false)
  const [customMat, setCustomMat] = useState({ name: '', quantity: '', unit: 'pcs', price_raw: '' })
  const [pickerQty, setPickerQty] = useState('')
  const [pickerStock, setPickerStock] = useState(null)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [keypadField, setKeypadField] = useState(null) // 'selling_price' or null
  const [menuItems, setMenuItems] = useState([])
  const [showPiketModal, setShowPiketModal] = useState(false)
  const [selectedPiketGroupId, setSelectedPiketGroupId] = useState(null)

  const hpp = materials.reduce((s, m) => s + (parseFloat(m.price || 0) * parseFloat(m.quantity || 0)), 0)
  const sellingPrice = parseRupiahInput(form.selling_price_raw)

  const loadData = async () => {
    setLoading(true)
    try {
      const [p, s] = await Promise.all([
        getProjects(searchMonth ? `?month=${searchMonth}` : ''),
        getStock(),
      ])
      setProjects(Array.isArray(p) ? p : [])
      setStocks(Array.isArray(s) ? s : [])
    } catch {
      showToast('Gagal memuat data', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (step === STEP.DASHBOARD) loadData()
  }, [step, searchMonth])

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

  // Handle navigation state from HomeScreen for editing
  useEffect(() => {
    if (location.state?.editingProject) {
      setEditingId(location.state.editingProject.id)
      setForm({
        date: location.state.editingProject.date || new Date().toISOString().split('T')[0],
        project_name: location.state.editingProject.project_name || '',
        customer_name: location.state.editingProject.customer_name || '',
        payment_method: location.state.editingProject.payment_method || 'transfer',
        selling_price_raw: formatRupiahInput(String(location.state.editingProject.selling_price || location.state.editingProject.total_project_value || '')),
        dp_amount_raw: formatRupiahInput(String(location.state.editingProject.dp_amount || '')),
        progress_status: location.state.editingProject.progress_status || 'pending',
        notes: location.state.editingProject.notes || '',
      })
      setMaterials(Array.isArray(location.state.editingProject.materials) ? location.state.editingProject.materials.map(m => ({ ...m })) : [])
      setStep(STEP.FORM)
      // Clear the state to avoid re-triggering
      navigate('/project', { replace: true, state: {} })
    }
  }, [location.state, navigate])

  const resetForm = () => {
    setForm({ date: new Date().toISOString().split('T')[0], project_name: '', customer_name: '', payment_method: 'transfer', selling_price_raw: '', dp_amount_raw: '', progress_status: 'pending', notes: '' })
    setMaterials([])
    setEditingId(null)
  }

  const handleEditProject = (p) => {
    setDetailProject(null)
    setEditingId(p.id)
    setForm({
      date: p.date || new Date().toISOString().split('T')[0],
      project_name: p.project_name || '',
      customer_name: p.customer_name || '',
      payment_method: p.payment_method || 'transfer',
      selling_price_raw: formatRupiahInput(String(p.selling_price || p.total_project_value || '')),
      dp_amount_raw: formatRupiahInput(String(p.dp_amount || '')),
      progress_status: p.progress_status || 'pending',
      notes: p.notes || '',
    })
    setMaterials(Array.isArray(p.materials) ? p.materials.map(m => ({ ...m })) : [])
    setStep(STEP.FORM)
  }

  const handleDeleteProject = async (id) => {
    try {
      await deleteProject(id)
      showToast('Project dihapus', 'success')
      setConfirmDelete(null)
      setDetailProject(null)
      await loadData()
    } catch (e) {
      showToast(e.message || 'Gagal menghapus', 'error')
    }
  }

  const handleSaveProject = async () => {
    if (!form.project_name || !form.customer_name || !form.selling_price_raw) {
      showToast('Lengkapi semua field wajib', 'error'); return
    }
    setSaving(true)
    try {
      const payload = {
        date: form.date,
        project_name: form.project_name,
        customer_name: form.customer_name,
        payment_method: form.payment_method,
        selling_price: sellingPrice,
        dp_amount: parseRupiahInput(form.dp_amount_raw) || 0,
        progress_status: form.progress_status || 'pending',
        notes: form.notes || '',
        materials: materials.map(m => ({
          name: m.name,
          quantity: parseFloat(m.quantity || 0),
          unit: m.unit || 'pcs',
          price: parseFloat(m.price || 0),
          stock_id: m.stock_id || null,
          is_custom: m.is_custom || false,
        })),
      }
      if (editingId) {
        await updateProject(editingId, payload)
        showToast('Pekerjaan berhasil diupdate!', 'success')
      } else {
        await createProject(payload)
        showToast('Pekerjaan berhasil disimpan!', 'success')
      }
      setStep(STEP.DASHBOARD)
      resetForm()
      await loadData()
    } catch (e) {
      showToast(e.message || 'Gagal menyimpan', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleKeypadInput = (num) => {
    if (!keypadField) return
    const currentRaw = form.selling_price_raw || ''
    const currentNum = parseRupiahInput(currentRaw) || 0
    let newNum
    if (num === 1000) {
      newNum = currentNum * 1000
    } else {
      newNum = currentNum * 10 + num
    }
    const newRaw = formatRupiahInput(String(newNum))
    setForm(f => ({ ...f, selling_price_raw: newRaw }))
  }

  const handleKeypadBackspace = () => {
    if (!keypadField) return
    const currentRaw = form.selling_price_raw || ''
    const currentNum = parseRupiahInput(currentRaw) || 0
    const newNum = Math.floor(currentNum / 10)
    const newRaw = newNum > 0 ? formatRupiahInput(String(newNum)) : ''
    setForm(f => ({ ...f, selling_price_raw: newRaw }))
  }

  const handleKeypadClear = () => {
    if (!keypadField) return
    setForm(f => ({ ...f, selling_price_raw: '' }))
  }

  const totalPemasukan = projects.reduce((s, p) => s + (p.selling_price || p.total_project_value || 0), 0)
  const totalBahan = projects.reduce((s, p) => s + (p.hpp || p.total_material_cost || 0), 0)
  const totalDispen = projects.length

  const grouped = projects.reduce((acc, p) => {
    const key = p.date?.slice(0, 7) || 'unknown'
    if (!acc[key]) acc[key] = []
    acc[key].push(p)
    return acc
  }, {})

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-5"
        style={{ background: 'linear-gradient(160deg, #3b82f6 0%, #1d4ed8 100%)', borderBottomLeftRadius: '1.5rem', borderBottomRightRadius: '1.5rem' }}>
        <button onClick={() => step === STEP.DASHBOARD ? navigate('/home') : step === STEP.FORM ? setStep(STEP.DASHBOARD) : navigate('/home')}
          className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-white text-lg font-bold">
          {step === STEP.FORM ? (editingId ? 'Edit Pekerjaan' : 'Tambah Pekerjaan') : 'Project'}
        </h1>
      </div>

      {/* ── DASHBOARD ── */}
      {step === STEP.DASHBOARD && (
        <div className="flex-1 flex flex-col md:flex-row gap-4 p-4">
          {/* Left Panel - Summary & Controls */}
          <div className="w-full md:w-1/2 flex flex-col gap-4">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-green-500 rounded-2xl p-3 text-white shadow">
                <p className="text-xs opacity-80">Pemasukan</p>
                <p className="text-sm font-bold mt-0.5">{formatRupiah(totalPemasukan)}</p>
              </div>
              <div className="bg-red-500 rounded-2xl p-3 text-white shadow">
                <p className="text-xs opacity-80">Total Bahan</p>
                <p className="text-sm font-bold mt-0.5">{formatRupiah(totalBahan)}</p>
              </div>
              <div className="bg-blue-500 rounded-2xl p-3 text-white shadow">
                <p className="text-xs opacity-80">Dispen</p>
                <p className="text-sm font-bold mt-0.5">{totalDispen} job</p>
              </div>
              <div className="bg-purple-500 rounded-2xl p-3 text-white shadow">
                <p className="text-xs opacity-80">Total Margin</p>
                <p className="text-sm font-bold mt-0.5">
                  {totalPemasukan > 0 ? ((totalPemasukan - totalBahan) / totalPemasukan * 100).toFixed(1) + '%' : '0%'}
                </p>
              </div>
            </div>

            {/* Search */}
            <div className="flex gap-2">
              <input type="month" value={searchMonth} onChange={e => setSearchMonth(e.target.value)}
                className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              {searchMonth && <button onClick={() => setSearchMonth('')} className="px-3 py-2.5 rounded-xl bg-gray-100 text-gray-500 text-sm">Reset</button>}
            </div>

            <button onClick={() => setStep(STEP.FORM)}
              className="w-full py-3.5 rounded-2xl bg-blue-600 text-white font-semibold flex items-center justify-center gap-2 shadow hover:bg-blue-700 active:scale-95 transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Tambah Pekerjaan
            </button>

            {/* Profit Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <p className="text-sm font-semibold text-gray-600 mb-2">Estimasi Profit</p>
              <p className={`text-2xl font-bold ${totalPemasukan - totalBahan >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {formatRupiah(totalPemasukan - totalBahan)}
              </p>
            </div>
          </div>

          {/* Right Panel - List */}
          <div className="w-full md:w-1/2 flex flex-col">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex-1 overflow-y-auto">
              <h2 className="text-gray-800 font-bold text-lg mb-4">Daftar Project</h2>
              {loading ? (
                <div className="flex justify-center py-8">
                  <svg className="w-7 h-7 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                </div>
              ) : projects.length === 0 ? (
                <p className="text-center text-gray-400 py-16">Belum ada data project.</p>
              ) : (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                  {Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0])).map(([month, items]) => (
                    <div key={month}>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                        {new Date(month + '-01').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                      </p>
                      <div className="space-y-2">
                        {items.map(p => (
                          <div key={p.id} className="bg-gray-50 rounded-xl px-3 py-2.5 flex items-center gap-2.5 border border-gray-100">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0" onClick={() => setDetailProject(p)}>
                              <p className="font-semibold text-gray-800 text-xs truncate">{p.project_name} · {p.customer_name}</p>
                              <p className="text-[10px] text-gray-400">{formatDate(p.date)} · {p.payment_method === 'cash' ? 'Cash' : 'Transfer'}</p>
                            </div>
                            <p className="font-bold text-gray-800 text-xs shrink-0">{formatRupiah(p.selling_price || p.total_project_value || 0)}</p>
                            <div className="flex gap-1 shrink-0">
                              <button onClick={() => handleEditProject(p)} className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center hover:bg-blue-100 active:scale-95">
                                <svg className="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              </button>
                              <button onClick={() => setConfirmDelete(p)} className="w-6 h-6 rounded-lg bg-red-50 flex items-center justify-center hover:bg-red-100 active:scale-95">
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
        </div>
      )}

      {/* ── FORM ── */}
      {step === STEP.FORM && (
        <div className="flex-1 p-4 space-y-3 pb-8">
          {/* Tanggal */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal *</label>
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
          {/* Nama Project */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Project *</label>
            <input type="text" value={form.project_name} onChange={e => setForm(f => ({ ...f, project_name: e.target.value }))} placeholder="Nama pekerjaan..."
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
          {/* Nama Customer */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Customer *</label>
            <input type="text" value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} placeholder="Nama customer..."
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
          {/* Metode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Metode Pembayaran</label>
            <div className="grid grid-cols-2 gap-3">
              {['cash', 'transfer'].map(m => (
                <button key={m} onClick={() => setForm(f => ({ ...f, payment_method: m }))}
                  className={`py-2.5 rounded-2xl border-2 font-semibold text-sm transition-all ${form.payment_method === m ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200 text-gray-500'}`}>
                  {m === 'cash' ? '💵 Cash' : '🏦 Transfer'}
                </button>
              ))}
            </div>
          </div>

          {/* ── Daftar Bahan ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Bahan Digunakan</label>
              <div className="flex gap-2">
                <button onClick={() => { setPickerStock(null); setPickerQty(''); setShowStockPicker(true) }}
                  className="text-xs px-3 py-1.5 rounded-xl bg-blue-600 text-white font-semibold">
                  + Dari Stok
                </button>
                <button onClick={() => { setCustomMat({ name: '', quantity: '', unit: 'pcs', price_raw: '' }); setShowCustomMaterial(true) }}
                  className="text-xs px-3 py-1.5 rounded-xl bg-gray-100 text-gray-700 font-semibold">
                  + Bahan Lain
                </button>
              </div>
            </div>

            {materials.length === 0 ? (
              <div className="text-center text-gray-400 text-sm py-4 border border-dashed border-gray-200 rounded-2xl">
                Belum ada bahan — tambahkan dari stok atau bahan lain
              </div>
            ) : (
              <div className="space-y-2">
                {materials.map((m, i) => (
                  <div key={i} className="bg-gray-50 rounded-2xl px-4 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm">{m.name}</p>
                      <p className="text-xs text-gray-500">{m.quantity} {m.unit} × {formatRupiah(m.price)} = <span className="font-semibold text-gray-700">{formatRupiah(m.price * m.quantity)}</span></p>
                    </div>
                    <button onClick={() => setMaterials(ms => ms.filter((_, j) => j !== i))}
                      className="w-7 h-7 rounded-full bg-red-100 text-red-500 flex items-center justify-center text-sm shrink-0">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* HPP & Nilai Project */}
          {materials.length > 0 && (
            <div className="bg-blue-50 rounded-2xl px-4 py-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total HPP Bahan</span>
                <span className="font-bold text-blue-700">{formatRupiah(hpp)}</span>
              </div>
              {sellingPrice > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Estimasi Profit</span>
                  <span className={`font-bold ${sellingPrice - hpp >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatRupiah(sellingPrice - hpp)}</span>
                </div>
              )}
            </div>
          )}

          {/* Nilai Project */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nilai Project (Harga Jual) *</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">Rp</span>
              <input type="text" readOnly value={form.selling_price_raw}
                onClick={() => setKeypadField('selling_price')}
                placeholder="0"
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300 text-lg font-semibold cursor-pointer" />
            </div>
          </div>
          {/* DP Dibayar */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">DP Dibayar</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">Rp</span>
              <input type="text" inputMode="numeric" value={form.dp_amount_raw}
                onChange={e => setForm(f => ({ ...f, dp_amount_raw: formatRupiahInput(e.target.value) }))}
                placeholder="0"
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
          </div>
          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <div className="grid grid-cols-2 gap-3">
              {['pending', 'in_progress', 'completed'].map(s => (
                <button key={s} onClick={() => setForm(f => ({ ...f, progress_status: s }))}
                  className={`py-2.5 rounded-2xl border-2 font-semibold text-sm transition-all ${form.progress_status === s ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200 text-gray-500'}`}>
                  {s === 'pending' ? '⏳ Pending' : s === 'in_progress' ? '🔄 Proses' : '✅ Selesai'}
                </button>
              ))}
            </div>
          </div>
          {/* Catatan */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
            <input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Catatan tambahan..."
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
          <button onClick={handleSaveProject} disabled={saving}
            className="w-full py-4 rounded-2xl bg-blue-600 text-white font-bold shadow hover:bg-blue-700 disabled:opacity-40 active:scale-95 transition-all">
            {saving ? 'Menyimpan...' : 'Simpan Pekerjaan'}
          </button>
        </div>
      )}

      {/* Stock Picker Modal */}
      {showStockPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-5 pb-6 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <p className="font-bold text-gray-800">Pilih Bahan dari Stok</p>
              <button onClick={() => setShowStockPicker(false)} className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center">✕</button>
            </div>
            {pickerStock ? (
              <div className="space-y-3">
                <div className="bg-blue-50 rounded-2xl p-3">
                  <p className="font-semibold text-blue-800">{pickerStock.name}</p>
                  <p className="text-xs text-blue-600">Stok: {pickerStock.quantity} {pickerStock.unit} · HPP: {formatRupiah(pickerStock.price)}/unit</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Jumlah *</label>
                    <input type="number" value={pickerQty} onChange={e => setPickerQty(e.target.value)} placeholder="0"
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Satuan</label>
                    <input type="text" value={pickerStock.unit} disabled
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-100 bg-gray-50 text-gray-500" />
                  </div>
                </div>
                {pickerQty > 0 && (
                  <div className="bg-gray-50 rounded-xl px-3 py-2 text-sm flex justify-between">
                    <span className="text-gray-500">Total HPP</span>
                    <span className="font-bold">{formatRupiah(pickerStock.price * parseFloat(pickerQty))}</span>
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={() => setPickerStock(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm">← Kembali</button>
                  <button onClick={() => {
                    if (!pickerQty || parseFloat(pickerQty) <= 0) { showToast('Masukkan jumlah', 'error'); return }
                    setMaterials(ms => [...ms, { name: pickerStock.name, quantity: parseFloat(pickerQty), unit: pickerStock.unit, price: pickerStock.price, stock_id: pickerStock.id, is_custom: false }])
                    setPickerStock(null); setPickerQty(''); setShowStockPicker(false)
                  }} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm">Tambahkan</button>
                </div>
              </div>
            ) : (
              <div className="overflow-y-auto">
                <div className="flex gap-3">
                  {/* Left Column - Print */}
                  <div className="flex-1">
                    <p className="text-xs font-bold text-orange-600 mb-2 uppercase tracking-wide">Print</p>
                    <div className="space-y-2">
                      {stocks.filter(s => s.usage_category === 'PRINT').sort((a, b) => a.name.localeCompare(b.name)).map(s => (
                        <button key={s.id} onClick={() => setPickerStock(s)}
                          className="w-full text-left p-3 rounded-2xl border border-gray-100 hover:bg-orange-50 hover:border-orange-200 transition-all">
                          <p className="font-semibold text-gray-800 text-sm">{s.name}</p>
                          <p className="text-xs text-gray-500">Stok: {s.quantity} {s.unit}</p>
                        </button>
                      ))}
                      {stocks.filter(s => s.usage_category === 'PRINT').length === 0 && (
                        <p className="text-xs text-gray-400 text-center py-4">Tidak ada stok</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Right Column - Umum */}
                  <div className="flex-1">
                    <p className="text-xs font-bold text-blue-600 mb-2 uppercase tracking-wide">Umum</p>
                    <div className="space-y-2">
                      {stocks.filter(s => s.usage_category !== 'PRINT').sort((a, b) => a.name.localeCompare(b.name)).map(s => (
                        <button key={s.id} onClick={() => setPickerStock(s)}
                          className="w-full text-left p-3 rounded-2xl border border-gray-100 hover:bg-blue-50 hover:border-blue-200 transition-all">
                          <p className="font-semibold text-gray-800 text-sm">{s.name}</p>
                          <p className="text-xs text-gray-500">Stok: {s.quantity} {s.unit}</p>
                        </button>
                      ))}
                      {stocks.filter(s => s.usage_category !== 'PRINT').length === 0 && (
                        <p className="text-xs text-gray-400 text-center py-4">Tidak ada stok</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Custom Material Modal */}
      {showCustomMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 pb-8">
            <div className="flex justify-between items-center mb-4">
              <p className="font-bold text-gray-800">Bahan Lain</p>
              <button onClick={() => setShowCustomMaterial(false)} className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center">✕</button>
            </div>
            <div className="space-y-3">
              <input type="text" value={customMat.name} onChange={e => setCustomMat(m => ({ ...m, name: e.target.value }))} placeholder="Nama Bahan *"
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300" />
              <div className="grid grid-cols-2 gap-2">
                <input type="number" value={customMat.quantity} onChange={e => setCustomMat(m => ({ ...m, quantity: e.target.value }))} placeholder="Jumlah *"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300" />
                <input type="text" value={customMat.unit} onChange={e => setCustomMat(m => ({ ...m, unit: e.target.value }))} placeholder="Satuan (pcs, m, dll)"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                <input type="text" inputMode="numeric" value={customMat.price_raw}
                  onChange={e => setCustomMat(m => ({ ...m, price_raw: formatRupiahInput(e.target.value) }))}
                  placeholder="Harga per unit *"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              {customMat.quantity && customMat.price_raw && (
                <div className="bg-gray-50 rounded-xl px-3 py-2 text-sm flex justify-between">
                  <span className="text-gray-500">Total</span>
                  <span className="font-bold">{formatRupiah(parseRupiahInput(customMat.price_raw) * parseFloat(customMat.quantity || 0))}</span>
                </div>
              )}
              <button onClick={() => {
                if (!customMat.name || !customMat.quantity || !customMat.price_raw) { showToast('Lengkapi semua field bahan', 'error'); return }
                setMaterials(ms => [...ms, { name: customMat.name, quantity: parseFloat(customMat.quantity), unit: customMat.unit || 'pcs', price: parseRupiahInput(customMat.price_raw), stock_id: null, is_custom: true }])
                setShowCustomMaterial(false)
              }} className="w-full py-3 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700">
                Tambahkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Project */}
      {detailProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-5 pb-8">
            <div className="flex justify-between items-center mb-4">
              <p className="font-bold text-gray-800">Detail Project</p>
              <button onClick={() => setDetailProject(null)} className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center">✕</button>
            </div>
            <div className="flex gap-2 mb-4">
              <button onClick={() => handleEditProject(detailProject)}
                className="flex-1 py-2 rounded-xl bg-blue-50 text-blue-600 font-semibold text-sm border border-blue-200 hover:bg-blue-100 transition-all">
                ✏️ Edit
              </button>
              <button onClick={() => setConfirmDelete(detailProject)}
                className="flex-1 py-2 rounded-xl bg-red-50 text-red-500 font-semibold text-sm border border-red-200 hover:bg-red-100 transition-all">
                🗑️ Hapus
              </button>
            </div>
            <div className="space-y-2.5">
              {[
                ['Tanggal', formatDate(detailProject.date)],
                ['Nama Project', detailProject.project_name],
                ['Customer', detailProject.customer_name],
                ['Metode', detailProject.payment_method === 'cash' ? 'Cash' : 'Transfer'],
                ['HPP Bahan', formatRupiah(detailProject.hpp || detailProject.total_material_cost || 0)],
                ['Nilai Project', formatRupiah(detailProject.selling_price || detailProject.total_project_value || 0)],
                ['Catatan', detailProject.notes || '-'],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between text-sm border-b border-gray-50 pb-2">
                  <span className="text-gray-500">{l}</span>
                  <span className="font-medium text-gray-800 text-right max-w-[60%]">{v}</span>
                </div>
              ))}
              {Array.isArray(detailProject.materials) && detailProject.materials.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Bahan Digunakan</p>
                  {detailProject.materials.map((m, i) => (
                    <div key={i} className="flex justify-between text-sm py-1">
                      <span className="text-gray-600">{m.name} ({m.quantity} {m.unit})</span>
                      <span className="font-medium">{formatRupiah(m.price * m.quantity)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6">
            <p className="font-bold text-gray-800 mb-2">Hapus Project?</p>
            <p className="text-sm text-gray-500 mb-5">"<span className="font-semibold">{confirmDelete.project_name}</span>" akan dihapus permanen.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold">Batal</button>
              <button onClick={() => handleDeleteProject(confirmDelete.id)} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-bold">Hapus</button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Numeric Keypad */}
      {keypadField && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setKeypadField(null)}>
          <div className="bg-white p-4 rounded-2xl w-80" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-semibold text-gray-700">Nilai Project (Rp)</span>
              <button onClick={() => setKeypadField(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Display current value */}
            <div className="bg-gray-100 rounded-xl p-3 mb-3 text-center">
              <span className="text-xl font-bold text-gray-800">
                {form.selling_price_raw || 'Rp 0'}
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
            <button onClick={() => setKeypadField(null)} className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm">
              Selesai
            </button>
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
