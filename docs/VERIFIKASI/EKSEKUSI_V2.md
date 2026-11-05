# Eksekusi Paket DB — 4 Migrasi Perancangan + Skema V2

> 19 Okt 2026 · Persetujuan user: "pakai semua rekomendasi desainer lalu eksekusi sekarang"
> Gerbang: 4 migrasi `LAYAK COMMIT 7/7` (`deleg_33e6ced7`) · desain V2 `LAYAK EKSEKUSI` (`deleg_1a4b05e8` → remediasi → `deleg_e6d5d40f`)

## 1. Keamanan sebelum eksekusi
- **Backup**: `pg_dump -Fc` → `~/.hermes/cache/scratch/backup_garap_pre_v2_<ts>.dump` (63K, TOC terbaca ✓)
- Baseline: 21 tabel base · `users=3 mejas=5 pendewasaans=3 panens=2 alert_logs=51 sensor_thresholds=5 monitorings=12` · thresholds `airTemp=20-40 humidity=50-90 ph=5-7 tds=50-1000 waterTemp=5-40` · meja `3,8,9,10,11`

## 2. Berkas yang dieksekusi (`psql -v ON_ERROR_STOP=1`, 5 file — SEMUA OK)
1. `migrations/2026-10-19_perancangan_meja_state.sql` (1 NOTICE: constraint lama tak ada → skip, aman)
2. `migrations/2026-10-19_perancangan_konfigurasi_dosis.sql`
3. `migrations/2026-10-19_perancangan_jadwal_kalibrasi_channel.sql`
4. `migrations/2026-10-19_perancangan_target_nutrisi.sql`
5. `database/proposal_skema_v2.sql`

## 3. Hasil verifikasi pasca-eksekusi
**A. 8 tabel hasil migrasi** — persis: `penampung_states=5` (meja 3,8,9,10,11) · `konfigurasi_dosis=19` · `timing_operasi=16` · `aturan_fail_safe=20` · `jadwal_perawatan=5` · `kalibrasi_sensor=8` · `mapping_channel_esp32=15` · `target_nutrisi=3` (placeholder `menunggu_konfirmasi`, EC/pH NULL, keterangan Lampiran B par.249)

**B. Objek V2** — 9 tabel (`sensor_readings` + hourly/latest, `sensor_overrides`, `dosing_events`, `dosing_rounds`, `water_fill_events`, `report_logs`, `audit_logs`) · **4 fungsi** (`fn_partisi_readings_bulanan`, `fn_pensiun_readings`, `fn_rollup_readings`, `fn_override_aktif`) · **2 view** · **12 partisi** `sensor_readings` (2026_07 … 2027_05 + default)

**C. Baseline tak berubah** — semua count identik · thresholds **min/max tak disentuh** · meja ids identik · `water_controls = AUTO/MANUAL/OFF` ✓

**D. 19 kolom baru** — mejas+7, monitorings+2, alert_logs+5, sensor_thresholds+5 → **19/19** ✓

## 4. Aplikasi
- Server di-restart (PID 36412) → peta `information_schema` memuat kolom baru
- Health: login 200 · `GET /meja` **200 (5 baris ber-id)** · `GET /meja/abc` 404 identik · `GET /dashboard` 200 · anonim 401 · `saveSensor` anonim **403** · `npm test` **4/4**

## 5. Keputusan yang dipakai (rekomendasi desainer §12, disetujui user)
Retensi mentah **60 hari** + rollup **2 tahun** · rollup **hourly** · override **admin saja** (tanpa batas waktu) · override **TIDAK** dikirim ke ESP32 · audit/report **365 hari** · `monitorings` tetap nama lama (arsip) + backfill 12 baris **belum dikerjakan di sesi ini (fase 2)** · counter **hybrid** · laporan cukup `hasil_json` · thresholds **biarkan** (keputusan user sebelumnya) · partisi **bulanan** · `water_controls` **tetap global**

## 6. Sisa pekerjaan (fase berikutnya, belum dikerjakan)
- Fase aplikasi: whitelist `master.js` + `TABLE_SPECS` utk 19 kolom · endpoint baru §11 (override/events/report/audit) · backfill `monitorings` → `sensor_readings` · cron retensi (`fn_pensiun_readings(60)` bulanan + rollup jam-an) · regenerasi `schema.sql` (fase 6) · API ESP32 utk `target_nutrisi`
- **Rollback bila perlu**: `pg_restore` dari backup di §1 (belum perlu — semua tahap hijau)
