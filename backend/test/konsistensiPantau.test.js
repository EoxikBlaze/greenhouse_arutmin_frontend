'use strict';
/**
 * Dashboard/Sensor (warna kartu dan grafik, dari ambangEfektif) dan Peringatan (kondisiSekarang) harus memakai batas yang sama
 * untuk batch yang dijaga alat, termasuk saat toleransi diubah dari Pengaturan Alat.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { ambangEfektif } = require('../src/ambangEfektif');
const { kondisiSekarang } = require('../src/peringatan');

const TABEL = { ph: { min: 5, max: 7 }, tds: { min: 50, max: 1000 } };
const keadaan = (a) => ({ mode: 'SEMAI', siap: true, ...a });
const peringatan = (alat, sensor, pengaturan) => kondisiSekarang({
  online: true, dataSegar: true, estopServer: false, alat, sensor, ambang: TABEL, kalibrasi: [], otaGagal: null, pengaturan,
}).map((k) => k.kunci);

for (const [target, pengaturan] of [[400, undefined], [400, { toleransi_bawah_ppm: 30, toleransi_atas_ppm: 60 }], [1200, { toleransi_bawah_ppm: 100, toleransi_atas_ppm: 200 }]]) {
  test(`ppm: batas dashboard = batas peringatan (target ${target}, ${pengaturan ? 'toleransi diubah' : 'bawaan'})`, () => {
    const alat = keadaan({ target_ppm: target, ph_min: 5.5, ph_max: 6.5 });
    const { min, max } = ambangEfektif(TABEL, alat, pengaturan).tds;
    assert.ok(!peringatan(alat, { tds: min, ph: 6 }, pengaturan).includes('sensor_tds'), 'tepat di batas bawah = normal');
    assert.ok(!peringatan(alat, { tds: max, ph: 6 }, pengaturan).includes('sensor_tds'), 'tepat di batas atas = normal');
    assert.ok(peringatan(alat, { tds: min - 1, ph: 6 }, pengaturan).includes('sensor_tds'), 'di bawah batas = peringatan');
    assert.ok(peringatan(alat, { tds: max + 1, ph: 6 }, pengaturan).includes('sensor_tds'), 'di atas batas = peringatan');
  });
}

test('pH: batas dashboard = rentang batch = batas peringatan', () => {
  const alat = keadaan({ target_ppm: 400, ph_min: 5.5, ph_max: 6.5 });
  const { min, max } = ambangEfektif(TABEL, alat).ph;
  assert.deepEqual([min, max], [5.5, 6.5]);
  assert.ok(!peringatan(alat, { tds: 400, ph: 6.5 }).includes('sensor_ph'));
  assert.ok(peringatan(alat, { tds: 400, ph: 6.6 }).includes('sensor_ph'));
  assert.ok(peringatan(alat, { tds: 400, ph: 5.4 }).includes('sensor_ph'));
});

test('di luar SEMAI keduanya memakai Ambang Sensor yang sama', () => {
  const alat = keadaan({ mode: 'PANEN', target_ppm: 400, ph_min: 5.5, ph_max: 6.5 });
  assert.deepEqual(ambangEfektif(TABEL, alat).tds, TABEL.tds);
  assert.ok(!peringatan(alat, { tds: 900, ph: 6 }).includes('sensor_tds'), '900 di dalam 50-1000');
  assert.ok(peringatan(alat, { tds: 1100, ph: 6 }).includes('sensor_tds'));
});
