# Infografis 04 — Pengoperasian Perangkat IoT

| Item | Isi |
|---|---|
| **Judul** | Pengoperasian Perangkat IoT |
| **Subjudul** | Memeriksa panel ESP32 dan memastikan data sampai ke sistem — langkah demi langkah. |
| **Tujuan komunikasi** | Operator dapat memeriksa panel, menyalakan, dan memastikan perangkat terhubung tanpa membuka panel listrik. |
| **Target pembaca** | Operator, Teknisi |
| **Ukuran desain** | Poster panjang lebar **1200 px**, tinggi mengikuti isi (±2.100–3.050 px). Cetak: **A3 potret, 2 halaman** (lebar kanvas = lebar A3). Alternatif media sosial: carousel 1080 × 1350 px, satu seksi per slide. |
| **Preview HTML** | `03-HTML-PREVIEW/infographic-04.html` |

## 1. Struktur layout

Header → skema panel lebar penuh (LCD, 3 lampu pilot, E-STOP, RESET) → 8 langkah bernomor 2 kolom → tabel arti lampu pilot → tabel pesan LCD baris ke-4 → peringatan bahaya → footer.

## 2. Urutan informasi

1. Empat hal yang Anda lihat di panel
2. Delapan langkah pemeriksaan
3. Arti warna lampu
4. Pesan baris ke-4
5. Dalam keadaan darurat, tekan E-STOP fisik dulu

## 3. Konten final (siap salin ke Canva)

**Header (navy):** eyebrow `INFOGRAFIS 04 · GARAP · Vertonik Smart Farm`
**Judul:** Pengoperasian Perangkat IoT
**Subjudul:** Memeriksa panel ESP32 dan memastikan data sampai ke sistem — langkah demi langkah.
**Label pembaca:** Operator · Teknisi

### 1. [Kenali panel] Empat hal yang Anda lihat di panel

**Skema panel (gambar sederhana):** LCD 20×4 (baris ke-4 = pesan status) · 3 lampu pilot Merah/Hijau/Biru · tombol jamur merah **E-STOP** (memutus bus +12 V pompa) · tombol **RESET** (tekan singkat = info Wi-Fi/IP/Server 4 detik di LCD). Label: "skema, bukan tata letak fisik".

### 2. [Prosedur] Delapan langkah pemeriksaan

1. **Kenali perangkat** — Panel berisi ESP32 `gabungan-0.6`, sensor pH/EC/suhu/kelembapan, pelampung, dan 5 pompa 12 V.
2. **Periksa panel dari luar** — Tutup panel rapat, tidak ada bau hangus, selang pompa tidak bocor, lantai sekitar kering.
3. **Periksa sumber listrik** — Lihat dari luar: steker terpasang dan stopkontak tidak basah. Jangan membuka panel.
4. **Nyalakan sesuai SOP** — Nyalakan Raspberry Pi dan panel sesuai arahan teknisi. Urutan daya rinci belum ditetapkan di SOP tervalidasi.
5. **Pastikan koneksi** — LCD baris ke-4 berubah dari `WIFI MATI` / `TUNGGU SERVER...` ke `PENAMPUNG CUKUP`. Lampu **hijau saja**.
6. **Periksa sensor** — Angka tampil di LCD. Bila tampil `pH --.--` atau `EC ----`, probe tidak terbaca — lapor teknisi.
7. **Pastikan data diterima sistem** — Di Dashboard status **Alat terhubung** dan "bacaan terakhir" baru (data dikirim tiap 5 detik).
8. **Periksa indikator** — Cocokkan warna lampu pilot dengan tabel di bawah. Tekan **RESET** singkat untuk melihat IP server.

### 3. [Lampu pilot] Arti warna lampu

| Lampu | Arti | Yang dilakukan operator |
|---|---|---|
| Hijau saja | Normal: Wi-Fi & MQTT terhubung, air penampung cukup. | Lanjutkan pemantauan. |
| Merah + Hijau | Peringatan: air penampung kurang, atau detak server/MQTT terputus. | Cek level tandon & Dashboard. Lapor teknisi bila tidak pulih. |
| Merah saja | DARURAT: E-STOP aktif. Semua pompa dimatikan & dikunci. | Cari penyebab (bocor, selang lepas). Panggil teknisi/admin. |
| Biru menyala | Salah satu pompa sedang bekerja (isi air, uji pompa). | Jangan cabut selang. Tunggu sampai padam. |

### 4. [Layar LCD] Pesan baris ke-4

| Pesan | Arti |
|---|---|
| `PENAMPUNG CUKUP` / `PENUH` / `KURANG` | Level air tandon dari pelampung bawah & atas. |
| `E-STOP AKTIF!` | Prioritas tertinggi — pompa terkunci. |
| `WIFI MATI` | ESP32 gagal tersambung ke Wi-Fi 2,4 GHz. |
| `TUNGGU SERVER...` | Wi-Fi tersambung, menunggu broker MQTT / detak server. |
| `HTTP SENSOR ONLY` | Port MQTT 1883 terblokir; data sensor lewat HTTP, **pompa terkunci aman**. |
| `MENGISI AIR...`, `DOSING A...`, `pH UP...` | Pompa terkait sedang aktif. |

> **⛔ Dalam keadaan darurat, tekan E-STOP fisik dulu**
> - Kebocoran, selang lepas, korsleting, atau pompa berjalan tidak wajar → tekan tombol merah **E-STOP**.
> - Tidak perlu menunggu website.
> - Operator tidak membuka panel; hubungi teknisi.

**Footer (navy):** Sumber data · `deploy-pi/firmware/gabungan/gabungan.ino` (`gabungan-0.6`: pin, interval 5 dtk, E-STOP GPIO 36), Modul Juknas Bab V (lampu pilot, pesan LCD) & Bab VI (uji 8 tahap). — Versi 1.0 · 12 Nov 2026

## 4. Arahan ilustrasi

Skema panel memakai bentuk sederhana: persegi navy untuk LCD, lingkaran warna untuk lampu, tombol jamur merah untuk E-STOP. Beri label "skema, bukan tata letak fisik" — posisi aktual di panel belum didokumentasikan dengan foto. Bila foto panel tersedia, ganti skema dengan foto berlabel.

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

- Langkah 4 sengaja tidak memberi urutan menyalakan daya rinci: urutan daya belum ditetapkan di SOP tervalidasi. Ikuti teknisi.
- Kode warna lampu dari Modul Juknas tabel 5.2.
- Biru `#2F6FB5` hanya dipakai untuk menggambar lampu pilot biru (warna benda), bukan warna UI.
- Ikuti `01-DESIGN-SYSTEM/GARAP_Design_Reference.md`; ikon SVG ada di `04-ASSETS/icons/`.

## 8. Peringatan keselamatan

- Operator **tidak membuka** panel listrik. Pemeriksaan kabel, sekring, dan relay = tugas teknisi.
- Lampu **merah saja** = E-STOP aktif: semua pompa terkunci. Jangan memaksa pompa menyala.
- Jangan menyentuh panel dengan tangan basah.
