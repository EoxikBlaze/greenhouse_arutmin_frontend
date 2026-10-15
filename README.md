# Greenhouse Arutmin — Frontend

Aplikasi monitoring greenhouse hidroponik (PT Arutmin Indonesia) — sisi **frontend**.
Backend (API) ada di repo terpisah: **`greenhouse_arutmin_backend`**.

## Isi repo ini

| Folder | Isi |
|---|---|
| `react-web-app/` | Aplikasi web (React + Vite + TypeScript) — tema Arutmin Light |
| `flutter_mobile_app/` | Aplikasi mobile (Flutter, iOS + Android) |
| `mockups/` | Mockup UI/UX hi-fi (19+ layar, sumber kebenaran desain) |
| `Mentahan PEN/` | Sumber desain wireframe (.pen) |
| `docs/` | Dokumen setup, kontrak API, laporan debug |
| `jalankan-local.sh` | Menjalankan web + backend lokal sekali perintah |

## Menjalankan web (development)

```bash
cd react-web-app
npm install
npm run dev        # http://127.0.0.1:5173
```

Backend harus hidup di `127.0.0.1:8000` (lihat repo backend) — proxy dev
otomatis meneruskan `/api`, `/monitoring`, `/login` (POST) ke sana.

## Menjalankan mobile (Flutter)

```bash
cd flutter_mobile_app
flutter pub get
flutter run -d "iPhone 17"    # lihat docs/FLUTTER_SETUP.md
```

## Kontrak API

Route mengikuti kontrak backend (JANGAN diganti sendiri) — daftar lengkap
di `docs/API_ROUTES.md`. Semua request **same-origin** — domain backend
tidak pernah muncul di browser.

## Cara update (kerja dua orang)

1. `git pull` sebelum mulai kerja
2. Buat branch: `git checkout -b fitur/nama-fitur`
3. Kerja, commit dengan pesan jelas: `git commit -m "web: tambah grafik pH"`
4. `git push -u origin fitur/nama-fitur` → buka Pull Request ke `main`
5. Setelah review, merge. Jangan push langsung ke `main` bila berdua.

Aturan: yang diubah di repo ini = web + mobile saja. Perubahan API = di repo
`greenhouse_arutmin_backend`.
