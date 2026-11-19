import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { getProjects, createProject, updateProject, deleteProject, getStock } from '../services/api'
import { formatRupiah, formatDate, formatRupiahInput, parseRupiahInput } from '../utils/format'
import Toast from '../components/Toast'
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

  // Handle navigation state from HomeScreen for editing or from Advertising Calculator for prefilling
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
      navigate('/project', { replace: true, state: {} })
    } else if (location.state?.prefillFromCalculator) {
      const pre = location.state.prefillFromCalculator
      setEditingId(null)
      setForm({
        date: new Date().toISOString().split('T')[0],
        project_name: pre.project_name || '',
        customer_name: '',
        payment_method: 'transfer',
        selling_price_raw: formatRupiahInput(String(pre.selling_price || '')),
        dp_amount_raw: '',
        progress_status: 'pending',
        notes: pre.notes || '',
      })
      setMaterials(Array.isArray(pre.materials) ? pre.materials.map(m => ({ ...m })) : [])
      setStep(STEP.FORM)
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
    <div className="min-h-screen flex flex-col bg-slate-100/90 text-slate-800">
      {/* Modern Header */}
      <div
        className="px-4 sm:px-6 pt-10 pb-5 shadow-xl shadow-blue-950/15 border-b border-blue-400/20"
        style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #3b82f6 100%)',
          borderBottomLeftRadius: '2rem',
          borderBottomRightRadius: '2rem',
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <button
              onClick={() => step === STEP.DASHBOARD ? navigate('/home') : step === STEP.FORM ? setStep(STEP.DASHBOARD) : navigate('/home')}
              className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center text-white hover:bg-white/25 active:scale-95 transition-all shadow-sm shrink-0"
              title="Kembali"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-black/15 text-white/95 border border-white/10">
                  PROJECT MANAGEMENT
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-pulse" />
                <span className="text-[10px] text-blue-100/90 font-bold hidden sm:inline">TRACKING REGISTER</span>
              </div>
              <h1 className="text-white text-xl sm:text-2xl font-black tracking-tight leading-tight">
                {step === STEP.FORM ? (editingId ? 'Edit Pekerjaan' : 'Tambah Pekerjaan') : 'Project Advertising & Konstruksi'}
              </h1>
              <p className="text-blue-100/80 text-xs font-medium">Labalaba Advertising · Estimasi profit, HPP bahan, dan tracking pekerjaan</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── DASHBOARD ── */}
      {step === STEP.DASHBOARD && (
        <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col md:flex-row gap-5">
          {/* Left Panel - Summary & Controls */}
          <div className="w-full md:w-1/2 flex flex-col gap-4">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-3.5">
              <div className="relative overflow-hidden rounded-3xl p-4 sm:p-5 text-white shadow-lg shadow-emerald-950/10 border border-emerald-400/25 bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-700 transition-all">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-100/90">Pemasukan</span>
                  <span className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-black tracking-widest text-white border border-white/25">
                    ↓ OMZET
                  </span>
                </div>
                <p className="text-lg sm:text-xl font-black tracking-tight mt-1">{formatRupiah(totalPemasukan)}</p>
              </div>

              <div className="relative overflow-hidden rounded-3xl p-4 sm:p-5 text-white shadow-lg shadow-rose-950/10 border border-rose-400/25 bg-gradient-to-br from-rose-600 via-rose-500 to-red-700 transition-all">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black uppercase tracking-wider text-rose-100/90">Total Bahan</span>
                  <span className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-black tracking-widest text-white border border-white/25">
                    HPP
                  </span>
                </div>
                <p className="text-lg sm:text-xl font-black tracking-tight mt-1">{formatRupiah(totalBahan)}</p>
              </div>

              <div className="relative overflow-hidden rounded-3xl p-4 sm:p-5 text-white shadow-lg shadow-blue-950/10 border border-blue-400/25 bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-700 transition-all">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black uppercase tracking-wider text-blue-100/90">Dispen</span>
                  <span className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-black tracking-widest text-white border border-white/25">
                    JOBS
                  </span>
                </div>
                <p className="text-lg sm:text-xl font-black tracking-tight mt-1">{totalDispen} job</p>
              </div>

              <div className="relative overflow-hidden rounded-3xl p-4 sm:p-5 text-white shadow-lg shadow-purple-950/10 border border-purple-400/25 bg-gradient-to-br from-purple-600 via-purple-500 to-indigo-700 transition-all">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black uppercase tracking-wider text-purple-100/90">Total Margin</span>
                  <span className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-black tracking-widest text-white border border-white/25">
                    %
                  </span>
                </div>
                <p className="text-lg sm:text-xl font-black tracking-tight mt-1">
                  {totalPemasukan > 0 ? ((totalPemasukan - totalBahan) / totalPemasukan * 100).toFixed(1) + '%' : '0%'}
                </p>
              </div>
            </div>

            {/* Search */}
            <div className="flex gap-2">
              <input
                type="month"
                value={searchMonth}
                onChange={e => setSearchMonth(e.target.value)}
                className="flex-1 px-4 py-3 rounded-2xl border border-slate-200/90 bg-white shadow-sm text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
              {searchMonth && (
                <button
                  onClick={() => setSearchMonth('')}
                  className="px-4 py-3 rounded-2xl bg-slate-200/80 hover:bg-slate-300 text-slate-700 text-xs font-black transition-all shadow-sm"
                >
                  Reset
                </button>
              )}
            </div>

            {/* Tambah Pekerjaan Button */}
            <button
              onClick={() => setStep(STEP.FORM)}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black flex items-center justify-center gap-2.5 shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all text-base border border-blue-400/25"
            >
              <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <span>Tambah Pekerjaan</span>
            </button>

            {/* Profit Card */}
            <div className="relative overflow-hidden rounded-3xl p-5 border border-slate-200/80 bg-white shadow-xl shadow-slate-900/5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">Estimasi Keuntungan Bersih</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  totalPemasukan - totalBahan >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  {totalPemasukan - totalBahan >= 0 ? 'PROFIT' : 'DEFISIT'}
                </span>
              </div>
              <p className={`text-2xl sm:text-3xl font-black tracking-tight ${totalPemasukan - totalBahan >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatRupiah(totalPemasukan - totalBahan)}
              </p>
              <p className="text-xs text-slate-400 font-medium mt-1">
                Kalkulasi otomatis: Total Pemasukan dikurangi HPP Total Bahan
              </p>
            </div>
          </div>

          {/* Right Panel - List */}
          <div className="w-full md:w-1/2 flex flex-col">
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-900/5 border border-slate-200/80 p-5 sm:p-6 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-4 bg-blue-600 rounded-full" />
                  <h2 className="text-slate-900 font-black text-lg tracking-tight">Daftar Project</h2>
                </div>
                <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                  {projects.length} Project
                </span>
              </div>

              {loading ? (
                <div className="flex justify-center items-center py-20">
                  <svg className="w-8 h-8 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                </div>
              ) : projects.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3 border border-slate-200">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="font-bold text-slate-600 text-sm">Belum ada data project.</p>
                  <p className="text-xs text-slate-400 mt-1">Gunakan tombol "Tambah Pekerjaan" untuk memulai proyek baru.</p>
                </div>
              ) : (
                <div className="space-y-4 overflow-y-auto max-h-[60vh] pr-1">
                  {Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0])).map(([month, items]) => (
                    <div key={month}>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2.5 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                        {new Date(month + '-01').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                      </p>
                      <div className="space-y-2.5">
                        {items.map(p => (
                          <div
                            key={p.id}
                            className="group relative w-full rounded-2xl p-3.5 sm:p-4 transition-all bg-white hover:bg-slate-50/80 border border-slate-200/80 hover:border-blue-200 hover:shadow-md shadow-sm overflow-hidden flex items-center gap-3.5"
                          >
                            <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0 shadow-xs">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setDetailProject(p)}>
                              <p className="font-black text-slate-900 text-sm sm:text-base leading-tight truncate group-hover:text-blue-600 transition-colors">
                                {p.project_name} · <span className="text-slate-500 font-semibold">{p.customer_name}</span>
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-slate-400 font-medium">{formatDate(p.date)}</span>
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600">
                                  {p.payment_method === 'cash' ? 'Cash' : 'Transfer'}
                                </span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-black text-slate-900 text-sm sm:text-base tracking-tight">
                                {formatRupiah(p.selling_price || p.total_project_value || 0)}
                              </p>
                              <div className="flex gap-1.5 justify-end mt-1.5">
                                <button
                                  onClick={() => handleEditProject(p)}
                                  className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white flex items-center justify-center transition-all shadow-xs"
                                  title="Edit Project"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => setConfirmDelete(p)}
                                  className="w-7 h-7 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-600 hover:text-white flex items-center justify-center transition-all shadow-xs"
                                  title="Hapus Project"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
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
        <div className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 pb-12">
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-900/5 border border-slate-200/80 p-5 sm:p-7 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <div className="w-1.5 h-4 bg-blue-600 rounded-full" />
              <h2 className="text-slate-900 font-black text-lg tracking-tight">
                {editingId ? 'Edit Formulir Project' : 'Formulir Project Baru'}
              </h2>
            </div>

            {/* Tanggal */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">Tanggal *</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-sm font-semibold"
              />
            </div>

            {/* Nama Project */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">Nama Project *</label>
              <input
                type="text"
                value={form.project_name}
                onChange={e => setForm(f => ({ ...f, project_name: e.target.value }))}
                placeholder="Nama pekerjaan atau proyek..."
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-sm font-semibold"
              />
            </div>

            {/* Nama Customer */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">Nama Customer *</label>
              <input
                type="text"
                value={form.customer_name}
                onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))}
                placeholder="Nama customer atau perusahaan..."
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-sm font-semibold"
              />
            </div>

            {/* Metode Pembayaran */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">Metode Pembayaran</label>
              <div className="grid grid-cols-2 gap-3">
                {['cash', 'transfer'].map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, payment_method: m }))}
                    className={`py-3 rounded-2xl border-2 font-black text-xs sm:text-sm transition-all ${
                      form.payment_method === m
                        ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {m === 'cash' ? '💵 Cash' : '🏦 Transfer'}
                  </button>
                ))}
              </div>
            </div>

            {/* Info Snapshot Kalkulator (Otomatis di Background) */}
            {materials.length > 0 && (
              <div className="bg-cyan-50 border border-cyan-200 rounded-2xl px-4 py-3 flex items-center justify-between text-xs text-cyan-800">
                <span className="font-semibold">✨ Terhubung dari Kalkulator Advertising ({materials.length} komponen tercatat otomatis)</span>
                <span className="font-black px-2 py-0.5 rounded-md bg-cyan-200/60 text-cyan-900">Siap Simpan</span>
              </div>
            )}

            {/* Nilai Project */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">Nilai Project (Harga Jual) *</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black">Rp</span>
                <input
                  type="text"
                  readOnly
                  value={form.selling_price_raw}
                  onClick={() => setKeypadField('selling_price')}
                  placeholder="0"
                  className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-lg font-black text-slate-800 cursor-pointer bg-white"
                />
              </div>
            </div>

            {/* DP Dibayar */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">DP Dibayar</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black">Rp</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.dp_amount_raw}
                  onChange={e => setForm(f => ({ ...f, dp_amount_raw: formatRupiahInput(e.target.value) }))}
                  placeholder="0"
                  className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-base font-bold text-slate-800"
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">Status Progress</label>
              <div className="grid grid-cols-3 gap-2.5">
                {['pending', 'in_progress', 'completed'].map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, progress_status: s }))}
                    className={`py-2.5 rounded-2xl border-2 font-black text-xs sm:text-sm transition-all ${
                      form.progress_status === s
                        ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {s === 'pending' ? '⏳ Pending' : s === 'in_progress' ? '🔄 Proses' : '✅ Selesai'}
                  </button>
                ))}
              </div>
            </div>

            {/* Catatan */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">Catatan Spesifikasi (Opsional)</label>
              <input
                type="text"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Catatan tambahan spesifikasi pengerjaan..."
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-sm font-semibold"
              />
            </div>

            {/* Tombol Simpan */}
            <button
              onClick={handleSaveProject}
              disabled={saving}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black shadow-lg shadow-blue-600/20 disabled:opacity-40 active:scale-[0.98] transition-all text-base border border-blue-400/25 mt-4"
            >
              {saving ? 'Menyimpan Project...' : 'Simpan Pekerjaan'}
            </button>
          </div>
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
                      {stocks.filter(s => s.usage_category !== 'PRINT' && s.usage_category !== 'ADVERTISING').sort((a, b) => a.name.localeCompare(b.name)).map(s => (
                        <button key={s.id} onClick={() => setPickerStock(s)}
                          className="w-full text-left p-3 rounded-2xl border border-gray-100 hover:bg-blue-50 hover:border-blue-200 transition-all">
                          <p className="font-semibold text-gray-800 text-sm">{s.name}</p>
                          <p className="text-xs text-gray-500">Stok: {s.quantity} {s.unit}</p>
                        </button>
                      ))}
                      {stocks.filter(s => s.usage_category !== 'PRINT' && s.usage_category !== 'ADVERTISING').length === 0 && (
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
                ['Nilai Project', formatRupiah(detailProject.selling_price || detailProject.total_project_value || 0)],
                ['DP Dibayar', formatRupiah(detailProject.dp_amount || 0)],
                ['Sisa Pelunasan', formatRupiah(Math.max(0, (detailProject.selling_price || detailProject.total_project_value || 0) - (detailProject.dp_amount || 0)))],
                ['Catatan Spesifikasi', detailProject.notes || '-'],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between text-sm border-b border-gray-50 pb-2">
                  <span className="text-gray-500">{l}</span>
                  <span className="font-medium text-gray-800 text-right max-w-[60%]">{v}</span>
                </div>
              ))}
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
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setKeypadField(null)}>
          <div className="bg-white p-5 rounded-3xl w-full max-w-[340px] sm:max-w-[360px] mx-auto shadow-2xl border border-slate-100 flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-black text-slate-800">Nilai Project (Rp)</span>
              <button onClick={() => setKeypadField(null)} className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-sm font-bold transition-all">
                ✕
              </button>
            </div>
            {/* Display current value */}
            <div className="w-full bg-slate-900 text-emerald-400 rounded-2xl py-3.5 px-4 mb-3.5 text-center font-mono font-black text-2xl tracking-wider shadow-inner">
              {form.selling_price_raw || 'Rp 0'}
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
            <button type="button" onClick={() => setKeypadField(null)} className="h-12 w-full rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-sm shadow-md shadow-blue-500/25 active:scale-95 transition-all flex items-center justify-center">
              Selesai
            </button>
          </div>
        </div>
      )}

      {toast && <Toast key={toast.id} message={toast.message} type={toast.type} onClose={clearToast} />}
    </div>
  )
}
