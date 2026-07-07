# Project Context

## Application Purpose
Sistem Absen & Manajemen Bisnis untuk Labalaba Advertising (Cutting Sticker Business).

Sistem ini mengelola:
- Manajemen karyawan (Crew) dengan PIN
- Pencatatan pekerjaan cetak (Print Jobs)
- Manajemen proyek custom dengan material
- Cashflow (pemasukan/pengeluaran)
- Kasbon (pinjaman gaji karyawan)
- Manajemen stok material
- Payroll (gaji bulanan)
- Pekerjaan berjalan (Jobs) dengan status DP/Lunas

## Architecture

### Backend
- **Framework**: FastAPI (Python)
- **Database**: MongoDB (via Motor AsyncIO)
- **Deployment**: Railway (production)
- **API Base URL**: `https://sistem-absen-production.up.railway.app/api`
- **CORS**: Enabled for all origins

### Frontend
- **Framework**: React (Vite)
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **Deployment**: Railway (production) + Local development
- **Build Tool**: Vite

### Flutter Web (Legacy/Alternative)
- **Framework**: Flutter
- **Platform**: Web
- **Status**: Available but not actively used for current development

## Project Structure

```
E:\sistem_absen_flutter_v2/
├── backend/                 # FastAPI backend
│   └── server.py           # Main API server
├── frontend-web/           # React frontend (active)
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API calls
│   │   ├── hooks/          # React hooks
│   │   └── utils/          # Utility functions
│   └── index.html
├── lib/                    # Flutter source
├── web/                    # Flutter web build
├── assets/                 # Static assets
└── pubspec.yaml           # Flutter dependencies
```

## Backend Structure (server.py)

### Collections (MongoDB)
- `employees` - Data karyawan
- `attendance` - Absensi (deprecated, no longer used)
- `print_jobs` - Pekerjaan cetak
- `projects` - Proyek custom
- `cashflow` - Cashflow transactions
- `kasbon` - Pinjaman kasbon
- `stocks` - Stok material
- `payroll` - Gaji bulanan
- `jobs` - Pekerjaan berjalan (Jobs baru)

### Key Models (Schemas)
- `EmployeeCreate` / `EmployeeUpdate` - Karyawan (name, whatsapp, pin, birthdate, position, status_crew, monthly_salary, work_hours_per_day)
- `StockCreate` / `StockUpdate` - Stok (name, quantity, unit, price, notes, usage_category)
- `PrintJobCreate` - Pekerjaan cetak (date, material, payment_method, quantity, harga_normal, harga_diskon, customer_name, notes)
- `ProjectCreate` - Proyek custom (date, project_name, customer_name, payment_method, selling_price, notes, materials[])
- `CashflowEntry` - Cashflow (date, type, category, amount, description, related_id)
- `KasbonCreate` - Kasbon (employee_id, amount, notes, payment_method, settled)
- `JobCreate` / `JobUpdate` - Pekerjaan berjalan (customer_name, title, total_price, dp, tanggal, catatan, status)

### Key Endpoints
- `/api/employees` - CRUD karyawan + verify PIN + verify birthdate + reset PIN
- `/api/attendance` - CRUD absensi (deprecated)
- `/api/print_jobs` - CRUD pekerjaan cetak
- `/api/projects` - CRUD proyek
- `/api/cashflow` - CRUD cashflow
- `/api/kasbon` - CRUD kasbon + summary by employee + settle (reset gaji)
- `/api/stocks` - CRUD stok
- `/api/payroll` - CRUD payroll
- `/api/jobs` - CRUD pekerjaan berjalan + mark completed

## Frontend Structure

### Pages
- `SplashScreen` - Loading screen
- `HomeScreen` - Halaman utama dengan navigasi + job list
- `PrintJobPage` - Manajemen pekerjaan cetak
- `CashflowPage` - Manajemen cashflow
- `ProjectPage` - Manajemen proyek custom
- `AdminPage` - Admin panel (karyawan, stok, cashflow, kasbon settle)
- `KasbonDashboard` - Dashboard kasbon karyawan

### Components
- `PinModal` - Modal input PIN
- `JobFormModal` - Modal form tambah/edit pekerjaan
- `JobDetailModal` - Modal detail pekerjaan dengan aksi
- `Toast` - Notifikasi toast

### Services (api.js)
- `getEmployees`, `createEmployee`, `updateEmployee`, `deleteEmployee`
- `verifyEmployeePin`, `verifyBirthdate`, `resetPinByBirthdate`
- `getPrintJobs`, `createPrintJob`, `updatePrintJob`, `deletePrintJob`
- `getProjects`, `createProject`, `updateProject`, `deleteProject`
- `getCashflow`, `createCashflowEntry`, `deleteCashflowEntry`
- `getKasbon`, `createKasbon`, `deleteKasbon`
- `getKasbonSummary`, `settleKasbon` (reset gaji)
- `getStocks`, `createStock`, `updateStock`, `deleteStock`
- `getPayroll`, `createPayroll`
- `getJobs`, `createJob`, `updateJob`, `deleteJob`, `markJobCompleted`

### Utils (format.js)
- `formatRupiah` - Format angka ke Rupiah dengan pemisah ribuan
- `formatDate` - Format tanggal ke format Indonesia
- `getInitials` - Ambil inisial dari nama

## Navigation Flow

### Main Flow
1. **SplashScreen** (`/`) → Loading → **HomeScreen** (`/home`)
2. **HomeScreen** → Klik tombol navigasi → Halaman terkait:
   - **Print** → `PrintJobPage`
   - **Cashflow** → `CashflowPage`
   - **Project** → `ProjectPage`
   - **Admin** → `AdminPage`
   - **Kasbon** → Employee picker → PIN verification → **KasbonDashboard**

### Kasbon Flow
1. Klik tombol **Kasbon** di HomeScreen
2. Popup muncul: Daftar karyawan
3. Pilih karyawan
4. Input PIN (6 digit)
5. Jika salah: Muncul error "PIN salah"
6. Jika benar: Navigasi ke **KasbonDashboard** dengan employee_id
7. KasbonDashboard menampilkan:
   - Data pribadi karyawan (nama, tanggal lahir, avatar inisial)
   - Total kasbon belum lunas bulan ini
   - Form ajukan kasbon (nominal, metode pembayaran Cash/Transfer, catatan)
   - Riwayat kasbon

### Job Management Flow
1. Di HomeScreen, klik tombol **Tambah Pekerjaan**
2. Modal JobForm muncul:
   - Nama pelanggan
   - Judul pekerjaan
   - Total harga
   - DP
   - Tanggal
   - Catatan
3. Submit → Job disimpan dengan status:
   - **Lunas** jika DP >= Total
   - **DP** jika DP < Total
4. Kartu pekerjaan muncul di daftar:
   - Hijau = Lunas
   - Oranye = DP/Belum Lunas
5. Klik kartu pekerjaan → JobDetailModal:
   - Lihat detail
   - Edit pekerjaan
   - Tandai Selesai / Sudah Diambil → pekerjaan hilang dari daftar
   - Hapus pekerjaan

### Admin Flow
1. Klik tombol **Admin** di HomeScreen
2. Input PIN/password admin
3. AdminPage tabs:
   - **Crew** - Kelola karyawan (CRUD)
   - **Stock** - Kelola stok (CRUD)
   - **Cashflow** - Lihat semua transaksi
   - **Payroll** - Kelola gaji
4. Di tab Crew, klik karyawan → Modal detail:
   - Lihat data lengkap
   - Edit karyawan
   - Hapus karyawan
   - **Tandai Gaji Ditransfer (Reset Kasbon)** → Settle kasbon karyawan

## Dashboard Layout (HomeScreen)

### Original Layout (Must Not Be Redesigned)
- **Left Panel**: Main navigation buttons (Print, Cashflow, Project, Admin, Kasbon)
- **Right Panel**: Active jobs list (menggantikan employee grid)

### Navigation Buttons (NAV_BUTTONS)
Setiap tombol memiliki:
- Label
- Path atau Action
- Color (gradient)
- Icon (SVG)

Tombol Kasbon menggunakan `action: 'kasbon'` bukan `path`, karena memicu employee picker modal.

### Job List (Right Panel)
- Header: "Daftar Pekerjaan Berjalan"
- Tombol: "Tambah Pekerjaan" (biru, dengan ikon +)
- Kartu pekerjaan:
  - Warna background berdasarkan status (hijau lunas, oranye DP)
  - Informasi: pelanggan, judul, total harga, status, tanggal
  - Klik untuk detail

## Key Business Decisions

### Attendance Feature
- **Status**: DEPRECATED - No longer used
- **Reason**: Business process changed, attendance not needed
- **Action**: Do not use or restore attendance feature

### Employee Grid on HomeScreen
- **Status**: REMOVED
- **Replacement**: Job list cards
- **Reason**: Focus on active jobs rather than crew display
- **Constraint**: Do not restore employee grid to HomeScreen

### Kasbon with PIN Verification
- **Purpose**: Security for kasbon requests
- **Flow**: Select employee → Enter PIN → Access dashboard
- **Alternative**: PIN reset via birthdate verification

### Jobs with DP and Remaining Balance
- **Purpose**: Track partial payments
- **Logic**: 
  - Status = "Lunas" if DP >= Total
  - Status = "DP" if DP < Total
  - Jobs remain visible until marked completed
- **Payment Status Display**: Color-coded cards (green/orange)

### Admin as Source of Truth
- **Purpose**: Single source of truth for finance and stock
- **Implication**: All financial and stock operations must be done through Admin page
- **Constraint**: Do not introduce alternative sources of truth

### No Global Login
- **Purpose**: Simple access control via PIN per feature
- **Constraint**: Do not introduce global login system
- **Authentication**: 
  - Admin: PIN/password on Admin page
  - Kasbon: Employee PIN verification
  - Other pages: No authentication required

## Deployment

### Production
- **Backend**: Railway (FastAPI + MongoDB)
- **Frontend**: Railway (React build)
- **URL**: `https://sistem-absen-production.up.railway.app`

### Development
- **Backend**: Local Python server
- **Frontend**: Vite dev server (`npm run dev`)
- **Default Port**: 5173 (Vite)

## Important Technical Notes

### Currency Formatting
- All monetary values must use `formatRupiah()` with thousand separators
- Example: `Rp 1.500.000`

### Date Formatting
- All dates must use `formatDate()` for Indonesian format
- Backend stores dates as ISO strings (YYYY-MM-DD)

### PIN Format
- Employee PIN: 6 digits (string)
- Admin password: Configurable (check .env or code)

### Payment Methods
- Cash
- Transfer
- Must be selected for kasbon requests

### Status Conventions
- Job Status: "DP", "Lunas", "Selesai"
- Employee Status: "active", "inactive"
- Kasbon Settled: boolean (true/false)

### Error Handling
- All API errors must be displayed via Toast notifications
- PIN validation errors must be shown in modal
- Form validation errors must be shown inline

## Current Development Status

### Recently Implemented
- Kasbon button on HomeScreen
- KasbonDashboard page with employee info, kasbon total, form, and history
- Job management (CRUD + mark completed)
- Employee picker modal for Kasbon
- Admin settle kasbon button
- Backend kasbon settle endpoint
- Backend jobs CRUD endpoint

### Features Removed
- Employee grid on HomeScreen
- Attendance feature (deprecated)

### Active Features
- Print Jobs (CRUD)
- Projects (CRUD with materials)
- Cashflow (CRUD)
- Admin (Crew, Stock, Cashflow, Payroll)
- Kasbon (CRUD + summary + settle)
- Jobs (CRUD + mark completed)

### Pending Tasks
- None explicitly pending

### Known Issues
- None explicitly reported

## Future Considerations

### Architecture Constraints
- Keep backend as FastAPI + MongoDB
- Keep frontend as React + Vite + Tailwind
- Do not migrate to other frameworks without explicit request

### UI Constraints
- Keep left panel navigation (do not redesign)
- Keep right panel as job list (do not restore employee grid)
- Keep color scheme and gradients
- Keep Tailwind CSS classes consistent

### Business Logic Constraints
- Keep kasbon flow with PIN verification
- Keep job status logic (DP vs Lunas)
- Keep admin as single source of truth
- Do not introduce global login
- Keep attendance feature deprecated
