# Menyambungkan CCTV EZVIZ H8C ke Website Vertonik

## Cara kerjanya

```
EZVIZ H8C ──RTSP (LAN)──▶ Raspberry Pi: backend + ffmpeg ──HTTPS + login──▶ Web / Aplikasi HP
             (H.264/H.265)    ambil 1 frame JPEG tiap N detik         GET /cctv/:id/gambar
```

- Browser **tidak** bisa memutar RTSP, dan H8C tidak punya URL gambar HTTP. Karena itu Pi yang mengambil
  satu frame (ffmpeg), mengecilkannya ke 1280 px, menyimpannya sebentar (cache), lalu menyajikannya ke web/HP.
- Sandi kamera (kode verifikasi) **hanya tersimpan di server**. Admin melihatnya sebagai `***`; petani & demo
  tidak menerima URL kamera sama sekali.
- HP tidak perlu satu WiFi dengan kamera — cukup bisa membuka website Pi.
- Banyak penonton sekaligus berbagi satu frame (cache ≥ 2 detik); maksimal 2 ffmpeg bersamaan agar Pi tetap ringan.

## Langkah pemasangan

### 1. Kamera di WiFi greenhouse
1. Pasang H8C lewat aplikasi **EZVIZ** di HP, sambungkan ke WiFi yang **sama dengan Raspberry Pi**
   (H8C memakai WiFi 2,4 GHz). Bila kamera punya port LAN, kabel lebih stabil.
2. Catat **kode verifikasi** 6 huruf kapital di stiker kamera — ini sandi RTSP (user: `admin`).
3. Di aplikasi EZVIZ, buka pengaturan kamera:
   - aktifkan **RTSP / layanan lokal (LAN)** bila ada opsinya (nama menu berbeda per versi firmware);
   - **matikan "Enkripsi Video / Image Encryption"** — bila aktif, aliran RTSP terenkripsi dan tidak bisa dibaca.
4. Beri kamera **IP tetap** (reservasi DHCP di router). Bila IP berubah, URL di website ikut salah.

### 2. Uji dari laptop dulu (VLC)
Laptop di WiFi yang sama → VLC → *Media → Open Network Stream*:

| Coba berurutan | Keterangan |
|---|---|
| `rtsp://admin:KODE@IP-KAMERA:554/ch1/main` | aliran utama (2K) |
| `rtsp://admin:KODE@IP-KAMERA:554/ch1/sub` | **aliran kecil — disarankan untuk website** (lebih ringan di Pi) |
| `rtsp://admin:KODE@IP-KAMERA:554/h264/ch1/main/av_stream` | format lama sebagian EZVIZ/Hikvision |

Bila **tidak ada yang jalan** di VLC, website juga tidak akan bisa — artinya firmware kamera ini tidak membuka RTSP lokal.
Pilihan saat itu: kamera lain yang mendukung RTSP/ONVIF, atau ESP32-CAM (tipe *snapshot/MJPEG*).

### 3. Tambahkan di website
Login sebagai **admin** → **CCTV** → **Tambah kamera**:

| Kolom | Isi |
|---|---|
| Nama | mis. `Greenhouse A — H8C` |
| Jenis tayangan | **RTSP lewat server (EZVIZ / kamera IP)** |
| URL kamera | URL yang berhasil di VLC (disarankan `/ch1/sub`) |
| Interval muat ulang | `5`–`10` detik |

Frame pertama butuh ±2–3 detik (sambung RTSP + menunggu keyframe); berikutnya diambil dari cache.
Saat mengubah kamera, biarkan `***` bila sandinya tidak berubah.

### 4. Uji langsung di Pi (bila website menampilkan "Kamera tidak merespons")
```bash
ffmpeg -rtsp_transport tcp -i 'rtsp://admin:KODE@IP-KAMERA:554/ch1/sub' -frames:v 1 /tmp/uji.jpg
```

| Pesan ffmpeg / gejala | Penyebab |
|---|---|
| `401 Unauthorized` | kode verifikasi salah |
| `Connection refused` / `timed out` | IP salah, kamera mati, RTSP belum aktif, atau beda jaringan / client isolation |
| `404 Not Found` | path salah — coba path lain dari tabel di atas |
| gambar hijau/rusak, error dekode | Enkripsi Video masih aktif |
| di website: "Server sedang mengambil gambar kamera lain" | > 2 kamera diminta bersamaan; muat ulang sebentar lagi |

Log server tidak pernah mencetak sandi kamera: `sudo journalctl -u vertonik-api | grep cctv`.

## Hasil uji (23 Okt 2026, tanpa kamera fisik)

Kamera tiruan: `mediamtx` + `ffmpeg` mengirim video 2560×1440 H.264, login `admin` + kode — meniru H8C.

| Uji | Hasil |
|---|---|
| Ambil frame via ffmpeg | 2,5 dtk · JPEG 1280×720 · ±40 KB |
| Kode salah | ditolak `401 Unauthorized` |
| `GET /cctv/:id/gambar` | 2,4 dtk pertama, **18 ms** dari cache |
| Web (Chrome) & aplikasi HP (iOS Simulator, login petani) | tampil **LIVE** |
| Tes otomatis | 5 tes baru (sandi tak bocor ke petani/demo, form `***` mempertahankan sandi, cache, kamera mati → 502 tanpa sandi, 401/404/409) |

Belum teruji: H8C sungguhan (menu RTSP, path, H.265) dan ffmpeg di dalam sandbox systemd Pi.

## Perlu access point sendiri di greenhouse?

**Saran: ya, satu router/AP khusus greenhouse** — terutama untuk *kendali*, bukan sekadar sinyal:

| Masalah bila numpang WiFi umum (Pokjar Permata) | Dengan AP/router sendiri |
|---|---|
| *Client isolation* bisa membuat ESP32 & kamera tidak bisa menghubungi Pi | Anda yang mengatur — perangkat saling terlihat |
| IP Pi & kamera bisa berubah; firmware ESP32 memakai `SERVER_IP` tetap | Reservasi DHCP untuk Pi, ESP32, kamera |
| Sinyal melemah di greenhouse (rangka logam, air, tanaman); antena ESP32 kecil | AP dekat/di dalam greenhouse |
| Bergantung pada perubahan sandi/kebijakan pengelola WiFi | Jaringan sendiri, tetap bisa uplink ke internet |

Susunan yang disarankan: **router/AP 2,4 GHz** (versi outdoor bila dipasang di dalam greenhouse yang lembap) →
**Pi pakai kabel LAN** ke router (paling stabil) → ESP32 & H8C lewat WiFi router itu → uplink internet dari
Pokjar Permata (kabel atau mode WISP/repeater) untuk instalasi, update, dan font web.

**Kapan tidak perlu:** bila di titik ESP32 dan kamera sinyalnya ≥ −67 dBm, `ping` antar-perangkat lancar
(tanpa client isolation), dan pengelola WiFi bersedia memberi IP tetap. Cara mengukur: aplikasi *WiFi analyzer*
di HP di titik pemasangan, lalu setelah ESP32 menyala lihat kolom `rssi` di `sudo bash /opt/vertonik/deploy-pi/status-server.sh`
(−67 dBm atau lebih baik = aman; di bawah −75 dBm = sering putus).
