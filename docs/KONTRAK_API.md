# KONTRAK API — Vertonik Smart Farm

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
// 422 (login salah)
{"message":"Username / Password salah.","errors":{"username":["Username / Password salah."]},"input":{"username":"admin"}}
```

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

Akun seed: `admin / @adminbersabda123` · `petani / petani123` · `demo / demo123`

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

> **⚠️ Kontrak lama:** `POST /monitoring/saveSensor` dan `POST /monitoring/saveAlert`
> juga **publik tanpa API key** (kompatibilitas lama) — terbukti bisa menulis data dari
> siapa pun. Lihat `docs/ANALISIS_BACKEND.md` §6 untuk rekomendasi.

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
| GET | `/tanam` | semua | `{page, list:[{id,tipe,status,mulai,varietas,meja,...}]}` |
| POST | `/tanam/mulai` | semua + demoGuard | body: `id_tanaman, id_siklus, id_meja, jumlah_benih, tgl_awal_semai?, keterangan?` |
| POST | `/tanam/:tipe/:id/selesai` | semua + demoGuard | `tipe` ∈ `semai\|peremajaan\|pendewasaan\|panen` |
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

### Water control · Laporan · Notifikasi WA (admin + demo)
| Method | Path | Guard tambahan | Body |
|---|---|---|---|
| GET | `/watercontrol`, `/watercontrol/status` | — | — |
| POST | `/watercontrol/fill`, `/stop`, `/setMode` | demoGuard (demo ditolak) | `setMode`: `{"mode":"AUTO\|MANUAL"}` |
| GET | `/laporan`, `/laporan/csv` | — | — |
| GET | `/notifikasi-wa` | — | `api_key` hanya versi tersamar `KUNCI-***` |
| POST | `/notifikasi-wa` | demoGuard | update target/aktif |
| POST | `/notifikasi-wa/uji` | demoGuard | kirim pesan uji Fonnte |

`GET /watercontrol/status`:
```json
{ "id":"1", "command":"AUTO", "mode":"MANUAL", "valve_state":"OFF", "updated_at":"2026-10-17T03:59:31.000Z" }
```

### Master & tahap (CRUD, admin + demo)
| Path | Tabel | Kolom yang diterima (whitelist) |
|---|---|---|
| `/meja` | `mejas` | `meja`, `jumlah_lubang` |
| `/tanaman` | `tanamen` | `nama_tanaman`, `id_meja` |
| `/siklus` (+ `GET /siklus/csv`) | `sikluses` | `id_tanaman`, `nama_siklus`, `waktu_siklus` |
| `/ambang` | `sensor_thresholds` | `sensor`, `min`, `max` |
| `/semai` (+ `/semai/batch/:id`, `/semai/selesai`) | `semais` | lihat skema |
| `/peremajaan`, `/pendewasaan`, `/panen` | tabel masing-masing | lihat skema |

Pola CRUD: `GET /x` daftar · `POST /x` → **201** `{"status":true,"message":"Data berhasil ditambahkan.","data":{...}}` ·
`GET /x/:id` · `PUT|PATCH /x/:id` · `DELETE /x/:id` → `{"status":true,"message":"Data dihapus."}`

> **⚠️ Kontrak yang belum terpenuhi:** `GET /x` (daftar) **tidak mengirim primary key**,
> sedangkan `PUT/DELETE /x/:id` membutuhkannya. Lihat `docs/ANALISIS_BACKEND.md` §6.2.

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
