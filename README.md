# frontend-baru

Frontend GARAP / Vertonik Smart Farm yang **sedang tayang di garap.net**, diambil langsung dari server pada 24 November 2026
(aset versi `-v9`). Ini adalah situs statis siap pakai.

## Isi

- `index.html`, `assets/` (hanya versi `-v9` dan berkas pendukung yang benar-benar dipakai), gambar, `tim/`, `pembimbing/`, `panduan/`.
- Tidak ada backend, firmware, isi database, `rahasia.h`, atau konfigurasi server.

## Penting: ini hasil build, bukan kode sumber

- Isinya JavaScript hasil kompilasi (minified); tidak ada berkas `.tsx`.
- Situs ini dibangun dari sumber React yang **tidak cocok dengan cabang mana pun di repo ini**. Saya membangun ulang `claude/lokal-backend-local-a4ef70`,
  `dev`, `main`, dan `Web-Haqi`: nama berkas hasil build (hash) tidak ada yang sama dengan situs yang tayang.
- Setelah build awal, situs ditambal langsung di berkas hasil build (versi `-v2` sampai `-v9`):
  penanda meja (`meja-label-v2.js/.css`), teks E-STOP, tampilan "Alat siap" di Dashboard dan Kebun Saya, dan panel PTZ kamera di halaman CCTV (`-v9`).
- Sumber React terdekat: cabang `claude/lokal-backend-local-a4ef70`, folder `react-web-app/`. Sumber itu **belum memuat** tambalan di atas.
  Membangun ulang dari sumber itu akan menghilangkan perubahan tersebut.

## Memasang

Salin seluruh isi cabang ini ke `/var/www/vertonik` (nginx). Situs memanggil API di domain yang sama (`/cctv`, `/dashboard`, `/peringatan`, ...).
Cloudflare menyimpan `/assets` selama 1 tahun: bila mengubah sebuah aset, beri nama baru (`-v10`, ...) dan ubah `index.html`, jangan menimpa nama lama.
