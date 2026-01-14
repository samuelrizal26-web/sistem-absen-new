# Setup MongoDB Railway Connection

## Cara Mendapatkan Connection String dari Railway

1. **Login ke Railway Dashboard**
   - Buka: https://railway.app
   - Login dengan akun Anda

2. **Buka MongoDB Service**
   - Pilih project yang berisi MongoDB service
   - Klik pada service MongoDB (`mongodb-production-707e`)

3. **Dapatkan Connection String**
   - Klik tab **"Connect"** atau **"Variables"**
   - Cari variable `MONGO_URL` atau connection string
   - Copy connection string lengkap

4. **Format Connection String**
   
   **Format 1 (Direct Connection):**
   ```
   mongodb://username:password@mongodb-production-707e.up.railway.app:27017/absensi_db
   ```
   
   **Format 2 (SRV Connection - jika tersedia):**
   ```
   mongodb+srv://username:password@mongodb-production-707e.up.railway.app/absensi_db?retryWrites=true&w=majority
   ```

5. **Update File `.env`**
   
   Edit file `backend/.env` dan paste connection string:
   ```env
   MONGO_URL=mongodb://username:password@mongodb-production-707e.up.railway.app:27017/absensi_db
   DB_NAME=absensi_db
   ```
   
   **PENTING:** Ganti `username` dan `password` dengan credentials yang benar dari Railway!

6. **Restart Backend Server**
   ```bash
   # Stop server (Ctrl+C)
   # Jalankan lagi:
   cd backend
   python -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload
   ```

7. **Test Connection**
   ```bash
   python test_mongo.py
   ```
   
   Seharusnya muncul: `✅ MongoDB connection successful!`

## Troubleshooting

### Connection Refused
- Pastikan connection string lengkap dengan username dan password
- Cek apakah MongoDB service di Railway sudah running
- Pastikan IP Anda tidak di-block oleh firewall Railway

### Authentication Failed
- Pastikan username dan password benar
- Cek apakah database user sudah dibuat di Railway MongoDB

### Timeout
- Cek koneksi internet
- Pastikan Railway MongoDB service aktif
- Coba gunakan SRV connection jika direct connection tidak berhasil

## Catatan

- **Jangan commit file `.env` ke Git** (sudah di-ignore)
- Connection string berisi password, jaga kerahasiaannya
- Untuk production, gunakan environment variables di Railway dashboard


