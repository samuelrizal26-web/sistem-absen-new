# AGENTS.md — Aturan Project SISTEM-ABSEN

> **WAJIB DIBACA SEBELUM MENGERJAKAN PERUBAHAN APAPUN PADA REPOSITORY INI.**
>
> File ini adalah aturan permanen project. Devin dan agent lain HARUS membaca dan mematuhi aturan di bawah ini tanpa perlu diingatkan oleh user.

---

## 1. PRODUCTION DEPENDENCY

- Production **WAJIB** menggunakan `backend/requirements-minimal.txt`.
- **JANGAN** mengganti production ke `backend/requirements.txt`.
- **JANGAN** menambahkan dependency berat seperti TensorFlow, DeepFace, Keras, OpenCV, RetinaFace, MTCNN, atau dependency besar lainnya kecuali benar-benar diperlukan oleh runtime aplikasi dan sudah diperiksa dampaknya terhadap RAM.
- Sebelum menambahkan dependency Python, pastikan dependency tersebut benar-benar digunakan oleh production runtime. Hapus dependency yang tidak terpakai.

## 2. STAGING FIRST

- Perubahan aplikasi normal **WAJIB** diuji di staging sebelum production.
- **JANGAN** melakukan direct production deployment untuk perubahan normal.
- Setelah staging berhasil, verifikasi fungsi yang berubah sesuai ekspektasi.
- Setelah itu cek resource usage, terutama RAM dan CPU, dibandingkan baseline.

## 3. PRODUCTION DEPLOYMENT

- Production menggunakan branch `main`.
- **JANGAN** mengubah Railway Build Command, deployment configuration, environment variables, atau konfigurasi production tanpa alasan yang jelas dan tanpa memeriksa dampaknya terlebih dahulu.
- Production build command harus tetap menggunakan:

```bash
pip install -r requirements-minimal.txt
```
## 4. RESOURCE / RAM SAFETY

- RAM adalah resource yang sangat penting untuk project ini.
- Setelah deployment staging maupun production, periksa RAM dan CPU.
- Jika RAM meningkat signifikan dibandingkan baseline sebelumnya, **STOP** dan investigasi penyebabnya sebelum melanjutkan pekerjaan/deployment.
- Jangan menganggap deployment berhasil hanya karena aplikasi dapat start.
- Periksa juga resource usage setelah deployment berjalan beberapa menit.

## 5. DATABASE SAFETY

- **JANGAN** menghapus database, collection, data production, atau melakukan operasi destructive tanpa persetujuan eksplisit dari user.
- **JANGAN** mengubah konfigurasi MongoDB production tanpa alasan yang jelas.
- Migration database harus diperlakukan sebagai perubahan berisiko dan diuji terlebih dahulu jika memungkinkan.

## 6. RAILWAY SAFETY

- **JANGAN** mengubah Railway production settings hanya untuk menyelesaikan masalah build tanpa terlebih dahulu memahami dampaknya.
- **JANGAN** menghapus service production.
- **JANGAN** mengubah environment variables production secara sembarangan.
- Jika perubahan Railway configuration diperlukan, jelaskan terlebih dahulu kepada user apa yang berubah dan kenapa, lalu minta konfirmasi.

## 7. CHANGE SAFETY

- Sebelum mengubah dependency atau deployment configuration, periksa repository configuration yang sudah ada.
- **JANGAN** mengganti konfigurasi yang sudah bekerja hanya karena ada alternatif yang menurut agent lebih baik.
- Pertahankan arsitektur project yang sudah ada kecuali perubahan arsitektur memang diminta oleh user.

## 8. WHEN RULES CONFLICT

- Jika task dari user berpotensi melanggar aturan di `AGENTS.md` ini, **jangan langsung** melakukan perubahan berisiko.
- Jelaskan konflik tersebut kepada user dan minta konfirmasi sebelum melakukan tindakan yang berisiko terhadap production.

## 9. DEPLOYMENT VERIFICATION

Setelah deployment staging atau production, lakukan verifikasi berikut:

- Pastikan deployment berhasil (build sukses, service running).
- Pastikan API/application dapat diakses.
- Periksa RAM usage.
- Periksa CPU usage.
- Periksa error log Railway / Cloudflare.
- Jika resource usage abnormal atau ada error baru, **STOP** dan investigasi sebelum melanjutkan.

## 10. IMPORTANT PROJECT HISTORY

Project ini sebelumnya mengalami masalah biaya Railway karena production service menggunakan sekitar **2 GB RAM** secara terus-menerus akibat deployment/environment dengan dependency yang terlalu berat (TensorFlow, DeepFace, Keras, OpenCV, dll).

Setelah menggunakan `backend/requirements-minimal.txt` dan melakukan redeploy pada environment yang diuji, penggunaan RAM turun drastis; angka sekitar **50–100 MB** berasal dari staging yang sebelumnya diamati, bukan baseline production yang dijamin.

Karena itu, menjaga production dependency tetap minimal dan melakukan staging verification adalah aturan penting project ini. Jangan merusak optimasi yang sudah dicapai.

---

## CATATAN UMUM

- `AGENTS.md` ini adalah aturan project yang harus dibaca sebelum mengerjakan perubahan pada repository.
- Jika ada ketidakjelasan antar aturan dan permintaan user, prioritas tetap pada keselamatan production. Jelaskan dan konfirmasi sebelum bertindak.
- Jangan melakukan deployment production, perubahan Railway production, atau modifikasi source code aplikasi hanya karena aturan ini dibuat. Setiap perubahan tetap memerlukan instruksi eksplisit dari user.
