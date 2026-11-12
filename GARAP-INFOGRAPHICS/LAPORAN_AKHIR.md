# Laporan Akhir — Seri Infografis GARAP

Tanggal: 12 November 2026 · Cakupan: audit, dokumentasi, desain infografis, HTML preview.
**Tidak ada perubahan** pada website, backend, database, firmware, konfigurasi Pi/MQTT, aplikasi Flutter, atau status keamanan dosing. Satu-satunya berkas di luar folder ini yang disentuh: entri `infografis` (server statis lokal) di `.claude/launch.json`.

## 1. Hasil

| Folder | Isi |
|---|---|
| `01-DESIGN-SYSTEM/` | `GARAP_Design_Reference.md` — palet HEX, tipografi, komponen, ikon, layout, aturan warna (semua dari kode sumber) |
| `02-INFOGRAPHIC-MARKDOWN/` | 10 berkas teks siap Canva (judul, subjudul, tujuan, pembaca, ukuran, layout, konten final, urutan, arahan ilustrasi, warna, tipografi, catatan, peringatan) |
| `03-HTML-PREVIEW/` | `index.html` + 10 halaman + `garap-infografis.css` (CSS lokal, font lokal, tombol Cetak/PDF) |
| `04-ASSETS/icons/` | 62 ikon SVG lucide (set ikon yang sama dengan website) |
| `04-ASSETS/illustrations/` | 4 diagram SVG mandiri (arsitektur, panel, siklus budidaya, dosing) |
| `04-ASSETS/screenshots/` | Login (baru, 12 Nov) + dashboard/sensor/tanam (28 Okt) |
| `04-ASSETS/fonts/` | Inter 400–700, Space Grotesk 500–700 (dari `@fontsource` di proyek) |
| `tools/` | Generator: konten di `tools/konten/NN.mjs` → Markdown + HTML + SVG. Ubah konten lalu jalankan `node GARAP-INFOGRAPHICS/tools/bangun.mjs` dari akar repo. |

Membuka preview: dari akar repo jalankan `python3 -m http.server 8765 --directory GARAP-INFOGRAPHICS` lalu buka `http://localhost:8765/03-HTML-PREVIEW/`. (Membuka berkas langsung via `file://` juga bisa di browser biasa.)

## 2. Ringkasan audit design system

- Warna utama: navy `#0A1F38`/`#071527` (chrome), forest `#2D452F`, moss `#6B9D4A`, mint `#CFE2CE`, emas `#E9CD53`, latar `#F4F7F2`, teks `#0B1A2B`/`#4F6075`, galat `#C0392B`, peringatan `#E0A42B`.
- Font: Space Grotesk (heading), Inter (body). Ikon: lucide outline stroke 2.
- Website **tidak memiliki warna "info" khusus** → infografis memakai navy + abu (tidak menambah warna).
- Material kaca (Liquid Glass v5) diterjemahkan menjadi kartu putih solid + border + shadow lembut untuk keperluan cetak.

## 3. Pemeriksaan kualitas

| Pemeriksaan | Hasil |
|---|---|
| Warna & font cocok dengan `tailwind.config.js` / `index.css` | Ya — token CSS disalin 1:1 |
| HTML di browser desktop (1300 px) | Diperiksa visual: 02, 03, 04, 06, 07 |
| Mobile 375 px | 11 halaman: tanpa scroll horizontal, font termuat, tidak ada galat konsol |
| Cetak (Chrome → PDF) | Semua 10 infografis = **2 halaman A3 potret**; shadow dimatikan saat cetak (sebelumnya menjadi blok abu-abu) |
| Validitas SVG | 4 diagram + ikon lolos `xmllint` |
| Akurasi teknis | Angka hanya dari kode/dokumen (lihat footer tiap infografis) |

Perbaikan yang dilakukan saat QC: label diagram 02 bertumpuk; diagram status 06 terlalu sempit (dirombak 2 baris); kode di footer navy tak terbaca; aturan responsif ikut aktif saat cetak (03 jadi 5 halaman → kini 2); judul seksi yatim di akhir halaman.

## 4. Keputusan & batasan yang perlu diketahui

1. **Dosing (Infografis 07):** `EKSEKUSI_DIIZINKAN = false` (`backend-nodejs/src/gerbangDosis.js:21`) ditampilkan sebagai peringatan merah di bagian atas; tahap eksekusi digambar terblokir.
2. **Alur persetujuan dosing & siklus budidaya Fase 3 hanya ada di API backend** — belum ada layarnya di website/Flutter. Infografis 06 dan 07 menyatakannya secara eksplisit; 06 juga menampilkan alur yang tersedia di website (Kebun Saya → Mulai semai baru → 4 tahap).
3. **Masa tunggu persetujuan** (`maks_masa_persetujuan_menit`) tidak punya nilai bawaan — tidak ada angka menit yang ditulis.
4. **Frekuensi pemeliharaan:** hanya "harian pagi & sore" (SOP Juknas) yang dicantumkan; frekuensi kalibrasi/kabel belum ditetapkan SOP sehingga diarahkan ke jadwal di menu Kalibrasi/Perawatan.
5. **Urutan menyalakan daya** belum ada di SOP tervalidasi → Infografis 04 menulis "ikuti arahan teknisi".
6. **Target pH/TDS tanaman** sengaja tidak dicantumkan (diatur di Ambang Sensor). Yang dicantumkan hanya batas kewajaran sensor dari `sanitySensor.js`, diberi label "bukan target".
7. **Screenshot:** login diambil ulang 12 Nov 2026 dari dev server lokal. Halaman setelah login **tidak** diambil ulang karena memerlukan akun; membuat akun uji berarti mengubah database (di luar batasan). Screenshot dashboard/sensor/tanam bertanggal 28 Okt 2026 masih memakai sidebar lama (navigasi kini rail grup + pil) — sudah diberi keterangan di caption.
8. **Skema panel (04)** adalah skema elemen, bukan tata letak fisik; belum ada foto panel di repo.
9. Kanvas: lebar tetap 1200 px, tinggi mengikuti isi (2.077–3.049 px), cetak 2 × A3. Bukan 1 halaman A3 karena isi akan terlalu kecil.

## 5. Saran tindak lanjut

- Ambil ulang screenshot dashboard, Sensor, dan Kebun Saya setelah login (akun demo) agar navigasi di gambar sesuai versi terbaru.
- Tambahkan foto panel IoT asli berlabel untuk Infografis 04.
- Setelah SOP menetapkan frekuensi pemeliharaan dan urutan daya, perbarui `tools/konten/04.mjs` dan `08.mjs`, lalu bangun ulang.
