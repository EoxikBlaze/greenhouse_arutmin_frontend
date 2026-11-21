-- 21 Nov 2026 — Durasi tiap tahap (hari) disalin ke BATCH saat Mulai Semai, seperti kurva nutrisi per batch.
-- Nilai awal diambil dari Jenis Tanaman (tabel sikluses) dan boleh diubah untuk batch itu saja; mengubah
-- master sesudahnya tidak menggeser batch yang sedang berjalan. NULL = batch lama → memakai sikluses.
-- Hanya ALTER TABLE ... IF NOT EXISTS; aman diulang.
ALTER TABLE semais ADD COLUMN IF NOT EXISTS durasi_semai integer;
ALTER TABLE semais ADD COLUMN IF NOT EXISTS durasi_peremajaan integer;
ALTER TABLE semais ADD COLUMN IF NOT EXISTS durasi_pendewasaan integer;
DO $$ BEGIN
  ALTER TABLE semais ADD CONSTRAINT semais_durasi_wajar CHECK (
    (durasi_semai IS NULL OR durasi_semai BETWEEN 1 AND 365) AND
    (durasi_peremajaan IS NULL OR durasi_peremajaan BETWEEN 1 AND 365) AND
    (durasi_pendewasaan IS NULL OR durasi_pendewasaan BETWEEN 1 AND 365));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
