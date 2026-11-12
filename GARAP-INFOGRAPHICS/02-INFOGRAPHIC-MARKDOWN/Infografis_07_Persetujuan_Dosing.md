# Infografis 07 — Alur Persetujuan Dosing

| Item | Isi |
|---|---|
| **Judul** | Alur Persetujuan Dosing |
| **Subjudul** | Persetujuan operator BUKAN tombol menyalakan pompa. Eksekusi dosing masih diblokir. |
| **Tujuan komunikasi** | Semua pihak memahami perbedaan monitoring, rekomendasi, persetujuan, dan eksekusi — serta bahwa eksekusi belum diizinkan. |
| **Target pembaca** | Operator, Administrator, Pengelola greenhouse, Mitra |
| **Ukuran desain** | Poster panjang lebar **1200 px**, tinggi mengikuti isi (±2.100–3.050 px). Cetak: **A3 potret, 2 halaman** (lebar kanvas = lebar A3). Alternatif media sosial: carousel 1080 × 1350 px, satu seksi per slide. |
| **Preview HTML** | `03-HTML-PREVIEW/infographic-07.html` |

## 1. Struktur layout

Header → peringatan merah lebar penuh di atas → diagram 4 tahap + status siklus dosing → 6 langkah bernomor → kartu prasyarat pembukaan blokir → footer.

## 2. Urutan informasi

1. EKSEKUSI DOSING BELUM DIIZINKAN
2. Monitoring ≠ Rekomendasi ≠ Persetujuan ≠ Eksekusi
3. Apa yang terjadi, langkah demi langkah
4. Arti setiap hasil
5. Yang harus tervalidasi lebih dulu

## 3. Konten final (siap salin ke Canva)

**Header (navy):** eyebrow `INFOGRAFIS 07 · GARAP · Vertonik Smart Farm`
**Judul:** Alur Persetujuan Dosing
**Subjudul:** Persetujuan operator BUKAN tombol menyalakan pompa. Eksekusi dosing masih diblokir.
**Label pembaca:** Operator · Administrator · Pengelola greenhouse · Mitra

> **⛔ EKSEKUSI DOSING BELUM DIIZINKAN**
> Status kode: `EKSEKUSI_DIIZINKAN = false`. Walaupun operator menyetujui, gerbang dosis selalu menolak eksekusi (balasan `423 eksekusi_diblokir`). Tidak ada perintah DOSIS yang dikirim ke pompa.


### 2. [Empat tahap] Monitoring ≠ Rekomendasi ≠ Persetujuan ≠ Eksekusi

**Baris atas (4 kotak):** 1 Monitoring (mint) → 2 Rekomendasi (mint) → 3 Persetujuan (mint) ✕→ 4 Eksekusi pompa **DIBLOKIR** (merah, `EKSEKUSI_DIIZINKAN = false`).
**Baris bawah (status backend):** WAITING_APPROVAL → APPROVED → GERBANG DOSIS (menolak: 423 diblokir) ⇢ RUNNING → MIXING → VERIFYING (abu-abu, nonaktif).
Akhir lain: REJECTED · EXPIRED · CANCELLED · FAULT.

### 3. [Urutan persetujuan] Apa yang terjadi, langkah demi langkah

1. **Pengaturan target nutrisi** — Target berasal dari preset tervalidasi atau target manual pada siklus budidaya. Batas operasi wajib diisi admin.
2. **Pengumpulan data** — Sensor harus segar (≤ 120 detik) dan wajar. 3 bacaan mustahil berturut → penampung wajib dikunci.
3. **Evaluasi sistem** — Gerbang dosis memeriksa: preset tervalidasi, batas operasi terisi, sensor segar & lengkap & wajar, nilai di dalam batas operasi.
4. **Konfirmasi kondisi bibit** — Dosing hanya bisa diajukan saat siklus budidaya aktif (persiapan tandon s.d. tumbuh). Kondisi bibit SIAP / BELUM SIAP selalu dijawab pengguna, tidak pernah diasumsikan sistem.
5. **Permintaan konfirmasi operator** — Siklus dosing berstatus **WAITING_APPROVAL**. Operator yang ditugaskan di meja itu menyetujui atau menolak.
6. **Masa tunggu konfirmasi** — Tidak dijawab sebelum batas waktu → **EXPIRED**. Batas waktu diisi admin; tanpa nilai, operasi ditolak.

### 4. [Status persetujuan] Arti setiap hasil

- **Disetujui** _(APPROVED)_ — Cakupan dibekukan. **Pompa tetap tidak berjalan** karena gerbang menolak.
- **Ditolak** _(REJECTED)_ — Siklus dosing berakhir. Tidak ada tindakan.
- **Kedaluwarsa** _(EXPIRED)_ — Tidak dijawab sebelum batas masa persetujuan.
- **Gangguan** _(FAULT)_ — Mis. 4 percobaan gagal berturut → penampung dikunci.

### 5. [Syarat membuka blokir] Yang harus tervalidasi lebih dulu

- **Parameter** — Batas operasi & konfigurasi dosis berstatus SIAP.  
  _ikon: sliders-horizontal.svg_
- **Rumus** — Perhitungan dosis tervalidasi.  
  _ikon: sigma.svg_
- **Kalibrasi** — Sensor & laju pompa terkalibrasi.  
  _ikon: gauge.svg_
- **Firmware** — Firmware tervalidasi di lapangan.  
  _ikon: cpu.svg_

**Footer (navy):** Sumber data · `backend-nodejs/src/gerbangDosis.js:21` (`EKSEKUSI_DIIZINKAN = false`), `backend-nodejs/src/dosingSiklus.js` (status & jalur), `backend-nodejs/src/siklusBudidaya.js` (konfirmasi bibit), `react-web-app/src/components/analitik/KartuSaranDosis.tsx`, `docs/STATUS_PROYEK_REVIEW.md`. — Versi 1.0 · 12 Nov 2026

## 4. Arahan ilustrasi

Kotak tahap 1–3 mint (berjalan), tahap 4 merah dengan tanda silang (diblokir). Status RUNNING–VERIFYING abu-abu redup dan panah putus-putus merah: jalur ada di desain tetapi tidak aktif. Ikon gembok untuk gerbang.

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

- **Jangan** menggambar panah utuh dari "Persetujuan" ke "Pompa menyala".
- Masa tunggu persetujuan = parameter `maks_masa_persetujuan_menit`. Nilainya wajib diisi admin; jika kosong, operasi ditolak. **Tidak ada angka bawaan** — jangan menulis angka menit.
- Layar web/mobile untuk mengajukan/menyetujui siklus dosing belum ada; alur ini berjalan lewat API backend.
- Satu-satunya perintah aktuator di modul persetujuan adalah STOP saat siklus berjalan dicabut.
- Ikuti `01-DESIGN-SYSTEM/GARAP_Design_Reference.md`; ikon SVG ada di `04-ASSETS/icons/`.

## 8. Peringatan keselamatan

- **Eksekusi dosing GARAP diblokir:** `EKSEKUSI_DIIZINKAN = false`. Persetujuan tidak menjalankan pompa.
- Membuka blokir memerlukan perubahan kode + review setelah parameter, rumus, kalibrasi, dan firmware tervalidasi.
- Uji pompa hanya dengan air bersih ke gelas ukur, oleh teknisi, dalam mode pemeliharaan.
