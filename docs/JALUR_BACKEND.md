# JALUR BACKEND — Vertonik Smart Farm

Dokumen ini melacak **satu request dari awal sampai respons**, supaya jelas ke mana
request pergi ketika Anda menambah/mengubah fitur. Sumber kebenaran kode:
`backend-nodejs/src/` (file & baris dicantumkan).

Diagram visual: **`docs/jalur-backend.html`** (buka di browser).

---

## 0. Siapa yang memulai jalur

| Klien | Contoh request | Cara masuk |
|---|---|---|
| React SPA (`react-web-app`) | `GET /dashboard` | proxy **Vite :5173** → `http://127.0.0.1:8000` (same-origin, browser tak tahu port backend) |
| Flutter (`flutter_mobile_app`) | `GET /api/latest-sensor` | langsung `http://127.0.0.1:8000` |
| ESP32 | `POST /api/save-sensor` | lewat **nginx :80** (Pi) → `127.0.0.1:8000`, header `X-API-KEY` |
| Browser dibuka manual | `http://127.0.0.1:8000/dashboard` | dikirim dengan `Sec-Fetch-Mode: navigate` |

Aturan proxy (sama persis di Vite `vite.config.ts` dan nginx `deploy-pi/nginx/vertonik.conf`):

```
Sec-Fetch-Mode: navigate  atau  Accept: text/html  →  halaman SPA (bypass, tidak ke backend)
selain itu (fetch/curl/axios/ESP32)                 →  diteruskan ke backend :8000
```

---

## 1. Pipeline middleware — urutan eksekusi (`src/index.js`)

Setiap request melewati 8 langkah **berurutan**; request berhenti begitu ada yang membalas.

| # | Langkah | File/baris | Bisa berhenti dengan |
|---|---|---|---|
| 1 | `express.json` 256 KB + `urlencoded` | `index.js:19-20` | **400** `"Format JSON tidak valid."` (JSON rusak) |
| 2 | Header keamanan: `nosniff`, `X-Frame-Options: DENY`, `no-referrer`, `no-store`, `x-powered-by` off | `index.js:23-29` | tidak pernah berhenti |
| 3 | **Navigasi browser?** (`GET` + `Sec-Fetch-Mode: navigate`) | `index.js:35-40` | **204 body kosong** (backend tanpa tampilan) |
| 4 | Rate limit per IP: GET **300**/mnt · tulis **60**/mnt · `/login` **10**/mnt | `index.js:45-52` + `rateLimit.js` | **429** + `Retry-After` |
| 5 | `demoPurge()` — hapus data demo lewat 1 jam (maks 1×/mnt, tanpa menggagalkan request) | `index.js:55` + `auth.js:104` | tidak pernah berhenti |
| 6 | **Router + guard** (lihat §2) → handler | `index.js:70-87` | **401** tanpa token · **403** salah role/API-key |
| 7 | 404 — rute tak dikenal | `index.js:90-92` | **404** `{"message":"The route /x could not be found."}` |
| 8 | Error handler | `index.js:95-101` | **500** `{"message":"Terjadi kesalahan pada server."}` (tanpa stack/SQL) |

Env untuk mengatur/mematikan langkah 4: `RATE_LIMIT_VIEW/WRITE/LOGIN`, `RATE_LIMIT_OFF=1`.

---

## 2. Peta mount → modul → guard (`src/index.js:70-87`)

Urutan `app.use()` ini **menentukan rute mana yang menang** (mount pertama yang cocok menang).

| Mount | Modul | Guard di mount | Catatan |
|---|---|---|---|
| `/` | `routes/auth.js` | **publik** | `GET /`, `GET /login`, `POST /login`, `GET /logout` |
| `/api` | `monitoring.js` → `api` | per rute: `X-API-KEY` | endpoint ESP32 |
| `/monitoring` | `monitoring.js` → `router` | per rute: `requireAuth` | 3 rute pertama publik |
| `/dashboard` | `routes/dashboard.js` | `requireAuth` + `requireRole('all')` | semua role |
| `/tanam` | `routes/tanam.js` | `requireAuth` + `requireRole('all')` | semua role |
| `/profil` | `routes/profil.js` | `requireAuth` + `requireRole('all')` | semua role |
| `/watercontrol` | `routes/watercontrol.js` | `requireAuth` + `requireRole(['admin','demo'])` | |
| `/laporan` | `routes/laporan.js` | idem admin+demo | |
| `/notifikasi-wa` | `routes/notifWa.js` | idem admin+demo | |
| `/user` | `routes/user.js` | idem admin+demo | pengecekan demo ada **di dalam handler** |
| `/` | `routes/master.js` | per sub-rute: `admin+demo` + `demoGuard('*.store')` | `/meja` `/tanaman` `/siklus` `/ambang` |
| `/` | `routes/tahap.js` | per sub-rute: `admin+demo` + `demoGuard('*.store')` | `/semai` `/peremajaan` `/pendewasaan` `/panen` |

`master` dan `tahap` dipasang **tanpa** wrapper global (`index.js:84-87`) supaya rute tak
dikenal tetap jatuh ke 404 JSON, bukan 401.

---

## 3. Daftar rute lengkap + guard (kontrak fixed)

### 3.1 Publik — `routes/auth.js`
| Method | Path | Guard | Ke handler → |
|---|---|---|---|
| GET | `/` | — | info JSON |
| GET | `/login` | — | info JSON |
| POST | `/login` | rate limit 10/mnt | `verifyLogin` → `users` (bcrypt) → `signToken` (JWT 12 jam) |
| GET | `/logout` | — | stateless (client buang token) |

### 3.2 ESP32 — `routes/monitoring.js` (`api`), mount `/api`
| Method | Path | Guard | Alur |
|---|---|---|---|
| GET | `/api/latest-sensor` | **tanpa guard** (publik untuk polling) | `cache 2 dtk` → `monitorings` + `water_controls` + `sensor_thresholds` → deteksi anomali |
| GET | `/api/get-thresholds` | `requireApiKey` (timing-safe) | `cache 60 dtk` → `sensor_thresholds` |
| POST | `/api/save-sensor` | `requireApiKey` | **1 CTE**: anti-duplikat + insert `monitorings` + update `water_controls` → balas `command` ke ESP32 |
| POST | `/api/notif-hardware` | `requireApiKey` | insert `alert_logs` (+ jalur notif WA) |

### 3.3 Monitoring — mount `/monitoring`
| Method | Path | Guard | Alur |
|---|---|---|---|
| GET | `/monitoring/getReport6Jam` | publik | rata-rata 6 jam + alert 6 jam |
| POST | `/monitoring/saveSensor` | publik | duplikat `save-sensor` (kompatibilitas lama) |
| POST | `/monitoring/saveAlert` | publik | insert `alert_logs` |
| GET | `/monitoring` | `requireAuth` | `{page:'monitoring'}` |
| GET | `/monitoring/chart-data` | `requireAuth` | `monitorings` 288 baris terakhir (index `created_at DESC`) |
| GET | `/monitoring/tarik` | `requireAuth` | paginasi `?dari&sampai&per_page` |
| GET | `/monitoring/tarik/csv` | `requireAuth` | `text/csv` (satu-satunya non-JSON) |

### 3.4 Semua role — mount `/dashboard`, `/tanam`, `/profil`
| Method | Path | Guard | Alur |
|---|---|---|---|
| GET | `/dashboard` | all | `cache 5 dtk` → 11 query paralel (metrik, pipeline 4 tahap, IoT, 5 panen terakhir) |
| GET | `/tanam` | all | gabungan `semai`+`peremajaan`+`pendewasaan` (JOIN ke `tanamen`/`mejas`) |
| POST | `/tanam/mulai` | all + `demoGuard('tanam.mulai')` | INSERT `semais` (`expires_at` +1 jam bila demo) |
| POST | `/tanam/:tipe/:id/selesai` | all + `demoGuard('tanam.selesai')` | UPDATE status `selesai` + tanggal akhir |
| POST | `/tanam/:id/hapus` | all + **cek `req.user.demo` di handler** | DELETE `semais` |
| GET | `/profil` | all | profil sendiri |
| POST | `/profil/update` · GET/POST `/profil/password` | all | UPDATE `users` (bcrypt cost 12) |

### 3.5 Admin + demo — mount `/watercontrol`, `/laporan`, `/notifikasi-wa`, `/user`
| Method | Path | Guard tambahan | Alur |
|---|---|---|---|
| GET | `/watercontrol` · `/watercontrol/status` | — | `water_controls` (1 baris dominan) |
| POST | `/watercontrol/fill\|stop\|setMode` | `demoGuard(...)` → **demo ditolak** | UPDATE `water_controls` |
| GET | `/laporan` · `/laporan/csv` | — | CTE per bulan (semai/remaja/dewasa/panen/pH) |
| GET/POST | `/notifikasi-wa` | `demoGuard('notifikasi-wa.update')` | `wa_settings` — `api_key` hanya versi tersamar, disimpan ter-enskripsi (AES) |
| POST | `/notifikasi-wa/uji` | `demoGuard('...uji')` → demo ditolak | kirim pesan uji Fonnte |
| GET/POST/PUT/PATCH/DELETE | `/user`, `/user/:id` | **cek `req.user.demo` di dalam handler** | `users`; tidak boleh hapus akun sendiri |

### 3.6 Master data — `routes/master.js` (guard `admin+demo` + `demoGuard('*.store')`)
| Method | Path | Tabel (`routes/_crud.js`) |
|---|---|---|
| GET/POST · GET/PUT/DELETE `/:id` | `/meja` | `mejas` (kolom `meja`, `jumlah_lubang`) |
| idem | `/tanaman` | `tanamen` (`nama_tanaman`, `id_meja`) |
| idem · + `GET /siklus/csv` | `/siklus` | `sikluses` (`id_tanaman`, `nama_siklus`, `waktu_siklus`) |
| idem | `/ambang` | `sensor_thresholds` (`sensor`, `min`, `max`) |

### 3.7 Tahap — `routes/tahap.js` (guard `admin+demo` + `demoGuard('*.store')`)
| Method | Path | Keterangan |
|---|---|---|
| GET | `/semai/selesai` · `/semai/batch/:id` | laporan batch (di depan route `/:id`) |
| GET/POST · `/:id` | `/semai`, `/peremajaan`, `/pendewasaan`, `/panen` | CRUD via `_crud.js` |

**Aturan CRUD** (`_crud.js`): `GET /x` daftar (tanpa PK — lihat temuan di
`docs/ANALISIS_BACKEND.md` §6.2) · `POST /x` → 201 + `RETURNING *` · `GET/PUT/DELETE /x/:id`.
Kolom yang masuk **difilter whitelist** → SQL selalu parameterized.

---

## 4. Lapisan setelah handler (ke mana data mengalir)

```
handler (routes/*.js)
   ├─ cache.js   remember(key, ttl, fn)   →  latest-sensor 2 dtk · dashboard 5 dtk · thresholds 60 dtk
   ├─ auth.js    signToken/requireAuth/requireRole/demoGuard/requireApiKey
   ├─ crypto.js  AES-256 (GCM baru / CBC legacy) untuk wa_settings.api_key
   └─ db.js      pool pg max 50 → q()/one() parameterized → PostgreSQL 17
                     └─ pool.on('error') ditahan → error koneksi tidak mematikan proses
```

Respons selalu `application/json` (kecuali rute CSV) — tanpa HTML, tanpa stack trace,
tanpa `password`.

---

## 5. Empat contoh trace end-to-end

### A. Login React → `POST /login`
1. Vite teruskan ke `:8000` (bukan navigasi, jadi tidak kena 204).
2. Pipeline 1→2→3→4 (rate limit login 10/mnt) →5.
3. `auth.js` → `verifyLogin()` → `SELECT * FROM users WHERE username=lower(trim($1))` → `bcrypt.compare`.
4. Salah → **422** generik. Benar → `signToken()` → **200** `{status, token(205 char), user, redirect}`.
5. React simpan token → tiap request berikutnya bawa `Authorization: Bearer *** B. `GET /dashboard` (sudah login)
1. Pipeline 1-5 → mount `/dashboard` → `requireAuth` (JWT valid?) → `requireRole('all')` (lolos utk semua level).
2. Handler → `cache.remember('dashboard', 5000, ...)` → **hit**: langsung balas (0 query DB); **miss**: 11 query paralel + JOIN panen.
3. Balas **200** 1914 byte. `petani` juga lolos; tanpa token → **401**.

### C. ESP32 kirim data → `POST /api/save-sensor`
1. Lewat nginx (Pi) atau langsung (lokal), header `X-API-KEY`.
2. Pipeline 1-5 → mount `/api` → `requireApiKey` (`timingSafeEqual`) → salah → **403** `{"status":false,"msg":"Unauthorized"}`.
3. `saveSensorRows()` → **satu CTE**: cek duplikat → INSERT `monitorings` → UPDATE `water_controls` (state katup + reset `AUTO`).
4. Balas `{status:'ok', command, mode, server_time}` → ESP32 mengeksekusi `command`.
5. Efek samping: cache `latest-sensor` (2 dtk) kedaluwarsa → dashboard SPA memperbarui diri di polling berikutnya.

### D. Admin tambah meja → `POST /meja` (dibanding akun demo)
1. Pipeline → mount `/` (`master.js`) → `requireAuth` → `requireRole(['admin','demo'])` → `demoGuard('meja.store')`.
2. **admin**: `demoGuard` lewat → `_crud.js` filter kolom whitelist → `INSERT INTO mejas ... RETURNING *` → **201**.
3. **demo**: lewat juga (tambah diizinkan) tapi barisnya diberi `expires_at` +1 jam → `demoPurge` menghapusnya sendiri.
4. **petani**: berhenti di `requireRole` → **403** `"Menu ini untuk pengelola..."`.
5. Tanpa token → **401**. Method DELETE oleh demo → `demoGuard` tolak **403**.

---

## 6. Cara melacak jalur sendiri (tanpa menebak)

```bash
# 1. Lihat status + header tiap lapisan
curl -s -D - http://127.0.0.1:8000/dashboard | head -12     # X-RateLimit-* = langkah 4 aktif

# 2. Buat sengaja 404/401 untuk melihat ke mana request jatuh
curl -s -w '\n%{http_code}\n' http://127.0.0.1:8000/rute-ngawur
curl -s -w '\n%{http_code}\n' http://127.0.0.1:8000/user      # 401 = berhenti di langkah 6

# 3. Lihat log runtime backend
cat /tmp/vsf-backend.log
```

Log tambahan sementara (tempel di `src/index.js` paling atas di dalam fungsi callback
server, lalu hapus setelah selesai) — **jangan commit**:

```js
app.use((req, res, next) => {
  res.on('finish', () => console.log(req.method, req.path, res.statusCode));
  next();
});
```

Peta cepat cari rute: `grep -n "router\.\(get\|post\|put\|delete\)" src/routes/*.js`
(dipakai untuk menyusun dokumen ini).

---

## 7. Daftar file & perannya

| File | Peran dalam jalur |
|---|---|
| `src/index.js` | pipeline 8 langkah, mount, 404/error, server HTTP(S) |
| `src/config.js` | baca `.env` (port, DB, JWT, APP_KEY, API-key) tanpa dependensi |
| `src/auth.js` | JWT · guard role · demo · API-key · purge demo |
| `src/rateLimit.js` | pembatas per-IP (window 1 mnt) |
| `src/cache.js` | TTL in-memory (cap 5000 key) |
| `src/crypto.js` | enkripsi at-rest |
| `src/db.js` | pool PostgreSQL |
| `src/routes/_crud.js` | CRUD generik whitelist → 8 resource |
| `src/routes/*.js` | 12 modul route sesuai tabel §2 |

Terkait: `docs/ANALISIS_BACKEND.md` (hasil uji + temuan) ·
`backend-nodejs/docs/RANCANGAN_BACKEND.md` (desain) ·
`backend-nodejs/scripts/smoke-test.sh` (uji 20 titik).
