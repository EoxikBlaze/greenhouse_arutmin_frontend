# Backlog GARAP — Utang Proses & Temuan Audit

> Dibuat: 19 Okt 2026 · Sumber: `AUDIT_KEAMANAN_GARAP.md`, `AUDIT_PERFORMA_GARAP.md`, audit Project Manager (`PM_AUDIT_2026-10-19.md`)
> Aturan main: tiap gelombang wajib menutup **minimal 1 butir** sebelum selesai; status diperbarui saat commit masuk.

## Status gerbang proses (hasil audit PM)

| Langkah | Status | Bukti |
|---|---|---|
| G1–G4 | ✅ PASS | commit `4e51f8a`/`1f2bac6`/`f9270b0`/`6b7c9de`/`85c3fc7` punya verdict verifier di log delegasi |
| G5 | ⚠ ISSUE | penomoran gelombang tidak konsisten; tidak ada manifest "gelombang 5" |
| G6 | ⚠ ISSUE | `c9fe81f` di-merge dengan verifikasi manual orchestrator, **tanpa delegation verifier** |
| G7 | 🔄 IN PROGRESS | diff 3 file, verifier `deleg_786c743e` berjalan |
| X1 scrub kredensial | ✅ PASS | `4825561` + `cd62be5` di remote; 0 hit literal lama di file tracked |
| X2 dokumen | ✅ PASS | `e4ee37d`, `28ce345`, `fde932b` di remote |

**Aturan baru sejak audit ini** (berlaku untuk G7 dst.):
1. Subject commit kode wajib memuat `[verified:<delegation_id>]`.
2. JSON verdict verifier ikut ter-commit sebagai `docs/VERIFIKASI/G<n>.md` sebelum/at merge — bukti tidak lagi hidup di log yang bisa ter-prune.
3. Merge hanya jika worktree akan ditinggal bersih dan tak ada agent lain yang sedang menulis area yang sama.

## KRITIS

| # | Temuan | Status | Catatan |
|---|---|---|---|
| K1 | Password lama + `DATABASE_URL` lama masih di **git history** (2 repo) | ✅ **DITERIMA USER** | Rotasi password DB **sudah dilakukan & terverifikasi** 19 Okt (baru→200, lama→422, kunci di `.env`); scrub HEAD bersih. Riwayat sengaja **tidak** di-filter saat user memilih "Rotasi + scrub docs" (repo PRIVATE) |
| K2 | State `monitorings`: 100.013 pernah masuk, **100.001 terhapus**, index 7,3 MB utk 12 baris | ⬜ TBD | Perlu konfirmasi: hapus disengaja (restore dump 18 Okt) → bila ya, `REINDEX` (DDL = perlu persetujuan) |
| K3 | Query non-sargable `/laporan` (`date_trunc` SubPlan) — 8,2 ms dgn 12 baris; 371.128 seq_scan | ⬜ TBD | Ubah ke rentang `created_at >= bln AND < bln+1` + buang indeks duplikat |

## SEDANG

| # | Temuan | Status |
|---|---|---|
| S1 | BFLA `saveSensor`/`saveAlert` + `trust proxy` + timing login + JWT ketat | 🔄 dikerjakan di **G7** (verifier berjalan) |
| S2 | TLS/HSTS — nginx `listen 80`, JWT & X-API-KEY plaintext | ⬜ TBD |
| S3 | helmet/CSP — CSP/HSTS/ACAO null | ⬜ TBD |
| S4 | Scope akun demo — bisa `GET /user` (daftar+email), `/laporan`, `/notifikasi-wa` | ⬜ TBD |
| S5 | Eksposur publik `/api/latest-sensor` & `/monitoring/getReport6Jam` | ⬜ TBD (minimalkan payload / dokumentasikan) |
| S6 | Pagination — semua list tanpa `LIMIT`; `/monitoring/tarik` tanpa `OFFSET` | ⬜ TBD |
| S7 | Indeks duplikat 3 pasang (~2,6 MB) + FK `tanamen.id_meja`/`sikluses.id_tanaman` tanpa indeks | ⬜ TBD (DDL — butuh persetujuan; saran siap di `AUDIT_PERFORMA_GARAP.md`) |
| S8 | Payload — `chart-data` abaikan `dari/sampai`, tanpa kompresi, `SELECT *` | ⬜ TBD |
| S9 | Rate-limit counter in-memory (reset restart) | ⚠ separuh teratasi `trust proxy` (G7) |
| S10 | Fallback secret lemah `dev-secret-ganti` / `HARVEST123` (hanya bila `.env` kosong) | ⬜ TBD |
| S11 | Analis DB: migrasi dari dokumen perancangan (3 file `??` di worktree) | 🔄 berjalan — menunggu laporan + verifikasi |

## CATATAN
- Body depth tanpa limit (ukuran sudah 413) · bcryptjs 2.x / express 4→5 · tabel `sessions` legacy · skema global non-multi-tenant · `pg_stat_statements` belum pasang.
- Kepatuhan model: **15/16 delegasi `mimo-v2.6-flash`+`ultra`** — 1 pelanggaran `deleg_2bea5085` (jalan 10-18 22:20, **sebelum** pin `delegation.*` diset 23:01; model tak tercatat, mustahil dibuktikan retroaktif). Sejak pin: **100% patuh**.
- Rekomendasi PM: cron audit rutin (kepatuhan model + kesehatan repo/server + sanitasi token) — menunggu persetujuan user.


## Keputusan USER (19 Okt, via konfirmasi langsung)
1. **Eksekusi 4 migrasi perancangan** → *TUNGGU rancangan DB v2 selesai, lalu eksekusi sekali jalan* (hindari migrasi dobel). File sudah `LAYAK COMMIT 7/7` & ter-commit `4186c19`.
2. **sensor_thresholds min/max** → *BIARKAN nilai live* (5–40 / 5–7 / 50–1000 / 20–40 / 50–90); perubahan ke Tabel 13 ditunda sampai riset petani (Lampiran B).
3. **Data meja live (5 baris / 1.346 lubang)** → *BIARKAN*; penyelarasan ke 4 meja dokumen ditunda sampai data lapangan asli masuk.

## Status eksekusi DB (19 Okt, lanjutan)
- **S11 SELESAI**: 4 migrasi perancangan + skema V2 **dieksekusi penuh ke live** (5 file OK, backup `backup_garap_pre_v2_*.dump`) — detail `docs/VERIFIKASI/EKSEKUSI_V2.md`; semua rekomendasi §12 dipakai.
- Fase aplikasi (belum): whitelist/TABLE_SPECS 19 kolom baru, endpoint §11, backfill monitorings→readings, cron retensi, regenerasi schema.sql.

## Temuan gelombang G8 + F1 (19/20 Okt, masuk lewat verdict)
- **SEDANG — demoGuard `/meja`**: `routeName 'meja.store'` dipakai utk SEMUA method → demo **PUT /meja = 200** (bukti verifier F1) → demo bisa mengedit meja; harusnya 403. (Bukan blocker F1 karena front menangani keduanya.)
- CATATAN — semantik audit ganda: `PUT /meja` selalu `updated_at=now()`, 3 PUT V2 tidak (net-zero) → pilih `last_edited_by/at` atau standardisasi.
- CATATAN — validasi klien nama meja 200 vs DB varchar(50) → input 51–200 lolos klien (UX).
- MINOR — `KONTRAK_API.md` blok basi "daftar tidak kirim PK" (pra-diff) → bersihkan.
- INFO — token pindah ke `localStorage` (F1): jangka panjang pertimbangkan httpOnly cookie + CSP (bergandengan dgn S3 helmet).

## Temuan gelombang debugging 9-worker (20 Okt, deleg_d4b55adb) — 8 kelas 500 BARU + UX
| Sev | Endpoint | Isi | Status (pasca-G9b, 20 Okt siang) |
|---|---|---|---|
| TINGGI | PUT /konfigurasi-dosis, /timing-operasi, /target-nutrisi | `nilai=1e30` → 500 `numeric field overflow`; `umur_min_hari=9999999999` → 500 int4 out-of-range — Zod `number` tanpa max/min (melanggar janji 'rentang → 422') | ✅ **SELESAI** — 422 rentang Zod (live: 1e30/1e12/9999999999 → 422) |
| TINGGI | GET /penampung-states?id_meja[]=2 | array lolos `idValidValue` (RegExp#test coerce) → pg kirim '{2}' → 500 bigint | ✅ **SELESAI** — `idValidValue` tolak non-string → 422 |
| SEDANG | POST /meja, PUT /konfigurasi-dosis | byte NUL `0x00` → 500 invalid UTF-8 (Zod tak menolak) | ✅ **SELESAI** — refine NUL di semua string → 422 |
| SEDANG | POST /semai tanpa `tgl_awal_semai` | 500 NOT NULL (SQLSTATE 23502) — sisa kelas baru utk G9b → petakan 23502→422 per-field | ✅ **SELESAI** — `requiredCreate` semais + mapper 23502 global (bukti live: POST /panen → 422) |
| SEDANG | PUT /semai/:id status='dibuang' | 500 CHECK `semais_status_check` — enum status belum divalidasi Zod | ✅ **SELESAI** — enum Zod `['proses','selesai','gagal']` → 422 |
| RENDAH | PUT dosis/timing `nilai` negatif | diterima 200 (tanpa min Zod & tanpa CHECK DB) — dosis negatif nyata | ✅ **SELESAI** — min 0 → 422 |
| RENDAH | PUT /timing-operasi `nilai:null` | 422 padahal kolom DB boleh NULL — tak bisa dikosongkan lewat API | ✅ **SELESAI** — spec `nullable` → 200, teruji & dipulihkan |
| RENDAH | GET ?ID_MEJA=3 (casing) | 200 tanpa filter — query param case-sensitive, diabaikan senyap | ✅ **SELESAI** — `queryParam()` normalisasi case → 200 terfilter (1 baris) |
| INFO | header 20 KB / method tak didukung | 431 body kosong (core Node) · 404 utk 405 — konsisten gaya lama | — by design |

## UI/UX (docs/AUDIT_UI_UX.md — 6 TINGGI, 8 SEDANG, 6 RENDAH)
Quick-win gelombang frontend berikut: (1) error+empty saling eksklusif + tombol coba-lagi + hapus teks dev (judul 'TOOLBAR', catatan placeholder), (2) tombol dashboard hero → `<Link>` + target aksi baris 22×18px → ≥44px, (3) focus-trap/Escape/role=dialog modal + kontras nav aktif 3.75:1 + role=alert error login; plus: filter sidebar per role (T6), breakpoint mobile (T1: overflow 251px di 390px).

## Utang proses (PM audit 20 Okt)
- Commit F1 `a6773c9` subject TANPA stempel `[verified:]` (aturan-1 dilanggar; body menyebut verifier) — koreksi kebiasaan: stempel wajib di SUBJECT.
- openapi.yaml hanya 23/110 operasi (19 rute V2 absen; saveSensor hilang; saveAlert `security:[]` padahal wajib API-key) → butuh gelombang sinkronisasi kontrak docs.
- G5 (penomoran) & G6 (merge tanpa verifier) legacy tak diperbaiki.
- Token scratch `*.tok` tanpa TTL; audit kepatuhan model belum cron (menunggu izin).
- Insiden PM: PUT demo `ZZZ-AUDIT` di meja 11 → sudah dipulihkan (nilai asli; sisa updated_at).

## Safety gelombang-2 (20 Okt, deleg_1177732f) — 64 checks, 0 GAGAL
- **AMAN**: SQLi 40 probe (parameterisasi $1 terbukti, tabel utuh pasca ;DROP/UNION) · JWT 7 variant rusak → 401 semua (wrong-secret/alg-none/exp/kid/sig/tanpa-exp; kontrol valid 200) · BFLA demo PUT → 403 kontrak, petani → /user, /notifikasi-wa, POST /meja 403 'Menu ini untuk pengelola...' · mass-assignment role/id/created_at DIABAIKAN (id_meja auto) · 4 header utuh, x-powered-by off.
- **MASIH TERBUKA (S4)**: demo GET /user (200, daftar+email) & GET /laporan (200) — kontrak 'read-only' tapi tetap eksposur scope; meja lintas-id 200 (single-tenant by-design).
- **S10 status**: .env JWT_SECRET **TERISI** (aman di deploy), **tapi fallback 'dev-secret-ganti' masih ada di kode** → aktif hanya bila .env kosong; disarankan fallback = gagal-loud.
- **INFO (bukan celah)**: spoof XFF beda-IP lolos bucket login **hanya utk akses langsung 127.0.0.1**; pola deploy nginx (`$proxy_add_x_forwarded_for` + backend bind localhost) menutupnya; spoof IP sama tetap 429.
- Net-zero terverifikasi: /meja=5, users=3, penampung_states=5, alert_logs=51, prefix SAF2-=0. Detail: /Users/rizki/saf2_results.json (64 checks).

## Koreksi status (audit PM gelombang-2, deleg_d686be81 task-1) — 10 mismatch
1. BACKLOG lama baris 'gerbang G7 IN PROGRESS' → **SELESAI** (`30f985a` [verified] + VERIFIKASI/G7.md).
2. S1 'dikerjakan di G7' → **SELESAI** (4 quick-win BFLA/trust proxy/timing/JWT merge).
3. S11 kontradiktif (baris 'berjalan' vs 'SELESAI') → **SELESAI** (4 migrasi eksekusi penuh, `4186c19`).
4. demoGuard 'PUT /meja=200 harusnya 403' → **SELESAI & live terbukti**: demo PUT /meja/11 & /tanaman/1 = 403 (`d78339a`).
5. 'Fase aplikasi belum (whitelist/endpoint §11)' → **SEBAGIAN SELESAI** via G8 (`3c6451d`: 13 kolom + 11 endpoint).
6. **5 wave tanpa baris** → ditambahkan di sini: G9a `d78339a` (demoGuard+FK/tgl 422) · G9c `fded4ef` (suite 43 tes) · F2 `cc25fc4` (3 halaman live) · FLUTTER `bee57a7` (auth+API live, 18 tes) · SQL-CRON `481df59` (6 skrip DRAFT).
7. Angka '15/16 delegasi mimo' → **BASI**: terkini **28/29 total, 28/28 sejak pin 10-18 23:01** (1 pra-pin deleg_2bea5085 model tak tercatat).
8. Insiden meja 11 'sisa updated_at' → **TERLAMPAUI**: updated_at = created_at asli, 0 residu, 5 baris utuh.
9. `openapi.yaml 23/110` → **SELESAI gelombang ini: 110/110 operasi** (task-2 audit, menunggu verifier).
10. Token scratch `*.tok` tanpa TTL — **MASIH TERBUKA** (3 file; dibersihkan berkala manual).
- Catatan proses: setelah F1 `a6773c9` **nol commit kode tanpa stempel** (stempel wajib SUBJek utk kode & dokumen verdict — keputusan: semua commit delegation wajib stempel).

## Temuan debugging gelombang-2 (20 Okt, deleg_d686be81 task-0) — 12 baru, 262 probe, net-zero ✓
> Semua diuji sebelum/paralel G9b → status dicek ulang pasca-merge.

| Sev | Endpoint | Isi | Status |
|---|---|---|---|
| TINGGI | POST /tanam/mulai | payload lolos validasi → 500 23502 `tgl_akhir_semai` NOT NULL (handler tanam.js tak pernah mengisinya) → **fitur Mulai Tanam MATI TOTAL** | 🔄 **G10** — kini ter-jaring 422 mapper, tapi fitur butuh pengisian kolom (now()/input) di routes/tanam.js |
| TINGGI | GET /laporan · /laporan/csv · /monitoring/tarik(+/csv) | `?dari=bukan-tanggal` dst → 500 22007/22008 — query mentah `$1::timestamptz` tanpa validasi | 🔄 **G10** — validasi date query → 422 (queryParam baru hanya case) |
| SEDANG | GET/PUT V2 varchar-PK `/%00` (6 path) | `idOk()` teks hanya `length<=64` → NUL lolos → 500 (PK angka 404 benar) | 🔄 **G10** |
| SEDANG | POST /monitoring/saveSensor · /api/save-sensor | tipe salah (`"bukan-angka"`) → 500 22P02/22003 — tanpa validasi tipe | 🔄 **G10** |
| SEDANG | POST /monitoring/saveAlert · /api/notif-hardware | type 60ch/value 150ch/NUL → 500 22001/22021 — tanpa batas panjang | 🔄 **G10** |
| SEDANG | POST /user tanpa email · PUT /user/:id | POST: email NOT NULL → 500 23502; PUT: unique 23505 & null → 500 (tangkapan hanya di POST); POST email objek → **201 lolos** `{"a":1}` | 🔄 **G10** |
| SEDANG | POST /peremajaan · /pendewasaan · /panen · /siklus | NOT NULL tanpa requiredCreate → 500 (kelas sama 23502) | ✅ **SEBAGIAN** — mapper global 23502→422 kini menangkap (terbukti POST /panen → 422); cek requiredCreate tabel lain utk pesan lebih awal |
| RENDAH | PUT /user/:id | urutan 422-vs-404 tergantung isi body (validasi level sebelum cek baris) — langgar '404 identik' | 🔄 **G10** |
| RENDAH | GET /:id percent-encoding cacat (`/%E0%A4%A`) | 400 tapi pesan 'Terjadi kesalahan pada server.' — galat klien dipresentasikan sbg server | 🔄 **G10** |
| INFO | skema Authorization case ('bearer'→401) & header ganda | RFC 7235 case-insensitive; duplikat: entri pertama menang. **JWT cacat SEMUA 401 — nol bypass** | keputusan: pertahankan gaya 'Bearer' (ketat) atau longgarkan — pilih & catat |
| INFO | X-API-KEY via body `api_key` | kunci perangkat diterima dari payload JSON (risiko bocor ke log); kunci kosong tetap 403 | 🔄 **G10**: tolak body-fallback / minimal warning |

## Audit kontrak gelombang-2 (deleg_d686be81 task-2) — openapi 23 → **110 operasi** ✓
- `docs/openapi.yaml`: 110 operasi, 110 operationId unik, 0 duplikat, `x-source: <file>:<baris>` tiap operasi, `yaml.safe_load` OK, diff rute spec↔kode kosong dua arah; saveAlert kini `security: [apiKeyHeader]`; skema Meja 13 kolom.
- **Klaim basi dikonfirmasi** (BELUM diperbaiki, docs): KONTRAK_API.md:237-238 & ANALISIS_BACKEND.md:136 & JALUR_BACKEND.md:136 ('daftar tanpa PK' — sudah P1 sejak G8) · KONTRAK_API.md:267-271 (janji CHECK/FK tak pernah 500 — kini mendekati benar pasca-G9b, sisa G10) · KONTRAK_API.md:338 ('smoke-test 20 semua LULUS' — nol cek rute V2) · API_ROUTES.md masih basis Laravel (44 rute, tanpa V2/PUT/PATCH/DELETE) · ANALISIS_BACKEND 6.2 todo basi.

## UI/UX gelombang-2 (deleg_d686be81 task-6) — 19/20 temuan lama MASIH + 8 baru
- Runtime terukur baru: overflow 390px = **278-292px** (T1), kontras nav aktif **2.76:1–3.53:1** (S2, lebih buruk drpd catatan), target aksi Edit/Hapus **22×18px** (S1), modal **0 role/Escape/focus-trap** (T5), petani **19 menu + redirect senyap** (T6).
- 8 temuan baru: TINGGI (2) — placeholder empty-state aneh 'Belum ada data toolbar — …' (CrudScreen:188 `title.toLowerCase()`), nol affordance retry di semua list (termasuk Semai baca-saja dgn copy 'tambah data'); SEDANG (4) — FK mentah di modal semai, target <44px non-tabel, kontras nav, dua pola error beda (Dashboard benar vs CrudScreen); RENDAH (1) — spacing/typography.
- **Quick-win prioritas (siap dikerjakan)**: QW1 state per layar + onRetry + moduleName (±1.5j) · QW2 target ≥44px/36px + aria-label (±45m) · QW3 modal aksesibel focus-trap/Escape (±1.5j) · QW4 kontras nav `linear-gradient(135deg,#3F5C41,#2D452F)` + `!text-white` (7.45:1) & slate-400→500 (±20m) · QW5 sidebar per role + notice redirect (±45m) · QW6 mobile off-canvas + min-w-0 (±2j). Detail: `scratch/gelombang2_uiux.json`.

## Frontend F2b (deleg_d686be81 task-5) — 4 halaman live, build 0, oxlint 0, browser 0 error
- Dashboard (6 metrik+pipeline+IoT, hero→`<Link>` role-aware) · Sensor (grafik SVG asli+filter+CSV+polling 15s+empty/error) · WaterControl (status polling 5s + setMode/fill/stop, 403 demo di-UI) · ManajemenUser+Profil (CRUD /user + profil update/password, 403 = pesan ramah). File: 4 halaman + `lib/useApiObject.ts` (baru).
- Efek samping: `water_controls.command` AUTO→**FORCE_STOP** akibat uji POST (mode MANUAL, katup OFF — aman); endpoint tak punya jalan kembali ke AUTO.
- **BUG di luar scope (penting)**: `lib/auth.tsx` memetakan level `user` (akun demo) → role `admin` → **flag demo tak pernah aktif setelah login sungguhan** (403 tetap tampil karena dari server) → **G10**.

## Hasil suite (Pengembang, task-8) — 43 → **106 tes** (63 baru, 105 pass / 1 skip / 0 fail, 3+ run hijau, idempoten)
- File baru: laporan(8), monitoring(9), watercontrol(10), esp32(11), authz(13), kontrak-aneh(9), meja-mass(3). Skip = dokumentasi 'chart-data abaikan dari/sampai'.
- Koreksi 1 tes `kontrak-aneh` ID_MEJA oleh parent (ekspektasi status-quo → normalisasi keputusan G9b).
- 3 perilaku fleksibel [500,422]: `?id_meja[]=2` **kini 422** (G9b); `?dari=bukan-tanggal` & `tarik?dari=abc` **MASIH 500** — validasi G9b hanya utk kolom tgl_* di CRUD, bukan query dari/sampai (dikonfirmasi verifier suite: tes lolos dgn 500) → **target G10** (validasi date query → 422).

## Debugging UI gelombang-5 (20 Okt, deleg_6edbde8c + fix 146ad1b) — SELESAI
- Audit kontras (472+ elemen, 16 halaman): 4 titik gagal diperbaiki & diukur ulang runtime (h1 1.01->16.6, placeholder 2.54->4.76, disabled 2.45->slate-500, pill 3.21->5.24-6.63). Runtime audit: 17 halaman, 0 console/pageerror, CLS<=0.001.
- Audit animasi: 18 pola terdokumentasi, 7 temuan diperbaiki (stagger fill, reduced-motion global, exit animasi 5 modal+flash, polling flash, grafik fade, durasi micro, backdrop+easing) — verifier deleg_9b9828c0 LAYAK 11/11.
- PRE-EXISTING utk gelombang berikut: saat submit, tombol Simpan disabled -> blur fokus ke <body>; Escape kembar terblokir (fokus luar + closeDisabled) sehingga setelah submit GAGAL modal tak bisa ditutup Escape sampai fokus kembali (perilaku identik HEAD — perbaikan = logic change, butuh perbaikan terpisah + verifier). Juga: jeda focus-title setTimeout(0) — Tab <10ms setelah buka bisa lolos sekali (cosmetic).
- Artefak: react-web-app/.playwright-cli/ (16 snapshot tak ter-track) — jangan di-commit; bersihkan bila perlu.

## Review ORANG AWAM (deleg_4251b88e, 21 Okt) — verdict: RIBET 4/5, AWAM_KESULITAN
Diuji via browser sungguhan (klik+form), 32 langkah, data uji bersih (baseline utuh).
- MUDAH: login 3 langkah (5/5) · tambah tanaman 4 langkah (5/5) · tambah meja 6 langkah (5/5) · siklus 6 langkah (3/5 — pesan error teknis).
- ❌ TINGGI #1 — FORM PALSU: Peremajaan/Pendewasaan/Panen (stagePages:374/432/488) TANPA onSubmit → tombol Simpan = default setFormOpen(false) → TUTUP TANPA SIMPAIN & TANPA PESAN (hanya Siklus:706 yg nyata). Terkonfirmasi dgn 2 percobaan + 0 request jaringan.
- ❌ TINGGI #2 — 'Mulai Semai Baru' (Dashboard:225) = <Link to="/semai"> → halaman baca-saja; padahal backend POST /tanam/mulai HIDUP (G10) — tak ada form-nya di frontend.
- ⚠️ SEDANG #3 — Tombol 'Tandai Selesai' (POST /tanam/:tipe/:id/selesai, backend hidup) TAK PERNAH dipasang di frontend — semua tahap hanya punya 'Detail'.
- UX AWAM: pesan validasi 'Kolom nama_siklus wajib diisi.' (bahasa kolom DB) → saran 'Nama siklus wajib diisi.'; judul dialog generik 'Form tambah / edit' → spesifik ('Tambah Meja Tanaman'); field opsional ('Meja bawaan') bikin ragu; istilah 'Kenaikan air (cm)' tanpa petunjuk 1 baris.
- Ringkasan langkah: termudah tanaman (4), terpanjang meja/panen/siklus (6) — jumlah langkah BUKAN masalah; yang bikin RIBET = pekerjaan inti buntu + Simpan pura-pura berhasil. Screenshot: scratch/awam_shots/.

## Debugging ulang putaran ke-2 (deleg_f1fcdce9, 21 Okt) — LAYAK (15/16 PASS)
Suite 112/111/0/1 utuh · 0 regresi G10/ESP32/AI · BFLA aman · net-zero 53 tabel (diff kosong) · frontend 0 console error & kontras+animasi utuh · rate-limit 429+Retry-After teruji, diputuskan AMAN utk ESP32 (24 POST/mnt < 60, per-IP req.ip + trust proxy 1).
- SEDANG (SUDAH DIPERBAIKI): openapi.yaml tak memuat POST /api/ai/langkah-selanjutnya -> ditambahkan (path, tag AI Lokal, schema lengkap 200/401/403/422/500) — 69 paths / 111 operasi, 0 ref rusak.
- RENDAH #1: PUT /konfigurasi-dosis/:param tolak string numeric '20.0000' (nilai hasil GET) -> 422; number -> 200 — round-trip GET->PUT asimetris; belum ada konsumen frontend.
- RENDAH #2: respons 429 tanpa header X-RateLimit-* (hanya Retry-After) — src/rateLimit.js:43-47.
