# RN Mobile — Irisan 2 (Detail Sensor + Grafik) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** Layar S11 Detail Sensor (5 keadaan) dan S12 Grafik (3 keadaan) di `react_native_app/`, persis sesuai `.pen`, memakai data nyata.

**Architecture:** Dua layar tersembunyi di grup `(tabs)` (`sensor`, `grafik`), dibuka dari kartu metrik Beranda. Logika murni (keadaan layar, bucket grafik) di `sensorDetailView.ts` dan `chartView.ts` supaya bisa dites tanpa render. Data lewat TanStack Query: `/api/latest-sensor` (kunci `['latest-sensor']`, dibagi dengan Beranda) dan `/monitoring/chart-data`.

**Tech Stack:** yang sudah ada (Expo Router, TanStack Query, lucide-react-native, StyleSheet). Grafik batang dari `View`, tanpa library baru.

**Spec:** `docs/superpowers/specs/2026-11-21-rn-mobile-rebuild-design.md`
**Desain:** `.pen` frame S11 `GvR6U`, S11c `GUJAi`, S11d `Pr2kC`, S11e `VT9np` (S11b `ouk3Q` = keadaan Segar); S12 `i4QH2z`, S12b `ZffxI`, S12c `kSKzz`. Komponen: Header `xxN7E`, Tombol Sekunder `E101Z`, Baris Data `S2Ga4R`, Banner `E0Dtg1`, Keadaan Kosong `acBBg`.

## Global Constraints
- Semua token dan aturan dari plan irisan 0 berlaku (warna, radius 20/12, padding layar 16, font Space Grotesk/Inter).
- Kartu di S11 dan S12 memakai bayangan `#0B2A1B` alpha 0x26, y6, blur18 (`shadowDock`), bukan `shadowCard`.
- Backend read-only. Angka contoh `.pen` (6,4 / 1,8 / 78 / 62% / batang 48–96) tidak boleh jadi data.
- Tidak ada tombol aksi dosing: kartu "Status dosing otomatis" hanya teks terkunci (ikon `lock`, warna danger), persis desain.
- Dock tetap tampil di dua layar; tab aktif = Beranda.

## Keputusan yang diambil (dari desain, bisa dikoreksi)
- Judul S11 "pH air" menjadi parameter terpilih lewat query `param` (`ph` bawaan; `tds`, `waterTemp`, `airTemp` dari kartu Beranda). "Parameter lain" tetap empat baris desain: EC, Kelembapan, Level penampung, Status alat.
- Chip grafik hanya tiga: pH air, Nutrisi TDS, Suhu air. Sesuai S12c, Nutrisi TDS menampilkan keadaan "Grafik nutrisi belum tersedia" (ikon `circle-help`) walau datanya ada. Frame itu bernama "Perlu verifikasi"; perlu konfirmasi pemilik.
- Grafik: 6 batang, tiap batang rata-rata 2 jam, 12 jam terakhir, label = jam awal bucket ("04"). Tinggi dinormalisasi ke rentang data.
- Role demo: S11 tampil "Disembunyikan" (S11e). S12 tidak punya frame demo, jadi memakai keadaan kosong S12 tanpa permintaan jaringan.

## Review Focus
- `is_online=false` dengan nilai lama → "Data basi", nilai opacity 0.5, bukan segar.
- Nilai di `anomalies[]` → chip "Anomali" + banner, bukan "Segar".
- `sensor=null` (belum pernah sinkron) → "—", "Belum ada data · perangkat belum pernah sinkron", baris "Tidak diketahui".
- Bucket tanpa bacaan, atau semua nilai sama, tidak boleh membagi nol atau menggambar batang palsu.
- Baris `chart-data` dengan `null`/string numerik/tidak berurutan (kolom numeric Postgres bisa datang sebagai string).
- Query `param` tidak dikenal → pakai `ph`, bukan crash.

### Task 1: Model tampilan Detail Sensor
**Files:** Create `src/features/sensor/sensorDetailView.ts`, Test `__tests__/sensorDetailView.test.ts`
**Consumes:** `LatestSensor`, `jam` dari `src/features/beranda/sensorView.ts`. Perlu menambah `humidity`, `water_level`, `ec_ms_cm` (opsional) pada tipe `LatestSensor.sensor`, dan `water_control?: { valve_state: string } | null`.
**Produces:** `type Param = 'ph'|'tds'|'waterTemp'|'airTemp'`; `parseParam(v: unknown): Param`; `sensorDetailView(d: LatestSensor | undefined, param: Param, role: Role | null): { state: 'segar'|'basi'|'anomali'|'kosong'|'demo'; title: string; value: string; unit?: string; chip?: { label: 'Data basi'|'Anomali'; tone: 'warn' }; meta: string; dim: boolean; rows: { label: string; value: string }[] }`
- [ ] Tes (nama → assert): `segar` → `meta === 'Diperbarui 09.41 · umur 12 detik'` (jam diberikan dari fixture, `seconds_ago: 12`); `basi` → `chip.label==='Data basi'`, `dim===true`, meta memuat `umur 4 menit`; `anomali` → `chip.label==='Anomali'`, meta `Ditandai · 09.41`; `kosong` → `value==='—'`, meta `Belum ada data · perangkat belum pernah sinkron`, baris Status alat `Tidak diketahui`; `demo` → `value==='Disembunyikan'` dan semua `rows[].value==='Disembunyikan'`; `parseParam('x')==='ph'`.
- [ ] Jalankan `npx jest __tests__/sensorDetailView.test.ts`, harus gagal; implement; harus lulus.
- [ ] Format umur: detik < 60 → "N detik", selain itu menit dibulatkan ke bawah ("4 menit"). Label baris: `EC (mS/cm)`, `Kelembapan (%)`, `Level penampung`, `Status alat`; nilai kosong → "Belum ada data". Status alat dari `water_control.valve_state`: `ON` → "Pompa menyala", `OFF` → "Pompa mati".
- [ ] Commit.

### Task 2: Layar Detail Sensor
**Files:** Create `src/features/sensor/SensorDetailScreen.tsx`, `src/app/(tabs)/sensor.tsx`; Modify `src/app/(tabs)/_layout.tsx` (layar `sensor`, `grafik` dengan `href: null`), `src/ui/Dock.tsx` (rute tersembunyi tidak dirender; fokus dipetakan ke `index`), `src/features/beranda/BerandaScreen.tsx` (kartu metrik menjadi `Pressable` → `router.navigate({ pathname: '/sensor', params: { param } })`), `src/features/beranda/sensorView.ts` (tipe).
**Consumes:** `sensorDetailView`, `Header`, `Card`, `Text`, `Banner`, `Button`-sekunder. Perlu varian sekunder (`accent-soft`, teks accent) di `src/ui/Button.tsx`: prop `variant?: 'primary'|'secondary'`.
**Produces:** rute `/sensor?param=…`; `Button` dengan `variant`.
- [ ] Layout mengikuti S11: Header ("Detail sensor", subjudul "Node utama · admin" / "Demo · baca saja"), Kartu Nilai Utama (judul, nilai 38 Space Grotesk, baris Meta dengan chip), tombol sekunder "Riwayat & grafik" → `/grafik?param=…`, Banner Anomali (hanya keadaan anomali, tone warn, judul "Anomali terbaca", isi "Nilai ini ditandai di luar rentang wajar. Bukan contoh ambang aman."), Kartu Parameter, Kartu Dosing.
- [ ] Keadaan muat: skeleton `a0LAo`; galat jaringan: Banner danger + tarik-segarkan.
- [ ] Verifikasi di browser 390x844 lawan `.pen` untuk tiap keadaan (kosong dan demo bisa dipaksa dengan login `demo` dan backend kosong; basi/anomali lewat fixture dev sementara yang tidak di-commit).
- [ ] Commit.

### Task 3: Model grafik
**Files:** Create `src/features/sensor/chartView.ts`, Test `__tests__/chartView.test.ts`
**Produces:** `type ChartParam = 'ph'|'waterTemp'`; `interface MonitoringRow { created_at: string; ph: number|string|null; waterTemp: number|string|null; }`; `chartView(rows: MonitoringRow[], param: ChartParam, now: Date): { empty: boolean; bars: { label: string; height: number | null }[] }` (6 bar; `height` 0..1 atau `null` jika bucket kosong).
- [ ] Tes: 12 jam data merata → 6 bar, label `['04','06','08','10','12','14']` untuk `now` 15.30 lokal (bucket berakhir di jam penuh terdekat ke bawah: batas = `now` dibulatkan ke 2 jam); string numerik `"6.4"` terhitung; baris `null` diabaikan; bucket tanpa baris → `height===null`; semua nilai sama → semua `height===0.5`, tanpa NaN; tanpa baris → `empty===true`; baris tidak berurutan memberi hasil sama.
- [ ] Gagal, implement (rata-rata per bucket, normalisasi min–max), lulus.
- [ ] Commit.

### Task 4: Layar Grafik
**Files:** Create `src/features/sensor/GrafikScreen.tsx`, `src/features/sensor/BarChart.tsx`, `src/app/(tabs)/grafik.tsx`
**Consumes:** `chartView`, `Card`, `EmptyState` (perlu prop `Icon?: LucideIcon` dengan bawaan `Inbox`), `Header`, `Button` sekunder.
- [ ] Layout S12/S12b: Header ("Grafik & riwayat", subjudul "Node utama" / "Nutrisi TDS ppm" saat chip TDS), baris chip (44 tinggi, aktif `accent` teks putih, tidak aktif `surface` + border), Kartu Grafik ("Riwayat pH air" / "Riwayat suhu air", area 180, batang radius 8 `accent`, label 11), meta "Riwayat 12 jam.", tombol "Kembali ke detail sensor" → `/sensor?param=…`.
- [ ] Keadaan: kosong (`line-chart`, "Belum ada riwayat", "Grafik muncul setelah ada data riwayat dari perangkat."); TDS (`circle-help`, "Grafik nutrisi belum tersedia"); demo/galat/muat sebagai keputusan di atas.
- [ ] Tinggi batang: skala ke ruang area 180 minus label; bukan nilai tinggi `.pen`.
- [ ] Verifikasi di browser 390x844 untuk S12, S12b (data nyata), S12c.
- [ ] Commit.

### Task 5: Verifikasi akhir
- [ ] `npx tsc --noEmit` bersih; `npx jest` lulus (termasuk tes lama).
- [ ] Tangkap layar S11 (kosong + data), S12 (kosong + data + TDS); bandingkan dengan `.pen`; catat selisih yang tak bisa persis (bayangan, font).
