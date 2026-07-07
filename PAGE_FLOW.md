# Page Flow

## Route Structure

### Defined Routes (App.jsx)
- `/` → SplashScreen
- `/home` → HomeScreen
- `/print` → PrintJobPage
- `/cashflow` → CashflowPage
- `/project` → ProjectPage
- `/admin` → AdminPage
- `/kasbon-dashboard` → KasbonDashboard
- `*` → Redirect to `/`

## Page Flows

### 1. Application Entry Flow

```
SplashScreen (/)
    ↓ (auto-navigate after loading)
HomeScreen (/home)
```

**SplashScreen Behavior:**
- Shows loading animation
- Auto-redirects to `/home` after short delay
- No user interaction required

---

### 2. HomeScreen Flow

```
HomeScreen (/home)
    ├─→ Click "Print" button → PrintJobPage (/print)
    ├─→ Click "Cashflow" button → CashflowPage (/cashflow)
    ├─→ Click "Project" button → ProjectPage (/project)
    ├─→ Click "Admin" button → AdminPage (/admin)
    └─→ Click "Kasbon" button → Employee Picker Modal
                                ↓ (select employee)
                            PIN Verification Modal
                                ↓ (correct PIN)
                            KasbonDashboard (/kasbon-dashboard)
                                ↓ (back button)
                            HomeScreen
```

**HomeScreen Components:**
- Left Panel: Navigation buttons (Print, Cashflow, Project, Admin, Kasbon)
- Right Panel: Job list with "Tambah Pekerjaan" button
- Employee Picker Modal (triggered by Kasbon button)
- PIN Verification Modal (triggered after employee selection)
- Job Form Modal (triggered by "Tambah Pekerjaan")
- Job Detail Modal (triggered by clicking job card)

**HomeScreen State:**
- `employees`: List of employees (for Kasbon picker)
- `jobs`: List of active jobs
- `showEmployeePicker`: Boolean
- `selectedEmployee`: Selected employee object
- `step`: 'pin' | 'reset_pin'
- `showJobForm`: Boolean
- `editingJob`: Job object (if editing)
- `selectedJob`: Selected job object (for detail modal)

**HomeScreen API Calls:**
- `getEmployees()` - Load employees for Kasbon picker
- `getJobs()` - Load active jobs
- `verifyEmployeePin(empId, pin)` - Verify PIN for Kasbon access
- `verifyBirthdate(empId, birthdate)` - Verify birthdate for PIN reset
- `resetPinByBirthdate(empId, birthdate, newPin)` - Reset PIN

---

### 3. Kasbon Flow

```
HomeScreen (/home)
    ↓ (click "Kasbon" button)
Employee Picker Modal
    ↓ (select employee)
PIN Verification Modal
    ├─→ Wrong PIN → Show error → Retry
    ├─→ Forgot PIN → Reset PIN Flow
    └─→ Correct PIN → KasbonDashboard (/kasbon-dashboard)
                        ↓
                    KasbonDashboard
                        ├─→ View employee info
                        ├─→ View total kasbon
                        ├─→ Ajukan Kasbon → Form → Submit → Refresh kasbon list
                        ├─→ View kasbon history
                        └─→ Back button → HomeScreen
```

**Employee Picker Modal:**
- Displays list of all active employees
- Each employee shows: avatar (initials), name, position
- Click to select employee
- Closes after selection

**PIN Verification Modal:**
- Shows selected employee info
- 6-digit PIN input
- "Lupa PIN?" link → triggers PIN reset flow
- Submit button → calls `verifyEmployeePin()`
- Success → navigate to KasbonDashboard
- Failure → show error message

**PIN Reset Flow:**
```
PIN Verification Modal
    ↓ (click "Lupa PIN?")
Reset PIN Modal (Step 1: Birthdate)
    ↓ (enter birthdate)
Reset PIN Modal (Step 2: New PIN)
    ↓ (enter new PIN + confirm)
Submit → resetPinByBirthdate() → Success → Close modal
```

**KasbonDashboard:**
- URL: `/kasbon-dashboard`
- Props: Receives `employeeId` via state/navigation
- Displays:
  - Employee avatar (initials)
  - Employee name
  - Employee birthdate
  - Total outstanding kasbon (current month, unsettled only)
  - Form: Amount (Rupiah format), Payment Method (Cash/Transfer), Notes
  - Kasbon history list (all transactions)
- Actions:
  - Submit kasbon form → `createKasbon()` → Refresh list
  - Back button → Navigate to HomeScreen

---

### 4. Job Management Flow

```
HomeScreen (/home)
    ↓ (click "Tambah Pekerjaan")
JobFormModal (Add Mode)
    ↓ (fill form)
Submit → createJob() → Refresh job list → Close modal

HomeScreen (/home)
    ↓ (click job card)
JobDetailModal
    ├─→ Edit → JobFormModal (Edit Mode)
    │          ↓ (modify)
    │      Submit → updateJob() → Refresh job list → Close modal
    ├─→ Tandai Selesai → markJobCompleted() → Remove from list → Close modal
    └─→ Hapus → deleteJob() → Remove from list → Close modal
```

**JobFormModal (Add Mode):**
- Fields:
  - Nama Pelanggan (required)
  - Judul Pekerjaan (required)
  - Total Harga (required, Rupiah format)
  - DP (required, Rupiah format)
  - Tanggal (required, date picker)
  - Catatan (optional)
- Validation: DP cannot exceed Total Price
- Submit → `createJob()`
- Status automatically calculated: DP >= Total = "Lunas", else "DP"

**JobFormModal (Edit Mode):**
- Pre-filled with job data
- Same fields as Add Mode
- Submit → `updateJob()`
- Status recalculated after save

**JobDetailModal:**
- Displays:
  - Customer name
  - Job title
  - Total price (Rupiah)
  - DP (Rupiah)
  - Remaining balance (Total - DP)
  - Status (Lunas/DP)
  - Date
  - Notes
- Buttons:
  - Edit → Opens JobFormModal with job data
  - Tandai Selesai / Sudah Diambil → `markJobCompleted()`
  - Hapus → `deleteJob()`
- Close on backdrop click

**Job Card (HomeScreen Display):**
- Background color: Green (Lunas), Orange (DP)
- Shows: Customer name, Title, Status, Date
- Click to open JobDetailModal

---

### 5. Print Jobs Flow

```
HomeScreen (/home)
    ↓ (click "Print")
PrintJobPage (/print)
    ├─→ Add Job → PrintJobFormModal → Submit → Refresh list
    ├─→ Edit Job → PrintJobFormModal (Edit) → Submit → Refresh list
    ├─→ Delete Job → Confirm → deletePrintJob() → Refresh list
    └─→ Back button → HomeScreen
```

**PrintJobPage:**
- Lists all print jobs
- Filter by date range (optional)
- "Tambah Job" button
- Each job shows: Date, Material, Customer, Quantity, Price, Payment Method
- Actions: Edit, Delete

**PrintJobFormModal:**
- Fields:
  - Date (required)
  - Material (required)
  - Payment Method (cash/transfer, required)
  - Quantity (required)
  - Harga Normal (required)
  - Harga Diskon (optional)
  - Customer Name (optional)
  - Notes (optional)
- Submit → `createPrintJob()` (add) or `updatePrintJob()` (edit)

---

### 6. Cashflow Flow

```
HomeScreen (/home)
    ↓ (click "Cashflow")
CashflowPage (/cashflow)
    ├─→ Add Entry → CashflowFormModal → Submit → Refresh list
    ├─→ Delete Entry → Confirm → deleteCashflowEntry() → Refresh list
    ├─→ Filter by type (income/expense)
    ├─→ Filter by category
    └─→ Back button → HomeScreen
```

**CashflowPage:**
- Lists all cashflow entries
- Filter: Type (income/expense), Category
- "Tambah Transaksi" button
- Each entry shows: Date, Type, Category, Amount, Description
- Actions: Delete
- Summary: Total Income, Total Expense, Balance

**CashflowFormModal:**
- Fields:
  - Date (required)
  - Type (income/expense, required)
  - Category (required)
  - Amount (required, Rupiah format)
  - Description (required)
  - Related ID (optional, link to kasbon/print/project)
- Submit → `createCashflowEntry()`

---

### 7. Project Flow

```
HomeScreen (/home)
    ↓ (click "Project")
ProjectPage (/project)
    ├─→ Add Project → ProjectFormModal → Submit → Refresh list
    ├─→ Edit Project → ProjectFormModal (Edit) → Submit → Refresh list
    ├─→ Delete Project → Confirm → deleteProject() → Refresh list
    └─→ Back button → HomeScreen
```

**ProjectPage:**
- Lists all custom projects
- "Tambah Project" button
- Each project shows: Date, Project Name, Customer, Selling Price, Payment Method, Materials count
- Actions: Edit, Delete
- Click project to view details (materials list)

**ProjectFormModal:**
- Fields:
  - Date (required)
  - Project Name (required)
  - Customer Name (optional)
  - Payment Method (cash/transfer, required)
  - Selling Price (required, Rupiah format)
  - Notes (optional)
  - Materials (array, at least one required)
    - Name (required)
    - Quantity (required)
    - Unit (required)
    - Price (required)
    - Stock ID (optional, link to stock)
    - Is Custom (boolean)
- Submit → `createProject()` (add) or `updateProject()` (edit)

**Material Management in Project:**
- Add material row
- Remove material row
- Link to stock (dropdown shows available stocks)
- Mark as custom (no stock deduction)

---

### 8. Admin Flow

```
HomeScreen (/home)
    ↓ (click "Admin")
Admin PIN Verification Modal
    ↓ (enter admin PIN)
AdminPage (/admin)
    ├─→ Tab: Crew
    │   ├─→ Add Employee → EmployeeFormModal → Submit → Refresh list
    │   ├─→ Edit Employee → EmployeeFormModal (Edit) → Submit → Refresh list
    │   ├─→ Delete Employee → Confirm → deleteEmployee() → Refresh list
    │   └─→ Click Employee → EmployeeDetailModal
    │       ├─→ Tandai Gaji Ditransfer → settleKasbon() → Refresh kasbon
    │       ├─→ Edit → EmployeeFormModal (Edit)
    │       └─→ Hapus → deleteEmployee()
    ├─→ Tab: Stock
    │   ├─→ Add Stock → StockFormModal → Submit → Refresh list
    │   ├─→ Edit Stock → StockFormModal (Edit) → Submit → Refresh list
    │   └─→ Delete Stock → Confirm → deleteStock() → Refresh list
    ├─→ Tab: Cashflow
    │   └─→ View all cashflow entries (read-only view)
    ├─→ Tab: Payroll
    │   ├─→ Add Payroll → PayrollFormModal → Submit → Refresh list
    │   └─→ View payroll history
    └─→ Back button → HomeScreen
```

**Admin PIN Verification Modal:**
- Shows admin login form
- PIN/password input
- Submit → verify admin PIN
- Success → open AdminPage
- Failure → show error

**AdminPage Tabs:**
- **Crew**: Employee management
- **Stock**: Stock management
- **Cashflow**: Cashflow view (read-only)
- **Payroll**: Payroll management

**Crew Tab:**
- Search bar (name, position, whatsapp)
- "Tambah Karyawan" button
- Employee list: Avatar, Name, Position, WhatsApp, PIN, Status
- Actions per employee: Edit, Delete, View Detail

**EmployeeFormModal (Add/Edit):**
- Fields:
  - Name (required)
  - WhatsApp (required)
  - PIN (6 digits, required)
  - Birthdate (required, YYYY-MM-DD)
  - Birthplace (optional)
  - Position (required)
  - Status Crew (required)
  - Monthly Salary (optional, numeric)
  - Work Hours Per Day (optional, numeric)
- Submit → `createEmployee()` (add) or `updateEmployee()` (edit)

**EmployeeDetailModal:**
- Shows: Name, WhatsApp, PIN, Birthdate, Birthplace, Position, Status Crew, Monthly Salary, Work Hours Per Day
- Buttons:
  - Edit → EmployeeFormModal (Edit)
  - Hapus → `deleteEmployee()`
  - Tandai Gaji Ditransfer (Reset Kasbon) → `settleKasbon()` → Reset all active kasbon for employee

**Stock Tab:**
- Search bar (name)
- "Tambah Stok" button
- Stock list: Name, Quantity, Unit, Price, Usage Category, Notes
- Actions per stock: Edit, Delete

**StockFormModal (Add/Edit):**
- Fields:
  - Name (required)
  - Quantity (required, numeric)
  - Unit (required)
  - Price (optional, numeric)
  - Notes (optional)
  - Usage Category (required, default: "PRINT")
- Submit → `createStock()` (add) or `updateStock()` (edit)

**Cashflow Tab:**
- Read-only view of all cashflow entries
- Filter by type, category, date range
- Summary: Total Income, Total Expense, Balance

**Payroll Tab:**
- "Tambah Payroll" button
- Payroll list: Employee, Month/Year, Base Salary, Overtime, Deductions, Net Salary
- Actions: Add new payroll entry

**PayrollFormModal:**
- Fields:
  - Employee (required, dropdown)
  - Month/Year (required)
  - Base Salary (required, Rupiah)
  - Overtime (optional, Rupiah)
  - Deductions (optional, Rupiah, includes kasbon)
  - Net Salary (calculated: Base + Overtime - Deductions)
- Submit → `createPayroll()`

---

### 9. Navigation Between Pages

**Back Button Behavior:**
- All pages (except HomeScreen) have back button
- Back button navigates to HomeScreen (`/home`)
- KasbonDashboard back button → HomeScreen

**Direct Navigation:**
- Can navigate directly via URL (if route exists)
- Unknown routes redirect to `/` (SplashScreen)

---

### 10. Modal State Management

**Modal Types:**
- Employee Picker (HomeScreen)
- PIN Verification (HomeScreen, AdminPage)
- PIN Reset (HomeScreen)
- Job Form (HomeScreen - Add/Edit)
- Job Detail (HomeScreen)
- PrintJob Form (PrintJobPage)
- Cashflow Form (CashflowPage)
- Project Form (ProjectPage)
- Employee Form (AdminPage - Add/Edit)
- Employee Detail (AdminPage)
- Stock Form (AdminPage)
- Payroll Form (AdminPage)

**Modal State Rules:**
- Each modal has its own state variable (e.g., `showJobForm`)
- Modals close on backdrop click (optional, check implementation)
- Modals close on successful submit
- Modals stay open on validation error
- Modals stay open on API error

---

### 11. Loading States

**Global Loading:**
- SplashScreen: Shows during initial load

**Page-Level Loading:**
- HomeScreen: Loading employees, loading jobs
- PrintJobPage: Loading print jobs
- CashflowPage: Loading cashflow entries
- ProjectPage: Loading projects
- AdminPage: Loading employees, loading stocks, loading cashflow

**Modal-Level Loading:**
- PIN Verification: Loading during API call
- Job Form: Loading during submit
- Employee Form: Loading during submit
- Stock Form: Loading during submit
- Kasbon Dashboard: Loading during kasbon submit

**Loading Indicators:**
- Spinner animation
- Skeleton loaders (optional)
- Disabled buttons during loading

---

### 12. Error Handling in Flows

**API Errors:**
- Show Toast notification
- Keep user on current page/modal
- Allow retry

**Validation Errors:**
- Show inline with form field
- Highlight invalid field
- Prevent form submission

**Network Errors:**
- Show "Connection error" toast
- Allow retry
- Do not crash application

**PIN Errors:**
- Show error in modal
- Keep modal open
- Allow retry

---

### 13. Data Refresh Patterns

**After Create:**
- Refresh list immediately
- Show success toast
- Close modal

**After Update:**
- Refresh list immediately
- Show success toast
- Close modal

**After Delete:**
- Refresh list immediately
- Show success toast
- Close modal

**After Kasbon Settle:**
- Refresh kasbon list
- Show success toast
- Update total kasbon display

---

### 14. URL Parameters & State

**KasbonDashboard:**
- Receives `employeeId` via navigation state
- No URL parameters

**Other Pages:**
- No URL parameters
- All data loaded via API calls

---

### 15. Page Entry/Exit Hooks

**useEffect Hooks:**
- HomeScreen: Load employees, load jobs on mount
- PrintJobPage: Load print jobs on mount
- CashflowPage: Load cashflow entries on mount
- ProjectPage: Load projects on mount
- AdminPage: Load employees, stocks, cashflow on mount
- KasbonDashboard: Load employee info, load kasbon summary on mount

**Cleanup:**
- No specific cleanup required
- State resets on unmount (React default)
