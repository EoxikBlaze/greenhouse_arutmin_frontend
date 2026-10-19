# Verifikasi Suite Test Integrasi Pertama (43 tes)

> Pengembang `deleg_d4b55adb` task-8 → Verifier `deleg_ccef54fa` task-2 (**tahan: run-1 eksternal**) → Re-verifier `deleg_4721ae2b` (G9c) → **LAYAK COMMIT**

## Scope (7 file)
BARU `test/integration/{_server,auth,errors,meja,v2}.test.js` (5 file, 140–… baris) · `package.json` (+devDep `supertest@^7.3.1`, **script test tak diubah**) · `package-lock.json`.

## Rantai verdict
1. **`deleg_ccef54fa` — TIDAK LAYAK (1 poin)**: run-1 `exit 1` (7 tes tulis). Akar **eksternal terbukti**: log PostgreSQL `cannot execute INSERT in a read-only transaction` tepat di detik run-1 (jendela `default_transaction_read_only` 06:16:14–06:18:09 milik sesi lain); semua check A–F lain LULUS.
2. **`deleg_4721ae2b` — LAYAK COMMIT**: DB kini writable (`dtro='off'`, `pg_db_role_setting` 0, **probe tulis nyata** CREATE/INSERT+ROLLBACK sukses 07:53) → `npm test` **persis 1 run**: `exit 0 · 43 tests · 43 pass · 0 fail · 0 skipped (1,44 dtk)`; idempoten `mejas 5→5`, residu prefix `itest-garap-` **0 di 178 kolom**, nol file/token baru; login dalam run = 3 (batas/server); tanpa edit file.

## Cakupan (43 = 4 unit + 39 integrasi)
login 200/422 · 401 (tanpa token, bearer rusak, JWT tanpa exp, expired) · 404 seragam **byte-identik** (Buffer.compare) · 422 body null/skalar/400 JSON rusak · POST/PUT/DELETE `/meja` **net-zero** · **8 GET V2** == `count(*)`+floor · **3 PUT V2** net-zero (stempel waktu diam) · demo PUT `/meja` → **403 kontrak** (assert + `.skip` dinamis bila guard dilepas) · header keamanan.

## Kualitas
- Server test = spawn `node src/index.js` port bebas; token admin 1 login/server (cache Promise); JWT cacat dibuat lokal via `jwt.sign` dgn secret runtime (tanpa literal); **nol** `console.*` di test/ (kredensial tak pernah tercetak).
- `.skip` demo-PUT = jaring pengaman berdiagnostic, bukan lolos hardcode (run2 `skipped 0` → assert 403 benar-benar diuji).

## Temuan minor
| Sev | Isi |
|---|---|
| info | Run butuh DB writable; edit `src/` setengah-jadi mematikan suite (by design — server gagal boot) |
| info | Floor jumlah baris V2 di-hardcode dari seed kontrak — bila seed sah berkurang, tes perlu penyesuaian |
| info | Jendela read-only eksternal 06:16–06:18 sempat mematikan tulis SEMUA sesi — kejadian identik akan gagalkan run manapun (bukan cacat suite) |

**Nilai: LAYAK COMMIT** — commit `[verified:deleg_4721ae2b-G9c]` (melengkapi `deleg_ccef54fa` A–F minus poin B).
