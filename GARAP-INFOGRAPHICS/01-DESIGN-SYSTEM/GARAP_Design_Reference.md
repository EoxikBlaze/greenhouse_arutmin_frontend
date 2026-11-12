# GARAP Design Reference — Acuan Visual Infografis

Dokumen ini merangkum design system website GARAP (Vertonik Smart Farm) hasil audit kode sumber pada 12 November 2026.
Semua nilai di bawah diambil langsung dari berkas berikut — bukan tebakan:

| Sumber | Isi |
|---|---|
| `react-web-app/tailwind.config.js` | Warna `arutmin.*`, `navy`, `emas`, `moss`, radius, font, shadow, gradasi |
| `react-web-app/src/index.css` (`:root`, `.vsf-*`, blok "Liquid Glass v5") | Token CSS, tipografi dasar, tombol, input, pill, tabel, modal, kartu kaca |
| `react-web-app/src/components/StatusBadge.tsx` | Badge status online / warning / offline |
| `react-web-app/src/components/Ikon.tsx` | Set ikon (lucide-react) |
| `react-web-app/package.json` | `@fontsource/inter`, `@fontsource/space-grotesk`, `lucide-react` |
| `docs/presentasi/screenshot/01-dashboard.png` | Tampilan nyata dashboard (28 Okt 2026) |

---

## 1. Identitas visual website

- **Karakter:** dashboard industri yang tenang dan rapi. Chrome (sidebar, topbar, footer) **navy gelap**, area kerja **hijau sangat muda**, kartu **putih** bersudut lebar.
- **Nuansa:** hijau hutan (pertanian) + navy (korporat/tambang) + sedikit **emas** sebagai aksen brand.
- **Material:** "Liquid Glass v5" — kartu kaca bening dengan rim putih tipis di atas foto lanskap. Untuk infografis cetak, material kaca **diterjemahkan menjadi kartu putih solid + border tipis + shadow lembut** (kaca tidak tercetak dengan baik).
- **Nama produk di UI:** "GARAP" (judul halaman) dan "Vertonik Smart Farm" (sidebar/footer). Subjudul topbar: "GARAP · greenhouse hidroponik".

## 2. Palet warna (HEX aktual)

### 2.1 Warna brand

| Token | HEX | Sumber | Peran |
|---|---|---|---|
| `navy` / `--navy` | `#0A1F38` | index.css `:root` | Chrome: sidebar, topbar, header tabel, header infografis |
| `navy2` / `--navy2` | `#071527` | index.css `:root` | Ujung gradasi chrome |
| `arutmin.forest` | `#2D452F` | tailwind | Hijau utama: tombol primer, angka KPI, badge nomor tahap |
| `arutmin.olive` | `#4C6A4B` | tailwind | Ujung gradasi tombol primer |
| `arutmin.moss` / `--moss` | `#6B9D4A` | tailwind / `:root` | Aksen sukses/aktif, fokus, titik status online |
| `arutmin.mint` | `#CFE2CE` | tailwind | Latar ikon bulat, latar badge online (40%) |
| `emas` / `--emas` | `#E9CD53` | `:root` | Aksen brand: avatar, sorotan; **hanya di atas navy** |
| Moss gelap (kontras) | `#4E7733` → `#42662B` | tailwind `activePill` | Pill aktif dengan teks putih (lolos ≥4.5:1) |
| Emas gelap (teks) | `#7A6410` | `.vsf-eyebrow-gold` | Teks emas di atas latar terang |

### 2.2 Permukaan & teks

| Token | HEX | Peran |
|---|---|---|
| `--ar-page` | `#F4F7F2` | Latar halaman |
| `--ar-card` / `--kartu` | `#FFFFFF` | Permukaan kartu |
| `--ar-border` / `--garis` | `#E2E8DD` | Border kartu, pemisah |
| `--ar-border2` | `#D7E0D2` | Border input |
| `--tinta` | `#0B1A2B` (rgb 11 26 43) | Teks utama |
| `--abu` | `#4F6075` (rgb 79 96 117) | Teks sekunder, eyebrow |
| `.vsf-eyebrow-chrome` | `#46576B` | Label di atas chrome terang |

### 2.3 Status

| Status | Warna inti | Latar | Border | Teks | Sumber |
|---|---|---|---|---|---|
| Sukses / online | `#6B9D4A` | `#CFE2CE` @40% | `#6B9D4A` | `#2D452F` | `StatusBadge` online |
| Peringatan | `#E0A42B` | amber-50 `#FFFBEB` | amber-500 @50% | amber-800 `#92400E` | `arutmin.warning`, `.vsf-tone-warn` |
| Galat / bahaya | `#C0392B` | red-50 `#FEF2F2` | red-600 @50% | red-700 `#B91C1C` | `arutmin.error`, `.vsf-tone-error` |
| Informasi | `#0A1F38` (navy) | `#F4F7F2` | `#E2E8DD` | `#4F6075` | **Website tidak punya warna info khusus.** Infografis memakai navy + abu (netral) agar tidak menambah warna baru. |

> Catatan: Tailwind slate/red/amber dipakai website lewat `@apply`; nilai HEX di tabel adalah nilai default Tailwind 3.4.

## 3. Tipografi

| Peran | Font | Bobot | Ukuran web | Line height | Sumber |
|---|---|---|---|---|---|
| Heading / display | **Space Grotesk** | 600–700 | h1 26px · h2 19px · h3 16px | 1.25 · 1.3 · 1.35 | `fontFamily.heading`, `h1–h3` |
| Body | **Inter** | 400–600 | 15px (rentang 14–15) | normal | `body` |
| Eyebrow / label | Inter | 700, UPPERCASE, `letter-spacing .14em` | 12px | — | `.vsf-eyebrow` |
| Tombol / pill | Inter | 600 | 13px / 12px | — | `.vsf-btn`, `.vsf-pill` |
| Angka KPI | Space Grotesk | 700 | besar (KPI dashboard) | — | screenshot dashboard |
| Kode / topik MQTT | `ui-monospace, SFMono-Regular, Menlo` | 400 | — | — | `fontFamily.mono` |

Letter-spacing heading: h1 `-0.015em`, h2 `-0.01em`.

**Catatan:** halaman landing/login juga memuat **Oswald** (judul kapital miring) dan **Kaushan Script** dari Google Fonts (`index.html`). Keduanya khusus hero landing — **tidak** dipakai di dashboard dan **tidak** dipakai di infografis.

**Skala infografis (kanvas 1200 px, cetak A3):** judul 56px · subjudul 22px · judul seksi 28px · judul kartu 19px · body 16px · eyebrow 13px · keterangan 14px (minimal). Tidak ada teks < 13px.

## 4. Komponen visual

| Komponen | Spesifikasi website | Penerapan infografis |
|---|---|---|
| **Kartu** | radius `--r-lg` 20px (`.vsf-card` 24px), border 1px, shadow `--shadow-soft` | Kartu putih, radius 20px, border `#E2E8DD`, shadow-soft |
| **Tombol primer** | pill (`rounded-full`), min-h 44px, gradasi `#2D452F → #4C6A4B`, teks putih 600 | Dipakai sebagai "label aksi" dalam langkah |
| **Tombol sekunder** | pill, border moss, teks forest, latar putih 75% | Label aksi alternatif |
| **Tombol bahaya** | pill, `#C0392B`, teks putih | Ilustrasi tombol STOP / E-STOP |
| **Badge status** | pill, titik 7px + ring, teks 12px 600 | Legenda status (online/waspada/galat) |
| **Eyebrow** | 12px uppercase tracking .14em, abu | Label di atas setiap judul seksi |
| **Input** | radius 12px, border `#D7E0D2`, fokus moss + glow | Tidak dipakai kecuali mockup formulir |
| **Tabel** | header navy, baris berselang | Tabel troubleshooting: header navy, teks putih |
| **Modal** | kartu kaca di atas backdrop | Tidak dipakai |
| **Ikon KPI** | ikon lucide dalam lingkaran mint | Ikon 24px stroke 2 dalam lingkaran mint 48px |
| **Badge nomor tahap** | lingkaran forest `#2D452F`, angka putih | Nomor langkah |
| **Shadow** | soft `0 1px 2px rgba(10,31,56,.05), 0 14px 30px -22px rgba(10,31,56,.45)` | Sama |
| **Radius** | std 12px, sm 12px, lg 20px, pill 999px | Sama |
| **Spacing** | grid Tailwind 4px; kartu padding ±24px | Grid 8px; padding kartu 24–28px; jarak antarkartu 20px |

## 5. Gaya ikon

- Set: **lucide-react v1.62** (dipakai `Ikon.tsx`). Outline, stroke 2, sudut membulat, viewBox 24.
- Warna ikon: `#2D452F` (forest) di atas lingkaran mint; putih di atas navy; `#C0392B` untuk bahaya.
- **Jangan** mencampur ikon isi (filled), emoji, atau set ikon lain.
- File SVG siap pakai Canva: `04-ASSETS/icons/*.svg` (diekstrak dari paket lucide di proyek).

## 6. Gaya ilustrasi

- Website **tidak memakai ilustrasi kartun**. Visual = foto lanskap greenhouse (latar), screenshot UI, dan ikon.
- Infografis memakai: **diagram blok teknis** (kotak bersudut 12–20px, garis 2px, panah), **screenshot asli**, dan **ikon lucide**.
- Diagram perangkat digambar sebagai skema blok (bukan gambar realistis) dengan label pin/komponen dari firmware `gabungan-0.6`.

## 7. Aturan layout

- Kanvas: **lebar tetap 1200 px**, tinggi minimum 1697 px (rasio A3), bertambah mengikuti isi. Cetak: A3 potret; setiap infografis tepat **2 halaman A3** (lebar kanvas diskalakan 0,935 = lebar A3).
- Media sosial: pecah per seksi menjadi carousel 1080 × 1350 px.
- Struktur tetap: **Header navy** (eyebrow nomor seri + judul + subjudul) → **isi** (seksi berkartu di atas latar `#F4F7F2`) → **Footer navy** (sumber data + versi).
- Margin isi 56px; grid 12 kolom; kartu 2/3/4 kolom.
- Setiap seksi diawali eyebrow + judul seksi.
- Maksimal 6–8 blok informasi per infografis.

## 8. Aturan penggunaan warna

1. Proporsi: ±60% latar `#F4F7F2`/putih · ±25% navy (header/footer/diagram) · ±10% hijau forest/moss · ≤5% emas/status.
2. Emas `#E9CD53` **hanya di atas navy** (kontras rendah di atas putih). Di latar terang pakai `#7A6410`.
3. Teks putih di atas moss **dilarang** (kontras 3.21). Pakai forest `#2D452F` atau moss gelap `#4E7733`.
4. Merah `#C0392B` hanya untuk bahaya/larangan/STOP. Amber `#E0A42B` hanya untuk peringatan.
5. Tidak ada gradasi selain dua gradasi resmi: chrome navy (`#0A1F38 → #071527`) dan primer (`#2D452F → #4C6A4B`).

## 9. Aturan konsistensi desain

- Satu set font (Space Grotesk + Inter), satu set ikon (lucide), satu radius kartu (20px).
- Istilah mengikuti label UI: **Dashboard, Sensor, Peringatan, Kebun Saya, Saklar, Target Nutrisi, Kalibrasi, Catatan Aktivitas, Meja Tanaman, Ambang Sensor**.
- Angka dan satuan hanya dari kode/dokumen proyek; sumber dicantumkan di footer.
- Status keselamatan dosing (`EKSEKUSI_DIIZINKAN = false`) selalu ditampilkan bila topik menyentuh pompa/dosing.

## 10. Contoh penerapan untuk infografis

```
┌──────────────────────────────────────────── navy #0A1F38 ─┐
│ INFOGRAFIS 05 · GARAP            (eyebrow emas #E9CD53)    │
│ Sistem Monitoring Hidroponik     (Space Grotesk 56/700 putih)│
│ Dari sensor ke layar operator    (Inter 22 putih 70%)       │
└────────────────────────────────────────────────────────────┘
  KONDISI YANG DIPANTAU            (eyebrow 13 abu #4F6075)
  ┌────────────┐ ┌────────────┐ ┌────────────┐   kartu putih r20
  │ (◯ ikon)   │ │ (◯ ikon)   │ │ (◯ ikon)   │   border #E2E8DD
  │ pH         │ │ EC / TDS   │ │ Suhu air   │   judul 19/600 tinta
  └────────────┘ └────────────┘ └────────────┘
  ┌ ⚠ PERINGATAN ──────────────────────────────┐ amber / merah
  └────────────────────────────────────────────┘
┌──────────────── footer navy: sumber · versi ───────────────┐
```

Implementasi CSS: `03-HTML-PREVIEW/garap-infografis.css` (token di `:root` identik dengan tabel di atas).
