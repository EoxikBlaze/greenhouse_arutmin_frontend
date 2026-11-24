# Reset riwayat kalibrasi (24 Nov 2026, permintaan pengguna: video dari awal)
- DELETE semua baris kalibrasi_log (56, termasuk 31 '[UJI POMPA]' + 8 '[KALIBRASI POMPA ...]').
- kalibrasi_sensor: terakhir_dikalibrasi dan hasil_ukur = NULL untuk ph, ec, pulsa_peristaltik (kartu jadi 'Belum pernah'; status 'belum' tidak memicu peringatan, hanya 'terlambat').
- TIDAK diubah: kalibrasi di dalam alat (flash), konfigurasi_dosis (laju 12, uji lab), kalibrasi_sensor.konstanta, riwayat peringatan/aktivitas/sensor.
- Kategori Kalibrasi di Catatan Aktivitas ikut kosong (sumbernya kalibrasi_log); perintah KAL_SENSOR/KALIBRASI tetap di kategori Perintah alat.
- Cadangan: server /var/backups/vertonik/sebelum-reset-kalibrasi-20261124.sql (INSERT kalibrasi_log + kalibrasi_sensor). Pulihkan: psql < file (kosongkan tabel dulu).
