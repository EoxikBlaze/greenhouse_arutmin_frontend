# GARAP — Rencana & Todo List

> Diperbarui **27 Okt 2026** setelah semua pekerjaan di-commit (sudah di-push ke branch `dev`).
> Pemeriksaan terakhir: backend 234 tes lulus, web build OK, Flutter analyze bersih + 30 tes lulus.
> Legenda: ✅ selesai & terverifikasi · 🟡 selesai di kode, belum di-commit / belum diuji di perangkat · ⬜ belum dikerjakan · ❓ butuh keputusan/data dari tim.
> Butir lama (audit 19–21 Okt) status-nya mengikuti `BACKLOG_GARAP.md` dan **belum diverifikasi ulang** hari ini.

---

## A. RENCANA

### Yang sudah dikerjakan

| # | Bidang | Hasil | Status |
|---|---|---|---|
| 1 | **Keamanan AI** | Pengaman berlapis di `/api/ai/chat`; riwayat memuat pasangan tanya-jawab yang ditolak dibuang utuh; Markdown mentah dibersihkan | ✅ commit `aa4a8ef`, `549587b` |
| 2 | **Chat AI web & HP** | SOP naik/turun pH-TDS dan "TDS ideal <tanaman>" dijawab dari database, bukan tebakan model 1,5B; label sumber; pesan jeda 429 tampil apa adanya; spinner tak lagi macet | ✅ commit `aa4a8ef`, `549587b` |
| 3 | **Dosing B3/B4 & preset** | Preset nutrisi per tanaman × tahap; target tiap penampung otomatis/manual; halaman Dosing | ✅ commit `b080ea5`, `87ff333` |
| 4 | **Alur tanam petani** | Petani cukup isi jumlah berhasil; tahap berikutnya dibuat server; sesi login HP tersimpan | ✅ commit `7672e4b`, `bd64774`, `94e7ac0` |
| 5 | **Kartu status penampung + buka kunci LOCK** | Web & HP | ✅ commit `fd31463` |
| 6 | **Sidebar web** | Ikon, grup bisa dilipat, kartu pengguna, mode ciut | ✅ commit `99799c3` |
| 7 | **Keamanan** | Sandi minimal 8 karakter; body-parser ditambal; audit keamanan backend; tutorial Pi manual | ✅ commit `f668853`, `325079d` |
| 8 | **MQTT untuk 2 ESP32** | Jembatan backend (`mqttJembatan.js`), ACL per perangkat, fail-safe aktuator, simulator, uji dengan Mosquitto asli | ✅ backend commit `387cdc8` |
| 9 | **Preset 4 tanaman baru** | Melon, selada, daun bawang, bayam + riset ppm/pH + dokumen `PRESET_NUTRISI.md` | ✅ commit induk `28f65b0` (data preset ada di DB dev) |
| 10 | **Halaman Kalibrasi alat IoT** | Jadwal, riwayat, hitung konstanta pH 2 titik & faktor TDS, tes | ✅ commit backend `fec3311`, induk `28f65b0` |
| 11 | **Target nutrisi naik harian** | Per tanaman: ppm awal → target akhir dalam N hari sejak pindah netpot, lalu ditahan (backend + web + HP + tes) | ✅ commit backend `a20b5d5`, induk `906d647`; 🟡 HP baru lewat widget test, belum di simulator |
| 12 | **Audit Chrome DevTools web** | 30 rute diperiksa; Lighthouse Dashboard/Dosing/Asisten AI skor 100; `robots.txt`, meta description, aria-label | ✅ commit induk `e547709` |
| 13 | **Foto tim (rompi) + infografis** | Web, HP, 2 spanduk 3×1 m; spanduk proker memuat sponsor & media partner | ✅ commit induk `7189da8`, `44d1d73` (hasil render 101 MB tidak di-commit, dibuat ulang dengan `render.js`) |
| 13a | **Tampilan login baru** | Latar lanskap, tautan beranda, kartu masuk | ✅ commit induk `7aca517` |
| 13b | **Dokumentasi kontrak** | `KONTRAK_API.md` memuat kalibrasi, naik harian, topik MQTT | ✅ commit induk `906d647` (`openapi.yaml` belum) |
| 14 | **Ambang TDS** | Batas atas dinaikkan 1000 → 1300 → **2600 ppm** (agar melon 2400 tidak memicu alert) | ✅ di DB dev |

### Yang belum dikerjakan / masih berjalan

| # | Bidang | Yang kurang |
|---|---|---|
| 15 | **Uji di Raspberry Pi sungguhan** | `pasang-server.sh` dan `pasang-mqtt.sh` belum pernah dijalankan di Pi; Mosquitto, jembatan, dan firmware belum diuji di perangkat |
| 16 | **Firmware ESP32 v0.2** | Dikompilasi tanpa error, belum pernah dijalankan di board; kalibrasi `ML_PER_DETIK` pompa masih tempat-pegang; konstanta pH/TDS hasil halaman Kalibrasi harus ditempel manual |
| 17 | **Infografis proker** | Menunggu data proker dari tim |
| 18 | **Batas wajar TDS otomasi (2500 ppm)** | Tertanam di `otomasi.js`; di atas itu dosing diam. Aman untuk melon (target 2400) tapi perlu keputusan bila target dinaikkan |
| 19 | **Backlog audit lama** | K2 (state `monitorings`), K3 (query `/laporan`), S4–S7 (scope demo, eksposur publik, pagination, indeks) — lihat `BACKLOG_GARAP.md` |
| 20 | **openapi.yaml** | Belum mencakup `/kalibrasi`, `/dosing/naik-harian`, dan `/dosing/target` versi baru |

---

## B. TODO LIST

### ✅ Sudah dikerjakan
- [x] Pengaman AI (injeksi, kebocoran prompt, kontrol alat lewat chat)
- [x] Debug menyeluruh chat AI web & HP (8 bug, tes backend + Flutter)
- [x] Preset dosing + target penampung otomatis/manual
- [x] Alur tanam: petani cukup isi hasil
- [x] Tombol buka kunci LOCK + kartu status penampung (web & HP)
- [x] Sidebar baru
- [x] Sandi minimal 8 karakter + tambal body-parser
- [x] Jembatan MQTT + ACL + simulator + tes (commit `387cdc8`)
- [x] Firmware sensor & aktuator v0.2 dikompilasi untuk ESP32
- [x] Skrip `pasang-mqtt.sh` + `PANDUAN_MQTT.md`
- [x] Preset melon, selada, daun bawang, bayam
- [x] Halaman Kalibrasi (web)
- [x] Target nutrisi naik harian (backend, web, HP)
- [x] Audit Chrome DevTools 30 rute + perbaikan
- [x] Foto rompi 7 anggota di semua media
- [x] Ambang TDS → 2600 ppm
- [x] Commit kalibrasi (backend `fec3311`, induk `28f65b0`)
- [x] Commit naik harian (backend `a20b5d5`, induk `906d647`)
- [x] Commit audit DevTools (`e547709`), login baru (`7aca517`), foto tim (`7189da8`), infografis sumber (`44d1d73`)
- [x] `KONTRAK_API.md` memuat kalibrasi, naik harian, dan topik MQTT
- [x] Push kedua repo ke GitHub, branch `dev` (backend → `a20b5d5`, induk → `f2606b6`, 27 Okt)

### ⬜ Belum dikerjakan

**Repo & GitHub**
- [ ] **Backup/masukkan `deploy-pi/` ke repo** — di-gitignore, jadi firmware v0.2, ACL Mosquitto, `pasang-mqtt.sh`, dan panduan hanya ada di Mac ini (di folder ini juga ada kredensial lokal, jadi pilih file yang aman saja)
- [ ] Putuskan nasib `docs/infografis/hasil/` (101 MB PNG/PDF): simpan di luar git / Git LFS / rilis GitHub

**Hardware & Pi (urutan disarankan)**
- [ ] Pasang Pi, jalankan `pasang-server.sh`, cek `vertonik-api` hidup
- [ ] Jalankan `pasang-mqtt.sh`; uji broker menolak anonim; lihat detak `garap/server/status`
- [ ] Uji simulator sensor & aktuator di Pi (`scripts/simulasi-mqtt.js`)
- [ ] Buat API key `sensor-01` & `aktuator-01`; isi `rahasia.h`; flash kedua ESP32
- [ ] Kalibrasi pH (buffer 7,00 & 4,01) dan TDS (larutan 1413 µS/cm); tempel konstanta ke firmware
- [ ] Kalibrasi laju tiap pompa (`ML_PER_DETIK`) dengan gelas ukur — **pakai air dulu, bukan nutrisi**
- [ ] Uji fail-safe: hentikan `vertonik-api` saat pompa jalan → pompa harus langsung mati
- [ ] Pastikan modul sensor TDS mampu membaca sampai 2400 ppm (modul analog umum hanya akurat ±1000)
- [ ] Cek WiFi tidak memakai client isolation; reservasi IP tetap untuk Pi

**Fitur & data**
- [ ] Coba halaman Target nutrisi di simulator iOS (baru widget test)
- [ ] Buat batch melon uji untuk melihat kurva naik harian muncul di tabel target
- [ ] Halaman Kalibrasi versi aplikasi HP (saat ini web saja)
- [ ] Verifikasi ulang daun bawang (data riset paling lemah) dan melon (studi lokal memakai EC 3–5)
- [ ] Tentukan apakah batas wajar TDS otomasi (2500) perlu dinaikkan

**Keputusan & data dari tim**
- [ ] ❓ **Ambang kelembapan udara saat ini 100–100** (diubah 23 Okt) — kemungkinan salah; butuh nilai yang benar
- [ ] ❓ Data proker untuk infografis
- [ ] ❓ Model chat AI: tetap qwen2.5:1.5b (cepat, dangkal) atau model lebih besar (butuh RAM Pi)
- [ ] ❓ Faktor ppm: sistem 500; pastikan angka 2400 ppm dari tim memakai faktor yang sama (faktor 700 → setara ±1700)

**Dokumen & rapikan**
- [ ] Perbarui `openapi.yaml` untuk `/kalibrasi`, `/dosing/naik-harian`, `/dosing/target`
- [ ] Tinjau backlog lama: K2, K3, S4–S7 di `BACKLOG_GARAP.md`
- [ ] Rebuild `react-web-app/dist/` dan paket Pi (zip lama bertanggal 21 Okt sudah ketinggalan)
- [ ] Jalankan ulang semua tes sebelum rilis; aktifkan simulator sensor hanya di dev

---

## C. Urutan kerja yang disarankan

1. **Rapikan repo** — ~~commit semua pekerjaan~~ (selesai); sisa: push ke GitHub atas perintahmu, amankan `deploy-pi/`, putuskan nasib `infografis/hasil/`.
2. **Putuskan** ambang kelembapan dan model AI (butir ❓).
3. **Pi + MQTT** — pasang, uji dengan simulator, baru sambung ESP32.
4. **Kalibrasi sensor & pompa** (air dulu).
5. **Uji di tanaman** — satu penampung, satu tanaman, dosing otomatis dinyalakan setelah target disetujui tim.
6. **Dokumentasi & backlog audit lama.**
