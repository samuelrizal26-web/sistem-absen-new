# Stable Checkpoint Recommendation

## Recommended Git Tag Name

```
v1.0.0-pwa-stable
```

**Rationale:**
- Version 1.0.0: Initial stable release
- PWA suffix: Indicates platform type
- Stable suffix: Indicates this is a known-good state

**Tag Message:**
```
Stable PWA version before APK migration

- PWA with VitePWA
- RawBT printer integration
- Browser notifications
- Device Role system
- All workflows functional
- Production-ready
```

---

## Branch Strategy

### Main Branches

#### `main` (Protected)
- **Purpose**: Production PWA version
- **Status**: Always stable
- **Protection**: Require pull requests, no direct pushes
- **Current**: v1.0.0-pwa-stable

#### `backup/pwa-stable` (Protected)
- **Purpose**: Immutable backup of PWA version
- **Status**: Never modified after creation
- **Protection**: No pushes allowed
- **Created from**: main at v1.0.0-pwa-stable

#### `feature/apk-migration`
- **Purpose**: APK migration work
- **Status**: Active development
- **Protection**: Standard branch
- **Created from**: main at v1.0.0-pwa-stable

### Branch Workflow

```
main (v1.0.0-pwa-stable)
  ↓
backup/pwa-stable (immutable)
  ↓
feature/apk-migration (development)
  ↓
main (v1.1.0-apk-production) [after successful migration]
```

### Merge Strategy

#### After Successful Migration
```bash
# Merge feature/apk-migration to main
git checkout main
git merge feature/apk-migration
git tag -a v1.1.0-apk-production -m "APK production release"
git push origin main --tags
```

#### If Migration Fails
```bash
# Delete migration branch
git branch -D feature/apk-migration
git push origin --delete feature/apk-migration

# Return to main (PWA stable)
git checkout main
```

---

## Folder Backup Strategy

### Backup Directory Structure

```
sistem_absen_flutter_v2/
├── backups/
│   ├── pwa-stable-20240702/
│   │   ├── frontend-web/
│   │   ├── backend/
│   │   ├── .env.example
│   │   ├── package.json
│   │   └── mongodb/
│   │       ├── employees.bson
│   │       ├── stock.bson
│   │       ├── cashflow.bson
│   │       └── ...
│   └── README.md (backup manifest)
```

### Backup Manifest Template

Create `backups/README.md`:

```markdown
# Backup Manifest

## Backup: pwa-stable-20240702

### Created
- Date: 2024-07-02
- Git Tag: v1.0.0-pwa-stable
- Git Branch: backup/pwa-stable

### Contents
- frontend-web/ - Complete PWA frontend
- backend/ - Complete backend
- .env.example - Environment template
- package.json - Dependencies
- mongodb/ - Database dump

### Purpose
Stable PWA backup before APK migration.

### Restore Instructions
1. Copy frontend-web/ to project root
2. Copy backend/ to project root
3. Restore MongoDB: mongorestore backups/pwa-stable-20240702/mongodb
4. Checkout: git checkout backup/pwa-stable
```

### Backup Creation Commands

```bash
# Create backup directory
BACKUP_DATE=$(date +%Y%m%d)
mkdir -p backups/pwa-stable-$BACKUP_DATE

# Copy source code
cp -r frontend-web backups/pwa-stable-$BACKUP_DATE/
cp -r backend backups/pwa-stable-$BACKUP_DATE/
cp .env.example backups/pwa-stable-$BACKUP_DATE/
cp package.json backups/pwa-stable-$BACKUP_DATE/

# Backup database (optional but recommended)
mongodump --uri="MONGODB_URI" --out backups/pwa-stable-$BACKUP_DATE/mongodb

# Create backup manifest
cat > backups/README.md << EOF
# Backup Manifest

## Backup: pwa-stable-$BACKUP_DATE

### Created
- Date: $(date +%Y-%m-%d)
- Git Tag: v1.0.0-pwa-stable
- Git Branch: backup/pwa-stable

### Purpose
Stable PWA backup before APK migration.
EOF
```

---

## Pre-Migration Checklist

### Git Operations
- [ ] Verify clean working directory: `git status`
- [ ] Commit any pending changes
- [ ] Create tag: `v1.0.0-pwa-stable`
- [ ] Push tag to remote
- [ ] Create branch: `backup/pwa-stable`
- [ ] Push branch to remote
- [ ] Protect `backup/pwa-stable` branch (no pushes)
- [ ] Create branch: `feature/apk-migration`
- [ ] Push branch to remote
- [ ] Switch to `feature/apk-migration`

### Folder Backup
- [ ] Create backup directory
- [ ] Copy frontend-web/
- [ ] Copy backend/
- [ ] Copy configuration files
- [ ] Backup database (optional)
- [ ] Create backup manifest
- [ ] Verify backup integrity

### Verification
- [ ] Tag exists: `git tag -l`
- [ ] Branch exists: `git branch -a`
- [ ] Backup folder exists
- [ ] Backup files verified
- [ ] PWA still works on main branch

---

## Checkpoint Commands Summary

### Execute This Before Migration

```bash
# 1. Clean state
git status
# Ensure no uncommitted changes

# 2. Create stable tag
git tag -a v1.0.0-pwa-stable -m "Stable PWA version before APK migration"
git push origin v1.0.0-pwa-stable

# 3. Create backup branch
git checkout -b backup/pwa-stable
git push origin backup/pwa-stable

# 4. Return to main
git checkout main

# 5. Create migration branch
git checkout -b feature/apk-migration
git push origin feature/apk-migration

# 6. Create folder backup
BACKUP_DATE=$(date +%Y%m%d)
mkdir -p backups/pwa-stable-$BACKUP_DATE
cp -r frontend-web backups/pwa-stable-$BACKUP_DATE/
cp -r backend backups/pwa-stable-$BACKUP_DATE/
cp .env.example backups/pwa-stable-$BACKUP_DATE/
cp package.json backups/pwa-stable-$BACKUP_DATE/

# 7. Backup database (optional)
mongodump --uri="MONGODB_URI" --out backups/pwa-stable-$BACKUP_DATE/mongodb

# 8. Verify
git tag -l
git branch -a
ls -la backups/pwa-stable-$BACKUP_DATE/
```

---

## Post-Migration Success

### If Migration Succeeds

```bash
# Merge to main
git checkout main
git merge feature/apk-migration
git tag -a v1.1.0-apk-production -m "APK production release"
git push origin main --tags

# Keep backup branch for 1 month (optional)
# Delete after 1 month of stable APK production
```

### If Migration Fails

```bash
# Delete migration branch
git checkout main
git branch -D feature/apk-migration
git push origin --delete feature/apk-migration

# PWA remains stable on main
# Backup branch available if needed
```

---

## Golden Rules

1. **Never delete `backup/pwa-stable` branch** until APK is stable for 1 month
2. **Never delete `v1.0.0-pwa-stable` tag** until APK is stable for 1 month
3. **Never modify `backup/pwa-stable` branch** - it must remain immutable
4. **Always work on `feature/apk-migration`** - never on `main` during migration
5. **Always test PWA on `main` before migration** to ensure it's truly stable

---

## Recovery Time Estimate

**Rollback Time**: 5-10 minutes
- Switch to backup branch: 1 minute
- Rebuild PWA: 2-3 minutes
- Deploy to Railway: 2-4 minutes
- Verify: 1-2 minutes

**Restore from Backup Time**: 10-15 minutes
- Restore files: 2-3 minutes
- Restore database: 5-8 minutes
- Verify: 2-4 minutes
