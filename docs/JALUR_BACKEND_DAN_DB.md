# JALUR BACKEND + JALUR DATABASE — Vertonik Smart Farm

Gabungan dua jalur: **request masuk sampai respons** dan **data sampai ke tabel mana**.
Sumber kebenaran: `backend-nodejs/src/` + query langsung ke PostgreSQL (17 Okt 2026).

Terbitan sebelumnya: `docs/JALUR_BACKEND.md` (rute & guard) · `docs/FLOWCHART_BACKEND.md`
(flowchart keputusan) · `docs/jalur-backend.html` (diagram statis).

---

## 1. Jalur lengkap: klien → pipeline → handler → PostgreSQL → respons

```mermaid
flowchart TD
    A["🟢 KLIEN<br/>React · Flutter · ESP32 · Postman"] --> B["Proxy same-origin<br/>Vite :5173 / nginx :80"]
    B -->|navigate| SPA["SPA (tidak ke backend)"]
    B -->|fetch/curl/ESP32| P1

    subgraph PIPE ["PIPELINE src/index.js"]
        P1["1 body JSON 256KB"] --> P2["2 header keamanan"]
        P2 --> P3{"3 navigasi?"}
        P3 -->|ya| P204["204 kosong"]
        P3 -->|tidak| P4{"4 rate limit<br/>300 / 60 / login 10"}
        P4 -->|lewat| P429["429"]
        P4 -->|lolos| P5["5 demoPurge 1×/mnt"]
    end

    P5 --> M{"6 cocok mount rute?"}
    M -->|tidak| E404["404 JSON"]
    M -->|ya| G{"JWT / X-API-KEY / role / demoGuard"}
    G -->|gagal| ERR["401 · 403"]
    G -->|lolos| H{"HANDLER (routes/*.js)"}

    H --> C{"cache hit?"}
    C -->|"latest-sensor 2 dtk<br/>dashboard 5 dtk<br/>thresholds 60 dtk"| RESP
    C -->|"miss / tanpa cache"| Q["db.js — pool max 50<br/>q() / one() parameterized"]

    Q --> DB[("PostgreSQL 17<br/>vertonik_smartfarm<br/>13 tabel · 35 index · 10 FK")]
    DB --> Q
    Q --> RESP
    Q -->|error| E500["500 generik"]

    RESP["Respons"] --> OUT["application/json<br/>200 · 201 · 404 · 422<br/>(3 rute CSV)"]

    classDef err fill:#450a0a,stroke:#fb7185,color:#fff
    classDef db fill:#2e1065,stroke:#a78bfa,color:#fff
    classDef ok fill:#064e3b,stroke:#34d399,color:#fff
    class P204,P429,E404,ERR,E500 err
    class DB db
    class A,B,P1,P2,P3,P4,P5,M,G,H,C,Q,RESP,OUT ok
```

---

## 2. Jalur database: endpoint → tabel yang disentuh

Matriks ini dihasilkan dengan memindai kata kunci SQL (`FROM`/`INTO`/`UPDATE`/`DELETE`)
di tiap file `src/routes/*.js` — bukan perkiraan.

| Endpoint | Modul | Tabel dibaca | Tabel ditulis | Cache |
|---|---|---|---|---|
| `POST /login` | `auth.js` | `users` | — | — |
| `GET /user`, `POST/PUT/DELETE /user/:id` | `user.js` | `users` | `users` | — |
| `GET /profil`, `POST /profil/update`, `/profil/password` | `profil.js` | `users` | `users` | — |
| `GET /dashboard` | `dashboard.js` | `monitorings`, `water_controls`, `alert_logs`, `mejas`, `tanamen`, `sikluses`, `semais`, `peremajaans`, `pendewasaans`, `panens` | — | `dashboard` 5 dtk |
| `GET /monitoring/chart-data`, `/tarik`, `/tarik/csv` | `monitoring.js` | `monitorings` | — | — |
| `GET /monitoring/getReport6Jam` · `POST /saveAlert` | `monitoring.js` | `monitorings`, `alert_logs` | `alert_logs` | — |
| `POST /monitoring/saveSensor` (kompatibilitas) | `monitoring.js` | `monitorings`, `water_controls` | `monitorings`, `water_controls` | — |
| `GET /api/latest-sensor` | `monitoring.js` | `monitorings`, `water_controls`, `sensor_thresholds` | — | `latest-sensor` 2 dtk |
| `GET /api/get-thresholds` | `monitoring.js` | `sensor_thresholds` | — | `thresholds` 60 dtk |
| `POST /api/save-sensor` (**1 CTE**) | `monitoring.js` | `monitorings`, `water_controls` | `monitorings`, `water_controls` | — |
| `POST /api/notif-hardware` | `monitoring.js` | — | `alert_logs` | — |
| `GET /watercontrol`, `/watercontrol/status` | `watercontrol.js` | `water_controls` | — | — |
| `POST /watercontrol/fill\|stop\|setMode` | `watercontrol.js` | `water_controls` | `water_controls` | — |
| `GET /tanam`, `POST /tanam/mulai`, `/:tipe/:id/selesai`, `/:id/hapus` | `tanam.js` | `semais`, `peremajaans`, `pendewasaans` (+JOIN `tanamen`/`mejas`) | `semais`, `peremajaans`, `pendewasaans` | — |
| `GET/POST/PUT/DELETE /meja` | `master.js`→`_crud.js` | `mejas` | `mejas` | — |
| `/tanaman` | `master.js`→`_crud.js` | `tanamen` | `tanamen` | — |
| `/siklus` (+ `GET /siklus/csv`) | `master.js`→`_crud.js` | `sikluses`, `tanamen` | `sikluses` | — |
| `/ambang` | `master.js`→`_crud.js` | `sensor_thresholds` | `sensor_thresholds` | — |
| `/semai`, `/peremajaan`, `/pendewasaan`, `/panen` (+ `batch`, `selesai`) | `tahap.js`→`_crud.js` | `semais`, `peremajaans`, `pendewasaans`, `panens` | tabel sama | — |
| `GET /laporan` (+ `/laporan/csv`) | `laporan.js` | `semais`, `peremajaans`, `pendewasaans`, `panens`, `monitorings` | — | — |
| `GET/POST /notifikasi-wa`, `POST /uji` | `notifWa.js` | `wa_settings` | `wa_settings` (ter-enskripsi) | — |

**Yang TIDAK menyentuh database:** `GET /` · `GET /login` (info) · `GET /logout` (stateless)
· cache hit · pengecekan rate limit & guard (murni memori).

---

## 3. Skema database — 13 tabel, 10 relasi

```mermaid
erDiagram
    users {
        bigint id PK
        varchar username UK
        varchar email UK
        varchar password "bcrypt cost 12"
        varchar level "admin/petani/user"
        boolean is_demo
    }
    mejas {
        bigint id_meja PK
        varchar meja
        int jumlah_lubang
        timestamp expires_at "data demo"
    }
    tanamen {
        bigint id_tanaman PK
        varchar nama_tanaman
        bigint id_meja FK
    }
    sikluses {
        bigint id_siklus PK
        bigint id_tanaman FK
        varchar nama_siklus
        int waktu_siklus
    }
    semais {
        bigint id_semai PK
        bigint id_tanaman FK
        bigint id_siklus FK
        bigint id_meja FK
        int jumlah_benih
        date tgl_awal_semai
        varchar status
    }
    peremajaans {
        bigint id_peremajaan PK
        bigint id_semai FK
        bigint id_meja FK
        date tgl_awal_peremajaan
    }
    pendewasaans {
        bigint id_pendewasaan PK
        bigint id_peremajaan FK
        bigint id_meja FK
        date tgl_awal_pendewasaan
    }
    panens {
        bigint id_panen PK
        bigint id_pendewasaan FK
        int panen_berhasil
        date tgl_panen
    }
    monitorings {
        bigint id PK
        double waterTemp
        double ph
        double tds
        double airTemp
        double humidity
        varchar water_level
    }
    alert_logs {
        bigint id PK
        varchar type
        varchar value
    }
    sensor_thresholds {
        bigint id PK
        varchar sensor UK
        double min
        double max
    }
    water_controls {
        bigint id PK
        varchar command
        varchar mode
        varchar valve_state
    }
    wa_settings {
        bigint id PK
        boolean aktif
        text api_key "AES-256"
        varchar target
    }

    mejas ||--o{ tanamen : "id_meja"
    mejas ||--o{ semais : "id_meja"
    mejas ||--o{ peremajaans : "id_meja"
    mejas ||--o{ pendewasaans : "id_meja"
    tanamen ||--o{ sikluses : "id_tanaman"
    tanamen ||--o{ semais : "id_tanaman"
    sikluses ||--o{ semais : "id_siklus"
    semais ||--o{ peremajaans : "id_semai"
    peremajaans ||--o{ pendewasaans : "id_peremajaan"
    pendewasaans ||--o{ panens : "id_pendewasaan"
```

Enam tabel **berdiri sendiri** (tanpa FK): `users`, `monitorings`, `alert_logs`,
`sensor_thresholds`, `water_controls`, `wa_settings`.

**Aturan hapus (dari database):** `panens` → `CASCADE` (hapus panen ikut menghapus baris
turunannya tidak berlaku kebalikan); semua FK lain `ON DELETE SET NULL`
(menghapus meja/tanaman tidak ikut menghapus data tahap — hanya memutus tautan).

---

## 4. Dua alur data yang paling sering dipakai

### A. ESP32 menulis → dashboard membaca

```mermaid
sequenceDiagram
    participant E as ESP32
    participant B as Backend /api/save-sensor
    participant D as PostgreSQL
    participant C as cache.js
    participant W as Web SPA

    E->>B: POST /api/save-sensor (X-API-KEY)
    B->>D: 1 CTE: cek duplikat + INSERT monitorings + UPDATE water_controls
    D-->>B: command (AUTO / FORCE_STOP)
    B-->>E: {status:ok, command, mode}
    Note over C: cache latest-sensor (2 dtk) kedaluwarsa
    W->>B: GET /dashboard (Bearer JWT)
    B->>C: cache miss → 11 query paralel
    C->>D: count(*) 8 tabel + JOIN panen + alert terbaru
    D-->>C: hasil
    C-->>W: JSON 6 metrik + pipeline 4 tahap + status IoT
```

### B. Tambah data tahap (rantai FK)

```mermaid
flowchart LR
    POST["POST /semai<br/>(admin / demo)"] --> GUARD["requireRole admin+demo<br/>+ demoGuard semai.store"]
    GUARD --> IN["INSERT semais<br/>expires_at = +1 jam bila demo"]
    IN --> SEQ["setval sequence<br/>(sudah disamakan — anti 500)"]
    SEQ --> OUT2["201 + RETURNING *"]
    IN -.->|"menyentuh"| T1[("semais")]
    GUARD -.->|"validasi FK"| T2[("tanamen")] & T3[("sikluses")] & T4[("mejas")]
    OUT2 -.->|"1 jam kemudian"| PURGE["demoPurge() menghapus baris expires_at lewat"]

    classDef db fill:#2e1065,stroke:#a78bfa,color:#fff
    classDef ok fill:#064e3b,stroke:#34d399,color:#fff
    class T1,T2,T3,T4 db
    class POST,GUARD,IN,SEQ,OUT2,PURGE ok
```

---

## 5. Isi database saat ini (17 Okt 2026)

| Tabel | Baris | Catatan |
|---|---|---|
| `users` | 3 | admin · petani · demo |
| `mejas` | 5 | |
| `tanamen` | 2 | Selada, Bayam |
| `sikluses` | 6 | |
| `semais` | 2 | |
| `peremajaans` | 4 | |
| `pendewasaans` | 3 | |
| `panens` | 2 | total 22 kg |
| `monitorings` | 12 | terakhir 14 Okt → IoT `offline` |
| `alert_logs` | 51 | |
| `sensor_thresholds` | 5 | waterTemp, ph, tds, airTemp, humidity |
| `water_controls` | 1 | AUTO / MANUAL / OFF |
| `wa_settings` | 1 | api_key ter-enskripsi |

Skema + seed siap pakai ulang: `database/schema.sql` · `database/seed.sql`
(urutan: `createdb -O vertonik` → schema → seed).

---

## 6. Cara membaca sendiri (tanpa menebak)

```bash
# tabel mana yang dibaca/ditulis sebuah file route
grep -oiE "(from|into|update|delete from)[[:space:]]+TABLE" src/routes/*.js

# relasi FK langsung dari database
psql "$DATABASE_URL" -c "SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE contype='f'"

# query paling lambat (butuh log)
psql "$DATABASE_URL" -c "SELECT query, calls, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 5"
```

Titik rawan jalur database:
1. **Sequence** vs `max(id)` — kalau beda, semua `INSERT` → 500 (`scripts/fix-sequences.sql`).
2. **Cache** menyembunyikan data segar — setelah tulis, cache baru kedaluwarsa 2–5 detik kemudian.
3. **`_crud.js` whitelist kolom** — kolom di luar daftar diam-dengan-dimap; daftar ada di `routes/master.js` & `tahap.js`.
4. **GET daftar tidak mengirim primary key** (temuan `docs/ANALISIS_BACKEND.md` §6.2) —
   menghalangi frontend memanggil `PUT/DELETE /:id`.
