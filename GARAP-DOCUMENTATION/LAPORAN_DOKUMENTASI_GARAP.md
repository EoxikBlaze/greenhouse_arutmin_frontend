# Laporan Dokumentasi GARAP – Smart Hidroponik

| Atribut | Isi |
|---|---|
| Nomor | GARAP-DOK-99 |
| Versi | 1.0 |
| Tanggal | 12 November 2026 |
| Lingkup | Audit repository dan penyusunan dokumentasi operasional |
| Status keselamatan | **Dosing BELUM DIIZINKAN** — `EKSEKUSI_DIIZINKAN = false` (diperiksa ulang setelah commit terakhir) |

## 1. Dokumen yang berhasil dibuat

| No | Berkas | Kode | Isi |
|---|---|---|---|
| 1 | `00-INVENTARISASI/Laporan_Inventarisasi_Audit.md` | GARAP-DOK-00 | Struktur repo, inventaris komponen, pemetaan status fitur (5 kategori), perbedaan dokumen lama vs kode |
| 2 | `01-PEDOMAN-RESMI/Juknas_Sistem_GARAP.md` | GARAP-JUKNAS-01 | 14 bab: identitas, latar belakang s.d. lampiran; arsitektur, cara kerja, tanggung jawab, keselamatan, syarat aktivasi dosing |
| 3 | `01-PEDOMAN-RESMI/Juknis_Pengoperasian_Website.md` | GARAP-JUKNIS-01 | 19 bagian, 17 tangkapan layar asli |
| 4 | `01-PEDOMAN-RESMI/Juknis_Pengoperasian_IoT.md` | GARAP-JUKNIS-02 | 15 bab dari pengenalan s.d. pemeliharaan; pin, topik MQTT, batas pengaman diambil dari firmware/konfigurasi |
| 5 | `01-PEDOMAN-RESMI/Juknis_Instalasi_dan_Konfigurasi.md` | GARAP-JUKNIS-03 | Instalasi Pi, MQTT, backend, flash firmware (khusus teknisi) |
| 6 | `01-PEDOMAN-RESMI/SOP_Pengoperasian_Sistem.md` | GARAP-SOP-01 | 7 SOP + 4 lampiran formulir; alur siklus & dosing dengan diagram Mermaid |
| 7 | `01-PEDOMAN-RESMI/SOP_Pemeliharaan_dan_Penanganan_Gangguan.md` | GARAP-SOP-02 | 8 SOP + 3 lampiran: pemeliharaan, probe, kalibrasi, cadangan, koneksi, sensor, pompa, listrik |
| 8 | `04-REFERENSI/Arsitektur_Sistem.md` | GARAP-REF-01 | Lapisan, aliran data, aliran perintah, lapisan pengaman, model data |
| 9 | `04-REFERENSI/Daftar_Komponen.md` | GARAP-REF-02 | 24 komponen panel + server + perangkat lunak dengan status verifikasi |
| 10 | `04-REFERENSI/Glosarium.md` | GARAP-REF-03 | 60 istilah |
| 11 | `04-REFERENSI/Daftar_Verifikasi_Dokumentasi.md` | GARAP-REF-04 | Lembar verifikasi manusia sebelum pengesahan |
| 12 | `README.md`, laporan ini | — | Navigasi dan laporan |

## 2. Poster yang berhasil dibuat

| Kode | Naskah (.md) | Ukuran | Contoh HTML | PDF |
|---|---|---|---|---|
| PST-01 | `Poster_Pengoperasian_Website.md` | A3 portrait | `html/Poster_Website.html` | `pdf/Poster_Website.pdf` |
| PST-02 | `Poster_Pengoperasian_IoT.md` | A3 portrait | `html/Poster_IoT.html` | `pdf/Poster_IoT.pdf` |
| PST-03 | `Poster_Alur_Monitoring.md` | A3 landscape | `html/Poster_Monitoring.html` | `pdf/Poster_Monitoring.pdf` |
| PST-04 | `Poster_Alur_Dosing.md` | A3 landscape | `html/Poster_Dosing.html` | `pdf/Poster_Dosing.pdf` |
| PST-05 | `Poster_Checklist_Perangkat.md` | A4 portrait | `html/Poster_Checklist.html` | `pdf/Poster_Checklist.pdf` |
| PST-06 | `Poster_Troubleshooting.md` | A4 portrait | `html/Poster_Troubleshooting.html` | `pdf/Poster_Troubleshooting.pdf` |

Semua poster memuat judul, subjudul, ikon/ilustrasi vektor, langkah bernomor, keterangan penting, peringatan keselamatan (pita K3), dan footer identitas GARAP dengan status dosing.

## 3. File HTML yang berhasil dibuat

| Berkas | Keterangan |
|---|---|
| `02-POSTER-PANDUAN/html/*.html` (6) | Berdiri sendiri (CSS/JS/ikon/gambar tertanam), tanpa backend, ukuran mm, `@page`, `@media print`, skala otomatis untuk layar kecil |
| `03-VISUAL-PREVIEW/Preview_Dokumen.html` | Semua Markdown dirender, galeri poster, Mermaid lokal (`assets/js/mermaid.min.js` v10.9.1), mode gelap, tata letak ponsel |

## 4. Hasil audit source code (ringkas)

- Web React 19 (26 halaman), mobile Flutter (16 halaman), backend Node/Express/PostgreSQL/MQTT (repo terpisah), firmware ESP32 `gabungan-0.6`, konfigurasi Pi (Mosquitto, systemd, nginx, Ollama).
- Firmware aktif memakai **ADS1115 + SHT31**, bukan DHT22; **tidak ada solenoid valve** di firmware aktif.
- Alur siklus budidaya bertahap (konfirmasi tandon, peremajaan H+4/96 jam, batas jawab 24 jam, jumlah benih) dan alur persetujuan dosing **ada di backend tetapi belum ada antarmukanya**; penjadwal mati secara bawaan.
- Eksekusi dosing diblokir di dua lapis: gerbang `EKSEKUSI_DIIZINKAN = false` dan daftar-izin pengiriman perintah yang tidak memuat `DOSIS`.
- Selama penyusunan, sesi kerja lain di folder yang sama meng-commit firmware v0.6 (`ec04293`), perubahan web kalibrasi (`565c905`), draf awal folder dokumentasi ini (`75dc70f`, 21:24), dan backend `0383c55` (kirim uji pompa, laju pompa, kalibrasi pH ke alat). Dokumen sudah diselaraskan dengan commit tersebut.

Rincian: `00-INVENTARISASI/Laporan_Inventarisasi_Audit.md`.

## 5. Fitur yang berhasil didokumentasikan

Login/logout, peran, Dashboard, Sensor + unduh laporan, Peringatan + notifikasi mobile, Kebun Saya (mulai semai, jumlah benih), tahap Semai–Panen (konfirmasi jumlah berhasil), Target Nutrisi (target naik harian, target penampung dari preset/manual, parameter, keamanan, perawatan), Saklar, Kalibrasi, Data, Laporan + ekspor CSV, Catatan Aktivitas, Master Data (tanaman, meja/penampung, ambang), Pengaturan Alat, Pemulihan Papan, Koneksi Alat, Manajemen User, Akun Saya, CCTV, Asisten AI, tombol STOP, seluruh prosedur perangkat (nyala, jaringan, MQTT, sensor, aktuator, matikan, restart, troubleshooting), dan alur siklus/dosing sebagai rujukan berstatus belum aktif.

## 6. Fitur yang belum dapat didokumentasikan sebagai prosedur operator

| Fitur | Alasan |
|---|---|
| Konfirmasi tandon, konfirmasi peremajaan H+4, konfirmasi jumlah benih (siklus baru) | Belum ada antarmuka; hanya didokumentasikan sebagai alur rujukan |
| Persetujuan dosing | Belum ada antarmuka |
| Eksekusi dosing | **BELUM DIIZINKAN** |
| Kontrol air (isi/stop/mode) | Nonaktif (503) |
| Pengelolaan template preset | Komponen ada tetapi tidak dipasang di halaman |
| Kalibrasi EC ke alat, pemulihan papan ke alat | Belum dikirim ke ESP32 |
| Screenshot aplikasi mobile | Tidak diambil (perlu emulator/perangkat); hanya tampilan web ponsel |

## 7. Informasi yang membutuhkan verifikasi manusia

Daftar lengkap ada di `04-REFERENSI/Daftar_Verifikasi_Dokumentasi.md`. Yang terpenting:

1. Kapasitas tandon: 3.000 L (ketetapan) vs 250 L (data pengembangan).
2. Model probe pH/EC, kapasitas catu daya 12 V, debit pompa nyata, keberadaan solenoid valve.
3. IP tetap Raspberry Pi dan alamat website untuk operator.
4. Firmware yang benar-benar ter-flash di papan lapangan.
5. Ambang kelembapan (data pengembangan berisi 100–100 %).
6. Takaran nutrisi manual resmi (SOP-01 SOP 5 sengaja tidak menetapkan angka).
7. Parameter yang belum diputuskan: `konfirmasi_tandon_jam`, `pengingat_konfirmasi_jam`, `ulang_konfirmasi_jam`.
8. Ketersediaan APAR, UPS/genset; nama pengesah dokumen.

## 8. Hasil pengujian HTML

| Uji | Alat | Hasil |
|---|---|---|
| Isi poster muat di kertas (tidak terpotong) | Playwright, Chromium | 6/6 lulus setelah perbaikan. Skala huruf akhir: Website 0,93 · IoT 0,92 · Monitoring 0,95 · Dosing 0,88 · Checklist 0,91 · Troubleshooting 0,92 (batas bawah 0,80) |
| Cetak PDF ukuran asli | `page.pdf` dengan `@page` | 6/6 tepat **1 halaman** |
| Lebar ponsel 390 px | Playwright | 6/6 poster tanpa gulir horizontal; Preview_Dokumen tanpa gulir horizontal (setelah perbaikan grid & kode panjang) |
| Gambar rusak | Playwright | 0 pada desktop (di ponsel 1 gambar `loading="lazy"` belum dimuat saat diukur, bukan rusak) |
| Tautan lokal di Preview_Dokumen | Pemeriksaan berkas | 55 tautan, 0 rusak |
| Diagram Mermaid | Mermaid 10.9.1 di Preview_Dokumen | 13/13 ter-render; 1 galat sintaks (titik dua di label) ditemukan dan diperbaiki |
| Galat konsol | Playwright | 0 setelah perbaikan |
| Tautan gambar di Markdown | skrip cek berkas | 0 hilang |

Catatan: uji dilakukan di Chromium. Safari/Firefox dan pencetakan di printer fisik belum diuji.

## 9. Status keselamatan dan pembatasan dosing

- `EKSEKUSI_DIIZINKAN = false` — diperiksa di `backend-nodejs/src/gerbangDosis.js` baris 21 sebelum dan sesudah commit `0383c55`.
- `POST /api/aktuator/perintah` tipe `DOSIS` dijawab 423; daftar-izin pengiriman (`TIPE_DIKIRIM`) tidak memuat `DOSIS`.
- Setiap dokumen dan poster yang menyinggung dosing memuat label **BELUM DIIZINKAN**; persetujuan dan eksekusi dijelaskan sebagai dua hal berbeda (SOP-01 SOP 6.1, Poster PST-04).
- Tidak ada prosedur yang menyuruh menjalankan dosing ke tandon tanaman. Uji pompa hanya dengan air bersih ke gelas ukur, oleh teknisi.
- Dua instruksi berbahaya di panduan lama ditandai di Juknis Instalasi Bab 7: "jumper GPIO13 ke GND" (pada firmware gabungan GPIO 13 = lampu merah) dan "kirim DOSIS kecil".
- Pekerjaan ini tidak mengubah source code, firmware, basis data, atau konfigurasi. Tangkapan layar diambil dengan akun **demo** (baca-saja).

## 10. Rekomendasi pengembangan dokumentasi berikutnya

1. Isi lembar `Daftar_Verifikasi_Dokumentasi.md` di lapangan, lalu terbitkan versi 1.1.
2. Perbaiki dokumen lama yang berbahaya atau usang: `deploy-pi/MULAI_DEPLOY.md` dan `deploy-pi/PANDUAN_SERVER_PI.md` (jumper GPIO13, kirim DOSIS), teks halaman Kalibrasi ("alat langsung mengirim" untuk EC), contoh perintah `hidro/`/`dosing` di halaman Koneksi Alat.
3. Ambil tangkapan layar aplikasi mobile dan foto panel asli; ganti ilustrasi vektor bila foto sudah sesuai perangkat.
4. Setelah antarmuka siklus/persetujuan dosing selesai, tulis Juknis khusus dan terbitkan ulang Poster PST-04.
5. Tetapkan tabel takaran nutrisi manual resmi bersama agronom.
6. Buat versi cetak hitam-putih poster Checklist untuk fotokopi harian.
7. Uji cetak poster di printer A3 nyata dan keterbacaan dari jarak 2 m.
