# Verifikasi BASELINE — Regresi Independen Kondisi Saat Ini

> Verifier `deleg_` (baseline, READ-ONLY) · 20 Okt 2026 · **BASELINE_BERSIH** — patokan sebelum gelombang baru.

## Scope pemeriksaan
2 repo (root `dev` + `backend-nodejs/` dev) · server hidup `127.0.0.1:8000` (PID 7931, start 04:52) · DB `vertonik_smartfarm` · `react-web-app` build/lint · `docs/KONTRAK_API.md`. Satu-satunya file ditulis: dokumen ini.

## Status repo (mulai & akhir, identik)
| Repo | Branch | HEAD | git status | remote (gh api) == lokal |
|---|---|---|---|---|
| `greenhouse_arutmin_frontend` (root) | dev | `549f69a` | **bersih** — tak ada file sedang diedit agen lain | ✓ `refs/heads/dev` = `549f69a2900…` |
| `greenhouse_arutmin_backend` | dev | `3c6451d` | **bersih** — idem | ✓ `refs/heads/dev` = `3c6451de104…` |

Catatan: selama seluruh sesi working tree keduanya bersih (tidak ada gelombang baru masuk saat pengukuran).

## Bukti utama
- **Backend unit**: `npm test` → **4/4 pass, exit 0** (dijalankan TERAKHIR, diulang; tree tak berubah di antaranya) · `node --check` **22/22 file `src/` exit 0**.
- **Matriks endpoint :8000 — 14/14 titik pemeriksaan lolos (>25 pemanggilan)**:
  - login: `POST /login` benar → **200** (`level=admin`, token 205 char) · salah → **422** `Username / Password salah.`
  - **23 rute terproteksi tanpa token → 401** (≥20 diminta): dashboard, monitoring(+chart-data/tarik/tarik.csv), tanam, watercontrol(+status), laporan(+csv), notifikasi-wa, meja, tanaman, siklus, ambang, semai, peremajaan, pendewasaan, panen, user, profil, konfigurasi-dosis, target-nutrisi — nol penyimpangan.
  - **404 seragam byte**: `/meja/abc`, `/meja/9223372036854775808`, `/meja/99999999` → sha256 identik `7b86495f04f7be83…`, body `{"message":"Data tidak ditemukan.","errors":{}}`; rute tak dikenal → 404 `The route … could not be found.`
  - **422 body-null**: `POST /meja` body `null` (dgn token) → **422**; `POST /tanaman` body `null` (dgn token) → **422** `Tidak ada data yang dikirim.`; tanpa token → **401** (auth dulu — by design).
  - **11 endpoint V2**: 8 GET → **19/16/20/5/8/15/3/5** (8/8) · 3 PUT → **200 + net-zero SELECT identik** (3/3: `konfigurasi-dosis/antrian_alert_maks`, `timing-operasi/baca_stabil_timeout_detik`, `target-nutrisi/1`).
  - **`GET /meja` = tepat 13 kolom** (`id_meja, meja, jumlah_lubang, jenis_talang, kapasitas_penampung_l, jumlah_talang, lubang_per_talang, panjang_talang_m, laju_per_talang_lpm, kenaikan_air_cm, created_at, updated_at, expires_at`), 5 baris.
  - **Rate-limit header ada**: `X-RateLimit-Limit/Remaining` pada `GET /dashboard` (300/…) dan `POST /login` (10/…).
- **Frontend**: `npm run build` **exit 0** (tsc -b + vite, 575 ms) · `npx oxlint` **exit 0** (0 diagnostics) — diulang di akhir, identik.
- **DB counts baseline (sebelum = sesudah uji)**: `users=3 · mejas=5 · pendewasaans=3 · panens=2 · alert_logs=51 · sensor_thresholds=5`.
- **Tabel V2 utuh (8/8)**: konfigurasi_dosis 19 · timing_operasi 16 · aturan_fail_safe 20 · jadwal_perawatan 5 · kalibrasi_sensor 8 · mapping_channel_esp32 15 · target_nutrisi 3 · penampung_states 5 · plus view `v_bacaan_efektif`, `v_dosing_harian` (52 objek public).
- **KONTRAK_API.md vs uji: 6/6 contoh cocok** (≥5 diminta): 403 tanpa `X-API-KEY` `{"status":false,"msg":"Unauthorized"}` · 404 seragam §2b · 401 `Tidak terautentikasi.` · 422 login (message+errors+input) · `GET /penampung-states?id_meja=3` 200 1 baris dgn kolom kontrak · `PUT /target-nutrisi/1` rentang `ec_min > ec_max` → 422.

## Temuan (tanpa blocker)
| Sev | Isi |
|---|---|
| INFO | Uji baseline hanya membaca / net-zero (3 PUT mengembalikan nilai identik) — counts & hash baris DB tak berubah |
| INFO | `X-RateLimit-*` di setiap respons; `Retry-After` hanya muncul di 429 (tak dipicu agar tak mengunci window) |
| INFO | Working tree bersih saat pengukuran → tak ada file agen lain yang perlu dikeluarkan dari lingkup |

**Kesimpulan: `BASELINE_BERSIH`** — semua titik hijau; angka ini menjadi patokan regresi gelombang berikutnya.
