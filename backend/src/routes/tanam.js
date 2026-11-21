'use strict';
/** Tanam Saya — daftar tanam aktif, mulai tanam, selesai per tahap, hapus. */
const express = require('express');
const { pool, q, one } = require('../db');
const { demoGuard, demoExpiry, json, requireRole } = require('../auth');
const { idValid, notFound } = require('./_id');
const { halaman } = require('./_halaman');
const { fkErrors, FK_TARGETS } = require('./_crud');
const { isDateString } = require('./_validate');
const { sinkronDiam, sinkronTarget, naikHarian, naikDariSemai, targetBatch } = require('../presetDosing');
const S = require('../sinkronAlat');
const { bacaKeadaanAlat } = require('../keadaanAlat');
const { parameterKonfigurasi } = require('../konfigurasiAlat');
const K = require('../kurvaNutrisi');

const router = express.Router();

/* ── V5 — validasi input SEBELUM INSERT /mulai ─────────────────────────
 * Dulu body /tanam/mulai langsung dibungkus ke query parameterisasi tanpa
 * validasi apa pun, sehingga dua kelas input rusak membuat PostgreSQL
 * melempar error → 500 generik:
 *   (a) FK berbentuk benar tetapi tidak ada ({"id_meja":999999}) → SQLSTATE 23503;
 *   (b) tanggal salah format ({"tgl_awal_semai":"bukan-tanggal"}) → SQLSTATE 22007
 *       "invalid input syntax for type date";
 *   (c) jumlah_benih bukan integer ({"jumlah_benih":"abc"}) → SQLSTATE 22002.
 * Kini ketiganya dijawab 422 kontrak {message, errors:{field:[pesan]}} SEBELUM
 * query — data tidak pernah tersentuh. Nilai null/tidak dikirim TIDAK dicek:
 * perilaku lama (FK null → kolom null, tanggal null → coalesce(now()::date),
 * jumlah_benih tidak ada → 0) dipertahankan persis.
 */
const MULAI_FKS = ['id_tanaman', 'id_siklus', 'id_meja'].filter((c) => c in FK_TARGETS);
const MULAI_TGL = ['tgl_awal_semai'];
const MULAI_INT = ['jumlah_benih'];

/**
 * Kumpulkan error 422 /mulai: FK (422 'tidak terdaftar'), tanggal (pola
 * YYYY-MM-DD), integer (pesan seragam tipe _validate.js).
 * @returns {Promise<Record<string, string[]>>}
 */
async function mulaiErrors(b) {
  const errors = {};
  Object.assign(errors, await fkErrors(MULAI_FKS, b));
  for (const col of MULAI_TGL) {
    const v = b[col];
    if (v === undefined || v === null) continue;
    if (!isDateString(v)) {
      errors[col] = [typeof v === 'string'
        ? `Kolom ${col} harus berformat YYYY-MM-DD.`
        : `Kolom ${col} harus berupa teks.`];
    }
  }
  for (const col of MULAI_INT) {
    const v = b[col];
    if (v === undefined || v === null) continue;
    const num = typeof v === 'number' ? v : (/^-?\d+$/.test(String(v).trim()) ? Number(String(v).trim()) : NaN);
    if (Number.isNaN(num) || !Number.isSafeInteger(num)) {
      errors[col] = [`Kolom ${col} harus berupa bilangan bulat.`];
    }
  }
  // isi yang masuk akal (dulu lolos: tanpa tanaman, benih 0/negatif/99 juta, tanggal 2001 atau 2030)
  if (b.id_tanaman === undefined || b.id_tanaman === null || b.id_tanaman === '') errors.id_tanaman = ['Pilih tanaman dulu.'];
  if (!errors.jumlah_benih) {
    const jb = b.jumlah_benih === undefined || b.jumlah_benih === null || b.jumlah_benih === '' ? null : Number(String(b.jumlah_benih).trim());
    if (jb === null) errors.jumlah_benih = ['Jumlah benih wajib diisi.'];
    else if (!Number.isInteger(jb) || jb < 1 || jb > 100_000) errors.jumlah_benih = ['Jumlah benih harus 1 sampai 100.000.'];
  }
  if (!errors.tgl_awal_semai && typeof b.tgl_awal_semai === 'string' && b.tgl_awal_semai) {
    const hariIni = new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10); // hari ini menurut WITA
    const terlama = new Date(Date.now() + 8 * 3_600_000 - 180 * 86_400_000).toISOString().slice(0, 10);
    if (b.tgl_awal_semai > hariIni) errors.tgl_awal_semai = ['Tanggal mulai tidak boleh di masa depan.'];
    else if (b.tgl_awal_semai < terlama) errors.tgl_awal_semai = ['Tanggal mulai terlalu lama (maksimal 180 hari ke belakang).'];
  }
  return errors;
}

// V2 — validasi path param :id (lihat _crud.js validId): non-angka ATAU melebihi
// rentang bigint Postgres → 404 PERSIS sama dengan id yang tidak ada (anti-enumeration),
// dicek di depan query supaya tidak pernah menyentuh DB (dulu → 500 SQLSTATE 22003).
// Definisi bersama (BIGINT_MAX / idValid / notFound) kini ada di ./_id.

/* ── Alur petani: hanya MEMILIH tanaman/meja, mengetik jumlah, dan MENGISI JUMLAH BERHASIL ──
 * Tanggal, durasi tahap, hari ke-berapa, jumlah gagal, dan tahap berikutnya dihitung server:
 *   semai ─(berhasil)→ peremajaan ─(berhasil)→ pendewasaan ─(panen: berhasil/gagal)→ panens
 * Durasi tiap tahap dari tabel sikluses (nama_siklus Semai/Peremajaan/Pendewasaan per tanaman). */
const TAHAP = {
  semai: {
    table: 'semais', pk: 'id_semai', awal: 'tgl_awal_semai', akhir: 'tgl_akhir_semai', jumlah: 'jumlah_benih',
    ok: 'benih_berhasil', gagal: 'benih_gagal', lanjut: 'peremajaan',
  },
  peremajaan: {
    table: 'peremajaans', pk: 'id_peremajaan', awal: 'tgl_awal_peremajaan', akhir: 'tgl_akhir_peremajaan', jumlah: 'jumlah_masuk',
    ok: 'benih_berhasil', gagal: 'benih_gagal', lanjut: 'pendewasaan',
  },
  pendewasaan: {
    table: 'pendewasaans', pk: 'id_pendewasaan', awal: 'tgl_awal_pendewasaan', akhir: 'tgl_akhir_pendewasaan', jumlah: 'jumlah_masuk',
    ok: 'tanaman_berhasil', gagal: 'tanaman_gagal', lanjut: 'panen',
  },
};

// durasi (hari) tahap $tipe untuk tanaman t.id_tanaman; NULL bila siklusnya belum diisi admin
/** Kolom kurva batch (akar semai `s`) + kurva tanaman `t` untuk presetDosing.naikHarian. */
const KURVA = `s.id_semai, current_date - s.tgl_awal_semai::date AS hari_semai, s.kurva_ppm_awal, s.kurva_ppm_target, s.kurva_hari_capai, s.kurva_mulai_hari, s.kurva_mulai_ppm,
                s.kurva_cara, s.kurva_ppm_semai, s.kurva_ppm_peremajaan, s.kurva_ppm_pendewasaan, s.kurva_ph_min, s.kurva_ph_max,
                t.ppm_awal, t.ppm_target, t.hari_capai`;

/** Durasi MASTER (Jenis Tanaman → tabel sikluses) tahap $tipe untuk tanaman t. */
const DURASI_MASTER = (tipe) => `(SELECT k.waktu_siklus FROM sikluses k
   WHERE k.id_tanaman = t.id_tanaman AND lower(k.nama_siklus) = '${tipe}' ORDER BY k.id_siklus LIMIT 1)`;
/** Durasi BATCH: salinan saat Mulai Semai (semais.durasi_*, akar batch = `s`) lebih dulu, batch lama memakai master. */
const DURASI = (tipe) => `COALESCE(s.durasi_${tipe}, ${DURASI_MASTER(tipe)})`;

router.get('/', async (req, res, next) => {
  try {
    // tiap tahap diambil limit+1 baris → tahu ada sisa tanpa count(*); bawaan 200 per tahap
    const { limit } = halaman(req.query);
    const [semai, peremajaan, pendewasaan] = await Promise.all([
      q(`SELECT s.id_semai AS id, 'semai' AS tipe, s.status, s.tgl_awal_semai AS mulai,
                t.nama_tanaman AS varietas, m.meja, s.id_meja, s.jumlah_benih, s.jumlah_benih AS jumlah,
                ${DURASI('semai')} AS durasi_hari, ${DURASI('semai')} AS dur_semai, ${DURASI('peremajaan')} AS dur_peremajaan, ${DURASI('pendewasaan')} AS dur_pendewasaan, ${KURVA}, NULL::int AS hari_netpot
         FROM semais s LEFT JOIN tanamen t ON t.id_tanaman = s.id_tanaman
         LEFT JOIN mejas m ON m.id_meja = s.id_meja
         WHERE s.status = 'proses' ORDER BY s.id_semai DESC LIMIT $1`, [limit + 1]),
      q(`SELECT p.id_peremajaan AS id, 'peremajaan' AS tipe, p.status, p.tgl_awal_peremajaan AS mulai,
                t.nama_tanaman AS varietas, m.meja, p.id_meja, p.jumlah_masuk, p.jumlah_masuk AS jumlah,
                ${DURASI('peremajaan')} AS durasi_hari, ${DURASI('semai')} AS dur_semai, ${DURASI('peremajaan')} AS dur_peremajaan, ${DURASI('pendewasaan')} AS dur_pendewasaan, ${KURVA}, current_date - p.tgl_awal_peremajaan::date AS hari_netpot
         FROM peremajaans p LEFT JOIN semais s ON s.id_semai = p.id_semai
         LEFT JOIN tanamen t ON t.id_tanaman = s.id_tanaman
         LEFT JOIN mejas m ON m.id_meja = p.id_meja
         WHERE p.status = 'proses' ORDER BY p.id_peremajaan DESC LIMIT $1`, [limit + 1]),
      q(`SELECT d.id_pendewasaan AS id, 'pendewasaan' AS tipe, d.status, d.tgl_awal_pendewasaan AS mulai,
                t.nama_tanaman AS varietas, m.meja, d.id_meja, d.jumlah_masuk, d.jumlah_masuk AS jumlah,
                ${DURASI('pendewasaan')} AS durasi_hari, ${DURASI('semai')} AS dur_semai, ${DURASI('peremajaan')} AS dur_peremajaan, ${DURASI('pendewasaan')} AS dur_pendewasaan, ${KURVA},
                current_date - coalesce(p.tgl_awal_peremajaan, d.tgl_awal_pendewasaan)::date AS hari_netpot
         FROM pendewasaans d LEFT JOIN peremajaans p ON p.id_peremajaan = d.id_peremajaan
         LEFT JOIN semais s ON s.id_semai = p.id_semai
         LEFT JOIN tanamen t ON t.id_tanaman = s.id_tanaman
         LEFT JOIN mejas m ON m.id_meja = d.id_meja
         WHERE d.status = 'proses' ORDER BY d.id_pendewasaan DESC LIMIT $1`, [limit + 1]),
    ]);
    const terpotong = [semai, peremajaan, pendewasaan].some((r) => r.length > limit);
    const hariIni = await one('SELECT current_date AS d');
    const list = [semai, peremajaan, pendewasaan].flatMap((r) => r.slice(0, limit)).map((r) => {
      const hari = Math.max(1, Math.round((new Date(hariIni.d) - new Date(r.mulai)) / 86_400_000) + 1);
      const durasi = r.durasi_hari == null ? null : Number(r.durasi_hari);
      const tahap = { semai: 'Semai', peremajaan: 'Peremajaan', pendewasaan: 'Pendewasaan' }[r.tipe];
      const naik = r.kurva_cara === 'harian' ? naikDariSemai({ ...r, tahap }) : naikHarian({ ...r, tahap });
      const target = targetBatch({ ...r, tahap });
      const angka = (v) => (v == null ? null : Number(v));
      const kurva = r.kurva_cara === 'tahap'
        ? { cara: 'tahap', ppm_semai: angka(r.kurva_ppm_semai), ppm_peremajaan: angka(r.kurva_ppm_peremajaan), ppm_pendewasaan: angka(r.kurva_ppm_pendewasaan) }
        : r.kurva_ppm_awal != null
          ? { cara: 'harian', ppm_awal: angka(r.kurva_ppm_awal), ppm_target: angka(r.kurva_ppm_target), hari_capai: r.kurva_hari_capai, diubah_hari: r.kurva_mulai_hari || null }
          : r.ppm_awal != null ? { cara: 'harian', ppm_awal: angka(r.ppm_awal), ppm_target: angka(r.ppm_target), hari_capai: r.hari_capai, diubah_hari: null } : null;
      const sisa = Object.fromEntries(Object.entries(r).filter(([k]) => !k.startsWith('kurva_') && !k.startsWith('dur_') && !['ppm_awal', 'ppm_target', 'hari_capai'].includes(k)));
      return {
        ...sisa, durasi_hari: durasi, durasi_batch: { semai: angka(r.dur_semai), peremajaan: angka(r.dur_peremajaan), pendewasaan: angka(r.dur_pendewasaan) }, hari_ke: hari, siap: durasi != null && hari >= durasi, tahap_berikut: TAHAP[r.tipe].lanjut,
        nutrisi: {
          kurva, hari_semai: angka(r.hari_semai), hari_netpot: r.hari_netpot, target_hari_ini: target?.ppm ?? null, per_hari: naik?.per_hari ?? null,
          ph_min: angka(r.kurva_ph_min), ph_max: angka(r.kurva_ph_max),
        },
      };
    });
    res.json({ page: 'tanam', list, terpotong });
  } catch (e) { next(e); }
});

/** Pilihan untuk form "Mulai tanam" — petani tidak punya akses ke /tanaman & /meja (khusus admin). */
router.get('/pilihan', async (_req, res, next) => {
  try {
    const [tanaman, meja] = await Promise.all([
      q(`SELECT t.id_tanaman AS id, t.nama_tanaman AS nama, t.id_meja, t.ppm_awal, t.ppm_target, t.hari_capai,
                t.ppm_semai, t.ppm_peremajaan, t.ppm_pendewasaan, t.ph_min, t.ph_max,
                ${DURASI_MASTER('semai')} AS semai, ${DURASI_MASTER('peremajaan')} AS peremajaan, ${DURASI_MASTER('pendewasaan')} AS pendewasaan
           FROM tanamen t ORDER BY t.nama_tanaman`),
      // alat yang terpasang di meja (perangkat.id_meja) — Mulai Semai mengirim KONFIGURASI + SEMAI ke alat ini
      q(`SELECT m.id_meja AS id, m.meja AS nama, m.kapasitas_penampung_l AS volume_l,
                a.kode AS alat, coalesce(nullif(a.nama, ''), a.kode) AS alat_nama
           FROM mejas m
           LEFT JOIN LATERAL (SELECT p.kode, p.nama FROM perangkat p WHERE p.id_meja = m.id_meja AND p.peran IN ('gabungan','aktuator')
                               ORDER BY p.kode LIMIT 1) a ON true
          ORDER BY m.meja`),
    ]);
    res.json({ tanaman, meja });
  } catch (e) { next(e); }
});

// Mulai tanam baru = buat batch semai (data demo dapat expires_at +1 jam)
router.post('/mulai', demoGuard('tanam.mulai'), async (req, res, next) => {
  try {
    const b = req.body || {};
    // V5 — validasi FK/tanggal/integer SEBELUM INSERT (lihat mulaiErrors di atas).
    const errors = await mulaiErrors(b);
    if (Object.keys(errors).length) return json(res, 422, { message: 'Data tidak valid.', errors });
    // kurva naik harian disalin ke batch (isian dialog menimpa kurva tanaman) — ubah kurva tanaman nanti tidak menggeser batch ini
    const tanaman = b.id_tanaman == null ? null
      : await one(`SELECT ppm_awal, ppm_target, hari_capai, ppm_semai, ppm_peremajaan, ppm_pendewasaan, ph_min, ph_max
                     FROM tanamen WHERE id_tanaman = $1`, [b.id_tanaman]);
    const kurva = K.kurvaAwal(tanaman, b);
    if (Object.keys(kurva.errors).length) return json(res, 422, { message: 'Data tidak valid.', errors: kurva.errors });
    const kv = kurva.kolom || {};
    // durasi tahap batch ini: isian dialog, kosong → salinan master Jenis Tanaman (ubah master nanti tidak menggeser batch)
    const dur = await durasiBatch(b);
    if (Object.keys(dur.errors).length) return json(res, 422, { message: 'Data tidak valid.', errors: dur.errors });
    const exp = demoExpiry(req.user);
    // siklus Semai tanaman ini diisi otomatis bila klien tidak mengirim id_siklus
    const idSiklus = b.id_siklus ?? (b.id_tanaman == null ? null : (await one(
      "SELECT id_siklus FROM sikluses WHERE id_tanaman = $1 AND lower(nama_siklus) = 'semai' ORDER BY id_siklus LIMIT 1",
      [b.id_tanaman]))?.id_siklus ?? null);
    const row = await one(
      // G10 — tgl_akhir_semai NOT NULL tanpa default: dahulu kolom ini TIDAK ikut
      // INSERT → 23502 → 500 → fitur Mulai Tanam MATI TOTAL (seluruh payload lolos
      // validasi tetap 500). Diisi = tgl_awal (penanda 'belum ditutup'); penutupan
      // asli terjadi di handler /:tipe/:id/selesai via CASE (lihat bawah).
      `INSERT INTO semais (id_tanaman, id_siklus, id_meja, jumlah_benih, tgl_awal_semai, tgl_akhir_semai, status, keterangan, benih_berhasil, benih_gagal, expires_at, created_at, updated_at,
                           kurva_ppm_awal, kurva_ppm_target, kurva_hari_capai, kurva_mulai_hari, kurva_mulai_ppm,
                           kurva_cara, kurva_ppm_semai, kurva_ppm_peremajaan, kurva_ppm_pendewasaan, kurva_ph_min, kurva_ph_max,
                           durasi_semai, durasi_peremajaan, durasi_pendewasaan)
       VALUES ($1,$2,$3,$4, coalesce($5::date, now()::date), coalesce($5::date, now()::date), 'proses', $6, 0, 0, $7, now(), now(),
               $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
       RETURNING *`,
      [b.id_tanaman ?? null, idSiklus, b.id_meja ?? null, b.jumlah_benih ?? 0, b.tgl_awal_semai ?? null, b.keterangan ?? null, exp,
        kv.kurva_ppm_awal ?? null, kv.kurva_ppm_target ?? null, kv.kurva_hari_capai ?? null, kv.kurva_mulai_hari ?? null, kv.kurva_mulai_ppm ?? null,
        kv.kurva_cara ?? null, kv.kurva_ppm_semai ?? null, kv.kurva_ppm_peremajaan ?? null, kv.kurva_ppm_pendewasaan ?? null,
        kv.kurva_ph_min ?? null, kv.kurva_ph_max ?? null,
        dur.nilai.semai, dur.nilai.peremajaan, dur.nilai.pendewasaan],
    );
    // target penampung ikut batch baru, lalu alat diminta mulai menjaga (SEMAI). Mode demo tidak menyentuh alat.
    let alat = { dikirim: false, ket: 'Mode demo: alat tidak diperintah.' };
    if (!req.user.demo) {
      await sinkronTarget().catch((e) => console.error('[tanam] sinkron target gagal:', e.message));
      alat = await S.diam(S.mulaiSemaiAlat, row.id_meja, Number(req.user.sub) || null);
    }
    const namaTanaman = b.id_tanaman == null ? null : (await one('SELECT nama_tanaman FROM tanamen WHERE id_tanaman = $1', [b.id_tanaman]))?.nama_tanaman;
    req.audit = {
      aksi: 'create', tabel: 'semais', row_id: String(row.id_semai), before: null,
      after: { id_tanaman: row.id_tanaman, id_meja: row.id_meja, jumlah_benih: row.jumlah_benih, tgl_awal_semai: row.tgl_awal_semai, kurva_cara: row.kurva_cara },
      meta: { peristiwa: `Mulai semai ${namaTanaman ?? 'tanaman'}: ${row.jumlah_benih} benih${row.id_meja ? `, meja ${row.id_meja}` : ', tanpa meja'}` },
    };
    res.status(201).json({ status: true, message: 'Tanam baru dimulai.', data: row, alat });
  } catch (e) { next(e); }
});

/** Hari tahap: bilangan bulat 1–365 dari angka / teks angka; selain itu null. */
const hariTahap = (v) => {
  const n = typeof v === 'number' ? v : (/^\d+$/.test(String(v ?? '').trim()) ? Number(String(v).trim()) : NaN);
  return Number.isSafeInteger(n) && n >= 1 && n <= 365 ? n : null;
};
const NAMA_TAHAP = ['semai', 'peremajaan', 'pendewasaan'];

/** Durasi tahap batch baru dari body (`durasi_semai`, ...); kosong → salinan master tanaman, atau null bila master belum diisi. */
async function durasiBatch(b) {
  const errors = {};
  const nilai = {};
  const master = b.id_tanaman == null ? [] : await q(
    'SELECT lower(nama_siklus) AS nama, waktu_siklus FROM sikluses WHERE id_tanaman = $1 ORDER BY id_siklus', [b.id_tanaman]);
  for (const t of NAMA_TAHAP) {
    const v = b[`durasi_${t}`];
    if (v === undefined || v === null || v === '') {
      const m = master.find((r) => r.nama === t);
      nilai[t] = m ? hariTahap(m.waktu_siklus) : null;
    } else if (hariTahap(v) === null) {
      errors[`durasi_${t}`] = [`Durasi ${t} harus bilangan bulat 1–365 hari.`];
    } else nilai[t] = hariTahap(v);
  }
  return { errors, nilai };
}

/**
 * Durasi MASTER satu jenis tanaman (admin): tiga tahap sekaligus, disimpan di tabel sikluses
 * (dipakai halaman Durasi Siklus, perkiraan panen, dan nilai awal Mulai Semai). Hanya tahap yang dikirim yang diubah.
 */
router.put('/durasi/:id', requireRole(['admin']), demoGuard('tanam.durasi'), async (req, res, next) => {
  if (!idValid(req)) return notFound(res);
  try {
    const b = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
    const errors = {};
    const isi = {};
    for (const t of NAMA_TAHAP) {
      if (b[t] === undefined || b[t] === null || b[t] === '') continue;
      if (hariTahap(b[t]) === null) errors[t] = [`Durasi ${t} harus bilangan bulat 1–365 hari.`];
      else isi[t] = hariTahap(b[t]);
    }
    if (!Object.keys(isi).length && !Object.keys(errors).length) errors.durasi = ['Isi minimal satu durasi tahap (hari).'];
    if (Object.keys(errors).length) return json(res, 422, { message: 'Data tidak valid.', errors });
    if (!(await one('SELECT 1 AS x FROM tanamen WHERE id_tanaman = $1', [req.params.id]))) return notFound(res);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const [t, hari] of Object.entries(isi)) {
        const nama = t[0].toUpperCase() + t.slice(1);
        const ubah = await client.query(
          `UPDATE sikluses SET waktu_siklus = $3, updated_at = now()
            WHERE id_siklus = (SELECT id_siklus FROM sikluses WHERE id_tanaman = $1 AND lower(nama_siklus) = $2 ORDER BY id_siklus LIMIT 1)`,
          [req.params.id, t, hari]);
        if (!ubah.rowCount) {
          await client.query(
            'INSERT INTO sikluses (id_tanaman, nama_siklus, waktu_siklus, created_at, updated_at) VALUES ($1, $2, $3, now(), now())',
            [req.params.id, nama, hari]);
        }
      }
      await client.query('COMMIT');
    } catch (e) { await client.query('ROLLBACK').catch(() => {}); throw e; } finally { client.release(); }
    const rows = await q('SELECT lower(nama_siklus) AS nama, waktu_siklus FROM sikluses WHERE id_tanaman = $1 ORDER BY id_siklus', [req.params.id]);
    const durasi = {};
    for (const r of rows) if (!(r.nama in durasi)) durasi[r.nama] = r.waktu_siklus;
    res.json({ status: true, message: 'Durasi tahap disimpan.', durasi });
  } catch (e) { next(e); }
});

/** Bilangan bulat ≥ 0 dari angka / teks angka; selain itu null. */
const bulat = (v) => {
  const n = typeof v === 'number' ? v : (/^\d+$/.test(String(v ?? '').trim()) ? Number(String(v).trim()) : NaN);
  return Number.isSafeInteger(n) && n >= 0 ? n : null;
};

/**
 * Selesaikan tahap.
 * - Body { berhasil } (aplikasi HP): petani hanya mengisi jumlah yang berhasil. Server menghitung
 *   gagal = jumlah masuk − berhasil, menutup tahap hari ini, lalu OTOMATIS membuat tahap berikutnya
 *   berisi tanaman yang berhasil (pendewasaan → catatan panen). Berhasil 0 → status 'gagal'.
 * - Tanpa body (perilaku lama web): hanya menandai selesai, tanpa tahap berikutnya.
 */
router.post('/:tipe/:id/selesai', demoGuard('tanam.selesai'), async (req, res, next) => {
  const t = TAHAP[req.params.tipe];
  if (!t) return json(res, 422, { message: 'Tahap tidak dikenal.' });
  // V2 — urutan TETAP: tipe dulu (kontrak lama 422), baru id (404 identik).
  if (!idValid(req)) return notFound(res);
  const b = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};

  if (b.berhasil === undefined || b.berhasil === null) {
    try {
      // G10 — semai: tgl_akhir berisi penanda = tgl_awal sejak INSERT /mulai → tutup dgn hari ini.
      const row = await one(
        `UPDATE ${t.table} SET status = 'selesai', updated_at = now(),
                ${t.akhir} = CASE WHEN ${t.akhir} IS NULL OR ${t.akhir} <= ${t.awal} THEN GREATEST(now()::date, ${t.awal}) ELSE ${t.akhir} END
          WHERE ${t.pk} = $1 RETURNING *`, [req.params.id]);
      if (!row) return notFound(res);
      // tahap ditutup tanpa tahap berikutnya: bila ini batch terakhir di mejanya, alat harus berhenti mendosis (PANEN)
      sinkronDiam();
      if (!req.user.demo && row.id_meja != null) S.diam(S.panenBilaKosong, row.id_meja, Number(req.user.sub) || null);
      return res.json({ status: true, message: `Tahap ${req.params.tipe} diselesaikan.`, data: row });
    } catch (e) { return next(e); }
  }

  const berhasil = bulat(b.berhasil);
  if (berhasil == null) {
    return json(res, 422, { message: 'Data tidak valid.', errors: { berhasil: ['Jumlah berhasil harus bilangan bulat ≥ 0.'] } });
  }
  const keterangan = typeof b.keterangan === 'string' && b.keterangan.trim() ? b.keterangan.trim().slice(0, 500) : null;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const lama = (await client.query(`SELECT * FROM ${t.table} WHERE ${t.pk} = $1 FOR UPDATE`, [req.params.id])).rows[0];
    if (!lama) { await client.query('ROLLBACK'); return notFound(res); }
    if (lama.status !== 'proses') {
      await client.query('ROLLBACK');
      return json(res, 409, { message: 'Tahap ini sudah diselesaikan sebelumnya.' });
    }
    // data lama bisa tanpa jumlah masuk → anggap jumlah = berhasil (gagal 0)
    const jumlah = lama[t.jumlah] == null ? berhasil : Number(lama[t.jumlah]);
    if (berhasil > jumlah) {
      await client.query('ROLLBACK');
      return json(res, 422, { message: 'Data tidak valid.', errors: { berhasil: [`Jumlah berhasil tidak boleh lebih dari ${jumlah}.`] } });
    }
    const gagal = jumlah - berhasil;
    const row = (await client.query(
      `UPDATE ${t.table} SET ${t.ok} = $2, ${t.gagal} = $3, status = $4, ${t.akhir} = GREATEST(now()::date, ${t.awal}),
              keterangan = COALESCE($5, keterangan), updated_at = now()
        WHERE ${t.pk} = $1 RETURNING *`,
      [req.params.id, berhasil, gagal, berhasil > 0 ? 'selesai' : 'gagal', keterangan])).rows[0];

    const exp = demoExpiry(req.user);
    let lanjut = null;
    if (t.lanjut === 'panen') {
      const p = (await client.query(
        `INSERT INTO panens (id_pendewasaan, panen_berhasil, panen_gagal, tgl_panen, keterangan, expires_at, created_at, updated_at)
         VALUES ($1, $2, $3, now()::date, $4, $5, now(), now()) RETURNING id_panen`,
        [req.params.id, berhasil, gagal, keterangan, exp])).rows[0];
      lanjut = { tipe: 'panen', id: p.id_panen };
    } else if (berhasil > 0) {
      const n = TAHAP[t.lanjut];
      const p = (await client.query(
        `INSERT INTO ${n.table} (${t.pk}, id_meja, jumlah_masuk, ${n.ok}, ${n.gagal}, ${n.awal}, ${n.akhir}, status, expires_at, created_at, updated_at)
         VALUES ($1, $2, $3, 0, 0, now()::date, now()::date, 'proses', $4, now(), now()) RETURNING ${n.pk} AS id`,
        [req.params.id, lama.id_meja, berhasil, exp])).rows[0];
      lanjut = { tipe: t.lanjut, id: p.id };
    }
    await client.query('COMMIT');
    sinkronDiam(); // tahap berganti → preset target penampung ikut berganti
    // batch terakhir selesai → PANEN ke alat (dosing & isi otomatis berhenti)
    if (!req.user.demo && (lanjut?.tipe === 'panen' || berhasil === 0)) S.diam(S.panenBilaKosong, lama.id_meja, Number(req.user.sub) || null);
    const pesan = lanjut?.tipe === 'panen' ? `Panen dicatat: ${berhasil} berhasil, ${gagal} gagal.`
      : lanjut ? `${berhasil} tanaman pindah ke ${t.lanjut}${gagal ? ` (${gagal} gagal)` : ''}.`
        : `Semua ${jumlah} tanaman gagal — batch ditutup.`;
    res.json({ status: true, message: pesan, data: row, berhasil, gagal, lanjut });
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    next(e);
  } finally {
    client.release();
  }
});

/**
 * Ubah lama tiap tahap SATU batch (akar = id_semai): hanya batch ini; durasi di Jenis Tanaman tidak berubah.
 * Ketiga tahap dikirim sekaligus (1–365 hari). Memengaruhi penanda "siap pindah", progres, dan perkiraan panen batch ini.
 */
router.put('/semai/:id/durasi', demoGuard('tanam.durasi-batch'), async (req, res, next) => {
  if (!idValid(req)) return notFound(res);
  try {
    const b = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
    const errors = {};
    const nilai = {};
    for (const t of NAMA_TAHAP) {
      const h = hariTahap(b[t]);
      if (h === null) errors[t] = [`Durasi ${t} harus bilangan bulat 1–365 hari (isi ketiga tahap).`];
      else nilai[t] = h;
    }
    if (Object.keys(errors).length) return json(res, 422, { message: 'Data tidak valid.', errors });
    const row = await one(
      `UPDATE semais SET durasi_semai = $2, durasi_peremajaan = $3, durasi_pendewasaan = $4, updated_at = now()
        WHERE id_semai = $1 RETURNING id_semai`, [req.params.id, nilai.semai, nilai.peremajaan, nilai.pendewasaan]);
    if (!row) return notFound(res);
    const total = nilai.semai + nilai.peremajaan + nilai.pendewasaan;
    res.json({ status: true, message: `Durasi batch diubah: ${nilai.semai} + ${nilai.peremajaan} + ${nilai.pendewasaan} = ${total} hari. Durasi di Jenis Tanaman tidak berubah.`, durasi: nilai });
  } catch (e) { next(e); }
});

/**
 * Ubah kurva naik harian SATU batch (akar = id_semai). Sebelum pindah netpot: kurva diganti seluruhnya.
 * Sesudahnya: target hari ini dipertahankan, lalu naik rata ke target baru (tanpa lompatan, src/kurvaNutrisi.js).
 */
router.put('/semai/:id/kurva', demoGuard('tanam.kurva'), async (req, res, next) => {
  if (!idValid(req)) return notFound(res);
  try {
    const batch = await K.bacaBatch(req.params.id);
    if (!batch) return notFound(res);
    if (!batch.tahap) return json(res, 409, { message: 'Batch ini sudah selesai; kurva tidak bisa diubah.' });
    const r = K.rencanaUbah(batch, req.body || {});
    if (r.errors) return json(res, 422, { message: 'Data tidak valid.', errors: r.errors });
    const k = r.kolom;
    const sebelum = Object.fromEntries(Object.keys(k).map((x) => [x, batch[x] ?? null]));
    // kunci kolom berasal dari K.rencanaUbah (daftar tetap kurva_*), bukan dari isian pengguna
    const kunci = Object.keys(k).filter((x) => /^kurva_[a-z_]+$/.test(x));
    const set = kunci.map((x, i) => x + ' = $' + (i + 2)).join(', ');
    await q(`UPDATE semais SET ${set}, kurva_diubah_pada = now(), updated_at = now() WHERE id_semai = $1`,
      [req.params.id, ...kunci.map((x) => k[x])]);
    req.audit = { aksi: 'update', tabel: 'semais', row_id: String(req.params.id), before: { kurva: sebelum }, after: { kurva: k } };
    sinkronDiam(); // target penampung + TARGET ke alat bila sedang SEMAI
    res.json({
      status: true, peringatan: r.peringatan, target_hari_ini: r.target_hari_ini, kurva: k,
      message: r.target_hari_ini != null
        ? `Kurva diubah. Target tetap ${r.target_hari_ini} ppm hari ini, lalu menuju ${k.kurva_ppm_target} ppm pada hari ke-${k.kurva_hari_capai}.`
        : 'Kurva diubah.',
    });
  } catch (e) { next(e); }
});

/**
 * Kesiapan sebelum Mulai Semai: (1) alat siap = kalibrasi; (2) siap semai = alat ada di meja + volume penampung, waktu monitoring,
 * jeda A-B, uji lab sesuai kategori tanaman, laju pompa. Hanya informasi: Mulai Semai tetap boleh, alat memakai nilai tersimpannya.
 */
router.get('/siap-semai', async (req, res, next) => {
  try {
    const angkaId = (v) => (/^\d{1,18}$/.test(String(v ?? '')) ? String(v) : null);
    const idMeja = angkaId(req.query.id_meja);
    const idTanaman = angkaId(req.query.id_tanaman);
    const kat = idTanaman ? (await one('SELECT kategori FROM tanamen WHERE id_tanaman = $1', [idTanaman]))?.kategori : null;
    const kategori = kat === 'buah' ? 'buah' : 'sayur';
    if (!idMeja) return res.json({ status: true, kategori, alat: null, semai: { siap: false, kurang: ['pilih meja'] } });
    const alat = await S.alatMeja(idMeja);
    const { keadaanAlat: a, iotStatus } = await bacaKeadaanAlat(null);
    const { kurang } = await parameterKonfigurasi(idMeja, kategori);
    res.json({
      status: true, kategori,
      alat: alat ? { kode: alat.kode, nama: alat.nama, online: !!iotStatus.online, siap: a.siap, kurang: a.kurang } : null,
      semai: { siap: Boolean(alat) && kurang.length === 0, kurang: alat ? kurang : [], catatan_saja: !alat },
    });
  } catch (e) { next(e); }
});

/** Minta alat menjaga batch yang berjalan (SEMAI / TARGET) — dipakai bila kiriman saat mulai semai ditolak alat. */
router.post('/kirim-alat', demoGuard('tanam.kirim-alat'), async (req, res, next) => {
  try {
    // meja batch berjalan terbaru (atau ?id_meja=) — alat di meja itu diberi KONFIGURASI lalu SEMAI
    const idMeja = /^\d{1,18}$/.test(String(req.query.id_meja ?? '')) ? req.query.id_meja : await S.mejaBatchTerbaru();
    if (!idMeja) return res.json({ status: true, alat: { dikirim: false, ket: 'Tidak ada batch berjalan di meja yang punya alat.' }, message: 'Tidak ada batch berjalan di meja yang punya alat.' });
    await sinkronTarget();
    const alat = await S.mulaiSemaiAlat(idMeja, Number(req.user.sub) || null);
    res.status(alat.dikirim ? 202 : 200).json({ status: true, alat, message: alat.ket });
  } catch (e) { next(e); }
});

// Hapus batch semai (konfirmasi di client)
router.post('/:id/hapus', async (req, res, next) => {
  try {
    // Urutan TETAP seperti sebelumnya: cek demo dulu (403), baru validasi id
    // (404 identik — V2), baru query. Supaya status lama tidak berubah.
    if (req.user.demo) {
      return json(res, 403, { message: 'Mode demo tidak boleh menghapus data.' });
    }
    if (!idValid(req)) return notFound(res);
    if (await one('SELECT 1 AS x FROM peremajaans WHERE id_semai = $1 LIMIT 1', [req.params.id])) {
      return json(res, 409, { message: 'Tidak bisa menghapus semai: batch ini sudah berlanjut ke peremajaan. Hapus data tahap berikutnya dulu.', errors: {} });
    }
    const row = await one('DELETE FROM semais WHERE id_semai = $1 RETURNING *', [req.params.id]);
    if (!row) return notFound(res);
    // batch terakhir di meja itu hilang: alat yang masih SEMAI diberi PANEN agar berhenti mendosis/mengisi sendiri
    if (row.id_meja != null) S.diam(S.panenBilaKosong, row.id_meja, Number(req.user.sub) || null);
    res.json({ status: true, message: 'Data dihapus.' });
  } catch (e) { next(e); }
});

module.exports = router;
