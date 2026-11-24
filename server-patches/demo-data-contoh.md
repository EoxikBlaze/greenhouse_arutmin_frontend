# Akun demo memakai data contoh (24 Nov 2026)

Sebelumnya demo melihat Dashboard dan Sensor kosong, tetapi masih membaca peringatan asli, saran nutrisi asli, dan gambar CCTV asli.
Kini `src/demoData.js` (sintetis, deterministik, tanpa database) dipakai demo di: `GET /dashboard`, `/monitoring/nutrisi`, `/monitoring/chart-data`,
`/monitoring/riwayat`, `/monitoring/tarik`, `/api/latest-sensor`, `/alert-logs` dan `/alert-logs/riwayat`, `/api/analitik/saran-dosis`,
dan `GET /cctv/:id/gambar` (gambar contoh `src/demo/cctv-contoh.jpg`, bukan kamera asli).
Alat contoh: siap, menunggu Mulai Semai (tanpa batch). Nilai sensor selalu di dalam batas aman; satu peringatan contoh aktif.

Tahap kedua: `/api/analisis/*` (Analisis Data; hanya dua fungsi pembaca data yang diganti lewat AsyncLocalStorage, hitungan analisis tetap kode asli),
`/laporan`, `/laporan/:jenis` (enam laporan), `/kalibrasi` dan `/kalibrasi/:sensor/riwayat`, `/iot-v41/riwayat-kalibrasi`,
`/iot-v41/state` (disamarkan: bacaan, alat, laju pompa, arsip), status saklar tanpa nama pengubah, dan `/api/analitik/ekspor/*.csv` (403 untuk demo).

Sengaja tetap ditolak untuk demo: seluruh Asisten AI (Percakapan, Analisis Harian, Langkah berikutnya).
Belum ada data contoh untuk batch tanam: Kebun Saya dan Alur Tanam demo kosong.
Cadangan server: `*.bak-demodata-*`, `*.bak-demosaran-*`, `*.bak-demosisa-*`.
