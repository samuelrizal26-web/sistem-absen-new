# DOKUMEN HANDOFF PROYEK SISTEM-ABSEN

> **Waktu Dibuat**: 2026-10-13 13:00 WIB
> **Tujuan**: Panduan estafet bagi agent/developer di sesi baru setelah pergantian akun, agar pekerjaan dapat dilanjutkan langsung dari filesystem lokal tanpa kehilangan konteks.

---

## 1. Lokasi dan Struktur Proyek

- **Root Proyek**: `E:\sistem_absen_flutter_v2`
- **Komponen Utama**:
  - `backend/`: FastAPI Python application (`backend/server.py`).
  - `lib/`: Flutter Mobile/Desktop application (frontend absensi & operasional).
  - `frontend-web/`: React / Vite dashboard web (bukan Flutter).
- **Branch Git Saat Ini**:
  - Berdasarkan `.git/HEAD`: `ref: refs/heads/feature/fix-nixpacks-build`.
  - *Catatan*: Perintah `git checkout -b feature/optimize-summary-endpoints` sebelumnya gagal dieksekusi karena `git` tidak terdaftar di environment `PATH` sistem lokal Windows. Perubahan file saat ini berada langsung di working tree lokal branch tersebut dan **belum di-commit**.

---

## 2. Aturan AGENTS.md yang Wajib Dipatuhi

1. **Production Dependency**:
   - Production WAJIB menggunakan `backend/requirements-minimal.txt`.
   - JANGAN mengganti production ke `backend/requirements.txt`.
   - DILARANG menambah dependency berat (TensorFlow, DeepFace, OpenCV, Keras, dll).
2. **Staging First**:
   - Perubahan normal WAJIB diuji di staging sebelum production.
   - DILARANG direct deployment ke production.
3. **Production Deployment**:
   - Production menggunakan branch `main`. Build command wajib: `pip install -r requirements-minimal.txt`.
4. **RAM & Resource Safety**:
   - Baseline RAM adalah metrik kritis proyek (project historis pernah bengkak hingga 2 GB akibat dependency/in-memory processing).
5. **Database Safety**:
   - DILARANG menghapus database/collection/data production atau operasi destruktif.
6. **Railway Safety**:
   - DILARANG mengubah konfigurasi Railway production, environment variables, atau menghapus service tanpa konfirmasi eksplisit.

---

## 3. Perubahan Implementasi Terakhir

Implementasi difokuskan pada optimasi 2 endpoint summary agar tidak lagi menarik seluruh koleksi ke RAM Python (`.to_list(None)`), digantikan oleh MongoDB Aggregation.

### A. `backend/server.py`
1. **Endpoint `GET /api/print-jobs/summary`** (baris ~414–495):
   - Menerima parameter opsional: `start`, `end`, `month`.
   - Default: jika tanpa parameter, mengambil bulan saat ini (`YYYY-MM`).
   - Validasi: rentang `start` ke `end` dibatasi maksimal 180 hari (6 bulan); jika melebihi, melempar `HTTP 400` (bukan silent clamp).
   - Menggunakan 2 aggregation pipeline paralel (`totals` dan `by_material`).
   - Tetap mempertahankan 5 key respons: `total_revenue`, `cash_revenue`, `transfer_revenue`, `total_jobs`, `by_material`.
   - Logika grouping material: tetap membaca root field `material` (string) & fallback `'unknown'` untuk dokumen berformat array baru, sehingga konsisten dengan perilaku lama tanpa menduplikasi nilai.
2. **Endpoint `GET /api/cashflow/summary`** (baris ~670–801):
   - Menerima parameter opsional: `month` (format `YYYY-MM`). Jika tidak dikirim, default ke bulan berjalan.
   - Menggunakan 4 aggregation pipeline paralel via `asyncio.gather` untuk 4 koleksi: `cashflow`, `print_jobs`, `projects`, `kasbon`.
   - Mempertahankan seluruh 15 key respons dan aturan kalkulasi:
     - `kasbon_transfer` sengaja **tidak dimasukkan** ke `total_expense`.
     - Transaksi ber-tipe `salary` di `cashflow` tetap tidak dihitung ke pendapatan/pengeluaran manual.
     - `payment_method` bernilai null/kosong/non-transfer diperlakukan sebagai `'cash'`.

### B. `lib/services/api/api_service.dart` (baris ~445–452)
- Metode `fetchCashflowSummary({String? month})`: ditambahkan parameter opsional `month` yang dikirimkan via query parameter `?month=YYYY-MM`.

### C. `lib/screens/cashflow/cashflow_home_screen.dart`
- Baris ~50: `_reloadData()` mengirimkan parameter bulan aktif `month: DateFormat('yyyy-MM').format(_selectedPeriod)` ke `fetchCashflowSummary`.
- Baris ~186: `_showPeriodPicker()` ditambahkan panggilan `_reloadData()` setelah perubahan periode agar data summary dan list ter-refresh secara sinkron.

### D. `backend/test_summary_comparison.py` (File Baru)
- Script pengujian komparasi paralel logika LAMA (in-memory) vs BARU (aggregation) pada dataset yang sama untuk memvalidasi identitas hasil numerik dan pengelompokan material.

---

## 4. Status Code Review

- **Status**: **BELUM SELESAI / TERTUNDA**.
- **Penyebab**: Kuota model Claude Sonnet 4.6 Thinking habis saat proses verifikasi diff mendalam sedang berlangsung.
- **Hal yang sudah diverifikasi awal**:
  - Struktur kode aggregation di `backend/server.py` telah diperiksa baris 414–500 dan baris 669–810.
- **Hal yang BELUM diverifikasi secara tuntas**:
  - Review diff baris per baris terhadap potensi edge case (misal: penanganan floating point di `$sum`, regex vs index MongoDB, null handling di collection `projects`).
  - Verifikasi menyeluruh konsistensi state management di `cashflow_home_screen.dart`.

---

## 5. Status Pengujian

- **Status**: **BELUM BERHASIL DIJALANKAN**.
- **Penyebab**: Perintah `python` dan `py` tidak ditemukan pada environment `PATH` Windows di mesin host lokal (hanya terdeteksi stub kosong Windows Store).
- **Status Database**:
  - File `backend/.env` saat ini berisi:
    - `MONGO_URL=mongodb://<DIREDAKSI>`
    - `DB_NAME=sistem-absen`
  - **PERINGATAN KEAMANAN**: Belum terverifikasi apakah URL di atas adalah database staging atau database production aktif. **DILARANG menjalankan script write/delete pada connection string tersebut.**

---

## 6. Tugas Berikutnya (Next Actions)

Urutan prioritas bagi agent sesi berikutnya:

1. **Lanjutkan & Tuntaskan Code Review**:
   - Periksa diff `backend/server.py`, `lib/services/api/api_service.dart`, `lib/screens/cashflow/cashflow_home_screen.dart`, dan `backend/test_summary_comparison.py`.
   - Pastikan tidak ada regresi logika, kebocoran query, atau perubahan di luar cakupan permintaan user.
   - Kategorikan temuan ke dalam: `BUG KRITIS`, `MASALAH YANG HARUS DIPERBAIKI`, atau `LOLOS REVIEW`.
2. **Verifikasi Keamanan Lingkungan Uji**:
   - Pastikan target database untuk pengujian adalah **Staging/Local**, bukan Production.
   - Script `test_summary_comparison.py` sifatnya read-only, namun membebani database jika dijalankan terhadap database aktif.
3. **Jalankan Pengujian**:
   - Cari path Python yang valid pada mesin user jika tersedia, atau koordinasikan dengan user untuk eksekusi test runner di environment staging.
   - Pastikan output pengujian menunjukkan `100% PASS` tanpa disparitas angka antara implementasi lama dan baru.
4. **Persiapan Staging (Hanya Setelah Review & Test Lolos)**:
   - Jika `git` tersedia, commit perubahan ke branch fitur terpisah.
   - Ikuti aturan **STAGING FIRST** sesuai `AGENTS.md`.

---

## 7. Batasan & Larangan Keras

- ❌ **JANGAN** mengubah konfigurasi Railway production.
- ❌ **JANGAN** melakukan merge atau commit langsung ke branch `main`.
- ❌ **JANGAN** melakukan deploy langsung ke production.
- ❌ **JANGAN** menghapus collection, dokumen, atau memodifikasi skema database.
- ❌ **JANGAN** menambah dependency baru ke `backend/requirements-minimal.txt`.
- ❌ **JANGAN** mengasumsikan database di `.env` adalah staging tanpa konfirmasi user.

---

## 8. Status Fisik File di Disk (Pemeriksaan Aktual)

Berdasarkan pemeriksaan sistem file per 13 Oktober 2026:

| File Path | Status Penyimpanan Fisik | Status Git | Keterangan |
|---|---|---|---|
| `backend/server.py` | **Tersimpan di Disk** (10/13/2026 12:13:41) | Belum di-commit | Endpoint summary telah diperbarui ke Aggregation |
| `lib/services/api/api_service.dart` | **Tersimpan di Disk** (10/13/2026 12:13:52) | Belum di-commit | Penambahan param `month` |
| `lib/screens/cashflow/cashflow_home_screen.dart` | **Tersimpan di Disk** (10/13/2026 12:14:12) | Belum di-commit | Integrasi param `month` & trigger reload |
| `backend/test_summary_comparison.py` | **Tersimpan di Disk** (10/13/2026 12:16:50) | Belum di-commit (Untracked) | Script perbandingan agregasi |
| `HANDOFF_NEXT_SESSION.md` | **Tersimpan di Disk** | Belum di-commit (Untracked) | Dokumen handoff ini |

*Catatan*: Tidak ada perubahan yang menggantung di memory agent; semua perubahan kode di atas sudah tertulis secara persisten di filesystem.

---

## 9. Langkah Melanjutkan Pekerjaan (Untuk Agent Baru)

Saat memulai sesi baru, berikan prompt berikut atau minta agent membaca dokumen ini terlebih dahulu:

```markdown
Baca file E:\sistem_absen_flutter_v2\HANDOFF_NEXT_SESSION.md dan AGENTS.md sebelum melakukan tindakan apa pun.
Lanjutkan tugas:
1. Lakukan Code Review menyeluruh (READ-ONLY) terhadap file yang telah diubah.
2. Berikan laporan review berkategori (BUG KRITIS / MASALAH YANG HARUS DIPERBAIKI / LOLOS REVIEW).
3. Tunggu persetujuan user sebelum menjalankan langkah berikutnya.
```
