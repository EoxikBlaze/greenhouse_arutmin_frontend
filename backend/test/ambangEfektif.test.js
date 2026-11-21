'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { ambangEfektif } = require('../src/ambangEfektif');

const TABEL = { ph: { min: 5, max: 7 }, tds: { min: 50, max: 1000 }, waterTemp: { min: 5, max: 40 } };

test('saat SEMAI, pH dan ppm mengikuti target batch; sensor lain tetap dari Ambang Sensor', () => {
  const a = ambangEfektif(TABEL, { mode: 'SEMAI', ph_min: 5.5, ph_max: 6.5, target_ppm: 400 });
  assert.deepEqual([a.ph.min, a.ph.max], [5.5, 6.5]);
  assert.deepEqual([a.tds.min, a.tds.max], [350, 500]);
  assert.deepEqual(a.waterTemp, TABEL.waterTemp);
});

test('di luar SEMAI atau target belum ada, memakai tabel Ambang Sensor apa adanya', () => {
  assert.deepEqual(ambangEfektif(TABEL, { mode: 'PANEN', ph_min: 5.5, ph_max: 6.5, target_ppm: 400 }), TABEL);
  assert.deepEqual(ambangEfektif(TABEL, null), TABEL);
  const sebagian = ambangEfektif(TABEL, { mode: 'SEMAI', ph_min: null, ph_max: null, target_ppm: 400 });
  assert.deepEqual(sebagian.ph, TABEL.ph);
  assert.equal(sebagian.tds.max, 500);
  assert.deepEqual(ambangEfektif(null, null), {});
});

test('tabel asli tidak berubah (tidak ada efek samping)', () => {
  const salinan = JSON.parse(JSON.stringify(TABEL));
  ambangEfektif(TABEL, { mode: 'SEMAI', ph_min: 5.5, ph_max: 6.5, target_ppm: 400 });
  assert.deepEqual(TABEL, salinan);
});
