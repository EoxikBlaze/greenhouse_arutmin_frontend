# Lembar Fakta GARAP — Tahap 2 (Pengumpulan Informasi Teknis)

Tanggal: 12 November 2026
Baseline: **working tree** (firmware `gabungan-0.6`), sesuai keputusan Tahap 1. Fakta dari kode yang belum di-commit ditandai **(BDC)** = belum di-commit, berlaku setelah rilis.
Sifat: baca-saja. Semua fakta merujuk ke berkas:baris. Singkatan: `G` = `deploy-pi/firmware/gabungan/gabungan.ino`; `BE/` = `backend-nodejs/`; `WEB/` = `react-web-app/src/`; `MOB/` = `flutter_mobile_app/lib/`.
Rahasia (sandi Wi-Fi, API key, sandi broker) **tidak** dicantumkan dan tidak boleh masuk dokumen mana pun.

---

## A. Perangkat IoT (ESP32 papan tunggal, `gabungan-0.6`) (BDC)

### A1. Perangkat keras

| Komponen | Pin / alamat | Catatan | Sumber |
|---|---|---|---|
| I2C SDA / SCL | GPIO 21 / 22, 100 kHz | | G:70-71 |
| ADS1115 | 0x48 | A0 = pH, A1 = EC lewat pembagi 10k/10k (×2) | G:72-75 |
| SHT31 (suhu & RH udara) | 0x44 | | G:76 |
| LCD 20×4 PCF8574 | 0x27 | dideteksi otomatis saat boot | G:100 |
| DS18B20 (suhu air) | GPIO 4 | | G:77 |
| Pompa A / B / pH Up / pH Down / Isi air | GPIO 25 / 26 / 27 / 18 / 16 | relay HIGH = nyala | G:85-88 |
| Pelampung bawah / atas | GPIO 32 / 33 | INPUT_PULLUP, HIGH = terangkat; kabel atas putus terbaca "penuh" | G:94-95 |
| Lampu merah / hijau / biru | GPIO 13 / 17 / 23 | via ULN2003 | G:96-98 |
| Tombol RESET | GPIO 19 | info LCD 4 dtk + lepas latch E-STOP bila aman; **tidak me-reboot** | G:99, 708-725 |
| Baca E-STOP | GPIO 36 | bus +12 V lewat pembagi 33k/10k; LOW / mengambang = ditekan | G:112-113 |

Kalibrasi tersimpan di NVS `garap_kal` (G:198-225). Bawaan laju pompa = 0, sehingga dosis berbasis mL ditolak `belum_dikalibrasi` (G:90, 308).

### A2. Waktu

| Hal | Nilai | Sumber |
|---|---|---|
| Kirim telemetri | tiap 5 dtk (sensor hanya dibaca saat pompa diam) | G:78, 860 |
| Fail-safe detak server | 30 dtk → semua pompa berhenti, alasan `server_hilang` | G:120, 845 |
| Detak dari server | tiap 5 dtk di `garap/server/status` | deploy-pi/PANDUAN_MQTT.md:31 |
| Jeda pompa A → B | 60 dtk | G:93 |
| Watchdog ESP32 | 15 dtk | G:812 |

### A3. Batas pengaman firmware

| Jenis | Per perintah | Per jam | Durasi maks relay | Sumber |
|---|---|---|---|---|
| Nutrisi AB | 214 mL | 450 mL | 70 dtk tiap pompa | G:92, 118-119 |
| pH Up / pH Down | 10 mL | 30 mL | 12 dtk | G:92, 118-119 |
| Isi air | — | — | 600 dtk; berhenti saat pelampung atas penuh | G:92, 840 |
| Uji pompa | — | — | 120 dtk (backend: 5–120 dtk) | G:321; BE/src/aktuator.js:25 |

Aturan lain:
- Satu pekerjaan sekaligus; perintah lain ditolak `sibuk` (G:293).
- Tanpa detak server segar, hanya `STOP` dan `STOP_DARURAT` yang diterima (G:376-380).
- DOSIS ditolak bila pelampung bawah rendah; pompa non-isi berhenti bila pelampung bawah turun (G:297, 841).
- Saat boot semua relay ditulis OFF sebelum `pinMode`; tidak ada aksi sampai detak server pertama (G:800-803, 828).

### A4. E-STOP

| Sumber | Efek | Cara melepas | Sumber |
|---|---|---|---|
| Tombol fisik (GPIO 36 LOW) | semua output mati, alasan `tombol_estop` | otomatis bila tombol diputar lepas, E-STOP server mati, dan detak server segar; atau tombol RESET dengan syarat sama | G:838, 854-856 |
| Server (`STOP_DARURAT`, admin) | latch server, semua perintah `menunggu` dibatalkan | `POST /api/aktuator/estop/reset` (admin) — **tidak ada tombol di web/mobile** | BE/src/routes/aktuator.js:82-94 |

### A5. Kontrak MQTT

| Arah | Topik | Isi | Sumber |
|---|---|---|---|
| ESP → server | `garap/aktuator-01/data` | waterTemp, airTemp, humidity, ph, tds, id_meja, float_bawah_rendah, float_atas_penuh, rssi, firmware; sensor gagal tidak dikirim | G:562-578 |
| ESP → server | `garap/aktuator-01/status` (retain, LWT `{"online":false}`) | online, firmware, rssi, uptime, estop, status pelampung | G:404-411, 476 |
| ESP → server | `garap/aktuator-01/hasil` | `{id,status,hasil:{alasan,ml_nyata,firmware}}`, diulang tiap 3 dtk sampai ack | G:234-256 |
| Server → ESP | `garap/aktuator-01/perintah` | `{id,tipe,parameter}` | G:374 |
| Server → ESP | `garap/aktuator-01/ack`, `garap/server/status` | `{id}`; `{online,estop,t}` | G:390-397 |

Cadangan HTTP (port 80, header `X-API-KEY`): `POST /api/device/v1/sensor` dan `/api/device/v1/heartbeat/aktuator`. **Perintah tidak pernah diambil lewat HTTP**, jadi pompa terkunci selama MQTT putus (G:12, 528-584).

### A6. Tipe perintah firmware

| Tipe | Parameter | Catatan | Sumber |
|---|---|---|---|
| `DOSIS` | `larutan` AB/PH_UP/PH_DOWN, `ml` | **tidak pernah dikirim server** (lihat C4) | G:296-312 |
| `ISI_AIR` | `aksi` MULAI/STOP | `aksi: STOP` saat pengisian berjalan ditolak `sibuk` — hentikan dengan `STOP` | G:293, 313-317 |
| `UJI_POMPA` | `pompa`, `detik` | | G:318-322 |
| `KALIBRASI` | `ph_v7`, `ph_v4`, `tds_faktor`, `laju_*` | disimpan ke NVS | G:323-350 |
| `BALIK_KALIBRASI` | `sensor` ph/ec | backend tidak memakainya | G:351-356 |
| `STOP` | — | semua mati | G:379 |
| `STOP_DARURAT` | — | latch E-STOP server | G:378 |

Alasan penolakan (`alasan`): `estop`, `sibuk`, `air_kurang_float_bawah`, `parameter`, `melebihi_batas_suntik`, `batas_jam_ab`, `batas_jam_ph`, `belum_dikalibrasi`, `melebihi_durasi_maks`, `tandon_penuh`, `parameter_uji_pompa`, `kalibrasi_ph_tak_sah`, `kalibrasi_tds_tak_sah`, `laju_pompa_tak_sah`, `tipe_tak_dikenal`, `server_hilang`. Saat berjalan: `tombol_estop`, `estop_server`, `dihentikan`, `stop_darurat` (G:292-380).

### A7. LCD dan lampu pilot

Baris 4 LCD, urutan prioritas (G:660-672): `E-STOP AKTIF!` → `WIFI MATI` → `HTTP SENSOR ONLY` → `TUNGGU SERVER...` → `MENGISI AIR...` → `DOSING A...` / `DOSING B...` / `pH UP...` / `pH DOWN...` → `PENAMPUNG KURANG` → `PENAMPUNG PENUH` → `PENAMPUNG CUKUP`.

| Lampu | Arti | Sumber |
|---|---|---|
| Hijau saja | normal | G:618-624 |
| Merah + hijau ("kuning") | air kurang, MQTT putus, atau belum ada detak server | |
| Merah saja | E-STOP aktif | |
| Biru | pompa sedang jalan | |

### A8. Perintah Serial (115200 baud) dan penemuan server

Serial (G:727-779): `status`, `scan`, `cari`, `baca`, `wifi SSID|SANDI`, `wifi hapus`, `server <IP>`, `server hapus`, `help`.
Urutan cari server (G:449-469): gateway hotspot Pi `10.42.0.1` → IP di NVS → mDNS `garap.local`, `vertonik.local`, `vertonic.local` → pindai subnet (port 1883 lalu 80) → `SERVER_IP` dari `rahasia.h`.

---

## B. Server Raspberry Pi

| Layanan | Port | Catatan | Sumber |
|---|---|---|---|
| `vertonik-api` (Node) | 127.0.0.1:8000 | systemd, Restart=always | deploy-pi/systemd/vertonik-api.service |
| `nginx` | 80, 443 (TLS self-signed) | proxy `/api/`, web statis | deploy-pi/nginx/vertonik.conf:34-79 |
| `mosquitto` | 1883 | tanpa anonim, file sandi + ACL | deploy-pi/mosquitto/garap.conf:5-12 |
| PostgreSQL | localhost | backup harian 02:15, simpan 14 hari | deploy-pi/PANDUAN_SERVER_PI.md:78 |
| Ollama | localhost:11434 | `qwen2.5:1.5b`; trio memakai `qwen2.5:0.5b` | BE/src/config.js:27; BE/src/aiTrioKolaborasi.js:6 |
| Hotspot Pi | `Vertoniksmartfarm`, 10.42.0.1 | `vertonik-hotspot nyala\|mati\|cadangan\|status` | deploy-pi/PANDUAN_KANTOR_DAN_HOTSPOT.md:58-77 |

Otomasi dosis server mati (`OTOMASI=0`, PANDUAN_SERVER_PI.md:62). Pi **belum pernah diuji** pada audit 11 Nov (tidak terjangkau).

---

## C. Backend, peran, dan alur

### C1. Peran

| Peran | Bisa | Tidak bisa | Sumber |
|---|---|---|---|
| Admin (bukan demo) | semua, termasuk aksi `adminSungguhan` (aktuator, E-STOP, kalibrasi, CCTV, preset) | — | BE/src/routes/aktuator.js:15-18 |
| Petani | Dashboard, Sensor, Peringatan, CCTV, Asisten AI, Kebun Saya, Akun; menulis siklus/dosing hanya untuk penampung yang ditugaskan | menu pengelola (403 "Menu ini untuk pengelola…") | BE/src/auth.js:127-137; BE/src/penugasan.js:31-40 |
| Demo | melihat menu pengelola | **semua** tulis (POST/PUT/PATCH/DELETE) dan Asisten AI | BE/src/auth.js:154-170; BE/src/routes/ai.js:73-77 |

Login web: petani → `/tanam`, lainnya → `/dashboard` (WEB/lib/auth.tsx:97). Token 12 jam, atau 3650 hari bila "ingat saya" (BE/src/auth.js:57-62). Batas laju: GET 300/menit, tulis 60/menit, login 10/menit per IP (BE/src/index.js:123-130).

### C2. Monitoring

| Hal | Nilai | Sumber |
|---|---|---|
| Field | waterTemp °C, ph, tds ppm, airTemp °C, humidity % | BE/src/routes/monitoring.js:38 |
| Batas fisik (ditolak 422, tidak disimpan) | pH 0–14, TDS 0–5000, suhu −50–80, RH 0–100 | BE/src/sanitySensor.js:20 |
| Batas wajar (disimpan, menahan gerbang dosis) | pH 3–9, TDS 50–2500, suhu air 5–45 | BE/src/sanitySensor.js:15 |
| Data basi / perangkat offline | > 120 dtk | BE/src/sanitySensor.js:13; BE/src/routes/aktuator.js:37 |
| Ambang awal (seed) | suhu air 5–40, pH 5–7, TDS 50–1000, suhu udara 20–40, RH 50–90 | BE/database/seed.sql:19-25 |
| Warna peringatan | critical merah, warning kuning, info | WEB/pages/HidroV41Pages.tsx:473 |
| Peringatan kunci (critical + penampung dikunci) | `batas_dosis`, `retry_habis`, `volume_tidak_pasti`, `sensor_rusak` | BE/src/aktuator.js:258-414 |

### C3. Saklar dan mode

- 5 saklar: `nutrisi_ab`, `ph_up`, `ph_down`, `pengenceran`, `isi_air`. OFF = otomasi tidak boleh menyalakan; perintah manual tetap boleh. Bawaan semua OFF, mode isi manual (BE/src/saklar.js:3-11; BE/src/iotV41.js:33-38).
- Mode pemeliharaan: `POST /iot-v41/pemeliharaan`, berlaku untuk semua penampung (BE/src/routes/iotV41.js:431-461). Di kode **hanya menolak dosis otomatis** (BE/src/aktuator.js:251-252). `pemeliharaan_maks_menit` (bawaan 120) disimpan, tetapi **tidak ada** pematian otomatis.

### C4. Dosing — alur persetujuan (eksekusi DIBLOKIR)

Status: `WAITING_APPROVAL → APPROVED → RUNNING → MIXING → VERIFYING → SUCCESS / EXHAUSTED / FAULT`; akhir lain `REJECTED`, `CANCELLED`, `EXPIRED` (BE/src/dosingSiklus.js:27-35).

| Langkah | Endpoint | Siapa | Catatan |
|---|---|---|---|
| Ajukan | `POST /api/dosing/siklus` | admin / petani yang ditugaskan | siklus budidaya harus TANK_PREPARATION…GROWTH |
| Setujui | `/:id/setujui` | sama | wajib cakupan: pompa, mL per percobaan, mL total, jumlah percobaan, masa berlaku |
| Tolak / Cabut | `/:id/tolak`, `/:id/cabut` | sama | cabut saat RUNNING mengantre STOP |
| Jalankan | `/:id/jalankan` | sama | **selalu 423** "Eksekusi dosis diblokir oleh gerbang dosis." |

Blokir 4 lapis: `EKSEKUSI_DIIZINKAN = false` (BE/src/gerbangDosis.js:21) → 423/501 di `jalankan` (BE/src/dosingSiklus.js:361-366) → `DOSIS` dibuang dari antrean kirim (BE/src/aktuator.js:29-30) → `POST /api/aktuator/perintah` tipe DOSIS ditolak 423 `butuh_alur_persetujuan` (BE/src/routes/aktuator.js:53-62).
**Tidak ada UI** persetujuan dosing di web maupun mobile; alur hanya ada di API.

### C5. Perintah aktuator dan STOP

- Antrean maks 10 (429), TTL bawaan 120 dtk, perintah `dikirim` tanpa laporan > 90 dtk → `gagal`; STOP_DARURAT dan STOP diambil lebih dulu (BE/src/aktuator.js:202-371).
- E-STOP server aktif → semua perintah berisiko ditolak 423 sampai di-reset admin (BE/src/aktuator.js:223).
- STOP dari aplikasi: `POST /iot-v41/stop` (admin) → 202 "Perintah STOP masuk antrean. Pompa BELUM dipastikan mati…" (BE/src/routes/iotV41.js:704-731). Tombol: `TombolStopPompa` di web, tombol STOP di halaman Kontrol mobile ("Hentikan semua pompa?") (MOB/pages/watercontrol_page.dart:139-160).

### C6. Kalibrasi dan uji pompa (Web `/kalibrasi`, admin)

1. **Aktifkan pemeliharaan** (WEB/components/kalibrasi/PanelKalibrasiLangsungV41.tsx:98).
2. **EC 2 titik** 1.413 dan 12.880 µS/cm → server menyimpan faktor. Pesan server: "…disimpan di server. **Belum dikirim ke alat**" (BE/src/routes/iotV41.js:591-623).
3. **pH 2 titik** buffer 4,0 dan 7,0, selisih bacaan ≥ 0,3 (BE/src/routes/iotV41.js:620-646). Konstanta pH/EC **tidak dikirim ke ESP32** (BE/src/aktuator.js:180).
4. **Uji pompa (BDC):** pilih pompa A/B/pH up/pH down, 30/60/120 dtk, "Jalankan pompa" → `POST /iot-v41/uji-pompa`. Syarat: `UJI_POMPA_DIIZINKAN=1` di `.env` (bawaan mati → 423), mode pemeliharaan aktif (409), satu uji sekaligus, tidak E-STOP (BE/src/routes/iotV41.js:469-499; BE/src/config.js:31).
5. **Simpan laju (BDC):** isi mL dari gelas ukur → `POST /iot-v41/kalibrasi-pompa` → server menyimpan dan mengantre `KALIBRASI {laju_x}` ke ESP32 (BE/src/routes/iotV41.js:525-538).

### C7. Kontrol air — NONAKTIF

`POST /watercontrol/fill|stop|setMode` selalu 503 `kontrol_air_nonaktif`: "…Gunakan katup/saklar fisik." (BE/src/routes/watercontrol.js:15-34). Web mengalihkan `/watercontrol` ke dashboard; mobile menampilkan banner nonaktif tetapi tombol **STOP** tetap aktif (MOB/pages/watercontrol_page.dart:29, 233).

### C8. Siklus budidaya dan tanam

- API siklus (tanpa UI): `DRAFT → TANK_PREPARATION → WAITING_TANK_CONFIRMATION → SEEDING → WAITING_REJUVENATION_CONFIRMATION → WAITING_SEED_COUNT_CONFIRMATION → GROWTH → COMPLETED`, plus `CANCELLED` (BE/src/siklusBudidaya.js:21-31). Penugasan petani hanya lewat API admin.
- Yang dipakai UI: `/tanam` (Kebun Saya) dan 4 tahap `/semai → /peremajaan → /pendewasaan → /panen`; "Mulai semai baru", lalu isi jumlah berhasil saat menyelesaikan tahap (BE/src/routes/tanam.js:139-240).

### C9. Asisten AI, audit, laporan, CCTV

- AI: `/api/ai/chat`, `/langkah-selanjutnya`, `/kolaborasi-trio`; pesan maks 600 karakter, timeout 55 dtk, jawaban cadangan berbasis aturan bila Ollama mati. Perintah kendali pompa lewat chat ditolak; AI tidak punya jalur ke aktuator. 4 pelanggaran dalam 10 menit → jeda 5 menit (BE/src/routes/ai.js; BE/src/aiGuard.js:105-110, 278-292).
- Audit: semua tulis yang sukses dicatat di `audit_logs`, field rahasia dibuang (BE/src/audit.js).
- Laporan: matriks bulanan + CSV (`/laporan`); mobile: unduh PDF/CSV (BE/src/routes/laporan.js:10-45).
- CCTV: mjpeg, snapshot, rtsp lewat server; sandi kamera disamarkan (BE/src/routes/cctv.js:2-13).

---

## D. Menu aplikasi

### D1. Web (WEB/layouts/AppShell.tsx:66-125)

| Grup | Halaman (rute) | Akses |
|---|---|---|
| PANTAU | Dashboard (`/dashboard`), Sensor Langsung (`/sensor-realtime`), Peringatan (`/peringatan`), CCTV (`/cctv`), Asisten AI (`/asisten-ai`) | semua (AI: bukan demo) |
| KENDALI | Kebun Saya (`/tanam`) | semua |
| KENDALI | Saklar & Mode (`/saklar`), Target Nutrisi (`/dosing`: Target Nutrisi, Parameter, Keamanan, Perawatan) | admin; demo baca |
| DATA | Kalibrasi (`/kalibrasi`), Data (`/data`), Catatan Aktivitas (`/audit`), Laporan (`/laporan`) | admin; demo baca |
| SISTEM | Pengaturan Alat, Pemulihan Papan, Koneksi Alat (`/mqtt-diagnostik`), Manajemen User | admin; demo baca |
| SISTEM | Akun Saya (`/profil`) | semua |
| SIKLUS TANAM | `/semai`, `/peremajaan`, `/pendewasaan`, `/panen` | admin; demo baca |
| MASTER DATA | Jenis Tanaman, Meja Tanaman, Ambang Sensor | admin; demo baca |

Rute lama yang hanya mengalihkan: `/sensor`, `/telemetri`, `/dosing-manual`, `/pompa`, `/siklus`, `/durasi-siklus`, `/ujilab`, `/log`, `/air`, `/kuras-air`, `/watercontrol`, `/water-control` (WEB/router.tsx:69-117).
Pemulihan Papan, reset peringatan, dan uji MQTT di Koneksi Alat **hanya mencatat**, tidak dikirim ke alat (BE/src/routes/iotV41.js:656-775).

### D2. Mobile (MOB/main.dart:243-268)

Tab: Beranda, Sensor, Kontrol (admin/demo), Tanam, Akun. Petani melihat Beranda ringkas "aman atau tidak" (MOB/pages/beranda_petani.dart). Menu lain: Asisten AI, CCTV, Riwayat monitoring, Saklar (ubah: admin), Uji lab, Naik harian, Laporan (dari Akun), Tentang. Notifikasi: cek peringatan tiap 60 dtk.

---

## E. Temuan yang memengaruhi isi dokumen

| # | Temuan | Dampak ke dokumen | Sumber |
|---|---|---|---|
| E1 | **Instruksi berbahaya di panduan lama:** "jumper GPIO13 ke GND" untuk E-STOP. Di 0.6, GPIO13 = lampu merah; E-STOP dibaca dari GPIO36 | Jangan disalin. Juknis IoT wajib memakai GPIO36 + pembagi 33k/10k | deploy-pi/MULAI_DEPLOY.md:146,175; deploy-pi/PANDUAN_SERVER_PI.md:89 |
| E2 | `ISI_AIR aksi:STOP` saat mengisi ditolak `sibuk` | SOP: hentikan isi air dengan STOP / E-STOP fisik | G:293, 315 |
| E3 | Reset E-STOP server, persetujuan dosing, siklus budidaya, penugasan: **tidak ada UI** | Dokumen tidak boleh menulis "tekan tombol reset E-STOP di web". Tulis sebagai prosedur admin teknis | WEB/ (grep), BE/src/routes/aktuator.js:92 |
| E4 | Kalibrasi pH/EC dari web **tidak sampai ke ESP32**; teks UI EC menyiratkan sebaliknya | SOP kalibrasi sensor: hasil web = catatan server; konstanta di alat diatur lewat perintah KALIBRASI (belum ada di UI) | BE/src/routes/iotV41.js:623; WEB/…/PanelKalibrasiLangsungV41.tsx:417 |
| E5 | Teks mode pemeliharaan tidak konsisten ("semua pompa dimatikan" vs "aplikasi tidak mematikan pompa"); kode hanya menahan dosis otomatis; tidak ada batas waktu otomatis | SOP harus menyebut perilaku sebenarnya dan wajib mematikan pemeliharaan secara manual | BE/src/aktuator.js:252; BE/src/routes/iotV41.js:455 |
| E6 | Uji pompa dari web butuh `UJI_POMPA_DIIZINKAN=1` (bawaan mati) | SOP pemeliharaan: langkah persiapan oleh admin teknis + catatan BDC | BE/src/config.js:31 |
| E7 | Pesan demo "boleh menambah data sementara" keliru; demo tidak bisa menulis apa pun | Juknas peran: demo = baca saja | BE/src/auth.js:143,163 |
| E8 | Backend punya tipe `BILAS`/`SAMPLING` yang ditolak firmware | Jangan didokumentasikan sebagai fitur | BE/src/aktuator.js:21; G:357 |
| E9 | Panduan lama basi: firmware v0.2 dua ESP32, poll HTTP 2 dtk, nama hotspot `VERTONIK` (kode: `Vertoniksmartfarm`) | Abaikan sebagai sumber | deploy-pi/PANDUAN_MQTT.md, MULAI_DEPLOY.md, PANDUAN.md |
| E10 | **Keamanan:** sandi Wi-Fi/hotspot/modem tertulis polos di panduan deploy | Jangan disalin ke dokumen. Sarankan pemilik mengganti sandi itu | deploy-pi/PANDUAN_KANTOR_DAN_HOTSPOT.md, PANDUAN_MODEM_DAN_CLOUD.md |
| E11 | Kalibrasi parsial: pH bisa berubah di RAM tanpa tersimpan bila parameter lain tidak sah | Catatan teknis Juknis IoT; laporkan ke pengembang | G:329-349 |
| E12 | Firmware belum diuji pada perangkat keras; Pi belum diuji | Semua dokumen memuat status "uji bertahap belum selesai" | deploy-pi/PANDUAN_SERVER_PI.md:3; docs/LAPORAN_AUDIT_2026-11-11.md |

---

## F. Yang belum diperiksa

Isi lengkap PanelTarget/PanelParameter, `stagePages.tsx`, `ujiLab.js`, `presetDosing.js`, `kunci.js`, `kestabilan.js`, `mqttJembatan.js` (logika penuh), skrip `siapkan-modem.sh` dan `siapkan-tunnel.sh`. Nilai di `rahasia.h` (termasuk `AKTIFKAN_BACA_ESTOP`) tidak diperiksa karena berkas rahasia.
