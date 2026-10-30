# Verifikasi SQL — 6 skrip DRAFT (cron retensi/rollup, backfill, REINDEX, index laporan)

> Pengembang `deleg_80379352` task-1 → Verifier `deleg_d2622b50` task-1 → **LAYAK COMMIT (A1–F2 LULUS)**

## Scope (6 file BARU `backend-nodejs/database/`, file lama tak tersentuh)
`cron_retensi.sql` · `cron_rollup.sql` · `README_CRON.md` · `backfill_monitorings_ke_readings.sql` · `reindex_monitorings.sql` · `index_laporan.sql`

## Bukti utama
- **A**: persis 6 file `??` · `git diff --stat database/` kosong.
- **B**: **live tak disentuh** — koneksi `default_transaction_read_only=on`; snapshot awal==akhir (52 tabel/12 partisi/monitorings 12/IMPORT 0/index baru 0); `fn_*=4`.
- **C**: tiap file berkepala **DRAFT + butuh persetujuan user**.
- **D (uji ulang verifier di scratch `vertonik_scratch_scratch2`, lalu DROP)**: cron_rollup **butuh cast `::timestamp`** (dibuktikan error tanpa cast) · backfill default `INSERT 0 0` (id_meja NULL dilewati) / dgn `-v p_id_meja_default=3` → `INSERT 0 12` / run-2 idempoten `0` · reindex 15 relasi + induk **di luar transaksi** (larangan PG17) · index_laporan idempoten (`IF NOT EXISTS`) · retensi pensiun 1 partisi (12→11) lalu run-2 `0` · scratch dibuktikan terhapus.
- **E**: 10 baris crontab terparse valid (5 field) · semua `psql -X -v ON_ERROR_STOP=1` + redirect log + `.pgpass` agar password tak bocor.
- **F**: EXPLAIN `enable_seqscan=off` — rentang → `Index Cond` (sargable) vs `date_trunc(...)=` lama → `Filter` tanpa Index Cond (bukti lama memang non-sargable), di scratch **dan** live read-only.

## Temuan (tanpa blocker, 2 sudah diperbaiki saat merge)
| Sev | Isi |
|---|---|
| minor ✓ | README tak punya `mkdir -p logs` → cron pertama gagal `No such file` — **ditambahkan saat merge** |
| minor ✓ | path `psql` contoh pertama Homebrew macOS vs `/usr/bin/psql` — **peringatan diseragamkan di catatan yang sama** |
| minor | frasa header backfill "tanpa persetujuan user" (makna sama dengan 5 file lain) |
| catatan | bagian alternatif artisan-Laravel tak bawa `ON_ERROR_STOP` — bukan alur repo Node, ditandai eksplisit |
| catatan | `mejas` live sempat 9→10→4 di tengah sesi = snapshot saat agen lain bersih-bersih uji; kini **5 baris utuh** |

**Nilai: LAYAK COMMIT** — commit `[verified:deleg_d2622b50-S]`. Eksekusi ke live tetap **butuh izin Anda** (status DRAFT).
