# Panduan Deploy GARAP ke Raspberry Pi

Deploy **lokal** — semua berjalan di Raspberry Pi di jaringan sendiri (tanpa cloud).
Isi paket: backend Node.js · aplikasi web (React) · database PostgreSQL ·
konfigurasi nginx · service otomatis.

```
vertonik-pi/                    ← hasil unzip (selalu -d vertonik-pi)
├── PANDUAN.md            ← dokumen ini
├── setup-pi.sh           ← instalator sekali jalan
├── backend/              ← API Node.js (sudah termasuk .env)
├── dist/                 ← aplikasi web (React, sudah dibuild)
├── database/vertonik.sql ← skema + data awal PostgreSQL (dump SEGAR dari DB live)
├── nginx/vertonik.conf   ← konfigurasi web + reverse proxy
├── systemd/              ← service agar auto-start saat boot
├── docs/                 ← BACKUP_RESTORE_PI.md · ESP32_API.md · ARSITEKTUR_PI_2ESP32.md
├── vertonik-update       ← update program dari GitHub (lihat Bagian H3)
├── vertonik-hotspot      ← nyalakan hotspot Wi-Fi (lihat Bagian I1)
├── WIFI_POKJAR_PERMATA.md · KREDENSIAL-LOKAL.txt · README-INDUK.md
```
> Isi zip ditampilkan **langsung di root** (tanpa folder pembungkus), jadi
> `unzip -d vertonik-pi` selalu menghasilkan `vertonik-pi/setup-pi.sh` —
> **tanpa nesting ganda**. Setelah instalasi, salinan dokumen + utilitas
> ada juga di `/opt/vertonik/deploy-pi/`.

---

## Bagian A — Siapkan Raspberry Pi

### A1. Pasang Raspberry Pi OS
Gunakan **Raspberry Pi Imager** (dari raspberrypi.com) → pilih
**Raspberry Pi OS (64-bit) Desktop** atau **Lite**.

> **TANPA LAYAR (headless) — sangat bisa.** Pilih **Raspberry Pi OS Lite**
> (lebih ringan, tanpa desktop). Semua instalasi di panduan ini dilakukan
> lewat SSH dari Mac — monitor & keyboard tidak diperlukan sama sekali.
> Yang penting: centang **SSH** di OS Customisation, dan isi Wi-Fi
> (atau colokkan kabel LAN — lebih stabil untuk server).

Saat diminta "OS Customisation", isi:
- hostname: `vertonik` (opsional)
- aktifkan **SSH**
- username & password (catat!)
- Wi-Fi jaringan Anda

> **Wi-Fi khusus "Pokjar Permata"?** Panduan jaringan lengkap — mode
> stasioner (isi SSID di Imager atau sambung manual dengan `nmcli`),
> cara membuat IP stabil via DHCP reservation di router, akses dari
> HP/laptop, konfigurasi ESP32, dan troubleshooting — ada di
> **[WIFI_POKJAR_PERMATA.md](WIFI_POKJAR_PERMATA.md)**. Langkah A1/A2
> di bawah tetap berlaku; file itu hanya melengkapi bagian jaringannya.

### A2. Nyalakan + cari IP Pi
Colokkan Pi ke listrik & jaringan. Cari IP-nya dari Mac:
```bash
ping vertonik.local
# atau lihat daftar device di router (192.168.x.x)
```
> Bila memakai Wi-Fi **Pokjar Permata**, cek IP Pi & cara menguncinya
> supaya tidak berubah (DHCP reservation / static IP) ikuti
> **[WIFI_POKJAR_PERMATA.md](WIFI_POKJAR_PERMATA.md)** Bagian 2 —
> IP yang stabil wajib agar website (`http://IP-PI/`) dan firmware ESP32
> tidak putus tiba-tiba.

### A3. Masuk ke Pi via SSH
```bash
ssh namauser@vertonik.local
# (ganti namauser dengan username yang Anda buat saat imaging)
```

> **Konvensi satu nama (pakai di SELURUH panduan ini):**
> - hostname Pi = `vertonik` (diisi di Imager, langkah A1) → alamat `vertonik.local`
> - user SSH = `namauser` (username buatan Anda saat imaging; contoh lama:
>   `garap`, `rizki`)
> - bila hostname Pi **belum diganti** (masih bawaan), pakai
>   `raspberrypi.local`; bila mDNS buntu, pakai IP langsung
>   `ssh namauser@192.168.x.x`
> - skrip Mac `scripts/pi` & `scripts/update-di-pi.sh` memakai default
>   `rizki@raspberrypi.local` — timpa dengan argumen pertama
>   (`./scripts/pi ...` → `PI=namauser@vertonik.local ./scripts/pi ...`).

---

## Bagian B — Kirim paket dari Mac ke Pi

Dari **Mac** (bukan dari Pi), di folder paket:
```bash
scp vertonik-pi-*.zip namauser@vertonik.local:~/
```
Alternatif: salin zip ke flash drive → pindahkan di Pi.

---

## Bagian C — Instalasi di Pi (1 perintah)

Dari **Mac**, kirim paket (Bagian B), lalu di Pi:
```bash
ssh namauser@vertonik.local
sudo apt install -y unzip
unzip vertonik-pi-*.zip -d vertonik-pi
cd vertonik-pi
chmod +x setup-pi.sh
./setup-pi.sh
```
> - `unzip ... -d vertonik-pi` wajib — file zip memang berada di root archive,
>   jadi hasilnya **persis** `vertonik-pi/setup-pi.sh` (tidak ada lapisan kedua).
> - Kalau di `~/` ada lebih dari satu file `vertonik-pi-*.zip`, tulis nama file
>   persisnya, mis. `unzip vertonik-pi-20261021.zip -d vertonik-pi`.
> - Muncul `vertonik-pi/vertonik-pi-...`? Itu sisa paket LAMA — bersihkan:
>   `rm -rf vertonik-pi` lalu ulangi perintah unzip di atas.

Instalator otomatis melakukan:
1. Pasang PostgreSQL, nginx, Node.js (v20 LTS bila perlu)
2. Salin aplikasi ke `/opt/vertonik` + `/var/www/vertonik`
3. Buat database `vertonik_smartfarm` + impor data awal
4. Pasang dependensi backend
5. Pasang **service** `vertonik-api` (auto-start saat boot)
6. Pasang **nginx** (web + proxy API)
7. Verifikasi otomatis

Akhir instalasi akan menampilkan:
```
  Web aplikasi : http://192.168.x.x
  API backend  : http://192.168.x.x/api/...
```

---

## Bagian D — Verifikasi

### D1. Dari Mac, buka browser
```
http://IP-PI-ANDA
```
Harus tampil aplikasi **GARAP**.

### D2. Cek API
```bash
curl http://IP-PI-ANDA/api/latest-sensor
# → JSON data sensor (tanpa password/API key)
```

### D3. Cek koneksi web → API
Di halaman aplikasi, kartu status harus hijau **"Terhubung"**
(bila backend hidup dan ada data sensor).

---

## Bagian E — Arahkan ESP32 ke Pi

Di sketch firmware (`secrets.h` / bagian konfigurasi), ganti alamat server:
```cpp
const char* SERVER_URL = "http://192.168.x.x/api/save-sensor";   // IP Pi Anda
const char* API_KEY    = "xxxxx";   // sama dengan ESP32_API_KEY di /opt/vertonik/backend/.env
```
Catatan: ESP32 bicara ke **nginx port 80** (backend Node.js sengaja hanya
dengar di localhost demi keamanan).

> **Kunci ESP32:** kuncinya ada di baris `ESP32_API_KEY=<kunci-unik>` di
> `/opt/vertonik/backend/.env`. Bila baris itu belum ada, backend memakai
> fallback lama (`HARVEST123`) dan menolak semua request ber-*header*
> `X-API-KEY` (lihat warning di log). Tambahkan barisnya lalu
> `sudo systemctl restart vertonik-api`, dan pakai nilai itu di firmware.

---

## Bagian F — Perawatan harian

| Kebutuhan | Perintah |
|---|---|
| Lihat log real-time | `sudo journalctl -u vertonik-api -f` |
| Restart API | `sudo systemctl restart vertonik-api` |
| Restart web | `sudo systemctl restart nginx` |
| Status semua service | `sudo systemctl status vertonik-api nginx postgresql` |
| Ganti API key / rahasia | edit `/opt/vertonik/backend/.env` lalu `sudo systemctl restart vertonik-api` |
| Update aplikasi | lihat Bagian G |

### Backup database (disarankan)
Buat backup otomatis tiap hari pukul 02:30. Di Pi jalankan `crontab -e`
(lalu tempel **satu baris** berikut, simpan, keluar):
```cron
30 2 * * * cd /opt/vertonik/backend && mkdir -p $HOME/backup-vertonik && pg_dump --no-owner --no-privileges "$(grep -E '^DATABASE_URL=' .env | cut -d= -f2-)" | gzip > $HOME/backup-vertonik/vertonik-$(date +\%Y\%m\%d-\%H\%M).sql.gz
```
> **Penting — kenapa tidak `pg_dump -U vertonik ...` saja?** Cron berjalan
> **tanpa terminal interaktif**, jadi `pg_dump` tidak bisa menanyakan password
> → backup gagal diam-diam (`password authentication failed`). Baris di atas
> membaca `DATABASE_URL` (sudah termasuk password) dari
> `/opt/vertonik/backend/.env` saat cron dieksekusi — tidak ada password yang
> diketik atau ditulis di file crontab. `%` di crontab wajib di-escape `\%`.

Cek hasilnya:
```bash
crontab -l                       # baris cron sudah terdaftar
ls -lh ~/backup-vertonik/        # file .sql.gz hari ini harus ada & tidak 0 byte
```
Alternatif memakai skrip resmi (dump + salinan `.env` + rotasi 7 file terakhir):
```cron
30 2 * * * cd /opt/vertonik/backend && ./scripts/backup-pi.sh --dir $HOME/backup-vertonik >> $HOME/backup-vertonik/cron.log 2>&1
```
Simpan file `~/backup-vertonik/*.sql.gz` ke tempat aman (detail & cara restore:
**docs/BACKUP_RESTORE_PI.md** di paket / `deploy-pi` — juga ada di
`/opt/vertonik/docs/`).

---

## Bagian G — Update aplikasi

Dari Mac (setelah perubahan kode):
```bash
# di Mac: build ulang web + dump database bila perlu
cd ~/Project/Vertoniksmartfarm/react-web-app && npm run build
# jalankan skrip pengepakan ulang: scripts/siapkan-paket-pi.sh
scp vertonik-pi-*.zip namauser@vertonik.local:~/
```
Di Pi:
```bash
unzip -o vertonik-pi-*.zip -d vertonik-pi
cd vertonik-pi
./setup-pi.sh          # aman dijalankan ulang — data & .env lama tidak ditimpa
sudo systemctl restart vertonik-api
```

---

## Bagian H — Update via CLI (tanpa lepas SD card!)

Setelah Pi terpasang, SEMUA bisa dikendalikan dari Mac lewat terminal —
SD card **tidak perlu pernah dilepas lagi**.

### H1. Update program (kode aplikasi)
Satu perintah dari Mac — **selalu sebut targetnya** (skrip tanpa argumen
memakai default lama `rizki@raspberrypi.local`):
```bash
./scripts/update-di-pi.sh namauser@vertonik.local
# atau: ./scripts/update-di-pi.sh namauser@192.168.1.50
```
Perintah ini otomatis: build web → kirim backend + web ke Pi →
install dependensi → restart service. **Konfigurasi (.env) tidak tertimpa.**

### H2. Update konfigurasi (API key, database, port, dst.)
Konfigurasi hidup di SATU file saja: `/opt/vertonik/backend/.env`
```bash
ssh namauser@vertonik.local
nano /opt/vertonik/backend/.env        # edit yang perlu, Ctrl+X lalu Y
sudo systemctl restart vertonik-api
```

### H3. Update dari GitHub (alternatif, tanpa Mac)
```bash
ssh namauser@vertonik.local
bash /opt/vertonik/deploy-pi/vertonik-update   # tarik dari GitHub + restart
```

### H4. Lihat kondisi dari Mac
```bash
ssh namauser@vertonik.local 'sudo systemctl status vertonik-api nginx --no-pager'
ssh namauser@vertonik.local 'sudo journalctl -u vertonik-api -n 50'
```

Agar SSH tidak pernah menanyakan password: gunakan kunci SSH
(sekali `ssh-copy-id`, setelahnya otomatis — sudah disiapkan di panduan ini).

---

## Bagian J — Isi SD card langsung (instalasi otomatis tanpa perintah)

SD card bisa diisi penuh dari Mac sehingga Pi **menginstal dirinya sendiri**
saat boot pertama. Yang perlu Anda lakukan hanya mengisi 2 file teks.

### J1. Isi 2 file di SD card (dari Mac)
Buka folder `vertonik` di kartu (partisi `bootfs`):

| File | Isi |
|---|---|
| `vertonik/wifi.txt` | `SSID=` nama Wi-Fi Anda · `PASSWORD=` sandinya · (opsional `HOTSPOT_SSID=` / `HOTSPOT_PASSWORD=`) |
| `vertonik/password.txt` | `PASSWORD=` sandi untuk akun `rizki` di Pi |

### J2. Masukkan ke Pi → colok listrik (kabel LAN disarankan)
Tunggu **10–20 menit**. Pi otomatis: menyambung Wi-Fi → install
PostgreSQL + nginx + Node.js → pasang aplikasi + database → buat user +
kunci SSH → nyalakan hotspot → reboot bersih.

### J3. Cek progres kapan saja
Masukkan kartu lagi ke Mac → buka **`STATUS-VERTONIK.txt`** — setiap tahap
tercatat di situ, termasuk password bila dibuat otomatis.

### J4. Hasil akhir
- Hotspot **VERTONIK** menyala → HP sambung → buka **http://vertonik**
- Login web: `garap` / `<ADMIN_PASSWORD>`
- SSH dari Mac tanpa password: `ssh rizki@vertonik.local` (user `rizki`
  dibuat otomatis provisioning sesuai J1; bila hostname belum `vertonik`,
  pakai `raspberrypi.local` — lihat konvensi di Bagian A3)
- File `password.txt` otomatis terhapus setelah instalasi.

Jika gagal (mis. tidak ada internet), Pi mencoba lagi otomatis sampai 3× —
perbaiki `wifi.txt` atau colok kabel LAN lalu reboot.

---

## Bagian I — Hotspot Wi-Fi dari Pi (akses website TANPA router)

Pi bisa **memancarkan Wi-Fi sendiri**. HP/laptop/ESP32 menyambung ke hotspot
itu lalu membuka website — cocok untuk greenhouse di lokasi tanpa router.

### I1. Aktifkan hotspot (1 perintah di Pi)
```bash
ssh namauser@vertonik.local
bash /opt/vertonik/deploy-pi/vertonik-hotspot
# atau dengan nama + sandi sendiri:
# bash /opt/vertonik/deploy-pi/vertonik-hotspot "VERTONIK-GH" "sandi-min8huruf"
```
Skrip otomatis: membuat hotspot (SSID `VERTONIK`, password dibuat acak dan
ditampilkan sekali), mengaktifkan nama lokal `http://vertonik`, dan memastikan
website + API hidup.

### I2. Cara pakai dari HP/laptop
1. Pilih Wi-Fi **VERTONIK** → masukkan password hotspot
2. Buka browser → **http://vertonik** (atau **http://10.42.0.1**)
3. Website Vertonik tampil — login dan gunakan seperti biasa

Alamat lain yang bisa dipakai: `http://raspberrypi.local` (bila hostname belum
diganti).

### I3. ESP32 lewat hotspot
Di sketch firmware:
```cpp
const char* WIFI_SSID = "VERTONIK";
const char* WIFI_PASS = "<password hotspot>";
const char* SERVER_URL = "http://10.42.0.1/api/save-sensor";
```
ESP32 → hotspot Pi → data langsung masuk. **Tidak butuh internet sama sekali.**

### I4. Catatan
- Hotspot memakai radio Wi-Fi Pi penuh → Pi tidak ikut Wi-Fi router saat
  mode AP. Internet (jika ada) dibagikan lewat **kabel LAN** — otomatis
  (bawaan NetworkManager).
- Ganti sandi: `sudo nmcli connection modify vertonik-hotspot wifi-sec.psk 'sandi-baru'`
- Matikan hotspot: `sudo nmcli connection down vertonik-hotspot`
- Nyalakan lagi: `sudo nmcli connection up vertonik-hotspot`

---

## Troubleshooting

| Gejala | Penyebab / solusi |
|---|---|
| `./setup-pi.sh: command not found` / ada `vertonik-pi/vertonik-pi-...` | unzip tanpa `-d` (atau paket lama ber-folder pembungkus) → `rm -rf vertonik-pi` lalu `unzip vertonik-pi-*.zip -d vertonik-pi` (lihat Bagian C) |
| Halaman web tidak muncul | `sudo systemctl status nginx` · cek IP dengan `hostname -I` |
| API error 502/504 | backend mati: `sudo systemctl status vertonik-api` · `sudo journalctl -u vertonik-api -n 50` |
| "Backend tidak terjangkau" di aplikasi | pastikan `curl http://127.0.0.1:8000/api/latest-sensor` jalan di Pi |
| Login `garap` ditolak / akun tidak ada | dump basi (paket lama) — regenerasi paket: `./scripts/siapkan-paket-pi.sh` (dump diambil dari DB live, akun `garap`/`petani`/`demo` ikut di dalamnya) |
| Halaman konfigurasi dosis/target kosong atau 404 | dump basi tanpa tabel V2 — solusi sama: paket ulang dengan dump segar, lalu `./setup-pi.sh` lagi (impor dilewati bila DB sudah ada → kosongkan schema dulu, lihat docs/BACKUP_RESTORE_PI.md §2) |
| `bash: /opt/vertonik/deploy-pi/vertonik-hotspot: No such file` | `setup-pi.sh` versi lama tidak menyalin utilitas — jalankan ulang `./setup-pi.sh` dari paket TERBARU (kini menyalin ke `/opt/vertonik/deploy-pi/`) |
| Backup cron gagal `password authentication failed` | baris cron lama `pg_dump -U vertonik` tanpa password — ganti dengan baris di Bagian F (baca `DATABASE_URL` dari `.env`) |
| Impor database gagal | lihat error: `psql -h 127.0.0.1 -U vertonik -d vertonik_smartfarm -f database/vertonik.sql` · `sudo -u postgres psql -c '\l'` cek versi/izin |
| ESP32 tidak bisa kirim | cek IP di firmware, firewall: `sudo ufw status` (bila aktif: `sudo ufw allow 80`) · `ESP32_API_KEY` di `.env` (Bagian E) |
| `ssh: Could not resolve vertonik.local` | hostname belum diganti → pakai `raspberrypi.local` atau IP (`ping`/lihat router) — konvensi di Bagian A3 |
| Lupa password login aplikasi | akun bawaan: **`garap` (admin)**, `petani`, `demo` — sandinya ada di `/opt/vertonik/backend/.env` (`ADMIN_PASSWORD` / `PETANI_PASSWORD` / `DEMO_PASSWORD`) dan di `deploy-pi/KREDENSIAL-LOKAL.txt`. Hash-nya juga tersimpan di tabel `users` dump `database/vertonik.sql` |
| Ingin ganti APP_KEY | mengganti APP_KEY membuat data terenkripsi lama tidak terbaca — masukkan ulang API key WhatsApp via aplikasi |

---

## Arsitektur (ringkas)

```
ESP32 ──Wi-Fi──▶ nginx (:80) ──▶ backend Node.js (127.0.0.1:8000) ──▶ PostgreSQL
Browser ──────▶ nginx (:80) ──▶ dist/ (aplikasi web)
```

- **nginx** melayani aplikasi web + meneruskan API + menyembunyikan backend
- **backend** hanya melayani JSON (tanpa HTML), terikat ke localhost
- **rate limiting** aktif: GET 300/menit · tulis 60/menit · login 10/menit per IP
- Semua berjalan **lokal** — tidak ada data yang keluar dari jaringan Anda
