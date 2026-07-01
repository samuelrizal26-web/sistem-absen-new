import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getEmployees, getEmployee, createEmployee, updateEmployee, deleteEmployee,
  getStock, createStock, updateStock, deleteStock,
  getCashflow, getCashflowSummary, createCashflow, updateCashflow, deleteCashflow,
  getPrintJobs, getProjects, getAllAdvances, deleteAdvance, settleKasbon,
  getJobs,
  verifyAdminPin, verifyAdminPassword, changeAdminPin, setupAdminPin,
} from '../services/api'
import { formatRupiah, formatDate, formatRupiahInput, parseRupiahInput } from '../utils/format'
import { openCashDrawerOnly } from '../utils/rawbt'
import Toast from '../components/Toast'
import { useToast } from '../hooks/useToast'

const TAB = { CREW: 'crew', STOCK: 'stock', CASHFLOW: 'cashflow', EMPLOYEE_TX: 'employee_tx', SETTINGS: 'settings' }

export default function AdminPage() {
  const navigate = useNavigate()
  const { toast, showToast, clearToast } = useToast()

  // Auth
  const [authed, setAuthed] = useState(false)
  const [authMode, setAuthMode] = useState('pin') // 'pin' | 'password'
  const [pinInput, setPinInput] = useState('')
  const [passInput, setPassInput] = useState({ username: '', password: '' })
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  // Navigation
  const [tab, setTab] = useState(TAB.CREW)

  // ── Crew state ──
  const [employees, setEmployees] = useState([])
  const [empLoading, setEmpLoading] = useState(false)
  const [empSearch, setEmpSearch] = useState('')
  const [showAddEmp, setShowAddEmp] = useState(false)
  const [editEmp, setEditEmp] = useState(null)
  const [empForm, setEmpForm] = useState({ name: '', whatsapp: '', pin: '', birthdate: '', birthplace: '', position: '', status_crew: 'Tetap', monthly_salary: 0, monthly_salary_raw: '', work_hours_per_day: 8, photo: '' })
  const [empStep, setEmpStep] = useState(1)
  const [empSaving, setEmpSaving] = useState(false)

  // ── Stock state ──
  const [stocks, setStocks] = useState([])
  const [stockLoading, setStockLoading] = useState(false)
  const [showAddStock, setShowAddStock] = useState(false)
  const [editStock, setEditStock] = useState(null)
  const [stockForm, setStockForm] = useState({ name: '', quantity: '', unit: 'pcs', price: '', price_raw: '', usage_category: 'PRINT', notes: '' })
  const [stockSaving, setStockSaving] = useState(false)
  const [viewStock, setViewStock] = useState(null)

  // ── Cashflow state ──
  const [cashflows, setCashflows] = useState([])
  const [cfSummary, setCfSummary] = useState(null)
  const [cfPrintJobs, setCfPrintJobs] = useState([])
  const [cfProjects, setCfProjects] = useState([])
  const [cfJobs, setCfJobs] = useState([])
  const [advances, setAdvances] = useState([])
  const [cfLoading, setCfLoading] = useState(false)
  const [cfSearch, setCfSearch] = useState('')
  const [showAddCf, setShowAddCf] = useState(false)
  const [cfForm, setCfForm] = useState({ type: 'income', amount: '', amount_raw: '', description: '', payment_method: 'cash', notes: '', employee_id: '' })
  const [cfSaving, setCfSaving] = useState(false)
  const [cfTab, setCfTab] = useState('semua')
  const [editCf, setEditCf] = useState(null)
  const [viewEmp, setViewEmp] = useState(null)
  const [viewCf, setViewCf] = useState(null)

  // ── Employee Transactions state ──
  const [empTxLoading, setEmpTxLoading] = useState(false)
  const [empTxSearchMonth, setEmpTxSearchMonth] = useState('')
  const [empTxPrintJobs, setEmpTxPrintJobs] = useState([])
  const [empTxCashflows, setEmpTxCashflows] = useState([])
  const [selectedEmployee, setSelectedEmployee] = useState(null)

  // ── Settings state ──
  const [oldPin, setOldPin] = useState('')
  const [newPinA, setNewPinA] = useState('')
  const [newPinB, setNewPinB] = useState('')
  const [pinChanging, setPinChanging] = useState(false)

  // ─────────────────── AUTH ───────────────────
  const handlePinAuth = async () => {
    if (!pinInput) return
    setAuthLoading(true); setAuthError('')
    try {
      await verifyAdminPin(pinInput)
      setAuthed(true)
    } catch {
      setAuthError('PIN salah')
      setPinInput('')
    } finally { setAuthLoading(false) }
  }

  const handlePassAuth = async () => {
    setAuthLoading(true); setAuthError('')
    try {
      await verifyAdminPassword(passInput.username, passInput.password)
      setAuthed(true)
    } catch {
      setAuthError('Username atau password salah')
    } finally { setAuthLoading(false) }
  }

  // ─────────────────── LOAD DATA ───────────────────
  const loadEmployees = async () => {
    setEmpLoading(true)
    try { setEmployees(await getEmployees()) } catch { showToast('Gagal memuat karyawan', 'error') }
    finally { setEmpLoading(false) }
  }

  const loadStocks = async () => {
    setStockLoading(true)
    try { const s = await getStock(); setStocks(Array.isArray(s) ? s : []) } catch { showToast('Gagal memuat stok', 'error') }
    finally { setStockLoading(false) }
  }

  const loadCashflow = async () => {
    setCfLoading(true)
    try {
      const [cf, cfs, pj, pr, jobs, adv] = await Promise.all([
        getCashflow(cfSearch ? `?month=${cfSearch}` : ''),
        getCashflowSummary(),
        getPrintJobs(cfSearch ? `?month=${cfSearch}` : ''),
        getProjects(cfSearch ? `?month=${cfSearch}` : ''),
        getJobs(cfSearch ? `?month=${cfSearch}` : ''),
        getAllAdvances(),
      ])
      setCashflows(Array.isArray(cf) ? cf : [])
      setCfSummary(cfs)
      setCfPrintJobs(Array.isArray(pj) ? pj : [])
      setCfProjects(Array.isArray(pr) ? pr : [])
      setCfJobs(Array.isArray(jobs) ? jobs : [])
      setAdvances(Array.isArray(adv) ? adv : [])
    } catch { showToast('Gagal memuat cashflow', 'error') }
    finally { setCfLoading(false) }
  }

  useEffect(() => {
    if (!authed) return
    if (tab === TAB.CREW) loadEmployees()
    if (tab === TAB.STOCK) loadStocks()
    if (tab === TAB.CASHFLOW) loadCashflow()
    if (tab === TAB.EMPLOYEE_TX) {
      loadEmployees() // Load employees for name mapping
      loadEmployeeTransactions()
    }
  }, [authed, tab, cfSearch, empTxSearchMonth])

  // ─────────────────── EMPLOYEE CRUD ───────────────────
  const resetEmpForm = () => {
    setEmpForm({ name: '', whatsapp: '', pin: '', birthdate: '', birthplace: '', position: '', status_crew: 'Tetap', monthly_salary: 0, monthly_salary_raw: '', work_hours_per_day: 8, photo: '' })
    setEmpStep(1); setEditEmp(null); setShowAddEmp(false)
  }

  const handleSaveEmployee = async () => {
    if (empStep === 1) {
      if (!empForm.name || !empForm.whatsapp || (!editEmp && !empForm.pin) || !empForm.birthdate || !empForm.birthplace) {
        showToast('Lengkapi semua field wajib', 'error'); return
      }
      setEmpStep(2); return
    }
    if (!empForm.position || !empForm.status_crew) {
      showToast('Lengkapi posisi dan status crew', 'error'); return
    }
    setEmpSaving(true)
    try {
      const salary = parseRupiahInput(empForm.monthly_salary_raw) || 0
      const payload = { ...empForm, monthly_salary: salary }
      delete payload.monthly_salary_raw
      if (!payload.pin) delete payload.pin
      if (editEmp) {
        await updateEmployee(editEmp.id, payload)
        showToast('Data karyawan diperbarui', 'success')
      } else {
        await createEmployee(payload)
        showToast('Karyawan berhasil ditambahkan!', 'success')
      }
      resetEmpForm(); await loadEmployees()
    } catch (e) { showToast(e.message || 'Gagal menyimpan', 'error') }
    finally { setEmpSaving(false) }
  }

  const handleSettleKasbon = async (emp) => {
    if (!window.confirm(`Tandai gaji ${emp.name} sudah ditransfer? Semua kasbon aktifnya akan dilunasi dan tampilan dashboard-nya kembali kosong.`)) return
    try {
      const res = await settleKasbon(emp.id)
      showToast(`Gaji ditandai. ${res.settled_count || 0} kasbon dilunasi.`, 'success')
      setViewEmp(null)
    } catch (e) { showToast(e.message || 'Gagal melunasi kasbon', 'error') }
  }

  const handleDeleteEmployee = async (id) => {
    if (!window.confirm('Hapus karyawan ini?')) return
    try { await deleteEmployee(id); showToast('Karyawan dihapus', 'info'); await loadEmployees() }
    catch (e) { showToast(e.message || 'Gagal menghapus', 'error') }
  }

  const handleEditEmployee = (emp) => {
    setEmpForm({ name: emp.name, whatsapp: emp.whatsapp, pin: emp.pin || '', birthdate: emp.birthdate || '', birthplace: emp.birthplace || '', position: emp.position || '', status_crew: emp.status_crew || 'Tetap', monthly_salary: emp.monthly_salary || 0, monthly_salary_raw: formatRupiahInput(String(emp.monthly_salary || 0)), work_hours_per_day: emp.work_hours_per_day || 8, photo: emp.photo || '' })
    setEditEmp(emp); setEmpStep(1); setShowAddEmp(true)
  }

  const handleViewEmployee = async (emp) => {
    try {
      await loadCashflow() // Refresh advances data
      const fullEmp = await getEmployee(emp.id)
      setViewEmp({ ...emp, ...fullEmp })
    } catch (e) {
      showToast('Gagal memuat detail karyawan', 'error')
      setViewEmp(emp)
    }
  }

  const [showPin, setShowPin] = useState(false)

  // ─────────────────── STOCK CRUD ───────────────────
  const resetStockForm = () => {
    setStockForm({ name: '', quantity: '', unit: 'pcs', price: '', price_raw: '', usage_category: 'PRINT', notes: '' })
    setEditStock(null); setShowAddStock(false)
  }

  const handleSaveStock = async () => {
    if (!stockForm.name || !stockForm.quantity) { showToast('Lengkapi nama dan jumlah', 'error'); return }
    setStockSaving(true)
    const payload = {
      name: stockForm.name,
      quantity: parseFloat(stockForm.quantity),
      unit: stockForm.unit,
      price: parseRupiahInput(stockForm.price_raw) || parseFloat(stockForm.price) || 0,
      usage_category: stockForm.usage_category,
      notes: stockForm.notes || '',
    }
    try {
      if (editStock) { await updateStock(editStock.id, payload); showToast('Stok diperbarui', 'success') }
      else { await createStock(payload); showToast('Stok ditambahkan!', 'success') }
      resetStockForm(); await loadStocks()
    } catch (e) { showToast(e.message || 'Gagal menyimpan', 'error') }
    finally { setStockSaving(false) }
  }

  const handleDeleteStock = async (id) => {
    if (!window.confirm('Hapus stok ini?')) return
    try { await deleteStock(id); showToast('Stok dihapus', 'info'); await loadStocks() }
    catch (e) { showToast(e.message || 'Gagal menghapus', 'error') }
  }

  const handleViewStock = (stock) => {
    setViewStock(stock)
  }

  // ─────────────────── CASHFLOW CRUD ───────────────────
  const resetCfForm = () => {
    setCfForm({ type: 'income', amount: '', amount_raw: '', description: '', payment_method: 'cash', notes: '', employee_id: '' })
    setEditCf(null)
    setShowAddCf(false)
  }

  const handleSaveCashflow = async () => {
    if (!cfForm.amount || !cfForm.description) { showToast('Lengkapi jumlah dan deskripsi', 'error'); return }
    if (cfForm.type === 'salary' && !cfForm.employee_id) { showToast('Pilih karyawan untuk GAJI', 'error'); return }
    setCfSaving(true)
    try {
      const payload = { ...cfForm, amount: parseRupiahInput(cfForm.amount_raw) || parseFloat(cfForm.amount) || 0, handled_by: 'Admin' }
      if (editCf) {
        await updateCashflow(editCf.id, payload)
        showToast('Cashflow diperbarui!', 'success')
      } else {
        const isCash = payload.payment_method === 'cash' || payload.type === 'expense'
        await createCashflow({ ...payload, date: new Date().toISOString().split('T')[0] })
        if (isCash) openCashDrawerOnly()
        showToast('Cashflow disimpan!' + (isCash ? ' Laci terbuka.' : ''), 'success')
      }
      resetCfForm(); await loadCashflow()
    } catch (e) { showToast(e.message || 'Gagal menyimpan', 'error') }
    finally { setCfSaving(false) }
  }

  const handleEditCashflow = (item) => {
    setEditCf(item)
    setCfForm({ type: item.type, amount: String(item.amount), amount_raw: formatRupiahInput(String(item.amount)), description: item.description || '', payment_method: item.payment_method || 'cash', notes: item.notes || '', employee_id: item.employee_id || '' })
    setShowAddCf(true)
  }

  const handleDeleteCashflow = async (id) => {
    if (!window.confirm('Hapus transaksi ini?')) return
    try { await deleteCashflow(id); showToast('Dihapus', 'info'); await loadCashflow() }
    catch (e) { showToast(e.message || 'Gagal menghapus', 'error') }
  }

  const handleDeleteAdvance = async (id) => {
    if (!window.confirm('Hapus kasbon ini?')) return
    try { await deleteAdvance(id); showToast('Kasbon dihapus', 'info'); await loadCashflow() }
    catch (e) { showToast(e.message || 'Gagal menghapus', 'error') }
  }

  const handleViewCashflow = (cf) => {
    setViewCf(cf)
  }

  // Group transactions by employee
  const groupedEmployeeTransactions = (() => {
    const employeeMap = {}
    
    // Add print jobs
    empTxPrintJobs.forEach(job => {
      // Try multiple fields for employee name
      const empName = job.cashier || job.cashier_name || (employees.find(e => e.id === job.cashier_id)?.name) || 'Unknown'
      if (!employeeMap[empName]) {
        employeeMap[empName] = {
          name: empName,
          printJobs: [],
          cashflows: [],
          totalTransactions: 0,
          totalAmount: 0
        }
      }
      employeeMap[empName].printJobs.push({
        type: 'print',
        date: job.date,
        description: `Print: ${job.material} · ${job.customer_name || '-'}`,
        amount: job.total_price || 0,
        payment_method: job.payment_method || 'cash'
      })
      employeeMap[empName].totalTransactions += 1
      employeeMap[empName].totalAmount += (job.total_price || 0)
    })
    
    // Add cashflows (exclude Admin transactions)
    empTxCashflows.forEach(cf => {
      if (cf.handled_by === 'Admin') return
      // Try multiple fields for employee name
      const empName = cf.handled_by || (employees.find(e => e.id === cf.employee_id)?.name) || 'Unknown'
      if (!employeeMap[empName]) {
        employeeMap[empName] = {
          name: empName,
          printJobs: [],
          cashflows: [],
          totalTransactions: 0,
          totalAmount: 0
        }
      }
      employeeMap[empName].cashflows.push({
        type: cf.type,
        date: cf.date,
        description: cf.description || '-',
        amount: cf.amount || 0,
        payment_method: cf.payment_method || 'cash',
        notes: cf.notes
      })
      employeeMap[empName].totalTransactions += 1
      employeeMap[empName].totalAmount += (cf.type === 'income' ? (cf.amount || 0) : -(cf.amount || 0))
    })
    
    return Object.values(employeeMap).sort((a, b) => a.name.localeCompare(b.name))
  })()

  const loadEmployeeTransactions = async () => {
    setEmpTxLoading(true)
    try {
      const [pj, cf] = await Promise.all([
        getPrintJobs(empTxSearchMonth ? `?month=${empTxSearchMonth}` : ''),
        getCashflow(empTxSearchMonth ? `?month=${empTxSearchMonth}` : ''),
      ])
      setEmpTxPrintJobs(Array.isArray(pj) ? pj : [])
      setEmpTxCashflows(Array.isArray(cf) ? cf : [])
      
      // Debug: Log semua print jobs (sorted by created_at)
      const sortedPj = Array.isArray(pj) ? [...pj].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')) : []
      console.log('Total Print Jobs:', sortedPj.length)
      console.log('Print Jobs terbaru (3):', JSON.stringify(sortedPj.slice(0, 3).map(j => ({ id: j.id, cashier: j.cashier, cashier_id: j.cashier_id, created_at: j.created_at })), null, 2))
    } catch { showToast('Gagal memuat transaksi karyawan', 'error') }
    finally { setEmpTxLoading(false) }
  }

  // Laci kasir
  const handleTaruhModal = () => {
    const amount = prompt('Jumlah modal yang ditaruh (Rp):')
    const ket = prompt('Keterangan:')
    if (!amount || !ket) return
    createCashflow({ type: 'modal_masuk', amount: parseFloat(amount), description: ket, payment_method: 'cash', date: new Date().toISOString().split('T')[0], handled_by: 'Admin' })
      .then(() => { openCashDrawerOnly(); showToast('Modal dicatat. Laci terbuka.', 'success'); loadCashflow() })
      .catch(e => showToast(e.message, 'error'))
  }

  const handleAmbilKas = () => {
    const amount = prompt('Jumlah kas yang diambil (Rp):')
    const ket = prompt('Keterangan:')
    if (!amount || !ket) return
    createCashflow({ type: 'kas_keluar', amount: parseFloat(amount), description: ket, payment_method: 'cash', date: new Date().toISOString().split('T')[0], handled_by: 'Admin' })
      .then(() => { openCashDrawerOnly(); showToast('Kas tercatat. Laci terbuka.', 'success'); loadCashflow() })
      .catch(e => showToast(e.message, 'error'))
  }

  // Kalkulasi saldo laci (semua transaksi cash dari semua sumber)
  const saldoLaci = (() => {
    let balance = 0
    
    // Manual cashflow
    cashflows.forEach(c => {
      if (['income', 'modal_masuk'].includes(c.type) && c.payment_method === 'cash') {
        balance += (c.amount || 0)
      }
      if (['expense', 'kas_keluar'].includes(c.type)) {
        balance -= (c.amount || 0)
      }
    })
    
    // Print Jobs (cash only)
    cfPrintJobs.forEach(j => {
      if (j.payment_method === 'cash') {
        balance += (j.total_price || 0)
      }
    })
    
    // Projects (cash only)
    cfProjects.forEach(p => {
      if (p.payment_method === 'cash') {
        balance += (p.selling_price || p.total_project_value || 0)
      }
    })
    
    // Jobs (cash only)
    cfJobs.forEach(j => {
      if (j.payment_method === 'cash') {
        balance += (j.total_price || 0)
      }
    })
    
    // Kasbon (always cash)
    advances.forEach(a => {
      balance -= (a.amount || 0)
    })
    
    return balance
  })()

  // Kalkulasi metrik cashflow baru
  const omzet = cfSummary?.total_income || 0
  const pengeluaran = cfSummary?.total_expense || 0
  const totalGajiBulanan = employees.reduce((sum, emp) => sum + (emp.monthly_salary || 0), 0)
  const totalKasbon = advances.reduce((sum, a) => sum + (a.amount || 0), 0)
  const totalGajiDibayar = cashflows.filter(c => c.type === 'salary' || c.description?.toUpperCase().includes('GAJI')).reduce((sum, c) => sum + (c.amount || 0), 0)
  const labaKotor = omzet - pengeluaran
  const labaBersih = labaKotor - totalKasbon

  // Margin per division
  const printOmzet = cfSummary?.print_job_total || 0
  const projectOmzet = cfSummary?.project_total || 0
  const manualOmzet = cfSummary?.manual_income || 0
  const totalOmzet = printOmzet + projectOmzet + manualOmzet
  const printMargin = totalOmzet > 0 ? (printOmzet / totalOmzet * 100).toFixed(1) : 0
  const projectMargin = totalOmzet > 0 ? (projectOmzet / totalOmzet * 100).toFixed(1) : 0
  const manualMargin = totalOmzet > 0 ? (manualOmzet / totalOmzet * 100).toFixed(1) : 0

  // Data grafik omzet 12 bulan terakhir
  const monthsData = Array.from({ length: 12 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (11 - i))
    const monthKey = d.toISOString().slice(0, 7)
    const monthJobs = [...cfPrintJobs, ...cfProjects, ...cfJobs].filter(j => (j.date || '').startsWith(monthKey))
    const monthOmzet = monthJobs.reduce((sum, j) => sum + (j.total_price || j.selling_price || j.total_project_value || 0), 0)
    return {
      month: d.toLocaleDateString('id-ID', { month: 'short' }),
      omzet: monthOmzet
    }
  })
  const maxOmzet = Math.max(...monthsData.map(m => m.omzet), 1)

  const filteredEmp = employees.filter(e => e.name?.toLowerCase().includes(empSearch.toLowerCase()) || e.position?.toLowerCase().includes(empSearch.toLowerCase()) || e.whatsapp?.includes(empSearch))

  // Gabung semua transaksi dari semua sumber
  const allCfTransactions = [
    ...cashflows.map(c => ({ ...c, _source: ['income','modal_masuk'].includes(c.type) ? 'manual-income' : 'manual-expense', category: ['income','modal_masuk'].includes(c.type) ? 'income' : 'expense' })),
    ...cfPrintJobs.map(j => ({ id: j.id, date: j.date, description: `Print: ${j.material} · ${j.customer_name || '-'}`, amount: j.total_price || 0, payment_method: j.payment_method || 'cash', category: 'income', _source: 'print', handled_by: '' })),
    ...cfProjects.map(p => ({ id: p.id, date: p.date, description: `Project: ${p.project_name} · ${p.customer_name || '-'}`, amount: p.selling_price || p.total_project_value || 0, payment_method: p.payment_method || 'cash', category: 'income', _source: 'project', handled_by: '' })),
    ...cfJobs.map(j => ({ id: j.id, date: j.date, description: `Job: ${j.job_name} · ${j.customer_name || '-'}`, amount: j.total_price || 0, payment_method: j.payment_method || 'cash', category: 'income', _source: 'job', handled_by: '' })),
    ...advances.map(a => ({ id: a.id, date: a.date || a.created_at?.slice(0,10), description: `Kasbon: ${a.employee_name || a.employee_id}`, amount: a.amount || 0, payment_method: 'cash', category: 'expense', _source: 'kasbon', handled_by: 'Admin' })),
  ]

  const cfFiltered = allCfTransactions.filter(i => {
    if (cfTab === 'semua') return true
    if (cfTab === 'print') return i._source === 'print'
    if (cfTab === 'project') return i._source === 'project'
    if (cfTab === 'job') return i._source === 'job'
    if (cfTab === 'manual') return i._source === 'manual-income' || i._source === 'manual-expense'
    if (cfTab === 'gaji') return i.type === 'salary' || (i.description?.toUpperCase().includes('GAJI'))
    if (cfTab === 'keluar') return i.category === 'expense'
    return true
  })

  const cfGrouped = cfFiltered.reduce((acc, c) => {
    const key = (c.date || '').slice(0, 7) || 'unknown'
    if (!acc[key]) acc[key] = []
    acc[key].push(c)
    return acc
  }, {})

  // ─────────────────── RENDER ───────────────────
  if (!authed) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <div className="flex items-center gap-3 px-4 pt-12 pb-5"
          style={{ background: 'linear-gradient(160deg, #7c3aed 0%, #6d28d9 100%)', borderBottomLeftRadius: '1.5rem', borderBottomRightRadius: '1.5rem' }}>
          <button onClick={() => navigate('/home')} className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="text-white text-lg font-bold">Masuk Admin</h1>
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl shadow-lg p-7 w-full max-w-sm">
            <div className="flex items-center justify-center gap-1 mb-6">
              <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center mx-auto">
                <svg className="w-7 h-7 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>

            <div className="flex gap-2 mb-5">
              {[['pin', 'PIN'], ['password', 'Password']].map(([m, label]) => (
                <button key={m} onClick={() => { setAuthMode(m); setAuthError('') }}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${authMode === m ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {label}
                </button>
              ))}
            </div>

            {authMode === 'pin' ? (
              <div>
                <div className="flex justify-center gap-3 mb-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className={`w-3.5 h-3.5 rounded-full transition-all ${i < pinInput.length ? 'bg-purple-600 scale-110' : 'bg-gray-300'}`} />
                  ))}
                </div>
                {authError && <p className="text-red-500 text-center text-sm mb-3">{authError}</p>}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((d, i) => {
                    if (d === '') return <div key={i} />
                    const isBack = d === '⌫'
                    return (
                      <button key={i} onClick={() => isBack ? setPinInput(p => p.slice(0,-1)) : pinInput.length < 6 && setPinInput(p => p+d)}
                        className={`h-12 rounded-2xl text-xl font-semibold active:scale-95 ${isBack ? 'bg-gray-100 text-gray-600' : 'bg-gray-50 text-gray-800 hover:bg-purple-50 hover:text-purple-600'}`}>
                        {d}
                      </button>
                    )
                  })}
                </div>
                <button onClick={handlePinAuth} disabled={pinInput.length === 0 || authLoading}
                  className="w-full py-3.5 rounded-2xl bg-purple-600 text-white font-bold hover:bg-purple-700 disabled:opacity-40">
                  {authLoading ? 'Verifikasi...' : 'Masuk dengan PIN'}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {authError && <p className="text-red-500 text-center text-sm">{authError}</p>}
                <input type="text" value={passInput.username} onChange={e => setPassInput(p => ({ ...p, username: e.target.value }))} placeholder="Username"
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-300" />
                <input type="password" value={passInput.password} onChange={e => setPassInput(p => ({ ...p, password: e.target.value }))} placeholder="Password"
                  onKeyDown={e => e.key === 'Enter' && handlePassAuth()}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-300" />
                <button onClick={handlePassAuth} disabled={authLoading}
                  className="w-full py-3.5 rounded-2xl bg-purple-600 text-white font-bold hover:bg-purple-700 disabled:opacity-40">
                  {authLoading ? 'Masuk...' : 'Masuk dengan Password'}
                </button>
              </div>
            )}
          </div>
        </div>
        {toast && <Toast key={toast.id} message={toast.message} type={toast.type} onClose={clearToast} />}
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-4"
        style={{ background: 'linear-gradient(160deg, #7c3aed 0%, #6d28d9 100%)', borderBottomLeftRadius: '1.5rem', borderBottomRightRadius: '1.5rem' }}>
        <button onClick={() => navigate('/home')} className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="flex-1">
          <h1 className="text-white text-lg font-bold">Dashboard Admin</h1>
          <p className="text-white/70 text-xs">Labalaba Advertising</p>
        </div>
        <button onClick={() => setAuthed(false)} className="px-3 py-1.5 rounded-xl bg-white/20 text-white text-xs font-medium">Logout</button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 px-4 py-3">
        {[[TAB.CREW, 'Crew'], [TAB.STOCK, 'Stok'], [TAB.CASHFLOW, 'Cashflow'], [TAB.EMPLOYEE_TX, 'Transaksi Karyawan'], [TAB.SETTINGS, 'Pengaturan']].map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${tab === t ? 'bg-purple-600 text-white shadow' : 'bg-white text-gray-500 border border-gray-100'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── TAB: CREW ── */}
      {tab === TAB.CREW && (
        <div className="flex-1 flex flex-col md:flex-row gap-4 p-4">
          {/* Left Panel - Controls & Stats */}
          <div className="w-full md:w-1/2 flex flex-col gap-4">
            <div className="bg-purple-500 rounded-2xl p-4 text-white shadow">
              <p className="text-xs opacity-80">Total Crew</p>
              <p className="text-3xl font-bold mt-1">{employees.length}</p>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div className="bg-white/20 rounded-xl p-2.5">
                  <p className="text-xs opacity-80">Tetap</p>
                  <p className="text-xl font-bold">{employees.filter(e => e.status_crew === 'Tetap').length}</p>
                </div>
                <div className="bg-white/20 rounded-xl p-2.5">
                  <p className="text-xs opacity-80">Freelancer</p>
                  <p className="text-xl font-bold">{employees.filter(e => e.status_crew === 'Freelancer').length}</p>
                </div>
              </div>
            </div>
            
            <input type="text" value={empSearch} onChange={e => setEmpSearch(e.target.value)} placeholder="Cari nama, posisi, atau WhatsApp..."
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-300 text-sm" />
            
            <button onClick={() => { resetEmpForm(); setShowAddEmp(true) }}
              className="w-full py-3.5 rounded-2xl bg-purple-600 text-white font-semibold flex items-center justify-center gap-2 shadow hover:bg-purple-700 active:scale-95 transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Tambah Anggota
            </button>
          </div>

          {/* Right Panel - List */}
          <div className="w-full md:w-1/2 flex flex-col">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex-1 overflow-y-auto">
              <h2 className="text-gray-800 font-bold text-lg mb-4">Daftar Crew</h2>
              {empLoading ? (
                <div className="flex justify-center py-8"><svg className="w-7 h-7 animate-spin text-purple-600" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg></div>
              ) : filteredEmp.length === 0 ? (
                <p className="text-center text-gray-400 py-16">Belum ada data crew.</p>
              ) : (
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {filteredEmp.map(emp => (
                    <div key={emp.id} className="bg-gray-50 rounded-xl p-4 flex items-center gap-3 border border-gray-100">
                      <div className="w-11 h-11 rounded-full bg-purple-100 flex items-center justify-center shrink-0 cursor-pointer overflow-hidden" onClick={() => handleViewEmployee(emp)}>
                        {emp.photo ? (
                          <img src={emp.photo} alt={emp.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-purple-600 font-bold text-sm">{(emp.name || '?')[0].toUpperCase()}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleViewEmployee(emp)}>
                        <p className="font-semibold text-gray-800 text-sm truncate">{emp.name}</p>
                        <p className="text-xs text-gray-400">{emp.position} · {emp.whatsapp}</p>
                        <p className="text-xs text-gray-400">{emp.status_crew || '-'}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => handleEditEmployee(emp)} className="w-8 h-8 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center hover:bg-blue-100">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => handleDeleteEmployee(emp.id)} className="w-8 h-8 rounded-xl bg-red-50 text-red-400 flex items-center justify-center hover:bg-red-100">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: STOCK ── */}
      {tab === TAB.STOCK && (
        <div className="flex-1 flex flex-col md:flex-row gap-4 p-4">
          {/* Left Panel - Controls & Stats */}
          <div className="w-full md:w-1/2 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-purple-500 rounded-2xl p-4 text-white shadow">
                <p className="text-xs opacity-80">Total Item</p>
                <p className="text-2xl font-bold mt-0.5">{stocks.length}</p>
              </div>
              <div className="bg-orange-500 rounded-2xl p-4 text-white shadow">
                <p className="text-xs opacity-80">Stok Menipis</p>
                <p className="text-2xl font-bold mt-0.5">{stocks.filter(s => s.quantity <= 5).length}</p>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <p className="text-sm font-semibold text-gray-600 mb-3">Ringkasan</p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Kategori PRINT</span>
                  <span className="font-semibold text-gray-800">{stocks.filter(s => s.usage_category === 'PRINT').length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Kategori UMUM</span>
                  <span className="font-semibold text-gray-800">{stocks.filter(s => s.usage_category === 'UMUM').length}</span>
                </div>
              </div>
            </div>
            
            <button onClick={() => { resetStockForm(); setShowAddStock(true) }}
              className="w-full py-3.5 rounded-2xl bg-teal-500 text-white font-semibold flex items-center justify-center gap-2 shadow hover:bg-teal-600 active:scale-95 transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Tambah Barang
            </button>
          </div>

          {/* Right Panel - List */}
          <div className="w-full md:w-1/2 flex flex-col">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex-1 overflow-y-auto">
              <h2 className="text-gray-800 font-bold text-lg mb-4">Daftar Stock</h2>
              {stockLoading ? (
                <div className="flex justify-center py-8"><svg className="w-7 h-7 animate-spin text-teal-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg></div>
              ) : stocks.length === 0 ? (
                <p className="text-center text-gray-400 py-16">Belum ada data stock.</p>
              ) : (
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {stocks.map(s => (
                    <div key={s.id} onClick={() => handleViewStock(s)} className="bg-gray-50 rounded-xl px-4 py-3 flex items-center gap-3 border border-gray-100 cursor-pointer hover:bg-gray-100 transition-all">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-800 text-sm truncate">{s.name}</p>
                          {s.quantity <= 5 && <span className="text-xs px-1.5 py-0.5 rounded bg-orange-100 text-orange-600 font-medium">Low</span>}
                        </div>
                        <p className="text-xs text-gray-400">{s.quantity} {s.unit} · {s.price ? formatRupiah(s.price) + '/unit' : '-'} · <span className={s.usage_category === 'PRINT' ? 'text-orange-500 font-medium' : 'text-blue-500 font-medium'}>{s.usage_category || 'UMUM'}</span></p>
                      </div>
                      <div className="flex gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                        <button onClick={() => { setEditStock(s); setStockForm({ name: s.name, quantity: s.quantity, unit: s.unit, price: s.price || '', price_raw: formatRupiahInput(String(s.price || '')), usage_category: s.usage_category || 'PRINT', notes: s.notes || '' }); setShowAddStock(true) }}
                          className="w-8 h-8 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => handleDeleteStock(s.id)} className="w-8 h-8 rounded-xl bg-red-50 text-red-400 flex items-center justify-center">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: CASHFLOW ── */}
      {tab === TAB.CASHFLOW && (
        <div className="flex-1 flex flex-col md:flex-row gap-4 p-4">
          {/* Left Panel - Controls & Stats */}
          <div className="w-full md:w-1/2 flex flex-col gap-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-green-500 rounded-2xl p-3 text-white shadow">
                <p className="text-xs opacity-80">OMZET</p>
                <p className="text-sm font-bold mt-0.5">{formatRupiah(omzet)}</p>
              </div>
              <div className="bg-red-500 rounded-2xl p-3 text-white shadow">
                <p className="text-xs opacity-80">PENGELUARAN</p>
                <p className="text-sm font-bold mt-0.5">{formatRupiah(pengeluaran)}</p>
              </div>
              <div className="bg-orange-500 rounded-2xl p-3 text-white shadow">
                <p className="text-xs opacity-80">KASBON</p>
                <p className="text-sm font-bold mt-0.5">{formatRupiah(totalKasbon)}</p>
              </div>
              <div className="bg-blue-500 rounded-2xl p-3 text-white shadow">
                <p className="text-xs opacity-80">LABA KOTOR</p>
                <p className="text-sm font-bold mt-0.5">{formatRupiah(labaKotor)}</p>
              </div>
              <div className="bg-purple-500 rounded-2xl p-3 text-white shadow col-span-2">
                <p className="text-xs opacity-80">LABA BERSIH</p>
                <p className="text-lg font-bold mt-0.5">{formatRupiah(labaBersih)}</p>
              </div>
            </div>

            {/* GAJI Breakdown */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <p className="text-sm font-semibold text-gray-600 mb-3">Detail Gaji</p>
              <div className="space-y-2">
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-xs text-gray-500">Total Gaji Bulanan (Ref)</span>
                  <span className="text-sm font-semibold text-gray-800">{formatRupiah(totalGajiBulanan)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-xs text-gray-500">Total Kasbon (Belum Lunas)</span>
                  <span className="text-sm font-semibold text-orange-600">{formatRupiah(totalKasbon)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-xs text-gray-500">Gaji Sudah Dibayar</span>
                  <span className="text-sm font-semibold text-green-600">{formatRupiah(totalGajiDibayar)}</span>
                </div>
                <div className="flex justify-between items-center py-2 bg-purple-50 px-2 rounded-xl">
                  <span className="text-xs font-bold text-purple-700">Sisa Gaji Harus Bayar</span>
                  <span className="text-sm font-bold text-purple-800">{formatRupiah(totalGajiBulanan - totalGajiDibayar)}</span>
                </div>
              </div>
            </div>

            {/* Physical Cash Balance */}
            <div className="bg-primary rounded-2xl p-4 text-white shadow">
              <p className="text-xs opacity-80">Uang Fisik Laci Kas (Audit)</p>
              <p className="text-2xl font-bold mt-0.5">{formatRupiah(saldoLaci)}</p>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <button onClick={handleTaruhModal} className="py-2.5 rounded-xl bg-green-500 text-white font-semibold text-sm hover:bg-green-600 active:scale-95 transition-all">
                  + Taruh Modal
                </button>
                <button onClick={handleAmbilKas} className="py-2.5 rounded-xl bg-red-500 text-white font-semibold text-sm hover:bg-red-600 active:scale-95 transition-all">
                  - Ambil Kas
                </button>
              </div>
            </div>

            {/* Margin per Division */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <p className="text-sm font-semibold text-gray-600 mb-3">Margin per Divisi</p>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Print Job</span>
                    <span className="font-semibold text-gray-800">{printMargin}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500 rounded-full" style={{ width: `${printMargin}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Project</span>
                    <span className="font-semibold text-gray-800">{projectMargin}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${projectMargin}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Manual</span>
                    <span className="font-semibold text-gray-800">{manualMargin}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${manualMargin}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* 12-Month Omzet Chart */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <p className="text-sm font-semibold text-gray-600 mb-3">Grafik Omzet 12 Bulan</p>
              <div className="flex items-end justify-between gap-1 h-32">
                {monthsData.map((m, i) => (
                  <div key={i} className="flex flex-col items-center flex-1">
                    <div 
                      className="w-full bg-gradient-to-t from-purple-600 to-purple-400 rounded-t-sm transition-all hover:from-purple-700 hover:to-purple-500"
                      style={{ height: `${(m.omzet / maxOmzet) * 100}%`, minHeight: m.omzet > 0 ? '4px' : '0' }}
                      title={`${m.month}: ${formatRupiah(m.omzet)}`}
                    />
                    <span className="text-[9px] text-gray-500 mt-1">{m.month}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Search + Add */}
            <div className="flex gap-2">
              <input type="month" value={cfSearch} onChange={e => setCfSearch(e.target.value)}
                className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
              {cfSearch && <button onClick={() => setCfSearch('')} className="px-3 py-2.5 rounded-xl bg-gray-100 text-gray-500 text-sm">Reset</button>}
            </div>
            
            <button onClick={() => setShowAddCf(true)}
              className="w-full py-3.5 rounded-2xl bg-teal-500 text-white font-semibold flex items-center justify-center gap-2 shadow hover:bg-teal-600 active:scale-95 transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Tambah Cashflow
            </button>
          </div>

          {/* Right Panel - List */}
          <div className="w-full md:w-1/2 flex flex-col">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex-1 overflow-y-auto">
              {/* Filter Tabs */}
              <div className="flex bg-gray-100 rounded-2xl p-1 gap-1 mb-4">
                {[['semua','Semua'],['print','Print'],['project','Project'],['job','Job'],['manual','Manual'],['gaji','Gaji'],['keluar','Keluar']].map(([val, label]) => (
                  <button key={val} onClick={() => setCfTab(val)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${cfTab === val ? 'bg-white text-purple-600 shadow' : 'text-gray-500'}`}>
                    {label}
                  </button>
                ))}
              </div>

              <h2 className="text-gray-800 font-bold text-lg mb-4">Daftar Transaksi</h2>
              {cfLoading ? (
                <div className="flex justify-center py-8"><svg className="w-7 h-7 animate-spin text-purple-600" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg></div>
              ) : Object.entries(cfGrouped).length === 0 ? (
                <p className="text-center text-gray-400 py-16">Belum ada transaksi.</p>
              ) : (
                <div className="space-y-4 max-h-[50vh] overflow-y-auto">
                  {Object.entries(cfGrouped).sort((a, b) => b[0].localeCompare(a[0])).map(([month, items]) => (
                    <div key={month}>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                        {new Date(month + '-01').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                      </p>
                      <div className="space-y-2">
                        {items.sort((a,b)=>(b.date||'').localeCompare(a.date||'')).map(item => {
                          const isIncome = item.category === 'income'
                          const isManual = item._source === 'manual-income' || item._source === 'manual-expense'
                          const srcColor = {'print':'bg-orange-100 text-orange-600','project':'bg-purple-100 text-purple-600','kasbon':'bg-yellow-100 text-yellow-700','manual-income':'bg-green-100 text-green-600','manual-expense':'bg-red-100 text-red-600'}[item._source]||'bg-gray-100 text-gray-500'
                          const srcLabel = {'print':'Print','project':'Project','kasbon':'Kasbon','manual-income':'Manual','manual-expense':'Manual'}[item._source]||''
                          return (
                          <div key={`${item._source}-${item.id}`} onClick={() => handleViewCashflow(item)} className="bg-gray-50 rounded-xl px-3 py-2.5 flex items-center gap-2.5 border border-gray-100 cursor-pointer hover:bg-gray-100 transition-all">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${isIncome ? 'bg-green-100' : 'bg-red-100'}`}>
                              <svg className={`w-3.5 h-3.5 ${isIncome ? 'text-green-500' : 'text-red-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isIncome ? 'M5 10l7-7m0 0l7 7m-7-7v18' : 'M19 14l-7 7m0 0l-7-7m7 7V3'} />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1 mb-0.5">
                                <p className="font-semibold text-gray-800 text-xs truncate">{item.description}</p>
                                <span className={`text-[9px] px-1 py-0.5 rounded font-semibold shrink-0 ${srcColor}`}>{srcLabel}</span>
                              </div>
                              <p className="text-[10px] text-gray-400">{formatDate(item.date)} · {item.payment_method === 'cash' ? 'Cash' : 'Transfer'} · Oleh: {item.handled_by || item.cashier || '-'}{item.employee_id ? ` · ${employees.find(e => e.id === item.employee_id)?.name || '-'}` : ''}</p>
                            </div>
                            <p className={`font-bold text-xs shrink-0 ${isIncome ? 'text-green-600' : 'text-red-500'}`}>
                              {isIncome ? '+' : '-'}{formatRupiah(item.amount)}
                            </p>
                            {(isManual || item._source === 'kasbon') && (
                              <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                                {isManual && (
                                  <button onClick={() => handleEditCashflow(item)} className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center hover:bg-blue-100 active:scale-95 transition-all">
                                    <svg className="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                  </button>
                                )}
                                <button
                                  onClick={() => isManual ? handleDeleteCashflow(item.id) : handleDeleteAdvance(item.id)}
                                  className="w-6 h-6 rounded-lg bg-red-50 flex items-center justify-center hover:bg-red-100 active:scale-95 transition-all">
                                  <svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              </div>
                            )}
                          </div>
                        )})}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: EMPLOYEE TRANSACTIONS ── */}
      {tab === TAB.EMPLOYEE_TX && (
        <div className="flex-1 flex flex-col md:flex-row gap-4 p-4">
          {/* Left Panel - Controls & Stats */}
          <div className="w-full md:w-1/2 flex flex-col gap-4">
            <div className="bg-indigo-500 rounded-2xl p-4 text-white shadow">
              <p className="text-xs opacity-80">Transaksi Karyawan</p>
              <p className="text-2xl font-bold mt-1">Activity Log</p>
              <p className="text-xs opacity-70 mt-2">Tracking aktivitas karyawan & laci</p>
            </div>
            
            <input type="month" value={empTxSearchMonth} onChange={e => setEmpTxSearchMonth(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-300 text-sm" />
            {empTxSearchMonth && (
              <button onClick={() => setEmpTxSearchMonth('')} className="px-3 py-2 rounded-xl bg-gray-100 text-gray-500 text-sm">Reset Filter</button>
            )}
          </div>

          {/* Right Panel - Employee List */}
          <div className="w-full md:w-1/2 flex flex-col">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex-1 overflow-y-auto">
              <h2 className="text-gray-800 font-bold text-lg mb-4">Daftar Karyawan</h2>
              {empTxLoading ? (
                <div className="flex justify-center py-8"><svg className="w-7 h-7 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg></div>
              ) : groupedEmployeeTransactions.length === 0 ? (
                <p className="text-center text-gray-400 py-16">Belum ada transaksi karyawan.</p>
              ) : (
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {groupedEmployeeTransactions.map(emp => (
                    <div key={emp.name} onClick={() => setSelectedEmployee(emp)} className="bg-gray-50 rounded-xl p-4 cursor-pointer hover:bg-gray-100 transition-all border border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                          <span className="text-indigo-600 font-bold text-sm">{(emp.name || '?')[0].toUpperCase()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800 text-sm truncate">{emp.name}</p>
                          <p className="text-xs text-gray-400">{emp.totalTransactions} transaksi</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`font-bold text-sm ${emp.totalAmount >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {formatRupiah(emp.totalAmount)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: SETTINGS ── */}
      {tab === TAB.SETTINGS && (
        <div className="flex-1 flex flex-col md:flex-row gap-4 p-4">
          {/* Left Panel - Info */}
          <div className="w-full md:w-1/2 flex flex-col gap-4">
            <div className="bg-purple-500 rounded-2xl p-4 text-white shadow">
              <p className="text-xs opacity-80">Admin Settings</p>
              <p className="text-2xl font-bold mt-1">Pengaturan</p>
              <p className="text-xs opacity-70 mt-2">Kelola keamanan akun admin</p>
            </div>
            
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <p className="text-sm font-semibold text-gray-600 mb-3">Info</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Status</span>
                  <span className="font-semibold text-green-600">Aktif</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Metode Login</span>
                  <span className="font-semibold text-gray-800">PIN / Password</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Forms */}
          <div className="w-full md:w-1/2 flex flex-col gap-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <p className="font-bold text-gray-800 mb-4">Ganti PIN Admin</p>
              <div className="space-y-3">
                <input type="password" inputMode="numeric" maxLength={6} value={oldPin} onChange={e => setOldPin(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="PIN lama"
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-300 text-center tracking-widest text-xl" />
                <input type="password" inputMode="numeric" maxLength={6} value={newPinA} onChange={e => setNewPinA(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="PIN baru"
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-300 text-center tracking-widest text-xl" />
                <input type="password" inputMode="numeric" maxLength={6} value={newPinB} onChange={e => setNewPinB(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="Konfirmasi PIN baru"
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-300 text-center tracking-widest text-xl" />
                <button onClick={async () => {
                  if (newPinA !== newPinB) { showToast('PIN baru tidak cocok', 'error'); return }
                  if (newPinA.length < 6) { showToast('PIN minimal 6 digit', 'error'); return }
                  setPinChanging(true)
                  try { await changeAdminPin(oldPin, newPinA); showToast('PIN berhasil diubah!', 'success'); setOldPin(''); setNewPinA(''); setNewPinB('') }
                  catch (e) { showToast(e.message || 'Gagal ganti PIN', 'error') }
                  finally { setPinChanging(false) }
                }} disabled={pinChanging || !oldPin || !newPinA || !newPinB}
                  className="w-full py-3.5 rounded-2xl bg-purple-600 text-white font-bold hover:bg-purple-700 disabled:opacity-40">
                  {pinChanging ? 'Menyimpan...' : 'Simpan PIN Baru'}
                </button>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <p className="font-bold text-gray-800 mb-3">Setup PIN (Pertama Kali)</p>
              <p className="text-xs text-gray-500 mb-3">Jika belum pernah set PIN, gunakan tombol ini.</p>
              <button onClick={async () => {
                const pin = prompt('Masukkan PIN baru (6 digit):')
                if (!pin || pin.length < 6) return
                try { await setupAdminPin(pin); showToast('PIN berhasil dibuat!', 'success') }
                catch (e) { showToast(e.message, 'error') }
              }} className="w-full py-3 rounded-2xl border border-purple-300 text-purple-600 font-semibold hover:bg-purple-50">
                Setup PIN Admin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Detail Karyawan ── */}
      {viewEmp && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={() => setViewEmp(null)}>
          <div className="bg-white w-full max-w-md rounded-t-3xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-800">Detail Karyawan</h2>
              <button onClick={() => setViewEmp(null)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">✕</button>
            </div>
            <div className="flex items-center gap-4 mb-5">
              <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center shrink-0 overflow-hidden">
                {viewEmp.photo ? (
                  <img src={viewEmp.photo} alt={viewEmp.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-purple-600 font-bold text-2xl">{(viewEmp.name || '?')[0].toUpperCase()}</span>
                )}
              </div>
              <div>
                <p className="text-xl font-bold text-gray-800">{viewEmp.name}</p>
                <p className="text-sm text-gray-500">{viewEmp.position || '-'}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${viewEmp.status_crew === 'Tetap' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>{viewEmp.status_crew || '-'}</span>
              </div>
            </div>
            <div className="space-y-2.5">
              {[
                ['WhatsApp', viewEmp.whatsapp || '-'],
                ['Tanggal Lahir', viewEmp.birthdate || '-'],
                ['Tempat Lahir', viewEmp.birthplace || '-'],
                ['Gaji Bulanan', viewEmp.monthly_salary ? formatRupiah(viewEmp.monthly_salary) : '-'],
                ['Jam Kerja/Hari', viewEmp.work_hours_per_day ? `${viewEmp.work_hours_per_day} jam` : '-'],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-xs text-gray-400 font-medium">{label}</span>
                  <span className="text-sm text-gray-700 font-semibold">{val}</span>
                </div>
              ))}
            </div>
            {/* Salary Breakdown */}
            <div className="bg-purple-50 rounded-2xl p-4 mt-4 border border-purple-100">
              <p className="text-sm font-semibold text-purple-700 mb-3">Detail Gaji Bulan Ini</p>
              <div className="space-y-2">
                <div className="flex justify-between items-center py-1">
                  <span className="text-xs text-purple-600">Gaji Bulanan</span>
                  <span className="text-sm font-semibold text-purple-800">{formatRupiah(viewEmp.monthly_salary || 0)}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-xs text-purple-600">Kasbon</span>
                  <span className="text-sm font-semibold text-orange-600">{formatRupiah(advances.filter(a => a.employee_id === viewEmp.id).reduce((sum, a) => sum + (a.amount || 0), 0))}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-xs text-purple-600">Sudah Dibayar</span>
                  <span className="text-sm font-semibold text-green-600">{formatRupiah(cashflows.filter(c => (c.type === 'salary' || c.description?.toUpperCase().includes('GAJI')) && c.employee_id === viewEmp.id).reduce((sum, c) => sum + (c.amount || 0), 0))}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-t border-purple-200 mt-2">
                  <span className="text-xs font-bold text-purple-700">Sisa Gaji</span>
                  <span className="text-lg font-bold text-purple-800">{formatRupiah((viewEmp.monthly_salary || 0) - advances.filter(a => a.employee_id === viewEmp.id).reduce((sum, a) => sum + (a.amount || 0), 0) - cashflows.filter(c => (c.type === 'salary' || c.description?.toUpperCase().includes('GAJI')) && c.employee_id === viewEmp.id).reduce((sum, c) => sum + (c.amount || 0), 0))}</span>
                </div>
              </div>
            </div>
            <button onClick={() => handleSettleKasbon(viewEmp)}
              className="w-full mt-4 py-3 rounded-2xl bg-amber-500 text-white font-semibold text-sm hover:bg-amber-600 active:scale-95 flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              Tandai Gaji Ditransfer (Reset Kasbon)
            </button>
            <div className="flex gap-2 mt-3">
              <button onClick={() => { setViewEmp(null); handleEditEmployee(viewEmp) }}
                className="flex-1 py-3 rounded-2xl bg-blue-500 text-white font-semibold text-sm hover:bg-blue-600 active:scale-95">
                Edit Data
              </button>
              <button onClick={() => { setViewEmp(null); handleDeleteEmployee(viewEmp.id) }}
                className="w-12 py-3 rounded-2xl bg-red-50 text-red-400 flex items-center justify-center hover:bg-red-100 active:scale-95">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Detail Stock ── */}
      {viewStock && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={() => setViewStock(null)}>
          <div className="bg-white w-full max-w-md rounded-t-3xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-800">Detail Stock</h2>
              <button onClick={() => setViewStock(null)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">✕</button>
            </div>
            <div className="space-y-3">
              <div className="bg-teal-50 rounded-xl p-4">
                <p className="text-xl font-bold text-teal-800">{viewStock.name}</p>
                <p className="text-sm text-teal-600 mt-1">{viewStock.notes || 'Tidak ada catatan'}</p>
              </div>
              {[
                ['Jumlah', `${viewStock.quantity} ${viewStock.unit}`],
                ['Harga/Unit', viewStock.price ? formatRupiah(viewStock.price) : '-'],
                ['Kategori', viewStock.usage_category || 'UMUM'],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-sm text-gray-500">{label}</span>
                  <span className="text-sm font-semibold text-gray-800">{val}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setViewStock(null); setEditStock(viewStock); setStockForm({ name: viewStock.name, quantity: viewStock.quantity, unit: viewStock.unit, price: viewStock.price || '', price_raw: formatRupiahInput(String(viewStock.price || '')), usage_category: viewStock.usage_category || 'PRINT', notes: viewStock.notes || '' }); setShowAddStock(true) }}
                className="flex-1 py-3 rounded-2xl bg-blue-500 text-white font-semibold text-sm hover:bg-blue-600 active:scale-95">
                Edit Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Detail Cashflow ── */}
      {viewCf && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={() => setViewCf(null)}>
          <div className="bg-white w-full max-w-md rounded-t-3xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-800">Detail Transaksi</h2>
              <button onClick={() => setViewCf(null)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">✕</button>
            </div>
            <div className="space-y-3">
              <div className={`${viewCf.category === 'income' ? 'bg-green-50' : 'bg-red-50'} rounded-xl p-4`}>
                <p className="text-lg font-bold text-gray-800">{viewCf.description}</p>
                <p className={`text-2xl font-bold mt-2 ${viewCf.category === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                  {viewCf.category === 'income' ? '+' : '-'}{formatRupiah(viewCf.amount)}
                </p>
              </div>
              {[
                ['Tanggal', formatDate(viewCf.date)],
                ['Tipe', viewCf.category === 'income' ? 'Pemasukan' : 'Pengeluaran'],
                ['Metode', viewCf.payment_method === 'cash' ? 'Cash' : 'Transfer'],
                ['Sumber', {'print':'Print Job','project':'Project','kasbon':'Kasbon','manual-income':'Manual','manual-expense':'Manual'}[viewCf._source] || '-'],
                ['Oleh', viewCf.handled_by || viewCf.cashier || '-'],
                ['Catatan', viewCf.notes || '-'],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-sm text-gray-500">{label}</span>
                  <span className="text-sm font-semibold text-gray-800">{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Detail Transaksi Karyawan ── */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={() => setSelectedEmployee(null)}>
          <div className="bg-white w-full max-w-md rounded-t-3xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-800">Transaksi Karyawan</h2>
              <button onClick={() => setSelectedEmployee(null)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">✕</button>
            </div>
            <div className="bg-indigo-50 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                  <span className="text-indigo-600 font-bold text-lg">{(selectedEmployee.name || '?')[0].toUpperCase()}</span>
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-800">{selectedEmployee.name}</p>
                  <p className="text-sm text-gray-600">{selectedEmployee.totalTransactions} transaksi</p>
                </div>
              </div>
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-indigo-200">
                <span className="text-sm text-gray-600">Total Amount</span>
                <span className={`text-lg font-bold ${selectedEmployee.totalAmount >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {formatRupiah(selectedEmployee.totalAmount)}
                </span>
              </div>
            </div>
            <div className="space-y-3 max-h-[50vh] overflow-y-auto">
              {selectedEmployee.printJobs.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Print Jobs ({selectedEmployee.printJobs.length})</p>
                  <div className="space-y-2">
                    {selectedEmployee.printJobs.sort((a, b) => (b.date || '').localeCompare(a.date || '')).map((tx, idx) => (
                      <div key={`print-${idx}`} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-800 text-sm truncate">{tx.description}</p>
                            <p className="text-xs text-gray-400">{formatDate(tx.date)} · {tx.payment_method === 'cash' ? 'Cash' : 'Transfer'}</p>
                          </div>
                          <p className="font-bold text-sm text-green-600 shrink-0 ml-2">
                            +{formatRupiah(tx.amount)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {selectedEmployee.cashflows.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Cashflow ({selectedEmployee.cashflows.length})</p>
                  <div className="space-y-2">
                    {selectedEmployee.cashflows.sort((a, b) => (b.date || '').localeCompare(a.date || '')).map((tx, idx) => (
                      <div key={`cf-${idx}`} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-800 text-sm truncate">{tx.description}</p>
                            <p className="text-xs text-gray-400">{formatDate(tx.date)} · {tx.payment_method === 'cash' ? 'Cash' : 'Transfer'}</p>
                            {tx.notes && <p className="text-xs text-gray-400 truncate">{tx.notes}</p>}
                          </div>
                          <p className={`font-bold text-sm shrink-0 ml-2 ${tx.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                            {tx.type === 'income' ? '+' : '-'}{formatRupiah(tx.amount)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showAddEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 pb-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <div>
                <p className="font-bold text-gray-800">{editEmp ? 'Edit Karyawan' : 'Tambah Anggota'} — Step {empStep}/2</p>
                <div className="flex gap-1 mt-1">
                  {[1,2].map(n => <div key={n} className={`h-1 w-8 rounded-full ${n <= empStep ? 'bg-purple-600' : 'bg-gray-200'}`} />)}
                </div>
              </div>
              <button onClick={resetEmpForm} className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center">✕</button>
            </div>

            {empStep === 1 ? (
              <div className="space-y-3">
                {/* Photo Upload */}
                <div className="flex flex-col items-center">
                  <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-gray-200 relative">
                    {empForm.photo ? (
                      <img src={empForm.photo} alt="Photo" className="w-full h-full object-cover" />
                    ) : (
                      <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    )}
                  </div>
                  <label className="mt-2 text-sm text-purple-600 font-medium cursor-pointer hover:text-purple-700">
                    Upload Foto
                    <input type="file" accept="image/*" className="hidden" onChange={e => {
                      const file = e.target.files[0]
                      if (file) {
                        const reader = new FileReader()
                        reader.onloadend = () => setEmpForm(f => ({ ...f, photo: reader.result }))
                        reader.readAsDataURL(file)
                      }
                    }} />
                  </label>
                  {empForm.photo && (
                    <button onClick={() => setEmpForm(f => ({ ...f, photo: '' }))} className="text-xs text-red-500 mt-1 hover:text-red-600">
                      Hapus Foto
                    </button>
                  )}
                </div>
                
                {[['Nama *', 'name', 'text'], ['No WhatsApp *', 'whatsapp', 'tel'], ['Tempat Lahir *', 'birthplace', 'text']].map(([label, field, type]) => (
                  <div key={field}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                    <input type={type} value={empForm[field]} onChange={e => setEmpForm(f => ({ ...f, [field]: e.target.value }))}
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-300" />
                  </div>
                ))}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    PIN (6 digit){editEmp ? '' : ' *'}
                  </label>
                  <div className="relative">
                    <input type={showPin ? 'text' : 'password'} inputMode="numeric" value={empForm.pin} maxLength={6}
                      onChange={e => setEmpForm(f => ({ ...f, pin: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                      placeholder={editEmp ? 'Kosongkan jika tidak ingin ubah PIN' : 'Masukkan 6 digit PIN'}
                      className="w-full px-4 py-3 pr-12 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-300" />
                    <button type="button" onClick={() => setShowPin(!showPin)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPin ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {editEmp && <p className="text-xs text-gray-400 mt-1 ml-1">PIN lama tetap berlaku jika dikosongkan</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Lahir *</label>
                  <input type="date" value={empForm.birthdate} onChange={e => setEmpForm(f => ({ ...f, birthdate: e.target.value }))}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-300" />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status Crew *</label>
                  <select value={empForm.status_crew} onChange={e => setEmpForm(f => ({ ...f, status_crew: e.target.value }))}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-300">
                    <option value="Tetap">Tetap</option>
                    <option value="Freelancer">Freelancer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Posisi/Jabatan *</label>
                  <input type="text" value={empForm.position} onChange={e => setEmpForm(f => ({ ...f, position: e.target.value }))}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-300" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gaji Bulanan (Rp)</label>
                  <input type="text" inputMode="numeric" value={empForm.monthly_salary_raw}
                    onChange={e => { const v = formatRupiahInput(e.target.value); setEmpForm(f => ({ ...f, monthly_salary_raw: v, monthly_salary: parseRupiahInput(v) || 0 })) }}
                    placeholder="0"
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-300" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jam Kerja/Hari</label>
                  <input type="number" value={empForm.work_hours_per_day} onChange={e => setEmpForm(f => ({ ...f, work_hours_per_day: e.target.value }))}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-300" />
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-5">
              {empStep === 2 && <button onClick={() => setEmpStep(1)} className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-600">← Kembali</button>}
              <button onClick={handleSaveEmployee} disabled={empSaving}
                className="flex-1 py-3.5 rounded-2xl bg-purple-600 text-white font-bold hover:bg-purple-700 disabled:opacity-40">
                {empSaving ? 'Menyimpan...' : empStep === 1 ? 'Simpan & Lanjut →' : editEmp ? 'Simpan Perubahan' : 'Simpan Data'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Add/Edit Stock ── */}
      {showAddStock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 pb-8">
            <div className="flex justify-between items-center mb-4">
              <p className="font-bold text-gray-800">{editStock ? 'Edit Stok' : 'Tambah Stock Barang'}</p>
              <button onClick={resetStockForm} className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center">✕</button>
            </div>
            <div className="space-y-3">
              <input type="text" value={stockForm.name} onChange={e => setStockForm(f => ({ ...f, name: e.target.value }))} placeholder="Nama Barang *"
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-300" />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" value={stockForm.quantity} onChange={e => setStockForm(f => ({ ...f, quantity: e.target.value }))} placeholder="Jumlah *"
                  className="px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-300" />
                <select value={stockForm.unit} onChange={e => setStockForm(f => ({ ...f, unit: e.target.value }))}
                  className="px-4 py-3 rounded-2xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-300">
                  {['pcs','Roll','Meter','Kg (Kilogram)','Liter','Box','Pack'].map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori Penggunaan</label>
                <select value={stockForm.usage_category} onChange={e => setStockForm(f => ({ ...f, usage_category: e.target.value }))}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-300">
                  <option value="PRINT">🖨️ PRINT — muncul di halaman Print Job</option>
                  <option value="UMUM">📦 UMUM — muncul di halaman Project</option>
                </select>
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                <input type="text" inputMode="numeric" value={stockForm.price_raw}
                  onChange={e => { const v = formatRupiahInput(e.target.value); setStockForm(f => ({ ...f, price_raw: v, price: String(parseRupiahInput(v)) })) }}
                  placeholder="0 (Opsional)"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-300" />
              </div>
              <input type="text" value={stockForm.notes} onChange={e => setStockForm(f => ({ ...f, notes: e.target.value }))} placeholder="Catatan (Opsional)"
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-300" />
              <button onClick={handleSaveStock} disabled={stockSaving || !stockForm.name || !stockForm.quantity}
                className="w-full py-3.5 rounded-2xl bg-teal-500 text-white font-bold hover:bg-teal-600 disabled:opacity-40">
                {stockSaving ? 'Menyimpan...' : 'Simpan Stock'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Add Cashflow ── */}
      {showAddCf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 pb-8">
            <div className="flex justify-between items-center mb-4">
              <p className="font-bold text-gray-800">{editCf ? 'Edit Cashflow' : 'Tambah Cashflow'}</p>
              <button onClick={resetCfForm} className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipe</label>
                <select value={cfForm.type} onChange={e => setCfForm(f => ({ ...f, type: e.target.value, employee_id: e.target.value !== 'salary' ? '' : f.employee_id }))}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-300">
                  <option value="income">Pemasukan</option>
                  <option value="expense">Pengeluaran</option>
                  <option value="salary">GAJI</option>
                </select>
              </div>
              {cfForm.type === 'salary' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Karyawan *</label>
                  <select value={cfForm.employee_id} onChange={e => setCfForm(f => ({ ...f, employee_id: e.target.value }))}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-300">
                    <option value="">Pilih Karyawan</option>
                    {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                  </select>
                </div>
              )}
              {cfForm.type === 'income' && (
                <div className="grid grid-cols-2 gap-3">
                  {['cash','transfer'].map(m => (
                    <button key={m} onClick={() => setCfForm(f => ({ ...f, payment_method: m }))}
                      className={`py-2.5 rounded-2xl border-2 font-semibold text-sm transition-all ${cfForm.payment_method === m ? 'border-teal-500 bg-teal-50 text-teal-600' : 'border-gray-200 text-gray-500'}`}>
                      {m === 'cash' ? '💵 Cash' : '🏦 Transfer'}
                    </button>
                  ))}
                </div>
              )}
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                <input type="text" inputMode="numeric" value={cfForm.amount_raw}
                  onChange={e => { const v = formatRupiahInput(e.target.value); setCfForm(f => ({ ...f, amount_raw: v, amount: String(parseRupiahInput(v)) })) }}
                  placeholder="0"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-300 text-lg font-semibold" />
              </div>
              <input type="text" value={cfForm.description} onChange={e => setCfForm(f => ({ ...f, description: e.target.value }))} placeholder="Deskripsi *"
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-300" />
              <input type="text" value={cfForm.notes} onChange={e => setCfForm(f => ({ ...f, notes: e.target.value }))} placeholder="Catatan (Opsional)"
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-300" />
              <button onClick={handleSaveCashflow} disabled={cfSaving || !cfForm.amount || !cfForm.description}
                className="w-full py-3.5 rounded-2xl bg-teal-500 text-white font-bold hover:bg-teal-600 disabled:opacity-40">
                {cfSaving ? 'Menyimpan...' : editCf ? 'Simpan Perubahan' : 'Simpan Cashflow'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast key={toast.id} message={toast.message} type={toast.type} onClose={clearToast} />}
    </div>
  )
}
