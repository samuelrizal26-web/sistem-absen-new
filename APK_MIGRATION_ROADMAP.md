# APK Migration Roadmap

## Overview

This roadmap outlines the phased approach to migrate the PWA application to an Android Wrapper APK using Capacitor.

**Total Estimated Time**: 5.5-8.5 days

**Migration Principle**: Wrap existing application, do not rewrite.

---

## Phase 0: Pre-Migration Preparation

### Objective
Create stable backup and checkpoint before any changes.

### Tasks

#### 0.1 Verify PWA Stability
- [ ] Test all PWA features
- [ ] Verify printer works with RawBT
- [ ] Verify cash drawer works
- [ ] Verify all workflows functional
- [ ] Check for console errors
- [ ] Document any existing issues

#### 0.2 Create Git Backup
```bash
# Create stable tag
git tag -a v1.0.0-pwa-stable -m "Stable PWA version before APK migration"
git push origin v1.0.0-pwa-stable

# Create backup branch
git checkout -b backup/pwa-stable
git push origin backup/pwa-stable
git checkout main
```

#### 0.3 Create Folder Backup
```bash
mkdir -p backups/pwa-stable-$(date +%Y%m%d)
cp -r frontend-web backups/pwa-stable-$(date +%Y%m%d)/
cp -r backend backups/pwa-stable-$(date +%Y%m%d)/
cp .env.example backups/pwa-stable-$(date +%Y%m%d)/
```

#### 0.4 Database Backup
```bash
# Export MongoDB
mongodump --uri="MONGODB_URI" --out backups/pwa-stable-$(date +%Y%m%d)/mongodb
```

#### 0.5 Create Migration Branch
```bash
git checkout -b feature/apk-migration
git push origin feature/apk-migration
```

#### 0.6 Documentation Review
- [ ] Review BACKUP_AND_RECOVERY.md
- [ ] Review APK_MIGRATION_RULES.md
- [ ] Review PWA_TO_APK_MIGRATION.md
- [ ] Review DEVICE_ROLE_SYSTEM.md

### Deliverables
- [ ] Git tag: v1.0.0-pwa-stable
- [ ] Git branch: backup/pwa-stable
- [ ] Git branch: feature/apk-migration
- [ ] Folder backup: backups/pwa-stable-YYYYMMDD
- [ ] Database backup

### Exit Criteria
✅ All backups created
✅ PWA verified stable
✅ Documentation reviewed
✅ Migration branch ready

**Estimated Time**: 2-3 hours

---

## Phase 1: Capacitor Setup

### Objective
Install and configure Capacitor to wrap the existing React application.

### Tasks

#### 1.1 Install Capacitor Dependencies
```bash
npm install @capacitor/core @capacitor/cli
npm install @capacitor/android
npm install @capacitor/vite-plugin
```

#### 1.2 Initialize Capacitor
```bash
npx cap init
# App name: LB.ADV
# App ID: com.labalaba.advertising
# Web dir: dist
```

#### 1.3 Update vite.config.js
- Add Capacitor Vite plugin
- Configure app name and ID
- Remove VitePWA plugin
- Test build still works

#### 1.4 Add Android Platform
```bash
npx cap add android
```

#### 1.5 Sync Capacitor
```bash
npm run build
npx cap sync android
```

#### 1.6 Test Android Build
```bash
npx cap open android
# Open in Android Studio
# Run on emulator or device
```

#### 1.7 Verify Functionality
- [ ] App launches without crash
- [ ] HomeScreen loads
- [ ] Navigation works
- [ ] All pages accessible
- [ ] No console errors
- [ ] Touch gestures work

#### 1.8 Create Checkpoint
```bash
git add .
git commit -m "Phase 1: Capacitor setup complete"
git tag -a v1.0.1-apk-phase1 -m "Capacitor setup complete"
git push origin feature/apk-migration --tags
```

### Deliverables
- [ ] Capacitor installed
- [ ] Android project created
- [ ] Basic APK builds successfully
- [ ] App installs and runs on device/emulator
- [ ] Git tag: v1.0.1-apk-phase1

### Exit Criteria
✅ Capacitor configured
✅ Android project created
✅ APK builds and runs
✅ All existing features work in APK
✅ No UI changes introduced

**Estimated Time**: 3-4 hours

---

## Phase 2: Android Permissions

### Objective
Configure Android permissions for hardware access.

### Tasks

#### 2.1 Update AndroidManifest.xml
Add required permissions:
- [ ] INTERNET
- [ ] ACCESS_NETWORK_STATE
- [ ] WRITE_EXTERNAL_STORAGE
- [ ] READ_EXTERNAL_STORAGE
- [ ] CAMERA
- [ ] USB_PERMISSION
- [ ] BLUETOOTH
- [ ] BLUETOOTH_ADMIN
- [ ] BLUETOOTH_CONNECT
- [ ] BLUETOOTH_SCAN
- [ ] BLUETOOTH_ADVERTISE
- [ ] WAKE_LOCK
- [ ] VIBRATE
- [ ] POST_NOTIFICATIONS
- [ ] FOREGROUND_SERVICE

#### 2.2 Configure Runtime Permissions
- [ ] Install @capacitor/android-permissions (if needed)
- [ ] Add permission request logic
- [ ] Handle permission granted
- [ ] Handle permission denied
- [ ] Handle permission "never ask again"

#### 2.3 Test Permissions
- [ ] Test camera permission
- [ ] Test USB permission
- [ ] Test Bluetooth permission
- [ ] Test storage permission
- [ ] Test notification permission

#### 2.4 Verify No Impact
- [ ] App still launches
- [ ] Features still work
- [ ] No permission errors
- [ ] No UI changes

#### 2.5 Create Checkpoint
```bash
git add .
git commit -m "Phase 2: Android permissions configured"
git tag -a v1.0.2-apk-phase2 -m "Android permissions configured"
git push origin feature/apk-migration --tags
```

### Deliverables
- [ ] AndroidManifest.xml updated
- [ ] Runtime permission handling added
- [ ] All permissions tested
- [ ] Git tag: v1.0.2-apk-phase2

### Exit Criteria
✅ All permissions configured
✅ Runtime permissions requested
✅ No permission errors
✅ App functionality unchanged

**Estimated Time**: 2-3 hours

---

## Phase 3: Printer and Cash Drawer Integration

### Objective
Replace RawBT URL scheme with native USB/Bluetooth access.

### Tasks

#### 3.1 Install Native Plugins
```bash
npm install @capacitor-community/usb-serial
npm install @capacitor-community/bluetooth-le
```

#### 3.2 Test Hardware Access
- [ ] Test USB device detection
- [ ] Test Bluetooth device detection
- [ ] Test USB connection
- [ ] Test Bluetooth connection

#### 3.3 Update Printer Integration
- [ ] Modify src/utils/rawbt.js
- [ ] Replace RawBT URL scheme with USB serial
- [ ] Implement Bluetooth fallback
- [ ] Keep ESC/POS commands unchanged
- [ ] Keep receipt formatting unchanged

#### 3.4 Update Cash Drawer Integration
- [ ] Modify openCashDrawer() function
- [ ] Replace RawBT with USB serial
- [ ] Keep ESC/POS command unchanged

#### 3.5 Add Error Handling
- [ ] Handle device not found
- [ ] Handle connection failure
- [ ] Handle print failure
- [ ] Add user-friendly error messages
- [ ] Add retry logic

#### 3.6 Test Printing
- [ ] Test USB printer connection
- [ ] Test Bluetooth printer connection
- [ ] Test receipt printing
- [ ] Test receipt formatting
- [ ] Test logo printing
- [ ] Test cash drawer open

#### 3.7 Add Fallback (Optional)
- [ ] Keep RawBT as fallback if native fails
- [ ] Add fallback trigger logic
- [ ] Test fallback mechanism

#### 3.8 Verify No Workflow Changes
- [ ] Kasbon workflow unchanged
- [ ] Print workflow unchanged
- [ ] Receipt layout unchanged
- [ ] ESC/POS commands unchanged

#### 3.9 Create Checkpoint
```bash
git add .
git commit -m "Phase 3: Printer and cash drawer integration complete"
git tag -a v1.0.3-apk-phase3 -m "Printer integration complete"
git push origin feature/apk-migration --tags
```

### Deliverables
- [ ] USB/Bluetooth plugins installed
- [ ] Printer integration working
- [ ] Cash drawer integration working
- [ ] Error handling implemented
- [ ] Git tag: v1.0.3-apk-phase3

### Exit Criteria
✅ Printer works without RawBT
✅ Cash drawer works without RawBT
✅ ESC/POS workflow unchanged
✅ Error handling robust
✅ No business logic changes

**Estimated Time**: 8-12 hours (High Risk - Hardware-specific)

---

## Phase 4: Device Role Verification

### Objective
Verify Device Role system works correctly in APK environment.

### Tasks

#### 4.1 Verify Device ID Generation
- [ ] localStorage works in APK
- [ ] Device ID generation works
- [ ] Device ID persists

#### 4.2 Verify Device Registration
- [ ] Device registration API works
- [ ] Device update API works
- [ ] Device delete API works
- [ ] Device list API works

#### 4.3 Verify Device Settings UI
- [ ] Device Settings modal opens
- [ ] Device registration works
- [ ] Device role selection works
- [ ] Device edit works
- [ ] Device delete works

#### 4.4 Verify All Workflows
- [ ] Kasbon workflow
- [ ] Print workflow
- [ ] Project workflow
- [ ] Stock workflow
- [ ] Admin workflow
- [ ] Employee workflow

#### 4.5 Verify No Changes
- [ ] No UI changes introduced
- [ ] No business logic changes
- [ ] No authentication changes
- [ ] Device Role architecture unchanged

#### 4.6 Stress Testing
- [ ] 30-minute stress test
- [ ] No crashes
- [ ] No memory leaks
- [ ] Performance acceptable

#### 4.7 Create Checkpoint
```bash
git add .
git commit -m "Phase 4: Device Role verification complete"
git tag -a v1.0.4-apk-phase4 -m "Device Role verified"
git push origin feature/apk-migration --tags
```

### Deliverables
- [ ] Device Role system verified
- [ ] All workflows tested
- [ ] No regressions found
- [ ] Git tag: v1.0.4-apk-phase4

### Exit Criteria
✅ Device Role system works
✅ All features functional
✅ No regressions
✅ No rule violations

**Estimated Time**: 4-6 hours

---

## Phase 5: Firebase Notification Integration

### Objective
Implement Firebase Cloud Messaging for push notifications.

### Tasks

#### 5.1 Firebase Setup
- [ ] Create Firebase project
- [ ] Obtain Firebase config
- [ ] Generate VAPID key
- [ ] Download service account key

#### 5.2 Backend Integration
- [ ] Install firebase-admin in backend
- [ ] Initialize Firebase Admin SDK
- [ ] Update device schema (add fcm_token field)
- [ ] Implement actual FCM sending
- [ ] Add FCM token registration endpoint

#### 5.3 Frontend Integration
- [ ] Install firebase package
- [ ] Add Firebase config
- [ ] Initialize Firebase
- [ ] Implement FCM token request
- [ ] Implement FCM token registration
- [ ] Implement notification handler

#### 5.4 Update Device Registration
- [ ] Modify device registration to include FCM token
- [ ] Update DeviceSettingsModal
- [ ] Test FCM token registration

#### 5.5 Test Notifications
- [ ] Test kasbon submit notification (to OWNER)
- [ ] Test kasbon approve notification (to STORE_TABLET)
- [ ] Test background notifications
- [ ] Test notification tap
- [ ] Test in-app notifications

#### 5.6 Replace Browser Notifications
- [ ] Replace Notification API with FCM
- [ ] Update notification calls
- [ ] Remove browser notification code

#### 5.7 Verify No Architecture Changes
- [ ] Device Role architecture unchanged
- [ ] Notification routing unchanged
- [ ] No business logic changes

#### 5.8 Create Checkpoint
```bash
git add .
git commit -m "Phase 5: Firebase notification integration complete"
git tag -a v1.1.0-apk-production -m "APK production ready"
git push origin feature/apk-migration --tags
```

### Deliverables
- [ ] Firebase configured
- [ ] FCM implemented
- [ ] Notifications working
- [ ] Browser notifications replaced
- [ ] Git tag: v1.1.0-apk-production

### Exit Criteria
✅ FCM notifications working
✅ Background notifications working
✅ Device Role architecture unchanged
✅ Ready for production

**Estimated Time**: 6-10 hours

---

## Phase 6: Production Deployment

### Objective
Deploy APK to production environment.

### Tasks

#### 6.1 Build Signed APK
- [ ] Generate keystore
- [ ] Configure signing
- [ ] Build release APK
- [ ] Build AAB (for Play Store)

#### 6.2 Google Play Setup
- [ ] Create Google Play Console account
- [ ] Create app listing
- [ ] Upload screenshots
- [ ] Write description
- [ ] Set pricing (free)

#### 6.3 Submit for Review
- [ ] Upload signed APK/AAB
- [ ] Complete content rating
- [ ] Submit for review
- [ ] Wait for approval

#### 6.4 Alternative: Direct APK Distribution
- [ ] Host APK on website
- [ ] Create download page
- [ ] Implement version check
- [ ] Deploy to users

#### 6.5 Rollback Plan
- [ ] Keep PWA version live
- [ ] Monitor APK issues
- [ ] Prepare rollback procedure

#### 6.6 Create Production Tag
```bash
git tag -a v1.1.0-production -m "APK deployed to production"
git push origin feature/apk-migration --tags
```

### Deliverables
- [ ] Signed APK built
- [ ] Google Play submission (or APK distribution)
- [ ] Production deployment
- [ ] Rollback plan ready

### Exit Criteria
✅ APK deployed
✅ Users can download
✅ Rollback plan ready

**Estimated Time**: 4-6 hours

---

## Risk Management

### High Risk Phases
- **Phase 3** (Printer Integration): Hardware-specific, may need multiple iterations
- **Phase 5** (Firebase): Configuration complexity

### Mitigation Strategies
- **Phase 3**: Test with actual hardware early, keep RawBT as fallback
- **Phase 5**: Follow Firebase documentation, test notification flow

### Rollback Triggers
- Any phase fails checkpoint
- Rule violation detected
- Critical regression found
- Hardware incompatibility

---

## Success Criteria

### Overall Success
- [ ] APK builds successfully
- [ ] All existing features work
- [ ] Printer works without RawBT
- [ ] Cash drawer works without RawBT
- [ ] FCM notifications work
- [ ] No UI changes
- [ ] No business logic changes
- [ ] Deployed to production

### Per Phase Success
Each phase must complete its exit criteria before proceeding.

---

## Timeline Summary

| Phase | Description | Estimated Time |
|-------|-------------|----------------|
| 0 | Pre-Migration Preparation | 2-3 hours |
| 1 | Capacitor Setup | 3-4 hours |
| 2 | Android Permissions | 2-3 hours |
| 3 | Printer/Cash Drawer | 8-12 hours |
| 4 | Device Role Verification | 4-6 hours |
| 5 | Firebase Integration | 6-10 hours |
| 6 | Production Deployment | 4-6 hours |
| **Total** | | **29-44 hours (3.5-5.5 days)** |

---

## Notes

- Each phase must complete before proceeding to next
- Checkpoints must be created after each phase
- Rollback if any phase fails
- Document all issues encountered
- Update documentation as needed
