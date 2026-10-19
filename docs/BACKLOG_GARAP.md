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
| Sev | Endpoint | Isi |
|---|---|---|
| TINGGI | PUT /konfigurasi-dosis, /timing-operasi, /target-nutrisi | `nilai=1e30` → 500 `numeric field overflow`; `umur_min_hari=9999999999` → 500 int4 out-of-range — Zod `number` tanpa max/min (melanggar janji 'rentang → 422') |
| TINGGI | GET /penampung-states?id_meja[]=2 | array lolos `idValidValue` (RegExp#test coerce) → pg kirim '{2}' → 500 bigint |
| SEDANG | POST /meja, PUT /konfigurasi-dosis | byte NUL `0x00` → 500 invalid UTF-8 (Zod tak menolak) |
| SEDANG | POST /semai tanpa `tgl_awal_semai` | 500 NOT NULL (SQLSTATE 23502) — sisa kelas baru utk G9b → petakan 23502→422 per-field |
| SEDANG | PUT /semai/:id status='dibuang' | 500 CHECK `semais_status_check` — enum status belum divalidasi Zod |
| RENDAH | PUT dosis/timing `nilai` negatif | diterima 200 (tanpa min Zod & tanpa CHECK DB) — dosis negatif nyata |
| RENDAH | PUT /timing-operasi `nilai:null` | 422 padahal kolom DB boleh NULL — tak bisa dikosongkan lewat API |
| RENDAH | GET ?ID_MEJA=3 (casing) | 200 tanpa filter — query param case-sensitive, diabaikan senyap |
| INFO | header 20 KB / method tak didukung | 431 body kosong (core Node) · 404 utk 405 — konsisten gaya lama |

## UI/UX (docs/AUDIT_UI_UX.md — 6 TINGGI, 8 SEDANG, 6 RENDAH)
Quick-win gelombang frontend berikut: (1) error+empty saling eksklusif + tombol coba-lagi + hapus teks dev (judul 'TOOLBAR', catatan placeholder), (2) tombol dashboard hero → `<Link>` + target aksi baris 22×18px → ≥44px, (3) focus-trap/Escape/role=dialog modal + kontras nav aktif 3.75:1 + role=alert error login; plus: filter sidebar per role (T6), breakpoint mobile (T1: overflow 251px di 390px).

## Utang proses (PM audit 20 Okt)
- Commit F1 `a6773c9` subject TANPA stempel `[verified:]` (aturan-1 dilanggar; body menyebut verifier) — koreksi kebiasaan: stempel wajib di SUBJECT.
- openapi.yaml hanya 23/110 operasi (19 rute V2 absen; saveSensor hilang; saveAlert `security:[]` padahal wajib API-key) → butuh gelombang sinkronisasi kontrak docs.
- G5 (penomoran) & G6 (merge tanpa verifier) legacy tak diperbaiki.
- Token scratch `*.tok` tanpa TTL; audit kepatuhan model belum cron (menunggu izin).
- Insiden PM: PUT demo `ZZZ-AUDIT` di meja 11 → sudah dipulihkan (nilai asli; sisa updated_at).
