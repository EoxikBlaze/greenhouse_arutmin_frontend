# GARAP — Greenhouse Arutmin (Frontend)

Aplikasi monitoring dan kontrol greenhouse hidroponik (PT Arutmin Indonesia / Vertonik Smart Farm) — sisi **frontend**: web dan mobile.
Backend (API) ada di repo terpisah: **`greenhouse_arutmin_backend`**.

## Isi repo ini

| Folder | Isi |
|---|---|
| `react-web-app/` | Aplikasi web (React 19 + Vite + TypeScript + Tailwind v3) bergaya **liquid glass** |
| `flutter_mobile_app/` | Aplikasi mobile (Flutter, Android + iOS) dengan bahasa desain kaca yang sama |
| `deploy-pi/` | Sumber firmware ESP32 (sensor dan aktuator) dan bahan deploy Raspberry Pi |
| `docs/` | Kontrak API, desain fase 2, protokol firmware v0.3, tutorial Pi, audit, laporan debug |
| `mockups/`, `Mentahan PEN/` | Mockup UI/UX dan sumber wireframe |
| `tasks/` | Catatan rencana dan to-do kerja |
| `jalankan-local.sh` | Menjalankan web + backend lokal sekali perintah |

## Menu web

Peran: **admin** membuka semua menu, **user** dan **petani** hanya menu umum. Akun **demo** bisa melihat menu kelola tetapi tidak boleh mengubah data (backend menjawab 403).

| Kelompok | Menu (rute) |
|---|---|
| Umum | Dashboard (`/dashboard`), Sensor Real-Time (`/sensor-realtime`), Kebun Saya (`/tanam`), CCTV (`/cctv`), Asisten AI (`/asisten-ai`), Profile (`/profil`) |
| Kontrol | Dosing Otomatis (`/dosing`), Water Control (`/watercontrol`), Kalibrasi Alat (`/kalibrasi`) |
| Data tahap | Semai, Peremajaan, Pendewasaan, Panen, Durasi Siklus |
| Master Data | Jenis Tanaman, Meja Tanaman, Ambang Sensor |
| Laporan & Sistem | Laporan (`/laporan`), Manajemen User (`/user`), Riwayat Audit (`/audit`) |
| Publik | Tentang Kami (`/`), Login (`/login`) |

Catatan:
- Kontrol air (isi, stop, ganti mode) sengaja **nonaktif** di web dan APK selama backend menjawab `503 kontrol_air_nonaktif`.
- Sensor Real-Time punya tombol **Unduh Laporan** (`.xlsx`: sheet Ringkasan dan Data, sel di luar ambang diberi warna).
- Rute lama (`/tanam-saya`, `/water-control`, `/manajemen-user`, dll.) dialihkan ke rute baru.

## Gaya desain: liquid glass

- Kartu, tabel, dan popup memakai kelas `.vsf-card` dan token `--lg-*` di `react-web-app/src/index.css`. Aturannya: **tidak ada kaca di atas kaca** (di dalam kartu pakai tint + rim tipis).
- Pengguna bisa memilih transparansi **Jernih / Standar / Pekat** di menu Profile. `prefers-reduced-transparency` dan `prefers-contrast: more` otomatis memakai permukaan solid.
- Komponen bersama: `components/kaca/DialogKaca` (popup, konfirmasi, pesan), `components/master/MasterKit` (kerangka halaman, tabel, aksi baris), `lib/format.ts` (format tanggal/angka).
- Setiap menu baru wajib mengikuti gaya ini.

## Menjalankan web (development)

```bash
cd react-web-app
npm install
npm run dev        # http://127.0.0.1:5173
```

Backend harus hidup di `127.0.0.1:8000` (lihat repo backend) — proxy dev
otomatis meneruskan `/api`, `/monitoring`, `/login` (POST) ke sana.

Pemeriksaan sebelum commit:

```bash
npm run build      # tsc -b + vite build
npm run lint       # oxlint
npm test           # vitest (jsdom)
```

## Menjalankan mobile (Flutter)

```bash
cd flutter_mobile_app
flutter pub get
flutter run -d "iPhone 17"    # lihat docs/FLUTTER_SETUP.md
flutter test
```

## Kontrak API

Route mengikuti kontrak backend (JANGAN diganti sendiri) — daftar lengkap
di `docs/API_ROUTES.md` dan `docs/KONTRAK_API.md`. Semua request **same-origin** —
domain backend tidak pernah muncul di browser.

## Cara update (kerja dua orang)

1. `git checkout dev && git pull` — kerja di branch **`dev`**
2. Buat branch fitur (opsional): `git checkout -b fitur/nama-fitur`
3. Kerja, commit dengan pesan jelas: `git commit -m "web: tambah grafik pH"`
4. `git push origin dev` (atau `fitur/nama-fitur`) → buka Pull Request ke `dev`
5. Setelah review, merge. `main` hanya untuk versi stabil (diberi tag `v1.0`, `v1.1`, ...)

Alur lengkap ada di `docs/ALUR_GITHUB.md`. Di GitHub, menu **Switch branches/tags**
(kiri atas daftar file) untuk berpindah antara branch dan melihat tag versi.

Aturan: yang diubah di repo ini = web + mobile (dan sumber firmware). Perubahan API = di repo
`greenhouse_arutmin_backend`.
