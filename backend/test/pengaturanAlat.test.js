'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { DEF, DEFAULT, validasi } = require('../src/pengaturanAlat');
const { kondisiSekarang } = require('../src/peringatan');
const { validasiPerintah } = require('../src/aktuator');

test('rentang dan bawaan sama dengan tabel parameter firmware (Parameter.cpp)', () => {
  const sumber = path.join('C:/laragon/www/fw_hidro/hidroponik_firmware_v6_4/HidroponikV6/Parameter.cpp');
  if (!fs.existsSync(sumber)) return; // firmware tidak ada di mesin ini
  const teks = fs.readFileSync(sumber, 'utf8');
  for (const d of DEF) {
    const m = teks.match(new RegExp(`\\{\\s*"${d.param}",\\s*OFS\\(\\w+\\),\\s*(-?[\\d.]+)f,\\s*(-?[\\d.]+)f,\\s*(-?[\\d.]+)f`));
    assert.ok(m, `parameter ${d.param} tidak ada di firmware`);
    assert.deepEqual([d.min, d.max, d.bawaan], [Number(m[1]), Number(m[2]), Number(m[3])], `rentang/bawaan ${d.param} berbeda dari firmware`);
  }
});

test('validasi: nilai sah diterima, di luar rentang firmware ditolak (tidak dijepit)', () => {
  assert.deepEqual(validasi({ persen_dosis: 70, maks_ab_hari: '8' }).nilai, { persen_dosis: 70, maks_ab_hari: 8 });
  assert.ok(validasi({ persen_dosis: 20 }).errors.persen_dosis);
  assert.ok(validasi({ persen_dosis: 120 }).errors.persen_dosis);
  assert.ok(validasi({ maks_ab_hari: 6.5 }).errors.maks_ab_hari); // harus bulat
  assert.ok(validasi({ ph_toleransi: 'abc' }).errors.ph_toleransi);
  assert.ok(validasi({ tidak_ada: 1 }).errors.tidak_ada);
  assert.ok(validasi({}).errors.pengaturan);
  assert.deepEqual(validasi({ ph_toleransi: '0,3' }).nilai, { ph_toleransi: 0.3 });
});

test('semua parameter lolos validasi perintah KONFIGURASI server dengan nilai bawaan', () => {
  const out = validasiPerintah('KONFIGURASI', DEFAULT, {});
  for (const k of Object.keys(DEFAULT)) assert.equal(out[k], DEFAULT[k], `${k} tidak diteruskan ke alat`);
});

const alat = (o) => ({ online: true, dataSegar: true, estopServer: false, sensor: { tds: 470, ph: 6 }, ambang: {}, kalibrasi: [], otaGagal: null,
  alat: { mode: 'SEMAI', target_ppm: 400, ph_min: 5.5, ph_max: 6.5, siap: true, ...o.alat }, ...o.s });

test('peringatan memakai toleransi dari Pengaturan Alat, bukan angka tetap', () => {
  // 470 ppm, target 400: bawaan (+100) = normal; toleransi atas 50 = peringatan
  const normal = kondisiSekarang(alat({}));
  assert.ok(!normal.some((k) => k.kunci === 'sensor_tds'));
  const ketat = kondisiSekarang(alat({ s: { pengaturan: { toleransi_bawah_ppm: 50, toleransi_atas_ppm: 50 } } }));
  assert.ok(ketat.some((k) => k.kunci === 'sensor_tds'));
});

test('peringatan batas harian memakai Pengaturan Alat', () => {
  const k1 = kondisiSekarang(alat({ alat: { dosing_ab_hari: 6 } }));
  assert.ok(k1.some((k) => k.kunci === 'batas_dosing_ab_hari'), 'bawaan 6: penuh');
  const k2 = kondisiSekarang(alat({ alat: { dosing_ab_hari: 6 }, s: { pengaturan: { maks_ab_hari: 10 } } }));
  assert.ok(!k2.some((k) => k.kunci === 'batas_dosing_ab_hari'), 'batas 10: belum penuh');
});
