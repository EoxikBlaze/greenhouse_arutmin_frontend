# Template infografis (gaya halaman Tentang)

Satu template, banyak poster. Isi tiap poster ada di `data/<nama>.js`. Dua gaya tampilan, dipilih lewat `gaya` di file data:
- bawaan (`infografis.css/.js`) — gaya halaman Tentang;
- `gaya: 'ceria'` (`ceria.css/.js`) — poster pertanian ilustratif: pita oranye/hijau, judul tebal bergaris tepi, QR "SCAN ME". Jenis bagiannya: `tiga`, `sensorAktuator`, `web`, `proker`, `penutup`; teks mendukung `==sorot==`.
- `tata: 'spanduk'` (+ `spanduk.css`) — kanvas mendatar `lebar × tinggi` px (spanduk 3 × 1 m = 3000 × 1000, `skala: 4` → 12000 × 4000 px ±100 dpi). Isinya kolom berdampingan di `kolom: [...]` dengan lebar `px`; jenis kolom: `kepala`, `alat`, `web`, `proker`, `tim`. Berlaku untuk kedua gaya (gaya Tentang memakai `spanduk-tentang.css`, gaya ceria `spanduk.css`).

| File | Isi |
|---|---|
| `data/vertonik.js` | Infografis 1 — cara kerja sistem Vertonik Smart Farm, anggota, QR |
| `data/kkn.js` | Infografis 2 — info program KKN, proyek unggulan, anggota, proker, QR |
| `data/spanduk-alat.js` | Spanduk 1 (3 × 1 m, gaya Tentang) — Vertonik: sensor, aktuator, cara kerja website, QR |
| `data/spanduk-proker.js` | Spanduk 2 (3 × 1 m, gaya Tentang) — proker yang dijalankan, anggota, QR |
| `data/sistem.js` | Infografis 3 (gaya **ceria**) — sensor & aktuator, cara kerja website, proker, QR |
| `data/anggota.js` | Daftar anggota (nama, jabatan, foto di `react-web-app/public/tim/`) — dipakai semua poster |
| `hasil/` | PNG (2×) dan PDF hasil render |

## Mengubah isi
- Teks boleh memakai `**tebal**`.
- Jenis bagian: `alur`, `langkah`, `rantai`, `panel`, `anggota`, `proker`, `qr` — contoh pemakaiannya ada di kedua file data.
- **Proker bertanda `contoh: true` adalah isian contoh** (tampil bergaris merah + label "contoh"). Ganti teksnya dengan proker asli lalu hapus `contoh: true` sebelum dibagikan.
- QR dibuat otomatis dari `url` di bagian `qr` (library `lib/qrcode.js`, MIT).
- Poster baru: salin salah satu file di `data/`, ganti isinya, lalu render.

## Pratinjau & render
- Pratinjau: buka `template.html?data=kkn` di Chrome.
- Render PNG + PDF (butuh Playwright: `npm i playwright && npx playwright install chromium-headless-shell`):

```bash
node render.js          # semua poster
node render.js kkn      # satu poster
```

Tinggi poster mengikuti isi (lebar 1080 px). PDF berisi gambar PNG karena cetak vektor Chrome merusak efek kaca.
