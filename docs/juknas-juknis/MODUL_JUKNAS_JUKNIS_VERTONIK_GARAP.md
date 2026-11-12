# MODUL JUKNAS & JUKNIS OPERASIONAL DAN TEKNIS
## Sistem Hidroponik Cerdas Vertonik Smart Farm (GARAP) — Pokjar Permata

**Versi Dokumen:** 1.0  
**Cakupan Sistem:** Platform Web & Mobile (GARAP / Vertonik Smart Farm), Server Raspberry Pi, serta Perangkat IoT ESP32 (`gabungan-0.6`)  
**Mitra Lapangan:** Pokjar Permata  

---

## BAGIAN A — PETUNJUK PELAKSANAAN (JUKNAS)

### BAB I. Pendahuluan & Tujuan

#### 1.1. Latar Belakang
**Vertonik Smart Farm (GARAP — Green Autonomous Responsive Agriculture Platform)** adalah sistem pemantauan, pencatatan budidaya, asisten agronomi lokal, serta pengendalian perangkat keras hidroponik berbasis IoT untuk mendukung operasional greenhouse di lingkungan **Pokjar Permata**.

Dokumen ini memadukan **Petunjuk Pelaksanaan (Juknas)** untuk tata kelola peran operator, alur kerja harian, dan keselamatan kerja (**K3**), serta **Petunjuk Teknis (Juknis)** untuk pengoperasian website, pengkabelan panel IoT ESP32, kalibrasi sensor/pompa, manajemen jaringan (Wi-Fi router, hotspot Pi, dan modem 4G), hingga pemulihan gangguan.

#### 1.2. Prinsip Keselamatan Utama (Safety-First)
1. **Air Bersih Terlebih Dahulu:** Semua uji pompa, uji pelampung, dan uji E-STOP wajib dilakukan memakai **air bersih** dengan selang keluaran diarahkan ke **gelas ukur atau ember terpisah**, bukan langsung ke tandon nutrisi tanaman.
2. **Gerbang Pengaman Berlapis:** Perintah dosis otomatis memiliki pengaman berlapis di **Server Backend** (validasi `konfigurasi_dosis`, lock penampung, batas suntikan/kejadian harian, dan *latch* E-STOP) dan di **Firmware ESP32** (`gabungan-0.6`: batas suntik per aksi, batas mL per jam, fail-safe detak server 30 detik, pelampung bawah/atas, serta pembacaan bus +12V E-STOP).
3. **E-STOP Fisik adalah Pemutus Tertinggi:** Dalam keadaan darurat (kebocoran pipa, selang lepas, korsleting, atau pompa berjalan tidak wajar), tekan tombol **E-STOP fisik** berwarna merah terlebih dahulu — tidak perlu menunggu respons website.
4. **Satu Bahasa Data:** Data sensor yang gagal terbaca oleh ESP32 tidak pernah diganti angka palsu (`NaN`/kosong dibuang dari payload); di web, bila perangkat offline, data yang tampil berstatus bacaan terakhir (*usang*), bukan kondisi terkini.

---

### BAB II. Arsitektur Sistem & Pembagian Peran Pengguna

#### 2.1. Alur Kerja End-to-End
1. **Unit Lapangan (`ESP32 gabungan-0.6`):** Membaca sensor pH & EC/TDS (melalui ADS1115 `0x48`), suhu air (DS18B20), suhu & kelembapan udara (SHT31 `0x44`), serta pelampung bawah/atas; menampilkan status di LCD 20×4 & lampu pilot 3 warna; dan meneruskan data setiap **5 detik** ke Raspberry Pi via **MQTT** (`garap/aktuator-01/data`, port `1883`) atau cadangan **HTTP POST** (`/api/device/v1/sensor`, port `80`).
2. **Server Lokal (`Raspberry Pi`):** Menjalankan **Nginx** (port `80`), **Backend Node.js** (`vertonik-api`, port `8000`), **PostgreSQL**, **Mosquitto MQTT Broker** (port `1883`), serta **Ollama Local AI** (`garap-ai` berbasis `qwen2.5:1.5b`, port `11434`).
3. **Antarmuka Pengguna (`Website React` & `Aplikasi Flutter`):** Mengakses dashboard, grafik sensor, peringatan, kamera CCTV, asisten AI lokal, pelacakan siklus tanam 4 tahap, kalibrasi, serta kontrol saklar/pengaturan.

#### 2.2. Hak Akses Peran (*Role*)

| Peran | Hak Akses Utama | Pembatasan |
|---|---|---|
| **Admin** | Akses penuh seluruh 25+ rute website: pemantauan, manajemen siklus tanam, **Saklar**, **Target Nutrisi**, **Kalibrasi**, **Pengaturan Alat**, **Pemulihan Papan**, **Koneksi Alat**, **Data/Uji Lab**, **Laporan**, **Manajemen User**, & **Catatan Aktivitas**. | Setiap aksi tulis dicatat otomatis ke `audit_logs`. |
| **Petani** | Memantau **Dashboard** (`/dashboard`), **Sensor** (`/sensor-realtime`), **Peringatan** (`/peringatan`), **CCTV** (`/cctv`), **Asisten AI** (`/asisten-ai`), **Kebun Saya** (`/tanam`), dan **Akun Saya** (`/profil`). | Tidak memiliki akses ubah saklar, kalibrasi, pengaturan alat, manajemen user, maupun hapus data master/tahap. |
| **Demo** | Melihat tampilan halaman pengelola dan master data dalam mode **baca-saja** (*read-only*). | Seluruh permintaan tulis (`POST`/`PUT`/`PATCH`/`DELETE`) ditolak oleh `demoGuard` (kecuali login/profil demo tertentu). |

---

### BAB III. Prosedur Operasional Harian (SOP Operator)

#### 3.1. Checklist Harian Pagi & Sore (5–10 Menit)
1. **Periksa Fisik Panel & Tandon:**
   - Pastikan lampu pilot pada panel IoT menyala **HIJAU** (normal).
   - Pastikan ketinggian air tandon cukup (LCD baris ke-4 bertuliskan `PENAMPUNG CUKUP`, bukan `PENAMPUNG KURANG`).
   - Pastikan tidak ada kebocoran selang pompa peristaltik A, B, pH Up, pH Down, maupun pompa isi air.
2. **Buka Website di HP/Laptop:**
   - Sambungkan ke Wi-Fi yang sama dengan Pi (mis. `Pokjar Permata` atau Wi-Fi modem) lalu buka `http://vertonik.local` atau `http://<IP-Pi>`. Jika router mati dan Pi memancarkan hotspot `Vertoniksmartfarm`, buka `http://10.42.0.1`.
3. **Cek Dashboard (`/dashboard`):**
   - Pastikan status perangkat **perangkat online** (hijau).
   - Catat nilai **pH**, **Suhu Air**, **Nutrisi (TDS ppm / EC mS/cm)**, **Suhu Udara**, **Kelembapan**, dan **Level Tandon** terhadap batas aman dari menu Ambang Sensor.
4. **Cek Peringatan (`/peringatan`):**
   - Bila ada peringatan aktif (`AIR_DIGANTI`, `MODE_PEMELIHARAAN`, `TARGET_TIDUR`, atau alarm sensor keluar ambang), lakukan pemeriksaan fisik tandon terlebih dahulu sebelum menekan **Tandai selesai**.
5. **Pantau Kebun & Visual:**
   - Periksa progres HST & estimasi panen di **Kebun Saya (`/tanam`)**.
   - Lihat kondisi visual daun/meja di **CCTV (`/cctv`)**.
   - Jika ada gejala daun atau pertanyaan budidaya, gunakan **Asisten AI (`/asisten-ai`)**.

---

## BAGIAN B — PETUNJUK TEKNIS (JUKNIS) WEBSITE

### BAB IV. Panduan Lengkap Menu & Halaman Website

#### 4.1. Kelompok PANTAU (Semua Peran)
1. **Dashboard (`/dashboard`):** Ringkasan kondisi terkini, status *online/offline* IoT, 7 kartu KPI sensor beserta *batas aman*, ringkasan 4 tahap budidaya, status saklar, tren mini, dan kartu prediksi panen.
2. **Sensor (`/sensor-realtime`):** Grafik riwayat dan tabel data historis dengan pilihan rentang **6 Jam**, **24 Jam**, **7 Hari**, atau **Kustom**; dapat membandingkan metrik (`ph`, `tds`, `waterTemp`, `airTemp`, `humidity`) beserta ekspor CSV/laporan.
3. **Peringatan (`/peringatan`):** Daftar peringatan aktif & historis beserta kode warna (`merah` kritis, `kuning` waspada, `info`). Admin dapat menekan **tandai selesai** per kejadian atau **Catat permintaan RESET**.
4. **CCTV (`/cctv`):** Grid pantauan kamera (`mjpeg`, `snapshot`, dan `rtsp` lewat proxy gambar server sehingga kredensial kamera aman). Admin dapat menambah/mengubah/menghapus kamera.
5. **Asisten AI (`/asisten-ai`):**
   - Strip konteks kebun menampilkan bacaan sensor dan batch tanam terakhir.
   - Tombol rekomendasi cepat **Langkah Selanjutnya** (`POST /api/ai/langkah-selanjutnya`).
   - Kolom chat tanya jawab (`POST /api/ai/chat`) dengan jawaban deterministik cepat (`< 5 ms`) untuk topik aplikasi/gejala/panen dan model lokal Ollama (`garap-ai`) untuk pertanyaan bebas.

#### 4.2. Kelompok KENDALI
1. **Kebun Saya (`/tanam` — Semua Peran untuk baca; Pengelola untuk mulai tanam):** Mengelola kartu batch tanaman, pencarian/filter tahap, estimasi tanggal panen, dan dialog **Mulai Tanam / Semai Baru**.
2. **Saklar (`/saklar` — Admin & Demo baca-saja):** Mengatur 5 saklar izin otomasi yaitu **Nutrisi A + B**, **pH up**, **pH down**, **Pengenceran**, dan **Isi air otomatis** (ON = pompa isi bekerja otomatis dari float bawah hingga float atas; OFF = mode manual/peringatan saja). Jika Pengenceran ON tetapi Isi air otomatis OFF, sistem memberi peringatan bahwa EC tinggi hanya menjadi notifikasi.
3. **Target Nutrisi (`/dosing` — Admin & Demo baca-saja):** Terdiri dari 4 tab:
   - **Target Nutrisi:** Saran dosis, kurva kenaikan nutrisi harian (*ppm awal → target panen*), dan target per penampung (`otomatis`/`manual`, status lock).
   - **Parameter:** Konfigurasi parameter dosis dan timing operasi.
   - **Keamanan:** Aturan *fail-safe*.
   - **Perawatan:** Jadwal perawatan alat & tandon.

#### 4.3. Kelompok DATA & SISTEM (Admin & Demo baca-saja)
1. **Kalibrasi (`/kalibrasi`):**
   - Tombol merah **STOP pompa** di bagian atas untuk menghentikan seluruh pompa dari aplikasi.
   - **Panel Kalibrasi Langsung:** Tombol **Aktifkan pemeliharaan** (wajib ON sebelum mengambil titik kalibrasi atau menguji pompa), kartu **1. Kalibrasi EC** (2 titik: `1.413 µS/cm` dan `12.880 µS/cm`), **2. Kalibrasi pH** (2 titik: `pH 4,0` dan `pH 7,0`), **3. Kalibrasi pompa** (jalani `30 / 60 / 120 detik`, ukur mL di gelas ukur, simpan laju `mL/detik`), **Pemulihan papan ESP32**, dan **Riwayat kalibrasi**.
   - Kartu jadwal perawatan & kalibrasi berkala tiap sensor.
2. **Data (`/data`):** Kalkulator **Takaran Tanaman** dan **Takaran Buah** berbasis hasil uji lab nyata (`ppm/mL` & `mL per pH`).
3. **Catatan Aktivitas (`/audit`):** Log audit permanen (`audit_logs`) mencatat pengguna, waktu, rute, serta perubahan data.
4. **Laporan (`/laporan`):** Ringkasan laporan periodik budidaya dan pengunduhan spreadsheet Excel (`.xlsx`).
5. **Pengaturan Alat (`/pengaturan-alat`):** Volume efektif penampung (L), jumlah talang, debit per talang (L/menit), perhitungan waktu 1 putaran sirkulasi otomatis, waktu monitoring (`10–120` menit), jeda A→B (`1–10` menit), jeda antar tindakan (`1–240` menit), persen dosing (`50–90%`), maks ppm per dosing (`50–300 ppm`), batas aman EC/pH, batas mL koreksi pH (`0` = otomatis `maks(5, round(0,2 × volume))`), dan batas waktu pemeliharaan.
6. **Pemulihan Papan (`/pemulihan-papan`):** Menyiapkan paket pemulihan target, volume, saklar, laju pompa, dan 6 catatan kalibrasi terakhir ketika papan ESP32 diganti (*status `BARU`*). Catatan: kecocokan probe baru tetap harus dikalibrasi ulang.
7. **Koneksi Alat (`/mqtt-diagnostik`):** Memantau status broker MQTT, ID alat, kontrak topik (`telemetri`, `param`, `kalibrasi`, `log`, `alert`, `ack`, `status`, `cmd` / `garap/aktuator-01/...`), serta contoh format perintah dan uji catat pesan.
8. **Manajemen User (`/user`) & Akun Saya (`/profil`):** Kelola akun pengguna (`admin`, `petani`, `demo`) dan ubah kata sandi pribadi (minimal 8 karakter).

#### 4.4. Kelompok SIKLUS TANAM & MASTER DATA (Admin & Demo baca-saja)
- **Siklus Tanam 4 Tahap:** `1. Semai (/semai)` → `2. Peremajaan (/peremajaan)` → `3. Pendewasaan (/pendewasaan)` → `4. Panen (/panen)`. Dari modal detail tahap yang belum selesai, pengelola dapat menekan **Tandai Selesai** untuk memajukan batch secara berurutan ke tahap berikutnya atau menutup panen.
- **Master Data:** `Jenis Tanaman (/tanaman)` (katalog varietas & target), `Meja Tanaman (/meja)` (penampung/meja aktif), dan `Ambang Sensor (/ambang)` (batas min–max aman tiap parameter sensor).

---

## BAGIAN C — PETUNJUK TEKNIS (JUKNIS) ALAT IoT & JARINGAN

### BAB V. Spesifikasi Hardware & Peta Pin ESP32 (`gabungan-0.6`)

Firmware standar papan tunggal greenhouse adalah **`deploy-pi/firmware/gabungan/gabungan.ino`** (`gabungan-0.6`, board `ESP32 Dev Module`, API key/login MQTT `aktuator-01`).

#### 5.1. Tabel Pemetaan Pin GPIO ESP32

| Komponen / Fungsi | Pin ESP32 | Keterangan Teknis |
|---|---|---|
| **Bus I2C (`SDA` / `SCL`)** | **GPIO 21 / GPIO 22** | ADS1115 (`0x48`: kanal `A0` = probe pH, kanal `A1` = probe EC lewat pembagi resistor `10k/10k`), SHT31 (`0x44`: suhu & RH udara), LCD 20×4 PCF8574 (`0x27`). |
| **Sensor Suhu Air (DS18B20)** | **GPIO 4** | Jalur OneWire tahan air (*waterproof probe*). |
| **Pompa Nutrisi A** | **GPIO 25** | Relay **HIGH-trigger** (`HIGH` = nyala; jumper `COM+HIGH`). |
| **Pompa Nutrisi B** | **GPIO 26** | Relay **HIGH-trigger** (menyala setelah jeda A→B selesai). |
| **Pompa pH Up** | **GPIO 27** | Relay **HIGH-trigger**. |
| **Pompa pH Down** | **GPIO 18** | Relay **HIGH-trigger**. |
| **Pompa Isi Air** | **GPIO 16** | Relay **HIGH-trigger**. |
| **Pelampung Bawah (*Float Lower*)** | **GPIO 32** | `INPUT_PULLUP`. `HIGH` = air cukup/terangkat, `LOW` = air kurang (*pemicu isi air / tahan dosing*). |
| **Pelampung Atas (*Float Upper*)** | **GPIO 33** | `INPUT_PULLUP`. `HIGH` = penuh. Jika kabel putus terbaca `HIGH` (fail-safe penuh agar tidak meluap). |
| **Lampu Pilot Merah** | **GPIO 13** | Via ULN2003 (`HIGH` = nyala). |
| **Lampu Pilot Hijau** | **GPIO 17** | Via ULN2003 (`HIGH` = nyala). |
| **Lampu Pilot Biru** | **GPIO 23** | Via ULN2003 (`HIGH` = menyala saat pompa sedang aktif). |
| **Tombol RESET Lokal** | **GPIO 19** | `INPUT_PULLUP` ke GND. Tekan singkat: tampilkan info Wi-Fi/IP/Server 4 detik di LCD & lepas latch E-STOP lokal bila aman. |
| **Sensor Bus E-STOP** | **GPIO 36** | Membaca bus `+12V` aktuator lewat pembagi tegangan **`33k / 10k`**. Saat E-STOP ditekan (`LOW`), seluruh aktuator dikunci. *(Jangan set `AKTIFKAN_BACA_ESTOP 0` di lapangan!)* |

> **Peringatan Daya:** Seluruh pompa 12V wajib diberi catu daya melalui modul relay/MOSFET + dioda flyback terpisah, **dilarang** mengambil arus pompa langsung dari pin ESP32.

#### 5.2. Arti Lampu Pilot & Tampilan Layar LCD 20×4

| Kombinasi Lampu Pilot | Kondisi Sistem |
|---|---|
| **Hijau saja** | Sistem normal, Wi-Fi & MQTT terhubung ke server, air penampung cukup. |
| **Merah + Hijau (Kuning/Peringatan)** | Peringatan: air penampung kurang (`float_bawah_rendah`), atau ESP32 belum menerima detak server / MQTT putus. |
| **Merah saja** | **DARURAT / E-STOP AKTIF** (dari tombol fisik GPIO 36 atau `estopServer` dari admin). Semua pompa dimatikan & dikunci. |
| **Biru menyala** | Salah satu pompa sedang beroperasi (`DOSING`, `ISI_AIR`, atau `UJI_POMPA`). |

**Pesan Baris ke-4 LCD 20×4:**
- `PENAMPUNG CUKUP` / `PENAMPUNG PENUH` / `PENAMPUNG KURANG`
- `E-STOP AKTIF!` (prioritas tertinggi)
- `WIFI MATI` (ESP32 gagal terhubung ke Wi-Fi 2,4 GHz)
- `TUNGGU SERVER...` (Wi-Fi nyala, menunggu broker MQTT / detak server)
- `HTTP SENSOR ONLY` (port `1883` terblokir firewall/router; data sensor dikirim lewat HTTP port `80`, **pompa terkunci aman** karena tidak ada detak MQTT real-time)
- `DOSING A...`, `DOSING B...`, `pH UP...`, `pH DOWN...`, `MENGISI AIR...`

#### 5.3. Batas Pengaman Firmware (`gabungan-0.6`)
- Maksimum suntikan **AB** per perintah: **214 mL** | per jam: **450 mL** | batas durasi absolut relay: **70 detik** per pompa.
- Maksimum suntikan **pH Up / pH Down** per perintah: **10 mL** | per jam: **30 mL** | batas durasi absolut relay: **12 detik**.
- Maksimum durasi **Isi Air**: **600 detik** (10 menit), langsung berhenti jika pelampung atas terangkat.
- Maksimum durasi **Uji Pompa**: **120 detik**.
- **Fail-safe Detak Server (`30 detik`):** Jika heartbeat `garap/server/status` tidak diterima > 30 detik (server mati, Pi putus, atau Wi-Fi terputus), pompa otomatis berhenti dengan alasan `server_hilang`.
- **Anti Belum Dikalibrasi:** Jika laju pompa (`ML_PER_DETIK`) masih `0`, perintah dosis berbasis mL ditolak dengan alasan `belum_dikalibrasi`.

---

### BAB VI. SOP Kalibrasi Sensor & Pompa serta Uji Lapangan 8 Tahap

#### 6.1. SOP Kalibrasi Sensor & Laju Pompa dari Website
1. Masuk ke website sebagai **Admin**, buka menu **Kalibrasi (`/kalibrasi`)**.
2. Klik **Aktifkan pemeliharaan** pada panel *Mode pemeliharaan* agar semua tindakan otomatis dijeda.
3. **Kalibrasi EC (2 Titik):**
   - Bilas probe EC dengan air bersih/aquades dan keringkan perlahan.
   - Celupkan ke larutan standar **1.413 µS/cm**, tunggu indikator *stabil*, lalu tekan **Ambil titik 1.413**.
   - Bilas lagi, celupkan ke larutan **12.880 µS/cm**, tunggu stabil, lalu tekan **Ambil titik 12.880**. Sistem otomatis mengirim parameter kalibrasi ke NVS ESP32.
4. **Kalibrasi pH (2 Titik):**
   - Bilas probe pH, celupkan ke **buffer pH 4,0**, tunggu stabil, tekan **Ambil titik pH 4,0**.
   - Bilas lagi, celupkan ke **buffer pH 7,0**, tunggu stabil, tekan **Ambil titik pH 7,0**. *(Gunakan tombol "Balik kalibrasi ... ke nilai sebelumnya" bila terjadi salah celup.)*
5. **Kalibrasi Laju Pompa (Per Pompa A, B, pH Up, pH Down):**
   - Isi penuh selang terlebih dahulu (*priming*) dan arahkan ujung selang ke **gelas ukur bersih**.
   - Pilih pompa dan durasi (**30 / 60 / 120 detik** — disarankan minimal 30–60 detik agar teliti), klik **Jalankan pompa**.
   - Setelah pompa berhenti sendiri, baca volume air di gelas ukur (mL), masukkan angka ke kolom **Hasil takar di gelas ukur (mL)**, lalu klik **Simpan laju**. Ulangi 3 kali untuk memastikan konsistensi selisih ≤ 5%, lalu **Matikan pemeliharaan** bila selesai.

#### 6.2. Ringkasan 8 Tahap Uji Hardware Sebelum Dipakai di Tanaman
1. **Tahap 0 (Tanpa Daya):** Cek kabel sesuai peta pin, cek tidak ada short 12V/3,3V ke GND, pastikan pembagi `33k/10k` di GPIO 36 terpasang & `AKTIFKAN_BACA_ESTOP 1`, lepas sekring pompa 12V.
2. **Tahap 1 (Nyala USB Pertama):** Buka Serial Monitor `115200 baud`, pastikan muncul `ADS1115 ada, SHT31 ada, LCD ada`.
3. **Tahap 2 (Jaringan):** Nyalakan Pi, pastikan LCD baris 4 beralih dari `WIFI MATI` / `TUNGGU SERVER...` ke `PENAMPUNG CUKUP` dan status online stabil ≥ 5 menit.
4. **Tahap 3 (Sensor):** Bandingkan dengan termometer/higrometer/buffer; pastikan saat probe dicabut LCD menampilkan `pH --.--` / `EC ----`.
5. **Tahap 4 (Pelampung & E-STOP):** Turunkan float bawah (`PENAMPUNG KURANG`), angkat float atas (`PENAMPUNG PENUH`), tekan E-STOP (`E-STOP AKTIF!` & lampu merah saja).
6. **Tahap 5 (Pompa 1 per 1 dengan Air Bersih):** Pastikan setiap perintah menggerakkan pompa yang benar dan lampu biru menyala.
7. **Tahap 6 (Kalibrasi Laju):** Simpan laju tiap pompa ke NVS (3 kali ulang, selisih ≤ 5%).
8. **Tahap 7 (Uji Pengaman Saat Pompa Jalan):** Uji E-STOP seketika, matikan API/Wi-Fi (maks 30 dtk berhenti), float bawah (`air_kurang_float_bawah`), float atas (`tandon_penuh`), dan cabut daya ESP32 (relay wajib langsung lepas).
9. **Tahap 8 (Uji Tahan 24 Jam):** Tidak boleh restart sendiri (`uptime` tidak reset) dan tidak ada celah data > 2 menit.

---

### BAB VII. Jaringan, Penggantian Wi-Fi/Modem, & Akses Jarak Jauh

#### 7.1. Urutan Pencarian Server oleh ESP32 (`gabungan-0.6`)
1. Wi-Fi **2,4 GHz** multi-jaringan: prioritas **NVS kustom** (`wifi SSID|SANDI`), disusul daftar `rahasia.h` (termasuk `VertonikModem`, `Pokjar Permata`, `Vertoniksmartfarm`, dll.).
2. Pencarian IP Server Pi otomatis berurutan:
   - Gateway hotspot Pi (`10.42.0.1`) bila terhubung ke hotspot `Vertoniksmartfarm`.
   - Override IP statis NVS (`server <IP>`).
   - mDNS `.local` (`garap.local`, `vertonik.local`, `vertonic.local`).
   - Pemindaian subnet otomatis (`.50`, `.100`, `.101`, `.172`, `.200`, `.2–.15` pada `192.168.x.x`, `10.x.x.x`, dan `172.20.10.x`) untuk port `1883` lalu `80`.

#### 7.2. Perintah Serial Monitor ESP32 (`115200 baud`, tanpa compile ulang)
Colok kabel USB ESP32 ke laptop, buka Serial Monitor baud `115200` (akhiran `Newline`), lalu ketik:
- `status` — cetak SSID Wi-Fi, IP ESP, IP Server, status MQTT/HTTP, kondisi E-STOP, float, dan nilai kalibrasi NVS.
- `scan` — pindai Wi-Fi 2,4 GHz sekitar.
- `cari` — pindai ulang IP Raspberry Pi.
- `baca` — paksa baca & kirim sensor segera.
- `wifi NAMA_WIFI|SANDI_WIFI` — simpan Wi-Fi baru permanen di NVS (`wifi hapus` untuk reset ke bawaan `rahasia.h`).
- `server 192.168.8.50` — kunci IP Pi manual di NVS (`server hapus` untuk kembali cari otomatis).

#### 7.3. Menyiapkan Modem 4G & Akses Jarak Jauh di Raspberry Pi
- Atur Wi-Fi 2,4 GHz modem ke `VertonikModem` (atau hubungkan Pi via kabel LAN `eth0` ke modem), pastikan **AP/Client Isolation OFF**.
- Di Pi, jalankan `sudo bash /opt/vertonik/deploy-pi/siapkan-modem.sh` (membuka MQTT port `1883` untuk semua subnet privat RFC1918 & konfigurasi Nginx siap tunnel).
- Untuk akses dari luar greenhouse (mengatasi CGNAT kartu SIM):
  - **Tailscale VPN:** `sudo bash /opt/vertonik/deploy-pi/siapkan-tunnel.sh tailscale`
  - **Cloudflare Tunnel:** `sudo bash /opt/vertonik/deploy-pi/siapkan-tunnel.sh cloudflare <TOKEN>`

---

### BAB VIII. Matriks Penanganan Gangguan (*Troubleshooting*)

| Gejala | Kemungkinan Penyebab | Tindakan Perbaikan |
|---|---|---|
| **Website tidak bisa dibuka dari HP/Laptop** | Perangkat beda jaringan Wi-Fi, IP Pi berubah, atau layanan `nginx`/`vertonik-api` berhenti. | Pastikan terhubung ke Wi-Fi yang sama (`Pokjar Permata` / modem / hotspot Pi `Vertoniksmartfarm`). Tekan singkat tombol **RESET (GPIO 19)** pada panel IoT untuk membaca IP Pi (`SRV:...`) di LCD 4 detik. |
| **LCD tampil `E-STOP AKTIF!` & lampu merah menyala** | Tombol jamur E-STOP tertekan, kabel bus 12V ke pin 36 putus, atau `estopServer` masih aktif dari Admin. | Periksa selang & kelistrikan. Putar/tarik E-STOP fisik, reset E-STOP dari server jika dipicu admin, lalu tekan tombol **RESET (GPIO 19)** bila diperlukan. |
| **LCD tampil `HTTP SENSOR ONLY`** | ESP32 tersambung ke Wi-Fi dan HTTP port `80`, tetapi MQTT port `1883` diblokir firewall/router atau *Client Isolation* aktif. | Matikan *AP/Client Isolation* di router/modem; di Pi jalankan `sudo ufw status` / `siapkan-modem.sh`. Pompa tetap terkunci hingga MQTT terhubung. |
| **Pompa menolak dosing (`belum_dikalibrasi`)** | Laju pompa di NVS ESP32 masih `0.00 mL/detik`. | Buka halaman **Kalibrasi (`/kalibrasi`)**, aktifkan mode pemeliharaan, ukur keluaran tiap pompa dengan gelas ukur, dan simpan lajunya. |
| **Asisten AI lambat atau menjawab tidak sesuai** | Pertanyaan bebas masuk ke LLM CPU Raspberry Pi atau suhu Pi panas. | Untuk info umum/gejala/panen, gunakan kata kunci jelas agar dijawab instan `< 5 ms`; jaga sirkulasi udara/pendingin Raspberry Pi (< 70 °C) dan tunggu ±30–40 detik untuk pertanyaan bebas ke LLM `garap-ai`. |

---

### LAMPIRAN: Lembar Checklist Commissioning & Serah Terima

| No | Item Pemeriksaan | Target Lulus | Status (Lulus / Gagal) | Paraf & Tanggal |
|---|---|---|---|---|
| 1 | Pemeriksaan kabel & pembagi E-STOP 33k/10k (pin 36) | Tidak ada short; E-STOP terbaca normal | [ ] Lulus  [ ] Gagal | |
| 2 | Boot awal USB & deteksi I2C | `ADS1115 ada, SHT31 ada, LCD ada` | [ ] Lulus  [ ] Gagal | |
| 3 | Koneksi Wi-Fi & MQTT ke Pi | Lampu Hijau; status online stabil ≥ 5 menit | [ ] Lulus  [ ] Gagal | |
| 4 | Kalibrasi 2-titik EC (1.413 / 12.880) & pH (4,0 / 7,0) | Selisih ≤ 5% (EC) & ≤ 0,1 (pH) | [ ] Lulus  [ ] Gagal | |
| 5 | Kalibrasi laju pompa A, B, pH Up, pH Down (air bersih) | 3× takar selisih ≤ 5%; tersimpan di NVS | [ ] Lulus  [ ] Gagal | |
| 6 | Uji pengaman (E-STOP, float bawah/atas, hilang server 30 dtk) | Semua pompa berhenti sesuai syarat | [ ] Lulus  [ ] Gagal | |
| 7 | Akses web/HP operator (`Dashboard`, `Peringatan`, `Asisten AI`) | Login berhasil & grafik/CCTV/AI tampil | [ ] Lulus  [ ] Gagal | |

