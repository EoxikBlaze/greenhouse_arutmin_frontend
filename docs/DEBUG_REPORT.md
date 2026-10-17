# Laporan Animasi & Debugging — React SPA GARAP

Tanggal: 2026-10-14

## 0) Penyesuaian ke `Mentahan PEN/untitled.pen` (sumber kebenaran struktur)

File `.pen` = wireframe grayscale 21 layar (01–21). Penyesuaian yang dilakukan:

| Dari .pen | Aksi |
|---|---|
| Layar **20 CCTV** (`GET /cctv`) | Dibuat `CctvPage.tsx`: grid 6 kamera (K-01…K-06, status teks Online/Periksa/Offline), pemutar + Rekam/Snapshot/Buka Penuh, log Peristiwa Kamera, filter lokasi, state `?state=loading` |
| Layar **21 Asisten AI** (`GET /asisten-ai`) | Dibuat `AsistenAiPage.tsx`: konteks banner, bubble chat ANDA/ASISTEN AI + jam, quick prompts ✦, input “Tanyakan kondisi kebun…” + Kirim ➤, checkbox riwayat/sensor, typing indicator, state `?state=loading/offline` |
| Sidebar: Asisten AI (Ikhtisar), CCTV (Kebun & Sensor), Data Tahap bersub ›, label **Laporan** (bukan “Matriks Laporan”), item **Keluar** | `AppShell.tsx` ditulis ulang sesuai tree .pen |
| Topbar dinamis: judul halaman + brand line “GARAP · greenhouse hidroponik” + clock `HH:MM:SS` + `▾ user` | `AppShell.tsx` |
| Peta peran: semua role = Dashboard/Sensor/Tanam/CCTV/AI/Profil; admin+demo = Water Control/Data Tahap/Master/Laporan/Notif/User; petani DIBLOKIR dari halaman admin | `RequireAuth` + guard per rute di `router.tsx` |
| State Gallery: empty state = ikon + kalimat + **“Tambah Data Pertama”**; banner demo = countdown “X menit lagi dihapus otomatis” (tick 60 dtk, role=status) | `CrudScreen.tsx`, `DemoBanner.tsx` |
| Confirm sheet **Keluar** (logout) | modal di AppShell → `logout()` → `/login` |
| Sesi tidak boleh hilang saat refresh | auth di-`sessionStorage` (`lib/auth.tsx`) — ditemukan saat debugging (bug: refresh = logout) |

Hasil uji setelah penyesuaian:
- Build + lint ✅
- CDP suite: **10/10 PASS** (guard, login 3 role, sidebar, CCTV, chat AI, logout, petani read-only, demo banner, state variant)
- Regresi klik semua 18 item sidebar: **18/18 PASS** (judul topbar + konten cocok)

### Fitur tambahan: Dosing Otomatis (`/dosing`)
| Bagian | Isi |
|---|---|
| Hero status | Mode AUTO/MANUAL (pill toggle), status pompa, sisa botol (progress bar), total injeksi hari ini (progress bar) |
| Aksi manual | Tombol “Injeksi 50 ml” (mode MANUAL), “Hentikan Injeksi” — spinner saat berjalan, disabled petani/demo |
| Pengaturan ambang | TDS Min / Max / Target / Injeksi per aksi — terhubung ke Ambang Sensor |
| Log injeksi | Tabel Waktu/Jenis/Jumlah/TDS Sebelum/TDS Sesudah/Status + export CSV |
| Polling | TDS aktual di-update tiap 4 dtk + flash highlight |
| State variants | `?state=offline` (banner + tombol disabled), `?state=empty` (empty state), `?state=loading` (skeleton) |
| Role guard | admin + demo (read-only); petani diblokir → redirect /dashboard |
| Akses | Sidebar → Kebun & Sensor → Dosing Otomatis; topbar title “Dosing Otomatis” |

Uji CDP dosing: **10/10 PASS** — sidebar, navigasi, elemen lengkap, MANUAL→injeksi aktif, injeksi manual+spinner+log, polling TDS berubah, petani diblokir, demo read-only, offline state, empty state.

## 0b) Backend API-ONLY (tanpa tampilan frontend) + enkripsi

Backend Laravel kini TIDAK PERNAH menyajikan HTML — semua response JSON:

| Lapisan | Implementasi |
|---|---|
| View (Blade) → JSON | `App\Routing\JsonRouter::toResponse()` (subclass Router) — `view('x', $data)` → `{"page":"x", ...$data}` |
| Redirect + flash → JSON | `App\Http\Middleware\JsonOnlyResponse` — `back()->with()` → `{"status", "redirect", "message", "errors", "input"}` |
| Error → JSON | `shouldRenderJsonWhen(true)` — 401/404/422/500 selalu JSON |
| Old input aman | `password`, `password_confirmation`, `_token` TIDAK ikut dikirim balik |
| Enkripsi | `SESSION_ENCRYPT=true`; `wa_settings.api_key` = cast `encrypted` (AES-256, kolom `text`); `password` bcrypt; `User::$hidden` |

Pitfall penting (2 bug saat implementasi):
1. `Router::toResponse()` **static** di Laravel 13 — override non-static = fatal error.
2. Binding router HARUS di `bootstrap/app.php` setelah `->create()` (sebelum HTTP
   Kernel menyuntik Router). Lewat `AppServiceProvider::register()` = terlambat →
   Kernel memegang instance router kosong → semua route 404.

Hasil audit: 18 route GET utama — **0 response HTML**; CSV tetap stream.

## 1) Animasi yang ditambahkan (single source of truth di `src/index.css`)

| Elemen | Kelas | Animasi |
|---|---|---|
| Transisi halaman (ganti rute) | `.vsf-page` | fade-up 0.3s (key = pathname di AppShell) |
| Kartu/section naik berurutan | `.vsf-stagger > *` | fade-up + delay bertahap (anak ke-1…13+) |
| Baris tabel | `.vsf-table tbody tr` | fade-up bertahap per baris + hover transisi |
| Modal & backdrop | `.vsf-modal-card` / `.vsf-modal-backdrop` | pop 0.24s / fade 0.16s |
| Banner (demo/sukses/peringatan) | `.vsf-banner` | slide-down 0.3s |
| Skeleton loading | `.vsf-skeleton` | shimmer 1.4s |
| Titik status online | `.vsf-dot` | denyut (pulse) 1.6s |
| Spinner dalam tombol | `.vsf-spinner` (+`-dark`) | putar 0.7s |
| Kartu hover | `.vsf-card` | border moss 55% + lift shadow + translateY |
| Tombol utama | `.vsf-btn-primary` | hover lift, active press, brightness |
| Pill/chip | `.vsf-pill` | hover naik, active press |
| Sidebar item | `SideItem` | transisi warna + geser halus; item aktif = pill moss + shadow |
| Fokus input | `.vsf-input:focus` | border moss + focus ring `rgba(107,157,74,.35)` |
| Kilat nilai live | `.vsf-flash` | sorotan moss 0.9s (siap dipakai saat polling) |

Aksesibilitas: semua animasi **dimatikan** saat `prefers-reduced-motion: reduce`.

## 2) Hasil debugging

### A. Static checks
- `npm run build` (tsc + vite) ✅
- `npm run lint` (oxlint) ✅ 0 error, 0 warning
  - Perbaikan: `auth.tsx` dipisah → `authContext.ts` (context/hook) + `auth.tsx` (provider) agar fast-refresh bekerja.

### B. Render semua rute (headless Chrome, 2 pass)
- Pass 1 — marker per rute + cek error console: **15/15 PASS**, 0 error console.
- Pass 2 — marker konten unik (di luar sidebar) + class animasi di DOM: **16/16 PASS**.
- Rute aneh (`/rute-tidak-ada`) → SPA fallback tanpa crash ✅
- State variant via URL terverifikasi:
  - `sensor-realtime?state=loading` → skeleton shimmer ✅
  - `sensor-realtime?state=empty` / `?state=offline` ✅
  - `watercontrol?state=offline` ✅
  - `tanam?state=empty` / `laporan?state=empty` ✅

### C. Uji interaksi (Chrome DevTools Protocol / WebSocket)
| Tes | Hasil |
|---|---|
| T1 Login submit kosong → 2 validasi inline "Wajib isi" | PASS |
| T2 Login isi form → navigasi `/dashboard` | PASS |
| T3 Animasi computed-style (stagger/page/dot) = vsf-fade-up/vsf-pulse-dot | PASS |
| T4 Modal CRUD terbuka, animasi pop + backdrop fade | PASS |
| T5 Modal hapus menyebut nama data (`batch B-2401`) | PASS |
| T6 Water Control pindah MANUAL → peringatan muncul, Isi Air aktif | PASS |
| T7 Skeleton shimmer di `?state=loading` | PASS |
| T8 Topbar clock live (WITA) + role chip | PASS |
| T10 Isi Air → spinner “Mengirim…” → kembali normal | PASS |
| T11 Filter Tanam Saya (`bayam`) menyaring tabel | PASS |
| T12 Stop + balik AUTO → Isi Air nonaktif lagi | PASS |

> Catatan: 4 kegagalan awal (T1/T4/T5/T6) ternyata **timing pada skrip test** (baca DOM sebelum React re-render), bukan bug aplikasi — sudah diverifikasi ulang PASS dengan jeda yang benar.

### D. Bug/issue yang diperbaiki saat debugging
1. Jam topbar hardcoded (“Sen, 12 Okt • 08:15 WIB”) → clock live `Intl.DateTimeFormat('id-ID')` + `tabular-nums` (anti layout-shift).
2. `RequireAuth` tidak terpasang → kini membungkus semua rute terproteksi.
3. Demo/role hardcoded di AppShell → satu sumber dari `AuthProvider` (`authContext.ts`).
4. Tombol “+ Tambah” bisa membuka modal kosong bila form tidak ada → kini `disabled={!form}`.
5. Stagger sidebar punya >8 anak → delay ditambah sampai anak ke-13+ (tidak ada yang muncul mendadak).
6. State variant sebelumnya mati (hardcode `false`) → kini bisa dipreview/debug via `?state=…`.

## 3) Yang diketahui masih terbuka (bukan bug, memang tahap berikutnya)
- Data masih statis/mockup — integrasi JSON Laravel (`POST /login`, `GET /me`, CRUD, polling `/api/latest-sensor`) belum dijalankan.
- Chart Sensor Real-Time masih placeholder area (belum library chart).
- Mode demo (banner + read-only + auto-hapus 1 jam) menunggu endpoint auth Laravel.
- Flutter app belum mendapat animasi/theme (target terpisah).

## 4) Cara verifikasi ulang
```bash
cd /Users/rizki/Project/Vertoniksmartfarm/react-web-app
npm run lint && npm run build
npm run dev -- --host 127.0.0.1 --port 5173
# buka: /dashboard, /sensor-realtime?state=loading, /watercontrol?state=offline
```
