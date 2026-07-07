const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://sistem-absen-production.up.railway.app/api'
console.log('[API] BASE_URL:', BASE_URL)

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`
  console.log('[API] request:', url)
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

// ─── Employees ───────────────────────────────────────────────
export const getEmployees = () => request('/employees')
export const getEmployee = (id) => request(`/employees/${id}`)
export const createEmployee = (data) =>
  request('/employees', { method: 'POST', body: JSON.stringify(data) })
export const updateEmployee = (id, data) =>
  request(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const deleteEmployee = (id) =>
  request(`/employees/${id}`, { method: 'DELETE' })

// ─── Auth ─────────────────────────────────────────────────────
export const verifyAdminPin = (pin) =>
  request('/auth/admin-login', { method: 'POST', body: JSON.stringify({ pin }) })

export const verifyAdminPassword = (username, password) =>
  request('/auth/admin-login', { method: 'POST', body: JSON.stringify({ username, password }) })

export const setupAdminPin = (newPin) =>
  request('/auth/admin-pin/setup', { method: 'POST', body: JSON.stringify({ new_pin: newPin }) })

export const changeAdminPin = (oldPin, newPin) =>
  request('/auth/admin-pin/change', { method: 'POST', body: JSON.stringify({ old_pin: oldPin, new_pin: newPin }) })

export const verifyEmployeePin = (employeeId, pin) =>
  request('/auth/employee-login', { method: 'POST', body: JSON.stringify({ employee_id: employeeId, pin }) })

export const identifyByPin = (pin) =>
  request('/auth/identify-by-pin', { method: 'POST', body: JSON.stringify({ pin }) })

export const verifyBirthdate = (employeeId, birthdate) =>
  request('/auth/verify-birthdate', { method: 'POST', body: JSON.stringify({ employee_id: employeeId, birthdate }) })

export const resetPinByBirthdate = (employeeId, birthdate, newPin) =>
  request('/auth/reset-pin-by-birthdate', { method: 'POST', body: JSON.stringify({ employee_id: employeeId, birthdate, new_pin: newPin }) })

// ─── Kasbon (Advances) ────────────────────────────────────────
export const createAdvance = (data) =>
  request('/advances', { method: 'POST', body: JSON.stringify(data) })
export const getAdvancesByEmployee = (employeeId) =>
  request(`/advances/employee/${employeeId}`)
export const getAllAdvances = () => request('/advances/all')
export const deleteAdvance = (id) =>
  request(`/advances/${id}`, { method: 'DELETE' })
export const updateAdvance = (id, data) =>
  request(`/advances/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const createKasbon = (data) =>
  request('/kasbon', { method: 'POST', body: JSON.stringify(data) })
export const getKasbonSummary = (employeeId) =>
  request(`/kasbon/employee/${employeeId}/summary`)
export const getKasbonByEmployee = (employeeId, activeOnly = false) =>
  request(`/kasbon/employee/${employeeId}${activeOnly ? '?active_only=true' : ''}`)
export const settleKasbon = (employeeId) =>
  request(`/kasbon/settle/${employeeId}`, { method: 'POST' })

// ─── Jobs (Pekerjaan) ─────────────────────────────────────────
export const getJobs = (status = '') =>
  request(`/jobs${status ? `?status=${status}` : ''}`)
export const createJob = (data) =>
  request('/jobs', { method: 'POST', body: JSON.stringify(data) })
export const updateJob = (id, data) =>
  request(`/jobs/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const markJobDone = (id) =>
  request(`/jobs/${id}/done`, { method: 'POST' })
export const markProjectDone = (id) =>
  request(`/projects/${id}/done`, { method: 'POST' })
export const archiveJob = (id) =>
  request(`/jobs/${id}/archive`, { method: 'POST' })
export const archiveProject = (id) =>
  request(`/projects/${id}/archive`, { method: 'POST' })
export const getArchivedJobs = () =>
  request('/jobs/archived')
export const getArchivedProjects = () =>
  request('/projects/archived')
export const deleteJob = (id) =>
  request(`/jobs/${id}`, { method: 'DELETE' })

// ─── Devices ─────────────────────────────────────────────────
export const registerDevice = (data) =>
  request('/devices', { method: 'POST', body: JSON.stringify(data) })
export const getDevices = () => request('/devices')
export const updateDevice = (deviceId, data) =>
  request(`/devices/${deviceId}`, { method: 'PUT', body: JSON.stringify(data) })
export const deleteDevice = (deviceId) =>
  request(`/devices/${deviceId}`, { method: 'DELETE' })
export const getDevicesByRole = (role) => request(`/devices/by-role/${role}`)

// ─── Cashflow ─────────────────────────────────────────────────
export const getCashflow = (params = '') => request(`/cashflow${params}`)
export const getCashflowSummary = () => request('/cashflow/summary')
export const createCashflow = (data) =>
  request('/cashflow', { method: 'POST', body: JSON.stringify(data) })
export const updateCashflow = (id, data) =>
  request(`/cashflow/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const deleteCashflow = (id) =>
  request(`/cashflow/${id}`, { method: 'DELETE' })

// ─── Print Jobs ───────────────────────────────────────────────
export const getPrintJobs = (params = '') => request(`/print-jobs${params}`)
export const getPrintJobsSummary = () => request('/print-jobs/summary')
export const createPrintJob = (data) =>
  request('/print-jobs', { method: 'POST', body: JSON.stringify(data) })
export const updatePrintJob = (id, data) =>
  request(`/print-jobs/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const deletePrintJob = (id) =>
  request(`/print-jobs/${id}`, { method: 'DELETE' })

// ─── Projects ─────────────────────────────────────────────────
export const getProjects = (params = '') => request(`/projects${params}`)
export const createProject = (data) =>
  request('/projects', { method: 'POST', body: JSON.stringify(data) })
export const updateProject = (id, data) =>
  request(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const deleteProject = (id) =>
  request(`/projects/${id}`, { method: 'DELETE' })

// ─── Stock ────────────────────────────────────────────────────
export const getStock = (params = '') => request(`/stock${params}`)
export const createStock = (data) =>
  request('/stock', { method: 'POST', body: JSON.stringify(data) })
export const updateStock = (id, data) =>
  request(`/stock/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const deleteStock = (id) =>
  request(`/stock/${id}`, { method: 'DELETE' })

// ─── Work Tracking ─────────────────────────────────────────────
export const getWorkTracking = () => request('/work-tracking')
export const createWorkTracking = (data) =>
  request('/work-tracking', { method: 'POST', body: JSON.stringify(data) })
export const updateWorkTracking = (id, data) =>
  request(`/work-tracking/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const deleteWorkTracking = (id) =>
  request(`/work-tracking/${id}`, { method: 'DELETE' })

// ─── Employee Transactions (Paginated) ─────────────────────────
export const getKasbonByEmployeePaginated = (empId, page = 1, limit = 50) =>
  request(`/kasbon/employee/${empId}/paginated?page=${page}&limit=${limit}`)
export const getPrintJobsByEmployeePaginated = (empId, page = 1, limit = 50) =>
  request(`/print-jobs/employee/${empId}/paginated?page=${page}&limit=${limit}`)
export const getCashflowByEmployeePaginated = (empId, page = 1, limit = 50) =>
  request(`/cashflow/employee/${empId}/paginated?page=${page}&limit=${limit}`)

// ─── Reset Database ───────────────────────────────────────────
export const resetDatabase = () =>
  request('/reset-database', { method: 'DELETE' })

// Floating Menu Config
export const getFloatingMenu = () =>
  request('/floating-menu')

export const createFloatingMenuItem = (item) =>
  request('/floating-menu', {
    method: 'POST',
    body: JSON.stringify(item)
  })

export const updateFloatingMenuItem = (itemId, item) =>
  request(`/floating-menu/${itemId}`, {
    method: 'PUT',
    body: JSON.stringify(item)
  })

export const deleteFloatingMenuItem = (itemId) =>
  request(`/floating-menu/${itemId}`, { method: 'DELETE' })

// Piket Groups
export const getPiketGroups = () =>
  request('/piket-groups')

export const getPiketGroup = (groupId) =>
  request(`/piket-groups/${groupId}`)

export const createPiketGroup = (group) =>
  request('/piket-groups', {
    method: 'POST',
    body: JSON.stringify(group)
  })

export const updatePiketGroup = (groupId, group) =>
  request(`/piket-groups/${groupId}`, {
    method: 'PUT',
    body: JSON.stringify(group)
  })

export const deletePiketGroup = (groupId) =>
  request(`/piket-groups/${groupId}`, { method: 'DELETE' })

export const rotatePiket = (groupId) =>
  request(`/piket-groups/${groupId}/rotate`, { method: 'POST' })
