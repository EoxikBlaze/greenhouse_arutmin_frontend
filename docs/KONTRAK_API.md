# KONTRAK API — GARAP

Kontrak resmi backend Node.js (`backend-nodejs/`). Nama rute **sama persis** dengan kontrak
Laravel lama (`docs/API_ROUTES.md`) — tidak boleh diganti sendiri.
Semua contoh di bawah **diambil langsung dari server hidup**, 17 Okt 2026.

Versi mesin-baca: **`docs/openapi.yaml`** (OpenAPI 3.0 — bisa diimpor ke Postman/Insomnia).

---

## 1. Ringkasan

| Aspek | Ketentuan |
|---|---|
| Base URL (dev) | `http://127.0.0.1:8000` (bind localhost saja) |
| Base URL (Pi) | `http://<ip-pi>/` lewat nginx → proxy ke `127.0.0.1:8000` |
| Content type | Selalu `application/json; charset=utf-8` — **kecuali 3 rute CSV** |
| Autentikasi manusia | `Authorization: Bearer <token JWT>` (HS256, 12 jam) |
| Autentikasi perangkat | Header `X-API-KEY: *** login rate limit | `POST /login` **10/menit/IP** |
| Rate limit tulis | `60/menit/IP` |
| Ukuran body maks | 256 KB (nginx `client_max_body_size 256k` disamakan) |
| Navigasi browser | `Sec-Fetch-Mode: navigate` → dibalas **204 kosong** (bukan error) |

### Role

| Role | Boleh |
|---|---|
| `admin` | semua |
| `petani` | `dashboard`, `monitoring*`, `tanam*`, `profil*`, `logout` |
| `demo` | baca semua (admin read-only) + **tambah** data sementara (auto-hapus 1 jam); dilarang edit/hapus, kelola user, ganti profil, kontrol kran, uji kirim WA |
| `ESP32` | header `X-API-KEY` → `/api/get-thresholds`, `/api/save-sensor`, `/api/notif-hardware` |

---

## 2. Format error (selalu sama)

```json
{ "message": "pesan generik dalam bahasa Indonesia" }
```
Tidak pernah ada stack trace, path server, SQL, atau kolom `password`.
Beberapa rute memakai format validasi Laravel-style:

```json
{ "message": "Data tidak valid.", "errors": { "field": ["pesan"] }, "input": { "username": "..." } }
```

| Status | Arti | Contoh pesan |
|---|---|---|
| `204` | request navigasi browser (by design) | *(kosong)* |
| `400` | JSON rusak | `Format JSON tidak valid.` |
| `401` | tanpa/salah token | `Tidak terautentikasi.` |
| `403` | role / API key ditolak | `Akses ditolak.` · `Unauthorized` |
| `404` | rute tak dikenal | `The route /x could not be found.` |
| `404` | data tidak ada / id tidak valid | `Data tidak ditemukan.` — body **identik** (lihat catatan §2b) |
| `422` | validasi gagal | `Username / Password salah.` |
| `429` | rate limit | header `Retry-After` |
| `500` | error server | `Terjadi kesalahan pada server.` |

**Respons error nyata:**
```jsonc
// 401
{"message":"Tidak terautentikasi."}
// 403 (petani → /user)
{"message":"Menu ini untuk pengelola. Silakan gunakan menu \"Tanam Saya\"."}
// 403 (ESP32 tanpa X-API-KEY)
{"status":false,"msg":"Unauthorized"}
// 404
{"message":"The route /tidak-ada could not be found."}
// 404 data tidak ada — dipakai juga untuk id non-angka & id melebihi rentang bigint
{"message":"Data tidak ditemukan.","errors":{}}
// 422 (login salah)
{"message":"Username / Password salah.","errors":{"username":["Username / Password salah."]},"input":{"username":"admin"}}
```

**§2b — 404 seragam (anti-enumeration).** Untuk rute `/:id`, tiga kondisi dibalas
**byte-identik** `{"message":"Data tidak ditemukan.","errors":{}}`:
(1) id salah format seperti `abc`, (2) id angka melebihi rentang `bigint`
(`9223372036854775808`), (3) id valid tetapi tidak ada di database.
Validasi format id dijalankan **sebelum** query — PostgreSQL tidak pernah sempat
melempar `invalid input syntax` (500). Dasar: RFC 9110 §15.5.5 (server tidak wajib
mengungkap keberadaan resource) + OWASP IDOR Prevention (*map both cases to the same
public response, such as a 404*). `400` hanya untuk body/query rusak; `422` tidak
dipakai untuk path parameter. *(Diverifikasi independen oleh agent verifier, 19 Okt 2026.)*

---

## 3. Autentikasi

### `POST /login` — publik (rate limit 10/menit)

Request:
```json
{ "username": "admin", "password": "***" }
```
Respons `200`:
```json
{
  "status": true,
  "message": "Login berhasil.",
  "token": "eyJhbG...<205 karakter>",
  "user": { "id": "1", "username": "admin", "email": "admin@politala.ac.id", "level": "admin", "is_demo": false },
  "redirect": "/dashboard"
}
```
Respons `422` (salah) → lihat §2. `redirect` = `/tanam` untuk role petani.

Akun seed: `admin / <ADMIN_PASSWORD>` · `petani / <PETANI_PASSWORD>` · `demo / <DEMO_PASSWORD>` (nilai password: `backend-nodejs/.env`)

| Endpoint | Method | Guard |
|---|---|---|
| `/` · `/login` | GET | publik (info JSON) |
| `/logout` | GET | publik — stateless, client buang token |

---

## 4. Endpoint ESP32 (`X-API-KEY`)

### `GET /api/get-thresholds`
```json
{
  "status": true,
  "thresholds": {
    "waterTemp": { "min": 5,  "max": 40 },
    "ph":        { "min": 5,  "max": 7  },
    "tds":       { "min": 50, "max": 1000 },
    "airTemp":   { "min": 20, "max": 40 },
    "humidity":  { "min": 50, "max": 90 }
  },
  "fetched_at": "2026-10-17T05:26:22.192Z"
}
```
Cache 60 detik. Tanpa key → `403 {"status":false,"msg":"Unauthorized"}`.

### `POST /api/save-sensor`
Request (field `solenoid_state` opsional — status katup yang terbaca di perangkat):
```json
{
  "waterTemp": 26.9, "ph": 6.5, "tds": 1200,
  "airTemp": 31, "humidity": 66,
  "water_level": "Sedang", "solenoid_state": "OFF"
}
```
Respons `200`:
```json
{ "status": "ok", "command": "AUTO", "mode": "MANUAL", "server_time": "2026-10-17T03:59:31.499Z" }
```
- **1 round-trip CTE**: anti-duplikat (nilai sama dengan baris terakhir → tidak diinsert) + INSERT `monitorings` + UPDATE `water_controls`.
- `command` yang dikembalikan harus dieksekusi perangkat: `AUTO` · `FORCE_STOP` · nilai lain menunggu mode `MANUAL`.
- Baris identik berurutan tidak membuat grafik ganda.

### `POST /api/notif-hardware`
```json
{ "type": "solenoid", "value": "ON (manual)" }
```
→ `200 {"status":"ok"}`, masuk `alert_logs`.

### `GET /api/latest-sensor` — **tanpa guard** (dipakai SPA & Flutter)
```json
{
  "is_online": false,
  "seconds_ago": 196944,
  "anomalies": [ { "sensor": "tds", "value": 1200, "min": 50, "max": 1000 } ],
  "sensor": { "id": "100012", "waterTemp": 26.9, "ph": 6.5, "tds": 1200, "airTemp": 31,
              "humidity": 66, "water_level": "Sedang", "created_at": "2026-10-14T22:43:58.000Z" },
  "water_control": { "mode": "MANUAL", "valve_state": "OFF", "command": "AUTO",
                     "updated_at": "2026-10-14T22:43:58.000Z" }
}
```
Cache 2 detik. `is_online = true` bila data terakhir ≤ 120 detik.

> **✅ Sejak gelombang 7 (19 Okt 2026):** `POST /monitoring/saveSensor` dan
> `POST /monitoring/saveAlert` **wajib `X-API-KEY`** (guard `requireApiKey`, sama dengan
> `/api/save-sensor`) — tanpa key → `403 {"status":false,"msg":"Unauthorized"}`.
> Kontrak lama "publik tanpa API key" resmi DIHAPUS; nol pemanggil legacy terdampak.

---

## 5. Endpoint manusia (JWT)

### Dashboard · Monitoring · Tanam
| Method | Path | Guard | Catatan |
|---|---|---|---|
| GET | `/dashboard` | semua role | cache 5 dtk |
| GET | `/monitoring` | semua | `{page:"monitoring"}` |
| GET | `/monitoring/chart-data` | semua | array **288 baris terakhir** (urut mundur) |
| GET | `/monitoring/tarik` | semua | `?dari&sampai&per_page=10` |
| GET | `/monitoring/tarik/csv` | semua | `text/csv` |
| GET | `/monitoring/getReport6Jam` | **publik** | rata-rata 6 jam + alert |
| GET | `/tanam` | semua | `{page, list:[{id,tipe,status,mulai,varietas,meja,id_meja,jumlah,durasi_hari,hari_ke,siap,tahap_berikut,...}]}` — hanya batch `status='proses'`; `durasi_hari` dari `sikluses` (NULL bila belum diisi), `siap` = `hari_ke ≥ durasi_hari` |
| GET | `/tanam/pilihan` | semua | `{tanaman:[{id,nama,id_meja,semai,peremajaan,pendewasaan}], meja:[{id,nama}]}` — untuk form Mulai tanam (petani tak punya akses `/tanaman` & `/meja`) |
| POST | `/tanam/mulai` | semua + demoGuard | body: `id_tanaman, id_meja, jumlah_benih, id_siklus?, tgl_awal_semai?, keterangan?` — `id_siklus` diisi otomatis dari siklus "Semai" tanaman |
| POST | `/tanam/:tipe/:id/selesai` | semua + demoGuard | `tipe` ∈ `semai\|peremajaan\|pendewasaan` (lainnya 422). Body `{berhasil, keterangan?}`: gagal = jumlah − berhasil, tahap ditutup hari ini, tahap berikutnya dibuat otomatis berisi yang berhasil (pendewasaan → baris `panens`); berhasil 0 → status `gagal`; sudah ditutup → 409; berhasil > jumlah → 422. Tanpa body: hanya ditandai selesai (perilaku lama web) |
| POST | `/tanam/:id/hapus` | semua + cek demo di handler | hapus batch semai |

Contoh `GET /dashboard` (dipotong):
```json
{ "page": "dashboard",
  "iotStatus": { "online": false, "seconds_ago": 196944, "diff_text": "196944 detik yang lalu",
                 "last_seen": "2026-10-14T22:43:58.000Z" },
  "total_tanaman": 2, "total_meja": 5, "total_siklus": 6, "total_semai": 2,
  "total_peremajaan": 4, "total_pendewasaan": 3, "total_panen": 2, "total_panen_qty": 22, ... }
```

Contoh `GET /monitoring/chart-data` (elemen pertama):
```json
{ "id": "1", "waterTemp": 26.1, "ph": 6.4, "tds": 1180, "airTemp": 31.2, "humidity": 68,
  "water_level": "Sedang", "created_at": "2026-10-14T22:11:32.000Z" }
```

### Water control · Laporan (admin + demo)
| Method | Path | Guard tambahan | Body |
|---|---|---|---|
| GET | `/watercontrol`, `/watercontrol/status` | — | — |
| POST | `/watercontrol/fill`, `/stop`, `/setMode` | demoGuard (demo ditolak) | `setMode`: `{"mode":"AUTO\|MANUAL"}` |
| GET | `/laporan`, `/laporan/csv` | — | — |

> Catatan: fitur notifikasi WhatsApp (`GET/POST /notifikasi-wa`, `POST /notifikasi-wa/uji`) sudah dihapus dari aplikasi — rute tersebut kini 404.

`GET /watercontrol/status`:
```json
{ "id":"1", "command":"AUTO", "mode":"MANUAL", "valve_state":"OFF", "updated_at":"2026-10-17T03:59:31.000Z" }
```

### Master & tahap (CRUD, admin + demo)
| Path | Tabel | Kolom yang diterima (whitelist) |
|---|---|---|
| `/meja` | `mejas` | `meja`, `jumlah_lubang`, `jenis_talang` (enum `NFT\|DFT`), `kapasitas_penampung_l` (angka > 0), `jumlah_talang`, `lubang_per_talang`, `panjang_talang_m`, `laju_per_talang_lpm`, `kenaikan_air_cm` (integer, DEFAULT 40) — **+ kolom baca-saja `created_at`, `updated_at`, `expires_at`** (ikut `GET`, ditolak saat `POST`/`PUT`) |
| `/tanaman` | `tanamen` | `nama_tanaman`, `id_meja` |
| `/siklus` (+ `GET /siklus/csv`) | `sikluses` | `id_tanaman`, `nama_siklus`, `waktu_siklus` |
| `/ambang` | `sensor_thresholds` | `sensor`, `min`, `max` |
| `/semai` (+ `/semai/batch/:id`, `/semai/selesai`) | `semais` | lihat skema |
| `/peremajaan`, `/pendewasaan`, `/panen` | tabel masing-masing | lihat skema |

Pola CRUD: `GET /x` daftar · `POST /x` → **201** `{"status":true,"message":"Data berhasil ditambahkan.","data":{...}}` ·
`GET /x/:id` · `PUT|PATCH /x/:id` · `DELETE /x/:id` → `{"status":true,"message":"Data dihapus."}`

> **⚠️ Kontrak yang belum terpenuhi:** `GET /x` (daftar) **tidak mengirim primary key**,
> sedangkan `PUT/DELETE /x/:id` membutuhkannya. Lihat `docs/ANALISIS_BACKEND.md` §6.2.

### Konfigurasi & acuan skema V2 (gelombang 8 · 19 Okt 2026)

Delapan tabel hasil migrasi `database/migrations/2026-10-19_*` kini terbaca lewat JWT
dengan **guard sama seperti `/meja` · `/ambang`**: baca = admin + demo (petani → 403
`Menu ini untuk pengelola...`), tulis = **admin saja** (demo ditolak `demoGuard`,
tanpa token → `401 {"message":"Tidak terautentikasi."}`). Rute baru: `src/routes/konfigurasi.js`.

| Method | Path | Guard | Baris | Catatan |
|---|---|---|---|---|
| GET · PUT | `/konfigurasi-dosis` (+ `/:param`) | admin+demo · **PUT admin** | 19 | PUT kolom `nilai`, `satuan`, `keterangan`, `sumber` |
| GET · PUT | `/timing-operasi` (+ `/:param`) | admin+demo · **PUT admin** | 16 | PUT kolom sama |
| GET | `/aturan-fail-safe` (+ `/:kode`) | admin+demo | 20 | baca saja |
| GET | `/jadwal-perawatan` (+ `/:kode`) | admin+demo | 5 | baca saja |
| GET | `/kalibrasi-sensor` (+ `/:sensor`) | admin+demo | 8 | baca saja |
| GET | `/mapping-channel` (+ `/:kode`) | admin+demo | 15 | baca saja |
| GET · PUT | `/target-nutrisi` (+ `/:id`) | admin+demo · **PUT admin** | 3 | PUT kolom `id_tanaman`, `tahap`, `umur_*_hari`, `ec_*_ppm`, `ph_*`, `status`, `keterangan`, `sumber` |
| GET | `/penampung-states` (+ `/:id_meja`) | admin+demo | 5 | `?id_meja=` per meja (satu-satunya sumber dengan kolom `id_meja`) |

Ketentuan:
- **`?id_meja=`** hanya dijalankan pada `/penampung-states`; pada tabel lain param
  **diabaikan** (tabel itu tidak punya kolom `id_meja`). Nilai non-angka →
  `422 {"message":"Data tidak valid.","errors":{"id_meja":["Filter id_meja harus berupa angka yang valid."]}}`.
- **`GET /x/:id`** memakai 404 seragam §2b — PK varchar (`param`/`kode`/`sensor`) maupun
  id non-angka/tidak-ada sama-sama `{"message":"Data tidak ditemukan.","errors":{}}`.
- **`PUT`** → `{"status":true,"message":"Data berhasil diperbarui.","data":{...}}`;
  body kosong (tanpa kolom whitelist) → `422 {"message":"Tidak ada data yang dikirim.","errors":{}}`;
  kolom di luar whitelist dibuang + dicatat di log server; PK tidak pernah bisa diubah.
- **Validasi Zod SEBELUM query** (422 kontrak §2): `nilai` number, `umur_*_hari` integer,
  `status` enum `menunggu_konfirmasi|aktif|kadaluarsa`, `id_tanaman` harus terdaftar, dan
  rentang `ec_min_ppm ≤ ec_max_ppm` / `ph_min ≤ ph_max` / `umur_min_hari ≤ umur_max_hari`
  diperiksa terhadap gabungan nilai lama + kiriman — semua dilakukan di aplikasi agar
  CHECK/FK Postgres tidak pernah berujung 500.
- **Stempel waktu tidak disentuh saat PUT** (`diubah_pada`/`updated_at` tetap nilai lama) —
  hanya kolom yang diminta klien yang berubah, sehingga update selalu net-zero bila
  nilainya dikembalikan (uji gelombang 8: `SELECT *` sebelum == sesudah).
- Rute tulis memakai rate limit tulis 60/menit/IP (§1).

Contoh respons (server hidup):
```jsonc
// GET /konfigurasi-dosis → 200 (potongan)
[ { "param": "deadband_ec_ppm", "nilai": "100.0000", "satuan": "ppm",
    "keterangan": "Pita mati EC (±0,1 mS/cm) — masuk deadband = MONITORING",
    "sumber": "Perancangan FINAL Tabel 13", "diubah_pada": "2026-10-19T11:42:37.870Z" }, ... ]

// PUT /konfigurasi-dosis/deadband_ec_ppm  body: {"nilai":120} → 200
{ "status": true, "message": "Data berhasil diperbarui.",
  "data": { "param": "deadband_ec_ppm", "nilai": "120.0000", "satuan": "ppm", ... } }

// GET /penampung-states?id_meja=3 → 200
[ { "id_meja": "3", "status_lock": false, "lock_alasan": null, "lock_sejak": null,
    "mode_pemeliharaan": false, "kejadian_dosis_hari": 0, "volume_ab_hari_ml": "0.00",
    "volume_ph_hari_ml": "0.00", "target_ec_ppm": null, "target_ph": null,
    "reset_harian_pada": null, "updated_at": "2026-10-19T11:42:37.791Z" } ]

// PUT /target-nutrisi/1  body: {"ec_min_ppm":500,"ec_max_ppm":300} → 422
{ "message": "Data tidak valid.",
  "errors": { "ec_min_ppm": ["Nilai ec_min_ppm tidak boleh lebih besar dari ec_max_ppm."] } }

// GET /target-nutrisi/abc → 404 identik (§2b)
{ "message": "Data tidak ditemukan.", "errors": {} }
```

### Preset dosing & target penampung (24 Okt 2026)

Preset = baris `target_nutrisi` (tanaman | semua tanaman × tahap × rentang umur → rentang EC ppm & pH).
Penampung bermode `otomatis` mengambil target = titik tengah rentang preset aktif yang cocok dengan batch
berjalan di mejanya (preset tanaman didahulukan, lalu rentang umur tersempit); mode `manual` diisi admin.
Sinkron otomatis: saat server menyala, tiap 10 menit, setelah `/tanam/mulai` & `/tanam/:tipe/:id/selesai`,
dan setelah preset/mode berubah. Petani → 403; demo baca saja.

| Metode | Path | Peran | Keterangan |
|---|---|---|---|
| GET | `/dosing/preset` | admin+demo | daftar preset + `nama_tanaman` |
| POST | `/dosing/preset` | **admin** | `{id_tanaman?, tahap: Semai\|Peremajaan\|Pendewasaan, umur_min_hari?, umur_max_hari?, ec_min_ppm?, ec_max_ppm?, ph_min?, ph_max?, status?: aktif\|menunggu_konfirmasi\|kadaluarsa, keterangan?}` → 201. EC 50–2500, pH 3–9, min ≤ max; preset aktif wajib punya rentang EC atau pH (422). Duplikat tanaman+tahap+umur awal → 409 |
| PUT | `/dosing/preset/:id` | **admin** | kolom yang sama (parsial, dicek silang dengan nilai lama) |
| DELETE | `/dosing/preset/:id` | **admin** | penampung yang memakainya dihitung ulang (target kosong bila tak ada preset lain) |
| GET | `/dosing/target` | admin+demo | per meja: `{id_meja, meja, target_mode, target_ec_ppm, target_ph, target_preset_id, status_lock, batch:{tahap,nama_tanaman,umur_hari,…}\|null, preset_cocok\|null, catatan}` |
| PUT | `/dosing/target/:id_meja` | **admin** | `{mode:'otomatis'}` atau `{mode:'manual', target_ec_ppm?, target_ph?}` (manual wajib salah satu; EC 50–2500, pH 3–9) |
| POST | `/dosing/sinkron` | **admin** | hitung ulang semua penampung otomatis → `{berubah}` |

Preset awal Melon, Selada, Daun Bawang, Bayam beserta sumbernya: `docs/PRESET_NUTRISI.md`.

### Kalibrasi alat IoT (25 Okt 2026)

Jadwal, riwayat, dan konstanta firmware (`PH_V7`, `PH_V4`, `TDS_FAKTOR_KOREKSI` di `firmware/sensor/sensor.ino`).
`status` jadwal: `terlambat` (lewat `periode_hari_max`), `segera` (lewat `periode_hari_min`), `aman`, `belum`,
`tanpa_jadwal`. Petani → 403; demo baca saja.

| Metode | Path | Peran | Keterangan |
|---|---|---|---|
| GET | `/kalibrasi` | admin+demo | per alat: `{sensor, label, metode, larutan_ref, nilai_ref, satuan, periode_hari_min/max, toleransi, konstanta, terakhir_dikalibrasi, perangkat_kode, perangkat_online, log_terakhir, status, jatuh_tempo}` |
| GET | `/kalibrasi/:sensor/riwayat` | admin+demo | 100 log terbaru |
| POST | `/kalibrasi/ph` | **admin** | `{buffer1?=6.86, baca1, buffer2?=4.0, baca2, catatan?}` → hitung & simpan `PH_V7`/`PH_V4` baru (bacaan = pH yang tampil di sistem saat probe di buffer). 422 bila bacaan kosong / selisih < 0,3 / buffer selisih < 1 |
| POST | `/kalibrasi/ec` | **admin** | `{ref_us_cm?=1413, baca_ppm, catatan?}` → `TDS_FAKTOR_KOREKSI` baru = lama × (ref×0,5)/baca; faktor di luar 0,3–3 → 422 |
| POST | `/kalibrasi/:sensor` (lainnya) | **admin** | `{nilai_ref?, bacaan_sebelum?, bacaan_sesudah?, lulus?, catatan?}`; `lulus` otomatis bila selisih ≤ `toleransi` |
| PUT | `/kalibrasi/:sensor` | **admin** | `{periode_hari_min?, periode_hari_max?, toleransi?, nilai_ref?, larutan_ref?, konstanta?: {NAMA: angka}}` |

### User · Profil
| Method | Path | Guard |
|---|---|---|
| GET/POST · GET/PUT/PATCH/DELETE `/:id` | `/user` | admin+demo, **cek demo di handler** (tambah/ubah/hapus ditolak) |
| GET | `/profil` | semua |
| POST | `/profil/update` | semua |
| GET/POST | `/profil/password` | semua — butuh `password_lama` + `password_confirmation` |

`GET /user` (tanpa field password):
```json
[ { "id":"3", "username":"petani", "email":"petani@vertonik.local", "level":"petani", "is_demo":false } ]
```

### Riwayat audit (admin)
| Method | Path | Guard |
|---|---|---|
| GET | `/audit-logs` | admin — **petani 403**, token demo lolos (setara halaman `/audit`) |

Middleware `src/audit.js` (dipasang sekali di `index.js`) mengisi tabel `audit_logs`
untuk tiap aksi tulis SUKSES: `create`/`update`/`delete` pada rute CRUD, perubahan
profil & konfigurasi V2, serta `login` berhasil. Kunci rahasia (password/hash/token)
TIDAK PERNAH ikut di `before_data`/`after_data`; peran pelaku ada di `meta.level`.

Query: `?page=1` (min 1) · `?per_page=20` (1..100) · `?tabel=mejas` · `?aksi=create`
(param cacat → 422 kontrak; filter tidak peka huruf besar/kecil). Balasan:
```json
{ "data": [ { "id": 1, "terjadi_pada": "2026-10-21T06:12:33.482Z", "actor_label": "garap", "aksi": "update", "tabel": "mejas", "row_id": "12", "before_data": { "jumlah_lubang": 7 }, "after_data": { "jumlah_lubang": 11 } } ], "total": 1, "page": 1, "per_page": 20 }
```

### CSV (satu-satunya respons non-JSON)
`GET /siklus/csv` · `GET /laporan/csv` · `GET /monitoring/tarik/csv`
→ `Content-Type: text/csv; charset=UTF-8`, `Content-Disposition: attachment`, diawali BOM UTF-8.

---

## 6. Perubahan kontrak untuk 2 ESP32 (BELUM AKTIF — usulan)

Detail & alasan: `docs/ARSITEKTUR_PI_2ESP32.md`. Semua **tambahan field opsional**
(jadi perangkat lama tetap jalan tanpa perubahan firmware):

| Endpoint | Tambahan | Default bila tidak dikirim |
|---|---|---|
| `POST /api/save-sensor` | `"device": "esp32-a"` | device pertama / tunggal |
| `GET /api/latest-sensor` | `?device=esp32-a` | data terakhir semua device |
| `GET /api/get-thresholds` | `?device=esp32-a` | ambang global |
| `X-API-KEY` | 1 kunci per device (`ESP32_KEY_A/B` di `.env`) | kunci lama tetap sah |

---

## 7. Cara menguji kontrak ini

```bash
bash backend-nodejs/scripts/smoke-test.sh        # 20 pemeriksaan, semua LULUS
```
Impor `docs/openapi.yaml` ke Postman → **Import → File → pilih file** → semua endpoint
langsung tersedia dengan contoh body.
