# Infografis 06 — Alur Pengelolaan Tanaman

| Item | Isi |
|---|---|
| **Judul** | Alur Pengelolaan Tanaman |
| **Subjudul** | Dari memilih tanaman sampai konfirmasi tahap — di website hari ini dan di siklus budidaya backend. |
| **Tujuan komunikasi** | Pengelola memahami urutan mencatat tanaman dan titik-titik di mana sistem menunggu konfirmasi manusia. |
| **Target pembaca** | Pengelola greenhouse, Administrator, Operator |
| **Ukuran desain** | Poster panjang lebar **1200 px**, tinggi mengikuti isi (±2.100–3.050 px). Cetak: **A3 potret, 2 halaman** (lebar kanvas = lebar A3). Alternatif media sosial: carousel 1080 × 1350 px, satu seksi per slide. |
| **Preview HTML** | `03-HTML-PREVIEW/infographic-06.html` |

## 1. Struktur layout

Header → 7 langkah bernomor 2 kolom → diagram status siklus budidaya (8 kotak berurutan) → 2 kartu "Di website sekarang" vs "Di backend (API)" → info → footer.

## 2. Urutan informasi

1. Urutan pengelolaan satu siklus tanam
2. Bagaimana sistem mencatat kemajuan
3. Website sekarang vs backend
4. Sistem selalu menunggu jawaban manusia

## 3. Konten final (siap salin ke Canva)

**Header (navy):** eyebrow `INFOGRAFIS 06 · GARAP · Vertonik Smart Farm`
**Judul:** Alur Pengelolaan Tanaman
**Subjudul:** Dari memilih tanaman sampai konfirmasi tahap — di website hari ini dan di siklus budidaya backend.
**Label pembaca:** Pengelola greenhouse · Administrator · Operator

### 1. [Tujuh langkah] Urutan pengelolaan satu siklus tanam

1. **Pilih jenis tanaman** — Dari katalog **Jenis Tanaman**, lalu pilih meja tanam.
2. **Pilih preset atau manual** — Mode target **PRESET** (versi preset tervalidasi) atau **MANUAL** (isi target sendiri).
3. **Atur target nutrisi awal** — Target pH/TDS awal mengikuti preset atau isian manual. Tandon disiapkan sampai stabil.
4. **Masukkan jumlah bibit** — Bilangan bulat ≥ 1. Jumlah dikonfirmasi lagi setelah peremajaan.
5. **Lakukan monitoring** — Sistem menilai kestabilan tandon dari data sensor segar; operator memantau Dashboard.
6. **Evaluasi pertumbuhan** — Operator menjawab apakah bibit **SIAP** atau **BELUM SIAP**. Belum siap → dijadwalkan ulang.
7. **Konfirmasi tahapan** — Setiap perpindahan tahap dicatat (siapa, kapan, alasan) di Catatan Aktivitas.

### 2. [Status siklus] Bagaimana sistem mencatat kemajuan

**Diagram status (kotak berurutan):** DRAFT → TANK_PREPARATION → WAITING_TANK_CONFIRMATION → SEEDING → WAITING_REJUVENATION_CONFIRMATION → WAITING_SEED_COUNT_CONFIRMATION → GROWTH → COMPLETED.
Pemaju: user · system · user · user/system · user · user · user/system.
Catatan bawah: dari status mana pun (kecuali COMPLETED) pengguna dapat membatalkan → CANCELLED (alasan ≥ 5 karakter).

### 3. [Di mana dilakukan] Website sekarang vs backend

- **Kebun Saya → Mulai semai baru** _(Tersedia di website)_
  - Isi: tanaman, meja tanam, tanggal mulai semai, jumlah benih, keterangan.
  - Tahap: Semai → Peremajaan → Pendewasaan → Panen.
  - Admin menekan **Tandai Selesai** untuk memajukan batch.  
  _ikon: monitor.svg_
- **Siklus budidaya Fase 3** _(Backend / API saja)_
  - Mode target PRESET / MANUAL.
  - Persiapan & konfirmasi tandon, konfirmasi bibit, konfirmasi jumlah bibit.
  - Belum ada layar web/mobile.  
  _ikon: server.svg_

> **ℹ️ Sistem selalu menunggu jawaban manusia**
> Bibit tidak pernah dianggap siap tanpa jawaban pengguna, dan parameter yang belum diisi admin membuat langkah terkait ditolak — bukan diisi angka tebakan.


**Footer (navy):** Sumber data · `react-web-app/src/components/kebun/DialogMulaiSemai.tsx`, `backend-nodejs/src/siklusBudidaya.js` (status & mode PRESET/MANUAL), `backend-nodejs/src/kestabilan.js`, Modul Juknas Bab IV.4. — Versi 1.0 · 12 Nov 2026

## 4. Arahan ilustrasi

Ikon lucide: sprout, list-checks, flask-conical, hash, gauge, clipboard-check, circle-check. Diagram status berupa kotak berurutan dengan panah; nama status ditulis persis seperti di kode (huruf kapital).

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

- Alur 7 langkah mengikuti siklus budidaya di backend (Fase 3). **Layar web/mobile untuk alur ini belum tersedia**; di website saat ini dipakai dialog **Mulai semai baru** + 4 tahap (Semai → Peremajaan → Pendewasaan → Panen).
- Masa tunggu konfirmasi dan jadwal pengingat bergantung parameter yang wajib diisi admin; tanpa parameter, fitur tidak berjalan (tidak ada angka bawaan).
- Tidak ada langkah di alur ini yang menyalakan pompa.
- Ikuti `01-DESIGN-SYSTEM/GARAP_Design_Reference.md`; ikon SVG ada di `04-ASSETS/icons/`.

## 8. Peringatan keselamatan

- Siklus budidaya **tidak menyentuh pompa** sama sekali (komentar kode `siklusBudidaya.js`).
