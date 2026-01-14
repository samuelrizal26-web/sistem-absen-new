# Cara Menjalankan Backend Server

## Quick Start

1. **Pastikan Python dependencies sudah terinstall:**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Jalankan server:**
   ```bash
   python -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload
   ```

3. **Server akan running di:**
   - URL: `http://localhost:8001`
   - Health check: `http://localhost:8001/health`
   - API docs: `http://localhost:8001/docs`

## Environment Variables (Opsional)

Jika perlu konfigurasi khusus, buat file `.env` di folder `backend/`:

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=absensi_db
```

**Default values:**
- `MONGO_URL`: `mongodb://localhost:27017` (jika tidak ada .env)
- `DB_NAME`: `absensi_db` (jika tidak ada .env)

## Troubleshooting

### Port 8001 sudah digunakan?
```bash
# Cek process yang menggunakan port 8001
netstat -ano | findstr :8001

# Atau gunakan port lain
python -m uvicorn server:app --host 0.0.0.0 --port 8002 --reload
```

### MongoDB connection error?
- Pastikan MongoDB sudah running
- Cek connection string di `.env` atau gunakan default `mongodb://localhost:27017`
- Jika menggunakan MongoDB Atlas, pastikan IP whitelist sudah benar

### Dependencies error?
```bash
pip install --upgrade -r requirements.txt
```

## Catatan

- Server akan auto-reload saat ada perubahan file (karena flag `--reload`)
- Untuk production, gunakan `gunicorn` atau tanpa `--reload`
- CORS sudah dikonfigurasi untuk menerima request dari `localhost:3000` (frontend)


