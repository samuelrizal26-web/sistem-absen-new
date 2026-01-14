## Sistem Inti

- **Bulan Aktif**: Semua layar operasional bekerja berdasarkan satu periode aktif (year-month). Data list, summary, dan export hanya menampilkan entri yang tanggalnya berada dalam bulan tersebut. Periode bisa diubah via dialog bulan/tahun, tetapi defaultnya bulan berjalan.
- **Mode Kerja vs Mode Baca**:  
  - Mode Kerja berlaku bila periode aktif adalah bulan berjalan → form tambah/ubah kasbon, cashflow, dll. aktif.  
  - Mode Baca aktif bila periode berbeda → formulir & tindakan yang mengubah data dinonaktifkan, hanya data periode tersebut yang boleh dilihat.

- **Alur Absensi → Gaji → Kasbon → Slip**:  
  - Crew clock-in/out langsung ke backend; history hanya tampil untuk periode aktif.  
  - Gaji diambil dari total daily summary + potongan kasbon periode yang sama, tanpa status “lunas”.  
  - Kasbon selalu tercatat sebagai potongan otomatis untuk periode tersebut dan muncul di slip gaji; tidak ada status tersendiri.  
  - Slip gaji dapat di-export per periode, menampilkan identitas crew, periode, jam kerja/hari, total gaji, total kasbon, dan gaji bersih.

- **Alur Print / Project → Cashflow → Margin → Export**:  
  - Print job summary, modal detail bahan, dan indikator pendapatan juga mengikuti bulan aktif (tidak lagi rolling 30 hari).  
  - Project serta casflow home dihitung dari list data periode aktif, margin dihitung dari revenue/HPP tersaring.  
  - Export PDF (cashflow, slip gaji) di-trigger dengan periode yang sama; file hanya read-only dan siap dibagikan.

## Rule “BOLEH”  
- BOLEH mengganti periode aktif menggunakan dialog (pilih bulan/tahun) untuk melihat data historis.  
- BOLEH membaca/melihat data periode lain selama mode baca (tombol disabled).  
- BOLEH menggunakan satu fungsi central untuk menghasilkan summary (cashflow summary, print summary, slip gaji).  
- BOLEH menggunakan singleton/hardware service (printer, cashdrawer) selama tidak mengubah logika bisnis periode.  
- BOLEH memanggil backend yang menyesuaikan data (attendance, cashflow, kasbon, projects) lalu difilter di frontend ke bulan aktif.

## Rule “TIDAK BOLEH”  
- TIDAK BOLEH menampilkan data lintas bulan tanpa filter periode aktif.  
- TIDAK BOLEH memungkinkan penambahan/edit kasbon/cashflow ketika mode baca aktif.  
- TIDAK BOLEH menghapus atau mengabaikan clipping periode (misal rolling 30 hari harus diganti dengan year-month).  
- TIDAK BOLEH menghitung gaji/slip secara client-side di luar agregasi backend (seluruh perhitungan ditarik dari daily summary + kasbon).  
- TIDAK BOLEH mencampur modal print/cashflow dengan periode lain; summary + export harus menggunakan satu sumber data periode aktif.

