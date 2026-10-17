# Analisis Project + Hasil Uji Backend (mulai dari backend)

Tanggal uji: **17 Okt 2026** · Lokasi: `/Users/rizki/Project/Vertoniksmartfarm`
Status backend saat diuji: **hidup di `http://127.0.0.1:8000`**, PostgreSQL 17 aktif.

---

## 1. Peta project

| Folder | Isi | Status kematangan |
|---|---|---|
| `backend-nodejs/` | API Node.js (Express 4 + `pg` + JWT + bcrypt), 12 modul route, 21 tabel PG | ✅ **Paling matang** — sudah diuji beban (141rb req/20 dtk) |
| `react-web-app/` | SPA React + Vite + TS, tema Arutmin | ⚠️ **Mayoritas mock** — baru login (JWT) + 2 endpoint water control yang nyambung |
| `flutter_mobile_app/` | Aplikasi mobile, 1 file `main.dart` (9,9 KB) | ⚠️ baru `GET /api/latest-sensor` (polling 5 dtk) |
| `deploy-pi/` | nginx conf, systemd `vertonik-api`, setup & hotspot Raspberry Pi | ✅ siap produksi |
| `scripts/` | `bootstrap_macos.sh`, `pi` (build→rsync→restart), paket Pi | ✅ |
| `mockups/`, `Mentahan PEN/` | 19 mockup HTML statis + file desain | referensi desain |
| `jalankan-local.sh` | satu perintah menjalankan PG + backend + web | ✅ |
| `docs/` | dokumen (saat ini **terhapus di working tree**, masih ada di git HEAD) | lihat temuan §5 |

Catatan git: `backend-nodejs/`, `deploy-pi/`, `scripts/` **di-`.gitignore`** (repo terpisah;
`backend-nodejs/` punya `.git` sendiri, branch `main`/`dev`).

---

## 2. Kenapa backend "sengaja" terlihat kosong di browser

Backend ini **JSON-only, tanpa tampilan**. Aturan yang dipasang di `src/index.js`:

- Request dengan header `Sec-Fetch-Mode: navigate` (dibuka dari address bar) → dibalas
  **204 kosong** — jadi buka `http://127.0.0.1:8000/dashboard` di Chrome = **halaman putih**.
  Itu **bukan error**.
- Yang mengembalikan JSON: `fetch` / `curl` / Postman / DevTools (fetch asli).

Jadi cara melihat hasil backend = **curl** (atau Postman), bukan klik-klik di browser.

---

## 3. Cara menjalankan (langkah siap salin)

```bash
# 1. Nyalakan seluruh stack (PG + backend + web) dalam satu perintah
cd ~/Project/Vertoniksmartfarm && ./jalankan-local.sh

# ...atau backend saja:
cd ~/Project/Vertoniksmartfarm/backend-nodejs
npm start                     # http://127.0.0.1:8000 (bind localhost saja)

# Lihat log backend (jika dijalankan via jalankan-local.sh)
cat /tmp/vsf-backend.log
```

Prasyarat sudah terpenuhi di mesin ini: Node v26.7.0, PostgreSQL 17 (`brew services`),
`node_modules` sudah terpasang, `.env` sudah terisi.

**Hentikan backend:** tekan `Ctrl+C`, atau `pkill -f "node src/index.js"`.

---

## 4. Cara melihat hasil — perintah curl satu per satu

```bash
BE=http://127.0.0.1:8000

# 4.1 Info endpoint
curl -s $BE/

# 4.2 Login -> token JWT (simpan token-nya)
curl -s -X POST $BE/login -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"@adminbersabda123"}'
#    -> {"status":true,"token":"eyJhbG...","user":{...},"redirect":"/dashboard"}

# 4.3 Pakai token (ganti $TOK dengan nilai token di atas)
TOK="tempel-token-di-sini"
curl -s $BE/dashboard -H "Authorization: Bearer $TOK"

# 4.4 Endpoint ESP32 (pakai ESP32_API_KEY dari .env)
curl -s $BE/api/latest-sensor   -H "X-API-KEY: $(grep '^ESP32_API_KEY=' .env | cut -d= -f2-)"
curl -s $BE/api/get-thresholds  -H "X-API-KEY: $(grep '^ESP32_API_KEY=' .env | cut -d= -f2-)"

# 4.5 Unduh CSV
curl -s $BE/monitoring/tarik/csv -H "Authorization: Bearer $TOK" -o monitoring.csv
```

Akun seed: `admin/@adminbersabda123` · `petani/petani123` · `demo/demo123`
(login `/login` dikunci 10×/menit/IP — kalau kena `429`, tunggu 60 detik).

---

## 5. Hasil uji nyata — 20 pemeriksaan (semua LULUS)

Script: `backend-nodejs/scripts/smoke-test.sh` → jalankan dengan
`bash backend-nodejs/scripts/smoke-test.sh`

| # | Pemeriksaan | Hasil |
|---|---|---|
| 1 | `GET /` info endpoint | **200** JSON |
| 2 | Navigasi browser (`Sec-Fetch-Mode: navigate`) | **204** body 0 byte (by design) |
| 3 | Login salah | **422** `"Username / Password salah."` |
| 4 | Login admin | **200**, token JWT 205 karakter, `redirect: /dashboard` |
| 5 | Tanpa token | **401** `"Tidak terautentikasi."` |
| 6 | `GET /dashboard` | **200**, 1914 byte — 6 metrik + pipeline 4 tahap + status IoT |
| 7 | `GET /monitoring/chart-data` | **200**, array (12 titik — data masih sedikit) |
| 8 | `GET /laporan` | **200**, matriks per bulan (2026-05: semai 2, remaja 2, dewasa 1, panen 2 kg) |
| 9 | `GET /watercontrol/status` | **200** `{command:AUTO, mode:MANUAL, valve_state:OFF}` |
| 10 | `GET /user` | **200**, 3 akun, **tanpa field password** |
| 11 | Role `petani` → `/user` | **403** `"Menu ini untuk pengelola..."` |
| 12 | Role `petani` → `/dashboard`, `/tanam` | **200 / 200** (boleh) |
| 13 | ESP32 `GET /api/get-thresholds` (X-API-KEY) | **200**, 5 ambang sensor |
| 14 | ESP32 tanpa API key | **403** `"Unauthorized"` |
| 15 | ESP32 `GET /api/latest-sensor` | **200**, sensor + anomali (tds 1200 > max 1000) + water_control |
| 16 | CRUD `POST /meja` lalu `DELETE` | **201** lalu **200** (data uji dibersihkan) |
| 17 | Rute tak dikenal | **404** JSON generik (tanpa stack/SQL) |
| 18 | JSON rusak | **400** `"Format JSON tidak valid."` |
| 19 | Header keamanan | `nosniff` · `X-Frame-Options: DENY` · `no-referrer` · `no-store` · `X-RateLimit` · tanpa `X-Powered-By` |
| 20 | Rate limit login 10/menit | 7× `422` lalu **429** (brute force tertahan) |

Uji tulis lanjutan (semua **201** lalu dibersihkan): `POST /tanaman`, `POST /siklus`,
`POST /ambang` — plus aturan demo: boleh **tambah**, ditolak **hapus** (`403`).

---

## 6. Temuan (bug & hambatan untuk lanjut ke frontend)

### 6.1 ❌ KRITIS — sequence PG ketinggalan → semua "Tambah" balas 500 (SUDAH DIPERBAIKI)
- Gejala: `POST /meja` → `500 {"message":"Terjadi kesalahan pada server."}`
- Penyebab: data diimpor dengan id eksplisit, sequence tidak ikut terangkat.
  Tercatat 6 tabel bermasalah: `mejas` (seq 9 / max 11), `semais` (1/16),
  `peremajaans` (1/4), `pendewasaans` (1/3), `panens` (1/2), `tanamen` (1/3).
- **Sudah diperbaiki** di DB lokal via `setval` (tidak menyentuh baris mana pun).
- Script cegah kekambuhan: `backend-nodejs/scripts/fix-sequences.sql`
  → jalankan setiap habis import dump: `psql "$DATABASE_URL" -f scripts/fix-sequences.sql`
- Rekomendasi kode: jalankan script itu saat startup backend, atau masukkan ke prosedur
  deploy Pi (dump `database/vertonik.sql` juga berpotensi menimpa sequence lagi).

### 6.2 ⚠️ Daftar (GET list) tidak mengembalikan primary key
`GET /meja` → `{meja, jumlah_lubang}` (tanpa `id_meja`); berlaku juga untuk
`/tanaman`, `/siklus`, `/ambang`, `/semai`, dst. Akibatnya frontend **tidak bisa**
memanggil `PUT/DELETE /meja/:id` karena id-nya tidak pernah dikirim.
(Rute `POST` tetap jalan karena `RETURNING *` menyertakan id.)
Saran: tambahkan pk ke `columns` pada select list di `routes/_crud.js`
(contoh `SELECT id_meja, meja, jumlah_lubang FROM mejas`) — path & body tidak berubah,
jadi kontrak Laravel tetap terpenuhi.

### 6.3 ⚠️ Frontend React masih mock
Baris panggilan API nyata di `react-web-app/src` hanya ada di `lib/auth.tsx` (login/logout)
dan `WaterControlPage.tsx` (masih `// TODO: api.post('/watercontrol/setMode')`).
`DashboardPage`, `SensorRealtimePage`, `masterPages`, `stagePages`, dll. memakai
array data statis. → backend sudah siap, **pekerjaan besar berikutnya = menyambungkan
halaman-halaman itu ke API**.

### 6.4 ⚠️ Data sensor sedikit
`monitorings` hanya 12 baris (terakhir 14 Okt) → grafik cuma 12 titik, bukan 288
(satu hari @ 5 menit). `iotStatus.online = false` karena ESP32 belum mengirim data.
Untuk demo visual: jalankan firmware ESP32, atau isi data contoh
(`backend-nodejs/scripts/insert_100k.sql` untuk uji beban — jangan dipakai di data produksi).

### 6.5 ⚠️ `docs/` kosong di working tree (belum di-commit)
8 file terhapus menurut `git status` (`API_ROUTES.md`, `BACKEND_ANALYSIS.md`,
`DB_SCHEMA.md`, `DEBUG_PERFORMANCE_REPORT.md`, `DEBUG_REPORT.md`, `FLUTTER_SETUP.md`,
`KEAMANAN_LOGIN.md`, `SETUP_REPORT.md`) — masih ada di git HEAD.
Kembalikan dengan: `git checkout -- docs/`
(4 di antaranya juga sudah tersalin di `backend-nodejs/docs/`.)
`docs/API_ROUTES.md` penting: daftar kontrak 104 route.

### 6.6 ℹ️ Batasan yang sudah by-design (bukan bug)
- Backend hanya `127.0.0.1` (tanpa proxy tidak bisa diakses dari HP/luar).
- Login rate limit 10/menit/IP — uji login beruntun butuh jeda 60 detik.
- Semua error generik tanpa stack trace → sulit debug dari response; lihat log server/psql.

---

## 7. Urutan kerja yang disarankan (backend dulu)

1. **Stabilkan DB** — jalankan `scripts/fix-sequences.sql` setiap import dump (selesai untuk lokal).
2. **Tutup celah kontrak** — kembalikan primary key di list (temuan 6.2); verifikasi semua
   route di `docs/API_ROUTES.md` benar-benar ada di Node (bandingkan 1:1).
3. **Uji otomatis** — jadikan `scripts/smoke-test.sh` langkah wajib sebelum commit backend;
   pertimbangkan `node --test` untuk unit test route.
4. **Siapkan data demo** — isi `monitorings` 288 titik/24 jam + alert supaya grafik & dashboard
   bermakna, atau nyalakan ESP32 asli.
5. **Baru sambungkan frontend** — satu per halaman: `DashboardPage` → `GET /dashboard`,
   `SensorRealtimePage` → `/monitoring/chart-data`, `masterPages` → resource CRUD, dst.
6. **Deploy Pi** — `scripts/pi update` setelah frontend terhubung.

Cek cepat kesehatan backend kapan pun:

```bash
bash ~/Project/Vertoniksmartfarm/backend-nodejs/scripts/smoke-test.sh
```
