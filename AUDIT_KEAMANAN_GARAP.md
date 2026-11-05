# Audit Keamanan Backend GARAP

> Agen: keamanan · 19 Okt 2026 · `mimo-v2.6-flash` + `ultra` · mode **read-only** (tanpa edit file repo, tanpa DML — hanya GET/SELECT)
> Target: `backend-nodejs` @ dev `6b7c9de` · verdict: **ADA RISIKO**

## 1. Ketergantungan
- `npm audit` (full & `--omit=dev`): **0 kerentanan** (`info/low/moderate/high/critical = 0`, prod 98, dev 0).
- `npm outdated`: hanya **bcryptjs 2.4.3 → 3.0.3** dan **express 4.22.3 → 5.3.0** (major, bukan CVE). `jsonwebtoken@9.0.3`, `pg@8.23.1` terkini.

## 2. Autentikasi / JWT
- `JWT_SECRET`: 44 karakter (~207 bit), tidak bocor ke file tracked. **Tapi** ada fallback lemah: `jwtSecret: process.env.JWT_SECRET || 'dev-secret-ganti'` dan `esp32ApiKey: ... || 'HARVEST123'` (`src/config.js:21,23`).
- Uji token → `alg=none` 401 ✓, secret salah 401 ✓, expired 401 ✓, tanpa Bearer/sampah 401 ✓.
- **Deviasi**: HS384/HS512 dengan secret benar **diterima → 200** (harusnya hanya HS256); **token tanpa `exp` diterima → 200**; `iat` masa depan diterima; tanpa revocation/refresh (`/logout` stateless).
- bcrypt `hash(...,12)`; DB `cost=12`, `algo=$2y$`, 0 plaintext.
- Login: pesan/status sama utk semua gagal ✓, **tapi timing beda jelas: user tak ada 1–22 ms vs password salah 304 ms → enumerasi username** (`src/auth.js:127` return null sebelum `bcrypt.compare`). Respons gagal membalik `input.username`.

## 3. Otorisasi horizontal (GET)
| Endpoint | demo | petani | admin | anonim |
|---|---|---|---|---|
| GET /user | **200 (3 user + email)** | 403 | 200 | 401 |
| GET /user/3 | **200 (data user petani)** | 403 | 200 | 401 |
| GET /laporan | 200 | 403 | 200 | 401 |
| GET /profil | 200 → id 2 | 200 → id 3 | 200 → id 1 | 401 |

- `/profil` scoped by `sub` → tidak ada IDOR profil. Petani 403 di `/user,/laporan,/meja,/semai,/siklus,/notifikasi-wa` ✓. ID invalid → 404 identik (anti-enumeration) ✓.
- Tabel bisnis **tidak punya `user_id`** (hanya `sessions`) → model data farm global, bukan multi-tenant.

## 4. X-API-KEY
- Dibandingkan `crypto.timingSafeEqual` + cek panjang (**bukan SQL**); SQLi probe (`' OR '1'='1`, key 5000 char) → 403 tanpa galat SQL ✓. Key aktif 21 char, bukan default; `HARVEST123` ditolak (403).
- Inkonsistensi: `/api/get-thresholds` → 403 tanpa key; **`/api/latest-sensor` → 200 anonim** dan **`/monitoring/getReport6Jam` → 200 anonim** (data sensor + alert_logs terbuka).

## 5. Transport & header (live `curl -sD -`)
- Ada: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Cache-Control: no-store`, `X-RateLimit-Limit: 300`; `X-Powered-By` & `Server` absen ✓.
- **CSP/HSTS/ACAO: null — tanpa helmet & tanpa CORS middleware** (preflight OPTIONS 200 tanpa ACAO).
- **Transport**: `deploy-pi/nginx/vertonik.conf` hanya `listen 80` tanpa `ssl_certificate`, `HTTPS=1` tidak aktif, folder `certs/` tidak ada → **JWT & X-API-KEY plaintext**.

## 6. Batas & anti-DoS
- 256 kb → 413 ✓ (nginx `client_max_body_size 256k` menyamakan).
- **Body depth: klaim 422 TIDAK terbukti** — JSON depth 40/200/5000 lolos parse → 404 (tanpa limit depth; body size sudah membatasi risiko).
- Rate limit terpasang, **tapi**: in-memory `Map` → reset saat restart; `trust proxy` **tidak diset** padahal nginx mengirim `X-Forwarded-For` → `req.ip` selalu `127.0.0.1` → **semua klien berbagi SATU bucket** (11 POST login bisa mengunci login semua orang 60 detik).

## 7. Kebocoran
- 500 generik terbukti 3 kasus (`/laporan?dari=bukan-tanggal`, `/monitoring/tarik?dari=xxx`, `/laporan/csv?dari=xxx`) → tanpa stack, tanpa teks SQL ✓.
- CRLF di nama file CSV ditolak Node → 500 generik, `Set-Cookie` tidak terinjeksi ✓. Tidak ada endpoint debug; respons selalu JSON.

## 8. File / permission / git
- `.env` di `.gitignore` ✓; `git log --all --full-history -- .env` kosong ✓; nilai JWT_SECRET/APP_KEY tak ada di file tracked ✓.
- **`DATABASE_URL` live (dengan password) IDENTIK dengan `.env.example` yang di-commit** (sha256 awal `cc8fa2511af6` sama) → kredensial DB di riwayat git.
- **KRITIS: password admin literal di 11 file tracked** (docs/TUGAS_2_ENVIRONMENT.md, docs/ANALISIS_BACKEND.md, docs/KONTRAK_API.md, docs/DB_SCHEMA.md, backend-nodejs/docs/DB_SCHEMA.md, backend-nodejs/README.md, scripts/loadtest.js, scripts/smoke-test.sh, jalankan-local.sh, deploy-pi/PANDUAN.md) + `git log -S` → 4 commit; password demo di 4 file.
- Token `eyJ…` tidak ada di file tracked ✓; `remember_token` 0 baris; `sessions` 16 baris legacy (tak dipakai backend Node).

## Peta OWASP API Security Top 10 (2023)
| Item | Status | Bukti ringkas |
|---|---|---|
| API1 BOLA | SEBAGIAN | Profil scoped by sub; tapi tabel bisnis tanpa `user_id` → semua user lihat seluruh data farm |
| API2 Broken Auth | **RISIKO** | Timing login enumerasi, token tanpa exp diterima, HS384/512 diterima, tanpa revocation, password admin di git history |
| API3 BOPLA | SEBAGIAN | Kolom rahasia tidak pernah dibalik; tapi daftar user+email + target WA terbuka utk akun demo |
| API4 Resource Consumption | SEBAGIAN | 413 & rate limit ada; counter in-memory, key IP global, tanpa limit depth |
| API5 BFLA | **RISIKO** | **POST /monitoring/saveSensor & saveAlert anonim → 400 (bukan 401/403)** — fungsi tulis terbuka |
| API6 Sensitive Business Flow | **RISIKO** | Rate limit global bisa dipakai bersama; kredensial demo dipublikasikan di 4 file docs |
| API7 SSRF | AMAN | Satu-satunya fetch hard-coded `api.fonnte.com`; tak ada URL dari input user |
| API8 Misconfig | SEBAGIAN | Positif: header bersih, .env tak di-commit. Negatif: fallback secret, tanpa CSP/HSTS, port 80 saja |
| API9 Inventory Mgmt | SEBAGIAN | Kontrak lengkap; endpoint legacy CI4 tanpa guard, gaya respons dua-rupa, tanpa versi API |
| API10 Unsafe Consumption | SEBAGIAN | SQL parameterisasi ✓; data ESP32 mentah divalidasi rentang? belum (saveSensorRows) |

## Temuan (JSON)
```json
{
  "verdict": "ADA RISIKO",
  "findings": [
    {"severity":"KRITIS","area":"Kredensial di version control","detail":"Password admin literal di 11 file tracked + 4 commit history; password demo di 4 file; password tsb membuka login 200.","fix":"Rotasi password, ganti dengan placeholder di docs/scripts, pertimbangkan filter-history, pin sebagai env-only."},
    {"severity":"SEDANG","area":"Rate limit efektif GLOBAL + in-memory","detail":"Tanpa trust proxy → req.ip selalu 127.0.0.1 → semua klien satu bucket; counter reset saat restart.","fix":"app.set('trust proxy',1) + whitelist loopback; counter ke Redis/DB bila perlu; limit_req di nginx."},
    {"severity":"SEDANG","area":"Akun demo bersama = baca data pengelola","detail":"Token demo bisa GET /user (daftar+email), /user/:id, /laporan, /notifikasi-wa.","fix":"Scope data dummy utk demo / field-level auth; jangan publikasikan kredensial demo."},
    {"severity":"SEDANG","area":"Endpoint tulis publik tanpa auth (BFLA)","detail":"POST /monitoring/saveSensor & /monitoring/saveAlert tanpa requireAuth/X-API-KEY → bisa suntik baris sensor & alert (pemicu notif WA).","fix":"Terapkan requireApiKey (atau hapus bila duplikat /api/save-sensor) + validasi rentang."},
    {"severity":"SEDANG","area":"Transport / TLS","detail":"nginx listen 80 tanpa SSL; JWT 12h & X-API-KEY plaintext.","fix":"TLS Let's Encrypt + HSTS; backend hanya loopback."},
    {"severity":"SEDANG","area":"DATABASE_URL di git","detail":".env.example identik dengan nilai live (ada password).","fix":"Placeholder di .env.example, ganti password DB, bersihkan history."},
    {"severity":"SEDANG","area":"Enumerasi username via timing","detail":"1–22 ms (user tak ada) vs 304 ms (password salah).","fix":"bcrypt.compare terhadap hash dummy konstan."},
    {"severity":"SEDANG","area":"Exposure data sensor publik","detail":"/api/latest-sensor & /monitoring/getReport6Jam 200 anonim.","fix":"Minimalisir payload / token ringan; dokumentasikan eksposur yang diterima."},
    {"severity":"CATATAN","area":"JWT alg & expiry tidak diikat","fix":"jwt.verify {algorithms:['HS256'], maxAge:'12h'} + wajib exp; jti+blocklist/refresh."},
    {"severity":"CATATAN","area":"Fallback secret lemah","fix":"throw bila JWT_SECRET/ESP32_API_KEY kosong/pendek di production."},
    {"severity":"CATATAN","area":"Header & CORS","fix":"helmet/CSP default-src 'none'; HSTS setelah TLS; tanpa ACAO bila satu origin."},
    {"severity":"CATATAN","area":"Body depth tanpa limit","fix":"Limit depth eksplisit / validasi skema sebelum olah body."},
    {"severity":"CATATAN","area":"Dependensi major tertinggal","fix":"Jadwalkan bcryptjs 3.x & evaluasi express 5.x; CI npm audit."},
    {"severity":"CATATAN","area":"Skema tanpa kepemilikan","fix":"Owner_id + predicate bila kelak multi-tenant; dokumentasikan model global-satu-farm."},
    {"severity":"CATATAN","area":"Token lama Laravel","fix":"Bersihkan tabel sessions bila Laravel sudah tak dipakai."}
  ]
}
```

## Catatan pelaksanaan
Read-only terpenuhi: 0 edit file repo, 0 DML. Login POST 5× (2 sukses, 3 gagal utk timing). Token di `/tmp/sec_tok_*.txt`. Password/token/nilai rahasia tidak pernah dicetak ke laporan.
