# frontend-baru

Frontend GARAP / Vertonik Smart Farm yang **sedang tayang di garap.net**, diambil langsung dari server pada 24 November 2026
(aset versi `-v11`). Ini adalah situs statis siap pakai.

## Isi

- `flutter_mobile_app/`: aplikasi mobile (Flutter). Lihat bagian *Aplikasi mobile* di bawah.
- `index.html`, `assets/` (hanya versi `-v11` dan berkas pendukung yang benar-benar dipakai), gambar, `tim/`, `pembimbing/`, `panduan/`.
- Tidak ada backend, firmware, isi database, `rahasia.h`, atau konfigurasi server.

## Penting: ini hasil build, bukan kode sumber

- Isinya JavaScript hasil kompilasi (minified); tidak ada berkas `.tsx`.
- Situs ini dibangun dari sumber React yang **tidak cocok dengan cabang mana pun di repo ini**. Saya membangun ulang `claude/lokal-backend-local-a4ef70`,
  `dev`, `main`, dan `Web-Haqi`: nama berkas hasil build (hash) tidak ada yang sama dengan situs yang tayang.
- Setelah build awal, situs ditambal langsung di berkas hasil build (versi `-v2` sampai `-v11`):
  penanda meja (`meja-label-v2.js/.css`), teks E-STOP, tampilan "Alat siap" di Dashboard dan Kebun Saya, dan panel PTZ kamera di halaman CCTV (`-v9`), judul halaman Meja Tanaman (`-v10`), dan batas fitur petani di Kebun Saya dan Asisten AI (`-v11`).
- Sumber React terdekat: cabang `claude/lokal-backend-local-a4ef70`, folder `react-web-app/`. Sumber itu **belum memuat** tambalan di atas.
  Membangun ulang dari sumber itu akan menghilangkan perubahan tersebut.

## Memasang

Salin seluruh isi cabang ini ke `/var/www/vertonik` (nginx). Situs memanggil API di domain yang sama (`/cctv`, `/dashboard`, `/peringatan`, ...).
Cloudflare menyimpan `/assets` selama 1 tahun: bila mengubah sebuah aset, beri nama baru (`-v12`, ...) dan ubah `index.html`, jangan menimpa nama lama.

## Aplikasi mobile (`flutter_mobile_app/`)

- Kode sumber Flutter, disalin dari cabang `claude/lokal-backend-local-a4ef70` (commit `7188c89`; perubahan Flutter terakhir `ee33b8b`, 21 November 2026:
  wizard Lewati setup, Pantau Semai, Pengaturan).
- **Belum disinkronkan** dengan perubahan 24 November 2026 di web dan server (tampilan "Alat siap", peringatan siklus, kontrol kamera PTZ).
  Belum diuji ulang terhadap server sekarang.
- Tidak berisi kunci tanda tangan, `google-services`, atau berkas rahasia lain (sudah diperiksa saat disalin).
