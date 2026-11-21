'use strict';
/** Master data: meja, tanaman (jenis), siklus (+csv), ambang — path 1:1 resource Laravel. */
const express = require('express');
const { q, one } = require('../db');
const { konfigurasiMeja } = require('../konfigurasiAlat');
const S = require('../sinkronAlat');
const P = require('../presetDosing');
const { demoGuard, requireAuth, requireRole } = require('../auth');
const { crudRouter } = require('./_crud');

const router = express.Router();
const guard = [requireAuth, requireRole(['admin', 'demo'])];

/**
 * Konfigurasi alat per meja (yang dikirim KONFIGURASI saat Mulai Semai) + alat yang terpasang.
 * GET /meja/konfigurasi-alat → { data: [{ id_meja, volume_l, monitoring_menit, jeda_ab_dtk, otomatis, alat }], alat: [...] }
 */
router.get('/meja/konfigurasi-alat', ...guard, async (_req, res, next) => {
  try {
    const [meja, alat] = await Promise.all([
      q('SELECT * FROM mejas ORDER BY id_meja'),
      q(`SELECT kode, nama, id_meja, (terakhir_terlihat > now() - interval '120 seconds') AS online
           FROM perangkat WHERE peran IN ('gabungan', 'aktuator') ORDER BY kode`),
    ]);
    res.json({
      data: meja.map((m) => {
        const a = alat.find((x) => String(x.id_meja) === String(m.id_meja));
        return { id_meja: m.id_meja, ...konfigurasiMeja(m), alat: a?.kode ?? null, alat_nama: a ? a.nama || a.kode : null };
      }),
      alat,
    });
  } catch (e) { next(e); }
});

/**
 * Pasang / lepas alat di meja (perangkat.id_meja) dan, opsional, ganti nama tampilannya (perangkat.nama).
 * Satu alat hanya di satu meja; satu meja satu alat. Kode alat (login MQTT, topik garap/<kode>/…) tidak pernah diubah.
 */
router.put('/meja/:id/alat', ...guard, demoGuard('meja.alat'), async (req, res, next) => {
  try {
    if (!/^\d{1,18}$/.test(req.params.id)) return res.status(404).json({ message: 'Data tidak ditemukan.' });
    const kode = req.body?.kode ?? null;
    if (kode !== null && (typeof kode !== 'string' || !kode.trim())) {
      return res.status(422).json({ message: 'Data tidak valid.', errors: { kode: ['Pilih alat atau kosongkan.'] } });
    }
    if (!(await one('SELECT 1 AS x FROM mejas WHERE id_meja = $1', [req.params.id]))) return res.status(404).json({ message: 'Data tidak ditemukan.' });
    if (kode && !(await one("SELECT 1 AS x FROM perangkat WHERE kode = $1 AND peran IN ('gabungan','aktuator')", [kode]))) {
      return res.status(422).json({ message: 'Data tidak valid.', errors: { kode: ['Alat tidak dikenal.'] } });
    }
    const nama = req.body?.nama;
    if (nama !== undefined && nama !== null && (typeof nama !== 'string' || nama.trim().length > 100)) {
      return res.status(422).json({ message: 'Data tidak valid.', errors: { nama: ['Nama alat maksimal 100 karakter.'] } });
    }
    // alat yang tadinya di meja ini dan akan dilepas, serta meja asal alat yang dipindah (untuk menyamakan status alat sesudahnya)
    const dilepas = (await q('SELECT kode FROM perangkat WHERE id_meja = $1 AND ($2::text IS NULL OR kode <> $2)', [req.params.id, kode])).map((r) => r.kode);
    await q('UPDATE perangkat SET id_meja = NULL, updated_at = now() WHERE id_meja = $1 AND ($2::text IS NULL OR kode <> $2)', [req.params.id, kode]);
    if (kode) await q('UPDATE perangkat SET id_meja = $1, updated_at = now() WHERE kode = $2', [req.params.id, kode]);
    if (!req.user.demo) {
      const uid = Number(req.user.sub) || null;
      // alat yang dilepas tidak lagi punya meja: ia berhenti menjaga (PANEN) supaya tidak mendosis tanpa batch
      for (const k of dilepas) S.diam(S.panenAlatKode, k, uid);
      if (kode) {
        // alat baru: bila meja ini punya batch berjalan ia mulai menjaganya, selainnya ia berhenti (mungkin masih SEMAI dari meja lamanya)
        const adaBatch = (await P.batchPerMeja()).has(String(req.params.id));
        S.diam(adaBatch ? S.mulaiSemaiAlat : S.panenAlatKode, adaBatch ? req.params.id : kode, uid);
      }
    }
    if (kode && typeof nama === 'string' && nama.trim()) await q('UPDATE perangkat SET nama = $1 WHERE kode = $2', [nama.trim(), kode]);
    req.audit = { aksi: 'update', tabel: 'perangkat', row_id: kode ?? String(req.params.id), after: { id_meja: kode ? Number(req.params.id) : null } };
    res.json({ status: true, message: kode ? `Alat ${kode} dipasang di meja ini.` : 'Alat dilepas dari meja ini.' });
  } catch (e) { next(e); }
});

/**
 * Hapus data master yang masih dipakai ditolak (409). Di database relasinya SET NULL, jadi tanpa ini batch yang berjalan kehilangan
 * tanaman (resep, kategori Uji Lab, durasi) atau meja (alat tetap SEMAI tanpa batch). `cek(id)` mengembalikan pesan atau null.
 * `sesudah(id, req, awal)` jalan setelah hapus berhasil; `awal(id)` dibaca sebelum hapus.
 */
function pengamanHapus({ cek, awal, sesudah }) {
  return async (req, res, next) => {
    if (req.method !== 'DELETE' || !/^\/\d{1,18}$/.test(req.path)) return next();
    const id = req.path.slice(1);
    try {
      const pesan = await cek(id);
      if (pesan) return res.status(409).json({ message: pesan, errors: {} });
      const bawaan = awal ? await awal(id) : null;
      if (sesudah) res.on('finish', () => { if (res.statusCode < 300 && !req.user?.demo) sesudah(id, req, bawaan); });
    } catch (e) { return next(e); }
    return next();
  };
}

const batchBerjalanDiMeja = `
  SELECT 1 AS x FROM (
    SELECT id_meja FROM semais WHERE status = 'proses'
    UNION ALL SELECT id_meja FROM peremajaans WHERE status = 'proses'
    UNION ALL SELECT id_meja FROM pendewasaans WHERE status = 'proses') b
  WHERE b.id_meja = $1 LIMIT 1`;

const hapusMeja = pengamanHapus({
  cek: async (id) => ((await one(batchBerjalanDiMeja, [id])) ? 'Tidak bisa menghapus meja: masih ada batch berjalan di meja ini. Selesaikan atau hapus batchnya dulu.' : null),
  awal: async (id) => (await q('SELECT kode FROM perangkat WHERE id_meja = $1', [id])).map((r) => r.kode),
  // alat yang terpasang di meja yang dihapus berhenti menjaga (PANEN)
  sesudah: (_id, req, kodeAlat) => { for (const k of kodeAlat ?? []) S.diam(S.panenAlatKode, k, Number(req.user?.sub) || null); },
});

const hapusTanaman = pengamanHapus({
  cek: async (id) => {
    const n = (await one('SELECT count(*)::int AS n FROM semais WHERE id_tanaman = $1', [id]))?.n ?? 0;
    return n > 0 ? `Tidak bisa menghapus jenis tanaman: sudah dipakai ${n} batch (resep, kategori Uji Lab, dan nama di laporan ikut hilang). Ubah namanya bila perlu.` : null;
  },
});

/** Rentang wajar tiap sensor untuk Ambang Sensor (di dalam batas wajar bacaan firmware). */
const RENTANG_AMBANG = {
  ph: [0, 14, 'pH'], tds: [0, 10000, 'ppm'], waterTemp: [-10, 60, '°C'], airTemp: [-20, 70, '°C'], humidity: [0, 100, '%'],
};

/** Ambang Sensor: min < max dan di dalam rentang wajar sensornya; PUT sebagian dilengkapi nilai lama. */
async function cekAmbang(req, res, next) {
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) return next();
  try {
    const b = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
    if (b.min === undefined && b.max === undefined && b.sensor === undefined) return next();
    let lama = {};
    if (req.method !== 'POST' && /^\/\d{1,18}$/.test(req.path)) lama = (await one('SELECT sensor, min, max FROM sensor_thresholds WHERE id = $1', [req.path.slice(1)])) || {};
    const angka = (v) => (v === null || v === undefined || v === '' ? null : Number(v));
    const sensor = b.sensor ?? lama.sensor;
    const [mn, mx] = [angka(b.min !== undefined ? b.min : lama.min), angka(b.max !== undefined ? b.max : lama.max)];
    const errors = {};
    const r = RENTANG_AMBANG[sensor];
    if (r && mn != null && Number.isFinite(mn) && (mn < r[0] || mn > r[1])) errors.min = [`Batas bawah ${sensor} harus ${r[0]} sampai ${r[1]} ${r[2]}.`];
    if (r && mx != null && Number.isFinite(mx) && (mx < r[0] || mx > r[1])) errors.max = [`Batas atas ${sensor} harus ${r[0]} sampai ${r[1]} ${r[2]}.`];
    if (mn != null && mx != null && Number.isFinite(mn) && Number.isFinite(mx) && mx <= mn) errors.max = ['Batas atas harus lebih besar dari batas bawah.'];
    if (Object.keys(errors).length) return res.status(422).json({ message: 'Data tidak valid.', errors });
  } catch (e) { return next(e); }
  return next();
}

router.use('/meja', ...guard,
  hapusMeja,
  demoGuard('meja.store'),
  crudRouter({
    table: 'mejas', pk: 'id_meja',
    // Whitelist kolom TULIS — daftar lengkap kolom mejas selain PK & stempel waktu.
    // 7 kolom fisik talang/penampung (migrasi skema V2, ANALISIS_DB_PERANCANGAN §e)
    // WAJIB ada di sini: kolom di luar whitelist tidak ikut SELECT (crudRouter) sehingga
    // dulu tidak muncul di GET/POST/PUT /meja; spec tipe ada di _validate.js TABLE_SPECS
    // (jenis_talang enum NFT|DFT sesuai CHECK, kapasitas/laju/panjang numerik,
    // kenaikan_air_cm integer DEFAULT 40).
    columns: [
      'meja', 'jumlah_lubang',
      'jenis_talang', 'kapasitas_penampung_l', 'jumlah_talang', 'lubang_per_talang',
      'panjang_talang_m', 'laju_per_talang_lpm', 'kenaikan_air_cm',
      'monitoring_menit', 'jeda_ab_dtk', // kosong = dihitung otomatis (src/konfigurasiAlat.js)
    ],
    // Kolom baca-saja: ikut GET (baris berjumlah 13 kolom = 1 PK + 9 tulis + 3 waktu)
    // tetapi tetap ditolak/divalidasi sebagai kolom di luar whitelist saat POST/PUT.
    readColumns: ['created_at', 'updated_at', 'expires_at'],
    name: 'meja', orderBy: 'id_meja',
  }));

/**
 * Pasangan angka resep tanaman harus masuk akal sebelum disalin ke batch dan dikirim ke alat: ppm target >= ppm awal,
 * pH maksimum > pH minimum (alat menolak rentang pH terbalik). Hanya diperiksa bila body menyebut salah satunya;
 * PUT/PATCH sebagian dilengkapi nilai lama dari baris.
 */
async function cekPasanganTanaman(req, res, next) {
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) return next();
  try {
    const b = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
    if (!['ppm_awal', 'ppm_target', 'ph_min', 'ph_max'].some((k) => b[k] !== undefined)) return next();
    let lama = {};
    if (req.method !== 'POST' && /^\/\d{1,18}$/.test(req.path)) {
      lama = (await one('SELECT ppm_awal, ppm_target, ph_min, ph_max FROM tanamen WHERE id_tanaman = $1', [req.path.slice(1)])) || {};
    }
    const v = (k) => {
      const x = b[k] !== undefined ? b[k] : lama[k];
      const n = x === null || x === undefined || x === '' ? null : Number(String(x).replace(',', '.'));
      return Number.isFinite(n) ? n : null;
    };
    const errors = {};
    const [awal, target, pmin, pmax] = [v('ppm_awal'), v('ppm_target'), v('ph_min'), v('ph_max')];
    if (awal != null && target != null && target < awal) errors.ppm_target = ['ppm target tidak boleh lebih kecil dari ppm awal.'];
    if (pmin != null && pmax != null && pmax <= pmin) errors.ph_max = ['pH maksimum harus lebih besar dari pH minimum.'];
    if (Object.keys(errors).length) return res.status(422).json({ message: 'Data tidak valid.', errors });
  } catch { /* pemeriksaan tambahan; validasi kolom tetap dijalankan crudRouter */ }
  return next();
}

router.use('/tanaman', ...guard,
  hapusTanaman,
  cekPasanganTanaman,
  demoGuard('tanaman.store'),
  crudRouter({
    table: 'tanamen', pk: 'id_tanaman',
    // dua resep (per hari & per siklus) + rentang pH; cara yang dipakai dipilih saat Mulai Semai lalu disalin ke batch
    columns: ['nama_tanaman', 'kategori', 'id_meja', 'ppm_awal', 'ppm_target', 'hari_capai',
      'ppm_semai', 'ppm_peremajaan', 'ppm_pendewasaan', 'ph_min', 'ph_max'],
    name: 'tanaman', orderBy: 'id_tanaman',
  }));

// CSV SEBELUM route /siklus/:id (kontrak Laravel: 'siklus/csv' di depan resource)
router.get('/siklus/csv', ...guard, async (_req, res, next) => {
  try {
    const rows = await q(`
      SELECT s.*, t.nama_tanaman FROM sikluses s LEFT JOIN tanamen t ON t.id_tanaman = s.id_tanaman
      ORDER BY s.id_siklus DESC`);
    const lines = ['VARIETAS,NAMA SIKLUS,WAKTU SIKLUS (HARI)'];
    for (const r of rows) lines.push([r.nama_tanaman, r.nama_siklus, r.waktu_siklus].join(','));
    res.setHeader('Content-Type', 'text/csv; charset=UTF-8');
    res.setHeader('Content-Disposition', 'attachment; filename="siklus.csv"');
    res.send('\uFEFF' + lines.join('\n'));
  } catch (e) { next(e); }
});

router.use('/siklus', ...guard,
  demoGuard('siklus.store'),
  crudRouter({
    table: 'sikluses', pk: 'id_siklus',
    columns: ['id_tanaman', 'nama_siklus', 'waktu_siklus'], name: 'siklus', orderBy: 'id_siklus',
  }));

router.use('/ambang', ...guard,
  cekAmbang,
  demoGuard('ambang.store'),
  crudRouter({ table: 'sensor_thresholds', pk: 'id', columns: ['sensor', 'min', 'max'], name: 'ambang', orderBy: 'id' }));

module.exports = router;
