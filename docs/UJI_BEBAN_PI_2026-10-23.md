# Uji Beban & Rekomendasi Konfigurasi Raspberry Pi — 23 Okt 2026

Database diisi bertahap sampai **5 juta bacaan sensor** (+2.500 alert), lalu tiap endpoint diukur dan server
dibebani ratusan klien bersamaan. Lingkungan = instalasi bersih persis seperti Pi (impor dump → migrasi →
pembersihan → backend `NODE_ENV=production`), di **Mac M2 8 core / 16 GB, SSD, PostgreSQL 17**.

> **Ini bukan Raspberry Pi.** Angka Pi di bawah adalah perkiraan: Pi 5 ≈ 2–3× lebih lambat per core dari M2,
> Pi 4 ≈ 4–6×, dan kartu SD jauh lebih lambat dari SSD untuk tulis acak. Ukur ulang di Pi dengan
> `scripts/loadtest.js` setelah terpasang.

## 1. Berapa banyak data yang masuk

| Sumber | Laju | Baris/hari | Baris/tahun | Disk/tahun (±175 B/baris data+indeks) |
|---|---|---|---|---|
| Firmware sekarang: 1 ESP32 sensor, kirim tiap 5 dtk | 0,2/dtk | 17.280 | 6,3 juta | **±1,1 GB** |
| Terburuk: 4 penampung masing-masing tiap 5 dtk | 0,8/dtk | 69.120 | 25 juta | **±4,4 GB** |

Tabel `monitorings` **tidak punya retensi**: `cron_retensi.sql` hanya mengurus `sensor_readings`
(yang tidak ditulis aplikasi), dan `pasang-server.sh` tidak memasang cron retensi. Data terus bertambah.

## 2. Latensi per endpoint vs jumlah data (p50, satu klien)

| Endpoint | 10 rb | 100 rb | 500 rb | 1 jt | 2,5 jt | 5 jt (≈72 hari terburuk) |
|---|---|---|---|---|---|---|
| dashboard | 1,4 ms | 0,6 | 0,8 | 1,5 | 0,7 | 0,6 |
| chart-data (grafik) | 2,2 | 1,9 | 1,9 | 2,3 | 2,2 | 2,3 |
| getReport6Jam | 4,2 | 4,8 | 4,6 | 4,3 | 4,7 | 5,2 |
| ESP32 kirim sensor | 2,6 | 1,6 | 1,6 | 1,6 | 1,5 | 1,5 |
| AI "Diagnosa menyeluruh" (DB) | 8,6 | 3,7 | 3,3 | 3,6 | 4,4 | 6,2 |
| **laporan (sebelum perbaikan)** | 3,0 | 13 | 68 | 135 | 364 | **716** |

Semua endpoint harian **datar** berapa pun datanya (indeks tepat). Hanya `/laporan` & `/laporan/csv` yang naik
lurus ±0,14 ms per 1.000 baris → 1 tahun terburuk ±3,6 dtk di M2, **±10–20 dtk di Pi**.

### Diperbaiki: `/laporan` (backlog K3)
`date_trunc('month', created_at) = bln` membuat indeks tak terpakai → setiap bulan di laporan memindai
**seluruh** riwayat. Diganti rentang `created_at >= bln AND < bln + 1 bulan` (`src/routes/laporan.js`).
Pada data yang sama (5 jt baris, 3 bulan): **2.014 ms → 489 ms**, hasil identik, tes laporan 8/8 lulus.
Sekarang waktunya bergantung pada data **per bulan**, bukan seluruh riwayat (bulan tanpa data: 0,04 ms).

## 3. Beban bersamaan (5 jt baris, klien TANPA jeda)

Campuran: dashboard 30% · latest-sensor 20% · grafik 15% · laporan 6 jam 10% · publik 5% · ESP32 17% · AI diagnosa 3%.

| Klien | req/dtk | p50 | p95 | p99 | galat | RAM Node | CPU Node |
|---|---|---|---|---|---|---|---|
| 10 | **1.963** | 3 ms | 14 ms | 30 ms | 0 | 142 MB | ±100% (1 core) |
| 50 | 1.744 | 13 ms | 118 ms | 218 ms | 0 | 144 MB | ±90% |
| 200 | 1.494 | 16 ms | 524 ms | 1.060 ms | 0 | 165 MB | ±80% |

- Penyempit = **Node satu core** (CPU ±100%), bukan memori. RAM Node ≤ 165 MB (batas sandbox Pi 512 MB).
- Perkiraan Pi: **Pi 5 ±600–800 req/dtk, Pi 4 ±300–400 req/dtk.**
- Kebutuhan nyata: 20 pengguna (polling tiap 5–15 dtk) + 2 ESP32 ≈ **5 req/dtk** → cadangan ±60–150×.
- Backup `pg_dump -Fc` DB 849 MB: 9 dtk, 48 MB (data uji sangat seragam; data asli kira-kira 3–5× lebih besar).

## 4. Anggaran RAM di Pi (saat semua jalan)

| Proses | RAM |
|---|---|
| Raspberry Pi OS Lite + layanan | ±250–350 MB |
| Node API (terukur di bawah beban) | 60–170 MB |
| PostgreSQL (shared_buffers 128 MB bawaan + koneksi) | ±200–400 MB |
| nginx | ±20 MB |
| Ollama + `qwen2.5:1.5b` saat menjawab | ±1,1–1,5 GB (`0.5b`: ±0,5 GB) |
| **Total** | **±1,7–2,4 GB** |

## 5. Rekomendasi konfigurasi Raspberry Pi

| | Minimum | **Disarankan** |
|---|---|---|
| Papan | Pi 4 · 4 GB | **Pi 5 · 8 GB** (AI lebih lancar, cadangan RAM) |
| Penyimpanan | microSD A2 "High Endurance" 32 GB | **SSD** (USB 3 di Pi 4 / NVMe HAT di Pi 5) ≥ 128 GB — tulis sensor 24 jam/hari merusak SD biasa |
| OS | Raspberry Pi OS 64-bit **Trixie** (Lite) | sama |
| Daya | adaptor resmi (Pi 4: 5V 3A · Pi 5: 5V 5A) | + UPS kecil — mati listrik di tengah tulis dapat merusak kartu SD |
| Pendingin | heatsink | **kipas aktif** (Ollama membuat CPU 100% berpuluh detik) |
| Pi 2 GB | hanya tanpa AI / model 0,5B | — |

PostgreSQL untuk Pi 4–8 GB (belum dipasang otomatis — perlu keputusan):
`shared_buffers = 256MB`, `effective_cache_size = 1GB`, `work_mem = 8MB`, `maintenance_work_mem = 64MB`,
`wal_compression = on`, `checkpoint_timeout = 15min`.

## 6. Yang perlu diputuskan

1. **Retensi `monitorings`** — mis. simpan mentah 90 hari, sisanya ringkasan per jam. Tanpa ini disk & `/laporan` terus tumbuh.
2. **Tuning PostgreSQL** di `pasang-server.sh` (nilai di atas).
3. **Simpan backup ke luar Pi** — saat ini 14 salinan di kartu yang sama (satu titik gagal).
