# Backup and Recovery Procedures

## Current Project Status

### Application State
- **Frontend**: React 18.3.1 + Vite 5.3.1 (PWA)
- **Backend**: Python FastAPI (Railway production)
- **Database**: MongoDB (Railway)
- **Current Version**: Main branch, latest commit
- **PWA Features**: 
  - VitePWA plugin with service worker
  - Offline caching (NetworkFirst strategy)
  - RawBT printer integration
  - Browser notifications
  - Device Role system (backend + frontend)

### Database State
- **Collections**: employees, stock, cashflow, kasbon, print_jobs, projects, jobs, work_tracking, config, devices
- **Critical Data**: Employee records, inventory, financial records, kasbon transactions

### Deployment State
- **Frontend**: https://sistem-absen-new-production.up.railway.app
- **Backend**: https://sistem-absen-production.up.railway.app/api
- **Status**: Production, stable

---

## Git Backup Procedure

### Pre-Migration Backup

#### Step 1: Ensure Clean Working Directory
```bash
git status
# Ensure no uncommitted changes
```

#### Step 2: Create Stable Release Tag
```bash
# Tag the current stable version
git tag -a v1.0.0-pwa-stable -m "Stable PWA version before APK migration"

# Push tag to remote
git push origin v1.0.0-pwa-stable
```

#### Step 3: Create Pre-Migration Branch
```bash
# Create backup branch
git checkout -b backup/pwa-stable

# Push to remote
git push origin backup/pwa-stable

# Return to main
git checkout main
```

#### Step 4: Create Migration Branch
```bash
# Create branch for APK migration
git checkout -b feature/apk-migration

# Push to remote
git push origin feature/apk-migration
```

### Folder Backup Strategy

#### Step 1: Create Backup Directory
```bash
# Create backup folder in project root
mkdir -p backups/pwa-stable-$(date +%Y%m%d)
```

#### Step 2: Backup Critical Files
```bash
# Copy entire frontend-web directory
cp -r frontend-web backups/pwa-stable-$(date +%Y%m%d)/

# Copy backend directory
cp -r backend backups/pwa-stable-$(date +%Y%m%d)/

# Copy configuration files
cp .env.example backups/pwa-stable-$(date +%Y%m%d)/
cp package.json backups/pwa-stable-$(date +%Y%m%d)/
```

#### Step 3: Backup Database (Optional - Recommended)
```bash
# Export MongoDB data
mongodump --uri="MONGODB_URI" --out backups/pwa-stable-$(date +%Y%m%d)/mongodb

# Or use Railway CLI
railway db dump > backups/pwa-stable-$(date +%Y%m%d)/railway-db.dump
```

---

## Stable Version Tagging Procedure

### Tag Naming Convention
- **Format**: `vX.Y.Z-state`
- **States**: `pwa-stable`, `apk-phase1`, `apk-phase2`, `apk-production`
- **Example**: `v1.0.0-pwa-stable`, `v1.0.1-apk-phase1`

### Pre-Migration Tag
```bash
# Tag stable PWA version
git tag -a v1.0.0-pwa-stable -m "Stable PWA version - all features working

- PWA with VitePWA
- RawBT printer integration
- Browser notifications
- Device Role system
- All workflows functional"
```

### Phase Checkpoint Tags
```bash
# After Phase 1: Capacitor Setup
git tag -a v1.0.1-apk-phase1 -m "Capacitor setup complete

- Capacitor installed
- Android project created
- Basic build working"

# After Phase 2: Permissions
git tag -a v1.0.2-apk-phase2 -m "Android permissions configured"

# After Phase 3: Printer Integration
git tag -a v1.0.3-apk-phase3 -m "Printer integration complete

- USB/Bluetooth access working
- Cash drawer working"

# After Phase 4: Device Role Verification
git tag -a v1.0.4-apk-phase4 -m "Device Role verified

- All features working in APK
- Ready for FCM integration"

# After Phase 5: FCM Integration
git tag -a v1.1.0-apk-production -m "APK production ready

- FCM notifications working
- All features verified
- Ready for Google Play"
```

---

## Rollback Procedure

### Scenario 1: Migration Fails Early (Phase 1-2)

#### Immediate Rollback
```bash
# 1. Switch to stable branch
git checkout backup/pwa-stable

# 2. Verify PWA works
npm run build
npm run preview

# 3. Deploy PWA to Railway (if needed)
# Upload dist/ folder to Railway

# 4. Delete migration branch (optional)
git branch -D feature/apk-migration
git push origin --delete feature/apk-migration
```

### Scenario 2: Migration Fails Mid-Way (Phase 3-4)

#### Rollback to Last Checkpoint
```bash
# 1. Identify last working phase tag
git tag -l

# 2. Checkout last stable tag
git checkout v1.0.2-apk-phase2

# 3. Create rollback branch
git checkout -b rollback/failed-migration

# 4. Document failure
# Create ROLLBACK_FAILURE.md with details of what failed
```

### Scenario 3: APK Production Issues

#### Rollback to PWA
```bash
# 1. Switch to PWA stable branch
git checkout backup/pwa-stable

# 2. Rebuild PWA
cd frontend-web
npm run build

# 3. Deploy to Railway
# Upload dist/ to Railway

# 4. Notify users to use PWA version
# Update app to redirect to PWA URL
```

---

## Recovery Steps

### Database Recovery
```bash
# Restore from MongoDB dump
mongorestore --uri="MONGODB_URI" backups/pwa-stable-YYYYMMDD/mongodb

# Or restore via Railway CLI
railway db restore < backups/pwa-stable-YYYYMMDD/railway-db.dump
```

### Code Recovery
```bash
# Restore from backup folder
rm -rf frontend-web backend
cp -r backups/pwa-stable-YYYYMMDD/frontend-web .
cp -r backups/pwa-stable-YYYYMMDD/backend .

# Or restore from Git
git checkout backup/pwa-stable
```

### Environment Recovery
```bash
# Restore .env from backup
cp backups/pwa-stable-YYYYMMDD/.env.example .env

# Update environment variables as needed
```

---

## Migration Checkpoints

### Pre-Migration Checklist
- [ ] All PWA features tested and working
- [ ] Database backup created
- [ ] Git tag created (v1.0.0-pwa-stable)
- [ ] Backup branch created (backup/pwa-stable)
- [ ] Folder backup created
- [ ] Environment variables documented
- [ ] Deployment credentials secured
- [ ] Team notified of migration timeline

### Phase 1 Checkpoint: Capacitor Setup
- [ ] Capacitor installed
- [ ] Android project created
- [ ] Basic build successful
- [ ] App installs on device/emulator
- [ ] All existing features work in APK
- [ ] No UI changes introduced
- [ ] Git tag created (v1.0.1-apk-phase1)

### Phase 2 Checkpoint: Android Permissions
- [ ] All required permissions added
- [ ] Runtime permissions requested
- [ ] Camera works
- [ ] USB/Bluetooth permissions work
- [ ] Storage permissions work
- [ ] Git tag created (v1.0.2-apk-phase2)

### Phase 3 Checkpoint: Printer Integration
- [ ] USB/Bluetooth plugin installed
- [ ] Printer connects successfully
- [ ] Receipt printing works
- [ ] Cash drawer opens
- [ ] Error handling implemented
- [ ] Fallback to RawBT (if needed)
- [ ] Git tag created (v1.0.3-apk-phase3)

### Phase 4 Checkpoint: Device Role Verification
- [ ] Device Role system works in APK
- [ ] Device Settings UI works
- [ ] Device registration works
- [ ] All existing workflows tested:
  - [ ] Kasbon workflow
  - [ ] Print workflow
  - [ ] Project workflow
  - [ ] Stock workflow
  - [ ] Admin workflow
- [ ] No business logic changes
- [ ] Git tag created (v1.0.4-apk-phase4)

### Phase 5 Checkpoint: FCM Integration
- [ ] Firebase project created
- [ ] Firebase config added
- [ ] FCM plugin installed
- [ ] Device token registration works
- [ ] Push notifications received
- [ ] Background notifications work
- [ ] In-app notifications work
- [ ] Git tag created (v1.1.0-apk-production)

---

## Testing Checklist Before Migration

### PWA Functionality Tests
- [ ] HomeScreen loads correctly
- [ ] Left panel navigation works
- [ ] Right panel job list works
- [ ] PIN authentication works
- [ ] Employee management works
- [ ] Stock management works
- [ ] Cashflow management works
- [ ] Kasbon workflow works
- [ ] Print workflow works (with RawBT)
- [ ] Cash drawer works
- [ ] Project management works
- [ ] Admin settings work
- [ ] Device Role settings work
- [ ] Browser notifications work
- [ ] Service worker caching works
- [ ] Offline mode works

### Performance Tests
- [ ] Page load time < 3 seconds
- [ ] No console errors
- [ ] Memory usage acceptable
- [ ] No memory leaks

### Cross-Browser Tests
- [ ] Chrome (latest)
- [ ] Safari (iOS)
- [ ] Samsung Internet
- [ ] Firefox (Android)

### Database Tests
- [ ] All CRUD operations work
- [ ] Data integrity maintained
- [ ] No orphaned records
- [ ] Indexes working correctly

---

## Testing Checklist After Migration

### APK Installation Tests
- [ ] APK installs successfully
- [ ] App launches without crash
- [ ] App icon appears correctly
- [ ] App name displays correctly
- [ ] Version number correct

### UI/UX Tests
- [ ] HomeScreen layout unchanged
- [ ] Left panel navigation unchanged
- [ ] Right panel job list unchanged
- [ ] All page layouts unchanged
- [ ] Responsive design works
- [ ] Touch gestures work
- [ ] Keyboard behavior acceptable
- [ ] Scroll behavior correct

### Feature Tests
- [ ] PIN authentication works
- [ ] Employee management works
- [ ] Stock management works
- [ ] Cashflow management works
- [ ] Kasbon workflow unchanged
- [ ] Print workflow works (native)
- [ ] Cash drawer works (native)
- [ ] Project workflow unchanged
- [ ] Admin workflow unchanged
- [ ] Device Role system works

### Hardware Tests
- [ ] Camera access works (employee photos)
- [ ] USB printer connects
- [ ] Bluetooth printer connects
- [ ] Receipt prints correctly
- [ ] Cash drawer opens
- [ ] Vibration works

### Permission Tests
- [ ] Camera permission requested
- [ ] USB permission requested
- [ ] Bluetooth permission requested
- [ ] Storage permission requested
- [ ] Notification permission requested
- [ ] Permissions granted/denied handled

### Notification Tests (Phase 5)
- [ ] FCM token obtained
- [ ] Device registered with FCM token
- [ ] Push notification received
- [ ] Background notification received
- [ ] Notification tap works
- [ ] In-app notification displays

### Performance Tests
- [ ] App startup time < 3 seconds
- [ ] Page transitions smooth
- [ ] No ANR (Application Not Responding)
- [ ] Memory usage < 200MB
- [ ] Battery usage acceptable
- [ ] No crashes in 30-minute stress test

### Deployment Tests
- [ ] Signed APK builds
- [ ] APK size acceptable (< 50MB)
- [ ] Google Play upload works
- [ ] Store listing correct
- [ ] Download and install from store works

---

## Emergency Contacts

### Team Members
- **Developer**: [Contact]
- **Backend Support**: [Contact]
- **Database Admin**: [Contact]

### External Services
- **Railway Support**: https://railway.app/support
- **Firebase Support**: https://firebase.google.com/support
- **Google Play Support**: https://support.google.com/googleplay/android-developer

---

## Documentation Updates

### Update This Document After
- Each migration phase completion
- Each rollback procedure execution
- Each recovery procedure execution
- Major issues encountered and resolved

### Version History
- **v1.0**: Initial backup and recovery procedures
- **v1.1**: Added Phase 5 FCM checkpoint
- **vX.Y**: [Future updates]

---

## Summary

**Golden Rule**: Never delete the `backup/pwa-stable` branch or the `v1.0.0-pwa-stable` tag until APK migration is fully complete and production-stable for at least 1 month.

**Rollback Strategy**: Always have a known-good checkpoint to rollback to. Never proceed to next phase without completing current phase checkpoint.

**Testing**: Test thoroughly at each phase. Do not skip testing checklists.
