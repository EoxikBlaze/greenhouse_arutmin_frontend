# Tutorial: Raspberry Pi kosongan → Server GARAP (konfigurasi manual)

Panduan ini untuk Anda yang ingin memasang server GARAP **sendiri, langkah demi langkah**, mulai dari Raspberry Pi
dengan Linux kosongan. Isinya sama dengan yang dikerjakan skrip otomatis `deploy-pi/pasang-server.sh`, tetapi
diuraikan satu per satu supaya Anda paham dan bisa mengubahnya.

**Hasil akhir:**

```
ESP32 sensor/aktuator ──HTTP :80 /api/device/──┐
Browser / HP ───────────HTTPS :443─────────────┤
                                               ▼
        nginx  ──►  Node API 127.0.0.1:8000  ──►  PostgreSQL (localhost)
                         └─ (opsional) Ollama AI lokal 127.0.0.1:11434
```

- Backend Node **hanya** mendengar di `127.0.0.1` — dari jaringan hanya bisa lewat nginx.
- PostgreSQL **hanya** `localhost`.
- Port terbuka: 22 (SSH), 80 (khusus ESP32), 443 (web), 5353/udp (`vertonik.local`).

> **Konvensi.** Perintah diketik di dua tempat: **[Mac]** = terminal laptop Anda (di folder proyek
> `Vertoniksmartfarm`), **[Pi]** = terminal SSH di Raspberry Pi. Ganti `garap` dengan nama user Pi Anda dan
> `192.168.1.50` dengan IP Pi Anda.

---

## 0. Yang dibutuhkan

| Barang | Catatan |
|---|---|
| Raspberry Pi 4/5, RAM ≥ 4 GB | 2 GB bisa, tetapi AI lokal memakai model kecil (0,5B) |
| microSD ≥ 32 GB (A1/A2) atau SSD USB | SSD jauh lebih awet untuk database |
| Adaptor daya resmi | daya kurang = Pi melambat (lihat langkah 18) |
| Laptop + aplikasi **Raspberry Pi Imager** | raspberrypi.com/software |
| Jaringan WiFi/LAN yang sama dengan ESP32 | WiFi yang mengaktifkan *client isolation* membuat ESP32 tidak bisa menjangkau Pi |

---

## 1. Tulis Raspberry Pi OS Lite ke SD card

1. Buka **Raspberry Pi Imager** → *Choose Device* (model Pi Anda) → *Choose OS* →
   **Raspberry Pi OS (other) → Raspberry Pi OS Lite (64-bit)** (tanpa desktop = lebih ringan).
2. *Choose Storage* → SD card → **Next → Edit settings**:
   - **General:** hostname `vertonik`, username `garap` + kata sandi kuat, WiFi (SSID + sandi + negara `ID`),
     zona waktu `Asia/Makassar`.
   - **Services:** centang **Enable SSH**. Paling aman pilih *Allow public-key authentication only* dan tempel
     kunci publik laptop Anda (isi `~/.ssh/id_ed25519.pub`). Belum punya kunci? Buat dulu:

```bash
ssh-keygen -t ed25519 -C "laptop-garap"
```

3. *Save → Yes* → tunggu selesai → pasang SD card di Pi → nyalakan, tunggu ±2 menit.

---

## 2. Masuk ke Pi dan perbarui sistem

**[Mac]**

```bash
ssh garap@vertonik.local
```

(`vertonik.local` tidak ketemu? Cari IP Pi di halaman router, lalu `ssh garap@192.168.1.50`.)

**[Pi]**

```bash
sudo apt update && sudo apt full-upgrade -y
```

```bash
sudo reboot
```

Masuk lagi dengan `ssh` setelah ±1 menit.

---

## 3. IP tetap

ESP32 menyimpan IP Pi di firmware, jadi IP Pi **tidak boleh berubah**.

- **Cara terbaik:** reservasi DHCP di router (ikat MAC address Pi ke satu IP).
- **Cara di Pi** (Raspberry Pi OS Bookworm memakai NetworkManager). Lihat nama koneksi dulu:

```bash
nmcli -t -f NAME,TYPE con show --active
```

Lalu atur (ganti nama koneksi, IP, dan gateway sesuai jaringan Anda):

```bash
sudo nmcli con mod "preconfigured" ipv4.method manual ipv4.addresses 192.168.1.50/24 ipv4.gateway 192.168.1.1 ipv4.dns "192.168.1.1 1.1.1.1"
```

Matikan hemat daya WiFi (mencegah ESP32 sering *time-out* ke Pi):

```bash
printf '[connection]\nwifi.powersave = 2\n' | sudo tee /etc/NetworkManager/conf.d/wifi-powersave-off.conf
```

```bash
sudo reboot
```

---

## 4. Paket sistem

**[Pi]**

```bash
sudo apt install -y postgresql nginx curl openssl ufw fail2ban unattended-upgrades ca-certificates rsync avahi-daemon ffmpeg
```

- `postgresql` database · `nginx` pintu depan web/HTTPS · `ufw` firewall · `fail2ban` blokir brute-force ·
  `unattended-upgrades` tambalan keamanan otomatis · `avahi-daemon` nama `vertonik.local` ·
  `ffmpeg` mengambil gambar kamera RTSP untuk halaman CCTV.

### Node.js 22 LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x -o /tmp/nodesource.sh && sudo bash /tmp/nodesource.sh
```

```bash
sudo apt install -y nodejs && node -v
```

Harus tampil `v22.x`.

---

## 5. Firewall

```bash
sudo ufw default deny incoming && sudo ufw default allow outgoing
```

```bash
sudo ufw allow 22/tcp && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp && sudo ufw allow 5353/udp
```

```bash
sudo ufw enable && sudo ufw status
```

> Port 8000 (Node) dan 5432 (PostgreSQL) **sengaja tidak dibuka**.

---

## 6. User aplikasi dan folder

Aplikasi berjalan sebagai user sistem `vertonik` yang **tidak bisa login**. Kalau aplikasinya dibobol,
penyerang tidak otomatis mendapat akses penuh ke Pi.

```bash
sudo useradd --system --home-dir /opt/vertonik --shell /usr/sbin/nologin vertonik
```

```bash
sudo mkdir -p /opt/vertonik/backend /var/www/vertonik /var/backups/vertonik /etc/vertonik/tls && sudo chmod 700 /etc/vertonik
```

---

## 7. Salin kode dari laptop

### 7a. Build web

**[Mac]** (dari folder proyek):

```bash
cd react-web-app && npm ci && npm run build && cd ..
```

Hasilnya ada di `react-web-app/dist`. Web memanggil API di alamat yang sama (*same-origin*), jadi tidak perlu
mengisi `VITE_API_BASE_URL`.

### 7b. Kirim backend dan web ke Pi

**[Mac]**

```bash
rsync -av --exclude node_modules --exclude .env --exclude test --exclude .git --exclude 'database/backup' --exclude '*.log' backend-nodejs/ garap@vertonik.local:/tmp/backend/
```

```bash
rsync -av react-web-app/dist/ garap@vertonik.local:/tmp/web/
```

**[Pi]** pindahkan ke tempatnya:

```bash
sudo rsync -a --delete /tmp/backend/ /opt/vertonik/backend/ && sudo rsync -a --delete /tmp/web/ /var/www/vertonik/
```

```bash
sudo chown -R vertonik:vertonik /opt/vertonik && rm -rf /tmp/backend /tmp/web
```

> `.env` laptop **tidak ikut disalin** (sengaja). Rahasia untuk Pi dibuat baru di langkah 9.

---

## 8. Database PostgreSQL

Buat sandi database acak (salin hasilnya, dipakai dua kali):

```bash
openssl rand -hex 24
```

Buat role dan database (ganti `SANDI_DB` dengan hasil di atas):

```bash
sudo -u postgres psql -c "CREATE ROLE vertonik LOGIN PASSWORD 'SANDI_DB'"
```

```bash
sudo -u postgres createdb -O vertonik vertonik_smartfarm
```

Pastikan PostgreSQL hanya mendengar di localhost:

```bash
sudo -u postgres psql -tAc 'SHOW config_file'
```

Buka file yang tampil (mis. `/etc/postgresql/15/main/postgresql.conf`) dan pastikan ada baris
`listen_addresses = 'localhost'`, lalu:

```bash
sudo systemctl restart postgresql
```

---

## 9. File rahasia `/etc/vertonik/rahasia.env`

Buat nilai acak untuk JWT (pakai hasilnya di bawah):

```bash
openssl rand -hex 48
```

```bash
sudo nano /etc/vertonik/rahasia.env
```

Isi (ganti `SANDI_DB` dan `JWT_ACAK`):

```ini
PORT=8000
HOST=127.0.0.1
NODE_ENV=production
DATABASE_URL=postgres://vertonik:SANDI_DB@127.0.0.1:5432/vertonik_smartfarm
JWT_SECRET=JWT_ACAK
SECURITY_HSTS=auto
OTOMASI=0
OTOMASI_PENAMPUNG=
OTOMASI_INTERVAL_DETIK=60
AI_OLLAMA_URL=http://127.0.0.1:11434
AI_MODEL=qwen2.5:1.5b
```

- Server **menolak menyala** bila `JWT_SECRET` kosong atau masih nilai contoh — itu disengaja.
- `OTOMASI=0` = dosis otomatis **mati**. Nyalakan hanya setelah sensor & pompa dikalibrasi (langkah 17).
- RAM Pi < 3 GB → pakai `AI_MODEL=qwen2.5:0.5b`.

Kunci izin file (hanya root yang bisa menulis, user `vertonik` hanya membaca):

```bash
sudo chown root:vertonik /etc/vertonik/rahasia.env && sudo chmod 640 /etc/vertonik/rahasia.env
```

---

## 10. Pasang dependensi, impor skema, migrasi

Pasang dependensi produksi:

```bash
sudo -u vertonik env HOME=/opt/vertonik bash -c "cd /opt/vertonik/backend && npm ci --omit=dev --no-audit --no-fund"
```

Impor skema. Dump dibuat oleh PostgreSQL 17; tiga baris khusus versi 17 dibuang agar bisa diimpor ke
PostgreSQL bawaan Raspberry Pi OS (versi 15). Ganti `SANDI_DB`:

```bash
sed -e '/^\\restrict /d' -e '/^\\unrestrict /d' -e '/^SET transaction_timeout/d' /opt/vertonik/backend/database/vertonik.sql | PGPASSWORD='SANDI_DB' psql -q -h 127.0.0.1 -U vertonik -d vertonik_smartfarm -v ON_ERROR_STOP=1 -f -
```

Jalankan migrasi (perubahan skema setelah dump):

```bash
sudo -u vertonik bash -c "set -a; . /etc/vertonik/rahasia.env; set +a; cd /opt/vertonik/backend && node scripts/migrate.js"
```

Bersihkan data pengembangan dari dump (alert uji, sesi, bacaan lama). Meja, tanaman, dan konfigurasi tetap ada.
Ganti `SANDI_DB`:

```bash
PGPASSWORD='SANDI_DB' psql -q -h 127.0.0.1 -U vertonik -d vertonik_smartfarm -v ON_ERROR_STOP=1 -f /opt/vertonik/backend/database/bersihkan_instalasi_baru.sql
```

**Wajib:** ganti sandi semua akun bawaan dengan sandi acak. Dump berisi akun dari masa pengembangan.

```bash
sudo -u vertonik bash -c "set -a; . /etc/vertonik/rahasia.env; set +a; cd /opt/vertonik/backend && node scripts/atur-kata-sandi.js --semua-acak" | sudo tee /etc/vertonik/akun-awal.txt >/dev/null && sudo chmod 600 /etc/vertonik/akun-awal.txt
```

Lihat sandi login web (simpan di pengelola sandi, lalu ganti dari menu Profil):

```bash
sudo cat /etc/vertonik/akun-awal.txt
```

---

## 11. API key untuk ESP32

Tiap ESP32 punya kunci sendiri. Hanya *hash*-nya yang disimpan di database; kunci aslinya ditampilkan **sekali**.

```bash
sudo -u vertonik bash -c "set -a; . /etc/vertonik/rahasia.env; set +a; cd /opt/vertonik/backend && node scripts/buat-kunci.js --perangkat sensor-01 --cabut-lama"
```

```bash
sudo -u vertonik bash -c "set -a; . /etc/vertonik/rahasia.env; set +a; cd /opt/vertonik/backend && node scripts/buat-kunci.js --perangkat aktuator-01 --cabut-lama"
```

Salin baris `KUNCI=vsf_…` masing-masing ke `firmware/sensor/rahasia.h` dan `firmware/aktuator/rahasia.h`
(dari contoh `rahasia.h.contoh`) bersama IP Pi, lalu flash ESP32. Simpan juga di Pi (root-only):

```bash
sudo nano /etc/vertonik/kunci-perangkat.txt && sudo chmod 600 /etc/vertonik/kunci-perangkat.txt
```

---

## 12. Service systemd (API jalan otomatis & ter-sandbox)

```bash
sudo nano /etc/systemd/system/vertonik-api.service
```

```ini
[Unit]
Description=GARAP API (Node.js)
After=network-online.target postgresql.service
Wants=network-online.target postgresql.service

[Service]
Type=simple
User=vertonik
Group=vertonik
WorkingDirectory=/opt/vertonik/backend
EnvironmentFile=/etc/vertonik/rahasia.env
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true
PrivateDevices=true
ProtectSystem=strict
ProtectHome=true
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectControlGroups=true
RestrictSUIDSGID=true
RestrictRealtime=true
LockPersonality=true
RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX
SystemCallFilter=@system-service
CapabilityBoundingSet=
ReadWritePaths=/opt/vertonik
MemoryMax=512M

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload && sudo systemctl enable --now vertonik-api
```

```bash
systemctl status vertonik-api --no-pager
```

Cek dari Pi sendiri (harus `200`):

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8000/api/latest-sensor
```

---

## 13. HTTPS (sertifikat self-signed) dan nginx

Buat sertifikat (ganti IP):

```bash
sudo openssl req -x509 -newkey rsa:2048 -nodes -days 825 -sha256 -keyout /etc/vertonik/tls/server.key -out /etc/vertonik/tls/server.crt -subj "/CN=vertonik.local/O=GARAP" -addext "subjectAltName=DNS:vertonik.local,DNS:vertonik,IP:192.168.1.50,IP:127.0.0.1"
```

```bash
sudo chmod 600 /etc/vertonik/tls/server.key
```

**[Mac]** kirim konfigurasi nginx yang sudah disiapkan:

```bash
scp deploy-pi/nginx/vertonik.conf garap@vertonik.local:/tmp/vertonik.conf
```

**[Pi]**

```bash
sudo mv /tmp/vertonik.conf /etc/nginx/sites-available/vertonik && sudo ln -sf /etc/nginx/sites-available/vertonik /etc/nginx/sites-enabled/vertonik && sudo rm -f /etc/nginx/sites-enabled/default
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

Isi konfigurasi itu, ringkasnya:
- **:80** hanya meneruskan `/api/device/` (ESP32, tanpa TLS); sisanya dialihkan ke HTTPS.
- **:443** menyajikan web dari `/var/www/vertonik` dan meneruskan API ke `127.0.0.1:8000`.
- Pembatas laju: login 10/menit, umum 20/detik, perangkat 10/detik.

> Browser akan memperingatkan "sertifikat tidak dipercaya" sekali (self-signed). Wajar; agar hilang, pasang
> `server.crt` sebagai sertifikat tepercaya di laptop/HP Anda.

---

## 14. Amankan SSH dan pasang fail2ban

Pastikan Anda **sudah bisa login dengan kunci** (langkah 1). Kalau belum, dari Mac:

```bash
ssh-copy-id garap@vertonik.local
```

**[Pi]** matikan login root dan login sandi:

```bash
printf 'PermitRootLogin no\nPasswordAuthentication no\nMaxAuthTries 3\n' | sudo tee /etc/ssh/sshd_config.d/90-vertonik.conf
```

```bash
sudo sshd -t && sudo systemctl reload ssh
```

> Buka **terminal baru** dan uji `ssh garap@vertonik.local` dulu sebelum menutup sesi lama, supaya tidak
> terkunci di luar.

fail2ban:

```bash
printf '[sshd]\nenabled = true\nmaxretry = 5\nfindtime = 10m\nbantime = 1h\n[nginx-limit-req]\nenabled = true\n' | sudo tee /etc/fail2ban/jail.d/vertonik.local
```

```bash
sudo systemctl enable --now fail2ban && sudo systemctl restart fail2ban
```

Update keamanan otomatis:

```bash
printf 'APT::Periodic::Update-Package-Lists "1";\nAPT::Periodic::Unattended-Upgrade "1";\n' | sudo tee /etc/apt/apt.conf.d/20auto-upgrades
```

---

## 15. Backup harian

```bash
sudo nano /usr/local/sbin/vertonik-backup
```

```sh
#!/bin/sh
set -e
D=/var/backups/vertonik; mkdir -p "$D"
sudo -u postgres pg_dump -Fc vertonik_smartfarm > "$D/vertonik-$(date +%F).dump"
chmod 600 "$D"/*.dump
find "$D" -name '*.dump' -mtime +14 -delete
```

```bash
sudo chmod 755 /usr/local/sbin/vertonik-backup && echo '15 2 * * * root /usr/local/sbin/vertonik-backup' | sudo tee /etc/cron.d/vertonik-backup
```

Uji sekali:

```bash
sudo /usr/local/sbin/vertonik-backup && ls -lh /var/backups/vertonik
```

> Satu SD card = satu titik gagal. Salin backup ke laptop secara berkala. File backup hanya bisa dibaca root,
> jadi dari laptop **[Mac]** baca lewat `sudo` (ganti tanggalnya):
> `ssh garap@vertonik.local 'sudo cat /var/backups/vertonik/vertonik-2026-10-24.dump' > vertonik-2026-10-24.dump`

---

## 16. (Opsional) Asisten AI lokal — Ollama

```bash
curl -fsSL https://ollama.com/install.sh -o /tmp/ollama.sh && sh /tmp/ollama.sh
```

Model sesuai RAM (`free -h`): RAM ≥ 4 GB → `qwen2.5:1.5b`; RAM < 3 GB → `qwen2.5:0.5b`.
Samakan dengan `AI_MODEL` di `rahasia.env`.

```bash
ollama pull qwen2.5:1.5b
```

```bash
sudo systemctl restart vertonik-api
```

Ollama hanya mendengar di `127.0.0.1:11434`. AI **hanya memberi saran**; tidak ada jalur dari AI ke pompa.

---

## 17. Uji akhir (urut, jangan dilewati)

1. **Status layanan:**

```bash
systemctl is-active postgresql nginx vertonik-api fail2ban
```

2. **Dari laptop**, buka `https://192.168.1.50/` di browser → halaman web muncul → login dengan akun dari
   `akun-awal.txt`.
3. **API perangkat tanpa kunci harus ditolak (403)**, dengan kunci harus diterima (200):

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://192.168.1.50/api/device/v1/ambang
```

```bash
curl -s -o /dev/null -w '%{http_code}\n' -H "X-API-KEY: vsf_KUNCI_SENSOR" http://192.168.1.50/api/device/v1/ambang
```

4. Nyalakan ESP32 sensor → data muncul di menu Sensor.
5. **Aktuator:** isi penampung dengan **air biasa**, lepas selang ke tanaman. Kirim DOSIS kecil dari web,
   ukur dengan gelas ukur, kalibrasi `ML_PER_DETIK` di firmware. Uji tombol **E-STOP** fisik dan dari web.
6. Baru setelah langkah 5 lulus: isi target EC/pH penampung, set `OTOMASI=1` dan `OTOMASI_PENAMPUNG=<id meja>`
   di `rahasia.env`, lalu `sudo systemctl restart vertonik-api`.

---

## 18. Perawatan sehari-hari

| Keperluan | Perintah [Pi] |
|---|---|
| Log API langsung | `sudo journalctl -u vertonik-api -f` |
| Restart API | `sudo systemctl restart vertonik-api` |
| Pemakaian CPU/RAM | `htop` (pasang: `sudo apt install htop`) |
| Suhu & throttling | `vcgencmd measure_temp` · `vcgencmd get_throttled` (harus `throttled=0x0`) |
| Ruang disk | `df -h` |
| Siapa diblokir fail2ban | `sudo fail2ban-client status sshd` |
| Ganti kunci ESP32 | ulangi langkah 11 (`--cabut-lama` mencabut kunci lama), flash ulang ESP32 |

### Memperbarui aplikasi

1. **[Mac]** ulangi langkah **7a** dan **7b** (build web + rsync).
2. **[Pi]** dependensi, migrasi, restart:

```bash
sudo -u vertonik env HOME=/opt/vertonik bash -c "cd /opt/vertonik/backend && npm ci --omit=dev --no-audit --no-fund"
```

```bash
sudo -u vertonik bash -c "set -a; . /etc/vertonik/rahasia.env; set +a; cd /opt/vertonik/backend && node scripts/migrate.js"
```

```bash
sudo systemctl restart vertonik-api
```

> Backup dulu (`sudo /usr/local/sbin/vertonik-backup`) sebelum memperbarui.

---

## 19. Masalah umum

| Gejala | Penyebab / solusi |
|---|---|
| `vertonik-api` gagal start, log: `JWT_SECRET tidak diatur` | isi `JWT_SECRET` di `rahasia.env` (langkah 9) |
| Log: `password authentication failed` | sandi di `DATABASE_URL` ≠ sandi role `vertonik`; samakan dengan `ALTER ROLE vertonik PASSWORD '…'` |
| Web kosong / 502 Bad Gateway | API mati → `journalctl -u vertonik-api -n 50` |
| `vertonik.local` tidak ketemu | pakai IP; ESP32 memang selalu pakai IP |
| ESP32 `kode -1` / timeout | client isolation di WiFi, IP Pi berubah, atau sinyal lemah (lihat `rssi`) |
| ESP32 dapat 403 | kunci salah/dicabut → buat ulang (langkah 11) |
| 429 Too Many Requests | pembatas laju; kurangi frekuensi kirim |
| Aktuator menolak semua perintah | E-STOP aktif; tanpa tombol fisik, jumper pin 13 ESP32 aktuator ke GND |
| Pi lambat / panas | `vcgencmd get_throttled` ≠ `0x0` → adaptor daya / pendingin |
