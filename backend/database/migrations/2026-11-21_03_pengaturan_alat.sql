-- 21 Nov 2026 — Pengaturan Alat: parameter firmware v6 (batas dosis, pengenceran, waktu) yang diatur dari web.
-- Satu baris per parameter yang DIUBAH dari bawaan firmware; tanpa baris = alat memakai nilai bawaannya.
-- Penilai peringatan dan batas efektif membaca tabel ini, jadi web dan alat memakai angka yang sama.
-- Hanya CREATE TABLE IF NOT EXISTS; aman diulang.
CREATE TABLE IF NOT EXISTS pengaturan_alat (
  param        varchar(40) PRIMARY KEY,
  nilai        numeric(12, 3) NOT NULL,
  diubah_oleh  bigint,
  diubah_pada  timestamp without time zone NOT NULL DEFAULT now(),
  id_perintah  bigint
);
