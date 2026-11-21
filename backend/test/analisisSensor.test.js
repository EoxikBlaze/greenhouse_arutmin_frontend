'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('../src/analisisSensor');

const MENIT = 60_000;
const JAM = 3_600_000;
const T0 = new Date(2026, 10, 21, 0, 0, 0).getTime();
const deret = (n, f, langkah = 5 * MENIT) => Array.from({ length: n }, (_, i) => ({ t: T0 + i * langkah, v: f(i) }));

test('statistik dan persenDalam', () => {
  const s = A.statistik([2, 4, 4, 4, 5, 5, 7, 9]);
  assert.equal(s.n, 8);
  assert.equal(s.rata, 5);
  assert.equal(s.sd, 2);
  assert.equal(A.statistik([]), null);
  assert.equal(A.persenDalam([1, 2, 3, 4], 2, 3), 50);
  assert.equal(A.persenDalam([1, 2, 3], 5, 5), null, 'batas sama = belum diatur');
  assert.equal(A.persenDalam([], 1, 2), null);
});

test('VPD: 25 °C dan 50% RH ≈ 1,58 kPa; di luar rentang masuk akal → null', () => {
  assert.ok(Math.abs(A.vpdKpa(25, 50) - 1.584) < 0.01);
  assert.equal(A.vpdKpa(25, 100), 0);
  assert.equal(A.vpdKpa(25, 120), null);
  assert.equal(A.vpdKpa('x', 50), null);
  assert.equal(A.nilaiVpd(0.2), 'terlalu_lembap');
  assert.equal(A.nilaiVpd(0.8), 'baik');
  assert.equal(A.nilaiVpd(1.58), 'terlalu_kering');
});

test('kestabilan: persen dalam batas keseluruhan dan per hari', () => {
  // 288 titik hari pertama di 6.0 (aman 5–7), 288 titik hari kedua di 7.5 (di luar)
  const seri = [...deret(288, () => 6.0), ...deret(288, () => 7.5).map((p) => ({ t: p.t + 24 * JAM, v: p.v }))];
  const k = A.kestabilan(seri, { min: 5, max: 7 });
  assert.equal(k.n, 576);
  assert.equal(k.dalam_batas_persen, 50);
  assert.equal(k.per_hari.length, 2);
  assert.equal(k.per_hari[0].dalam_batas_persen, 100);
  assert.equal(k.per_hari[1].dalam_batas_persen, 0);
  assert.equal(A.kestabilan(seri, null).dalam_batas_persen, null);
  assert.equal(A.kestabilan([], { min: 5, max: 7 }).n, 0);
});

test('respons dosing: ppm naik 100 setelah suntikan; dosing berdekatan ditandai tidak bersih', () => {
  const ppm = deret(100, (i) => (i < 20 ? 400 : 500));          // naik di titik ke-20 (menit ke-100)
  const kejadian = [{ t: T0 + 100 * MENIT, jenis: 'AB' }];
  const r = A.responsDosing(ppm, kejadian);
  assert.equal(r.kejadian.length, 1);
  assert.equal(r.kejadian[0].naik, 100);
  assert.equal(r.kejadian[0].bersih, true);
  assert.equal(r.median_naik, 100);
  // dosing AB kedua 20 menit sesudahnya → keduanya tidak bersih
  const dua = A.responsDosing(ppm, [...kejadian, { t: T0 + 120 * MENIT, jenis: 'AB' }]);
  assert.equal(dua.kejadian.every((h) => h.bersih === false), true);
  // koreksi pH di dekatnya tidak mengganggu kebersihan
  const ph = A.responsDosing(ppm, [...kejadian, { t: T0 + 110 * MENIT, jenis: 'PH' }]);
  assert.equal(ph.kejadian[0].bersih, true);
});

test('respons dosing: yang naiknya < 30% median ditandai rendah', () => {
  const ppm = [];
  const kejadian = [];
  // 4 dosing normal (+100) dan satu dosing lemah (+10), tiap 6 jam
  [100, 100, 100, 100, 10].forEach((naik, i) => {
    const t = T0 + i * 6 * JAM;
    for (let m = -30; m <= 60; m += 5) ppm.push({ t: t + m * MENIT, v: 400 + (m >= 0 ? naik : 0) });
    kejadian.push({ t, jenis: 'AB' });
  });
  const r = A.responsDosing(ppm, kejadian);
  assert.equal(r.median_naik, 100);
  assert.deepEqual(r.rendah, [T0 + 4 * 6 * JAM]);
});

test('konsumsi nutrisi: ppm turun 2/jam tanpa dosing → 48 ppm/hari; dosing memotong rentang', () => {
  const ppm = deret(12 * 12, (i) => 800 - (i / 12) * 2);           // 12 jam, turun 2 ppm tiap jam
  const k = A.konsumsiNutrisi(ppm, []);
  assert.ok(Math.abs(k.ppm_turun_per_hari - 48) < 0.5);
  assert.equal(k.segmen.length, 1);
  // dosing AB di jam ke-6 memotong menjadi dua rentang (masing-masing ≥ 3 jam)
  const potong = A.konsumsiNutrisi(ppm, [{ t: T0 + 6 * JAM, jenis: 'AB' }]);
  assert.equal(potong.segmen.length, 2);
  // terlalu pendek → tidak dihitung
  assert.equal(A.konsumsiNutrisi(deret(10, () => 500), []).ppm_turun_per_hari, null);
});

test('pola harian: rata-rata per jam dan VPD', () => {
  const titik = [];
  for (let i = 0; i < 24 * 12; i += 1) {
    const t = T0 + i * 5 * MENIT;
    const jam = new Date(t).getHours();
    titik.push({ t, suhu: jam < 12 ? 24 : 32, rh: jam < 12 ? 80 : 50 });
  }
  const p = A.polaHarian(titik);
  assert.equal(p.sel.length, 24);
  assert.equal(p.per_jam[3].suhu, 24);
  assert.equal(p.per_jam[15].suhu, 32);
  assert.ok(p.per_jam[15].vpd > p.per_jam[3].vpd, 'siang lebih kering dari pagi');
});

test('respons dosing: jendela sebelum/sesudah yang terpotong (data kurang) dilewati', () => {
  // suntikan tepat di awal data: hanya 1 titik sebelum → tidak dinilai (dulu menghasilkan kenaikan palsu)
  const ppm = deret(40, (i) => (i < 1 ? 800 : 700));
  const r = A.responsDosing(ppm, [{ t: T0 + 5 * MENIT, jenis: 'AB' }]);
  assert.equal(r.kejadian.length, 0);
});
