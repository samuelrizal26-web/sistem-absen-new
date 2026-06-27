# Sistem Absen — Frontend Web

Aplikasi web berbasis React + Vite + Tailwind CSS, dioptimalkan sebagai PWA untuk tablet dan HP kantor.

## Menjalankan di lokal

1. Install dependency:
   ```bash
   npm install
   ```
2. Salin file environment:
   ```bash
   cp .env.example .env
   ```
3. Jalankan dev server:
   ```bash
   npm run dev
   ```

## Build production

```bash
npm run build
```

Hasil build ada di folder `dist`.

## Catatan PWA

- `public/manifest.json` berisi konfigurasi install.
- `public/sw.js` adalah service worker dasar (network-first untuk API, cache-first untuk static).
- `src/main.jsx` mendaftarkan service worker saat aplikasi dimuat.
