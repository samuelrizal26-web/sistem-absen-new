import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getEmployees, createEmployee, updateEmployee, deleteEmployee,
  getStock, createStock, updateStock, deleteStock,
  getCashflow, getCashflowSummary, createCashflow, updateCashflow, deleteCashflow,
  getPrintJobs, getProjects, getAllAdvances,
  verifyAdminPin, verifyAdminPassword, changeAdminPin, setupAdminPin,
} from '../services/api'
import { formatRupiah, formatDate, formatRupiahInput, parseRupiahInput } from '../utils/format'
import { openCashDrawerOnly } from '../utils/rawbt'
import Toast from '../components/Toast'
import { useToast } from '../hooks/useToast'

const TAB = { CREW: 'crew', STOCK: 'stock', CASHFLOW: 'cashflow', SETTINGS: 'settings' }

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
  const [empForm, setEmpForm] = useState({ name: '', whatsapp: '', pin: '', birthdate: '', birthplace: '', position: '', status_crew: 'Tetap', monthly_salary: 0, work_hours_per_day: 8 })
  const [empStep, setEmpStep] = useState(1)
  const [empSaving, setEmpSaving] = useState(false)

  // ── Stock state ──
  const [stocks, setStocks] = useState([])
  const [stockLoading, setStockLoading] = useState(false)
  const [showAddStock, setShowAddStock] = useState(false)
  const [editStock, setEditStock] = useState(null)
  const [stockForm, setStockForm] = useState({ name: '', quantity: '', unit: 'pcs', price: '', price_raw: '', usage_category: 'PRINT', notes: '' })
  const [stockSaving, setStockSaving] = useState(false)

  // ── Cashflow state ──
  const [cashflows, setCashflows] = useState([])
  const [cfSummary, setCfSummary] = useState(null)
  const [cfPrintJobs, setCfPrintJobs] = useState([])
  const [cfProjects, setCfProjects] = useState([])
  const [advances, setAdvances] = useState([])
  const [cfLoading, setCfLoading] = useState(false)
  const [cfSearch, setCfSearch] = useState('')
  const [showAddCf, setShowAddCf] = useState(false)
  const [cfForm, setCfForm] = useState({ type: 'income', amount: '', amount_raw: '', description: '', payment_method: 'cash', notes: '' })
  const [cfSaving, setCfSaving] = useState(false)
  const [cfTab, setCfTab] = useState('semua')
  const [editCf, setEditCf] = useState(null)

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
      const [cf, cfs, pj, pr, adv] = await Promise.all([
        getCashflow(cfSearch ? `?month=${cfSearch}` : ''),
        getCashflowSummary(),
        getPrintJobs(cfSearch ? `?month=${cfSearch}` : ''),
        getProjects(cfSearch ? `?month=${cfSearch}` : ''),
        getAllAdvances(),
      ])
      setCashflows(Array.isArray(cf) ? cf : [])
      setCfSummary(cfs)
      setCfPrintJobs(Array.isArray(pj) ? pj : [])
      setCfProjects(Array.isArray(pr) ? pr : [])
      setAdvances(Array.isArray(adv) ? adv : [])
    } catch { showToast('Gagal memuat cashflow', 'error') }
    finally { setCfLoading(false) }
  }

  useEffect(() => {
    if (!authed) return
    if (tab === TAB.CREW) loadEmployees()
    if (tab === TAB.STOCK) loadStocks()
    if (tab === TAB.CASHFLOW) loadCashflow()
  }, [authed, tab, cfSearch])

  // ─────────────────── EMPLOYEE CRUD ───────────────────
  const resetEmpForm = () => {
    setEmpForm({ name: '', whatsapp: '', pin: '', birthdate: '', birthplace: '', position: '', status_crew: 'Tetap', monthly_salary: 0, work_hours_per_day: 8 })
    setEmpStep(1); setEditEmp(null); setShowAddEmp(false)
  }

  const handleSaveEmployee = async () => {
    if (empStep === 1) {
      if (!empForm.name || !empForm.whatsapp || !empForm.pin || !empForm.birthdate || !empForm.birthplace) {
        showToast('Lengkapi semua field wajib', 'error'); return
      }
      setEmpStep(2); return
    }
    if (!empForm.position || !empForm.status_crew) {
      showToast('Lengkapi posisi dan status crew', 'error'); return
    }
    setEmpSaving(true)
    try {
      if (editEmp) {
        await updateEmployee(editEmp.id, empForm)
        showToast('Data karyawan diperbarui', 'success')
      } else {
        await createEmployee(empForm)
        showToast('Karyawan berhasil ditambahkan!', 'success')
      }
      resetEmpForm(); await loadEmployees()
    } catch (e) { showToast(e.message || 'Gagal menyimpan', 'error') }
    finally { setEmpSaving(false) }
  }

  const handleDeleteEmployee = async (id) => {
    if (!window.confirm('Hapus karyawan ini?')) return
    try { await deleteEmployee(id); showToast('Karyawan dihapus', 'info'); await loadEmployees() }
    catch (e) { showToast(e.message || 'Gagal menghapus', 'error') }
  }

  const handleEditEmployee = (emp) => {
    setEmpForm({ name: emp.name, whatsapp: emp.whatsapp, pin: emp.pin || '', birthdate: emp.birthdate || '', birthplace: emp.birthplace || '', position: emp.position || '', status_crew: emp.status_crew || 'Tetap', monthly_salary: emp.monthly_salary || 0, work_hours_per_day: emp.work_hours_per_day || 8 })
    setEditEmp(emp); setEmpStep(1); setShowAddEmp(true)
  }

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

  // ─────────────────── CASHFLOW CRUD ───────────────────
  const resetCfForm = () => {
    setCfForm({ type: 'income', amount: '', amount_raw: '', description: '', payment_method: 'cash', notes: '' })
    setEditCf(null)
    setShowAddCf(false)
  }

  const handleSaveCashflow = async () => {
    if (!cfForm.amount || !cfForm.description) { showToast('Lengkapi jumlah dan deskripsi', 'error'); return }
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
    setCfForm({ type: item.type, amount: String(item.amount), amount_raw: formatRupiahInput(String(item.amount)), description: item.description || '', payment_method: item.payment_method || 'cash', notes: item.notes || '' })
    setShowAddCf(true)
  }

  const handleDeleteCashflow = async (id) => {
    if (!window.confirm('Hapus transaksi ini?')) return
    try { await deleteCashflow(id); showToast('Dihapus', 'info'); await loadCashflow() }
    catch (e) { showToast(e.message || 'Gagal menghapus', 'error') }
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

  // Kalkulasi saldo laci (hanya cashflow manual cash)
  const saldoLaci = cashflows.reduce((s, c) => {
    if (['income', 'modal_masuk'].includes(c.type) && c.payment_method === 'cash') return s + (c.amount || 0)
    if (['expense', 'kas_keluar'].includes(c.type)) return s - (c.amount || 0)
    return s
  }, 0)

  const filteredEmp = employees.filter(e => e.name?.toLowerCase().includes(empSearch.toLowerCase()) || e.position?.toLowerCase().includes(empSearch.toLowerCase()) || e.whatsapp?.includes(empSearch))

  // Gabung semua transaksi dari semua sumber
  const allCfTransactions = [
    ...cashflows.map(c => ({ ...c, _source: ['income','modal_masuk'].includes(c.type) ? 'manual-income' : 'manual-expense', category: ['income','modal_masuk'].includes(c.type) ? 'income' : 'expense' })),
    ...cfPrintJobs.map(j => ({ id: j.id, date: j.date, description: `Print: ${j.material} · ${j.customer_name || '-'}`, amount: j.total_price || 0, payment_method: j.payment_method || 'cash', category: 'income', _source: 'print', handled_by: '' })),
    ...cfProjects.map(p => ({ id: p.id, date: p.date, description: `Project: ${p.project_name} · ${p.customer_name || '-'}`, amount: p.selling_price || p.total_project_value || 0, payment_method: p.payment_method || 'cash', category: 'income', _source: 'project', handled_by: '' })),
    ...advances.map(a => ({ id: a.id, date: a.date || a.created_at?.slice(0,10), description: `Kasbon: ${a.employee_name || a.employee_id}`, amount: a.amount || 0, payment_method: 'cash', category: 'expense', _source: 'kasbon', handled_by: 'Admin' })),
  ]

  const cfFiltered = allCfTransactions.filter(i => {
    if (cfTab === 'semua') return true
    if (cfTab === 'print') return i._source === 'print'
    if (cfTab === 'project') return i._source === 'project'
    if (cfTab === 'manual') return i._source === 'manual-income' || i._source === 'manual-expense'
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
        {[[TAB.CREW, 'Crew'], [TAB.STOCK, 'Stok'], [TAB.CASHFLOW, 'Cashflow'], [TAB.SETTINGS, 'Pengaturan']].map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${tab === t ? 'bg-purple-600 text-white shadow' : 'bg-white text-gray-500 border border-gray-100'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── TAB: CREW ── */}
      {tab === TAB.CREW && (
        <div className="flex-1 px-4 pb-6 space-y-3">
          <input type="text" value={empSearch} onChange={e => setEmpSearch(e.target.value)} placeholder="Cari nama, posisi, atau WhatsApp..."
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-300 text-sm" />
          <button onClick={() => { resetEmpForm(); setShowAddEmp(true) }}
            className="w-full py-3 rounded-2xl bg-purple-600 text-white font-semibold flex items-center justify-center gap-2 shadow hover:bg-purple-700 active:scale-95 transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Tambah Anggota
          </button>
          {empLoading ? (
            <div className="flex justify-center py-8"><svg className="w-7 h-7 animate-spin text-purple-600" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg></div>
          ) : (
            <div className="space-y-2">
              {filteredEmp.map(emp => (
                <div key={emp.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                    <span className="text-purple-600 font-bold text-sm">{(emp.name || '?')[0].toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm truncate">{emp.name}</p>
                    <p className="text-xs text-gray-400">{emp.position} · {emp.whatsapp}</p>
                    <p className="text-xs text-gray-400">PIN: {emp.pin || '—'} · {emp.status_crew || '-'}</p>
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
      )}

      {/* ── TAB: STOCK ── */}
      {tab === TAB.STOCK && (
        <div className="flex-1 px-4 pb-6 space-y-3">
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
          <button onClick={() => { resetStockForm(); setShowAddStock(true) }}
            className="w-full py-3 rounded-2xl bg-teal-500 text-white font-semibold flex items-center justify-center gap-2 shadow hover:bg-teal-600 active:scale-95 transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Tambah Barang
          </button>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 bg-teal-500 text-white font-semibold text-sm">Daftar Stock</div>
            {stockLoading ? (
              <div className="flex justify-center py-8"><svg className="w-7 h-7 animate-spin text-teal-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg></div>
            ) : (
              <div className="divide-y divide-gray-50">
                {stocks.map(s => (
                  <div key={s.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-800 text-sm truncate">{s.name}</p>
                        {s.quantity <= 5 && <span className="text-xs px-1.5 py-0.5 rounded bg-orange-100 text-orange-600 font-medium">Low</span>}
                      </div>
                      <p className="text-xs text-gray-400">{s.quantity} {s.unit} · {s.price ? formatRupiah(s.price) + '/unit' : '-'} · <span className={s.usage_category === 'PRINT' ? 'text-orange-500 font-medium' : 'text-blue-500 font-medium'}>{s.usage_category || 'UMUM'}</span></p>
                    </div>
                    <div className="flex gap-2 shrink-0">
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
      )}

      {/* ── TAB: CASHFLOW ── */}
      {tab === TAB.CASHFLOW && (
        <div className="flex-1 px-4 pb-6 space-y-3">
          {/* Saldo Laci */}
          <div className="bg-primary rounded-2xl p-4 text-white shadow">
            <p className="text-xs opacity-80">Saldo Laci Kasir</p>
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

          {/* Ringkasan Terintegrasi */}
          <div className="bg-teal-600 rounded-2xl p-4 text-white shadow">
            <p className="text-xs opacity-70">Total Pemasukan Gabungan</p>
            <p className="text-2xl font-bold mt-0.5">{formatRupiah(cfSummary?.total_income || 0)}</p>
            <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
              <div className="bg-white/10 rounded-xl p-2">
                <p className="opacity-70">Print Job</p>
                <p className="font-bold">{formatRupiah(cfSummary?.print_job_total || 0)}</p>
              </div>
              <div className="bg-white/10 rounded-xl p-2">
                <p className="opacity-70">Project</p>
                <p className="font-bold">{formatRupiah(cfSummary?.project_total || 0)}</p>
              </div>
              <div className="bg-white/10 rounded-xl p-2">
                <p className="opacity-70">Manual</p>
                <p className="font-bold">{formatRupiah(cfSummary?.manual_income || 0)}</p>
              </div>
              <div className="bg-red-400/60 rounded-xl p-2">
                <p className="opacity-70">Pengeluaran + Kasbon</p>
                <p className="font-bold">{formatRupiah(cfSummary?.total_expense || 0)}</p>
              </div>
            </div>
          </div>

          {/* Search + Add */}
          <div className="flex gap-2">
            <input type="month" value={cfSearch} onChange={e => setCfSearch(e.target.value)}
              className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
            {cfSearch && <button onClick={() => setCfSearch('')} className="px-3 py-2.5 rounded-xl bg-gray-100 text-gray-500 text-sm">Reset</button>}
          </div>
          <button onClick={() => setShowAddCf(true)}
            className="w-full py-3 rounded-2xl bg-teal-500 text-white font-semibold flex items-center justify-center gap-2 shadow hover:bg-teal-600 active:scale-95 transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Tambah Cashflow
          </button>

          {/* Tabs */}
          <div className="flex bg-gray-100 rounded-2xl p-1 gap-1">
            {[['semua','Semua'],['print','Print'],['project','Project'],['manual','Manual'],['keluar','Keluar']].map(([val, label]) => (
              <button key={val} onClick={() => setCfTab(val)}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${cfTab === val ? 'bg-white text-purple-600 shadow' : 'text-gray-500'}`}>
                {label}
              </button>
            ))}
          </div>

          {/* List */}
          {cfLoading ? (
            <div className="flex justify-center py-8"><svg className="w-7 h-7 animate-spin text-purple-600" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg></div>
          ) : Object.entries(cfGrouped).length === 0 ? (
            <p className="text-center text-gray-400 py-6 text-sm">Belum ada transaksi</p>
          ) : (
            Object.entries(cfGrouped).sort((a, b) => b[0].localeCompare(a[0])).map(([month, items]) => (
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
                    <div key={`${item._source}-${item.id}`} className="bg-white rounded-xl px-3 py-2.5 flex items-center gap-2.5 shadow-sm border border-gray-100">
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
                        <p className="text-[10px] text-gray-400">{formatDate(item.date)} · {item.payment_method === 'cash' ? 'Cash' : 'Transfer'}</p>
                      </div>
                      <p className={`font-bold text-xs shrink-0 ${isIncome ? 'text-green-600' : 'text-red-500'}`}>
                        {isIncome ? '+' : '-'}{formatRupiah(item.amount)}
                      </p>
                      {isManual && (
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => handleEditCashflow(item)} className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center hover:bg-blue-100 active:scale-95 transition-all">
                            <svg className="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button onClick={() => handleDeleteCashflow(item.id)} className="w-6 h-6 rounded-lg bg-red-50 flex items-center justify-center hover:bg-red-100 active:scale-95 transition-all">
                            <svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      )}
                    </div>
                  )})}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── TAB: SETTINGS ── */}
      {tab === TAB.SETTINGS && (
        <div className="flex-1 px-4 pb-6 pt-2 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
            <p className="font-bold text-gray-800">Ganti PIN Admin</p>
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
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <p className="font-bold text-gray-800 mb-1">Setup PIN (Pertama Kali)</p>
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
      )}

      {/* ── MODAL: Add/Edit Employee ── */}
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
                {[['Nama *', 'name', 'text'], ['No WhatsApp *', 'whatsapp', 'tel'], ['PIN (6 digit) *', 'pin', 'password'], ['Tempat Lahir *', 'birthplace', 'text']].map(([label, field, type]) => (
                  <div key={field}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                    <input type={type} value={empForm[field]} onChange={e => setEmpForm(f => ({ ...f, [field]: e.target.value }))} maxLength={field === 'pin' ? 6 : undefined}
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-300" />
                  </div>
                ))}
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
                  <input type="number" value={empForm.monthly_salary} onChange={e => setEmpForm(f => ({ ...f, monthly_salary: e.target.value }))}
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
                <select value={cfForm.type} onChange={e => setCfForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-300">
                  <option value="income">Pemasukan</option>
                  <option value="expense">Pengeluaran</option>
                </select>
              </div>
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
