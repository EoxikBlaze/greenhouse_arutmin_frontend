'use strict';
/**
 * Update program alat lewat WiFi (OTA jarak jauh, firmware v6.2+) dan konsol jarak jauh.
 *
 *  Admin (JWT, bukan demo)   mount /api/firmware
 *    GET  /                  daftar berkas .bin + SHA-256
 *    POST /unggah?nama=X.bin badan mentah (application/octet-stream) → simpan + hitung SHA-256
 *    POST /pasang {nama}     kirim perintah OTA ke alat (wajib pemeliharaan) — alat mengunduh lalu mencocokkan SHA-256
 *    POST /konsol {baris}    kirim satu baris perintah Serial ke alat; hasil teks ada di perintah.hasil.keluaran
 *    DELETE /:nama           hapus berkas
 *  Alat (X-API-KEY aktuator:perintah)  GET /api/device/v1/firmware/:nama   (dipasang di device.js)
 *
 * Berkas disimpan di backend/firmware/ (di luar git). Alat hanya boleh mengunduh berkas di folder ini.
 */
const express = require('express');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { requireAuth, json } = require('../auth');
const A = require('../aktuator');
const { bacaKeadaanAlat } = require('../keadaanAlat');

const DIR = path.join(__dirname, '..', '..', 'firmware');
const POLA_NAMA = /^[A-Za-z0-9][A-Za-z0-9._-]{1,58}\.bin$/;
// Partisi aplikasi "Minimal SPIFFS" = 1.966.080 byte; di bawah 100 KB pasti bukan program ESP32 utuh.
const UKURAN_MIN = 100 * 1024;
const UKURAN_MAKS = 1_966_080;
const JALUR_UNDUH = '/api/device/v1/firmware/';

const router = express.Router();

const adminSungguhan = (req, res, next) => (req.user?.level === 'admin' && !req.user.demo
  ? next() : json(res, 403, { message: 'Hanya admin yang boleh melakukan ini.' }));
const galat = (res, e) => (e instanceof A.PerintahDitolak
  ? json(res, e.status, { message: e.message, ...(e.errors ? { errors: e.errors } : {}) })
  : null);

const namaSah = (n) => typeof n === 'string' && POLA_NAMA.test(n) && !n.includes('..');
const lokasi = (nama) => path.join(DIR, nama);
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

async function infoBerkas(nama) {
  const st = await fsp.stat(lokasi(nama));
  return { nama, ukuran: st.size, diunggah: st.mtime.toISOString(), sha256: sha256(await fsp.readFile(lokasi(nama))) };
}

/** Dipakai device.js: kirim berkas ke alat. Tanpa Content-Length alat menolak (ota_ukuran_tidak_diketahui). */
function kirimKeAlat(req, res, next) {
  const nama = req.params.nama;
  if (!namaSah(nama)) return res.status(404).json({ status: false, message: 'Berkas tidak ditemukan.' });
  res.sendFile(lokasi(nama), { headers: { 'Content-Type': 'application/octet-stream', 'Cache-Control': 'no-store' }, dotfiles: 'deny' },
    (e) => { if (e) { if (e.code === 'ENOENT') res.status(404).json({ status: false, message: 'Berkas tidak ditemukan.' }); else next(e); } });
}

router.use(requireAuth, adminSungguhan);

router.get('/', async (_req, res, next) => {
  try {
    await fsp.mkdir(DIR, { recursive: true });
    const nama = (await fsp.readdir(DIR)).filter(namaSah);
    const data = await Promise.all(nama.map(infoBerkas));
    data.sort((a, b) => b.diunggah.localeCompare(a.diunggah));
    res.json({ data });
  } catch (e) { next(e); }
});

router.post('/unggah', express.raw({ type: 'application/octet-stream', limit: '2100kb' }), async (req, res, next) => {
  try {
    const nama = String(req.query.nama || '');
    if (!namaSah(nama)) return json(res, 422, { message: 'Nama berkas tidak sah (huruf/angka/._- dan berakhiran .bin, maks 60 karakter).' });
    const buf = req.body;
    if (!Buffer.isBuffer(buf) || buf.length < UKURAN_MIN || buf.length > UKURAN_MAKS) {
      return json(res, 422, { message: `Ukuran berkas harus ${UKURAN_MIN}–${UKURAN_MAKS} byte (kirim sebagai application/octet-stream).` });
    }
    if (buf[0] !== 0xE9) return json(res, 422, { message: 'Bukan berkas program ESP32 (byte pertama harus 0xE9). Pakai hasil "Export Compiled Binary" tanpa bootloader.' });
    await fsp.mkdir(DIR, { recursive: true });
    const tmp = `${lokasi(nama)}.tmp-${process.pid}`;
    await fsp.writeFile(tmp, buf);
    await fsp.rename(tmp, lokasi(nama));
    res.status(201).json({ status: true, berkas: { nama, ukuran: buf.length, sha256: sha256(buf) } });
  } catch (e) { next(e); }
});

router.post('/pasang', async (req, res, next) => {
  try {
    const nama = String(req.body?.nama || '');
    if (!namaSah(nama) || !fs.existsSync(lokasi(nama))) return json(res, 404, { message: 'Berkas tidak ditemukan. Unggah dulu.' });
    const { keadaanAlat } = await bacaKeadaanAlat(null);
    if (keadaanAlat.pemeliharaan !== true) {
      return json(res, 409, { kode: 'bukan_pemeliharaan', message: 'Aktifkan mode pemeliharaan dulu. Selama update semua pompa mati.' });
    }
    const info = await infoBerkas(nama);
    const p = await A.buatPerintah({
      tipe: 'OTA', parameter: { path: JALUR_UNDUH + nama, sha256: info.sha256 },
      sumber: 'pengguna', userId: Number(req.user.sub) || null, alasan: `Update program ${nama}`.slice(0, 200), ttlDetik: 600,
    });
    res.status(202).json({ status: true, id_perintah: p.id, berkas: info, message: 'Perintah update dikirim; alat mengunduh lalu memasang. Jangan cabut listrik.' });
  } catch (e) { return galat(res, e) || next(e); }
});

router.post('/konsol', async (req, res, next) => {
  try {
    const p = await A.buatPerintah({
      tipe: 'KONSOL', parameter: { baris: req.body?.baris },
      sumber: 'pengguna', userId: Number(req.user.sub) || null, alasan: 'Konsol jarak jauh', ttlDetik: 60,
    });
    res.status(202).json({ status: true, id_perintah: p.id, message: 'Perintah dikirim; hasil ada di daftar perintah (hasil.keluaran).' });
  } catch (e) { return galat(res, e) || next(e); }
});

router.delete('/:nama', async (req, res, next) => {
  try {
    if (!namaSah(req.params.nama)) return json(res, 404, { message: 'Berkas tidak ditemukan.' });
    await fsp.unlink(lokasi(req.params.nama)).catch((e) => { if (e.code !== 'ENOENT') throw e; });
    res.json({ status: true });
  } catch (e) { next(e); }
});

module.exports = { router, kirimKeAlat, namaSah };
