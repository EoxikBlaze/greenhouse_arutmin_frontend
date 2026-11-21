'use strict';
/** Data Tahap: semai (list/create/detail/tab selesai), peremajaan, pendewasaan, panen. */
const express = require('express');
const { q, one } = require('../db');
const { demoGuard, requireAuth, requireRole } = require('../auth');
const { crudRouter } = require('./_crud');
const { idValid, notFound } = require('./_id');
const { halaman } = require('./_halaman');

const router = express.Router();
const S = require('../sinkronAlat');

/**
 * Ubah/hapus baris tahap lewat halaman Siklus Tanam (CRUD) tidak lewat alur Kebun Saya, jadi alat tidak diberi tahu.
 * Setelah PUT/PATCH/DELETE berhasil, meja yang terdampak (lama dan baru) dicek: bila tak ada batch berjalan lagi di meja itu
 * dan alat masih SEMAI, alat diberi PANEN supaya berhenti mendosis dan mengisi air sendiri (panenBilaKosong aman dipanggil ulang).
 */
/**
 * Hapus tahap yang sudah berlanjut ke tahap berikutnya ditolak (409). Di database relasinya SET NULL, jadi tanpa ini baris tahap
 * berikutnya menjadi yatim (tanpa tanaman/target) tetapi masih dihitung sebagai batch berjalan di mejanya: alat tidak mendapat
 * target dan tidak pernah diberi PANEN.
 */
function blokirHapusBerlanjut(anak, fk, pesan) {
  return async (req, res, next) => {
    if (req.method !== 'DELETE' || !/^\/\d{1,18}$/.test(req.path)) return next();
    try {
      const ada = await one(`SELECT 1 AS x FROM ${anak} WHERE ${fk} = $1 LIMIT 1`, [req.path.slice(1)]);
      if (ada) return res.status(409).json({ message: pesan, errors: {} });
    } catch (e) { return next(e); }
    return next();
  };
}

/**
 * Tambah tahap lewat halaman Siklus Tanam harus mengikuti urutan: tahap induk sudah SELESAI (lewat tombol selesai) dan belum punya tahap
 * berikutnya. Tanpa ini dua tahap bisa berjalan bersamaan untuk satu batch (dua target ke satu alat). Tahap berikutnya normalnya
 * dibuat otomatis oleh tombol selesai; tambah manual hanya untuk melengkapi data. Setelah berhasil, target alat disamakan.
 * @param {{induk: string, pkInduk: string, fk: string, nama: string, anak?: string, anakNama?: string}} o
 */
function cekUrutanTahap({ induk, pkInduk, fk, nama, anak, anakNama }) {
  return async (req, res, next) => {
    if (req.method !== 'POST' || req.path !== '/') return next();
    try {
      const id = String(req.body?.[fk] ?? '');
      if (/^\d{1,18}$/.test(id)) {
        const p = await one(`SELECT status FROM ${induk} WHERE ${pkInduk} = $1`, [id]);
        if (p && p.status === 'proses') {
          return res.status(409).json({ message: `Tidak bisa menambah ${nama}: tahap sebelumnya masih berjalan. Selesaikan dulu (isi jumlah yang berhasil), lalu ${nama} dibuat otomatis.`, errors: {} });
        }
        if (p && p.status === 'gagal') {
          return res.status(409).json({ message: `Tidak bisa menambah ${nama}: tahap sebelumnya ditutup tanpa tanaman yang berhasil.`, errors: {} });
        }
        if (anak && await one(`SELECT 1 AS x FROM ${anak} WHERE ${fk} = $1 LIMIT 1`, [id])) {
          return res.status(409).json({ message: `Batch ini sudah punya ${anakNama || nama}. Satu batch hanya punya satu ${nama} aktif.`, errors: {} });
        }
      }
    } catch (e) { return next(e); }
    res.on('finish', () => { if (res.statusCode === 201 && !req.user?.demo) S.diam(S.sinkronKeAlat); });
    return next();
  };
}

function sinkronAlatSetelahUbah(table, pk) {
  return async (req, res, next) => {
    if (!['PUT', 'PATCH', 'DELETE'].includes(req.method) || !/^\/\d{1,18}$/.test(req.path)) return next();
    const mejas = new Set();
    try {
      const r = await one(`SELECT id_meja FROM ${table} WHERE ${pk} = $1`, [req.path.slice(1)]);
      if (r?.id_meja != null) mejas.add(String(r.id_meja));
    } catch { /* pemeriksaan tambahan, jangan menggagalkan permintaan */ }
    if (req.body && /^\d{1,18}$/.test(String(req.body.id_meja ?? ''))) mejas.add(String(req.body.id_meja));
    res.on('finish', () => {
      if (res.statusCode >= 300 || req.user?.demo) return;
      for (const m of mejas) S.diam(S.panenBilaKosong, m, Number(req.user?.sub) || null);
    });
    next();
  };
}
const guard = [requireAuth, requireRole(['admin', 'demo'])];

// V2 — validasi path param :id (lihat _crud.js validId): non-angka ATAU melebihi
// rentang bigint Postgres → 404 PERSIS sama dengan id yang tidak ada (anti-enumeration),
// dicek di depan query (dulu 'abc'/id raksasa → 500). Body 404 diseragamkan dengan
// kontrak baru {message, errors:{}} (sebelumnya batch/:id membalas tanpa errors:{}).
// Definisi bersama (BIGINT_MAX / idValid / notFound) kini ada di ./_id.

/* ── SEMAI (ada endpoint khusus — letakkan SEBELUM crud) ───────────── */
router.get('/semai/selesai', ...guard, async (req, res, next) => {
  try {
    const { limit, offset } = halaman(req.query);
    const [rows, total] = await Promise.all([
      q(`SELECT s.*, t.nama_tanaman FROM semais s LEFT JOIN tanamen t ON t.id_tanaman = s.id_tanaman
         WHERE s.status = 'selesai' ORDER BY s.id_semai DESC LIMIT $1 OFFSET $2`, [limit, offset]),
      one("SELECT count(*)::int AS n FROM semais WHERE status = 'selesai'"),
    ]);
    res.set('X-Total-Count', String(total.n));
    res.json(rows);
  } catch (e) { next(e); }
});

router.get('/semai/batch/:id', ...guard, async (req, res, next) => {
  try {
    if (!idValid(req)) return notFound(res);
    const semai = await one(`
      SELECT s.*, t.nama_tanaman FROM semais s LEFT JOIN tanamen t ON t.id_tanaman = s.id_tanaman
      WHERE s.id_semai = $1`, [req.params.id]);
    if (!semai) return notFound(res);
    const peremajaan = await q('SELECT * FROM peremajaans WHERE id_semai = $1 ORDER BY id_peremajaan DESC', [req.params.id]);
    const pendewasaan = await q(`
      SELECT pd.* FROM pendewasaans pd JOIN peremajaans pr ON pr.id_peremajaan = pd.id_peremajaan
      WHERE pr.id_semai = $1 ORDER BY pd.id_pendewasaan DESC`, [req.params.id]);
    const panen = await q(`
      SELECT p.* FROM panens p
      JOIN pendewasaans pd ON pd.id_pendewasaan = p.id_pendewasaan
      JOIN peremajaans pr ON pr.id_peremajaan = pd.id_peremajaan
      WHERE pr.id_semai = $1 ORDER BY p.id_panen DESC`, [req.params.id]);
    res.json({ semai, peremajaan, pendewasaan, panen });
  } catch (e) { next(e); }
});

router.use('/semai', ...guard, sinkronAlatSetelahUbah('semais', 'id_semai'), demoGuard('semai.store'),
  blokirHapusBerlanjut('peremajaans', 'id_semai', 'Tidak bisa menghapus semai: batch ini sudah berlanjut ke peremajaan. Hapus data tahap berikutnya dulu.'),
  crudRouter({
  table: 'semais', pk: 'id_semai', orderBy: 'id_semai', paginasi: true,
  columns: ['id_tanaman', 'id_siklus', 'id_meja', 'jumlah_benih', 'tgl_awal_semai', 'tgl_akhir_semai', 'keterangan', 'benih_berhasil', 'benih_gagal'],
  readColumns: ['status'], // ditulis hanya oleh POST /tanam/:tipe/:id/selesai, seperti peremajaan dan pendewasaan
}));

router.use('/peremajaan', ...guard, sinkronAlatSetelahUbah('peremajaans', 'id_peremajaan'), demoGuard('peremajaan.store'),
  blokirHapusBerlanjut('pendewasaans', 'id_peremajaan', 'Tidak bisa menghapus peremajaan: batch ini sudah berlanjut ke pendewasaan. Hapus data tahap berikutnya dulu.'),
  cekUrutanTahap({ induk: 'semais', pkInduk: 'id_semai', fk: 'id_semai', nama: 'peremajaan', anak: 'peremajaans' }),
  crudRouter({
  table: 'peremajaans', pk: 'id_peremajaan', orderBy: 'id_peremajaan', paginasi: true,
  columns: ['id_semai', 'id_meja', 'jumlah_masuk', 'benih_berhasil', 'benih_gagal', 'tgl_awal_peremajaan', 'tgl_akhir_peremajaan', 'keterangan'],
  readColumns: ['status'], // ditulis hanya oleh POST /tanam/:tipe/:id/selesai
}));

router.use('/pendewasaan', ...guard, sinkronAlatSetelahUbah('pendewasaans', 'id_pendewasaan'), demoGuard('pendewasaan.store'),
  cekUrutanTahap({ induk: 'peremajaans', pkInduk: 'id_peremajaan', fk: 'id_peremajaan', nama: 'pendewasaan', anak: 'pendewasaans' }),
  crudRouter({
  table: 'pendewasaans', pk: 'id_pendewasaan', orderBy: 'id_pendewasaan', paginasi: true,
  columns: ['id_peremajaan', 'id_meja', 'jumlah_masuk', 'tanaman_berhasil', 'tanaman_gagal', 'tgl_awal_pendewasaan', 'tgl_akhir_pendewasaan', 'keterangan'],
  readColumns: ['status'], // ditulis hanya oleh POST /tanam/:tipe/:id/selesai
}));

// panen: induk pendewasaan harus sudah selesai (baris panen dibuat otomatis saat selesai; panen susulan boleh lebih dari satu)
router.use('/panen', ...guard, demoGuard('panen.store'),
  cekUrutanTahap({ induk: 'pendewasaans', pkInduk: 'id_pendewasaan', fk: 'id_pendewasaan', nama: 'panen' }),
  crudRouter({
  table: 'panens', pk: 'id_panen', orderBy: 'id_panen', paginasi: true,
  columns: ['id_pendewasaan', 'panen_berhasil', 'panen_gagal', 'tgl_panen', 'keterangan'],
}));

module.exports = router;
