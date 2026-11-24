# Akun demo memakai data contoh (24 Nov 2026)

Sebelumnya demo melihat Dashboard dan Sensor kosong, tetapi masih membaca peringatan asli, saran nutrisi asli, dan gambar CCTV asli.
Kini `src/demoData.js` (sintetis, deterministik, tanpa database) dipakai demo di: `GET /dashboard`, `/monitoring/nutrisi`, `/monitoring/chart-data`,
`/monitoring/riwayat`, `/monitoring/tarik`, `/api/latest-sensor`, `/alert-logs` dan `/alert-logs/riwayat`, `/api/analitik/saran-dosis`,
dan `GET /cctv/:id/gambar` (gambar contoh `src/demo/cctv-contoh.jpg`, bukan kamera asli).
Alat contoh: siap, menunggu Mulai Semai (tanpa batch). Nilai sensor selalu di dalam batas aman; satu peringatan contoh aktif.

Belum diganti (masih data asli untuk demo): Analisis Harian, endpoint `/api/analisis/*` (Analisis Data), Kalibrasi, Laporan, status saklar.
Cadangan server: `*.bak-demodata-*`, `*.bak-demosaran-*`.
