# Verifikasi Database GARAP vs Dokumen Perancangan IoT Hidroponik FINAL

> Analis & Pengembang Database (worker #6) · 19 Okt 2026 · delegasi `deleg_cccb7846` · mimo-v2.6-flash+ultra
> Sumber: `Perancangan_Sistem_IoT_Hidroponik_FINAL.docx` (255 paragraf, 19 tabel) vs DB live `vertonik_smartfarm` (SELECT-only) vs `schema.sql`/`seed.sql`/`vertonik.sql`
> Status: **4 file migrasi DITULIS & DIUJI di DB scratch (idempoten, scratch di-DROP) — BELUM dieksekusi ke live, BELUM di-commit** (menunggu verdict verifier + keputusan user)

## (a) Ringkasan tabel verifikasi (dokumen vs DB)

### Konfigurasi meja (§1.2 + Tabel 1)
| Nilai dokumen | DB | Status |
|---|---|---|
| 4 meja (3 NFT + 1 DFT), Meja 1–4 | `mejas` = **5 baris** (Selada, Peremajaan 1/2, Pendewasaan 1/2) | **BEDA** |
| Lubang 312/208/520/180 → **1.220** | `sum(jumlah_lubang)` = **1.346** (per baris 10/624/312/200/200) | **BEDA** (+126) |
| Lubang/talang 26/26/52/18 · Talang 12/8/10/10 · Penampung ±70 L (M4 75 L) · Panjang talang 8,1 m · Laju 1 L/mnt · Kenaikan 40 cm | kolom `lubang_per_talang`, `jumlah_talang`, `kapasitas_penampung_l`, `panjang_talang_m`, `laju_per_talang_lpm`, `kenaikan_air_cm` **semua TIDAK ADA** | **TIDAK ADA** → migrasi (a) |
| "setpoint, counter dosis, status LOCK sendiri" per penampung (§1.1) | `water_controls` cuma **1 baris global** | **TIDAK ADA** → `penampung_states` |
| Tanaman: daun bawang, selada, pakcoy | `tanamen`: Seledri, Selada | **BEDA** (hanya Selada cocok) |

### Dosis AB mix (§2.2/2.3, Tabel 4/13)
| Nilai dokumen | Status di DB |
|---|---|
| K = **196** mS/cm · ΔEC→18/36/53 mL per pompa · **4,7 ppm/detik** pulsa | **TIDAK ADA** (sebagian jadi seed) |
| Dosis **65%/ronde**, maks **300 ppm (≈214 mL)/suntikan**, maks **5 suntikan/kejadian**, **8 kejadian/hari**, **500 mL/hari**, pH Up/Down **100 mL/hari** | **TIDAK ADA** → `konfigurasi_dosis` |
| Retry **5× EC, 3× pH** · Deadband **EC ±100 ppm, pH ±0,2** · `ppm = EC × 500` · DFT skala **75/70** · Bilas **wajib 300 mL** | **TIDAK ADA** (deadband → kolom baru; sisanya seed) |

### Timing (Tabel 12/§8) — semua **TIDAK ADA** → `timing_operasi`
Mixing **15 mnt** · monitoring **60 mnt** · jeda A→B **2 mnt** · bilas ±300 mL · isi air **15 mnt** · isi botol **60 dtk** · baca stabil **2 mnt** · ronde ±20 mnt · gap 48 mnt · reset counter **00:00** · median **9** bacaan. `water_controls` live = `AUTO/MANUAL/OFF` (COCOK kontrak lama, tanpa timeout/per-penampung).

### Ambang `sensor_thresholds` vs Tabel 13
| Parameter | Dokumen | DB live | Status |
|---|---|---|---|
| pH | 5,0–7,0 | 5–7 | **COCOK** |
| Suhu air | 18–30 °C | 5–40 | **BEDA** |
| Suhu udara | 15–33 °C | 20–40 | **BEDA** |
| Kelembaban | 50–85 % | 50–90 | **BEDA** |
| EC/TDS | "MENUNGGU riset" (default 400–1.250 ppm) | 50–1000 | **BEDA + belum final** — min/max **TIDAK disentuh** (keputusan user) |
| Sanity check EC 0,1–5 mS/cm, pH 3–9, suhu 5–45 °C | kolom `sanity_min/max` **TIDAK ADA** → migrasi |

### Tahap, alert, kalibrasi, jadwal, ESP32
- Target EC/pH per tanaman per tahap: **TIDAK ADA** (Lampiran B par.249 = "tim website") → `target_nutrisi` placeholder `menunggu_konfirmasi`.
- Kata "semai/peremajaan/pendewasaan/panen" **tidak ada di dokumen** — tahap DB = milik aplikasi tanam (7/14/21 hari).
- 7 pemicu ALERT + LOCK (alert 3/4/6) + antrian maks 20 + 3× invalid→LOCK: `alert_logs` cuma `(id,type,value,created_at)` → kolom + `aturan_fail_safe` (20 aturan).
- Kalibrasi (pH 1–2 mgg, EC 4 mgg, 1413 µS/cm, buffer 4,0/6,86, KCl) → `kalibrasi_sensor` (8).
- Jadwal harian 5 mnt…bulanan 60 mnt → `jadwal_perawatan` (5).
- Channel ESP32: output 26 (isi air 5, sampling 8, dosing 9, sirkulasi 0, indikator 4), input 8 → `mapping_channel_esp32` (15).
- `monitorings`: tanpa `id_meja`, tanpa `ec_ms_cm` (dokumen §2.2: "HARUS pakai sensor EC mS/cm") → kolom + index `(id_meja, created_at DESC)`.

## (b) File vs live
- `schema.sql` vs live: **IDENTIK** utk 13 tabel domain (0 selisih struktur).
- `seed.sql` vs live: **COCOK** (thresholds 5/5, water_controls, users 3, wa_settings 1).
- `vertonik.sql` (dump data) vs live: **BEDA** — dump masih memuat 3 baris meja demo (sudah terhapus live), monitorings 12 vs live 13 (device menulis lagi).

## (c) Gap prioritas
**TINGGI**: (1) parameter dosis AB mix · (2) timing operasi · (3) state per penampung · (4) monitoring per penampung + EC · (5) target nutrisi per tahap · (6) ambang/deadband/sanity (min/max = keputusan user) · (13) nilai Lampiran B yang kosong (jangan ditebak).
**SEDANG**: alert terstruktur · jadwal perawatan · kalibrasi · kolom fisik meja.
**RENDAH**: mapping channel ESP32 · tabel takaran ΔEC (cukup seed).

## (d) File migrasi (BELUM dieksekusi / BELUM di-commit)
| File | Isi |
|---|---|
| `2026-10-19_perancangan_meja_state.sql` (185 baris) | +7 kolom `mejas`, `penampung_states` (+seed 5), +2 kolom `monitorings`, +5 kolom `alert_logs`, +5 kolom `sensor_thresholds` (UPDATE bersyarat, **min/max tak disentuh**) |
| `2026-10-19_perancangan_konfigurasi_dosis.sql` (270) | `konfigurasi_dosis` (19), `timing_operasi` (16), `aturan_fail_safe` (20) — `ON CONFLICT DO NOTHING` |
| `2026-10-19_perancangan_jadwal_kalibrasi_channel.sql` (154) | `jadwal_perawatan` (5), `kalibrasi_sensor` (8), `mapping_channel_esp32` (15) |
| `2026-10-19_perancangan_target_nutrisi.sql` (84) | `target_nutrisi` + 3 placeholder `menunggu_konfirmasi` |

**Bukti uji (scratch `vertonik_scratch_mig`, di-DROP)**: pass 1 & pass 2 **idempoten** (jumlah baris identik: 19/16/20/5/8/15/3/5/3) · uji dgn data live disalin (5 mejas, 13 monitorings, 51 alerts) → data lama utuh · uji negatif: FK `id_meja=99999` & CHECK `jenis_talang='XYZ'` ditolak.

## (e) Dampak kontrak API (usulan)
`GET/PUT /konfigurasi-dosis` · `/timing-operasi` · `GET /aturan-fail-safe` · `GET/POST /target-nutrisi` + `GET /api/target-nutrisi` utk ESP32 · `GET/PUT /penampung-states/:id_meja` · perluasan `GET /api/get-thresholds` (+deadband, sanity, target) · `save-sensor`/`save-alert` terima `id_meja` + `ec_ms_cm`/`severity` · **whitelist `master.js` + `TABLE_SPECS _validate.js` wajib ditambah** utk kolom baru (kalau tidak, kolom tak muncul di `GET /meja`).

## (f) Keputusan yang butuh user
1. **Lampiran B kosong** (6 butir) — kerangka siap, nilai NULL; jangan ditebak.
2. **`sensor_thresholds.min/max`** — 4/5 baris beda dgn dokumen; disamakan atau tidak (efek langsung ke alert/`get-thresholds`)?
3. **Data meja live** (5 baris, 1.346 lubang) vs dokumen (4 meja, 1.220) — selaraskan atau biarkan (CRUD dikelola aplikasi)?
4. **Eksekusi migrasi kapan?** (`psql -f` atau lewat `restore.sh`) — setelah itu `schema.sql` perlu diregenerasi.
5. **Sumber kebenaran** nilai dosis: ESP32 (§5: aturan dosing di alat) vs tabel web — perlu kesepakatan.
6. Risiko performa: tabel baru <100 baris (aman); saran indeks `monitorings` dari audit performa belum disentuh (terpisah).
