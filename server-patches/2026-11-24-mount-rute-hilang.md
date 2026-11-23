# Server /opt/vertonik/backend/src/index.js — empat rute dipasang kembali
Sebab: file rute ada di routes/ tetapi tidak dipasang di index.js, sehingga web mendapat 404 ("not found").
Ditambahkan:
- `app.use('/audit-logs/aktivitas', requireAuth, requireRole(['admin']), require('./routes/aktivitas'))`  (sebelum /audit-logs)
- `app.use('/pengaturan-alat', requireAuth, require('./routes/pengaturanAlat'))`   -> halaman Pengaturan Alat
- `app.use('/api/analisis', ...semuaRole, require('./routes/analisis'))`          -> Asisten AI > Analisis Data
- `app.use('/api/firmware', require('./routes/firmware').router)`                 -> panel Firmware (OTA, konsol)
Juga sebelumnya: `require('./peringatan').mulai()` (lihat 2026-11-24-peringatan-mulai.md).
Cadangan di server: index.js.bak-mount-<tanggal>, index.js.bak-sebelum-peringatan-<tanggal>.
Verifikasi: 15 parameter Pengaturan Alat dibandingkan otomatis dengan Parameter.cpp v6.4 -> semua rentang di dalam firmware, bawaan sama.
