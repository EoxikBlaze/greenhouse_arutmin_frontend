# Batas fitur petani (24 Nov 2026)

Server (`routes/tanam.js`, `routes/analisis.js`): `requireRole(['admin'])` (petani selalu ditolak 403) di
`POST /tanam/mulai`, `POST /tanam/kirim-alat`, `PUT /tanam/semai/:id/durasi`, `PUT /tanam/semai/:id/kurva`, `POST /tanam/:id/hapus`;
`requireRole(['admin','demo'])` untuk semua endpoint `/api/analisis/*` kecuali `/dosing-kejadian` (dipakai grafik Sensor).
Web (`-v11`): tombol Ubah kurva dan Ubah durasi di Kebun Saya hanya untuk admin; tab Analisis Data di Asisten AI hanya admin dan demo.
Mulai Semai sudah tersembunyi untuk petani di web sebelumnya; kini juga ditolak di server.
Petani tetap bisa: Dashboard, Sensor, Peringatan, CCTV (lihat), Asisten AI (Percakapan, Analisis Harian), Kebun Saya (lihat, Selesai tahap, Panen), Akun Saya.
Diuji: admin (200), demo (Mulai/hapus/kirim 403 lewat demoGuard), `requireRole` untuk petani (403). Belum diuji dengan login petani sungguhan.
Cadangan server: `*.bak-petani-*` di folder yang sama dan `/var/www/vertonik.bak-petani-*`.
