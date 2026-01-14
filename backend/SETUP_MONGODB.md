# Setup MongoDB untuk Backend

## Status Saat Ini

✅ **Backend server sudah running** di `http://localhost:8001`
⚠️ **MongoDB belum terhubung** - perlu setup

## Opsi 1: Install MongoDB Lokal (Recommended untuk Development)

### Windows:
1. Download MongoDB Community Server dari: https://www.mongodb.com/try/download/community
2. Install dengan default settings
3. MongoDB akan running otomatis sebagai Windows Service
4. Default connection: `mongodb://localhost:27017`

### Verifikasi MongoDB Running:
```bash
# Cek apakah MongoDB service running
Get-Service MongoDB

# Atau test connection
mongosh
```

## Opsi 2: MongoDB Atlas (Cloud - Gratis)

1. Daftar di: https://www.mongodb.com/cloud/atlas
2. Buat cluster gratis (M0 - Free Tier)
3. Buat database user
4. Whitelist IP Anda (atau gunakan 0.0.0.0/0 untuk development)
5. Copy connection string
6. Buat file `.env` di folder `backend/`:
   ```env
   MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
   DB_NAME=absensi_db
   ```

## Opsi 3: Docker (Jika sudah install Docker)

```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

## Setelah MongoDB Running

1. **Restart backend server** (jika sudah running):
   - Stop server (Ctrl+C)
   - Jalankan lagi: `python -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload`

2. **Test connection:**
   ```bash
   curl http://localhost:8001/health
   curl http://localhost:8001/api/print-jobs
   ```

3. **Buka browser:**
   - Frontend: `http://localhost:3000`
   - Backend API docs: `http://localhost:8001/docs`

## Troubleshooting

### MongoDB tidak bisa connect?
```bash
# Cek MongoDB service
Get-Service MongoDB

# Start MongoDB jika belum running
Start-Service MongoDB

# Atau manual start
mongod --dbpath "C:\data\db"
```

### Port 27017 sudah digunakan?
- Cek process: `netstat -ano | findstr :27017`
- Atau gunakan port lain dan update `MONGO_URL` di `.env`

### Connection timeout?
- Pastikan firewall tidak block port 27017
- Untuk MongoDB Atlas, pastikan IP sudah di-whitelist

## Catatan

- **Tanpa MongoDB**: Backend akan tetap running, tapi semua endpoint database akan return empty data
- **Dengan MongoDB**: Semua fitur akan berfungsi penuh (CRUD employees, attendance, print jobs, dll)


