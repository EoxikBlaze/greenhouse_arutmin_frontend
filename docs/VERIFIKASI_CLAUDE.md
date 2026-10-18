# BRIEF VERIFIKASI UNTUK CLAUDE — Rename GARAP + 3 Diagram Alur

> **Cara pakai:** berikan file ini ke Claude / Claude Code apa adanya
> ("verify this repo against this brief"). Sifat brief ini **READ-ONLY** —
> Claude diminta **memverifikasi dan melaporkan**, bukan memperbaiki.
> Jika menemukan masalah, catat dulu lalu minta izin sebelum mengubah apa pun.

---

## 0. Konteks

| Item | Nilai |
|---|---|
| Repo backend | `/Users/rizki/Project/Vertoniksmartfarm/backend-nodejs` (branch `dev`) |
| Repo frontend+docs | `/Users/rizki/Project/Vertoniksmartfarm` (branch `dev`) |
| Commit yang diverifikasi | backend `7dcae12` (rename) + `767af63` (diagram) · frontend `852c2bb` (branding) |
| Nama proyek baru | **GARAP** (sebelumnya "Vertonik Smart Farm") |
| Stack | Node.js 26 + Express 4 + PostgreSQL 17 (`vertonik_smartfarm`), 13 tabel domain |
| Backend diharapkan hidup | `http://127.0.0.1:8000` (jalankan `node src/index.js` bila mati) |

**Latar:** rename hanya boleh menyentuh *nama tampilan/identitas/komentar*.
Nama infrastruktur (database, role, file dump, path, unit systemd, bundle ID)
**sengaja TIDAK diganti** dan tidak boleh dianggap bug.

---

## 1. CHECKLIST VERIFIKASI

### A. Rename GARAP (aman)

**A1 — Tidak ada lagi brand lama di source code/dokumen.**
```bash
grep -rniI --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.dart_tool \
     --exclude-dir=build --exclude-dir=dist --exclude-dir=uiux --exclude-dir="Mentahan PEN" \
     --exclude=VERIFIKASI_CLAUDE.md --exclude=untitled.pen "vertonik smart farm" \
     /Users/rizki/Project/Vertoniksmartfarm
```
**Ekspektasi:** `0 hasil` (case-insensitive). Dikecualikan: arsip desain `Mentahan PEN/*.pen`
dan `mockups/uiux/` (sengaja tidak diubah), serta brief ini sendiri.

**A2 — Brand baru sudah muncul di titik identitas.**
```bash
grep -n "GARAP" /Users/rizki/Project/Vertoniksmartfarm/react-web-app/index.html
grep -n "GARAP" /Users/rizki/Project/Vertoniksmartfarm/react-web-app/src/layouts/AppShell.tsx
grep -n "GARAP" /Users/rizki/Project/Vertoniksmartfarm/flutter_mobile_app/lib/main.dart | head
grep -A1 CFBundleDisplayName /Users/rizki/Project/Vertoniksmartfarm/flutter_mobile_app/ios/Runner/Info.plist
node -p "const p=require('/Users/rizki/Project/Vertoniksmartfarm/backend-nodejs/package.json'); p.name+' | '+p.description"
curl -s http://127.0.0.1:8000/
```
**Ekspektasi:** title `GARAP`, sidebar `GARAP`, class `GarapApp`, `CFBundleDisplayName = GARAP`,
`garap-backend | Backend API GARAP …`, dan respons `{"message":"GARAP API — gunakan POST /login…"}`.

**A3 — Infrastruktur TIDAK berubah (ini uji penting).**
```bash
cd /Users/rizki/Project/Vertoniksmartfarm/backend-nodejs
git diff 8300ea2..767af63 -- .env .env.example | head     # harus KOSONG
grep -n "vertonik_smartfarm\|DATABASE_URL" .env            # nama DB & role masih lama
grep -rn "garap_smartfarm\|role garap\|-O garap" . scripts database 2>/dev/null | head   # harus KOSONG
cd ..
grep -rn "id.co.vertonik" flutter_mobile_app/android flutter_mobile_app/macos 2>/dev/null | head -3  # bundle ID tetap
grep -rn "vertonik.local" backend-nodejs/database/seed.sql docs/KONTRAK_API.md | head -3 # email akun tetap
```
**Ekspektasi:** semua baris di atas menunjukkan nilai **LAMA yang tidak berubah** —
`vertonik_smartfarm`, role `vertonik`, `id.co.vertonik.*`, `*@vertonik.local`,
dan **tidak ada** kemunculan `garap_smartfarm`/`-O garap`.

**A4 — Tidak ada file infra yang tersentuh oleh commit rename.**
```bash
cd /Users/rizki/Project/Vertoniksmartfarm/backend-nodejs
git diff --name-only 8300ea2..767af63
cd .. && git diff --name-only 271a12d..852c2bb
```
**Ekspektasi (backend):** hanya `README.md package.json package-lock.json database/schema.sql database/seed.sql docs/*.md scripts/*.sh src/index.js src/routes/auth.js src/routes/notifWa.js docs/DIAGRAM_ALUR_BACKEND.md`.
**Ekspektasi (frontend):** hanya `docs/* react-web-app/* flutter_mobile_app/{lib,test}/* jalankan-local.sh react-web/README.md`.
❌ **GAGAL** bila ada: `.env`, `.env.example`, `database/vertonik.sql`, file di `deploy-pi/` berupa *nama* (unit/nginx/path), `build.gradle.kts`, `Info.plist`, `project.pbxproj`.

### B. Regresi (perubahan tidak merusak)

```bash
cd /Users/rizki/Project/Vertoniksmartfarm/backend-nodejs
node --check src/index.js && node --check src/routes/auth.js && node --check src/routes/notifWa.js
bash scripts/smoke-test.sh 2>&1 | grep -cE "^HTTP 2[0-9][0-9]|^HTTP 4"   # 20 pemeriksaan jalan
bash scripts/smoke-test.sh 2>&1 | tail -1                                 # baris 422...429 (rate limit)
```
**Ekspektasi:** `node --check` tanpa error · smoke test 20 pemeriksaan berjalan ·
login sukses, guard 401/403, CRUD 201/DELETE 200, 404/400 benar, rate limit `429`.
> Catatan: `smoke-test.sh` membakar kuota login 10/menit/IP — beri jeda 60 dtk bila diulang.

**Integritas database** (harus identik sebelum/sesudah rename):
```bash
DBURL=$(grep '^DATABASE_URL=' /Users/rizki/Project/Vertoniksmartfarm/backend-nodejs/.env | cut -d= -f2-)
psql "$DBURL" -tAc "SELECT 'users='||(SELECT count(*) FROM users)||' mejas='||(SELECT count(*) FROM mejas)||
' pendewasaan='||(SELECT count(*) FROM pendewasaans)||' panen='||(SELECT count(*) FROM panens)||
' alert_logs='||(SELECT count(*) FROM alert_logs)"
psql "$DBURL" -tAc "SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname='panens_id_pendewasaan_foreign'"
```
**Ekspektasi:** `users=3 mejas=5 pendewasaan=3 panen=2 alert_logs=51` dan
FK `... ON DELETE RESTRICT` (bukan CASCADE — sudah dimigrasi 2026-10-17).

### C. Diagram — `backend-nodejs/docs/DIAGRAM_ALUR_BACKEND.md`

1. File berisi **tepat 3 blok** ```` ```mermaid ```` (flowchart LR, flowchart TD, erDiagram).
2. **Render tiap blok** — pilih salah satu:
   ```bash
   # opsi 1: mermaid CLI (bila ada)
   npx -y @mermaid-js/mermaid-cli -i /tmp/blok.mmd -o /tmp/blok.png
   # opsi 2: buka di VS Code / GitHub (preview markdown) dan lihat visual
   ```
   **Ekspektasi:** tidak ada kotak error `Syntax error in text`.
3. **ERD sesuai schema** (bandingkan dengan `database/schema.sql`):
   ```bash
   grep -c "CREATE TABLE" /Users/rizki/Project/Vertoniksmartfarm/backend-nodejs/database/schema.sql   # 13
   grep -c "FOREIGN KEY"  /Users/rizki/Project/Vertoniksmartfarm/backend-nodejs/database/schema.sql   # 10
   grep -c "ON DELETE RESTRICT" /Users/rizki/Project/Vertoniksmartfarm/backend-nodejs/database/schema.sql  # 1
   ```
   **Ekspektasi:** ERD memuat 13 tabel & 10 relasi; label `ON DELETE RESTRICT` untuk
   `panens → pendewasaans` (yang lain `SET NULL`).
4. Diagram jalur tulis memuat titik gagal `sequence < max(id)` → 500 dan anjuran
   `scripts/fix-sequences.sql`.

---

## 2. YANG TIDAK BOLEH DISENTUH (read-only brief)

- `.env` / `.env.example` — `DATABASE_URL`, `JWT_SECRET`, `APP_KEY`, `ESP32_API_KEY`
- Nama database `vertonik_smartfarm`, role `vertonik`, file `database/vertonik.sql`
- Path folder (`~/Project/Vertoniksmartfarm`, `/opt/vertonik`, `/var/www/vertonik`)
- Unit `vertonik-api`, `vertonik.conf`, `vertonik-hotspot`, SSID `VERTONIK`, zip `vertonik-pi-*`
- Bundle ID `id.co.vertonik.*`, email `*@vertonik.local`, isi data di `mockups/uiux/`
- **Jangan** menjalankan `createdb`, `DROP`, `ALTER`, `pg_dump` restore, atau `git push`

> Keputusan soal infrastruktur (rename DB → `garap_smartfarm`, ganti `JWT_SECRET`,
> rename file dump, rename bundle ID) ada di `docs/ANALISIS_BACKEND.md` §"perlu keputusan"
> dan menunggu pemilik project.

---

## 3. FORMAT LAPORAN YANG DIMINTA

Kembalikan **tabel** seperti ini + bukti kutipan output command (bukan klaim kosong):

| ID | Pemeriksaan | Status | Bukti (output singkat) |
|---|---|---|---|
| A1 | brand lama hilang di source | PASS/FAIL | `0 hasil` |
| A2 | brand GARAP muncul | PASS/FAIL | `<cuplikan>` |
| A3 | infra tidak berubah | PASS/FAIL | `<cuplikan>` |
| A4 | file tersentuh sesuai daftar | PASS/FAIL | `<daftar file>` |
| B1 | `node --check` + smoke 20 | PASS/FAIL | `<ringkasan>` |
| B2 | integritas DB + FK RESTRICT | PASS/FAIL | `<angka>` |
| C1 | 3 diagram render tanpa error | PASS/FAIL | `<cara render>` |
| C2 | ERD = 13 tabel / 10 FK / RESTRICT | PASS/FAIL | `<angka grep>` |

Lalu: **VERDICT: LULUS / TIDAK LULUS** + daftar temuan (kalau ada) dengan tingkat
`KRITIS / SEDANG / CATATAN`, tanpa memperbaiki apa pun.
