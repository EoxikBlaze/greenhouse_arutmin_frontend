# Infografis 10 — Keselamatan Operasional

| Item | Isi |
|---|---|
| **Judul** | Keselamatan Operasional |
| **Subjudul** | Listrik dan air berada di ruang yang sama. Kenali batas kewenangan Anda. |
| **Tujuan komunikasi** | Mencegah kecelakaan listrik dan kerusakan alat di greenhouse yang lembap; menegaskan batas tugas operator. |
| **Target pembaca** | Operator, Teknisi, Pengelola greenhouse, Mitra |
| **Ukuran desain** | Poster panjang lebar **1200 px**, tinggi mengikuti isi (±2.100–3.050 px). Cetak: **A3 potret, 2 halaman** (lebar kanvas = lebar A3). Alternatif media sosial: carousel 1080 × 1350 px, satu seksi per slide. |
| **Preview HTML** | `03-HTML-PREVIEW/infographic-10.html` |

## 1. Struktur layout

Header → peringatan merah larangan utama → grid 3 kartu risiko → langkah saat terjadi gangguan → tabel batas kewenangan Operator vs Teknisi → kartu pengaman bawaan sistem → footer.

## 2. Urutan informasi

1. DILARANG menyentuh instalasi listrik dalam kondisi basah
2. Tiga sumber bahaya di greenhouse
3. Urutan tindakan darurat
4. Siapa boleh melakukan apa
5. Sistem juga menjaga Anda

## 3. Konten final (siap salin ke Canva)

**Header (navy):** eyebrow `INFOGRAFIS 10 · GARAP · Vertonik Smart Farm`
**Judul:** Keselamatan Operasional
**Subjudul:** Listrik dan air berada di ruang yang sama. Kenali batas kewenangan Anda.
**Label pembaca:** Operator · Teknisi · Pengelola greenhouse · Mitra

> **⛔ DILARANG menyentuh instalasi listrik dalam kondisi basah**
> - Tangan, kaki, atau lantai basah = jangan sentuh panel, stopkontak, atau kabel.
> - Jangan membuka panel listrik. Membuka panel hanya oleh teknisi dengan daya dimatikan.
> - Jangan menyemprot air di dekat panel dan Raspberry Pi.

### 2. [Kenali risikonya] Tiga sumber bahaya di greenhouse

- **Kelistrikan** — Panel memuat catu 12 V untuk lima pompa dan relay. Korsleting dapat melukai dan merusak alat.  
  _ikon: zap.svg_
- **Lingkungan lembap** — Embun, percikan, dan genangan dekat tandon membuat permukaan menghantarkan listrik.  
  _ikon: cloud-rain.svg_
- **Pemeriksaan panel** — Operator memeriksa **dari luar saja**: tutup rapat, lampu pilot, bau hangus, kebocoran di sekitar.  
  _ikon: layout-panel-top.svg_

### 3. [Saat terjadi gangguan] Urutan tindakan darurat

1. **Tekan E-STOP fisik** — Kebocoran, selang lepas, korsleting, atau pompa berjalan tidak wajar → tekan tombol merah. Tidak perlu menunggu website. [tombol: E-STOP]
2. **Menjauh dari area basah** — Jangan berdiri di genangan dekat panel. Jauhkan orang lain.
3. **Hubungi teknisi / admin** — Sampaikan apa yang terlihat: lampu, pesan LCD, lokasi bocor, waktu kejadian.
4. **Catat kejadian** — Admin menandai peringatan selesai **setelah** kondisi fisik diperiksa.

### 4. [Batas kewenangan] Siapa boleh melakukan apa

| Kegiatan | Operator | Teknisi |
|---|---|---|
| Memantau Dashboard, Peringatan, LCD, lampu pilot | Boleh | Boleh |
| Menekan E-STOP saat darurat | Boleh — wajib | Boleh |
| Menekan tombol RESET singkat (lihat IP) | Boleh | Boleh |
| Membuka panel, menyentuh kabel/relay/sekring | **Tidak boleh** | Boleh, daya dimatikan |
| Kalibrasi sensor & pompa, uji pompa | **Tidak boleh** | Boleh, mode pemeliharaan |
| Mengubah Saklar, Pengaturan Alat, firmware | **Tidak boleh** | Admin/teknisi berwenang |
| Mengaktifkan eksekusi dosing | **Tidak boleh** | **Tidak boleh** — diblokir di kode |

### 5. [Pengaman bawaan] Sistem juga menjaga Anda

- **E-STOP terbaca** — ESP32 membaca bus +12 V; E-STOP ditekan = semua aktuator dikunci.  
  _ikon: octagon-x.svg_
- **Detak server** — Tanpa detak server > **30 detik**, pompa berhenti otomatis.  
  _ikon: heart-pulse.svg_
- **Pelampung** — Isi air berhenti saat pelampung atas terangkat; kabel putus dianggap penuh.  
  _ikon: container.svg_
- **Batas mL** — Nutrisi AB maks **214 mL**/perintah & **450 mL**/jam; pH maks **10 mL**/perintah & **30 mL**/jam.  
  _ikon: shield-check.svg_

**Footer (navy):** Sumber data · Modul Juknas Bab I.2 (prinsip keselamatan), Bab V.1 (peringatan daya), Bab V.3 (batas pengaman firmware); `gabungan.ino` (E-STOP GPIO 36, fail-safe 30 dtk). — Versi 1.0 · 12 Nov 2026

## 4. Arahan ilustrasi

Ikon lucide: zap, cloud-rain, layout-panel-top, octagon-x, hand, shield-check. Tidak memakai gambar orang tersengat atau ilustrasi dramatis. Merah hanya untuk larangan.

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

- Infografis ini **tidak** memberi instruksi perbaikan kelistrikan kepada operator.
- Batas pengaman firmware dicantumkan sebagai informasi, bukan instruksi pengubahan.
- Ikuti `01-DESIGN-SYSTEM/GARAP_Design_Reference.md`; ikon SVG ada di `04-ASSETS/icons/`.

## 8. Peringatan keselamatan

- Dilarang menyentuh instalasi listrik dalam kondisi basah.
- E-STOP fisik adalah pemutus tertinggi.
- Pompa 12 V wajib lewat relay/MOSFET + dioda flyback, tidak dari pin ESP32 (urusan teknisi).
