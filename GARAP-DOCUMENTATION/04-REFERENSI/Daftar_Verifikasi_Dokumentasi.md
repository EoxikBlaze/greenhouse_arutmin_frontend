# Daftar Verifikasi Dokumentasi GARAP

| Atribut | Isi |
|---|---|
| Nomor dokumen | GARAP-REF-04 |
| Versi | 1.0 |
| Tanggal | 12 November 2026 |
| Tujuan | Daftar informasi yang **wajib diverifikasi manusia** sebelum dokumen disahkan |

Isi kolom **Hasil** dan **Diverifikasi oleh** saat pemeriksaan di lapangan.

## 1. Perangkat

| No | Hal | Nilai di dokumen | Sumber | Hasil | Diverifikasi oleh |
|---|---|---|---|---|---|
| 1 | Model probe pH | Tidak disebut firmware; prompt: DFRobot Gravity KB2003 | — | | |
| 2 | Model probe EC | Tidak disebut | — | | |
| 3 | Sensor udara | SHT31 (firmware aktif) vs DHT22 (firmware lama) | `gabungan.ino` | | |
| 4 | Solenoid valve terpasang? | Tidak ada di firmware aktif | `gabungan.ino` | | |
| 5 | Kapasitas catu daya 12 V (A) | Tidak tercantum | — | | |
| 6 | Debit tiap pompa (mL/detik) | Belum dikalibrasi; data pengembangan: A 2,00; B 2,10; Up 1,50; Down 1,53 | halaman Pengaturan Alat | | |
| 7 | Pembagi 33k/10k di GPIO 36 terpasang | Wajib | firmware | | |
| 8 | Dioda flyback tiap pompa | Wajib | firmware | | |
| 9 | Jenis relay HIGH-trigger | `RELAY_AKTIF_LOW = false` | firmware | | |
| 10 | Firmware yang ter-flash di papan | `gabungan-0.6` (commit `ec04293`) | Serial `status` | | |
| 11 | Model Raspberry Pi | Pi 4/5 | panduan lama | | |
| 12 | APAR dan UPS/genset tersedia | — | — | | |

## 2. Jaringan dan Server

| No | Hal | Nilai di dokumen | Hasil | Diverifikasi oleh |
|---|---|---|---|---|
| 1 | IP tetap Pi | Tidak diketahui (192.168.1.172 tidak terjangkau 11 Nov 2026) | | |
| 2 | Alamat website untuk operator | `https://garap.local` / `https://vertonik.local` | | |
| 3 | SSID Wi-Fi lapangan di `rahasia.h` | Daftar dari `rahasia.h.contoh` | | |
| 4 | Port 1883 terbuka di router/ufw | Wajib | | |
| 5 | Semua layanan aktif (`status-server.sh`) | — | | |
| 6 | Sandi bawaan Pi sudah diganti | Risiko P1 | | |

## 3. Data Operasional

| No | Hal | Nilai di dokumen | Hasil | Diverifikasi oleh |
|---|---|---|---|---|
| 1 | Kapasitas tandon | 3.000 L (prompt) vs 250 L (data pengembangan) | | |
| 2 | Jumlah meja NFT/DFT | — | | |
| 3 | Jenis tanaman aktif | Selada, seledri, kangkung, melon (rencana) | | |
| 4 | Ambang kelembapan | Data pengembangan 100–100 % (salah isi) | | |
| 5 | Takaran nutrisi manual resmi | Belum ada di dokumen | | |
| 6 | `konfirmasi_tandon_jam`, `pengingat_konfirmasi_jam`, `ulang_konfirmasi_jam` | Belum diputuskan | | |
| 7 | Nama pejabat pengesah dokumen | — | | |

## 4. Fitur

| No | Hal | Status di dokumen | Hasil | Diverifikasi oleh |
|---|---|---|---|---|
| 1 | Kalibrasi pH/EC sampai ke ESP32 | pH: dikirim bila alat melaporkan `ph_volt`; EC: belum dikirim; teks layar: "langsung mengirim" | | |
| 2 | Uji & kalibrasi pompa dari aplikasi | Perintah dikirim ke alat; dikunci `UJI_POMPA_DIIZINKAN` + mode pemeliharaan; belum diuji | | |
| 3 | Pemulihan papan | Paket disiapkan, belum dikirim | | |
| 4 | Antarmuka siklus budidaya & persetujuan dosing | Belum ada | | |
| 5 | `EKSEKUSI_DIIZINKAN` | `false` | | |
| 6 | Kontrol air | 503 nonaktif | | |

## 5. Pemeriksaan Dokumen Sebelum Pengesahan

- [ ] Semua butir [PERLU VERIFIKASI] di dokumen sudah diisi atau diberi keputusan.
- [ ] Prosedur keselamatan dibaca dan disetujui pengelola greenhouse.
- [ ] Poster dicetak dan dipasang di dekat panel (Checklist, Troubleshooting, Dosing).
- [ ] Operator sudah dilatih SOP-01 dan SOP-02 Bab 5–8.
- [ ] Lembar pengesahan Juknas ditandatangani.
