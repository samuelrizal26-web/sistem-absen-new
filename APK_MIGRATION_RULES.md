# APK Migration Rules

## Migration Purpose

**This migration is ONLY to change the platform from PWA to Android Wrapper APK using Capacitor.**

This is **NOT** an application redesign.

---

## NEVER CHANGE - UI

### HomeScreen Layout
❌ **DO NOT** redesign HomeScreen layout
✅ **DO** keep existing grid/card layout
✅ **DO** keep existing color scheme
✅ **DO** keep existing spacing and sizing
✅ **DO** keep existing icons

### Navigation Structure
❌ **DO NOT** change left panel navigation
✅ **DO** keep left panel navigation menu
✅ **DO** keep navigation menu items order
✅ **DO** keep navigation menu icons
✅ **DO** keep navigation menu labels

### Job List
❌ **DO NOT** change right panel job list
✅ **DO** keep job list layout
✅ **DO** keep job card design
✅ **DO** keep job filtering
✅ **DO** keep job sorting

### Page Layouts
❌ **DO NOT** redesign existing page layouts
✅ **DO** keep HomeScreen layout
✅ **DO** keep EmployeePage layout
✅ **DO** keep StockPage layout
✅ **DO** keep CashflowPage layout
✅ **DO** keep ProjectPage layout
✅ **DO** keep AdminPage layout

### Color Scheme
❌ **DO NOT** change color scheme
✅ **DO** keep blue theme (#0A4D68)
✅ **DO** keep light blue background (#EAFBFF)
✅ **DO** keep existing accent colors

### Typography
❌ **DO NOT** change fonts
✅ **DO** keep existing font families
✅ **DO** keep existing font sizes
✅ **DO** keep existing font weights

### Components
❌ **DO NOT** redesign components
✅ **DO** keep Button component design
✅ **DO** keep Input component design
✅ **DO** keep Modal component design
✅ **DO** keep Card component design

---

## NEVER CHANGE - Business Logic

### Kasbon Workflow
❌ **DO NOT** modify Kasbon workflow
✅ **DO** keep kasbon creation flow
✅ **DO** keep kasbon approval flow
✅ **DO** keep kasbon settlement flow
✅ **DO** keep kasbon validation logic

### Print Workflow
❌ **DO NOT** modify Print workflow
✅ **DO** keep receipt generation logic
✅ **DO** keep receipt formatting
✅ **DO** keep print trigger flow
✅ **DO** keep ESC/POS commands

### Project Workflow
❌ **DO NOT** modify Project workflow
✅ **DO** keep project creation flow
✅ **DO** keep project editing flow
✅ **DO** keep project status flow
✅ **DO** keep project archiving

### Stock Workflow
❌ **DO NOT** modify Stock workflow
✅ **DO** keep stock entry flow
✅ **DO** keep stock adjustment flow
✅ **DO** keep stock calculation logic
✅ **DO** keep stock validation

### Admin Workflow
❌ **DO NOT** modify Admin workflow
✅ **DO** keep PIN authentication flow
✅ **DO** keep settings management flow
✅ **DO** keep employee management flow
✅ **DO** keep configuration flow

### Data Validation
❌ **DO NOT** modify validation rules
✅ **DO** keep existing form validations
✅ **DO** keep existing data constraints
✅ **DO** keep existing error messages

---

## NEVER CHANGE - Authentication

### Global Login System
❌ **DO NOT** add global login system
❌ **DO NOT** add login screen
❌ **DO NOT** add logout functionality
❌ **DO NOT** add session management
✅ **DO** keep per-feature PIN authentication

### Email/Password System
❌ **DO NOT** add email authentication
❌ **DO NOT** add password authentication
❌ **DO NOT** add password reset
❌ **DO NOT** add email verification
✅ **DO** keep existing PIN-based authentication

### JWT Authentication
❌ **DO NOT** add JWT tokens
❌ **DO NOT** add token refresh
❌ **DO NOT** add token expiration
❌ **DO NOT** add token validation
✅ **DO** keep existing state-based authentication

### Device Role System
✅ **DO** keep Device Role architecture
✅ **DO** keep NONE/STORE_TABLET/OWNER roles
✅ **DO** keep device registration flow
✅ **DO** keep device management UI
✅ **DO** keep role-based notification routing

---

## NEVER CHANGE - Notifications

### Device Role Architecture
✅ **DO** keep Device Role system unchanged
✅ **DO** keep role definitions (NONE, STORE_TABLET, OWNER)
✅ **DO** keep device ID generation (UUID in localStorage)
✅ **DO** keep device registration API
✅ **DO** keep device management endpoints

### Firebase Implementation
⏸️ **POSTPONE** Firebase implementation until after APK migration
❌ **DO NOT** implement Firebase Cloud Messaging during this migration
❌ **DO NOT** add Firebase SDK during this migration
❌ **DO NOT** modify notification logic during this migration
✅ **DO** keep placeholder notification logging
✅ **DO** keep existing browser notifications

### Notification Flow
❌ **DO NOT** change notification routing logic
✅ **DO** keep kasbon submit → OWNER notification
✅ **DO** keep kasbon approve → STORE_TABLET notification
✅ **DO** keep notification helper function

---

## NEVER CHANGE - Printing

### ESC/POS Workflow
✅ **DO** keep existing ESC/POS workflow
✅ **DO** keep receipt formatting logic
✅ **DO** keep logo printing
✅ **DO** keep line formatting
✅ **DO** keep character encoding

### Printer Communication
✅ **DO** replace RawBT URL scheme with native USB/Bluetooth
❌ **DO NOT** change ESC/POS commands
❌ **DO NOT** change receipt layout
❌ **DO NOT** change print data format

### Cash Drawer Functionality
✅ **DO** keep cash drawer ESC/POS command
✅ **DO** keep cash drawer trigger logic
✅ **DO** replace RawBT with native USB serial
❌ **DO NOT** change drawer command

### Receipt Generation
❌ **DO NOT** modify receipt generation logic
✅ **DO** keep receipt header
✅ **DO** keep receipt body
✅ **DO** keep receipt footer
✅ **DO** keep receipt calculations

---

## NEVER CHANGE - Architecture

### React/Vite Architecture
❌ **DO NOT** replace React
❌ **DO NOT** replace Vite
❌ **DO NOT** change build system
❌ **DO NOT** change bundler
✅ **DO** keep React 18.3.1
✅ **DO** keep Vite 5.3.1
✅ **DO** keep existing folder structure

### Component Structure
❌ **DO NOT** redesign component hierarchy
✅ **DO** keep existing component organization
✅ **DO** keep existing file structure
✅ **DO** keep existing naming conventions

### State Management
❌ **DO NOT** add Redux
❌ **DO NOT** add Context API
❌ **DO NOT** add Zustand
✅ **DO** keep existing React hooks (useState, useEffect)
✅ **DO** keep existing state patterns

### Routing
❌ **DO NOT** change routing library
✅ **DO** keep React Router DOM 6.24.0
✅ **DO** keep existing route structure
✅ **DO** keep existing navigation logic

### Styling
❌ **DO NOT** replace TailwindCSS
❌ **DO NOT** add CSS-in-JS
❌ **DO NOT** add Styled Components
✅ **DO** keep TailwindCSS 3.4.4
✅ **DO** keep existing utility classes
✅ **DO** keep existing custom styles

### API Layer
❌ **DO NOT** change API structure
✅ **DO** keep existing api.js
✅ **DO** keep existing request function
✅ **DO** keep existing error handling

---

## Migration Principle

### Wrap the Existing Application
✅ **DO** wrap existing React app in Capacitor
✅ **DO** add Capacitor configuration
✅ **DO** add Android project
✅ **DO** add native plugins
❌ **DO NOT** rewrite the application

### Do Not Rewrite the Application
❌ **DO NOT** rewrite React components
❌ **DO NOT** rewrite business logic
❌ **DO NOT** rewrite API calls
❌ **DO NOT** rewrite state management
✅ **DO** keep existing codebase intact

### Do Not Replace React/Vite Architecture
❌ **DO NOT** migrate to Flutter
❌ **DO NOT** migrate to React Native
❌ **DO NOT** migrate to Native Android
✅ **DO** keep existing React/Vite stack

### Do Not Redesign Navigation
❌ **DO NOT** change navigation pattern
❌ **DO NOT** add bottom navigation
❌ **DO NOT** add drawer navigation
✅ **DO** keep left panel navigation

### Do Not Redesign UI
❌ **DO NOT** change UI library
❌ **DO NOT** change design system
❌ **DO NOT** change component library
✅ **DO** keep existing UI design

---

## ALLOWED CHANGES

### Capacitor Configuration
✅ **DO** add capacitor.config.json
✅ **DO** add @capacitor/core
✅ **DO** add @capacitor/android
✅ **DO** add @capacitor/vite-plugin

### Native Plugins
✅ **DO** add @capacitor/camera (if needed)
✅ **DO** add @capacitor-community/usb-serial (printer)
✅ **DO** add @capacitor-community/bluetooth-le (printer)
✅ **DO** add @capacitor/keyboard (if needed)
✅ **DO** add @capacitor/status-bar (if needed)

### Build Configuration
✅ **DO** modify vite.config.js to add Capacitor plugin
✅ **DO** remove vite-plugin-pwa (replace with Capacitor)
✅ **DO** add Android project configuration

### Printer Integration
✅ **DO** replace RawBT URL scheme with native USB/Bluetooth
✅ **DO** modify src/utils/rawbt.js to use native plugins
✅ **DO** add error handling for native printer connection

### Permissions
✅ **DO** add Android permissions to AndroidManifest.xml
✅ **DO** add runtime permission requests
✅ **DO** add permission error handling

### Minor UI Adjustments
✅ **DO** adjust keyboard handling (if needed)
✅ **DO** adjust viewport meta tag (if needed)
✅ **DO** adjust status bar color (if needed)
❌ **DO NOT** change layout or design

### Dependencies
✅ **DO** update package.json with Capacitor dependencies
✅ **DO** remove vite-plugin-pwa from dependencies
❌ **DO NOT** update React version
❌ **DO NOT** update other dependencies unless necessary

---

## VIOLATION CONSEQUENCES

If any of these rules are violated:
1. **Stop migration immediately**
2. **Rollback to last checkpoint**
3. **Document the violation**
4. **Review with team**
5. **Re-evaluate migration approach**

---

## Verification Checklist

Before proceeding to next migration phase, verify:

- [ ] No UI changes made
- [ ] No business logic changes made
- [ ] No authentication changes made
- [ ] No notification architecture changes made
- [ ] No printing workflow changes made
- [ ] No architecture changes made
- [ ] Only Capacitor-related changes made
- [ ] Only native plugin changes made
- [ ] Only build configuration changes made

---

## Golden Rule

**If you're about to change something and it's not in the "ALLOWED CHANGES" section, STOP and ask for approval.**
