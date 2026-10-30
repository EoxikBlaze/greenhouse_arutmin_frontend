# Audit Performa & Database Backend GARAP

> Agen: performa/DB · 19 Okt 2026 · `mimo-v2.6-flash` + `ultra` · mode **read-only** (hanya SELECT/EXPLAIN/GET; tanpa DDL/DML)
> Target: `backend-nodejs` @ dev `6b7c9de` · verdict: **PERLU TINDAKAN** · 6/6 lingkup tuntas

## ⚠ Temuan paling penting: state DB berbeda dari konteks
- `count(*) FROM monitorings` = **12 baris**, `min/max(created_at)` 15 Okt 06:11–06:43.
- Tapi `max(id)=100012`, `n_tup_ins=100013`, `n_tup_del=100001` → **100.013 row pernah masuk, 100.001 terhapus** (seed `scripts/insert_100k.sql`, terhapus saat restore/dump 18 Okt). Sequence tetap 100013.
- Konsekuensi: semua pengukuran hari ini skala 12 baris; proyeksi 100k+ ditandai sebagai **estimasi** (dibanding lama `docs/DEBUG_PERFORMANCE_REPORT.md`: chart 0,69 ms / laporan 20,6 ms saat 100k).

## 1. Ukuran & pertumbuhan
| tabel | total | idx | n_live | seq_scan | idx_scan | ins/upd/del |
|---|---|---|---|---|---|---|
| monitorings | 7376 kB | **7336 kB** | 12 | **371.128** | 748 | 100013/0/100001 |
| water_controls | 88 kB | 16 kB | 1 | 61.012 | 185.367 | 1/51606/0 |
| alert_logs | 88 kB | 80 kB | 51 | 34 | 96 | 101/0/50 |
| sisanya | ≤112 kB | — | 2–22 | — | — | — |

- **Bloat**: 3 index monitorings (2624+2504+2208 kB) utuh untuk 12 baris (heap 8192 B) — auto-vacuum mengosongkan heap, tidak mengompak index.
- Rasio historis seq:idx scan monitorings = **497:1**.
- Ukuran per baris terukur: heap 96 B + index 75 B ≈ **171 B/baris**.
- Proyeksi: seed 1.667/hari → 30 hari 8,2 MiB / 90 hari 24,5 MiB; **IoT tiap 5 dtk (17.280/hari) → 84,6 MiB / 253,8 MiB**; 100k ≈ 9 ms/scan, 1,55 juta ≈ **139 ms/seq scan**.
- Tulisan IoT nol selama jendela 60 detik uji (device tidak menulis).

## 2. Indeks vs FK & kolom panas (10 FK)
- FK terindeks: 8 (semais×3, peremajaans×2, pendewasaans×2, panens×1).
- FK **TANPA indeks**: `tanamen.id_meja`, `sikluses.id_tanaman` — EXPLAIN: Seq Scan 0,082 ms & 0,054 ms (tabel 2 & 6 baris) → dampak kecil saat ini.
- **Kolom panas terindeks dua kali (redundan)**: `monitorings_created_at_index` + `idx_monitorings_created` (5,1 MB total); `alert_logs_created_at_index` + `idx_alertlogs_created`; `alert_logs_type_index` + `idx_alertlogs_type_value`.
- EXPLAIN (ANALYZE, BUFFERS) — semua seq scan di monitorings (12 baris): `WHERE id` 0,188 ms · `ORDER BY created_at DESC LIMIT 1` 0,125 ms · `WHERE created_at >= now()-6h` 0,126 ms · `LIMIT 288` 0,126 ms · `alert_logs ORDER BY created_at DESC LIMIT 5` → **Index Scan** 0,069 ms.
- **`/laporan` matrix**: SubPlan 5 `Seq Scan on monitorings Filter: date_trunc('month',created_at)=bln` (**tidak sargable**) → execution **8,201 ms** bahkan dengan 12 baris (planning 5,5 ms).

## 3. N+1 & pola berat di kode
- **N+1 loop-query: 0** — semua query per request konstan.
- `/dashboard` = 16 query dalam ±4 gelombang serial, cache **5 dtk**.
- `/monitoring/chart-data` = 1 query `SELECT * … LIMIT 288`, **mengabaikan `dari`/`sampai`** (bukti: payload identik 2118 B dengan/tanpa param), tanpa kompresi → ±50 KB saat penuh.
- `/monitoring/tarik` = `LIMIT per_page` **tanpa OFFSET** → pagination hanya halaman 1; `/tarik/csv` LIMIT 5000.
- **Semua list crudRouter `SELECT … ORDER BY id DESC` TANPA LIMIT**; bukti: `?page=2&per_page=10` payload identik 293 B → param diabaikan.
- `/laporan` = 1 query + 6 subplan korelasi × N bulan, **tanpa cache**; `/monitoring/getReport6Jam` (publik) 2 query tanpa cache.
- `/api/latest-sensor` cache 2 dtk; thresholds cache 60 dtk.

## 4. Pengukuran nyata (144 request, semua 200, di bawah limit 300/menit)
| endpoint | n | p50 | p95 (ms) | catatan |
|---|---|---|---|---|
| GET /dashboard | 36 | **9,3** | 37,0 | burst 8,9 / dingin (TTL 5 dtk) 29,9, max 76,0 |
| GET /monitoring/chart-data | 36 | **11,3** | 18,7 | tanpa cache, param range diabaikan |
| GET /api/latest-sensor | 36 | **10,7** | 25,0 | cache 2 dtk |
| GET /laporan | 16 | **13,6** | 25,0 | range 10 bln p50 31,7 max 78,7 |
| GET /monitoring/tarik?per_page=25 | 10 | 11,2 | 12,8 | |
| GET /monitoring/getReport6Jam | 10 | 8,9 | 11,5 | |
| GET /meja | 3 | 20,3 | 21,4 | tanpa pagination |

## 5. Koneksi & caching
- Pool `max 50`, idle 30 s, connect 10 s; `express.json` 256 kb; keepAlive 65 s / requestTimeout 30 s.
- Header: `Cache-Control: no-store` global + `ETag` (percuma — no-store paksa bayar penuh); **tanpa kompresi**; rate limit 300.
- Cache in-memory (Map, cap 5000 key): dashboard 5 dtk, latest 2 dtk, thresholds 60 dtk → realtime maks. tertunda 2 dtk; 99% request tak menyentuh DB.

## 6. Bottleneck (berbasis bukti)
1. **Bukan I/O pool**: `blks_hit 12.293.070` vs `blks_read 887` (hit 99,993%); query <2 ms; p50 9–14 ms didominasi overhead HTTP/planning/JSON.
2. **Beban masa depan = scan tak terindeks `monitorings`**: 371.128 seq_scan + `date_trunc` non-sargable + pola `($1 IS NULL OR created_at >= $1)`; tumbuh linear → proyeksi ±139 ms/scan.
3. **Transfer & serialisasi JSON tanpa kompresi**: chart ±50 KB, CSV 5000 baris, `SELECT *` di mana-mana — angka ms naik duluan di sini.
4. **Write amplification & bloat**: tiap baris IoT memelihara 3 index (75 B) vs heap 96 B; dua index `created_at` redundan.

## Rekomendasi indeks (TIDAK dijalankan — read-only)
```sql
-- 1. laporan: buat predicate sargable (rentang), bukan date_trunc:
--    WHERE created_at >= $bulan AND < $bulan + interval '1 month'
CREATE INDEX CONCURRENTLY idx_monitorings_created ON monitorings (created_at DESC);
-- 2. DROP kopi redundan:
DROP INDEX monitorings_created_at_index;   -- pertahankan idx_monitorings_created
DROP INDEX alert_logs_created_at_index;    -- pertahankan idx_alertlogs_created
DROP INDEX alert_logs_type_index;          -- pertahankan idx_alertlogs_type_value
-- 3. FK proaktif (murah ~16 kB):
CREATE INDEX idx_tanamen_id_meja ON tanamen (id_meja);
CREATE INDEX idx_sikluses_id_tanaman ON sikluses (id_tanaman);
-- 4. (opsional) expression index bila tetap pakai date_trunc:
-- CREATE INDEX idx_monitorings_month ON monitorings (date_trunc('month', created_at));
```

## Temuan (JSON ringkas)
```json
{
  "verdict": "PERLU TINDAKAN",
  "findings": [
    {"severity":"KRITIS","area":"state data monitorings","bukti":"count=12, max(id)=100012, n_tup_ins=100013, n_tup_del=100001; index 7336 kB utk 12 baris","rekomendasi":"konfirmasi penghapusan 100001 baris disengaja (restore 18 Okt); bila tidak, pulihkan dari dump; REINDEX setelah dipastikan"},
    {"severity":"KRITIS","area":"query tak sargable pada monitorings","bukti":"SubPlan date_trunc execution 8,201 ms dgn 12 baris; 371128 seq_scan vs 748 idx_scan","rekomendasi":"rentang created_at >= bln AND < bln+1; predicate sargable utk /tarik"},
    {"severity":"SEDANG","area":"indeks duplikat","rekomendasi":"DROP satu pasang tiap tabel (hemat ~2,6 MB + write amplifikasi)"},
    {"severity":"SEDANG","area":"tanpa pagination","bukti":"GET /meja?page=2&per_page=10 payload identik dgn halaman 1","rekomendasi":"LIMIT/OFFSET standar (default 25, max 100)"},
    {"severity":"SEDANG","area":"payload transfer","bukti":"chart-data abaikan dari/sampai; tanpa Content-Encoding","rekomendasi":"gzip/br + param rentang + SELECT kolom eksplisit"},
    {"severity":"SEDANG","area":"FK tanpa indeks","rekomendasi":"index proaktif tanamen.id_meja & sikluses.id_tanaman"},
    {"severity":"CATATAN","area":"observabilitas","bukti":"pg_stat_statements tidak terpasang","rekomendasi":"pasang agar attribusi per query berbasis data"},
    {"severity":"CATATAN","area":"header cache","rekomendasi":"no-cache + ETag (304) utk endpoint publik"},
    {"severity":"CATATAN","area":"pool/express","bukti":"max 50, hit 99,993%","rekomendasi":"pertahankan"},
    {"severity":"CATATAN","area":"N+1","bukti":"tidak ada N+1; /laporan & getReport6Jam tanpa cache","rekomendasi":"cache ringan"}
  ]
}
```

## File bukti
`/tmp/perf_times.csv` (144 baris mentah) · `/tmp/perf_summary_final.json` · `/tmp/perf_bench.sh` · token `/tmp/perf_tok.txt`.
