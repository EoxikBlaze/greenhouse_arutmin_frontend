# GARAP-DOCUMENTATION

Dokumentasi resmi **GARAP – Smart Hidroponik**: Juknas, Juknis, SOP, referensi teknis, dan poster operasional.
Disusun dari audit kode sumber 12 November 2026. Folder ini terpisah dari source code; tidak ada berkas web, backend, Flutter, atau firmware yang diubah.

> ⛔ **Status dosing: BELUM DIIZINKAN.** Gerbang `EKSEKUSI_DIIZINKAN = false`. Semua dokumen memperlakukan eksekusi dosing sebagai belum diizinkan.

## Mulai dari sini

| Kebutuhan | Buka |
|---|---|
| Melihat semua dokumen dan poster sekaligus | [`03-VISUAL-PREVIEW/Preview_Dokumen.html`](03-VISUAL-PREVIEW/Preview_Dokumen.html) (buka di browser; berjalan tanpa internet) |
| Ringkasan hasil kerja dan hal yang perlu diverifikasi | [`LAPORAN_DOKUMENTASI_GARAP.md`](LAPORAN_DOKUMENTASI_GARAP.md) |
| Hasil audit repository | [`00-INVENTARISASI/Laporan_Inventarisasi_Audit.md`](00-INVENTARISASI/Laporan_Inventarisasi_Audit.md) |

## Struktur

```
GARAP-DOCUMENTATION/
├── 00-INVENTARISASI/        Laporan inventarisasi & audit repository
├── 01-PEDOMAN-RESMI/        Juknas, Juknis Website, Juknis IoT, Juknis Instalasi, SOP Operasi, SOP Pemeliharaan
├── 02-POSTER-PANDUAN/       Naskah 6 poster (.md), contoh desain (html/), hasil cetak (pdf/)
├── 03-VISUAL-PREVIEW/       Preview_Dokumen.html + assets (tangkapan layar asli, render poster, mermaid lokal)
├── 04-REFERENSI/            Arsitektur, daftar komponen, glosarium, daftar verifikasi
├── LAPORAN_DOKUMENTASI_GARAP.md
└── README.md
```

## Nomor dokumen

| Kode | Dokumen |
|---|---|
| GARAP-DOK-00 | Laporan Inventarisasi dan Audit |
| GARAP-JUKNAS-01 | Juknas Sistem GARAP |
| GARAP-JUKNIS-01 | Juknis Pengoperasian Website |
| GARAP-JUKNIS-02 | Juknis Pengoperasian IoT |
| GARAP-JUKNIS-03 | Juknis Instalasi dan Konfigurasi |
| GARAP-SOP-01 | SOP Pengoperasian Sistem |
| GARAP-SOP-02 | SOP Pemeliharaan dan Penanganan Gangguan |
| GARAP-PST-01 … 06 | Poster panduan |
| GARAP-REF-01 … 04 | Referensi |

## Penanda di dokumen

| Penanda | Arti |
|---|---|
| ⛔ BELUM DIIZINKAN | Tidak boleh dijalankan sampai ada keputusan tertulis pemilik |
| 🔧 KHUSUS TEKNISI | Hanya teknisi IoT terlatih |
| ⚠️ | Risiko listrik, kimia, atau kerusakan |
| [PERLU VERIFIKASI] | Data tidak ditemukan di kode/konfigurasi; wajib dicek manusia |

## Poster dan Canva

Setiap poster punya naskah `.md` (teks final + arahan visual) dan contoh `.html` (ukuran A3/A4, siap cetak lewat tombol **Cetak / simpan PDF**). Untuk Canva: buat desain kustom sesuai ukuran, impor PDF di `02-POSTER-PANDUAN/pdf/` sebagai acuan, atau susun ulang dari naskah. Warna dan font mengikuti identitas web GARAP (navy #0A1F38, hijau hutan #2D452F, moss #6B9D4A, mint #CFE2CE, emas #E9CD53; Space Grotesk + Inter).

Font Google dimuat bila ada internet; tanpa internet poster memakai font sistem dengan tata letak yang sama.

## Memperbarui dokumentasi

Fakta di dokumen merujuk berkas dan commit tertentu. Bila kode berubah (terutama gerbang dosis, firmware, atau alur siklus), periksa ulang bagian terkait dan terbitkan versi baru dengan riwayat revisi.
