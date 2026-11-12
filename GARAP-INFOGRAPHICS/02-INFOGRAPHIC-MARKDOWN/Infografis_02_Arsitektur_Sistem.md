# Infografis 02 — Arsitektur Sistem GARAP

| Item | Isi |
|---|---|
| **Judul** | Arsitektur Sistem GARAP |
| **Subjudul** | Siapa berbicara dengan siapa, lewat jalur apa — sesuai konfigurasi yang terpasang. |
| **Tujuan komunikasi** | Teknisi dan admin memahami jalur komunikasi antar komponen untuk instalasi, diagnosis, dan pengembangan. |
| **Target pembaca** | Teknisi, Administrator, Mitra teknis |
| **Ukuran desain** | Poster panjang lebar **1200 px**, tinggi mengikuti isi (±2.100–3.050 px). Cetak: **A3 potret, 2 halaman** (lebar kanvas = lebar A3). Alternatif media sosial: carousel 1080 × 1350 px, satu seksi per slide. |
| **Preview HTML** | `03-HTML-PREVIEW/infographic-02.html` |

## 1. Struktur layout

Header navy → diagram 3 zona lebar penuh (Lapangan | Raspberry Pi navy | Pengguna) → tabel topik MQTT → 2 kartu port & alamat → kotak info → footer.

## 2. Urutan informasi

1. Tiga zona, satu pusat data
2. Topik yang dipakai ESP32 dan server
3. Yang perlu diingat teknisi
4. Website dan aplikasi tidak pernah langsung ke ESP32

## 3. Konten final (siap salin ke Canva)

**Header (navy):** eyebrow `INFOGRAFIS 02 · GARAP · Vertonik Smart Farm`
**Judul:** Arsitektur Sistem GARAP
**Subjudul:** Siapa berbicara dengan siapa, lewat jalur apa — sesuai konfigurasi yang terpasang.
**Label pembaca:** Teknisi · Administrator · Mitra teknis

### 1. [Peta komunikasi] Tiga zona, satu pusat data

**Diagram (gambar ulang di Canva sebagai blok + panah):**
- Sensor → ESP32: I2C · OneWire · GPIO
- ESP32 → Aktuator: GPIO → relay 12 V
- ESP32 ⇄ Mosquitto (Pi): MQTT port 1883
- ESP32 ⇢ Nginx: HTTP POST cadangan `/api/device/v1/sensor` (sensor saja, garis putus)
- Mosquitto ⇄ Backend Node.js: jembatan MQTT
- Backend ⇄ PostgreSQL: SQL
- Backend → Ollama: tanya AI (port 11434)
- Nginx → Backend: proxy ke port 8000
- Website React ⇄ Nginx: HTTP/HTTPS
- Aplikasi Flutter ⇄ Nginx: REST API

### 2. [Kontrak MQTT] Topik yang dipakai ESP32 dan server

| Topik | Arah | Isi |
|---|---|---|
| `garap/<kode>/data` | ESP32 → server | Bacaan sensor (format sama dengan HTTP POST). |
| `garap/<kode>/status` | ESP32 → server | Online, versi firmware, sinyal, uptime, E-STOP (retained). |
| `garap/<kode>/perintah` | server → ESP32 | Perintah aktuator (QoS 1). |
| `garap/<kode>/hasil` | ESP32 → server | Hasil perintah; diulang sampai ada `ack`. |
| `garap/<kode>/ack` | server → ESP32 | Tanda hasil sudah diterima. |
| `garap/server/status` | server → semua | Detak server tiap 5 detik. Hilang > 30 detik = pompa berhenti. |

### 3. [Alamat & port] Yang perlu diingat teknisi

- **Di dalam Raspberry Pi**
  - Nginx `80` / `443`
  - Backend `8000` (hanya lewat Nginx)
  - Mosquitto `1883`
  - Ollama `11434` (lokal)  
  _ikon: network.svg_
- **Dari jaringan greenhouse**
  - `http://vertonik.local` atau `http://<IP-Pi>`
  - Hotspot Pi `Vertoniksmartfarm`: `http://10.42.0.1`
  - ESP32 hanya Wi-Fi **2,4 GHz**
  - Kode alat lapangan: `aktuator-01`  
  _ikon: wifi.svg_

> **ℹ️ Website dan aplikasi tidak pernah langsung ke ESP32**
> Semua perintah melewati backend di Raspberry Pi, dicatat di Catatan Aktivitas, dan diperiksa aturan keselamatan sebelum dikirim.


**Footer (navy):** Sumber data · `backend-nodejs/src/mqttJembatan.js` (topik MQTT), `deploy-pi/nginx/vertonik.conf`, `backend-nodejs/src/config.js`, `flutter_mobile_app/lib/config.dart`, `deploy-pi/firmware/gabungan/gabungan.ino`, Modul Juknas Bab II & V. — Versi 1.0 · 12 Nov 2026

## 4. Arahan ilustrasi

Diagram blok, bukan gambar realistis. Zona Raspberry Pi berlatar navy agar jelas sebagai pusat. Panah forest `#2D452F`; panah dua arah untuk MQTT, SQL, dan pengguna↔Nginx; garis putus-putus untuk HTTP cadangan dari ESP32. Label protokol hanya yang terverifikasi di kode.

## 5. Warna yang digunakan

- Header & footer: navy `#0A1F38` → `#071527`; eyebrow emas `#E9CD53`.
- Latar isi: `#F4F7F2`; kartu putih `#FFFFFF`, border `#E2E8DD`, radius 20 px.
- Lingkar ikon: mint `#CFE2CE` + ikon forest `#2D452F`; nomor langkah forest `#2D452F`.
- Teks: tinta `#0B1A2B`, sekunder abu `#4F6075`.
- Status: sukses moss `#6B9D4A`, peringatan amber `#E0A42B`, bahaya merah `#C0392B`.

## 6. Tipografi

- Judul: Space Grotesk Bold 56 px (cetak A3 ±40 pt), putih.
- Subjudul: Inter Regular 22 px, putih 78%.
- Judul seksi: Space Grotesk Bold 28 px; eyebrow Inter Bold 13 px kapital, spasi huruf 14%.
- Judul kartu: Space Grotesk/Inter SemiBold 19 px; isi Inter 15–16 px abu `#4F6075`.
- Kode/topik: monospace 14 px dalam kotak `#F4F7F2`.

## 7. Catatan desain

- Website & aplikasi **tidak** berbicara langsung ke ESP32 — selalu lewat Raspberry Pi.
- Jalur HTTP cadangan hanya mengirim data sensor; pompa tetap terkunci tanpa detak MQTT.
- Alamat bawaan aplikasi Flutter: `http://vertonik.local`.
- Ikuti `01-DESIGN-SYSTEM/GARAP_Design_Reference.md`; ikon SVG ada di `04-ASSETS/icons/`.

## 8. Peringatan keselamatan

- Perintah pompa hanya lewat MQTT (`garap/<kode>/perintah`) dan firmware menghentikan pompa bila detak `garap/server/status` hilang > 30 detik.
