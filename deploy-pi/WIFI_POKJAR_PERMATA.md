# Panduan Jaringan: Raspberry Pi di Wi-Fi "Pokjar Permata"

Panduan khusus menghubungkan Pi ke Wi-Fi **Pokjar Permata** supaya
**semua perangkat di Wi-Fi yang sama** (HP, laptop, ESP32) bisa membuka
website `http://IP-PI/` dan melihat data sensor.

Isi panduan:
1. [Mode Stasioner (Pi jadi klien Wi-Fi)](#1-mode-stasioner-pi-sebagai-klien-wi-fi-pokjar-permata)
2. [IP Stabil (supaya alamat tidak berubah)](#2-ip-stabil-supaya-alamat-tidak-pernah-berubah)
3. [Akses dari perangkat lain](#3-akses-dari-perangkat-lain-hplaptop)
4. [ESP32 di jaringan yang sama](#4-esp32-di-jaringan-yang-sama)
5. [Troubleshooting](#5-troubleshooting-checklist)
6. [Mode cadangan (router mati)](#6-mode-cadangan-router-mati)

> Ganti `[ISI_PASSWORD_WIFI]` di bawah dengan **password Wi-Fi Pokjar Permata**
> milik Anda. Jangan simpan password asli di file ini.

---

## 1. Mode Stasioner: Pi sebagai klien Wi-Fi "Pokjar Permata"

Ada **2 jalur** — pilih salah satu (jalur A paling mudah).

### Jalur A — Saat imaging (sebelum Pi dinyalakan)

1. Buka **Raspberry Pi Imager** di Mac/PC.
2. Pilih OS → **Raspberry Pi OS (64-bit) Lite** atau Desktop.
3. Klik **gear (Next)** sampai muncul **OS Customisation**.
4. Isi kolom Wi-Fi:

   | Kolom | Isi |
   |---|---|
   | SSID | `Pokjar Permata` |
   | Password | `[ISI_PASSWORD_WIFI]` |
   | Wireless LAN country | `ID` |

5. Centang juga **SSH** (agar bisa masuk dari Mac).
6. Selesaikan imaging, masukkan SD card ke Pi, colok listrik.
7. Lanjut ke [Bagian 2 — cek IP](#2-ip-stabil-supaya-alamat-tidak-pernah-berubah).

### Jalur B — Setelah Pi berjalan (pakai `nmcli`)

Raspberry Pi OS **Bookworm** memakai **NetworkManager**, jadi semua
diatur dengan `nmcli`. Masuk ke Pi dulu:

```bash
ssh namauser@vertonik.local
```

**Langkah bernomor:**

1. Lihat daftar Wi-Fi yang terdeteksi (pastikan `Pokjar Permata` muncul):

   ```bash
   nmcli device wifi list
   ```

2. Sambungkan ke Pokjar Permata:

   ```bash
   nmcli device wifi connect 'Pokjar Permata' password '[ISI_PASSWORD_WIFI]'
   ```

3. Verifikasi sudah tersambung:

   ```bash
   nmcli connection show
   ```

   Baris dengan tanda `*` di depan = koneksi yang sedang aktif. Cek juga:

   ```bash
   nmcli -f ACTIVE,SSID,DEVICE connection show
   hostname -I
   ```

4. Bila salah password, ulangi dengan mengubah `[ISI_PASSWORD_WIFI]`.

---

## 2. IP Stabil (supaya alamat tidak pernah berubah)

Website dibuka lewat `http://IP-PI/`. Kalau IP berubah, semua
tautan (browser & firmware ESP32) ikut putus. **Solusi terbaik: DHCP
reservation di router.**

### 2a. Cek IP Pi sekarang

Di Pi (via SSH):

```bash
hostname -I
# atau, lebih detail:
ip a
```

Catat angkanya, contoh: `192.168.1.50`. Cara lain: lihat daftar device
di halaman admin router.

### 2b. Buat DHCP Reservation di router (disarankan)

Langkah generik untuk router umum (TP-Link, D-Link, Tenda, Huawei, dst.):

1. Buka browser di laptop yang **terhubung ke Wi-Fi Pokjar Permata**.
2. Ketik alamat router di address bar, umumnya:
   ```
   192.168.1.1
   ```
   (kalau tidak bisa, coba `192.168.0.1` atau `192.168.1.254` —
   lihat label di bawah router untuk alamat & password admin).
3. Login dengan password admin router.
4. Cari menu **DHCP Server** / **DHCP** / **LAN** (cari submenu
   **Address Reservation**, **DHCP Reservation**, **Static DHCP
   Client List**, atau **Bind IP to MAC**).
5. Klik **Add** / **Tambah**, lalu isi:

   | Isi | Nilai |
   |---|---|
   | MAC address Pi | jalankan `ip link show wlan0` di Pi → baris `link/ether` |
   | IP yang direservasi | `192.168.1.50` (IP yang tadi dicatat) |

6. **Enable / Save / Simpan**, lalu **reboot router** bila diminta.
7. Verifikasi dari Pi: `hostname -I` → IP harus tetap sama.

Dengan begini IP Pi **tidak akan berubah** walau Pi direstart.

### 2c. Alternatif: static IP langsung di Pi (tanpa router)

Bila tidak punya akses admin router (atau router tidak punya fitur
reservation), set IP tetap di Pi. Ganti `192.168.1.50` dengan IP bebas
di rentang router Anda (hindari alamat yang dipakai device lain):

```bash
sudo nmcli connection modify 'Pokjar Permata' ipv4.method manual \
  ipv4.addresses 192.168.1.50/24 \
  ipv4.gateway 192.168.1.1 \
  ipv4.dns 192.168.1.1
sudo nmcli connection up 'Pokjar Permata'
hostname -I
```

> Catatan: metode ini IP-nya dijamin tetap, tapi bila ada device lain
> yang kebetulan dapat alamat itu dari router bisa tabrakan (duplicate
> IP). Reservation di router (2b) tetap paling aman.

---

## 3. Akses dari perangkat lain (HP/laptop)

Prasyarat: HP/laptop **harus terhubung ke Wi-Fi Pokjar Permata yang sama**
(bukan pakai data seluler, bukan Wi-Fi lain).

**Langkah verifikasi — urut, jangan lompat:**

1. Cari IP Pi (dari Bagian 2a), misal `192.168.1.50`.
2. **Ping dulu** dari HP/laptop (di Mac: buka Terminal; di HP: app
   Terminal/ping — atau lompat ke langkah 4 bila tidak ada terminal):

   ```bash
   ping 192.168.1.50
   ```

   Harus ada balasan `64 bytes from 192.168.1.50...`. Tekan `Ctrl+C`
   untuk berhenti.
3. Bila ping berhasil, buka browser → ketik:
   ```
   http://192.168.1.50
   ```
   Website **GARAP** harus tampil.
4. Bila ping gagal → lihat [Troubleshooting](#5-troubleshooting-checklist).

### Kenapa cukup buka port 80, port 8000 tidak perlu?

| Port | Siapa buka | Untuk siapa |
|---|---|---|
| **80** | nginx (web server) | browser & ESP32 — **inilah yang dibuka** |
| 8000 | backend Node.js | hanya localhost (`127.0.0.1`) — sengaja ditutup |

```
Perangkat lain ──http://IP-PI/ (port 80)──▶ nginx ──▶ backend 127.0.0.1:8000
```

Jadi Anda **tidak perlu** membuka `http://IP-PI:8000` — semua permintaan
lewat port 80 dan nginx meneruskannya ke backend secara internal.
Backend yang terikat ke localhost justru lebih aman dari jaringan luar.

---

## 4. ESP32 di jaringan yang sama

ESP32 harus berada di **Wi-Fi Pokjar Permata yang sama** dengan Pi.
Di firmware (`secrets.h` / bagian konfigurasi), isi:

```cpp
const char* WIFI_SSID  = "Pokjar Permata";
const char* WIFI_PASS  = "[ISI_PASSWORD_WIFI]";

// PENTING: pakai IP Pi di jaringan, BUKAN 127.0.0.1
const char* SERVER_URL = "http://192.168.1.50/api/save-sensor";
const char* API_KEY    = "xxxxx"; // sama dengan ESP32_API_KEY di /opt/vertonik/backend/.env
```

**Catatan khusus firmware:**

- `SERVER_URL` wajib `http://IP-PI/...` — **jangan pernah** `127.0.0.1`
  (itu berarti ESP32 mencari server di dirinya sendiri → selalu gagal).
- `SERVER_URL` juga **jangan** `http://localhost/...` (sama saja salah).
- Gunakan IP yang sama dengan hasil **DHCP reservation** (Bagian 2) supaya
  tidak perlu update firmware saat IP berubah.
- Path-nya tetap `/api/save-sensor` (lewat nginx port 80), API key tetap sama.

---

## 5. Troubleshooting checklist

| Gejala | Penyebab | Solusi (urut dicoba) |
|---|---|---|
| Tidak bisa buka `http://IP-PI/` | IP salah / beda subnet | 1) Cek IP Pi: `hostname -I`. 2) Cek IP HP/laptop (Wi-Fi detail) — **angka pertama-tiga harus sama**, misal sama-sama `192.168.1.x`. 3) Ping dulu: `ping IP-PI` |
| Ping berhasil tapi web tidak muncul | nginx mati / firewall | Di Pi: `sudo systemctl status nginx` · `sudo ufw status` — bila ufw aktif: `sudo ufw allow 80` · `sudo systemctl restart nginx` |
| IP Pi berubah tiap reboot | belum ada reservation | **Wajib** buat DHCP reservation di router (Bagian 2b), atau static IP (2c) |
| Lupa IP Pi | lupa mencatat | Dari Mac: `ping vertonik.local` (otomatis ketemu via Avahi/mDNS) — lalu `hostname -I` di Pi, atau lihat daftar device di router |
| ESP32 gagal kirim data | SSID/password/sinyal | Cek `WIFI_SSID` tepat `Pokjar Permata` (huruf besar-kecil & spasi penting) · password benar · sinyal kuat (pindahkan ESP32 lebih dekat ke router) · cek `SERVER_URL` bukan `127.0.0.1` |
| Koneksi putus-nyambung | sinyal lemah / router ramai | Pi & router saling dekat · hindari benda tebal/metal · coba ganti kanal Wi-Fi di router (1/6/11) · bila Pi punya kabel LAN, pakai itu untuk Pi (HP/ESP32 tetap Wi-Fi) |
| SSH ke Pi putus | mDNS gagal | Pakai IP langsung: `ssh namauser@192.168.1.50` |

---

## 6. Mode cadangan: router mati

Bila **router Pokjar Permata mati / tidak ada**, Pi bisa memancarkan
Wi-Fi sendiri (mode AP) — website tetap bisa dibuka tanpa router:

1. Di Pi, jalankan:
   ```bash
   bash /opt/vertonik/deploy-pi/vertonik-hotspot
   ```
2. HP/laptop sambung ke hotspot **VERTONIK** (password ditampilkan
   sekali oleh skrip).
3. Buka **http://10.42.0.1** (atau `http://vertonik`).
4. ESP32 di firmware: `WIFI_SSID = "VERTONIK"` dan
   `SERVER_URL = "http://10.42.0.1/api/save-sensor"`.

Detail lengkap: lihat **Bagian I** di [PANDUAN.md](PANDUAN.md).
Kembalikan ke mode stasioner (klien router) kapan saja dengan:

```bash
sudo nmcli connection down vertonik-hotspot
sudo nmcli connection up 'Pokjar Permata'
```
