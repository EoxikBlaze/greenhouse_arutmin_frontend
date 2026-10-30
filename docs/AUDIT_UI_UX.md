# AUDIT UI/UX — GARAP (web `react-web-app`)

> Audit **baca-saja**. Tidak ada satu pun file React yang diubah, tidak ada commit.
> Satu-satunya file yang ditulis: `docs/AUDIT_UI_UX.md` ini.
> Tanggal audit: 20 Okt 2026 (WITA).

---

## Metode & bukti

- **Sumber kebenaran**: kode `react-web-app/src/**` (26 file `.ts`/`.tsx`: `LoginPage`, `layouts/AppShell.tsx`,
  `pages/DashboardPage.tsx`, `pages/masterPages.tsx`, `components/CrudScreen.tsx`,
  halaman mock `stagePages`/`TanamSayaPage`/`notifLaporanPages`/`userProfilPages`,
  `lib/crudApi.ts`, `router.tsx`, `index.css`, `tailwind.config.js`).
- **Preview dev server di `PORT 5199`** (`npx vite --port 5199 --strictPort`), backend hidup
  di `127.0.0.1:8000`. Port 5173 **tidak** dipakai.
- **Render sungguhan via headless Chrome + CDP** (bukan perkiraan):
  - viewport **390 / 640 / 700 / 768 / 1024 / 1440** dengan `Emulation.setDeviceMetricsOverride`;
  - pengukuran `getBoundingClientRect` + `document.scrollWidth` untuk overflow;
  - **API di-mock lewat domain `Fetch`** (`GET/POST /meja`, `GET/PUT /ambang` → 200/500/`[]`)
    supaya state loading/empty/error/flash/benar-benar terlihat;
  - probe keyboard: `Tab` (urutan fokus & indikator fokus), `Escape`, klik backdrop,
    `document.activeElement` di dalam modal;
  - sesi login disimulasikan dengan menulis `localStorage['vsf-auth']` (**tanpa kredensial** —
    tidak ada password yang ditebak/diketik).
- **Kontras warna dihitung** (WCAG 2.1 relative luminance) — lihat Lampiran A.
- **Keterbatasan**: tanpa kredensial asli, jadi login form diuji hanya sampai validasi inline
  (klik "Masuk" kosong → pesan field muncul, terverifikasi screenshot); tidak ada pengujian
  screen-reader nyata (klaim AT berbasis atribut ARIA + perilaku DOM).
- **Catatan paralel (penting)**: selama audit berjalan, dua file ditulis ulang oleh proses
  lain — `pages/masterPages.tsx` 607 → 792 baris (05:07) dan `pages/stagePages.tsx`
  204 → 595 baris (05:08). Test runtime (screenshot, pengukuran viewport, probe keyboard)
  dijalankan 04:56–04:59, yaitu versi **sebelum** rewrite; seluruh temuan lalu diperiksa
  ulang terhadap kode terkini. File berikut **tidak berubah** selama audit —
  `components/CrudScreen.tsx` (mtime 19 Okt 23:18), `layouts/AppShell.tsx`,
  `pages/DashboardPage.tsx`, `pages/LoginPage.tsx` (18 Okt 07:12), `index.css`,
  `lib/crudApi.ts`, `components/DemoBanner.tsx` — sehingga temuan T1–T5, S1, S2, S4,
  S6–S8, R1–R6 berlaku apa adanya. Yang menyesuaikan hanya **cakupan mock vs live (S3)**
  dan **nomor baris** `masterPages.tsx`/`stagePages.tsx` (sudah diperbarui di bawah).

### Ringkasan temuan

| ID | Prioritas | Temuan | Lokasi utama |
|----|-----------|--------|--------------|
| T1 | **TINGGI** | Tidak ada responsif sama sekali — sidebar 260px tetap, halaman overflow horizontal di mobile | `layouts/AppShell.tsx:90-149` |
| T2 | **TINGGI** | Banner error + empty state tampil **bersamaan**, empty state menyesatkan & tanpa tombol coba lagi | `components/CrudScreen.tsx:143-150` vs `181-201` |
| T3 | **TINGGI** | Teks internal/dev & placeholder wireframe tampil di layar produksi (judul toolbar merusak kalimat empty state) | `masterPages.tsx:246,518,571`, `CrudScreen.tsx:124,188,221-232` |
| T4 | **TINGGI** | Dashboard (layar pertama setelah login) penuh tombol mati + data statis | `DashboardPage.tsx:12-16,28-45` |
| T5 | **TINGGI** | Modal CRUD tanpa fokus-pindah, tanpa trap Tab, Escape & backdrop tidak menutup, tanpa role dialog | `CrudScreen.tsx:235-313` |
| T6 | **TINGGI** | Sidebar tidak difilter role → item tampak tersedia tapi redirect senyap ke `/dashboard` | `AppShell.tsx:97-146` + `router.tsx:42-71` |
| S1 | SEDANG | Tombol aksi baris Edit/Hapus 22×18px & 37×18px (di bawah target minimum) | `CrudScreen.tsx:319-345` |
| S2 | SEDANG | Kontras gagal AA: nav aktif putih-di-moss 3.75:1, kolom ID 2.56:1 | `AppShell.tsx:39`, `masterPages.tsx:232,504,720` |
| S3 | SEDANG | Halaman mock tersisa: tombol Edit/Simpan/Hapus tidak berfungsi tanpa penanda state | `stagePages.tsx:277,314,353`, `userProfilPages.tsx:41` |
| S4 | SEDANG | Reload setelah simpan/hapus tidak punya indikator loading (`loading` hanya sekali) | `lib/crudApi.ts:128,156-158` |
| S5 | SEDANG | Pesan validasi memakai nama field teknis (`Kolom jumlah_lubang …`) | `masterPages.tsx:340-367,601-621` |
| S6 | SEDANG | Indikator status menyesatkan: "Alat Terhubung" selalu hijau, hitung mundur demo hard-code 60 menit | `AppShell.tsx:158`, `DemoBanner.tsx:9-24` |
| S7 | SEDANG | Tombol sekunder memakai kelas input (21 pemakaian), tombol bahaya duplikat 3× | lintas file |
| S8 | SEDANG | Error login tanpa `role="alert"`/`aria-describedby`; tanpa autofokus field pertama | `LoginPage.tsx:63-67,81,105` |
| R1 | RENDAH | Eyebrow heading tidak konsisten (`font-bold` hilang di 6 tempat, `tracking` .12em vs .14em) | lintas halaman |
| R2 | RENDAH | Indikator fokus tidak konsisten: input ring moss 3.5px, tombol primary pakai outline UA 1px | `index.css:82-98` |
| R3 | RENDAH | Emoji dipakai sebagai ikon (👁 📭 ✖ ✔ ▶ ▾ ⚠) → dibaca screen reader, gaya beda-beda | lintas file |
| R4 | RENDAH | Tabel tanpa `scope="col"`; tidak ada skip-link ke konten utama | `CrudScreen.tsx:157-166` |
| R5 | RENDAH | Skala spacing/padding tidak seragam (`p-4` kartu vs `p-5` modal vs `p-6` konten) + `min-h-[520px]` login | lintas file |
| R6 | RENDAH | Panel foto login menyusut jadi strip 34px di mobile (terlihat rusak) | `LoginPage.tsx:49-52` |

---

## TINGGI

### T1 — Layout pecah di bawah ~700px: tidak ada satu pun kelas breakpoint di shell

**Bukti (kode)** — `layouts/AppShell.tsx`:
- L90 `flex min-h-dvh`, L91 `aside w-[260px] shrink-0 … overflow-y-auto max-h-dvh` — lebar tetap,
  tanpa `md:`/`lg:`, tanpa off-canvas/hamburger (pencarian `md:`/`sm:`/`lg:` di seluruh
  `AppShell.tsx` = **0**).
- L149 `main flex-1 min-w-0` — `min-w-0` membuat kolom kanan *boleh* menyusut tanpa batas.
- Konten: L166 `div p-6 overflow-x-hidden` — `overflow-x-hidden` **memotong**, bukan
  menggulir, sehingga elemen terpotong tanpa affordance scroll yang jelas.

**Bukti (pengukuran headless, `?` identik untuk semua role admin)**

| Viewport | `document.scrollWidth` | Lebar `aside` | Lebar `main` | Kartu pertama |
|---|---|---|---|---|
| 390px (HP) | **641px → overflow 251px** | 260 | **130px** | terpotong |
| 640px | 641px (1px) | 260 | 332px | 332px |
| 700px | 700px ✓ | 260 | 392px | 392px |
| 1024px | 1024px ✓ | 260 | 716px | 716px |

Di 390px halaman `/meja`: `scrollWidth` **627 vs clientWidth 390**, dan `.vsf-table`
`clientWidth == scrollWidth == 1004px` → **wadah tabel tidak membatasi lebar**, sehingga
overflow menular ke halaman, bukan ke dalam `overflow-auto`. Screenshot mobile
menunjukkan seluruh kartu, judul topbar, tombol `Edit/Hapus` terpotong — praktis tidak
bisa dipakai di HP/tablet operasional.

**Dampak**: alur login→dashboard→meja→tambah **putus total di perangkat bergerak**;
sidebar 260px + padding 48px menyisakan <340px konten pada 640px.

**Usulan perubahan (spesifikasi)**

1. `src/layouts/AppShell.tsx`
   - `aside`: → `fixed inset-y-0 left-0 z-40 w-[260px] bg-sidebar … -translate-x-full
     transition-transform duration-200 md:translate-x-0 md:static md:z-auto`
   - tambah state `const [navOpen, setNavOpen] = useState(false)`; backdrop saat `navOpen`:
     `<div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setNavOpen(false)} />`
   - `SideItem`: `onClick={() => setNavOpen(false)}` (tutup menu setelah memilih).
   - `header`: tambah tombol hamburger kiri `md:hidden`
     `<button type="button" aria-expanded={navOpen} aria-controls="garap-sidebar" aria-label="Buka menu"
       className="md:hidden -ml-1 rounded-lg p-2 hover:bg-slate-100">≡</button>`;
     beri `id="garap-sidebar"` pada `aside`.
   - header `px-6` → `px-4 md:px-6`; sembunyikan jam & badge bila kecil:
     `<div className="hidden sm:flex …">` untuk `StatusBadge` + jam.
   - `main`: `flex-1 min-w-0 md:pl-[260px]` (karena aside kini `fixed`), content wrapper
     `p-4 md:p-6 overflow-x-auto`.
2. `src/components/CrudScreen.tsx` L121 & L152:
   - pembungkus halaman: `mx-auto max-w-[1180px] min-w-0 grid gap-4`.
   - `<table className="min-w-[640px] w-full text-[13px]">` + pembungkus
     `overflow-x-auto` (scroll terjadi di dalam kartu, bukan halaman).
3. Halaman lain (`DashboardPage`, `SensorRealtimePage`, `TanamSayaPage`, `notifLaporanPages`,
   `userProfilPages`): semua memakai pola identik `mx-auto max-w-[1180px] grid gap-4` —
   cukup tambahkan `min-w-0` dan `overflow-x-auto` pada pembungkus tabel (pola sama dengan #2).

---

### T2 — State error dan state kosong tampil bersamaan (dan tidak ada "coba lagi")

**Bukti (kode)**: `CrudScreen.tsx` L143-150 merender `listError` **tanpa syarat**;
L181-201 merender empty state hanya dari `rows.length === 0` — keduanya independen.

**Bukti (render sungguhan, `GET /meja` → 500 lewat mock CDP)**: layar menampilkan
**keduanya** — banner merah `✖ Terjadi kesalahan pada server.` **dan** di bawahnya
`📭 Belum ada data — Belum ada data toolbar — meja tanam — tambah data pertama untuk memulai.`
dengan tombol **Tambah Data Pertama**.

**Dampak**: operator membaca "tidak ada data" saat sebenarnya request gagal, lalu disuruh
menambah data → duplikasi/kehilangan kepercayaan; **tidak ada affordance retry** pada
banner error; CTA salah sasaran.

**Usulan perubahan (spesifikasi)** — `src/components/CrudScreen.tsx`:
- Tambah prop `onRetry?: () => void`.
- Ganti struktur `<tbody>` menjadi mutually exclusive:
  ```tsx
  {loading ? <RowLoading/> : listError ? <RowError/> : rows.length === 0 ? <RowEmpty/> : rows.map(...)}
  ```
  - `RowError`: `<td colSpan={colSpan} className="px-3 py-8 text-center">` →
    `<div role="alert" className="grid justify-items-center gap-2 py-4">
       <span className="text-[28px]" aria-hidden>⚠️</span>
       <b className="text-slate-700">Gagal memuat data</b>
       <span className="text-[13px]">{listError}</span>
       {onRetry && <button type="button" className="vsf-btn-primary mt-1" onClick={onRetry}>Muat ulang</button>}
     </div>`
  - `RowEmpty`: hanya saat `!loading && !listError && rows.length === 0`.
- `src/pages/masterPages.tsx`: teruskan `onRetry={reload}` pada `<CrudScreen>` Meja & Ambang
  (`reload` sudah tersedia dari `useApiList`, L198/L440).

---

### T3 — Teks internal/dev & placeholder wireframe tampil di layar produksi

**Bukti (render sungguhan + kode)**

| Apa yang dilihat user | Sumber |
|---|---|
| Judul toolbar `TOOLBAR — MEJA TANAM` | `masterPages.tsx:518` `title="Toolbar — Meja Tanam"` → `CrudScreen.tsx:124` (varian sama di `masterPages.tsx:246,734`, `stagePages.tsx:156,253,292,329,516`, `userProfilPages.tsx:16`) |
| Empty state `Belum ada data **toolbar — meja tanam** — tambah data pertama…` (kalimat rusak) | `CrudScreen.tsx:188` `title.toLowerCase()` |
| Kartu **"Catatan struktur & state"**: *"Live: GET/POST/PUT/DELETE /meja (Bearer JWT)"*, *"Error kontrak: 401 → redirect login · 422 → pesan per-field … · 403 → mode demo."* | `CrudScreen.tsx:221-232` + `masterPages.tsx:571-576,783-788,296-301`, juga `stagePages`, `notifLaporanPages`, `userProfilPages` |
| Login: `LATAR FOTO HIDROPONIK + overlay gelap`, `Logo (lingkaran Arutmin)`, `Kartu login` | `LoginPage.tsx:50-55` |
| Dashboard: label `Hero sambutan + aksi cepat`, kotak `logo`, teks `▶ link "Detail Grafik" per kartu → halaman Sensor Real-Time` | `DashboardPage.tsx:5,18-20,44` |
| Label wireframe di tiap section (`Toolbar`, `Tabel data peremajaan`, `Baris kontrol grafik`, `Catatan struktur & state`) | semua halaman mock |

**Dampak**: terlihat seperti build demo; kalimat empty state tidak natural/bahasa Inggris-
campur; **membocorkan detail kontrak API & skema error** ke user akhir (info yang tidak
mereka butuhkan dan menaikkan persepsi "ini masih mentah").

**Usulan perubahan (spesifikasi)**

1. `src/components/CrudScreen.tsx` — pisahkan dua prop:
   - `title` (user-facing, contoh `"Meja Tanam"`, `"Semai"`), yang dirender di L124;
   - `moduleName` (opsional) untuk empty state; hapus interpolasi `title.toLowerCase()`
     di L188 → `Belum ada data {moduleName} — tambah data pertama untuk memulai.`
2. Notes card L221-232: bungkus `{import.meta.env.DEV && notes && (...)}` (prod hilang,
   dev tetap ada) — atau pindahkan ke disclosure kecil `detail/summary` berlabel
   **"Info teknis (dev)"** yang hanya dirender saat `import.meta.env.DEV`.
3. `src/pages/LoginPage.tsx`:
   - L50-52 → ganti placeholder dengan aset nyata:
     `<div className="hidden lg:flex items-center justify-center rounded-card bg-[url('/hero-hidroponik.jpg')] bg-cover bg-center text-white/80">` 
     (aset sudah ada: `src/assets/hero.png`) **atau** hapus panel bila aset belum siap;
   - L55-57 → `<img src="/logo-arutmin.svg" alt="Logo PT Arutmin Indonesia" className="h-[56px] w-[56px]" />` (jika belum ada → sembunyikan, jangan menampilkan teks "Logo (lingkaran Arutmin)");
   - L54 `Kartu login` → ganti dengan eyebrow nyata, mis. `Masuk ke GARAP`.
4. `src/pages/DashboardPage.tsx`:
   - L5 → `"Selamat datang"` (hapus label wireframe);
   - L18-20 kotak `logo` → `<img>`/`hidden sm:block`;
   - L44 → **hapus**, ganti dengan link nyata (lihat T4).

---

### T4 — Tombol mati di Dashboard (layar pertama setelah login) + data statis

**Bukti (kode)**: `DashboardPage.tsx` L13-15 tiga `<button className="vsf-input rounded-full">`
tanpa `onClick`/`Link` (klik → tidak terjadi apa-apa, terverifikasi di runtime);
L29-45 enam kartu metrik hard-code, tiap sub-label berakhiran `• Mati` / `• AUTO`
(padahal sumber datanya bukan API); L44 teks petunjuk dev.

**Dampak**: alur kritis **login → dashboard → …** putus di layar pertama; tombol
"Lihat Grafik Sensor / Mulai Semai Baru / Water Control" tampak utama tetapi mati →
user menganggap fitur rusak; angka "Mati" bisa ditafsirkan perangkat mati padahal cuma
string statis.

**Usulan perubahan (spesifikasi)** — `src/pages/DashboardPage.tsx`:
- L13-15 → `<Link>` dari `react-router-dom` (sudah tersedia di app):
  - `Lihat Grafik Sensor` → `to="/sensor-realtime"` dengan `className="vsf-btn-primary"` (CTA utama)
  - `Mulai Semai Baru` → `to="/semai"` dan `Water Control` → `to="/watercontrol"`
    dengan `className="vsf-btn-secondary"` (lihat S7 — kelas baru)
  - bila role `petani`, sembunyikan `Water Control`/`Mulai Semai Baru` (`role === 'admin' && …`).
- Kartu metrik L36-42 → bungkus `<Link to="/sensor-realtime" className="group rounded-card border border-arutmin-border bg-white p-4 hover:border-arutmin-moss/60 hover:shadow-sm">`
  dan ganti teks L44 jadi `<span className="text-[12px] text-arutmin-forest group-hover:underline">Lihat grafik →</span>`.
- Sub-label: selama data live belum ada, tampilkan asal datanya —
  tambah pill kecil `Data contoh` (`vsf-pill border-amber-500/60 bg-amber-50 text-amber-800`)
  pada section, **dan** jangan menyebut `Mati`/`AUTO` seolah status nyata.

---

### T5 — Modal tanpa manajemen fokus/keyboard dan tanpa peran ARIA

**Bukti (probe keyboard sungguhan via CDP, `/meja`, tombol "+ Tambah")**

| Probe | Hasil |
|---|---|
| `document.activeElement` saat modal terbuka | tetap `BODY` — fokus **tidak dipindah** |
| `Tab` ×4 di dalam modal | pindah ke link **sidebar di belakang modal** (`Dashboard`, `Asisten AI`, `Sensor Real-Time`, `Water Control`) — **tidak ada focus trap** |
| `Escape` | modal **tetap terbuka** |
| Klik backdrop | modal **tetap terbuka** |
| Modal hapus (`role`, `aria-modal`, `aria-labelledby`) | `null`, `null`, `null` |

Kode: `CrudScreen.tsx` L235-273 & L276-313 — `<div className="… vsf-modal-card">` tanpa
`role`; grep seluruh `src` menemukan **0** `onKeyDown`, **0** `.focus()`, **0**
`role="dialog"`; satu-satunya `role="alertdialog"` ada di `AppShell.tsx:177` (modal logout)
yang juga tanpa `aria-labelledby` & tanpa handler Escape.

**Dampak**: screen reader tidak mengenali dialog (bisa membaca konten di belakangnya);
pengguna keyboard "lolos" dari modal ke navigasi; Escape (ekspektasi standar WCAG 2.1.1 /
pola dialog) tidak berfungsi; klik luar tidak membatalkan.

**Usulan perubahan (spesifikasi)** — `src/components/CrudScreen.tsx` (kedua modal) +
`src/layouts/AppShell.tsx:175-192` (modal logout, pola sama):
- Struktur card modal:
  ```tsx
  <div ref={cardRef} role="dialog" aria-modal="true"
       aria-labelledby="crud-form-title" aria-describedby="crud-form-desc"
       tabIndex={-1} className="w-full max-w-[520px] rounded-card bg-white p-5 vsf-modal-card max-h-[90vh] overflow-auto">
    <div id="crud-form-title" className="…text-[16px] font-bold">…</div>
  ```
- `useEffect(() => { if (open) cardRef.current?.focus() }, [open])` — pindahkan fokus ke judul
  (beri `tabIndex={-1}`), dan **kembalikan fokus ke pemicu** saat tutup (simpan referensi
  elemen pemicu saat `setFormOpen(true)`).
- Handler keyboard global saat modal terbuka:
  - `Escape` → `onFormCancel?.() ?? setFormOpen(false)` (**diblokir saat** `submitting`/`deleting`);
  - `Tab` → cycle di antara `button:not(:disabled), input:not(:disabled), select, a[href]`
    yang ada di dalam `cardRef`.
- Backdrop: `onClick={(e) => { if (e.target === e.currentTarget && !submitting) …tutup }}`
  → pasang pada `<div className="fixed inset-0 z-50 … vsf-modal-backdrop">`.
- Konten di belakang: saat modal terbuka set `<div className="flex min-h-dvh" inert={open}>`
  (React 19 mendukung `inert`) agar AT & klik tidak menembus.
- Tombol tutup ikon `×` di kanan-atas (`aria-label="Tutup"`), agar ada jalur tutup yang terlihat.

---

### T6 — Sidebar menampilkan semua menu untuk semua role → redirect senyap

**Bukti (render sungguhan)**: dengan sesi `role='petani'`, `navCount` sidebar = **19 link**
(sama persis dengan admin) dan navigasi ke `http://…/meja` berakhir di
`http://…/dashboard` **tanpa pesan apa pun** (`RequireAuth` → `<Navigate to="/dashboard" replace />`,
`router.tsx:17`, `RequireAuth.tsx:17`).

**Dampak**: petani melihat "Manajemen User", "Dosing", "Master Data", "Keluar"… menekan
→ kembali ke dashboard tanpa penjelasan → dianggap "halaman rusak/ditolak"; juga
membocorkan struktur menu admin.

**Usulan perubahan (spesifikasi)**
1. `src/layouts/AppShell.tsx` — strukturkan menu sebagai data dan filter per role:
   ```tsx
   const NAV: { group: string; items: { to: string; label: string; allow: Role[] }[] }[] = [...]
   items.filter(i => i.allow.includes(role)).map(...)
   ```
   Atau minimal: `<SideItem to="/meja" allow={['admin','demo']}>` yang `return null` bila
   `!allow.includes(role)`.
2. Alternatif (bila menu memang ingin terlihat): tetap render tapi nonaktif —
   `aria-disabled="true" className="… opacity-40 cursor-not-allowed"` + catatan
   "Khusus admin" pada group label, dan **hapus** `NavLink` menjadi `<span>`.
3. `src/components/RequireAuth.tsx` — bila redirect tetap terjadi, kirim pesan:
   `<Navigate to="/dashboard" replace state={{ notice: 'Halaman ini hanya untuk admin.' }} />`
   lalu `AppShell` membaca `location.state.notice` dan menampilkan banner
   `role="status"` (pola `vsf-banner` yang sudah ada).

---

## SEDANG

### S1 — Target klik aksi baris terlalu kecil (22×18px dan 37×18px)

**Bukti**: pengukuran runtime tombol `Edit` = **22×18 px**, `Hapus` = **37×18 px**
(`CrudScreen.tsx:319-345` — hanya `text-[12px] font-semibold … underline`, tanpa padding).
Di bawah target minimum WCAG 2.2 (24×24) dan jauh dari rekomendasi 44×44 — sulit
dipukul di layar sentuh, apalagi dalam tabel yang sedang digulir.

**Usulan**: ubah `BtnEdit`/`BtnHapus` menjadi:
```tsx
<button type="button" onClick={…}
  className="inline-flex items-center gap-1 min-h-[36px] rounded-lg px-2.5 py-1.5
             text-[12px] font-semibold focus-visible:ring-2 focus-visible:ring-arutmin-moss
             hover:bg-arutmin-mint/40 text-arutmin-forest">
```
(merah: `text-red-700 hover:bg-red-50`), tambahkan ikon kecil (✏ / 🗑 atau SVG) +
`aria-label={"Ubah " + label}` / `aria-label={"Hapus " + label}`, dan beri
`whitespace-nowrap` pada `<td>` aksi.

### S2 — Kontras gagal AA pada indikator navigasi & sel tabel

**Bukti (dihitung, Lampiran A)**:
- Teks putih pada `bg-activePill` (`#6B9D4A → #5A8740`) ≈ **3.75:1** — item nav aktif
  (`AppShell.tsx:39`) 14px semibold → butuh 4.5:1.
- Kolom **ID** `text-slate-400` (`#94A3B8` di putih) = **2.56:1** (`masterPages.tsx:232,504,720`).
- `text-slate-500` di atas header tabel `bg-arutmin-mint/25` = **4.37:1** (tepat di bawah 4.5).

**Usulan**:
- Nav aktif → ganti gradasi menjadi lebih gelap:
  `isActive ? 'bg-[linear-gradient(135deg,#3F5C41,#2D452F)] text-white font-semibold …'`
  (putih di `#3F5C41` = 7.45:1), **atau** pertahankan `bg-activePill` tapi tambahkan
  `text-white font-bold` + border kiri `border-l-4 border-white/70` dan uji ulang kontras.
- ID: `text-slate-400` → `text-slate-500` (4.76:1).
- Header tabel: `text-arutmin-forest` sudah 9:1 ✓ — pastikan tidak ada varian
  `text-slate-500` di atas mint (pindah ke `text-slate-600` = 6.97:1).

### S3 — Halaman mock: tombol Edit/Simpan/Hapus tampak hidup tapi tidak melakukan apa-apa

**Bukti** *(setelah pembacaan ulang kode terkini — lihat catatan metode)*:
- `<BtnEdit />` **tanpa** `onClick` tersisa di `stagePages.tsx:277` (Peremajaan),
  `stagePages.tsx:314` (Pendewasaan), `stagePages.tsx:353` (Panen) dan
  `userProfilPages.tsx:41` (Manajemen User) → klik tidak berubah apa pun.
  (Sudah menyala & ber-`onClick`: Semai `stagePages.tsx:88,156`, Durasi Siklus
  `stagePages.tsx:396,589`, Jenis Tanaman `masterPages.tsx:127,304` — ketiganya kini
  memanggil API.)
- Form mock tidak terkendali (hanya `placeholder`/`defaultValue`) → di `CrudScreen.tsx:267-269`
  `onSubmit` tidak ada → tombol **Simpan menutup modal** seolah tersimpan; `onDelete` tidak ada →
  **"Ya, hapus" menutup modal** tanpa menghapus (L302-305).
- Baris data statis → empty state & API tidak pernah tercapai di halaman ini.
- Inkonsistensi yang mengikuti: halaman bertetangga dengan pola identik kini berbeda
  perilaku (Sebagian live, sebagian mock) **tanpa penanda apa pun di layar**.

**Usulan**:
- Tambahkan slot `badge`/`isMock` di toolbar `CrudScreen` → render
  `<span className="vsf-pill border-amber-500/60 bg-amber-50 text-amber-800">Mock — belum tersambung API</span>`.
- Bila `onSubmit`/`onDelete` tidak ada: **jangan tutup modal**; ganti label tombol jadi
  `Tutup` dan tampilkan `role="status"` `"Fitur ini belum tersambung ke API (gelombang berikutnya)."`
  Atau `disabled` + `title="Menyusul gelombang berikutnya"` pada `BtnEdit`.
- Setelah Peremajaan/Pendewasaan/Panen/Manajemen User pindah ke API, hapus badge ini.

### S4 — Setelah simpan/hapus, daftar dimuat ulang tanpa indikator

**Bukti**: `lib/crudApi.ts:128` — `loading` diinisialisasi `true` dan di-set `false` sekali;
`reload()` (L156-158) tidak mengubahnya → user hanya melihat `✔ Data meja tersimpan.` lalu
tabel diam; bila `reload()` gagal, error muncul **tanpa** state memuat.

**Usulan**:
- `useApiList` → tambah `refreshing: boolean` (set `true` di awal `load()` bila sudah pernah
  sukses, `false` di `finally`).
- `CrudScreen` → prop `refreshing?: boolean`; saat `refreshing` tampilkan di atas tabel
  `<div role="status" className="mt-2 text-[12px] text-slate-500">Memperbarui data…</div>`
  atau set `aria-busy` pada `<table>`; jangan mengosongkan baris lama (perilaku saat ini sudah benar).

### S5 — Pesan validasi memakai nama kolom teknis (snake_case)

**Bukti**: `masterPages.tsx:343-363,605-618` (juga `:104` di Jenis Tanaman):
`"Kolom meja wajib diisi."`, `"Kolom jumlah_lubang harus antara 1 dan 1000000."`,
`"Kolom kapasitas_penampung_l harus lebih besar dari 0."`, `"Kolom deadband tidak boleh negatif."`

**Dampak**: operator melihat nama field database; kalimat panjang dan tidak manusiawi
(meski disengaja untuk menyamakan dengan 422 Zod).

**Usulan** (tanpa mengubah kontrak backend):
- Buat `LABEL2MSG: Record<string, string>` lokal, mis.
  `meja: 'Nama meja wajib diisi.'`, `jumlah_lubang: 'Jumlah lubang wajib diisi (angka 1–1.000.000).'`,
  `kapasitas_penampung_l: 'Kapasitas penampung harus lebih besar dari 0.'`;
- pesan **klien** memakai peta ini; pesan **422 backend** tetap ditampilkan apa adanya
  (hanya ketika datang dari server), atau di-remap bila cocok dengan kunci yang sama.
- Tandai field wajib di label: `<Field label="Nama meja" required />` → render `<span className="text-red-700" aria-hidden> *</span>`
  dan `aria-required="true"` pada input (saat ini **tidak ada penanda wajib** sama sekali).

### S6 — Indikator status tidak mencerminkan keadaan sebenarnya

**Bukti**:
- `AppShell.tsx:158` `<StatusBadge tone="online" label="Alat Terhubung" />` — **hard-code**,
  selalu hijau/berdenyut, tidak peduli hasil API/offline.
- `DemoBanner.tsx:9,24` — hitung mundur `menit` dimulai dari **60** dan berkurang 1/menit
  sejak banner ter-mount, bukan sisa waktu sesi demo yang sebenarnya.

**Usulan**:
- Teruskan status nyata dari data (mis. prop `online` dari hook sensor / `navigator.onLine`
  listener) → `tone={online ? 'online' : 'offline'}`, label `Alat Terhubung` / `Perangkat offline`;
  bila status belum ada, ganti label menjadi `Perangkat terhubung (status manual)` atau
  sembunyikan sampai ada sumber data.
- `DemoBanner`: terima `expiresAt` (dari respons login/demo) → hitung sisa menit dari
  `expiresAt - Date.now()`, bukan state lokal `useState(60)`.

### S7 — Tombol sekunder & tombol bahaya tidak memiliki komponen sendiri

**Bukti**: `vsf-input rounded-full` dipakai sebagai **tombol sekunder di 21 tempat
(10 file)** — kelas input dipakai untuk tombol (border tipis, `outline-none`, tanpa gaya hover
khusus); tombol `bg-red-700 px-4 py-2 text-[13px] font-semibold rounded-full` diduplikasi
3× (`CrudScreen.tsx:300`, `AppShell.tsx:186`, `TanamSayaPage.tsx:106`).

**Usulan** — `src/index.css` di `@layer components`:
```css
.vsf-btn-secondary {
  @apply bg-white border border-arutmin-border2 rounded-full px-4 py-2
         text-[13px] font-semibold text-slate-700 inline-flex items-center justify-center gap-2;
}
.vsf-btn-secondary:hover:not(:disabled) { @apply border-arutmin-moss/60 bg-arutmin-mint/30; }
.vsf-btn-danger {
  @apply rounded-full bg-red-700 px-4 py-2 text-[13px] font-semibold text-white
         inline-flex items-center justify-center gap-2;
}
.vsf-btn-danger:hover:not(:disabled) { filter: brightness(1.08); }
.vsf-btn-danger:disabled { @apply opacity-60 cursor-not-allowed; }
```
lalu ganti 21 pemakaian `vsf-input rounded-full` → `vsf-btn-secondary` dan 3 duplikat
merah → `vsf-btn-danger` (termasuk spinner `vsf-spinner` di dalamnya).

### S8 — Error login tidak diumumkan ke screen reader & tanpa autofokus

**Bukti**: `LoginPage.tsx:63-67` banner `serverError` **tanpa `role="alert"`**;
L81 & L105 error field **tanpa `role` dan tanpa `aria-describedby`** (padahal
`aria-invalid` sudah ada di L79/94); tidak ada `autoFocus`/`ref.focus()` pada input pertama;
perbandingan: `CrudScreen.tsx:361` (`FieldError`) **sudah** `role="alert"` → inkonsisten.

**Usulan** — `src/pages/LoginPage.tsx`:
- banner: `role="alert" aria-live="assertive"`;
- error field: `id="login-username-error"` + `role="alert"`, dan pada input
  `aria-describedby={errors.username ? 'login-username-error' : undefined}`;
- `<input id="login-username" autoFocus />` (aman: hanya satu form di halaman login);
- tombol show/hide password sudah benar (`aria-label` ada, L100) ✓.

---

## RENDAH

**R1 — Eyebrow heading tidak konsisten.** Varian `text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold`
dipakai 39×; **6× tanpa `font-bold`** (`DashboardPage.tsx:5`, `LoginPage.tsx:54`, dst.),
2× memakai `tracking-[.12em]`, 1× `text-[10px]` (topbar `AppShell.tsx:153`).
→ Satukan ke satu utilitas `.vsf-eyebrow { @apply text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold; }`
di `index.css` dan pakai di semua section header; topbar subtitle naikkan ke `text-[11px]`.

**R2 — Indikator fokus tidak konsisten (terverifikasi runtime).** Input & tombol kecil
mendapat ring moss `box-shadow rgba(107,157,74,.35) 0 0 0 3.5px` (`index.css:82-85`),
sedangkan `button[type=submit]` `vsf-btn-primary` jatuh ke outline UA:
`outline: 1px auto rgb(0,95,204)` (terbaca via CDP) — tipis dan beda warna.
→ tambah di `index.css`:
`.vsf-btn-primary:focus-visible, .vsf-btn-secondary:focus-visible, .vsf-btn-danger:focus-visible { outline: none; box-shadow: theme('boxShadow.focusMoss'); }`

**R3 — Emoji dipakai ikon.** `👁/🙈` (login), `📭` (empty), `✖/✔` (banner), `▶` (dashboard),
`▾` (topbar), `⚠` (notes). Screen reader membaca emoji; ukuran/gaya tidak konsisten antar OS.
→ ganti dengan SVG inline 16×16 + `aria-hidden="true"`; untuk ikon status pertahankan
teks (`✔` → `<CheckIcon aria-hidden /> Data tersimpan`).

**R4 — Semantik tabel & navigasi.** `<th>` di `CrudScreen.tsx:157-166` tidak punya
`scope="col"`; tidak ada skip-link; `<main>` belum punya `id="konten-utama"`.
→ tambah `scope="col"` pada semua `<th>`, dan di `AppShell`:
`<a href="#konten-utama" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-3 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2">Lewati ke konten utama</a>`
+ `<div id="konten-utama" tabIndex={-1}>` pada konten `<Outlet/>`.

**R5 — Skala spacing tidak seragam.** Konten `p-6`, kartu `p-4`, modal `p-5`, form login
`p-5`, toolbar `gap-3` vs `gap-2` antar halaman; grid halaman `gap-4` konsisten ✓.
→ tetapkan skala: konten `p-4 md:p-6`, kartu `p-4`, modal `p-5`, gap antar kartu `gap-4`,
gap dalam kartu `gap-3`; deklarasikan sebagai utilitas `.vsf-section`/`.vsf-card` agar tidak
terulang manual.

**R6 — Panel "LATAR FOTO" login menyusut jadi strip 34px di mobile.** Pengukuran 390px:
`.vsf-card` pertama = 390×**34px** (teks placeholder terpotong) sementara form 470px;
grid `min-h-[520px]` dipenuhi oleh form saja (`LoginPage.tsx:49`).
→ lihat T3 (ganti aset), atau `hidden lg:flex` untuk panel foto +
`<img className="lg:hidden w-full h-[120px] object-cover rounded-card" />` bila ada aset.

---

## 3 Quick-win untuk gelombang berikutnya

> Ketiganya menyentuh file kecil, tidak menyentuh API, dan dampaknya langsung terlihat.

**QW1 — "Satu state per layar": perbaiki error/empty state + bersihkan teks dev di tabel** *(±1 jam)*
- `components/CrudScreen.tsx`: prop `onRetry`, render `loading → error → empty → data`
  yang saling eksklusif (T2), tombol **Muat ulang** pada error.
- Ganti `title` user-facing + hapus `title.toLowerCase()` dari kalimat empty state (T3).
- Bungkus kartu **"Catatan struktur & state"** dengan `import.meta.env.DEV` (T3).
- `pages/masterPages.tsx`: kirim `title="Meja Tanam"`/`"Ambang Sensor"` + `onRetry={reload}`.
- **Uji**: matikan backend (atau mock 500) → hanya tampil banner error + tombol Muat ulang;
  mock `[]` → hanya empty state; mock data → tabel.

**QW2 — "Semua tombol hidup": tautkan Dashboard + perbesar target aksi baris** *(±1 jam)*
- `pages/DashboardPage.tsx`: 3 tombol hero → `<Link>` (L13-15), 6 kartu metrik → `<Link>`
  ke `/sensor-realtime`, hapus baris `▶ link "Detail Grafik"` (T4).
- `components/CrudScreen.tsx` (`BtnEdit`/`BtnHapus`): padding + `min-h-[36px]` +
  `aria-label` (S1).
- **Uji**: klik tiap tombol dashboard → menuju rute yang benar; ukur target ≥36px tinggi.

**QW3 — "Aksesibilitas dasar dalam 3 tempat"** *(±45 menit)*
- `index.css`: `:focus-visible` moss untuk semua tombol (R2) + kontras nav aktif lebih gelap
  (S2) + `text-slate-400` → `text-slate-500` di kolom ID.
- `pages/LoginPage.tsx`: `role="alert"` + `aria-describedby` + `autoFocus` (S8).
- `components/CrudScreen.tsx`: `role="dialog" aria-modal aria-labelledby`, fokus ke judul,
  `Escape` menutup, backdrop klik menutup (T5) + `scope="col"` (R4).
- **Uji**: keyboard-only: buka modal → fokus masuk modal → `Escape` menutup → fokus kembali
  ke tombol pemicu; axe/Lighthouse tanpa pelanggaran contras pada nav aktif.

---

## Verifikasi alur kritis: login → dashboard → meja → tambah

| Langkah | Hasil | Bukti |
|---|---|---|
| Buka `/login` (1440 & 390px) | ✓ render rapi, tidak overflow (`scrollWidth` 390 = viewport) | screenshot `01`, `measure-390` |
| Submit kosong | ✓ pesan inline `Wajib isi nama pengguna.` / `Wajib isi kata sandi.` muncul di bawah field yang benar, layout tidak melompat | screenshot `02` |
| Tombol submit saat memproses | ✓ spinner `vsf-spinner` + teks `Memproses…`, button `disabled` | `LoginPage.tsx:107-110` |
| Error server | ⚠ banner tampil tapi **tanpa `role="alert"`** (S8) | `LoginPage.tsx:63-67` |
| Redirect sesudah login | ✓ `navigate(redirect \|\| '/dashboard')`; role `petani` → `/tanam` | `auth.tsx:66` |
| Nav aktif di sidebar | ✓ `aria-current="page"` terpasang, pill hijau menandai `Meja Tanaman` | runtime + screenshot `07` |
| Filter role menu | ✗ **tidak ada** → petani diredirect senyap (T6) | runtime `role=petani` → `/dashboard` |
| `/meja` load data | ✓ spinner `Memuat data…` saat loading awal (mock 200) | `CrudScreen.tsx:172-180` |
| `+ Tambah` → modal | ✓ modal terbuka, field berlabel, placeholder sesuai | screenshot `08` |
| Simpan kosong | ✓ error inline per-field muncul (`role="alert"` pada `FieldError`) | screenshot `09` |
| Simpan valid (POST 200) | ✓ modal tertutup, `✔ Data meja tersimpan.` (`role="status"`, hilang otomatis 4dt), tabel ikut segar | screenshot `10` |
| `GET` gagal (500) | ✗ **banner error + empty state tampil bersamaan**, tanpa retry (T2) | screenshot `12` |
| `GET` `[]` | ✓ empty state + CTA, tapi teksnya rusak & judulnya wireframe (T3) | screenshot `11` |
| Hapus → konfirmasi | ✓ modal menyebut nama data, tombol merah, spinner `Menghapus…`, `deleteError` punya `role="alert"`; **tanpa role dialog/Escape/fokus** (T5) | screenshot `13` |
| `/ambang` (GET + PUT) | ✓ hanya `Edit`, `hideAdd`, `submitLabel="Simpan Perubahan"`, field sensor readonly bergaya `bg-slate-50` | screenshot `15/16` |
| Mobile `/meja` | ✗ overflow horizontal halaman (627 > 390), tombol aksi terpotong (T1) | runtime `MEJA_MOBILE` |

**Kesimpulan alur**: jalur inti *bekerja* di desktop, tetapi terhambat 3 hal yang membuatnya
terasa setengah jadi: teks dev di layar (T3), state error/empty yang menyesatkan (T2), dan
**tidak dapat dipakai sama sekali di mobile** (T1).

---

## Yang sudah baik (pertahankan)

- **Validasi inline** dengan pesan di bawah field, `noValidate`, `aria-invalid`, nilai input
  tidak hilang saat error (`LoginPage.tsx:15-45`, `masterPages.tsx:458-483`).
- **Kontrak error seragam** terjemahan status → pesan manusia (`lib/crudApi.ts:37-65`),
  422 per-field, 401 → logout + redirect, 403 demo.
- **Konfirmasi hapus selalu lewat modal** dengan menyebut nama data + `role` pada modal
  logout (`AppShell.tsx:177`).
- **Loading & sukses punya peran ARIA**: `role="status"` flash (`CrudScreen.tsx:135`),
  spinner + label teks (bukan spinner saja).
- **`prefers-reduced-motion` dihormati** (`index.css:182-191`) — semua animasi
  stagger/fade/shimmer dimatikan.
- **Label input terhubung** (`htmlFor`+`id` di login; `Field` membungkus `<label>`), toggle
  password punya `aria-label` berganti-isi.
- **Focus ring input** moss + `boxShadow.focusMoss` konsisten (`index.css:82-85`).

---

## Lampiran A — Kontras warna (dihitung, WCAG 2.1)

| Elemen | Foreground / background | Rasio | Status AA (teks normal 4.5:1) |
|---|---|---|---|
| Nav aktif (teks putih `bg-activePill`) | `#FFFFFF` / `#6B9D4A→#5A8740` | **3.75** | ✗ gagal |
| Kolom ID `text-slate-400` | `#94A3B8` / `#FFFFFF` | **2.56** | ✗ gagal |
| `text-slate-500` di header tabel mint/25 | `#64748B` / `#F1F7F0` | **4.37** | ✗ (tipis) |
| `text-slate-500` label 11px di kartu | `#64748B` / `#FFFFFF` | 4.76 | ✓ (tipis) |
| Banner error | `#B91C1C` / `#FEF2F2` | 5.91 | ✓ |
| Banner peringatan amber | `#92400E` / `#FFFBEB` | 6.84 | ✓ |
| Flash sukses / DemoBanner | `#2D452F` / mint 30–40% | 9.3–9.6 | ✓ |
| Label sidebar `text-white/60` | putih 60% / `#223A24–#2D452F` | 4.96–5.54 | ✓ |
| Item nav `text-white/85` | putih 85% / `#2D452F` | 8.10 | ✓ |
| Header tabel `text-arutmin-forest` | `#2D452F` / mint 25% | ~9.5 | ✓ |
| Dot status `moss` non-teks | `#6B9D4A` / putih | 3.21 | ✓ (≥3:1 komponen) |

## Lampiran B — Pengukuran viewport (headless Chrome, dev `:5199`)

| Halaman | Viewport | `scrollWidth` vs `clientWidth` | Catatan |
|---|---|---|---|
| `/login` | 390 | 390 / 390 ✓ | form 470px, input 348px, panel foto **34px** |
| `/login` | 1440 | ✓ | grid `lg:grid-cols-[1.4fr_420px]` |
| `/dashboard` | 390 | **641 / 390 ✗** | aside 260, main **130** |
| `/dashboard` | 640 | 641 / 640 (1px) | main 332px — sangat sempit |
| `/dashboard` | 700 | 700 / 700 ✓ | main 392px |
| `/dashboard` | 768 | 768 / 768 ✓ | grid metrik `sm:grid-cols-2` |
| `/dashboard` | 1024 | ✓ | main 716px |
| `/meja` (data mock, kolom lebar) | 390 | **627 / 390 ✗** | `.vsf-table` 1004px tidak terbatas |
| Modal CRUD | 1440 | — | fokus tetap `BODY`; Escape/backdrop tidak menutup |

*(Screenshot sementara tersimpan di `~/.hermes/cache/scratch/shots/*.png` — di-cache 24 jam,
bukan bagian dari repo.)*

## Lampiran C — Checklist re-test setelah perbaikan

- [ ] 390px: sidebar off-canvas + hamburger, halaman **tidak** overflow horizontal
      (`document.scrollWidth == innerWidth`).
- [ ] `/meja` dengan backend mati → hanya banner error + tombol **Muat ulang** (tidak ada "Belum ada data").
- [ ] `/meja` dengan `[]` → hanya empty state, kalimat: `Belum ada data meja tanam — tambah data pertama…`
- [ ] Prod build (`npm run build`): kartu "Catatan struktur & state" & label wireframe **tidak ada**.
- [ ] Dashboard: ketiga tombol hero berpindah halaman; kartu metrik menuju `/sensor-realtime`.
- [ ] Keyboard: `Tab` ke `+ Tambah` → `Enter` → fokus di field pertama modal → `Escape` menutup →
      fokus kembali ke tombol `+ Tambah`; `Tab` tidak pernah mencapai sidebar selama modal terbuka.
- [ ] role `petani`: menu di sidebar hanya item yang berhak diakses.
- [ ] Kontras: nav aktif ≥ 4.5:1, kolom ID ≥ 4.5:1 (axe DevTools: 0 pelanggaran kontras).
- [ ] Target `Edit`/`Hapus` ≥ 36px tinggi dan punya `aria-label`.
