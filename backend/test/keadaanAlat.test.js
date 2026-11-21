'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { siapAlat } = require('../src/keadaanAlat');

test('tanda siap alat: hanya kalibrasi/sensor/laju pompa; uji lab bukan kekurangan alat', () => {
  assert.deepEqual(siapAlat(true, null), { siap: true, kurang: null });
  // firmware menyebut 'uji lab' (data yang dikirim web saat Mulai Semai) → alat tetap dianggap siap
  assert.deepEqual(siapAlat(false, 'uji lab'), { siap: true, kurang: null });
  // kalibrasi / sensor / laju pompa belum → belum siap, kekurangan dipertahankan
  assert.deepEqual(siapAlat(false, 'kal pH'), { siap: false, kurang: 'kal pH' });
  assert.deepEqual(siapAlat(false, 'kal EC'), { siap: false, kurang: 'kal EC' });
  assert.deepEqual(siapAlat(false, 'laju A'), { siap: false, kurang: 'laju A' });
  assert.deepEqual(siapAlat(false, 'ADS1115'), { siap: false, kurang: 'ADS1115' });
  // alat belum pernah melapor
  assert.deepEqual(siapAlat(null, null), { siap: null, kurang: null });
});
