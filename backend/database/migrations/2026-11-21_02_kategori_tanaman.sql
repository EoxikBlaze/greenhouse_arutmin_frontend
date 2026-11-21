-- 21 Nov 2026 — Kategori tanaman (sayur / buah). Uji Lab (takaran nutrisi A+B dan pH) disimpan per kategori
-- dan dikirim ke alat sesuai kategori tanaman saat Mulai Semai. Tanaman yang sudah ada = sayur.
-- Hanya ALTER TABLE ... IF NOT EXISTS; aman diulang.
ALTER TABLE tanamen ADD COLUMN IF NOT EXISTS kategori varchar(8) NOT NULL DEFAULT 'sayur';
DO $$ BEGIN
  ALTER TABLE tanamen ADD CONSTRAINT tanamen_kategori_wajar CHECK (kategori IN ('sayur', 'buah'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
