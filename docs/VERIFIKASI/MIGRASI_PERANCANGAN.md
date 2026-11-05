# Verifikasi — 4 Migrasi Perancangan FINAL

> Jalur gerbang: Analis DB `deleg_cccb7846` → Verifier Migrasi `deleg_33e6ced7` → **LAYAK COMMIT (7/7)** → commit `4186c19` (backend dev).

## Objek
`database/migrations/2026-10-19_perancangan_{meja_state,konfigurasi_dosis,jadwal_kalibrasi_channel,target_nutrisi}.sql`

## Hasil per butir verifier
| Butir | Hasil | Bukti ringkas |
|---|---|---|
| A Scope | PASS | hanya 4 file objek; `git diff --cached` kosong saat uji |
| B Nilai vs dokumen | PASS | **40/40 butir kritis cocok dua arah** (K=196, 65%, 300 ppm/214 mL, 5 suntikan, 8 kejadian, 500 mL, retry 5/3, deadband 100/0.2, ppm=EC×500, mixing 15, monitoring 60, jeda 2, bilas 300, 15 mnt/60 dtk, median 9, reset 00:00, kalibrasi 4 mgg & 7-14 hari, 1413 µS/cm, buffer 4,0/6,86, jadwal 5/20/30/60, channel 5/8/9/0/26/8) — 0 salah |
| C `min/max` aman | PASS | nol penugasan min/max; UPDATE guard `IS NULL` — uji ulang setelah edit aplikasi: nilai edit TIDAK tertimpa; `target_nutrisi` seed `menunggu_konfirmasi`, ec/ph NULL |
| D Scratch | PASS | ON_ERROR_STOP sukses (schema+seed+semua migrasi); rerun **counts & tabel IDENTIK** (7/7: 19/16/20/5/8/15/3); uji negatif FK & CHECK ditolak; scratch di-DROP |
| E Live aman | PASS | 21 tabel live before==after; counts `3/5/3/2/51/5` identik; 19 kolom + 8 tabel baru **absen** dari live |
| F Kualitas SQL | PASS | gaya sama dgn migrasi lama (header `====`, BEGIN/COMMIT, blok Verifikasi), `ON CONFLICT DO NOTHING`, `IF NOT EXISTS`, nol `DROP TABLE/TRUNCATE/DELETE`, FK `panens` tetap RESTRICT |
| G Kolom benar-benar baru | PASS | `count=0` utk 19 kolom klaim & 8 tabel di information_schema live |

## Temuan CATATAN (non-blocking, tidak mengubah file yang sudah diverifikasi)
1. Klaim "9 tabel" → kenyataan **8 tabel** (`penampung_states, konfigurasi_dosis, timing_operasi, aturan_fail_safe, jadwal_perawatan, kalibrasi_sensor, mapping_channel_esp32, target_nutrisi`) — salah hitung di laporan, tidak ada tabel hilang.
2. 2 FK baru bernama default `monitorings_id_meja_fkey` / `alert_logs_id_meja_fkey` (lainnya memakai sufiks `_foreign`) — konsistensi penamaan; bisa `ALTER ... RENAME CONSTRAINT` di migrasi lanjutan.
3. `target_nutrisi` memakai `INSERT ... WHERE NOT EXISTS` (unique index partial `uq_target_nutrisi_global`), terdokumentasi & terbukti idempoten.
4. `penampung_states` terisi dari isi `mejas` (live 5 → 5 baris saat eksekusi).
5. Keterangan seed tds mengutip default dokumen 400-1.250 ppm (MENUNGGU riset) — min/max live (50-1000) sengaja tak disentuh.

## Keadaan
- Commit **`4186c19`** == remote ✓ · **eksekusi ke `vertonik_smartfarm` BELUM dilakukan** (menunggu keputusan user; lihat BACKLOG & analisis §f).
