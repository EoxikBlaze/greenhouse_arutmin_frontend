# Laporan Inventarisasi dan Audit Repository GARAP

| Atribut | Isi |
|---|---|
| Nomor dokumen | GARAP-DOK-00 |
| Versi | 1.0 |
| Tanggal audit | 12 November 2026 |
| Lingkup | Repository induk `Vertoniksmartfarm` (web, mobile, firmware, konfigurasi Pi) dan salinan lokal repository backend `backend-nodejs` |
| Sifat | Baca-saja. Tidak ada source code, firmware, database, atau konfigurasi yang diubah. |

> **Catatan keselamatan.** Gerbang dosis backend `EKSEKUSI_DIIZINKAN = false` (berkas `backend-nodejs/src/gerbangDosis.js` baris 21). Seluruh dokumentasi ini memperlakukan eksekusi dosing sebagai **BELUM DIIZINKAN**.

---

## 1. Struktur repository yang diperiksa

| Bagian | Lokasi | Teknologi | Catatan audit |
|---|---|---|---|
| Website | `react-web-app/` | React 19, Vite, TypeScript, Tailwind v3 | 26 halaman, rute di `src/router.tsx`, menu di `src/layouts/AppShell.tsx` |
| Aplikasi mobile | `flutter_mobile_app/` | Flutter (Android, iOS) | 16 halaman di `lib/pages/`, panggilan API di `lib/services/api_service.dart` |
| Backend (repo terpisah) | `backend-nodejs/` (salinan lokal `greenhouse_arutmin_backend`) | Node.js, Express, PostgreSQL, MQTT | 32 berkas rute; commit terbaru `0383c55` (12 Nov 2026, 21:27): kirim uji pompa, laju pompa, dan kalibrasi pH ke alat |
| Firmware ESP32 | `deploy-pi/firmware/` | Arduino C++ | `gabungan/gabungan.ino` (aktif, v0.6, di-commit `ec04293` pada 12 Nov 2026); `sensor/` dan `aktuator/` (v0.2, rancangan dua papan) |
| Konfigurasi Raspberry Pi | `deploy-pi/` | Mosquitto, systemd, nginx, Ollama, skrip bash | `mosquitto/garap.conf`, `mosquitto/garap.acl`, `systemd/vertonik-api.service`, `nginx/vertonik.conf` |
| Dokumentasi lama | `docs/` | Markdown | ±90 berkas; sebagian sudah tidak sesuai kode (lihat bagian 6) |
| Dokumentasi Juknas/Juknis lama | `docs/juknas-juknis/` | Markdown, HTML, PDF, PNG | Modul dan 2 poster; dipakai sebagai bahan banding, tidak ditimpa |

## 2. Inventaris komponen perangkat (sesuai firmware aktif `gabungan-0.6`)

| Komponen | Status | Bukti |
|---|---|---|
| ESP32 Dev Module (satu papan gabungan sensor + aktuator) | Ada di firmware | `gabungan.ino` baris 1–30 |
| ADC ADS1115 (alamat 0x48): kanal A0 = pH, A1 = EC (pembagi 10k/10k) | Ada di firmware | `gabungan.ino` baris 68–74 |
| Probe pH (model "DFRobot Gravity KB2003" tidak disebut di firmware) | [PERLU VERIFIKASI] model | Firmware hanya membaca tegangan pH lewat ADS1115 |
| Probe EC/TDS | Ada di firmware | `gabungan.ino` A1 |
| DS18B20 suhu air, GPIO 4 | Ada di firmware | `gabungan.ino` baris 76 |
| SHT31 suhu & kelembapan udara (0x44) | Ada di firmware gabungan | **DHT22 hanya ada di firmware lama `sensor.ino` v0.2** |
| Pompa peristaltik A (GPIO 25), B (26), pH Up (27), pH Down (18) | Ada di firmware | `PIN_OUT` baris 87 |
| Pompa isi air (GPIO 16) | Ada di firmware | `PIN_OUT` baris 87 |
| Solenoid valve | **Tidak ada di firmware gabungan.** Hanya disebut di `aktuator.ino` v0.2 (rancangan dua papan) | [PERLU VERIFIKASI] apakah terpasang |
| Modul relay (HIGH-trigger) | Ada di firmware | `RELAY_AKTIF_LOW = false` baris 85 |
| Pelampung bawah (GPIO 32) dan atas (GPIO 33) | Ada di firmware | baris 92–93 |
| Lampu pilot merah (13), hijau (17), biru (23) via ULN2003 | Ada di firmware | baris 96–98 |
| LCD 20x4 I2C (0x27) | Ada di firmware | baris 100 |
| Tombol RESET (GPIO 19) | Ada di firmware v0.6 | baris 99 |
| E-STOP: bus +12 V lewat pembagi 33k/10k ke GPIO 36 | Ada di firmware | baris 112–117 |
| Catu daya 12 V | Disebut di komentar firmware | Kapasitas arus [PERLU VERIFIKASI] |
| Raspberry Pi (API, PostgreSQL, Mosquitto, nginx, Ollama) | Ada di konfigurasi | `deploy-pi/` |
| Kapasitas debit pompa (mL/detik) | **Belum dikalibrasi** (nilai awal 0 = perintah berbasis mL ditolak) | `ML_PER_DETIK` baris 89 |

## 3. Pemetaan status fitur

Kategori: **SUDAH BERFUNGSI** (ada di kode dan tes, tampil di aplikasi), **SEDANG DIKEMBANGKAN** (baru masuk kode, terkunci bawaan, atau belum lengkap), **BELUM DIIMPLEMENTASIKAN** (tidak ada di antarmuka), **TIDAK AKTIF** (ada di kode tetapi sengaja dimatikan), **BELUM TERVERIFIKASI** (ada di kode, belum diuji di perangkat nyata).

### 3.1 Website

| Fitur | Rute | Status |
|---|---|---|
| Login, logout, sesi | `/login` | SUDAH BERFUNGSI |
| Peran admin, petani, demo (demo baca-saja) | semua | SUDAH BERFUNGSI |
| Dashboard | `/dashboard` | SUDAH BERFUNGSI |
| Sensor real-time + unduh laporan `.xlsx` | `/sensor-realtime` | SUDAH BERFUNGSI |
| Peringatan (riwayat alert, admin menandai sudah ditangani) | `/peringatan` | SUDAH BERFUNGSI |
| Kebun Saya (mulai semai, daftar batch, prediksi panen) | `/tanam` | SUDAH BERFUNGSI |
| Data tahap Semai, Peremajaan, Pendewasaan, Panen (selesaikan tahap dengan jumlah berhasil) | `/semai` … `/panen` | SUDAH BERFUNGSI |
| Target Nutrisi: target naik harian, target penampung, parameter, keamanan, perawatan | `/dosing` | SUDAH BERFUNGSI (pengaturan saja; tidak menjalankan pompa) |
| Saran nutrisi dari tren | `/dosing` | SUDAH BERFUNGSI (teks saran saja) |
| Saklar izin aktuator dan mode isi air | `/saklar` | SUDAH BERFUNGSI (izin saja) |
| Kalibrasi sensor (catat dan riwayat) | `/kalibrasi` | SUDAH BERFUNGSI di server; pH dikirim ke ESP32 sebagai tegangan probe (`ph_v7`/`ph_v4`) bila alat melaporkan `ph_volt` (firmware v0.6, perlu flash ulang); **EC belum dikirim** (hanya tersimpan di server) |
| Data uji lab | `/data` | SUDAH BERFUNGSI |
| Master data: jenis tanaman, meja, ambang sensor | `/tanaman`, `/meja`, `/ambang` | SUDAH BERFUNGSI |
| Laporan | `/laporan` | SUDAH BERFUNGSI |
| Manajemen user | `/user` | SUDAH BERFUNGSI |
| Riwayat audit (Catatan Aktivitas) | `/audit` | SUDAH BERFUNGSI |
| Akun saya (profil, sandi, tema) | `/profil` | SUDAH BERFUNGSI |
| CCTV | `/cctv` | SUDAH BERFUNGSI (perlu kamera terpasang) |
| Asisten AI (saran teks, tanpa akses ke aktuator) | `/asisten-ai` | SUDAH BERFUNGSI (butuh Ollama di Pi) |
| Pengaturan Alat | `/pengaturan-alat` | SUDAH BERFUNGSI (pengaturan di server) |
| Pemulihan Papan | `/pemulihan-papan` | SEDANG DIKEMBANGKAN (paket disiapkan, **belum dikirim ke papan**) |
| Koneksi Alat (diagnostik MQTT) | `/mqtt-diagnostik` | SUDAH BERFUNGSI |
| Tombol STOP pompa | komponen `TombolStopPompa` | SUDAH BERFUNGSI (mengantre perintah STOP; tetap gunakan E-STOP fisik) |
| Uji pompa dan kalibrasi laju pompa dari aplikasi | `/iot-v41/uji-pompa`, `/iot-v41/kalibrasi-pompa` | SEDANG DIKEMBANGKAN (backend `0383c55` mengirim `UJI_POMPA`/`KALIBRASI` ke alat; dikunci bawaan `UJI_POMPA_DIIZINKAN`, hanya admin, wajib mode pemeliharaan; belum diuji di perangkat) |
| Kontrol air (isi, stop, ganti mode) | `/watercontrol` | TIDAK AKTIF (backend menjawab `503 kontrol_air_nonaktif`) |
| Siklus budidaya bertahap: konfirmasi tandon, konfirmasi peremajaan H+4, batas jawab 24 jam, konfirmasi jumlah benih | API `/api/siklus`, `/api/konfirmasi` | BELUM DIIMPLEMENTASIKAN di antarmuka (hanya API backend); penjadwal TIDAK AKTIF secara bawaan (`SIKLUS_PENJADWAL`) |
| Persetujuan dosing (ajukan, setujui, tolak, cabut) | API `/api/dosing/siklus` | BELUM DIIMPLEMENTASIKAN di antarmuka (hanya API backend) |
| Eksekusi dosing | `jalankan()` | TIDAK AKTIF — diblokir `EKSEKUSI_DIIZINKAN = false` |
| Permintaan dosis langsung | `POST /api/aktuator/perintah` tipe `DOSIS` | TIDAK AKTIF (dijawab `423 butuh_alur_persetujuan`) |

### 3.2 Aplikasi mobile (Flutter)

| Fitur | Halaman | Status |
|---|---|---|
| Login, simpan sesi | `login_page.dart` | SUDAH BERFUNGSI |
| Beranda petani dan dashboard | `beranda_petani.dart`, `dashboard_page.dart` | SUDAH BERFUNGSI |
| Sensor dan riwayat monitoring | `sensor_page.dart`, `riwayat_monitoring_page.dart` | SUDAH BERFUNGSI |
| Peringatan + notifikasi lokal (dicek tiap 60 detik, menampilkan 3 peringatan baru per pemeriksaan) | `peringatan_page.dart`, `notifikasi_service.dart` | SUDAH BERFUNGSI |
| Tanam (mulai semai, lihat batch) | `tanam_page.dart` | SUDAH BERFUNGSI |
| Target naik harian (lihat) | `naik_harian_page.dart` | SUDAH BERFUNGSI |
| Saklar (admin dapat mengubah) | `saklar_page.dart` | SUDAH BERFUNGSI |
| Kontrol air | `watercontrol_page.dart` | TIDAK AKTIF (server 503); tombol STOP pompa tetap ada |
| Uji lab, laporan PDF, CCTV, asisten AI, profil | halaman terkait | SUDAH BERFUNGSI |
| Konfirmasi tahap pertumbuhan versi siklus baru dan persetujuan dosing | — | BELUM DIIMPLEMENTASIKAN |

### 3.3 Perangkat IoT dan Raspberry Pi

| Hal | Status |
|---|---|
| Firmware `gabungan-0.6` | BELUM TERVERIFIKASI (sudah di-commit, belum dikompilasi/di-flash/diuji dalam audit ini) |
| Broker Mosquitto port 1883, tanpa anonim, ACL per perangkat | Ada di konfigurasi; BELUM TERVERIFIKASI di Pi nyata |
| Fail-safe 30 detik tanpa detak server | Ada di firmware; BELUM TERVERIFIKASI di perangkat |
| E-STOP fisik dan dari server | Ada di firmware; BELUM TERVERIFIKASI di perangkat |
| Raspberry Pi | BELUM TERVERIFIKASI — audit 11 November 2026 mencatat Pi tidak terjangkau (`No route to host`) |
| Kapasitas tandon 3.000 liter | [PERLU VERIFIKASI] — basis data pengembangan mencatat volume penampung 250 L (halaman Saklar) |

## 4. Alur operasional dan dosing yang ditemukan di kode

1. **Alur tahap yang dipakai antarmuka sekarang (model lama):** Mulai Semai (tanaman, meja, jumlah benih, tanggal) → Selesaikan tahap dengan jumlah berhasil → server membuat tahap berikutnya (Peremajaan → Pendewasaan → Panen). Berhasil 0 = tahap gagal.
2. **Alur siklus budidaya baru (backend, belum ada antarmuka):** `DRAFT → TANK_PREPARATION → WAITING_TANK_CONFIRMATION → SEEDING → WAITING_REJUVENATION_CONFIRMATION → WAITING_SEED_COUNT_CONFIRMATION → GROWTH → COMPLETED` (dapat `CANCELLED`). Konfirmasi peremajaan dibuat **96 jam (H+4)** setelah semai, batas jawab **24 jam**. Tidak dijawab = kedaluwarsa, bibit **tidak** dianggap siap, siklus kembali ke SEEDING dan operator diberi notifikasi.
3. **Alur persetujuan dosing (backend, belum ada antarmuka):** `WAITING_APPROVAL → APPROVED → RUNNING → MIXING → VERIFYING → SUCCESS` (atau `REJECTED`, `EXPIRED`, `CANCELLED`, `EXHAUSTED`, `FAULT`). Langkah `jalankan` selalu ditolak `423` karena `EKSEKUSI_DIIZINKAN = false`.
4. Parameter waktu dan batas dibaca dari tabel parameter dan hanya dipakai bila berstatus **SIAP** (nilai sah dan tervalidasi). Tidak ada nilai tebakan.

## 5. Keamanan dan hak akses

| Hal | Temuan |
|---|---|
| Peran | `admin` (semua menu dan ubah data), `petani` (menu umum), `demo` (boleh melihat menu kelola, setiap perubahan ditolak 403) |
| Login | Rate limit 10 percobaan per menit pada `POST /login` |
| Perangkat | MQTT dengan nama pengguna per perangkat dan ACL topik; API key perangkat untuk jalur HTTP |

## 6. Perbedaan dokumentasi lama dengan implementasi

| Dokumen lama | Isi lama | Fakta di kode | Yang dipakai |
|---|---|---|---|
| `docs/PANDUAN_UJI_ALAT_HARDWARE.md` | Firmware `gabungan-0.4`, tombol RESET belum dipakai | Firmware `gabungan-0.6`, tombol RESET menampilkan info jaringan dan melepas kunci E-STOP lokal bila aman | Kode (dengan catatan v0.6 belum di-commit) |
| `deploy-pi/PANDUAN_SERVER_PI.md` | ESP32 memakai HTTP polling dua papan | Firmware gabungan memakai MQTT, HTTP hanya cadangan | Kode |
| Prompt kerja | Sensor DHT22 | Firmware aktif memakai SHT31 | Kode |
| Prompt kerja | Solenoid valve | Tidak ada di firmware aktif | Ditandai [PERLU VERIFIKASI] |
| `README.md` | Menu "Dosing Otomatis", "Water Control" | Menu kini "Target Nutrisi"; Water Control dialihkan ke Dashboard | Kode |
| Halaman Saklar | "otomasi menyuntik nutrisi" bila saklar ON | Tidak ada jalur otomasi yang mengirim perintah DOSIS; gerbang menolak | Kode — dokumen menegaskan dosing tetap diblokir |

## 7. Bukti visual

Tangkapan layar asli diambil dari website yang berjalan di komputer pengembang (`127.0.0.1:5173`) dengan akun **demo** (baca-saja), 12 November 2026. Lokasi: `03-VISUAL-PREVIEW/assets/screenshots/`. Data di layar adalah data pengembangan (alat tidak tersambung), bukan kondisi greenhouse.
