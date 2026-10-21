# CHECKLIST PERESMIAN — Vertonik/GARAP Smart Farm
> Audit kesiapan rilis (READ-ONLY) · 21 Okt 2026 · semua angka diverifikasi langsung (git, npm test, unzip -l, grep kode)

## 1. TABEL STATUS KOMPONEN

| # | Komponen | Status | Bukti (diverifikasi) |
|---|---|---|---|
| 1 | Backend suite test | **SUDAH** | `npm test` segar 21 Okt: **112 tests, 111 pass, 0 fail, 1 skip** (skip = chart-data abaikan dari/sampai) |
| 2 | Route AI (`POST /api/ai/langkah-selanjutnya`) | **SUDAH** | `src/routes/ai.js:449` + guard demo 403 (`ai.js:44-46`), `test/integration/ai.test.js`, commit backend `1062bce` |
| 3 | Proteksi AI (agent ke-2) | **SEDANG** | worktree backend **bersih** (0 diff/untracked) → hasil perbaikan belum terlihat di file |
| 4 | Endpoint ESP32 (save-sensor/save-alert, X-API-KEY, rotate-key) | **SUDAH** | `src/routes/monitoring.js:9-10`, `src/auth.js:99-101`, `test/integration/esp32.test.js` (11 tes) |
| 5 | openapi.yaml | **SUDAH** | **111 `operationId:` / 69 path** (grep), sinkron AI endpoint (commit `de60641`) |
| 6 | Build frontend | **SEDANG** | `react-web-app/dist/` ada (21 Okt **05:22**) tapi `CrudScreen.tsx` diubah **05:46** → dist ketinggalan, perlu rebuild |
| 7 | Kontras teks WCAG + animasi | **SUDAH** | commit `146ad1b`; backlog gelombang-5: 4 titik kontras diperbaiki & diukur ulang (h1 1.01→16.6), 7 animasi, LAYAK 11/11 |
| 8 | Fitur petani #1 — form tahap (Peremajaan/Pendewasaan/Panen tanpa onSubmit) | **SEDANG** | agent aktif: diff belum ter-commit (`formTitle` di `CrudScreen.tsx`, +7/−1); `stagePages.tsx` (mtime 20 Okt 23:09) **belum** disentuh → Simpan masih pura-pura |
| 9 | Fitur petani #2 — 'Mulai Semai Baru' → form nyata | **BELUM** | `DashboardPage.tsx:226` masih `<Link to="/semai">` (halaman baca-saja); `grep 'Mulai Semai'` = 1 titik |
| 10 | Fitur petani #3 — tombol 'Tandai Selesai' | **BELUM** | `grep -rn "Tandai Selesai"` di `react-web-app/src` = **0 hasil** (backend POST /tanam/:tipe/:id/selesai hidup) |
| 11 | Paket Pi `vertonik-pi-20261021.zip` | **SUDAH** | 1.419.828 B, 21 Okt 05:22, **226 files**: `backend/src/*`, `backend/.env`, `dist/`, `database/vertonik.sql`+5 migrasi, `PANDUAN.md`, `WIFI_POKJAR_PERMATA.md`, `setup-pi.sh`, `systemd/vertonik-api.service` |
| 12 | Docs PANDUAN | **SUDAH** | `deploy-pi/PANDUAN.md` (tracked) + salinan dalam zip (11.038 B) |
| 13 | Docs WIFI | **SUDAH** | `deploy-pi/WIFI_POKJAR_PERMATA.md`, commit `df2c1f7` + dalam zip (8.812 B) |
| 14 | Docs ESP32_API | **SUDAH** | `docs/ESP32_API.md` + `docs/ARSITEKTUR_PI_2ESP32.md` |
| 15 | Docs AI_LOKAL | **SUDAH** | `backend-nodejs/docs/AI_LOKAL_PI.md` (12.527 B) + dalam zip |
| 16 | Docs KONTRAK | **SEDANG** | ada (`docs/KONTRAK_API.md`) tapi **klaim basi**: `:237-238` "daftar tanpa PK", `:338` "smoke-test 20 LULUS", `API_ROUTES.md` masih basis Laravel |
| 17 | Keamanan inti (JWT HS256+exp, BFLA, trust proxy, timing login) | **SUDAH** | commit `30f985a` + safety 64 checks 0 GAGAL (SQLi 40 probe, JWT 7 varian → 401, demo PUT → 403) |
| 18 | helmet / CSP / HSTS (S3) | **BELUM** | `grep helmet` di `src/` & `package.json` = **0**; S3 masih ⬜ TBD |
| 19 | JWT secret fallback (S10) | **BELUM** | `src/config.js:21` → `jwtSecret: process.env.JWT_SECRET \|\| 'dev-secret-ganti'` |
| 20 | API key ESP32 fallback | **BELUM** | `src/config.js:23` → `esp32ApiKey: (env) \|\| 'HARVEST123'` |
| 21 | TLS/HSTS (S2) | **BELUM** | nginx `listen 80`; JWT & X-API-KEY plaintext |
| 22 | Login 3 akun | **SUDAH** | `database/seed.sql:13-15` admin/petani/demo (hash bcrypt utuh); kredensial di `deploy-pi/KREDENSIAL-LOKAL.txt` (tidak ikut git) |

**Rekap: SUDAH 12 · SEDANG 4 · BELUM 6** (22 butir)

## 2. DAFTAR BUG / TEMUAN SEBELUM PERESMIAN (urut prioritas hari-H)

**PRIORITAS 1 — pekerjaan inti pengguna buntu (wajib beres, dari review awam 21 Okt):**
- Form tahap **Peremajaan/Pendewasaan/Panen tanpa `onSubmit`** → tombol Simpan menutup form tanpa menyimpan & tanpa pesan (`stagePages.tsx:374/432/488`, teruji 2 percobaan + 0 request) — *SEDANG dikerjakan*
- **'Mulai Semai Baru' buntu** → halaman baca-saja, backend `POST /tanam/mulai` hidup tapi tanpa form di frontend (`DashboardPage.tsx:226`)
- **'Tandai Selesai' tak pernah dipasang** → semua tahap hanya 'Detail' (backend hidup)
- (ikut) pesan error bahasa kolom DB + judul dialog generik (perbaikan `formTitle` sudah di diff)

**PRIORITAS 2 — keamanan rilis (S10/S3/S2):**
- `S10` fallback secret lemah `dev-secret-ganti` → ganti jadi **fail-loud** (crash bila `.env` kosong)
- Fallback API key `HARVEST123` → sama (fail-loud), rotasi kunci ESP32
- Belum ada helmet/CSP/HSTS (S3, S2) — minimal helmet + header keamanan sebelum go-public
- Isi `backend/.env` ikut ter-bundle di zip Pi (by-design utk Pi offline) — pastikan zip tidak dibagikan keluar

**PRIORITAS 3 — konsistensi data & artefak:**
- `save-sensor` **tanpa kolom `id_meja`** → INSERT `monitorings` (`monitoring.js:70-84`) tidak mengaitkan bacaan sensor ke meja tertentu (V2 `readings` per-meja belum dipakai)
- `KONTRAK_API.md` / `API_ROUTES.md` masih memuat klaim basi (lihat baris 16)
- Build dist ketinggalan perubahan 05:46 → **rebuild + regenerasi zip** sebelum distribusi
- Temuan rendah terbuka: PUT `konfigurasi-dosis` tolak string numerik round-trip; 429 tanpa header `X-RateLimit-*`

## 3. LANGKAH PERESMIAN (berurutan, command siap salin)

```bash
R=/Users/rizki/Project/Vertoniksmartfarm
cd $R

# 0) Backup DATABASE sebelum apa-apa
source backend-nodejs/.env
pg_dump -Fc -d vertonik_smartfarm -f ~/backup_peresmian_$(date +%Y%m%d_%H%M).dump && echo "DUMP OK"
ls -la ~/backup_peresmian_*.dump

# 1) Verify suite backend (target: 112 tests / 111 pass / 0 fail)
cd backend-nodejs && npm test 2>&1 | tail -8

# 2) Build frontend terbaru (CrudScreen 05:46 > dist 05:22)
cd $R/react-web-app && npm run build && npx oxlint src | tail -3

# 3) Regenerasi zip paket Pi (pastikan dist & src ikut)
cd $R && rm -f vertonik-pi-20261021.zip && zip -r vertonik-pi-20261021.zip vertonik-pi-20261021 \
  -x "*.DS_Store" -x "*node_modules*" -x "*dist/maps*" && unzip -l vertonik-pi-20261021.zip | tail -2

# 4) Cek login 3 akun (backend: http://127.0.0.1:8000)
cd $R/backend-nodejs && node src/index.js & sleep 3
for U in admin petani demo; do
  curl -s -o /dev/null -w "$U -> %{http_code}\n" -X POST http://127.0.0.1:8000/login \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$U@…\",\"password\":\"<dari KREDENSIAL-LOKAL.txt>\"}"
done   # ekspektasi: 200 (demo 200 dgn flag demo)

# 5) Cek ESP32 endpoint dgn kunci
curl -s -o /dev/null -w "tanpa-key -> %{http_code}\n" -X POST http://127.0.0.1:8000/api/save-sensor \
  -H 'Content-Type: application/json' -d '{"ph":6.2}'                 # ekspektasi 403
curl -s -o /dev/null -w "dgn-key -> %{http_code}\n" -X POST http://127.0.0.1:8000/api/save-sensor \
  -H 'Content-Type: application/json' -H "X-API-KEY: $ESP32_API_KEY" \
  -d '{"ph":6.2,"waterTemp":25}'                                      # ekspektasi 200

# 6) Cek AI endpoint (butuh JWT admin/petani + Ollama jalan di Pi)
TOKEN=$(curl -s -X POST http://127.0.0.1:8000/login -H 'Content-Type: application/json' \
  -d '{"username":"garap","password":"<kunci>"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')
curl -s -o /dev/null -w "AI admin -> %{http_code}\n" -X POST http://127.0.0.1:8000/api/ai/langkah-selanjutnya \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{}'   # ekspektasi 200 (heuristik bila Ollama mati)

# 7) Buka dari HP dengan WiFi sama
#    Pi: http://<ip-pi>  (WiFi: Pokjar Permata — lihat deploy-pi/WIFI_POKJAR_PERMATA.md)
#    Cek: login 3 langkah, tambah tanaman, form tahap SUDAH MENYIMPAN (network POST terlihat), Tandai Selesai muncul
```

## 4. ROLLBACK & BACKUP

**Backup database**
```bash
source backend-nodejs/.env
pg_dump -Fc -d vertonik_smartfarm -f ~/backup_peresmian_$(date +%Y%m%d_%H%M).dump
# cadangan harian terpisah (riwayat sudah ada): backup_garap_pre_v2_*.dump (lihat docs/VERIFIKASI/EKSEKUSI_V2.md)
```
**Restore database**
```bash
pg_restore --clean --if-exists -d vertonik_smartfarm ~/backup_peresmian_YYYYMMDD_HHMM.dump
# pasca-restore: cek sekuens (bug lama pasca-import) → jalankan scripts/fix-sequences.sql bila PK terasa loncat
```
**Backup file penting**
```bash
tar czf ~/backup_file_peresmian_$(date +%Y%m%d).tgz \
  backend-nodejs/.env backend-nodejs/src backend-nodejs/database \
  docs deploy-pi react-web-app/src vertonik-pi-20261021.zip
```
**Rollback kode**: kedua repo terpisah → `git -C $R log --oneline -5` / `git -C $R/backend-nodejs log --oneline -5`, lalu `git checkout <commit-sehat> -- <path>` (atau `git reset --hard <tag/commit lama>` bila worktree dibersihkan dulu: stash/discard diff `CrudScreen.tsx`).
**Rollback zip Pi**: zip lama tersimpan: `vertonik-pi-20261015.zip`, `vertonik-pi-20261019.zip` → unzip yang lama & `sudo systemctl restart vertonik-api`.

**Lokasi file kunci**
| File | Path | Catatan |
|---|---|---|
| Secret backend | `backend-nodejs/.env` (596 B, 21 Okt 04:55) | git-ignored; `.env.example` = template |
| Kredensial 3 akun + Pi + WiFi | `deploy-pi/KREDENSIAL-LOKAL.txt` | TIDAK ikut git (deploy-pi di-ignore); juga ikut di dalam zip Pi |
| Paket Pi | `vertonik-pi-20261021.zip` (1,4 MB, 226 file) | versi lama 1015/1019 sebagai rollback |
| Dokumen rilis | `docs/` (BACKLOG_GARAP, KONTRAK_API, ESP32_API, openapi.yaml) + `deploy-pi/PANDUAN.md`, `WIFI_POKJAR_PERMATA.md` | |
| Dump DB | `~/backup_peresmian_*.dump` + `backup_garap_pre_v2_*.dump` | |

**Verdict**: SUDAH jalan (suite, AI, ESP32, openapi, kontras, zip, docs inti) — **BELUM siap go-live tanpa** penyelesaian Prioritas 1 (3 fitur petani) dan Prioritas 2 (fallback secret + helmet).
