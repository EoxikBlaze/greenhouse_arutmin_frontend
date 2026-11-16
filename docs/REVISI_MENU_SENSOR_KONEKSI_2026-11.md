# Revisi menu, data sensor, keselamatan & koneksi — 16 Nov 2026

Ringkasan temuan dan perubahan. Sumber kebenaran angka tetap: `aiMelonModul.js`, `aiPanduan.js`,
`sanitySensor.js`, `gerbangDosis.js` (backend), dan tabel `sensor_thresholds` (Master Data → Ambang Sensor).

## 1. Data mentah ESP32 `gabungan` → kolom → tampilan

| Kunci payload (`garap/aktuator-01/data`) | Arti & satuan (dari firmware) | Disimpan di | Tampil di |
|---|---|---|---|
| `ph` | pH, 2 desimal, hanya bila 0–14 | `monitorings.ph` | Sensor, Parameter & Keamanan |
| `ph_volt` | tegangan probe pH (V), untuk kalibrasi 2 titik | memori server (`teganganPh.js`), tidak di DB | Kalibrasi |
| `tds` | TDS ppm (rumus modul TDS analog, kompensasi suhu, faktor koreksi NVS) | `monitorings.tds` | EC/TDS |
| `waterTemp` | suhu air tandon °C (DS18B20) | `monitorings."waterTemp"` | Suhu air tandon |
| `airTemp`, `humidity` | suhu °C & RH % udara (SHT31) | `monitorings."airTemp"`, `humidity` | Suhu & kelembapan udara |
| `float_bawah_rendah`, `float_atas_penuh` | dua pelampung (boolean) | **baru**: `perangkat.float_*` + `level_diperbarui_pada` | Level tandon |
| `estop_fisik` (v0.7) | tombol E-STOP GPIO36 mengunci | **baru**: `perangkat.estop_fisik` | Banner + Parameter & Keamanan |
| `peristiwa: "reset"` (v0.7) | tombol RESET GPIO19 ditekan | **baru**: `perangkat.reset_terakhir_pada` + `alert_logs` | Banner + Peringatan |
| `umur_detik` (v0.7) | bacaan antrean, diambil N detik lalu | `monitorings.created_at = now() − umur` | Riwayat |

Catatan penting:
- **ESP32 tidak mengukur EC terpisah dan tidak punya sensor "nutrisi" lain.** EC mS/cm = TDS ÷ 500 (skala yang sama dengan LCD
  firmware). Kolom `monitorings.ec_ms_cm` tidak pernah diisi firmware ini.
- **Level tandon bukan sensor kontinu**: hanya dua pelampung (kurang / cukup / penuh). Dulu nilainya dibuang server dan
  `/iot-v41/state` menebak pelampung dari status katup; kini diambil dari laporan alat, `null` = belum dilaporkan.
- **Bug ditemukan & diperbaiki**: `/iot-v41/state` memilih kolom `water_temp`/`air_temp` yang tidak ada; galat ditelan
  `.catch` sehingga EC/pH di halaman v4.1 selalu 0. Kini kolom benar, galat tidak disembunyikan, dan data basi
  (> `SENSOR_BASI_DETIK` = 120 dtk) dikembalikan `null` — bukan 0, bukan "stabil".

## 2. Batas peringatan

- Satu sumber: `sensor_thresholds` (Ambang Sensor). Dipakai `latest-sensor` (anomali), AI, analitik, dan halaman
  Parameter & Keamanan — ditampilkan sebagai **batas**, terpisah dari bacaan.
- `konfigurasi_dosis.batas_ec_*` / `batas_ph_*` (form lama Pengaturan Alat) tidak dipakai logika peringatan atau gerbang
  mana pun → dihapus dari form dan disembunyikan dari daftar parameter. Baris DB tidak dihapus.
- `EKSEKUSI_DIIZINKAN = false` tidak diubah; statusnya hanya dibaca (`GET /dashboard/keselamatan`).

## 3. Jadwal operasi permanen di ESP32

- Firmware v0.7 menyimpan `interval_sensor`, `jeda A→B`, dan `batas waktu isi air` di NVS `garap_jdw`, dimuat saat boot.
- Dikirim dengan perintah `JADWAL` (`POST /iot-v41/jadwal-alat`, sumber `timing_operasi`). Rentang dijaga di server
  **dan** firmware; nilai di luar batas keras firmware dijepit dan dilaporkan (`dijepit`). Tidak menyalakan output,
  tidak membuka dosing. Bukti tersimpan = perintah berstatus `selesai` dengan alasan `jadwal_disimpan_nvs`.
- `interval_sensor_detik` belum punya baris di `timing_operasi`, jadi belum dikirim dari web (firmware memakai 5 dtk).

## 4. Penanganan koneksi

| Kondisi | Perilaku |
|---|---|
| Internet Pi putus, Wi-Fi router tetap | Tidak ada yang berubah: broker MQTT, API, dan PostgreSQL berjalan lokal di Pi, data tetap tersimpan. |
| Wi-Fi Pi hilang | **Baru** `deploy-pi/jaga-jaringan` (repo backend): timer tiap 60 dtk; 3× berturut tanpa sambungan → `nmcli connection up vertonik-hotspot`. Profil hotspot dibuat oleh skrip lama `vertonik-hotspot cadangan`. |
| ESP32 → Pi putus | Sudah ada: WiFiMulti (termasuk SSID hotspot Pi), cari server (gateway 10.42.0.1 → NVS → mDNS → probe subnet), MQTT lalu cadangan HTTP. **Baru**: bila Wi-Fi tersambung tetapi server hilang > 2 menit, ESP32 memutus dan memindai ulang jaringan dikenal (mis. pindah ke hotspot Pi). |
| Pi mati / tak terjangkau | **Baru**: antrean RAM 120 bacaan (satu per 60 dtk ≈ 2 jam), dikirim ulang dengan `umur_detik` setelah tersambung. |

Batasan yang belum bisa diwujudkan:
- Antrean ESP32 **hilang bila ESP32 restart/mati listrik** (sengaja tidak di flash/NVS: umur tulis terbatas). Data yang tidak
  pernah sampai ke Pi tidak diklaim tersimpan.
- Pi **tidak otomatis kembali** dari hotspot ke Wi-Fi klien (satu radio; pemindaian saat mode AP tidak andal). Kembali:
  `sudo vertonik-hotspot mati` atau reboot.
- Hotspot hanya menolong ESP32 yang punya SSID/sandi hotspot Pi di `rahasia.h` (`WIFI_JARINGAN`).
- ESP32 tanpa RTC: waktu bacaan antrean dihitung dari `millis()` (relatif), akurat ± beberapa detik.

## 5. Pemasangan

1. Backend: `npm run migrate` (file `2026-11-16_01_status_keselamatan_alat.sql`, hanya `ADD COLUMN` nullable), restart `vertonik-api`.
2. Firmware: flash `deploy-pi/firmware/gabungan/gabungan.ino` (v0.7). Firmware lama tetap diterima; kolom baru tetap `NULL`.
3. Pi: `sudo bash deploy-pi/jaga-jaringan/pasang.sh`, pastikan `sudo vertonik-hotspot cadangan` pernah dijalankan.
4. Mosquitto ACL tidak perlu diubah (peristiwa RESET lewat topik `data` yang sudah diizinkan).
