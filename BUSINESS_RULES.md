# Business Rules

## Core Business Rules

### 1. Attendance (DEPRECATED)
- **Status**: Feature is deprecated and no longer used
- **Reason**: Business process changed, attendance tracking is not needed
- **Action**: Do not use, restore, or reference attendance feature in new development
- **Database**: `attendance` collection exists but should not be used

### 2. Employee Management
- **PIN Required**: Every employee must have a 6-digit PIN
- **PIN Verification**: Required for Kasbon access
- **PIN Reset**: Can be reset via birthdate verification
- **Birthdate Required**: Required for PIN reset functionality
- **WhatsApp Required**: Required for contact purposes
- **Position**: Role/position must be specified
- **Status Crew**: Active status indicator (active/inactive)
- **Monthly Salary**: Optional, used for payroll calculation
- **Work Hours Per Day**: Optional, default 8 hours

### 3. Kasbon (Employee Advance)
- **Purpose**: Allow employees to request salary advances
- **Access Control**: 
  - Must select employee from picker
  - Must enter correct 6-digit PIN
  - PIN verification happens before accessing dashboard
- **Payment Method**: Must select "Cash" or "Transfer"
- **Settlement**:
  - Kasbon accumulates monthly
  - Reset when salary is transferred
  - Admin can manually settle via "Tandai Gaji Ditransfer" button
  - Settled kasbon marked with `settled: true`
- **Display**:
  - Dashboard shows total outstanding kasbon for current month
  - Only unsettled kasbon counted in total
  - History shows all kasbon transactions
- **Reset Flow**:
  - Admin clicks "Tandai Gaji Ditransfer" in employee detail modal
  - Backend `/api/kasbon/settle` endpoint called
  - All active kasbon for employee marked as settled
  - Total kasbon resets to 0

### 4. Job Management (Pekerjaan Berjalan)
- **Purpose**: Track active jobs with payment status
- **Status Logic**:
  - **Lunas**: DP >= Total Price
  - **DP**: DP < Total Price
  - **Selesai**: Manually marked as completed (removed from list)
- **Display**:
  - Green card = Lunas
  - Orange card = DP/Belum Lunas
- **Visibility**:
  - Jobs remain visible until marked "Selesai" or deleted
  - Completed jobs disappear from list
  - No archive for completed jobs
- **Fields**:
  - Customer Name (nama pelanggan)
  - Title (judul pekerjaan)
  - Total Price (total harga)
  - DP (down payment)
  - Date (tanggal)
  - Notes (catatan)
- **Actions**:
  - Add: Via "Tambah Pekerjaan" button on HomeScreen
  - Edit: Via JobDetailModal
  - Mark Complete: Via JobDetailModal "Tandai Selesai / Sudah Diambil"
  - Delete: Via JobDetailModal

### 5. Print Jobs
- **Purpose**: Track printing jobs
- **Fields**:
  - Date
  - Material
  - Payment Method (cash/transfer)
  - Quantity
  - Harga Normal (normal price)
  - Harga Diskon (discount price, optional)
  - Customer Name (optional)
  - Notes (optional)
- **Payment Method**: Must select "cash" or "transfer"

### 6. Projects (Custom Projects)
- **Purpose**: Track custom projects with materials
- **Fields**:
  - Date
  - Project Name
  - Customer Name (optional)
  - Payment Method (cash/transfer)
  - Selling Price
  - Notes (optional)
  - Materials (array of ProjectMaterialIn)
- **Materials**:
  - Can be from stock (linked to stock_id)
  - Can be custom (is_custom: true)
  - Each material has name, quantity, unit, price

### 7. Cashflow
- **Purpose**: Track all financial transactions
- **Types**: income, expense
- **Categories**: Custom categories for classification
- **Related ID**: Optional, can link to kasbon, print_jobs, projects
- **Display**: Shown in Admin page Cashflow tab
- **Source of Truth**: Admin page is the source of truth for all financial data

### 8. Stock Management
- **Purpose**: Track material inventory
- **Fields**:
  - Name
  - Quantity
  - Unit
  - Price (optional)
  - Notes
  - Usage Category (default: "PRINT")
- **Usage Categories**: PRINT, PROJECT, etc.
- **Source of Truth**: Admin page is the source of truth for all stock data

### 9. Payroll
- **Purpose**: Track monthly salary payments
- **Fields**:
  - Employee ID
  - Month/Year
  - Base Salary
  - Overtime
  - Deductions
  - Net Salary
- **Relation**: Can deduct kasbon from salary

## UI Constraints

### HomeScreen Layout (MUST NOT BE REDESIGNED)
- **Left Panel**: Main navigation buttons
  - Print (orange gradient)
  - Cashflow (teal gradient)
  - Project (blue gradient)
  - Admin (purple gradient)
  - Kasbon (amber gradient)
- **Right Panel**: Active jobs list
  - Header: "Daftar Pekerjaan Berjalan"
  - "Tambah Pekerjaan" button (blue)
  - Job cards (green/orange based on status)

### Navigation Button Rules
- Each button has: label, path/action, color gradient, icon
- Kasbon button uses `action: 'kasbon'` (not `path`)
- Other buttons use `path` for navigation
- Do not change button order or colors

### Job List Rules
- Jobs displayed as cards
- Color-coded by status (green/orange)
- Click card to open JobDetailModal
- Do not revert to employee grid
- Do not change card layout significantly

### Modal Rules
- **PinModal**: Used for PIN verification
- **JobFormModal**: Used for add/edit jobs
- **JobDetailModal**: Used for job details and actions
- **Employee Picker Modal**: Used for Kasbon employee selection
- All modals must have consistent styling
- All modals must close on backdrop click (optional, check current behavior)

### Color Scheme
- Print: Orange gradient (`from-orange-400 to-orange-500`)
- Cashflow: Teal gradient (`from-teal-400 to-teal-500`)
- Project: Blue gradient (`from-blue-500 to-blue-600`)
- Admin: Purple gradient (`from-purple-500 to-purple-600`)
- Kasbon: Amber gradient (`from-amber-400 to-amber-500`)
- Job Lunas: Green background
- Job DP: Orange background

### Typography
- Use Tailwind default font stack
- Consistent font sizes across pages
- Readable text for all UI elements

### Responsive Design
- Mobile-first approach
- Grid layouts adjust to screen size
- Modals work on mobile

## Authentication & Access Control

### No Global Login
- **Rule**: Do not introduce global login system
- **Reason**: Simple access control via PIN per feature
- **Current Implementation**:
  - Admin: PIN/password on Admin page
  - Kasbon: Employee PIN verification
  - Other pages: No authentication required

### Admin Access
- Requires PIN/password verification
- Admin PIN stored in .env or hardcoded (check implementation)
- All admin functions protected by this verification

### Kasbon Access
- Requires employee selection + PIN verification
- PIN verified against employee record
- Wrong PIN shows error message
- PIN reset available via birthdate verification

### Other Pages
- Print Jobs: No authentication
- Cashflow: No authentication (read-only for non-admin)
- Project: No authentication
- HomeScreen: No authentication

## Data Validation Rules

### Employee Validation
- Name: Required, non-empty
- WhatsApp: Required, non-empty
- PIN: Required, 6 digits, numeric
- Birthdate: Required, YYYY-MM-DD format
- Position: Required, non-empty
- Status Crew: Required, non-empty
- Monthly Salary: Optional, numeric, >= 0
- Work Hours Per Day: Optional, numeric, > 0

### Kasbon Validation
- Amount: Required, numeric, > 0
- Payment Method: Required, either "cash" or "transfer"
- Notes: Optional
- Employee ID: Required, must exist

### Job Validation
- Customer Name: Required, non-empty
- Title: Required, non-empty
- Total Price: Required, numeric, > 0
- DP: Required, numeric, >= 0, <= Total Price
- Date: Required, YYYY-MM-DD format
- Notes: Optional

### Print Job Validation
- Date: Required, YYYY-MM-DD format
- Material: Required, non-empty
- Payment Method: Required, either "cash" or "transfer"
- Quantity: Required, numeric, > 0
- Harga Normal: Required, numeric, > 0
- Harga Diskon: Optional, numeric, >= 0, <= Harga Normal

### Project Validation
- Date: Required, YYYY-MM-DD format
- Project Name: Required, non-empty
- Payment Method: Required, either "cash" or "transfer"
- Selling Price: Required, numeric, >= 0
- Materials: At least one material required

### Stock Validation
- Name: Required, non-empty
- Quantity: Required, numeric, >= 0
- Unit: Required, non-empty
- Price: Optional, numeric, >= 0
- Usage Category: Required, default "PRINT"

### Cashflow Validation
- Date: Required, YYYY-MM-DD format
- Type: Required, either "income" or "expense"
- Category: Required, non-empty
- Amount: Required, numeric, != 0
- Description: Required, non-empty

## Financial Rules

### Currency Formatting
- All monetary values must use `formatRupiah()` utility
- Format: "Rp X.XXX.XXX" (thousand separators)
- Example: `Rp 1.500.000`, `Rp 50.000`

### Payment Methods
- Valid methods: "cash", "transfer"
- Must be selected for all financial transactions
- Display as-is in UI

### Cashflow Categories
- Income categories: Sales, Services, Other
- Expense categories: Material, Salary, Utilities, Other
- Custom categories allowed

### Kasbon Settlement
- Triggered when salary is transferred
- Admin can manually trigger via button
- All active kasbon for employee marked as settled
- Settled kasbon not counted in future totals

### Job Payment Status
- Calculated automatically: DP >= Total = Lunas
- Displayed as color-coded cards
- Can be manually overridden if needed (not currently implemented)

## Stock Rules

### Usage Categories
- PRINT: Materials used for print jobs
- PROJECT: Materials used for custom projects
- Can be extended with custom categories

### Stock Deduction
- When material used in print job, deduct from stock
- When material used in project, deduct from stock
- Custom materials in projects do not affect stock

### Low Stock Warning
- Not currently implemented
- Future enhancement consideration

## Error Handling Rules

### API Errors
- All API errors must be displayed via Toast notifications
- Error messages must be user-friendly
- Technical details should be hidden from users

### Form Validation Errors
- Display inline with form field
- Clear error message explaining what's wrong
- Highlight invalid fields

### PIN Errors
- Wrong PIN: Show error message in modal
- PIN reset failures: Show error in modal
- Keep modal open on error

### Network Errors
- Show "Connection error" message
- Allow retry
- Do not crash application

## Data Persistence Rules

### MongoDB Collections
- All data stored in MongoDB
- Use Motor AsyncIO for async operations
- Each document has unique ID (UUID)

### ID Generation
- Use `new_id()` helper function (generates UUID)
- Do not use auto-increment IDs
- Do not use MongoDB ObjectId as business ID

### Date Storage
- Store as ISO string (YYYY-MM-DD or full ISO timestamp)
- Use `now_str()` helper for current timestamp
- Always use UTC timezone

### Cleanup
- Deleted items should be removed from database (not soft delete)
- Exception: None currently
- Archive completed jobs: Not implemented

## Performance Rules

### API Calls
- Use async/await for all API calls
- Show loading indicators during API calls
- Debounce search inputs
- Cache frequently accessed data (not currently implemented)

### React Rendering
- Use `useEffect` for data loading
- Use `useState` for component state
- Avoid unnecessary re-renders
- Use `useMemo` for expensive calculations (not currently used)

### Pagination
- Not currently implemented for any list
- Consider for large datasets in future

## Security Rules

### PIN Security
- PINs stored as plain text in database (consider hashing in future)
- PIN validation on backend
- Never expose PIN in API responses

### CORS
- CORS enabled for all origins (restrict in production)
- Credentials not required

### Input Sanitization
- Backend validates all inputs
- Frontend validates before sending
- Do not trust client-side validation only

## Deployment Rules

### Environment Variables
- `MONGO_URL`: MongoDB connection string
- `DB_NAME`: Database name
- Admin password (if stored in env)
- Railway provides these automatically

### Build Process
- Frontend: `npm run build`
- Output: `dist/` folder
- Backend: No build step required

### Production URL
- Backend: `https://sistem-absen-production.up.railway.app/api`
- Frontend: Same domain (served by Railway)

## Future Enhancement Considerations

### Potential Features (Not Currently Prioritized)
- Stock low warning
- Job archive/history
- PIN hashing
- API authentication
- Pagination for large lists
- Export data to Excel/PDF
- Mobile app (Flutter)
- Offline support

### Architecture Considerations
- Keep FastAPI + MongoDB
- Keep React + Vite + Tailwind
- Do not migrate without explicit request
- Maintain current folder structure

### UI Considerations
- Keep left panel navigation
- Keep job list on right panel
- Keep color scheme
- Do not introduce global login
- Maintain responsive design
