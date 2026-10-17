# TUGAS 2 — Install Environment (Node.js · PostgreSQL · Paket Frontend)

Setiap langkah memuat: **Command** (siap salin) → **Verifikasi** (hasil nyata di mesin ini,
17 Okt 2026) → **Perbaikan** (gejala umum + solusi). Semua sudah dijalankan & diverifikasi
di branch `dev`.

> Ringkasan kondisi saat ini: **sudah terpasang semua** — Node v26.7.0 · npm 11.19.0 ·
> PostgreSQL 17.11 (jalan) · Flutter 3.47.7 · 124 paket frontend · build sukses.

---

## Langkah 1 — Node.js

```bash
node -v
npm -v
```

**Verifikasi (hasil nyata):**
```
v26.7.0
11.19.0
```

**⚠️ Perbaikan**

| Gejala | Penyebab | Command perbaikan |
|---|---|---|
| `command not found: node` | belum terpasang | `brew install node` (lalu buka terminal baru) |
| `npm ERR! Unsupported engine` | proyek minta versi lain | pakai versi Node proyek: `nvm install 22 && nvm use 22` |
| `EACCES permission denied` | npm global di folder sistem | `npm config set prefix ~/.npm-global` + tambah PATH |

---

## Langkah 2 — PostgreSQL

```bash
brew services list | grep postgres
/opt/homebrew/opt/postgresql@17/bin/pg_isready -h 127.0.0.1 -p 5432
psql --version
```

**Verifikasi (hasil nyata):**
```
postgresql@17 started         rizki ~/Library/LaunchAgents/sh.brew.postgresql@17.plist
127.0.0.1:5432 - accepting connections
psql (PostgreSQL) 17.11 (Homebrew)
```

**⚠️ Perbaikan**

| Gejala | Penyebab | Command perbaikan |
|---|---|---|
| `starting server ... stopped` / tak jalan | service belum start | `brew services start postgresql@17` |
| `could not connect: Connection refused` | server mati | `brew services restart postgresql@17` |
| `port 5432 is already in use` | PG lain (Docker/App Store) pegang port | `lsof -nP -iTCP:5432 -sTCP:LISTEN` lalu hentikan yang bentrok |
| `database "rizki" does not exist` | `psql` tanpa `-d` memakai nama user | selalu pakai: `psql "$DATABASE_URL"` (lihat Langkah 4) |

---

## Langkah 3 — Paket backend (`backend-nodejs`)

```bash
cd ~/Project/Vertoniksmartfarm/backend-nodejs
cp -n .env.example .env     # isi DATABASE_URL, JWT_SECRET, APP_KEY, ESP32_API_KEY
npm install
npm ls --depth=0
```

**Verifikasi (hasil nyata):**
```
├── bcryptjs@2.4.3
├── express@4.22.3
├── jsonwebtoken@9.0.3
└── pg@8.23.1
```

**⚠️ Perbaikan**

| Gejala | Penyebab | Command perbaikan |
|---|---|---|
| `Cannot find module 'express'` | `node_modules` belum ada/rusak | `rm -rf node_modules && npm ci` |
| `npm ERR! code EUSAGE` | lockfile tak cocok | `npm install` (bukan `npm ci`) |
| Port 8000 sudah terpakai | backend lama masih jalan | `pkill -f "node src/index.js"` lalu `npm start` |
| `DATABASE_URL` kosong | `.env` belum disalin | `cp -n .env.example .env` lalu isi isinya |
| `.env` tidak terbaca | nama huruf beda | pastikan persis `.env` (bukan `.env.example`) di root `backend-nodejs/` |

**Verifikasi akhir backend:**

```bash
curl -s http://127.0.0.1:8000/
# {"message":"GARAP API — gunakan POST /login untuk autentikasi."}
bash scripts/smoke-test.sh      # 20 pemeriksaan harus LULUS semua
```

---

## Langkah 4 — Database vertonik (sekali per mesin)

```bash
cd ~/Project/Vertoniksmartfarm/backend-nodejs
DBURL=$(grep '^DATABASE_URL=' .env | cut -d= -f2-)

# ★ owner WAJIB = peran aplikasi (dibaca dari .env), kalau tidak error "permission denied for schema public"
APPUSER=$(echo "$DBURL" | sed -E 's#^postgres://([^:/]+).*#\1#')
createdb -O "$APPUSER" vertonik_smartfarm        # kalau belum ada

psql "$DBURL" -f database/schema.sql             # 13 tabel · 35 index · 10 FK
psql "$DBURL" -f database/seed.sql               # 3 akun + ambang + katup + WA + setval sequence
psql "$DBURL" -tAc "select count(*)||' akun' from users"
```

**Verifikasi (hasil nyata):** `3 akun` · schema `CREATE` sukses · seed bisa dijalankan
berulang (idempoten, `ON CONFLICT DO NOTHING`) · login `admin/petani/demo` cocok semua.

**Alternatif (isi data lama lengkap, termasuk log sensor & panen):**

```bash
psql "$DBURL" -f database/vertonik.sql           # dump penuh
psql "$DBURL" -f scripts/fix-sequences.sql       # ★ WAJIB setelah import dump
```

**⚠️ PERBAIKAN PALING PENTING — `scripts/fix-sequences.sql`**

| Gejala | Penyebab | Perbaikan |
|---|---|---|
| Semua **Tambah** (POST) balas `500 {"message":"Terjadi kesalahan pada server."}` | sequence tidak ikut terangkat waktu data diimport dengan id eksplisit → `duplicate key value violates unique constraint` | `psql "$DBURL" -f scripts/fix-sequences.sql` |
| Terjadi lagi tiap habis restore dump | memang harus dijalankan **tiap sesudah import** | masukkan ke prosedur deploy (sudah ada scriptnya) |

Bukti nyata: 6 tabel sempat bermasalah (`mejas` seq 9 vs max 11, `semais` 1 vs 16,
`peremajaans` 1 vs 4, `pendewasaans` 1 vs 3, `panens` 1 vs 2, `tanamen` 1 vs 3) —
semuanya sudah `setval` dan audit berikutnya bersih.

---

## Langkah 5 — Paket frontend (`react-web-app`)

```bash
cd ~/Project/Vertoniksmartfarm/react-web-app
npm install
npm ls --depth=0
npm run build          # type-check + bundling
npm run dev            # buka http://127.0.0.1:5173
```

**Verifikasi (hasil nyata):**
```
npm ls  →  react@19.2.8 · react-router-dom@7.18.4 · axios@1.20.0 ·
           @tanstack/react-query@5.104.2 · clsx@2.1.1 (+ fontsource, tailwind, vite, oxlint)
build   →  dist/assets/index-BRjrtPk2.js  444.49 kB │ gzip: 134.15 kB
           ✓ built in 535ms
```

**⚠️ Perbaikan**

| Gejala | Penyebab | Command perbaikan |
|---|---|---|
| `EACCES` / `npm ERR!` saat install | cache npm korup | `npm cache clean --force && rm -rf node_modules && npm install` |
| `Port 5173 is already in use` | dev server lama | `lsof -nP -iTCP:5173 -sTCP:LISTEN` lalu kill PID itu |
| Halaman web terbuka tapi data kosong / error CORS | backend tidak hidup | jalankan `npm start` di `backend-nodejs` (proxy Vite meneruskan `/api`, `/login`, `/dashboard`, dst. ke `:8000`) |
| Login web gagal padahal benar | rate limit login 10/menit/IP | tunggu 60 detik, lalu coba lagi |
| `429 Too Many Requests` saat tes beruntun | anti brute-force | jeda 60 dtk, atau `RATE_LIMIT_OFF=1` saat benchmark saja |

---

## Langkah 6 — (Opsional) Flutter mobile

```bash
cd ~/Project/Vertoniksmartfarm/flutter_mobile_app
flutter pub get
dart analyze --fatal-infos
flutter run                # pilih simulator iPhone / perangkat Android
```

**Verifikasi (hasil nyata):** `Flutter 3.47.7 stable` · `Got dependencies!` · `No issues found!`

**⚠️ Perbaikan:** `flutter doctor -v` untuk melihat komponen belum lengkap
(Xcode, CocoaPods, JDK Android — lihat `docs/SETUP_REPORT.md`).

---

## Cek cepat seluruh environment (satu blok)

```bash
echo "node:  $(node -v)  npm: $(npm -v)"
echo "pg:    $(pg_isready -h 127.0.0.1 -p 5432)"
echo "be:    $(curl -s -o /dev/null -w '%{http_code}' --max-time 2 http://127.0.0.1:8000/)  (200=hidup)"
echo "web:   $(curl -s -o /dev/null -w '%{http_code}' --max-time 2 http://127.0.0.1:5173/)  (200=hidup)"
echo "gh:    $(gh api user --jq .login 2>&1 | head -1)"
```

**⚠️ Perbaikan eksternal (di luar project):**

| Gejala | Penyebab | Perbaikan |
|---|---|---|
| Semua URL `000` / `Connection reset` termasuk `google.com` | jaringan mati total (Mac di hotspot iPhone) | nyalakan ulang data/hotspot — **bukan salah project** |
| `gh auth status` → *token in keyring is invalid* | token kedaluwarsa | `gh auth refresh -h github.com` (login di browser) |
| `git push` gagal `Connection reset by peer` | jaringan putus di tengah | ulangi saja setelah jaringan stabil |

---

## Jalankan seluruh stack sekali perintah

```bash
cd ~/Project/Vertoniksmartfarm && ./jalankan-local.sh
```
Output yang diharapkan: `PostgreSQL 17` → `Backend Node.js (:8000)` → `React SPA (:5173)`,
login web `admin / @adminbersabda123`.

Terkait: `docs/ANALISIS_BACKEND.md` (hasil uji 20 titik) ·
`docs/JALUR_BACKEND.md` (peta rute) · `docs/FLOWCHART_BACKEND.md` (diagram jalur).
