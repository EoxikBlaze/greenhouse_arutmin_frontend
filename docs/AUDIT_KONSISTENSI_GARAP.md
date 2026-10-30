# AUDIT KONSISTENSI — GARAP (pasca-G8)

> Audit baca-saja. **Tidak ada kode/dokumen yang diperbaiki, tidak ada commit.**
> Satu-satunya file yang ditulis: `docs/AUDIT_KONSISTENSI_GARAP.md` ini.
> Tanggal audit: 20 Okt 2026 (WITA).

## Metode & bukti

- **Sumber kebenaran**: `backend-nodejs/src/**` (110 rute terdaftar) + server hidup
  `http://127.0.0.1:8000` (proses `node src/index.js` start 20 Okt 04:52 — lebih baru
  dari perubahan `src` terakhir 19 Okt 23:21) + DB live (psql `SELECT` read-only).
- **Rute dihitung otomatis** dari mount `app.use(...)` di `src/index.js` + definisi
  `router.get/post/put/patch/delete` + ekspansi `crudRouter` (6 metode/resource).
- **Probe live bersifat non-mutating**: GET + satu `PUT /meja/999999` dengan body kosong
  (berhenti di `422` sebelum query — tidak ada baris tersentuh). Tidak ada POST/DELETE
  yang menulis data.
- Dihitung ulang dari `docs/openapi.yaml` (23 operasi / 21 path).
- **Snapshot & kerja paralel**: repo sedang disentuh proses/agen lain saat audit — working
  tree berisi WIP **belum di-commit** (`backend-nodejs`: `src/auth.js`, `src/routes/_crud.js`,
  `src/routes/_validate.js`, `package.json`, `test/integration/` — 425 insertions, mtimes
  20 Okt 05:02–05:08; `react-web-app/src/pages/masterPages.tsx`). Audit tidak menyentuhnya.
  **WIP tidak menambah/mengubah satu pun rute** (diff `src/` nol baris
  `router.get/post/put/patch/delete` baru → inventaris 110 rute tetap).
  Server hidup (`start 04:52`) masih menjalankan kode **sebelum** WIP, sehingga hasil probe
  live = perilaku kode ter-commit. Poin yang terdampak ditandai *(WIP)*.

---

## 1. `docs/openapi.yaml` vs kenyataan rute di `src/`

**Rekap: 110 rute di kode · 23 operasi di openapi · 0 rute openapi yang tidak ada di
kode · 87 rute kode tidak terdokumentasi (79%).**

### 1a. Rute V2 (G8) — 11 endpoint tabel KONTRAK_API.md §5 (8 GET daftar + 3 PUT)

| # | Path | Method | Di `src/` | Di `openapi.yaml` | Status live |
|---|---|---|---|---|---|
| 1 | `/konfigurasi-dosis` | GET | ya (`konfigurasi.js:231`) | **TIDAK ADA** | 200, 19 baris |
| 2 | `/konfigurasi-dosis/:param` | PUT | ya (`konfigurasi.js:233`) | **TIDAK ADA** | (belum diprobe — hanya GET) |
| 3 | `/timing-operasi` | GET | ya | **TIDAK ADA** | 200, 16 baris |
| 4 | `/timing-operasi/:param` | PUT | ya | **TIDAK ADA** | — |
| 5 | `/aturan-fail-safe` | GET | ya | **TIDAK ADA** | 200, 20 baris |
| 6 | `/jadwal-perawatan` | GET | ya | **TIDAK ADA** | 200, 5 baris |
| 7 | `/kalibrasi-sensor` | GET | ya | **TIDAK ADA** | 200, 8 baris |
| 8 | `/mapping-channel` | GET | ya | **TIDAK ADA** | 200, 15 baris |
| 9 | `/target-nutrisi` | GET | ya | **TIDAK ADA** | 200, 3 baris |
| 10 | `/target-nutrisi/:id` | PUT | ya | **TIDAK ADA** | — |
| 11 | `/penampung-states` | GET | ya | **TIDAK ADA** | 200, 5 baris |

Selain 11 di atas, `konfigurasi.js:232` juga mendaftarkan **8 rute detail
`GET /<path>/:id`** — ikut tidak ada di openapi (total 19 rute V2 absen).
Jumlah baris live = angka di KONTRAK_API.md §5 (19/16/20/5/8/15/3/5) → **klaim KONTRAK
soal baris & guard benar** (diverifikasi: anon 401 · petani 403 · demo GET 200 ·
demo PUT 403).

### 1b. Rute LAMA (Laravel) yang tidak ada di openapi — selisih presisi per blok

| Path | Method hilang di openapi | Sumber di kode |
|---|---|---|
| `/meja`, `/tanaman`, `/siklus`, `/ambang` | `GET /:id`, `PUT /:id`, `PATCH /:id`, `DELETE /:id` (POST `/` hanya `/meja` yang ada) | `master.js` via `_crud.js:83,125,126,128` |
| `/semai`, `/peremajaan`, `/pendewasaan`, `/panen` | `GET, POST, GET /:id, PUT, PATCH, DELETE` (seluruh resource) | `tahap.js` via `_crud.js` |
| `/semai/selesai`, `/semai/batch/:id` | `GET` | `tahap.js:19,27` |
| `/user` | `POST`, `GET/PUT/PATCH/DELETE /:id` | `user.js:28,54,63,89,94` |
| `/notifikasi-wa` | `GET, POST, POST /uji` (3 rute) | `notifWa.js:49,66,77` |
| `/watercontrol` | `GET`, `POST /fill`, `POST /stop` | `watercontrol.js:9,19,26` |
| `/laporan/csv`, `/siklus/csv` | `GET` | `laporan.js:33`, `master.js:37` |
| `/monitoring/tarik` (tanpa `/csv`) | `GET` | `monitoring.js:145` |
| `/monitoring/saveSensor` | `POST` | `monitoring.js:114` |
| `/tanam/:tipe/:id/selesai`, `/tanam/:id/hapus` | `POST` | `tanam.js:57,79` |
| `/profil/update`, `/profil/password` | `POST`, `GET + POST /password` | `profil.js:17,34,38` |

**Tidak ada bentrok method** (semua operasi openapi ⊆ kode) — selisihnya murni
ketiadaan + satu konflik guard di bawah.

### 1c. Selisih status / keamanan pada path yang SAMA ada di openapi

| Path | Klaim openapi | Kenyataan di kode / live |
|---|---|---|
| `POST /monitoring/saveAlert` (`openapi.yaml:155-159`) | `security: []` = **publik**, hanya deklarasi `200` | `monitoring.js:124` `requireApiKey` → tanpa key **403** `{"status":false,"msg":"Unauthorized"}`; 403 tidak dideklarasikan; summary baris 158 justru menulis "wajib X-API-KEY" (kontradiksi internal) |
| `GET /meja` (`381-393`) | hanya `403` | tanpa token → **401** `{"message":"Tidak terautentikasi."}` |
| `POST /watercontrol/setMode` (`326-344`) | `200`, `403` | mode di luar `AUTO/MANUAL` → **422** terstruktur (`watercontrol.js:36-38`) |
| `POST /api/save-sensor` (`210-234`) | `200`, `403` | body kosong → **400** `{"status":"error","message":"No payload"}` (`monitoring.js:199`) |
| `POST /api/notif-hardware` (`236-259`) | `200`, `403` | **400** `type/value wajib` + `200 {"status":"cooldown"}` (`monitoring.js:209-218`) |
| schema `Meja` (`623-628`) | 2 field `meja`,`jumlah_lubang` + "Primary key id_meja belum ikut terkirim, lihat docs/ANALISIS_BACKEND.md bagian 6.2" | `GET /meja` live = **13 kolom termasuk `id_meja`** (diperbaiki G8; `master.js:21-29`) → rujukan silang ke temuan yang sudah basi |

---

## 2. Klaim basi per dokumen (baris → klaim → realita)

| File | Baris | Klaim | Realita | Sev |
|---|---|---|---|---|
| `docs/KONTRAK_API.md` | 7, 340-341 | "Versi mesin-baca `docs/openapi.yaml`… Import → **semua endpoint** langsung tersedia" | openapi memuat 23/110 operasi (21%) — 87 rute (termasuk 19 rute V2) tidak ada | tinggi |
| `docs/KONTRAK_API.md` | 30 | demo "dilarang **edit/hapus**" | probe live `PUT /meja/999999` (demo) → **422**, bukan 403 = guard lolos; kode ter-commit `auth.js:77` hanya cek `DEMO_BOLEH_TAMBAH.has(routeName)` (`'meja.store'`) tanpa membedakan method, dan `master.js:11-12` memasangnya di `router.use` → PUT/DELETE 8 resource CRUD demo diterima. Sudah dikenal: `BACKLOG_GARAP.md:62` (SEDANG). **(WIP)** `auth.js:89` kini `method === 'POST' && …` (perbaikan ada di working tree, belum di-commit, server belum restart) → setelah WIP landing + restart, klaim dokumen jadi sinkron | tinggi |
| `docs/KONTRAK_API.md` | 213 | "POST `/watercontrol/fill`, **`/stop`**, **`/setMode`**" | dua path ditulis tanpa prefix `/watercontrol` (rute sebenarnya `/watercontrol/stop`, `/watercontrol/setMode`) | rendah |
| `docs/KONTRAK_API.md` | 237-238 | "⚠️ Kontrak yang belum terpenuhi: `GET /x` (daftar) **tidak mengirim primary key**" | sudah diperbaiki (G8 `P1`, `_crud.js:18-21`); live `GET /meja` kirim `id_meja` — blok ini sudah ditandai G8 (MINOR) tapi masih ada | sedang |
| `docs/openapi.yaml` | 28-429 (`paths`) | 11 endpoint V2 + seluruh rute CRUD tak terdokumentasi | lihat §1a/§1b | tinggi |
| `docs/openapi.yaml` | 155-159 | `/monitoring/saveAlert` publik | wajib `X-API-KEY` | tinggi |
| `docs/openapi.yaml` | 623-628 | `Meja` = 2 kolom, `id_meja` belum terkirim | 13 kolom, `id_meja` ikut | sedang |
| `docs/API_ROUTES.md` | 1, 3 | "# API & Route Map (**Laravel existing**)" + sumber `routes/web.php` di luar repo | backend kini Node.js 110 rute; file ini tidak memuat 19 rute V2 sama sekali | sedang |
| `docs/API_ROUTES.md` | 63-64 | "Saat ini controller banyak `return view(...)`… Endpoint JSON yang sudah ada: `GET /api/latest-sensor`, beberapa `MonitoringController`" | semua 110 rute kini JSON-only (`index.js:51-60`); hampir semua endpoint sudah JSON | sedang |
| `docs/API_ROUTES.md` | 41-59 | daftar RESOURCE + `routes/api.php` tanpa V2 | 8 path V2 + 3 PUT tidak tercantum (satu-satunya daftar route di repo jadi tidak lengkap) | sedang |
| `backend-nodejs/README.md` | 3-4 | "Database & route **1:1 dengan kontrak lama**" | 19 rute V2 (`konfigurasi.js`) di luar kontrak Laravel | sedang |
| `backend-nodejs/README.md` | 51-52 | ESP32 wajib `X-API-KEY` untuk `/api/get-thresholds`, `/api/save-sensor`, `/api/notif-hardware` | `/monitoring/saveSensor` & `/monitoring/saveAlert` **juga** wajib key (`monitoring.js:114,124`) — tidak disebut | sedang |
| `backend-nodejs/README.md` | 49-50 | demo "dilarang edit/hapus" | sama dengan KONTRAK §Role: PUT/DELETE resource lolos guard pada kode ter-commit & server hidup (**WIP** `auth.js:89` membatasi ke POST — belum di-commit/restart) | tinggi |
| `backend-nodejs/README.md` | 40 | "semua response `application/json` (CSV kecuali)" | ada juga **204 kosong** untuk `Sec-Fetch-Mode: navigate` (`index.js:55-60`) — dicatat di KONTRAK §1 tapi tidak di README | rendah |
| `backend-nodejs/README.md` | (tidak ada) | tidak menyebut rate limit sama sekali | 3 pembatas aktif: view 300, login 10, write 60/menit (`index.js:77-84`) | rendah |
| `docs/ANALISIS_BACKEND.md` | 12 | "12 modul route, **21 tabel PG**" | live: **50 tabel base** di schema `public` (42 tanpa sisa tabel Laravel, 28 tanpa partisi `sensor_readings`); tabel domain kini **21 = 13 + 8 V2** → angka 21 tidak lagi mewakili total. "12 modul route" kebetulan cocok setelah G8 (sebelumnya 11) | sedang |
| `docs/ANALISIS_BACKEND.md` | 19, 158-163 | "`docs/` **terhapus di working tree**, 8 file hilang, masih di git HEAD" | `docs/` berisi 21 `.md` + `openapi.yaml`; `git status --short` hanya `?? docs/VERIFIKASI/BASELINE.md` | sedang |
| `docs/ANALISIS_BACKEND.md` | 136-143 | "### 6.2 Daftar (GET list) tidak mengembalikan primary key" → `GET /meja` = `{meja, jumlah_lubang}` | **sudah diperbaiki**: live 13 kolom berisi `id_meja` — dan temuan ini masih dirujuk `openapi.yaml:628` | tinggi |
| `docs/ANALISIS_BACKEND.md` | 145-150 | "Frontend React masih mock — panggilan API nyata hanya `auth.tsx` dan `WaterControlPage`" | `react-web-app/src` kini punya `lib/crudApi.ts`, `lib/api.ts`, dan `pages/masterPages.tsx` (11 panggilan API live — hasil F1) | sedang |
| `docs/ANALISIS_BACKEND.md` | 164 | "`docs/API_ROUTES.md` penting: daftar kontrak **104 route**" | API_ROUTES.md = 44 baris + 10 baris RESOURCE (Laravel), tanpa V2; angka 104 tidak terverifikasi di file itu | rendah |
| `docs/ANALISIS_BACKEND.md` | 176-177 | todo: "Tutup celah kontrak — **kembalikan primary key** di list (temuan 6.2)" | selesai di G8 → todo basi | rendah |
| `docs/ANALISIS_BACKEND.md` | 116 (§5) | "20 pemeriksaan (semua LULUS)" | `smoke-test.sh` memang masih 20 `hr` — **tapi nol pemeriksaan V2** (tidak ada satu pun rute `konfigurasi`) → cakupan basi | rendah |
| `docs/BACKEND_ANALYSIS.md` | 15, 88-90 | "Inventaris API (104 route → dikontrak ulang **1:1 di Node**)"; "Semua path di §2 diimplementasikan 1:1" | §2 tidak memuat V2 (19 rute) → klaim 1:1 tak lagi utuh | sedang |
| `docs/BACKEND_ANALYSIS.md` | 45-49 | "Model data (**12 tabel domain**)" | 13 tabel domain pra-V2 + **8 tabel V2** = 21, plus 6 tabel operasional (`dosing_events`, `dosing_rounds`, `sensor_overrides`, `water_fill_events`, `audit_logs`, `report_logs`) yang tidak pernah tercatat | sedang |
| `docs/BACKEND_ANALYSIS.md` | 63 | "`Session/cookie` ✅ **Laravel session ter-enskripsi**" | Node memakai **JWT stateless tanpa cookie** (`auth.js:13-46`) — bertentangan langsung dengan baris 81 di file yang sama | sedang |
| `docs/BACKEND_ANALYSIS.md` | 64 | Transport "masih HTTP lokal; wajib HTTPS → Node: dukung HTTPS" | HTTPS self-signed opsional sudah diimplementasi (`index.js:170-186`, `npm run start:https`) | rendah |
| `docs/BACKEND_ANALYSIS.md` | 66 | "Rate limit ⚠️ **belum ada** (target penambahan: limit login)" | **3 pembatas aktif** (`index.js:77-84`): view 300/menit, login 10/menit, write 60/menit; terbukti smoke-test #20 menghasilkan 429 | tinggi |
| `docs/BACKEND_ANALYSIS.md` ↔ `backend-nodejs/docs/BACKEND_ANALYSIS.md` | seluruh file | salinan identik (5912 byte, diff nol) | dua sumber kebenaran utang → risiko drift setiap perbaikan | rendah |
| `backend-nodejs/scripts/smoke-test.sh` | 79 | komentar: "Kolom whitelist backend: `'meja'` dan `'jumlah_lubang'` (bukan nama_meja/lokasi)" | whitelist kini **9 kolom tulis** (`master.js:21-25`: + `jenis_talang`, `kapasitas_penampung_l`, `jumlah_talang`, `lubang_per_talang`, `panjang_talang_m`, `laju_per_talang_lpm`, `kenaikan_air_cm`) | rendah |
| `src/routes/_validate.js` | 3 | header: "dipakai rute CRUD generik (`src/routes/_crud.js`)" | sejak G8 juga dipakai `src/routes/konfigurasi.js:193` | rendah |

**Klaim di 4 dokumen target yang sudah SINKRON (tanpa temuan):** `API_ROUTES.md:14-15`
(saveSensor/saveAlert `X-API-KEY` sejak G7 — sesuai kode); `BACKEND_ANALYSIS.md:12,24-25`
(guard X-API-KEY — sesuai); `ANALISIS_BACKEND.md:153` ("monitorings hanya 12 baris" —
live masih 12); `ANALISIS_BACKEND.md:53,168` & `README:49` soal login 10/menit — sesuai.

---

## 3. Kode (`backend-nodejs/src/`)

### 3a. Duplikasi helper yang tersisa

| Pola | Lokasi | Catatan | Sev |
|---|---|---|---|
| `warnUnknown` (log kolom di luar whitelist) | `_crud.js:116-125` (baris bergeser karena WIP) **dan** `konfigurasi.js:159-168` | logika identik, hanya label log berbeda | rendah |
| Cek eksistensi FK sebelum tulis | **(WIP)** `_crud.js:48-71` `fkErrors` + `FK_TARGETS` (baru, 05:05) **vs** `konfigurasi.js:209-212` (`cekFkTanaman`) — komentar WIP sendiri menyebut "format identik dengan cek FK di `routes/konfigurasi.js`" | dua implementasi cek FK dengan pola 422 sama; `tanam.js` disebut akan ikut dipakai tetapi belum tersentuh → risiko tripikasi | rendah |
| Handler tulis sensor | `monitoring.js:114-122` (`/monitoring/saveSensor`) **≡** `monitoring.js:196-204` (`/api/save-sensor`) | badan handler kembar — perubahan harus disentuh 2× | rendah |
| Handler alert | `monitoring.js:124-131` (`/monitoring/saveAlert`) vs `monitoring.js:206-223` (`/api/notif-hardware`) | kembar tetapi **beda perilaku** (yang `/api/` punya cooldown + 400, yang `/monitoring/` tidak) → drift | rendah |
| Guard `[requireAuth, requireRole(['admin','demo'])]` | `master.js:9`, `tahap.js:10`, `konfigurasi.js:50` | didefinisikan 3×; `index.js:108` sudah punya `adminDemo` (sengaja tidak dipakai — alasan di `index.js:117-118`) | rendah |
| Validasi `:id` | `_id.js:29-37` (`idValid`/`notFound`) vs `konfigurasi.js:114-118` (`idOk`) | varian kedua **terdokumentasi & sah** (PK 5 tabel V2 bertipe VARCHAR, `idValid` hanya menerima digit) — sudah pusat di `_id.js`, sisa pemakaian lokal hanya di `konfigurasi.js` | info |
| Guard per-rute manual | `monitoring.js:134,138,145,160` (`requireAuth` per route) | mount `/monitoring` (`index.js:105`) tanpa wrapper — berbeda pola dgn grup lain | rendah |
| `PATCH` | `user.js:89-92` (redispatch `router.handle`) vs `_crud.js:126` (handler `update` langsung) | dua mekanisme untuk kontrak yang sama | info |

Yang **sudah bersih**: tidak ada lagi duplikasi `BIGINT_MAX`/regex `id`/body 404 —
literal `'Data tidak ditemukan.'` hanya ada di `_id.js:37` (satu sumber kebenaran),
dipakai 31 titik di 6 file.

### 3b. Rute tulis tanpa rate-limit

**Nol.** `index.js:83` memasang `rateLimit write 60/menit` untuk
`POST|PUT|PATCH|DELETE` **sebelum** semua `app.use('/…', router)` (baris 103-123),
sehingga seluruh rute tulis tercakup; tambahan `login 10/menit` (`:82`) dan
`view 300/menit` (`:81`). `RATE_LIMIT_OFF` **tidak** di-set di `.env`.
Catatan: batas bisa dimatikan/diubah lewat env (`RATE_LIMIT_*`), dan `POST /login`
kena dua bucket (login + write) — bukan celah, hanya perlu diketahui.

### 3c. Konsistensi penamaan endpoint (hyphen vs camel)

- **camelCase (4, warisan Laravel — dipertahankan by design "nama rute 1:1")**:
  `/watercontrol/setMode`, `/monitoring/saveSensor`, `/monitoring/saveAlert`,
  `/monitoring/getReport6Jam`.
- **kebab-case (semua rute Node-era & V2)**: `/monitoring/chart-data`,
  `/monitoring/tarik|tarik/csv`, `/api/latest-sensor`, `/api/get-thresholds`,
  `/api/save-sensor`, `/api/notif-hardware`, `/notifikasi-wa`, dan **8 path V2**
  (`/konfigurasi-dosis` … `/penampung-states`) + segmen `/:id` mereka.
- **Temuan**: tidak ada rute V2 yang memakai camel → G8 konsisten; ketidakkonsistenan
  hanya ada pada warisan (by design). Kecuali **dokumentasi** yang menulis
  `/stop` & `/setMode` tanpa prefix (KONTRAK:213) — lihat tabel §2.

---

## Kesimpulan

- **openapi.yaml bukan lagi kontrak mesin-baca yang valid**: 23/110 operasi (21%),
  11/11 endpoint V2 tidak ada, satu konflik keamanan (`saveAlert`), satu skema basi
  (`Meja`), beberapa status yang tidak dideklarasikan (401/403/422/400).
- **Empat dokumen target memuat 18 klaim basi**; yang paling berdampak: blok
  "daftar tanpa PK" (masih di KONTRAK:237, ANALISIS_BACKEND:136, dan dirujuk
  openapi:628), "rate limit belum ada" (BACKEND_ANALYSIS:66), dan "demo dilarang
  edit/hapus" (README:49, KONTRAK:30 — berlawanan dengan perilaku live, sudah
  ditelusuri ke `BACKLOG:62`; perbaikan `auth.js` ada di WIP belum di-commit).
- **Kode relatif sehat pasca-G8**: helper id/404 tersentralisasi, seluruh rute tulis
  ter-rate-limit, penamaan V2 seragam kebab-case; sisa duplikasi ada di
  `monitoring.js` (2 pasang handler), `warnUnknown` ×2, dan (WIP) cek FK ×2.
- **Catatan sinkronisasi**: 4 dari 5 klaim basi yang paling berat ada di
  `openapi.yaml` + `KONTRAK_API.md` (pasangan mesin-baca ↔ manusia-baca) — keduanya
  harus diperbarui bersamaan, bukan satu-satunya.
- **Verdict: `PERLU_SINKRON`.**

## Lampiran — ringkasan JSON

```json
{"findings":[
{"file":"docs/openapi.yaml","baris":"28-429 (paths)","klaim":"kontrak mesin-baca 'import → semua endpoint tersedia' (KONTRAK:340)","realita":"hanya 23 dari 110 operasi kode (21%); 87 rute tak terdokumentasi; 0 rute openapi di luar kode","severity":"tinggi"},
{"file":"docs/openapi.yaml","baris":"28-429 (paths)","klaim":"11 endpoint V2 (8 GET daftar + 3 PUT) ada di kontrak","realita":"0/11 ada; total 19 rute V2 absen (termasuk 8 GET /:id); kode konfigurasi.js:231-233, live 200 = 19/16/20/5/8/15/3/5 baris","severity":"tinggi"},
{"file":"docs/openapi.yaml","baris":"155-159","klaim":"POST /monitoring/saveAlert security: [] (publik), hanya 200","realita":"monitoring.js:124 requireApiKey → 403 {status:false,msg:Unauthorized}; 403 tak dideklarasikan; summary baris 158 sendiri menulis 'wajib X-API-KEY'","severity":"tinggi"},
{"file":"docs/openapi.yaml","baris":"155 (pasangan hilang)","klaim":"hanya /monitoring/saveAlert yang didokumentasikan","realita":"POST /monitoring/saveSensor (monitoring.js:114, wajib X-API-KEY) tidak ada di openapi","severity":"tinggi"},
{"file":"docs/openapi.yaml","baris":"623-628","klaim":"schema Meja = {meja, jumlah_lubang}; 'id_meja belum ikut terkirim' → ANALISIS_BACKEND §6.2","realita":"GET /meja live 13 kolom termasuk id_meja (master.js:21-29, perbaikan G8)","severity":"sedang"},
{"file":"docs/openapi.yaml","baris":"381-393","klaim":"GET /meja hanya deklarasi 403","realita":"tanpa token → 401 {message:Tidak terautentikasi.}","severity":"rendah"},
{"file":"docs/openapi.yaml","baris":"326-344","klaim":"POST /watercontrol/setMode hanya 200/403","realita":"mode di luar AUTO/MANUAL → 422 terstruktur (watercontrol.js:36-38)","severity":"rendah"},
{"file":"docs/openapi.yaml","baris":"210-234","klaim":"POST /api/save-sensor hanya 200/403","realita":"body kosong → 400 {status:error,message:No payload} (monitoring.js:199)","severity":"rendah"},
{"file":"docs/openapi.yaml","baris":"236-259","klaim":"POST /api/notif-hardware hanya 200/403","realita":"400 type/value wajib + 200 {status:cooldown} (monitoring.js:209-218)","severity":"rendah"},
{"file":"docs/openapi.yaml","baris":"381-412","klaim":"hanya GET+POST /meja untuk resource master","realita":"GET /:id, PUT, PATCH, DELETE utk /meja, /tanaman, /siklus, /ambang + POST /tanaman|/siklus|/ambang tidak ada (19 rute)","severity":"sedang"},
{"file":"docs/openapi.yaml","baris":"(absen)","klaim":"resource tahap terdokumentasi","realita":"26 rute /semai, /peremajaan, /pendewasaan, /panen (CRUD) + GET /semai/selesai + GET /semai/batch/:id tidak ada","severity":"sedang"},
{"file":"docs/openapi.yaml","baris":"(absen)","klaim":"3 rute CSV tercantum di info.description","realita":"hanya /monitoring/tarik/csv yang ada; GET /laporan/csv dan GET /siklus/csv tidak ada","severity":"sedang"},
{"file":"docs/openapi.yaml","baris":"(absen)","klaim":"notifikasi-wa masuk inventaris","realita":"GET /notifikasi-wa, POST /notifikasi-wa, POST /notifikasi-wa/uji tidak ada","severity":"sedang"},
{"file":"docs/openapi.yaml","baris":"306-345","klaim":"watercontrol hanya /status dan /setMode","realita":"GET /watercontrol, POST /watercontrol/fill, POST /watercontrol/stop tidak ada","severity":"sedang"},
{"file":"docs/openapi.yaml","baris":"414-428","klaim":"profil hanya GET","realita":"POST /profil/update, GET /profil/password, POST /profil/password tidak ada","severity":"sedang"},
{"file":"docs/openapi.yaml","baris":"366-379","klaim":"/user hanya GET","realita":"POST /user + GET/PUT/PATCH/DELETE /user/:id (5 rute) tidak ada","severity":"sedang"},
{"file":"docs/openapi.yaml","baris":"261-305","klaim":"/tanam hanya GET dan /tanam/mulai","realita":"POST /tanam/:tipe/:id/selesai dan POST /tanam/:id/hapus tidak ada","severity":"sedang"},
{"file":"docs/KONTRAK_API.md","baris":"7, 340-341","klaim":"openapi.yaml = versi mesin-baca; 'Import → semua endpoint langsung tersedia'","realita":"23/110 operasi (21%); 19 rute V2 tak ada","severity":"tinggi"},
{"file":"docs/KONTRAK_API.md","baris":"30","klaim":"demo dilarang edit/hapus","realita":"probe live demo PUT /meja/999999 → 422 (guard lolos); kode ter-commit tanpa cek method (auth.js:77 + master.js:11); BACKLOG:62 SEDANG; WIP auth.js:89 membatasi ke POST (belum commit, server belum restart)","severity":"tinggi"},
{"file":"docs/KONTRAK_API.md","baris":"213","klaim":"POST /watercontrol/fill, /stop, /setMode","realita":"/stop dan /setMode ditulis tanpa prefix /watercontrol (rute asli /watercontrol/stop, /watercontrol/setMode)","severity":"rendah"},
{"file":"docs/KONTRAK_API.md","baris":"237-238","klaim":"GET /x (daftar) tidak mengirim primary key","realita":"sudah diperbaiki G8 (_crud.js P1); live GET /meja berisi id_meja — blok basi (sudah ditandai G8 MINOR)","severity":"sedang"},
{"file":"docs/API_ROUTES.md","baris":"1, 3","klaim":"# API & Route Map (Laravel existing) dari routes/web.php","realita":"backend kini Node 110 rute; file tidak memuat 19 rute V2; sumber ada di luar repo","severity":"sedang"},
{"file":"docs/API_ROUTES.md","baris":"63-64","klaim":"controller banyak return view(); endpoint JSON baru /api/latest-sensor + MonitoringController","realita":"semua 110 rute JSON-only (index.js:51-60)","severity":"sedang"},
{"file":"docs/API_ROUTES.md","baris":"41-59","klaim":"daftar RESOURCE + routes/api.php","realita":"8 path V2 + 3 PUT tidak tercantum → daftar route di repo jadi tidak lengkap","severity":"sedang"},
{"file":"backend-nodejs/README.md","baris":"3-4","klaim":"route 1:1 dengan kontrak lama","realita":"19 rute V2 (konfigurasi.js) di luar kontrak Laravel","severity":"sedang"},
{"file":"backend-nodejs/README.md","baris":"49-50","klaim":"demo dilarang edit/hapus","realita":"PUT/DELETE resource diterima pada kode ter-commit & server hidup; WIP auth.js:89 (POST-only) belum di-commit/restart","severity":"tinggi"},
{"file":"backend-nodejs/README.md","baris":"51-52","klaim":"X-API-KEY untuk 3 rute /api/*","realita":"/monitoring/saveSensor dan /monitoring/saveAlert juga wajib X-API-KEY (monitoring.js:114,124)","severity":"sedang"},
{"file":"backend-nodejs/README.md","baris":"40","klaim":"semua response application/json (CSV kecuali)","realita":"ada juga 204 kosong utk Sec-Fetch-Mode: navigate (index.js:55-60)","severity":"rendah"},
{"file":"backend-nodejs/README.md","baris":"(tidak ada)","klaim":"tidak menyebut rate limit","realita":"3 pembatas aktif: view 300, login 10, write 60/menit (index.js:77-84)","severity":"rendah"},
{"file":"docs/ANALISIS_BACKEND.md","baris":"12","klaim":"12 modul route, 21 tabel PG","realita":"50 tabel base live (42 tanpa sisa tabel Laravel, 28 tanpa partisi sensor_readings); domain kini 21 = 13 + 8 V2","severity":"sedang"},
{"file":"docs/ANALISIS_BACKEND.md","baris":"19, 158-163","klaim":"docs/ terhapus di working tree (8 file hilang)","realita":"docs/ berisi 21 .md + openapi.yaml; git status hanya 1 file untracked","severity":"sedang"},
{"file":"docs/ANALISIS_BACKEND.md","baris":"136-143","klaim":"### 6.2 GET /meja = {meja, jumlah_lubang} tanpa id_meja","realita":"live 13 kolom dengan id_meja; temuan ini masih dirujuk openapi.yaml:628","severity":"tinggi"},
{"file":"docs/ANALISIS_BACKEND.md","baris":"145-150","klaim":"React masih mock; API nyata hanya auth.tsx dan WaterControlPage","realita":"masterPages.tsx (11 panggilan API), lib/crudApi.ts, lib/api.ts sudah live (hasil F1)","severity":"sedang"},
{"file":"docs/ANALISIS_BACKEND.md","baris":"164","klaim":"docs/API_ROUTES.md = daftar kontrak 104 route","realita":"API_ROUTES.md = 44 baris + 10 baris RESOURCE (Laravel), tanpa V2","severity":"rendah"},
{"file":"docs/ANALISIS_BACKEND.md","baris":"176-177","klaim":"todo: kembalikan primary key di list (temuan 6.2)","realita":"selesai di G8","severity":"rendah"},
{"file":"docs/ANALISIS_BACKEND.md","baris":"90-116","klaim":"20 pemeriksaan smoke test semua LULUS","realita":"smoke-test.sh memang 20 hr, tapi 0 pemeriksaan rute V2","severity":"rendah"},
{"file":"docs/BACKEND_ANALYSIS.md","baris":"15, 88-90","klaim":"104 route dikontrak ulang 1:1; semua path §2 diimplementasikan 1:1","realita":"§2 tidak memuat 19 rute V2","severity":"sedang"},
{"file":"docs/BACKEND_ANALYSIS.md","baris":"45-49","klaim":"Model data 12 tabel domain","realita":"21 domain (13 + 8 V2) + 6 tabel operasional (dosing_events, dosing_rounds, sensor_overrides, water_fill_events, audit_logs, report_logs) tak tercatat","severity":"sedang"},
{"file":"docs/BACKEND_ANALYSIS.md","baris":"63","klaim":"Session/cookie: Laravel session ter-enskripsi","realita":"Node memakai JWT stateless tanpa cookie (auth.js:13-46); bertentangan dgn baris 81 file sama","severity":"sedang"},
{"file":"docs/BACKEND_ANALYSIS.md","baris":"66","klaim":"Rate limit: belum ada (target penambahan limit login)","realita":"3 pembatas aktif (index.js:77-84) dan smoke-test #20 menghasilkan 429","severity":"tinggi"},
{"file":"docs/BACKEND_ANALYSIS.md","baris":"64","klaim":"masih HTTP lokal; wajib HTTPS → Node dukung HTTPS","realita":"HTTPS self-signed opsional sudah diimplementasi (index.js:170-186, npm run start:https)","severity":"rendah"},
{"file":"backend-nodejs/docs/BACKEND_ANALYSIS.md","baris":"seluruh file","klaim":"salinan docs/BACKEND_ANALYSIS.md","realita":"identik 5912 byte (diff nol) → dua sumber kebenaran, risiko drift","severity":"rendah"},
{"file":"backend-nodejs/scripts/smoke-test.sh","baris":"79","klaim":"komentar: kolom whitelist backend 'meja' dan 'jumlah_lubang'","realita":"whitelist 9 kolom tulis (master.js:21-25)","severity":"rendah"},
{"file":"backend-nodejs/src/routes/_validate.js","baris":"3","klaim":"header: dipakai rute CRUD generik (_crud.js)","realita":"sejak G8 juga dipakai routes/konfigurasi.js:193","severity":"rendah"},
{"file":"backend-nodejs/src/routes/konfigurasi.js","baris":"159-168","klaim":"duplikasi helper warnUnknown (_crud.js:116-125)","realita":"dua implementasi logika identik, hanya label log berbeda","severity":"rendah"},
{"file":"backend-nodejs/src/routes/_crud.js","baris":"48-71 (WIP)","klaim":"duplikasi cek FK (fkErrors/FK_TARGETS) vs konfigurasi.js:209-212 cekFkTanaman","realita":"dua implementasi cek FK dgn pola 422 sama; tanam.js disebut ikut tapi belum tersentuh","severity":"rendah"},
{"file":"backend-nodejs/src/routes/monitoring.js","baris":"114-122 vs 196-204","klaim":"duplikasi handler tulis sensor","realita":"/monitoring/saveSensor dan /api/save-sensor badan identik — perubahan harus 2×","severity":"rendah"},
{"file":"backend-nodejs/src/routes/monitoring.js","baris":"124-131 vs 206-223","klaim":"duplikasi handler alert","realita":"kembar tapi beda perilaku (yang /api/ punya cooldown + 400) → risiko drift","severity":"rendah"},
{"file":"backend-nodejs/src/index.js","baris":"108 vs master.js:9, tahap.js:10, konfigurasi.js:50","klaim":"guard adminDemo didefinisikan ulang di 3 modul","realita":"array identik 3×; alasan terdokumentasi index.js:117-118","severity":"rendah"},
{"file":"backend-nodejs/src/routes/monitoring.js","baris":"134, 138, 145, 160","klaim":"guard dipasang di mount (pola grup lain)","realita":"requireAuth per rute; mount /monitoring tanpa wrapper (index.js:105)","severity":"rendah"},
{"file":"backend-nodejs/src/routes/user.js","baris":"89-92","klaim":"PATCH ditangani handler terpisah (_crud.js:126)","realita":"PATCH di sini redispatch router.handle — dua mekanisme utk kontrak sama","severity":"rendah"},
{"file":"backend-nodejs/src/routes/konfigurasi.js","baris":"114-118","klaim":"validasi :id tunggal di _id.js (idValid/notFound)","realita":"varian kedua idOk (varchar PK) — sah & terdokumentasi, tapi implementasi id kedua","severity":"rendah"},
{"file":"backend-nodejs/src/index.js","baris":"81-83","klaim":"semua rute tulis kena rate-limit","realita":"TERPENUHI — 0 rute tulis tanpa pembatas (middleware sebelum semua mount; RATE_LIMIT_OFF tak di-set di .env)","severity":"rendah"},
{"file":"backend-nodejs/src/routes/","baris":"naming","klaim":"konsistensi penamaan endpoint","realita":"4 rute camelCase warisan (setMode, saveSensor, saveAlert, getReport6Jam) vs kebab-case utk semua rute baru & 8 path V2; 0 rute V2 camel → konsisten per-era; hanya dokumen KONTRAK:213 yang menulis /stop & /setMode tanpa prefix","severity":"rendah"},
{"file":"backend-nodejs/src/auth.js","baris":"89 (WIP)","klaim":"perbaikan demoGuard POST-only ada di working tree","realita":"belum di-commit & server (start 04:52) belum restart → perilaku live masih kode lama; BACKLOG:62 belum tertutup","severity":"sedang"}
],"verdict":"PERLU_SINKRON"}
```

