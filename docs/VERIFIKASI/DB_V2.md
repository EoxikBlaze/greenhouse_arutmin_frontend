# Verifikasi — Rancangan & DDL DB V2

> Jalur gerbang: Perancang `deleg_216336fe` → Verifier `deleg_1a4b05e8` **TIDAK LAYAK** → remediasi 9 patch → Re-verifier `deleg_e6d5d40f` **LAYAK EKSEKUSI (A–F PASS)**.

## Objek
`docs/RANCANGAN_DB_V2.md` + `backend-nodejs/database/proposal_skema_v2.sql` (9 tabel, 4 fungsi, 2 view).

## Verifier 1 — `deleg_1a4b05e8`: TIDAK LAYAK
- **A FAIL (KRITIS)**: `fn_pensiun_readings` error sintaks — `EXECUTE format('DETACH PARTITION …')` tanpa `ALTER TABLE sensor_readings …` (PG17) → retensi tak bisa jalan; cakupan terbukti aman via versi koreksi.
- B–E PASS: 6 butir user **LENGKAP** (diuji INSERT positif/negatif), rantai DDL idempoten (42 tabel pass1=pass2), live 21 tabel utuh, ERD ter-render (mermaid-cli nyata), angka proyeksi benar.
- SEDANG: 2 contoh panggilan invalid di §13 (`now()+30`, rollup tanpa `::timestamp`).
- CATATAN: basis proyeksi 150 B (konservatif), "3 fungsi"→4, header status usang, sinkronisasi `latest`/cache by-design (middleware fase 4).

## Remediasi (orchestrator, 9 patch)
1. Sintaks retensi → `ALTER TABLE public.sensor_readings DETACH PARTITION public.%I`.
2. §13: `fn_partisi_readings_bulanan(now()::date + 30)` + catatan cast `::timestamp` (contoh rollup tanpa argumen di §10.2 → ber-argumen).
3. "3→4 fungsi" (3 titik) · header status & §14 · rollback §10 · `COMMENT ON FUNCTION fn_override_aktif`.

## Verifier 2 — `deleg_e6d5d40f`: LAYAK EKSEKUSI (A–F PASS)
- **A**: diff persis yang diklaim (SQL 3+/1−, MD 6+/6−), nol pola DROP/ALTER berbahaya statis.
- **B**: rantai penuh OK; rerun idempoten (44 tabel/4 fungsi/88 index — snapshot IDENTIK).
- **C**: retensi teruji — `fn_pensiun_readings(60)` rc=0, partisi 12→11, partisi kini **selamat** (1 baris), induk + 33 objek non-partisi utuh; scratch di-DROP.
- **D**: contoh baru valid; **contoh lama terbukti invalid** (pembanding).
- **E**: sisa `3 fungsi`/`belum di-commit` = 0; header kini menyebut verdict.
- **F**: live **21 tabel** sebelum/sesudah; objek v2 di live = **NONE**.

## Keadaan
Commit perbaikan: `[verified:deleg_1a4b05e8→deleg_e6d5d40f]` (lihat git log). **Eksekusi ke live: BELUM** — keputusan user (11 butir §12 + keputusan sebelumnya: paket gabungan sekali jalan, thresholds & data meja dipertahankan).
