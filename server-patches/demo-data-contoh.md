# Akun demo: data contoh dicoba lalu dibatalkan (24 Nov 2026)

Sempat dibuat data contoh sintetis untuk demo (commit 2d39bea dan 3e8ff72). Keputusan pemilik: demo memakai **data asli**, yang berbeda hanya perannya.
Semua perubahan itu dibatalkan; berkas server dikembalikan ke keadaan sebelum data contoh. Penyembunyian data lama untuk demo (Dashboard null, grafik kosong,
bacaan terbaru null) juga dihapus.

Kini akun demo: membaca data asli (Dashboard, Sensor, Peringatan, CCTV, Analisis Data, Laporan, Kalibrasi, Otomasi), tidak bisa mengubah apa pun
(`demoGuard`/`requireRole` menjawab 403 untuk Mulai Semai, kirim ke alat, hapus batch, saklar, pemeliharaan, gerak kamera), unduh CSV sensor tetap 403.
Asisten AI tetap ditolak untuk demo (`aiRole`). Pembatasan petani (batas-fitur-petani.md) tidak berubah.
Risiko: tombol Coba Akun Demo di halaman login terbuka untuk siapa saja, jadi data kebun dan gambar kamera asli terlihat oleh siapa pun.
Cadangan server: `*.bak-sebelumkembali-*`; berkas contoh dipindah ke `/opt/vertonik/backend/demo-tidak-dipakai/`.
