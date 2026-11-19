import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getEmployees, verifyEmployeePin, verifyBirthdate, resetPinByBirthdate, getJobs, getProjects, deleteJob, deleteProject, getWorkTracking, createWorkTracking, updateWorkTracking, deleteWorkTracking, getStock, createStock, updateStock } from '../services/api'
import { getInitials, formatRupiah, formatDate } from '../utils/format'
import PinModal from '../components/PinModal'
import JobFormModal from '../components/JobFormModal'
import JobDetailModal from '../components/JobDetailModal'
import CrewFormModal from '../components/CrewFormModal'
import Toast from '../components/Toast'
import AdvertisingCalculatorModal from '../components/AdvertisingCalculatorModal'
import { useToast } from '../hooks/useToast'
import { STOCK_TABS, ADV_SUBS, STOCK_UNITS, stockTabOf, isStockIncomplete } from '../utils/stockAdvertising'

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
    label: 'Kalkulator',
    action: 'acrylic_calc',
    color: 'from-cyan-500 to-blue-600',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    label: 'Stok',
    action: 'stok',
    color: 'from-emerald-400 to-emerald-500',
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
  {
    label: 'Kasbon',
    action: 'kasbon',
    color: 'from-amber-400 to-amber-500',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
      </svg>
    ),
  },
]

export default function HomeScreen() {
  const navigate = useNavigate()
  const { toast, showToast, clearToast } = useToast()

  const [employees, setEmployees] = useState([])
  const [loadingEmployees, setLoadingEmployees] = useState(true)

  // Jobs
  const [jobs, setJobs] = useState([])
  const [projects, setProjects] = useState([])
  const [loadingJobs, setLoadingJobs] = useState(true)
  const [jobTab, setJobTab] = useState('aktif') // 'aktif' | 'selesai'
  const [showJobForm, setShowJobForm] = useState(false)
  const [editingJob, setEditingJob] = useState(null)
  const [selectedJob, setSelectedJob] = useState(null)
  const [showCrewForm, setShowCrewForm] = useState(false)

  // Modal state
  const [showEmployeePicker, setShowEmployeePicker] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [step, setStep] = useState(null) // 'pin' | 'reset_pin'
  const [pinLoading, setPinLoading] = useState(false)
  const [pinError, setPinError] = useState('')

  // Reset PIN state
  const [resetStep, setResetStep] = useState('birthdate') // 'birthdate' | 'newpin'
  const [birthdateInput, setBirthdateInput] = useState('')
  const [newPin, setNewPin] = useState('')
  const [newPinConfirm, setNewPinConfirm] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetError, setResetError] = useState('')

  // Work Tracking state
  const [workTracking, setWorkTracking] = useState([])
  const [showWorkModal, setShowWorkModal] = useState(false)
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedWorkItem, setSelectedWorkItem] = useState(null)
  const [workForm, setWorkForm] = useState({ item_name: '', initial_qty: '', description: '' })
  const [updateForm, setUpdateForm] = useState({ completed_qty: '' })
  const [editForm, setEditForm] = useState({ completed_qty: '' })
  const [isAdmin, setIsAdmin] = useState(false)

  // Stock state (Home Crew Mode: Cek, Ambil, Restok, & Tambah Barang Baru tanpa Harga/Spek)
  const [showStockModal, setShowStockModal] = useState(false)
  const [stockList, setStockList] = useState([])
  const [loadingStock, setLoadingStock] = useState(false)
  const [homeStockTab, setHomeStockTab] = useState('PRINT')
  const [homeAdvFilter, setHomeAdvFilter] = useState('ALL')
  const [homeStockSearch, setHomeStockSearch] = useState('')
  const [showAddStockForm, setShowAddStockForm] = useState(false)
  const [editingStock, setEditingStock] = useState(null)
  const [stockForm, setStockForm] = useState({
    name: '',
    quantity: '',
    unit: 'pcs',
    usage_category: 'PRINT',
    adv_sub_category: 'ACRYLIC',
    notes: '',
  })
  const [stockFormLoading, setStockFormLoading] = useState(false)
  const [showReduceStockModal, setShowReduceStockModal] = useState(false)
  const [stockActionMode, setStockActionMode] = useState('take') // 'take' | 'restock'
  const [showAcrylicModal, setShowAcrylicModal] = useState(false)
  const [selectedStock, setSelectedStock] = useState(null)
  const [reduceForm, setReduceForm] = useState({ quantity: '' })
  const [reduceLoading, setReduceLoading] = useState(false)

  const loadJobs = () => {
    if (jobs.length === 0 && projects.length === 0) setLoadingJobs(true)
    Promise.all([
      getJobs(),
      getProjects(),
    ])
      .then(([jobsData, projectsData]) => {
        setJobs(Array.isArray(jobsData) ? jobsData : [])
        setProjects(Array.isArray(projectsData) ? projectsData : [])
      })
      .catch(() => showToast('Gagal memuat daftar pekerjaan', 'error'))
      .finally(() => setLoadingJobs(false))
  }

  const loadWorkTracking = () => {
    getWorkTracking()
      .then((data) => setWorkTracking(Array.isArray(data) ? data : []))
      .catch(() => showToast('Gagal memuat work tracking', 'error'))
  }

  const loadStock = () => {
    if (stockList.length === 0) setLoadingStock(true)
    getStock()
      .then((data) => setStockList(Array.isArray(data) ? data : []))
      .catch(() => showToast('Gagal memuat daftar stok', 'error'))
      .finally(() => setLoadingStock(false))
  }

  const openHomeAddStockForm = () => {
    setEditingStock(null)
    const defSub = homeAdvFilter !== 'ALL' ? homeAdvFilter : 'ACRYLIC'
    const defUnit = homeStockTab === 'ADVERTISING'
      ? (ADV_SUBS.find(a => a.key === defSub)?.defaultUnit || 'lembar')
      : 'pcs'
    setStockForm({
      name: '',
      quantity: '',
      unit: defUnit,
      usage_category: homeStockTab,
      adv_sub_category: defSub,
      notes: '',
    })
    setShowAddStockForm(true)
  }

  const openHomeEditStockForm = (stock) => {
    setEditingStock(stock)
    const cat = stockTabOf(stock)
    const defSub = stock.adv_sub_category || 'ACRYLIC'
    setStockForm({
      name: stock.name || '',
      quantity: stock.quantity !== undefined && stock.quantity !== null ? String(stock.quantity) : '0',
      unit: stock.unit || 'pcs',
      usage_category: cat,
      adv_sub_category: defSub,
      notes: stock.notes || '',
    })
    setShowAddStockForm(true)
  }

  const handleSaveStock = () => {
    if (!stockForm.name.trim() || stockForm.quantity === '' || stockForm.quantity === undefined) {
      showToast('Nama barang dan jumlah stok wajib diisi', 'error')
      return
    }
    const qty = parseFloat(stockForm.quantity)
    if (isNaN(qty) || qty < 0) {
      showToast('Jumlah stok harus berupa angka valid (minimal 0)', 'error')
      return
    }
    setStockFormLoading(true)
    const payload = {
      name: stockForm.name.trim(),
      quantity: qty,
      unit: stockForm.unit || 'pcs',
      usage_category: stockForm.usage_category,
      notes: stockForm.notes ? stockForm.notes.trim() : '',
    }
    if (stockForm.usage_category === 'ADVERTISING') {
      payload.adv_sub_category = stockForm.adv_sub_category || 'ACRYLIC'
    }

    if (editingStock) {
      updateStock(editingStock.id, payload)
        .then(() => {
          showToast(`Stok "${payload.name}" berhasil diperbarui`, 'success')
          setHomeStockTab(stockForm.usage_category)
          if (stockForm.usage_category === 'ADVERTISING') {
            setHomeAdvFilter(stockForm.adv_sub_category)
          }
          setShowAddStockForm(false)
          setEditingStock(null)
          loadStock()
        })
        .catch((e) => showToast(e.message || 'Gagal memperbarui stok', 'error'))
        .finally(() => setStockFormLoading(false))
    } else {
      payload.price = 0
      if (!payload.notes) {
        payload.notes = 'Input cepat karyawan (Menunggu harga/spek Admin)'
      }
      createStock(payload)
        .then(() => {
          showToast('Barang ditambahkan! Otomatis ditandai merah di Admin untuk dilengkapi harga/spek.', 'success')
          setHomeStockTab(stockForm.usage_category)
          if (stockForm.usage_category === 'ADVERTISING') {
            setHomeAdvFilter(stockForm.adv_sub_category)
          }
          setShowAddStockForm(false)
          setEditingStock(null)
          loadStock()
        })
        .catch((e) => showToast(e.message || 'Gagal menambah stok', 'error'))
        .finally(() => setStockFormLoading(false))
    }
  }

  const handleStockClick = (stock, mode = 'take') => {
    setSelectedStock(stock)
    setStockActionMode(mode)
    setReduceForm({ quantity: '' })
    setShowReduceStockModal(true)
  }

  const handleReduceStock = () => {
    const qty = parseFloat(reduceForm.quantity)
    if (!qty || qty <= 0) {
      showToast('Masukkan jumlah lebih dari 0', 'error')
      return
    }
    if (stockActionMode === 'take' && qty > selectedStock.quantity) {
      showToast('Jumlah pengambilan melebihi stok tersedia', 'error')
      return
    }
    const newQuantity = stockActionMode === 'restock'
      ? Number(selectedStock.quantity || 0) + qty
      : Number(selectedStock.quantity || 0) - qty
    setReduceLoading(true)
    updateStock(selectedStock.id, { quantity: newQuantity })
      .then(() => {
        showToast(stockActionMode === 'restock' ? 'Jumlah stok berhasil ditambah' : 'Stok berhasil diambil', 'success')
        setShowReduceStockModal(false)
        setSelectedStock(null)
        setReduceForm({ quantity: '' })
        loadStock()
      })
      .catch((e) => showToast(e.message || 'Gagal memperbarui stok', 'error'))
      .finally(() => setReduceLoading(false))
  }

  const handleCreateWorkItem = () => {
    if (!workForm.item_name || !workForm.initial_qty) {
      showToast('Nama item dan jumlah awal wajib diisi', 'error')
      return
    }
    createWorkTracking({ ...workForm, initial_qty: parseFloat(workForm.initial_qty) })
      .then(() => {
        showToast('Work item berhasil ditambahkan', 'success')
        setWorkForm({ item_name: '', initial_qty: '', description: '' })
        setShowWorkModal(false)
        loadWorkTracking()
      })
      .catch((e) => showToast(e.message || 'Gagal menambah work item', 'error'))
  }

  const handleUpdateProgress = () => {
    if (!updateForm.completed_qty) {
      showToast('Jumlah selesai wajib diisi', 'error')
      return
    }
    const newCompletedQty = (selectedWorkItem.completed_qty || 0) + parseFloat(updateForm.completed_qty)
    updateWorkTracking(selectedWorkItem.id, { completed_qty: newCompletedQty })
      .then(() => {
        showToast('Progress berhasil diupdate', 'success')
        setUpdateForm({ completed_qty: '' })
        setShowUpdateModal(false)
        setSelectedWorkItem(null)
        loadWorkTracking()
      })
      .catch((e) => showToast(e.message || 'Gagal update progress', 'error'))
  }

  const handleDeleteWorkItem = (id) => {
    if (!window.confirm('Hapus work item ini?')) return
    deleteWorkTracking(id)
      .then(() => {
        showToast('Work item berhasil dihapus', 'success')
        loadWorkTracking()
      })
      .catch((e) => showToast(e.message || 'Gagal menghapus work item', 'error'))
  }

  const handleEditWorkItem = (item) => {
    setSelectedWorkItem(item)
    setEditForm({ completed_qty: item.completed_qty })
    setShowEditModal(true)
  }

  const handleSaveEdit = () => {
    if (!editForm.completed_qty) {
      showToast('Jumlah selesai wajib diisi', 'error')
      return
    }
    updateWorkTracking(selectedWorkItem.id, {
      completed_qty: parseFloat(editForm.completed_qty)
    })
      .then(() => {
        showToast('Progress berhasil diupdate', 'success')
        setShowEditModal(false)
        setSelectedWorkItem(null)
        setEditForm({ completed_qty: '' })
        loadWorkTracking()
      })
      .catch((e) => showToast(e.message || 'Gagal mengupdate progress', 'error'))
  }

  const handleDeleteJob = async (job) => {
    if (!window.confirm(`Hapus pekerjaan "${job.job_name || job.project_name}"?`)) return
    try {
      if (job._source === 'job') {
        await deleteJob(job.id)
      } else if (job._source === 'project') {
        await deleteProject(job.id)
      }
      showToast('Pekerjaan dihapus', 'success')
      loadJobs()
    } catch (e) {
      showToast(e.message || 'Gagal menghapus', 'error')
    }
  }

  // Combine and filter jobs/projects based on tab
  const allJobs = [
    ...jobs.map(j => ({ ...j, _source: 'job' })),
    ...projects.map(p => ({ ...p, _source: 'project' })),
  ]

  const filteredJobs = allJobs.filter(item => {
    const status = item.progress_status || item.status || 'proses'
    if (jobTab === 'aktif') return status === 'pending' || status === 'proses' || status === 'in_progress'
    if (jobTab === 'selesai') return status === 'selesai' || status === 'completed'
    return true
  })

  useEffect(() => {
    getEmployees()
      .then((data) => setEmployees(Array.isArray(data) ? data : []))
      .catch(() => showToast('Gagal memuat data karyawan', 'error'))
      .finally(() => setLoadingEmployees(false))
    loadJobs()
    loadWorkTracking()
  }, [])

  const handleNavClick = (btn) => {
    if (btn.action === 'kasbon') setShowEmployeePicker(true)
    else if (btn.action === 'stok') {
      setShowStockModal(true)
      loadStock()
    }
    else if (btn.action === 'acrylic_calc') {
      setShowAcrylicModal(true)
    }
    else if (btn.path) navigate(btn.path)
  }

  const handleEmployeeClick = (emp) => {
    if (emp.status === 'inactive') {
      showToast('Akun anggota ini sedang nonaktif', 'error')
      return
    }
    setShowEmployeePicker(false)
    setSelectedEmployee(emp)
    setPinError('')
    setStep('pin')
  }

  const handlePinConfirm = async (pin) => {
    setPinLoading(true)
    setPinError('')
    try {
      await verifyEmployeePin(selectedEmployee.id, pin)
      const emp = selectedEmployee
      closeModals()
      navigate('/kasbon-dashboard', { state: { employee: emp } })
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
      await verifyBirthdate(selectedEmployee.id, birthdateInput)
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
    setShowEmployeePicker(false)
    setSelectedEmployee(null)
    setStep(null)
    setPinError('')
    setResetError('')
    setBirthdateInput('')
    setNewPin('')
    setNewPinConfirm('')
  }

  const openAddJob = () => { setEditingJob(null); setShowJobForm(true) }
  const openEditJob = (job) => {
    setSelectedJob(null)
    // Check if it's a project or job
    if (job._source === 'project') {
      // Navigate to ProjectPage with edit mode
      navigate('/project', { state: { editingProject: job } })
    } else {
      setEditingJob(job)
      setShowJobForm(true)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      {/* Header dengan Logo Besar */}
      <div
        className="relative flex flex-col items-center pt-8 pb-6 px-5"
        style={{
          background: 'linear-gradient(160deg, #0A4D68 0%, #0d7fa8 70%, #1ab3e8 100%)',
        }}
      >
        {/* Logo Besar */}
        <img src="/icon-512.png" alt="Logo" className="w-24 h-24 object-contain mb-2" />
        <p className="text-white/60 text-sm tracking-widest uppercase mb-1">
          ONE_STOP CUTTING STICKER & ADVERTISING
        </p>
      </div>

      {/* 2 Column Layout */}
      <div className="flex-1 flex flex-col md:flex-row gap-4 p-4">
        {/* Left Panel - Navigation Buttons */}
        <div className="w-full md:w-1/2 flex flex-col gap-3">
          <div className="bg-white rounded-2xl shadow-lg p-5 flex-1"
            style={{
              background: 'linear-gradient(160deg, #0A4D68 0%, #0d7fa8 70%, #1ab3e8 100%)',
            }}
          >
            <div className="space-y-3">
              {NAV_BUTTONS.map((btn) => (
                <button
                  key={btn.label}
                  onClick={() => handleNavClick(btn)}
                  className={`w-full flex items-center gap-3 py-4 px-5 rounded-xl text-white font-semibold shadow-lg active:scale-95 transition-all bg-gradient-to-r ${btn.color}`}
                >
                  {btn.icon}
                  {btn.label}
                </button>
              ))}
            </div>

            {/* Work Tracking Section */}
            <div className="mt-4 pt-4 border-t border-white/20">
              <div className="flex justify-between items-center mb-3">
                <p className="text-white font-semibold text-sm">Work Tracking</p>
                <button onClick={() => setShowWorkModal(true)} className="text-white/80 hover:text-white text-xs bg-white/20 px-2 py-1 rounded-lg">
                  + Tambah
                </button>
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {workTracking.map((item) => {
                  const progress = (item.completed_qty / item.initial_qty) * 100
                  let bgColor = 'bg-green-500'
                  if (progress < 25) bgColor = 'bg-red-500'
                  else if (progress < 50) bgColor = 'bg-yellow-500'
                  else if (progress < 75) bgColor = 'bg-orange-500'

                  return (
                    <div key={item.id} onClick={() => { setSelectedWorkItem(item); setShowUpdateModal(true) }} className="bg-white/10 rounded-xl p-3 cursor-pointer hover:bg-white/20 transition-all">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-white font-medium text-sm truncate flex-1">{item.item_name}</span>
                        <span className="text-white/80 text-xs ml-2">{item.remaining_qty} pcs</span>
                      </div>
                      <div className="w-full bg-white/20 rounded-full h-1.5 mt-2">
                        <div className={`${bgColor} h-1.5 rounded-full transition-all`} style={{ width: `${Math.min(progress, 100)}%` }}></div>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-white/60 text-xs">{item.completed_qty} / {item.initial_qty} pcs</span>
                        <div className="flex gap-2">
                          <button onClick={(e) => { e.stopPropagation(); handleEditWorkItem(item) }} className="text-blue-300 hover:text-blue-200 text-xs">Edit</button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteWorkItem(item.id) }} className="text-red-300 hover:text-red-200 text-xs">Hapus</button>
                        </div>
                      </div>
                    </div>
                  )
                })}
                {workTracking.length === 0 && (
                  <p className="text-white/60 text-xs text-center py-4">Belum ada work item</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Job List */}
        <div className="w-full md:w-1/2 flex flex-col">
          <div className="bg-white rounded-2xl shadow-lg p-5 flex-1"
            style={{
              background: 'linear-gradient(160deg, #e0f2fe 0%, #bae6fd 100%)',
            }}
          >
            {/* Tombol Tambah Anggota */}
            <button onClick={() => setShowCrewForm(true)}
              className="w-full mb-2 py-2 rounded-xl bg-purple-500 text-white text-sm font-semibold shadow hover:bg-purple-600 active:scale-95 transition-all flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Tambah Anggota
            </button>

            {/* Tombol Tambah Pekerjaan */}
            <button onClick={openAddJob}
              className="w-full mb-4 py-3 rounded-xl bg-primary text-white font-bold shadow hover:bg-primary-dark active:scale-95 transition-all flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Tambah Pekerjaan
            </button>

            {/* Tabs */}
            <div className="flex bg-gray-100 rounded-xl p-1 mb-4 gap-1">
              {['Aktif', 'Selesai'].map((tab) => (
                <button key={tab} onClick={() => setJobTab(tab.toLowerCase())}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${jobTab === tab.toLowerCase() ? 'bg-white text-primary shadow' : 'text-gray-500'}`}>
                  {tab}
                </button>
              ))}
            </div>

            <h2 className="text-gray-800 font-bold text-lg mb-4">Daftar Pekerjaan</h2>
            {loadingJobs && jobs.length === 0 && projects.length === 0 ? (
              <div className="flex justify-center items-center py-16">
                <svg className="w-8 h-8 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
              </div>
            ) : filteredJobs.length === 0 ? (
              <p className="text-center text-gray-400 py-16">Belum ada pekerjaan.</p>
            ) : (
              <div className="space-y-3">
                {filteredJobs.map((job) => {
                  const isProject = job._source === 'project'
                  const jobName = job.job_name || job.project_name || 'Tanpa nama'
                  const customerName = job.customer_name || '-'
                  const totalPrice = job.total_price || job.selling_price || job.total_project_value || 0
                  const dpAmount = job.dp_amount || 0
                  const isLunas = job.payment_status === 'lunas' || (totalPrice > 0 && dpAmount >= totalPrice)
                  const isSelesai = (job.progress_status || job.status) === 'selesai' || (job.progress_status || job.status) === 'completed'
                  let bgColor = 'bg-orange-50'
                  let borderColor = 'border-orange-500'
                  let statusText = 'DP'

                  if (isSelesai) {
                    bgColor = 'bg-gray-100'
                    borderColor = 'border-gray-400'
                    statusText = 'SELESAI'
                  } else if (isLunas) {
                    bgColor = 'bg-green-50'
                    borderColor = 'border-green-500'
                    statusText = 'LUNAS'
                  }

                  return (
                    <div
                      key={job.id}
                      className={`w-full rounded-xl shadow-sm p-4 transition-all border-l-4 ${bgColor} ${borderColor}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <button onClick={() => setSelectedJob(job)} className="flex-1 text-left min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${isProject ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                              {isProject ? 'PROJECT' : 'JOB'}
                            </span>
                            <p className="font-bold text-gray-800 leading-tight truncate">{jobName}</p>
                          </div>
                          <p className="text-sm text-gray-500 truncate">{customerName}</p>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteJob(job) }}
                          className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center text-red-400 hover:bg-red-100 hover:text-red-600 shrink-0">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-2 text-xs">
                        <span className="text-gray-400">
                          {formatDate(job.date)}
                          {job.completed_at && ` · Selesai: ${formatDate(job.completed_at)}`}
                        </span>
                        <span className="font-semibold text-gray-700">{formatRupiah(totalPrice)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PIN Modal */}
      {step === 'pin' && selectedEmployee && (
        <PinModal
          employeeName={selectedEmployee.name}
          employeePhoto={selectedEmployee.photo}
          onConfirm={handlePinConfirm}
          onCancel={closeModals}
          onForgotPin={handleForgotPin}
          loading={pinLoading}
          error={pinError}
        />
      )}

      {/* Employee Picker (untuk Kasbon) */}
      {showEmployeePicker && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-5 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-800">Pilih Karyawan</h2>
              <button onClick={() => setShowEmployeePicker(false)} className="w-8 h-8 rounded-full bg-gray-100 text-gray-500">✕</button>
            </div>
            {loadingEmployees ? (
              <div className="flex justify-center py-10">
                <svg className="w-7 h-7 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
              </div>
            ) : employees.filter((emp) => emp.status !== 'inactive').length === 0 ? (
              <p className="text-center text-gray-400 py-10">Belum ada anggota aktif untuk kasbon.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {employees.filter((emp) => emp.status !== 'inactive').map((emp) => (
                  <button key={emp.id} onClick={() => handleEmployeeClick(emp)}
                    className="bg-white rounded-2xl shadow-sm p-4 flex flex-col items-center gap-2 active:scale-95 transition-all hover:shadow-md border border-gray-100">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                      {emp.photo ? (
                        <img src={emp.photo} alt={emp.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-primary font-bold text-lg">{getInitials(emp.name)}</span>
                      )}
                    </div>
                    <p className="font-semibold text-gray-800 text-sm text-center leading-tight">{emp.name}</p>
                    <p className="text-xs text-gray-400 text-center">{emp.position || emp.role || '-'}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Job Form Modal */}
      {showJobForm && (
        <JobFormModal
          job={editingJob}
          onClose={() => setShowJobForm(false)}
          onSaved={loadJobs}
          showToast={showToast}
        />
      )}

      {/* Crew Form Modal */}
      {showCrewForm && (
        <CrewFormModal
          onClose={() => setShowCrewForm(false)}
          onSaved={loadJobs}
          showToast={showToast}
        />
      )}

      {/* Job Detail Modal */}
      {selectedJob && (
        <JobDetailModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onChanged={loadJobs}
          onEdit={openEditJob}
          showToast={showToast}
          tab={jobTab}
        />
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

      {/* Add Work Item Modal */}
      {showWorkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 pb-8">
            <div className="flex justify-between items-center mb-4">
              <p className="font-bold text-gray-800">Tambah Work Item</p>
              <button onClick={() => setShowWorkModal(false)} className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center">✕</button>
            </div>
            <div className="space-y-3">
              <input type="text" value={workForm.item_name} onChange={e => setWorkForm(f => ({ ...f, item_name: e.target.value }))} placeholder="Nama Item *"
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <input type="number" value={workForm.initial_qty} onChange={e => setWorkForm(f => ({ ...f, initial_qty: e.target.value }))} placeholder="Jumlah Awal *"
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <input type="text" value={workForm.description} onChange={e => setWorkForm(f => ({ ...f, description: e.target.value }))} placeholder="Deskripsi (Opsional)"
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <button onClick={handleCreateWorkItem}
                className="w-full py-3.5 rounded-2xl bg-primary text-white font-bold hover:bg-primary-dark active:scale-95 transition-all">
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Work Item Modal */}
      {showEditModal && selectedWorkItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 pb-8">
            <div className="flex justify-between items-center mb-4">
              <p className="font-bold text-gray-800">Edit Progress</p>
              <button onClick={() => { setShowEditModal(false); setSelectedWorkItem(null); setEditForm({ completed_qty: '' }) }} className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center">✕</button>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-gray-600">{selectedWorkItem.item_name}</p>
              <p className="text-xs text-gray-500">Total: {selectedWorkItem.initial_qty} pcs</p>
              <input type="number" value={editForm.completed_qty} onChange={e => setEditForm(f => ({ ...f, completed_qty: e.target.value }))} placeholder="Jumlah Selesai *"
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <button onClick={handleSaveEdit}
                className="w-full py-3.5 rounded-2xl bg-primary text-white font-bold hover:bg-primary-dark active:scale-95 transition-all">
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Progress Modal */}
      {showUpdateModal && selectedWorkItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 pb-8">
            <div className="flex justify-between items-center mb-4">
              <p className="font-bold text-gray-800">Update Progress</p>
              <button onClick={() => { setShowUpdateModal(false); setSelectedWorkItem(null) }} className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center">✕</button>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-gray-600">{selectedWorkItem.item_name}</p>
              <p className="text-xs text-gray-500">Sisa: {selectedWorkItem.remaining_qty} pcs</p>
              <input type="number" value={updateForm.completed_qty} onChange={e => setUpdateForm(f => ({ ...f, completed_qty: e.target.value }))} placeholder="Jumlah Selesai Hari Ini *"
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <button onClick={handleUpdateProgress}
                className="w-full py-3.5 rounded-2xl bg-primary text-white font-bold hover:bg-primary-dark active:scale-95 transition-all">
                Update Progress
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Modal (Mode Crew/Karyawan: Cek, Ambil, Restok, & Tambah Barang Baru tanpa Harga/Spek) */}
      {showStockModal && (() => {
        const activeTabCls = {
          orange: 'bg-orange-500 text-white shadow',
          blue: 'bg-blue-500 text-white shadow',
          purple: 'bg-purple-600 text-white shadow',
        }
        const inTab = stockList.filter(s => stockTabOf(s) === homeStockTab)
        const bySub = homeStockTab === 'ADVERTISING' && homeAdvFilter !== 'ALL'
          ? inTab.filter(s => s.adv_sub_category === homeAdvFilter)
          : inTab
        const filteredStock = bySub
          .filter(s => !homeStockSearch.trim() || (s.name || '').toLowerCase().includes(homeStockSearch.trim().toLowerCase()))
          .slice()
          .sort((a, b) => (a.name || '').localeCompare(b.name || ''))

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-5 pb-7 max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center mb-3 shrink-0">
                <div>
                  <p className="font-bold text-gray-800 text-lg">📦 Gudang & Stok Barang</p>
                  <p className="text-xs text-gray-400">Cek sisa stok, ambil pemakaian, atau tambah stok barang baru</p>
                </div>
                <button
                  onClick={() => { setShowStockModal(false); setShowAddStockForm(false); setEditingStock(null) }}
                  className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200"
                >
                  ✕
                </button>
              </div>

              {!showAddStockForm ? (
                <div className="flex-1 flex flex-col min-h-0 space-y-3">
                  {/* 3 Tab Kategori */}
                  <div className="grid grid-cols-3 gap-1.5 bg-gray-100 rounded-2xl p-1 shrink-0">
                    {STOCK_TABS.map(t => (
                      <button
                        key={t.key}
                        onClick={() => { setHomeStockTab(t.key); setHomeAdvFilter('ALL') }}
                        className={`py-2.5 rounded-xl text-xs font-bold transition-all ${homeStockTab === t.key ? activeTabCls[t.color] : 'text-gray-500 hover:bg-white'}`}
                      >
                        <span className="mr-1">{t.icon}</span>{t.label}
                        <span className={`ml-1 text-[10px] ${homeStockTab === t.key ? 'opacity-85' : 'text-gray-400'}`}>
                          ({stockList.filter(s => stockTabOf(s) === t.key).length})
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Filter Sub-Kategori khusus Advertising */}
                  {homeStockTab === 'ADVERTISING' && (
                    <div className="flex gap-1.5 overflow-x-auto pb-1 shrink-0">
                      {[{ key: 'ALL', label: 'Semua', icon: '' }, ...ADV_SUBS].map(a => (
                        <button
                          key={a.key}
                          onClick={() => setHomeAdvFilter(a.key)}
                          className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                            homeAdvFilter === a.key
                              ? 'bg-purple-600 text-white border-purple-600'
                              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {a.icon} {a.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Search & Tombol Tambah Barang Baru */}
                  <div className="flex gap-2 shrink-0">
                    <input
                      type="text"
                      value={homeStockSearch}
                      onChange={e => setHomeStockSearch(e.target.value)}
                      placeholder="Cari nama barang di kategori ini..."
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    />
                    <button
                      onClick={openHomeAddStockForm}
                      className="px-4 py-2.5 rounded-xl bg-emerald-500 text-white text-xs sm:text-sm font-bold hover:bg-emerald-600 active:scale-95 transition-all shrink-0 shadow-sm"
                    >
                      + Barang Baru
                    </button>
                  </div>

                  {/* Daftar Barang */}
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    {loadingStock ? (
                      <div className="text-center py-10 text-gray-500 text-sm">Memuat daftar stok...</div>
                    ) : filteredStock.length === 0 ? (
                      <div className="text-center py-10 text-gray-400 text-sm">
                        Belum ada barang di kategori ini.
                      </div>
                    ) : (
                      filteredStock.map((stock) => {
                        const isLowStock = stock.quantity <= 10 && stock.quantity > 1
                        const isCriticalStock = stock.quantity <= 1
                        const sub = ADV_SUBS.find(a => a.key === stock.adv_sub_category)
                        const { incomplete } = isStockIncomplete(stock)

                        return (
                          <div
                            key={stock.id}
                            className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-2 sm:gap-3 ${
                              isCriticalStock
                                ? 'bg-red-50 border-red-300'
                                : isLowStock
                                ? 'bg-amber-50 border-amber-300'
                                : 'bg-gray-50 border-gray-200'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {homeStockTab === 'ADVERTISING' && sub && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-bold">
                                    {sub.icon} {sub.label}
                                  </span>
                                )}
                                <p className={`font-bold text-sm truncate ${isCriticalStock ? 'text-red-800' : isLowStock ? 'text-amber-900' : 'text-gray-800'}`}>
                                  {stock.name}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className={`text-xs font-extrabold px-2 py-0.5 rounded-lg ${
                                  isCriticalStock ? 'bg-red-200 text-red-900' : isLowStock ? 'bg-amber-200 text-amber-900' : 'bg-white text-gray-700 border border-gray-200'
                                }`}>
                                  Sisa: {stock.quantity} {stock.unit}
                                </span>
                                {incomplete && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold border border-red-200">
                                    ⏳ Menunggu Harga/Spek Admin
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Tombol Aksi: Edit, Ambil, Restok */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => openHomeEditStockForm(stock)}
                                className="px-2.5 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold shadow-sm active:scale-95 transition-all"
                                title="Edit info & sesuaikan jumlah stok fisik"
                              >
                                ✏️ Edit
                              </button>
                              <button
                                onClick={() => handleStockClick(stock, 'take')}
                                className="px-2.5 sm:px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-sm active:scale-95 transition-all"
                                title="Kurangi stok (Ambil barang)"
                              >
                                📤 Ambil
                              </button>
                              <button
                                onClick={() => handleStockClick(stock, 'restock')}
                                className="px-2 sm:px-2.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-sm active:scale-95 transition-all"
                                title="Tambah jumlah stok masuk"
                              >
                                📥 +Stok
                              </button>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5 overflow-y-auto pr-1">
                  <button
                    onClick={() => { setShowAddStockForm(false); setEditingStock(null) }}
                    className="text-xs font-bold text-gray-600 hover:text-gray-900 flex items-center gap-1"
                  >
                    ← Kembali ke Daftar Stok
                  </button>

                  {editingStock ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 text-xs text-blue-900">
                      <p className="font-bold flex items-center gap-1.5">
                        <span>✏️</span> Edit & Update Stok: <span className="underline">{editingStock.name}</span>
                      </p>
                      <p className="text-[11px] text-blue-800 mt-0.5">
                        Ubah nama barang, kategori, satuan, catatan, atau langsung sesuaikan jumlah fisik stok saat ini.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-900">
                      <p className="font-bold">💡 Input Cepat Stok Gudang (Karyawan)</p>
                      <p className="text-[11px] text-amber-800 mt-0.5">
                        Cukup pilih kategori, nama barang, dan jumlah fisik. <b>Harga modal & spesifikasi teknis</b> tidak perlu diisi di sini — otomatis ditandai merah di menu Admin untuk dilengkapi Owner.
                      </p>
                    </div>
                  )}

                  {/* 1. Pilih Kategori */}
                  <div>
                    <label className="text-xs font-bold text-gray-600 block mb-1">1. Kategori Barang *</label>
                    <div className="grid grid-cols-3 gap-1.5 bg-gray-100 rounded-2xl p-1">
                      {STOCK_TABS.map(t => (
                        <button
                          key={t.key}
                          type="button"
                          onClick={() => {
                            const defUnit = t.key === 'ADVERTISING'
                              ? (ADV_SUBS.find(a => a.key === stockForm.adv_sub_category)?.defaultUnit || 'lembar')
                              : 'pcs'
                            setStockForm(f => ({ ...f, usage_category: t.key, unit: defUnit }))
                          }}
                          className={`py-2.5 rounded-xl text-xs font-bold transition-all ${
                            stockForm.usage_category === t.key ? activeTabCls[t.color] : 'text-gray-500 hover:bg-white'
                          }`}
                        >
                          {t.icon} {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2. Pilih Jenis Komponen (Jika ADVERTISING) */}
                  {stockForm.usage_category === 'ADVERTISING' && (
                    <div>
                      <label className="text-xs font-bold text-gray-600 block mb-1">2. Jenis Komponen Advertising *</label>
                      <select
                        value={stockForm.adv_sub_category}
                        onChange={e => {
                          const subKey = e.target.value
                          const defUnit = ADV_SUBS.find(a => a.key === subKey)?.defaultUnit || 'pcs'
                          setStockForm(f => ({ ...f, adv_sub_category: subKey, unit: defUnit }))
                        }}
                        className="w-full px-4 py-3 rounded-2xl border border-purple-200 bg-purple-50/40 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-purple-400"
                      >
                        {ADV_SUBS.map(a => (
                          <option key={a.key} value={a.key}>{a.icon} {a.label}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* 3. Nama Barang */}
                  <div>
                    <label className="text-xs font-bold text-gray-600 block mb-1">Nama Barang *</label>
                    <input
                      type="text"
                      value={stockForm.name}
                      onChange={e => setStockForm(f => ({ ...f, name: e.target.value }))}
                      placeholder={
                        stockForm.usage_category === 'ADVERTISING'
                          ? 'Contoh: Akrilik Putih Susu 3mm / Stiker Oracal Merah'
                          : stockForm.usage_category === 'PRINT'
                          ? 'Contoh: Art Paper 260gr A3+ / Banner Flexi 280gr'
                          : 'Contoh: Lakban Bening / Lem Korea'
                      }
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    />
                  </div>

                  {/* 4. Jumlah & Satuan */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-xs font-bold text-gray-600 block mb-1">
                        {editingStock ? 'Jumlah Sisa Stok Aktual *' : 'Jumlah Stok Masuk *'}
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={stockForm.quantity}
                        onChange={e => setStockForm(f => ({ ...f, quantity: e.target.value }))}
                        placeholder={editingStock ? 'Contoh: 25' : 'Contoh: 10'}
                        className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-600 block mb-1">Satuan *</label>
                      <select
                        value={stockForm.unit}
                        onChange={e => setStockForm(f => ({ ...f, unit: e.target.value }))}
                        className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                      >
                        {STOCK_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* 5. Catatan Singkat (Opsional) */}
                  <div>
                    <label className="text-xs font-bold text-gray-600 block mb-1">Catatan (Opsional)</label>
                    <input
                      type="text"
                      value={stockForm.notes}
                      onChange={e => setStockForm(f => ({ ...f, notes: e.target.value }))}
                      placeholder={editingStock ? 'Catatan tambahan...' : 'Contoh: Barang baru datang dari supplier'}
                      className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    />
                  </div>

                  <button
                    onClick={handleSaveStock}
                    disabled={stockFormLoading}
                    className="w-full py-3.5 rounded-2xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                  >
                    {stockFormLoading ? 'Menyimpan...' : editingStock ? 'Simpan Perubahan Stok' : 'Simpan Barang Baru'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* Ambil / Tambah Jumlah Stok Modal */}
      {showReduceStockModal && selectedStock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 pb-8">
            <div className="flex justify-between items-center mb-4">
              <p className="font-bold text-gray-800">
                {stockActionMode === 'restock' ? '📥 Tambah Jumlah Stok' : '📤 Ambil Stok Gudang'}
              </p>
              <button onClick={() => { setShowReduceStockModal(false); setSelectedStock(null) }} className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center">✕</button>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-gray-800 font-bold">{selectedStock.name}</p>
              <p className="text-xs text-gray-500">Stok saat ini: <b>{selectedStock.quantity} {selectedStock.unit}</b></p>
              <input
                type="number"
                step="any"
                value={reduceForm.quantity}
                onChange={e => setReduceForm(f => ({ ...f, quantity: e.target.value }))}
                placeholder={stockActionMode === 'restock' ? `Jumlah masuk (${selectedStock.unit}) *` : `Jumlah diambil (${selectedStock.unit}) *`}
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
              <button
                onClick={handleReduceStock}
                disabled={reduceLoading}
                className={`w-full py-3.5 rounded-2xl text-white font-bold active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  stockActionMode === 'restock' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-amber-500 hover:bg-amber-600'
                }`}
              >
                {reduceLoading ? 'Memproses...' : stockActionMode === 'restock' ? 'TAMBAH STOK' : 'AMBIL STOK'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <Toast key={toast.id} message={toast.message} type={toast.type} onClose={clearToast} />
      )}

      {/* Kalkulator Advertising (1 tombol, tab produk) */}
      {showAcrylicModal && (
        <AdvertisingCalculatorModal
          onClose={() => setShowAcrylicModal(false)}
          showToast={showToast}
        />
      )}
    </div>
  )
}
