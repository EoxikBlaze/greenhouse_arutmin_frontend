'use strict';
/**
 * Pengaturan Alat — parameter firmware (batas dosis, pengenceran, waktu) dari web.
 *   GET  /pengaturan-alat           daftar parameter + nilai berlaku + status kirim terakhir
 *   PUT  /pengaturan-alat           {nilai: {param: angka}} simpan lalu kirim KONFIGURASI ke alat
 *   POST /pengaturan-alat/bawaan    {param?} kembali ke bawaan firmware (tanpa param = semua) dan kirim ke alat
 * Hanya admin (bukan demo). Rentang mengikuti firmware; nilai di luar rentang ditolak sebelum dikirim.
 */
const express = require('express');
const { pool, q } = require('../db');
const { json } = require('../auth');
const A = require('../aktuator');
const PA = require('../pengaturanAlat');

const router = express.Router();

router.use((req, res, next) => (req.user?.level === 'admin' && !req.user.demo
  ? next()
  : json(res, 403, { message: 'Pengaturan alat hanya untuk admin.' })));

/** Kirim KONFIGURASI ke semua alat aktif. Gagal antre tidak membatalkan simpanan: nilainya ikut terkirim saat Mulai Semai. */
async function kirimKeAlat(parameter, userId, alasan) {
  const alat = await q("SELECT kode FROM perangkat WHERE peran IN ('gabungan', 'aktuator') AND aktif ORDER BY kode");
  if (!alat.length) return { ids: [], ket: 'belum ada alat terdaftar' };
  const ids = [];
  let ket = null;
  for (const { kode } of alat) {
    try {
      const p = await A.buatPerintah({ tipe: 'KONFIGURASI', parameter, sumber: 'pengguna', userId, perangkat: kode, ttlDetik: 600, alasan });
      ids.push(String(p.id));
    } catch (e) {
      if (!(e && e.status)) throw e;
      ket = e.message;
    }
  }
  return { ids, ket };
}

router.get('/', async (_req, res, next) => {
  try {
    const rows = await q(
      `SELECT p.param, p.nilai, p.diubah_pada, p.id_perintah, k.status AS status_kirim
         FROM pengaturan_alat p LEFT JOIN perintah_aktuator k ON k.id = p.id_perintah`).catch(() => []);
    const simpan = Object.fromEntries(rows.map((r) => [r.param, r]));
    const alat = await q("SELECT kode, nama, terakhir_terlihat FROM perangkat WHERE peran IN ('gabungan', 'aktuator') AND aktif ORDER BY kode");
    res.json({
      status: true,
      kelompok: PA.KELOMPOK,
      alat: alat.map((a) => ({ kode: a.kode, nama: a.nama || a.kode, online: a.terakhir_terlihat ? Date.now() - new Date(a.terakhir_terlihat).getTime() < 120_000 : false })),
      data: PA.DEF.map((d) => {
        const s = simpan[d.param];
        return {
          ...d,
          nilai: s ? Number(s.nilai) : d.bawaan,
          diatur: Boolean(s),
          diubah_pada: s?.diubah_pada ?? null,
          status_kirim: s?.status_kirim ?? null,
        };
      }),
    });
  } catch (e) { next(e); }
});

router.put('/', async (req, res, next) => {
  const { nilai, errors } = PA.validasi(req.body?.nilai);
  if (Object.keys(errors).length) return json(res, 422, { message: 'Data tidak valid.', errors });
  const client = await pool.connect();
  try {
    const sebelum = await PA.tersimpan();
    const uid = Number(req.user.sub) || null;
    await client.query('BEGIN');
    for (const [param, v] of Object.entries(nilai)) {
      await client.query(
        `INSERT INTO pengaturan_alat (param, nilai, diubah_oleh, diubah_pada) VALUES ($1, $2, $3, now())
         ON CONFLICT (param) DO UPDATE SET nilai = EXCLUDED.nilai, diubah_oleh = EXCLUDED.diubah_oleh, diubah_pada = now(), id_perintah = NULL`,
        [param, v, uid]);
    }
    await client.query('COMMIT');
    const kirim = await kirimKeAlat(nilai, uid, 'Pengaturan alat diubah dari web');
    if (kirim.ids[0]) await q('UPDATE pengaturan_alat SET id_perintah = $2 WHERE param = ANY($1::text[])', [Object.keys(nilai), kirim.ids[0]]);
    req.audit = {
      aksi: 'config_change', tabel: 'pengaturan_alat', row_id: Object.keys(nilai).join(',').slice(0, 100),
      before: Object.fromEntries(Object.keys(nilai).map((k) => [k, sebelum[k] ?? PA.DEFAULT[k]])), after: nilai,
      meta: { peristiwa: `Ubah pengaturan alat: ${Object.keys(nilai).map((k) => PA.PETA.get(k).label).join(', ')}`.slice(0, 200) },
    };
    res.json({
      status: true,
      id_perintah: kirim.ids[0] ?? null,
      message: kirim.ids.length
        ? `Tersimpan dan dikirim ke alat (${Object.keys(nilai).length} parameter); tunggu alat menjawab.`
        : `Tersimpan di web, tetapi belum bisa dikirim ke alat (${kirim.ket || 'perintah sebelumnya masih menunggu'}). Nilainya ikut terkirim saat Mulai Semai berikutnya.`,
    });
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    next(e);
  } finally {
    client.release();
  }
});

router.post('/bawaan', async (req, res, next) => {
  try {
    const param = req.body?.param;
    if (param !== undefined && !PA.PETA.has(param)) return json(res, 422, { message: 'Data tidak valid.', errors: { param: ['Parameter tidak dikenal.'] } });
    const kunci = param === undefined ? PA.DEF.map((d) => d.param) : [param];
    const sebelum = await PA.tersimpan();
    const uid = Number(req.user.sub) || null;
    await q('DELETE FROM pengaturan_alat WHERE param = ANY($1::text[])', [kunci]);
    const kirim = await kirimKeAlat(Object.fromEntries(kunci.map((k) => [k, PA.DEFAULT[k]])), uid, 'Pengaturan alat dikembalikan ke bawaan firmware');
    req.audit = {
      aksi: 'config_change', tabel: 'pengaturan_alat', row_id: kunci.length === 1 ? kunci[0] : 'semua',
      before: Object.fromEntries(kunci.filter((k) => sebelum[k] !== undefined).map((k) => [k, sebelum[k]])), after: { bawaan_firmware: true },
      meta: { peristiwa: kunci.length === 1 ? `Kembalikan ke bawaan: ${PA.PETA.get(kunci[0]).label}` : 'Kembalikan semua pengaturan alat ke bawaan' },
    };
    res.json({
      status: true,
      id_perintah: kirim.ids[0] ?? null,
      message: kirim.ids.length ? 'Dikembalikan ke bawaan firmware dan dikirim ke alat.' : `Dikembalikan ke bawaan di web, tetapi belum terkirim ke alat (${kirim.ket || 'perintah sebelumnya masih menunggu'}).`,
    });
  } catch (e) { next(e); }
});

/** Kirim ulang SEMUA nilai yang berlaku di web ke alat (dipakai saat "Baca dari alat" menemukan nilai berbeda). Tidak mengubah simpanan. */
router.post('/kirim-ulang', async (req, res, next) => {
  try {
    const nilai = await PA.efektif();
    const kirim = await kirimKeAlat(nilai, Number(req.user.sub) || null, 'Samakan pengaturan alat dengan web');
    req.audit = {
      aksi: 'config_change', tabel: 'pengaturan_alat', row_id: 'semua', after: nilai,
      meta: { peristiwa: 'Kirim ulang semua pengaturan alat dari web' },
    };
    res.status(kirim.ids.length ? 202 : 200).json({
      status: true,
      id_perintah: kirim.ids[0] ?? null,
      message: kirim.ids.length
        ? `Semua ${Object.keys(nilai).length} pengaturan dikirim ke alat; tunggu alat menjawab, lalu baca lagi.`
        : `Belum bisa dikirim ke alat (${kirim.ket || 'perintah sebelumnya masih menunggu'}).`,
    });
  } catch (e) { next(e); }
});

module.exports = router;
