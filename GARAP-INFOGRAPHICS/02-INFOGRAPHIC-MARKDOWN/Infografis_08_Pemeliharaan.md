# Infografis 08 — Pemeliharaan Perangkat GARAP

| Item | Isi |
|---|---|
| **Judul** | Pemeliharaan Perangkat GARAP |
| **Subjudul** | Delapan pemeriksaan agar sensor, pompa, dan koneksi tetap andal — dan cara mencatatnya. |
| **Tujuan komunikasi** | Operator dan teknisi melakukan pemeriksaan rutin dengan pembagian tugas yang jelas dan hasil yang terdokumentasi. |
| **Target pembaca** | Operator, Teknisi |
| **Ukuran desain** | Poster panjang lebar **1200 px**, tinggi mengikuti isi (±2.100–3.050 px). Cetak: **A3 potret, 2 halaman** (lebar kanvas = lebar A3). Alternatif media sosial: carousel 1080 × 1350 px, satu seksi per slide. |
| **Preview HTML** | `03-HTML-PREVIEW/infographic-08.html` |

## 1. Struktur layout

Header → kotak info frekuensi → grid 4×2 kartu pemeriksaan (lencana Operator/Teknisi) → kartu standar kalibrasi (2 kolom) → langkah dokumentasi → peringatan → footer.

## 2. Urutan informasi

1. Frekuensi pemeriksaan
2. Apa yang diperiksa, oleh siapa
3. Nilai acuan di halaman Kalibrasi
4. Mencatat hasil pemeriksaan
5. Sebelum kalibrasi atau uji pompa

## 3. Konten final (siap salin ke Canva)

**Header (navy):** eyebrow `INFOGRAFIS 08 · GARAP · Vertonik Smart Farm`
**Judul:** Pemeliharaan Perangkat GARAP
**Subjudul:** Delapan pemeriksaan agar sensor, pompa, dan koneksi tetap andal — dan cara mencatatnya.
**Label pembaca:** Operator · Teknisi

> **ℹ️ Frekuensi pemeriksaan**
> - **Harian, pagi & sore (5–10 menit):** lampu pilot, level tandon di LCD, kebocoran selang — sesuai SOP operator.
> - Pemeriksaan lain: ikuti jadwal yang tercatat di menu **Kalibrasi** dan tab **Perawatan** (Target Nutrisi). Frekuensinya belum ditetapkan dalam SOP tervalidasi.

### 2. [Delapan pemeriksaan] Apa yang diperiksa, oleh siapa

- **Sensor** _(Operator)_ — Angka tampil & wajar di LCD/Dashboard. `pH --.--` / `EC ----` = lapor.  
  _ikon: activity.svg_
- **Kabel** _(Teknisi)_ — Tidak terkelupas, tidak tertarik, jauh dari genangan.  
  _ikon: cable.svg_
- **Konektor** _(Teknisi)_ — Terpasang kencang, tidak berkarat/berembun.  
  _ikon: plug.svg_
- **Panel (dari luar)** _(Operator)_ — Tutup rapat, lampu **hijau saja**, tidak ada bau hangus.  
  _ikon: layout-panel-top.svg_
- **Pompa** _(Teknisi)_ — Uji 1 per 1 dengan air bersih; laju dikalibrasi ulang bila berubah.  
  _ikon: waves.svg_
- **Kebocoran** _(Operator)_ — Selang pompa A, B, pH Up, pH Down, dan isi air kering.  
  _ikon: droplets.svg_
- **Koneksi** _(Operator)_ — Dashboard **Alat terhubung**; LCD bukan `WIFI MATI` / `TUNGGU SERVER...`.  
  _ikon: wifi.svg_
- **Dokumentasi** _(Operator & Teknisi)_ — Catat hasil di riwayat kalibrasi & lembar pemeriksaan.  
  _ikon: notebook-pen.svg_

### 3. [Standar kalibrasi] Nilai acuan di halaman Kalibrasi

- **EC — 2 titik** — Larutan standar **1.413 µS/cm** dan **12.880 µS/cm**. Bilas probe di antara titik.  
  _ikon: flask-conical.svg_
- **pH — 2 titik** — Buffer **pH 4,0** dan **pH 7,0**. Tunggu indikator stabil sebelum ambil titik.  
  _ikon: droplet.svg_
- **Laju pompa** — Jalankan **30 / 60 / 120 detik**, takar mL di gelas ukur, ulangi 3× (selisih ≤ 5%).  
  _ikon: timer.svg_

### 4. [Dokumentasi] Mencatat hasil pemeriksaan

1. **Isi lembar pemeriksaan** — Tanggal, nama pemeriksa, item, hasil Lulus/Gagal, paraf (format Lampiran Modul Juknas).
2. **Simpan di sistem** — Kalibrasi tersimpan otomatis di **Riwayat kalibrasi**; perubahan pengaturan tercatat di **Catatan Aktivitas**.
3. **Laporkan temuan** — Item gagal → laporkan ke teknisi/admin dengan foto & waktu kejadian.

> **⚠️ Sebelum kalibrasi atau uji pompa**
> - Aktifkan **mode pemeliharaan** di halaman Kalibrasi agar tindakan otomatis dijeda.
> - Gunakan **air bersih** dan arahkan selang ke **gelas ukur**, bukan ke tandon tanaman.
> - Matikan mode pemeliharaan setelah selesai.

**Footer (navy):** Sumber data · Modul Juknas Bab III.1 (checklist harian pagi & sore), Bab VI.1 (SOP kalibrasi), Lampiran (lembar commissioning); `react-web-app` halaman Kalibrasi & Target Nutrisi → Perawatan. — Versi 1.0 · 12 Nov 2026

## 4. Arahan ilustrasi

Ikon lucide per kartu: activity, cable, plug, layout-panel-top, waves, droplets, wifi, notebook-pen. Lencana hijau "Operator" dan lencana abu "Teknisi" di tiap kartu.

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

- Frekuensi yang **sudah** ditetapkan SOP: pemeriksaan fisik panel, tandon, dan kebocoran selang = **harian pagi & sore (5–10 menit)**.
- Frekuensi kalibrasi & pemeriksaan kabel/konektor **belum ditetapkan** di SOP; infografis mengarahkan ke jadwal di menu Kalibrasi dan tab Perawatan. Jangan menambahkan angka hari/minggu.
- Ikuti `01-DESIGN-SYSTEM/GARAP_Design_Reference.md`; ikon SVG ada di `04-ASSETS/icons/`.

## 8. Peringatan keselamatan

- Pemeriksaan kabel, konektor, dan isi panel hanya oleh teknisi dengan daya dimatikan.
- Uji pompa: air bersih ke gelas ukur, mode pemeliharaan aktif.
