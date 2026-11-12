# Infografis 01 — Mengenal GARAP – Smart Hidroponik

| Item | Isi |
|---|---|
| **Judul** | Mengenal GARAP – Smart Hidroponik |
| **Subjudul** | Satu sistem untuk memantau air nutrisi, mencatat siklus tanam, dan mengamankan pompa di greenhouse. |
| **Tujuan komunikasi** | Pembaca baru memahami apa itu GARAP, bagian-bagiannya, dan bagaimana website, aplikasi mobile, serta perangkat IoT saling terhubung. |
| **Target pembaca** | Operator, Pengelola greenhouse, Mitra |
| **Ukuran desain** | Poster panjang lebar **1200 px**, tinggi mengikuti isi (±2.100–3.050 px). Cetak: **A3 potret, 2 halaman** (lebar kanvas = lebar A3). Alternatif media sosial: carousel 1080 × 1350 px, satu seksi per slide. |
| **Preview HTML** | `03-HTML-PREVIEW/infographic-01.html` |

## 1. Struktur layout

Header navy → kartu "Apa itu GARAP" (2 kolom: definisi + tujuan) → alur 3 blok horizontal (Perangkat IoT → Server Lokal → Website & Mobile) → grid 4 kartu komponen → grid 3 kartu manfaat → kotak info status dosing → footer navy.

## 2. Urutan informasi

1. Platform hidroponik pintar untuk greenhouse
2. Dari tandon ke layar Anda
3. Empat bagian yang bekerja bersama
4. Yang Anda dapatkan
5. Status saat ini: dosing otomatis belum dijalankan

## 3. Konten final (siap salin ke Canva)

**Header (navy):** eyebrow `INFOGRAFIS 01 · GARAP · Vertonik Smart Farm`
**Judul:** Mengenal GARAP – Smart Hidroponik
**Subjudul:** Satu sistem untuk memantau air nutrisi, mencatat siklus tanam, dan mengamankan pompa di greenhouse.
**Label pembaca:** Operator · Pengelola greenhouse · Mitra

### 1. [Apa itu GARAP?] Platform hidroponik pintar untuk greenhouse

- **GARAP = Green Autonomous Responsive Agriculture Platform** — Sistem pemantauan, pencatatan budidaya, asisten agronomi lokal, dan pengendalian perangkat hidroponik berbasis IoT. Nama produk di layar: **Vertonik Smart Farm**.  
  _ikon: sprout.svg_
- **Tujuan sistem**
  - Kondisi air nutrisi terpantau setiap saat.
  - Siklus tanam 4 tahap tercatat rapi.
  - Pompa dilindungi pengaman berlapis.
  - Keputusan operator didukung data, bukan tebakan.  
  _ikon: target.svg_

### 2. [Gambaran umum] Dari tandon ke layar Anda

Data sensor naik ke server lokal, lalu tampil di website dan aplikasi. Perintah dari pengelola turun melalui jalur yang sama.

**Perangkat IoT** (ESP32 di panel membaca sensor tiap 5 detik dan mengendalikan pompa.) → **Server lokal** (Raspberry Pi menyimpan data, menjalankan backend, MQTT, dan Asisten AI.) → **Website & aplikasi mobile** (Operator memantau, mencatat tanam, dan menerima peringatan.)

### 3. [Komponen utama] Empat bagian yang bekerja bersama

- **Sensor** — pH, EC/TDS, suhu air, suhu & kelembapan udara, pelampung tandon.  
  _ikon: activity.svg_
- **Panel ESP32** — Firmware `gabungan-0.6`, LCD 20×4, lampu pilot, tombol E-STOP & RESET.  
  _ikon: cpu.svg_
- **Raspberry Pi** — Backend Node.js, PostgreSQL, broker Mosquitto, Nginx, Ollama.  
  _ikon: server.svg_
- **Website & Flutter** — Website React di browser dan aplikasi Android/iOS GARAP.  
  _ikon: monitor-smartphone.svg_

### 4. [Manfaat] Yang Anda dapatkan

- **Pantau tanpa menebak** — Angka sensor terbaru, batas aman, dan grafik riwayat di satu layar.  
  _ikon: gauge.svg_
- **Peringatan dini** — Kondisi di luar ambang dan gangguan alat muncul di menu Peringatan.  
  _ikon: bell.svg_
- **Aman berlapis** — E-STOP fisik, pelampung, batas mL, dan detak server 30 detik di firmware.  
  _ikon: shield-check.svg_

> **ℹ️ Status saat ini: dosing otomatis belum dijalankan**
> Sistem sudah memantau dan mencatat. Eksekusi dosis otomatis masih **diblokir** sampai parameter, rumus, kalibrasi, dan firmware tervalidasi (`EKSEKUSI_DIIZINKAN = false`).


**Footer (navy):** Sumber data · `docs/juknas-juknis/MODUL_JUKNAS_JUKNIS_VERTONIK_GARAP.md` (Bab I–II), `react-web-app/src/router.tsx`, `flutter_mobile_app/lib/config.dart`, `deploy-pi/firmware/gabungan/gabungan.ino`. — Versi 1.0 · 12 Nov 2026

## 4. Arahan ilustrasi

Gunakan ikon lucide (cpu, server, monitor-smartphone, sprout, droplet, shield-check). Tidak memakai ilustrasi kartun. Alur 3 blok cukup berupa kartu putih dengan lingkar ikon mint dan panah moss.

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

- Singkatan GARAP ditulis lengkap sekali: Green Autonomous Responsive Agriculture Platform.
- Jangan menulis "dosing otomatis berjalan" — eksekusi dosing masih diblokir.
- Lokasi mitra lapangan: Pokjar Permata (sesuai modul Juknas).
- Ikuti `01-DESIGN-SYSTEM/GARAP_Design_Reference.md`; ikon SVG ada di `04-ASSETS/icons/`.

## 8. Peringatan keselamatan

- Eksekusi dosing otomatis **belum diizinkan** (`EKSEKUSI_DIIZINKAN = false`). Tampilkan kotak info di bagian bawah.
