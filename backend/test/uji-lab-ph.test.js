'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { phMlPer100L, LANGKAH_PH } = require('../src/konfigurasiAlat');

test('takaran pH ke firmware: mL per pH per L × 100 L × langkah pH, ambil yang lebih kecil', () => {
  assert.equal(LANGKAH_PH, 0.3);
  assert.equal(phMlPer100L(0.05, 0.1), 1.5);   // 0,05 × 100 × 0,3
  assert.equal(phMlPer100L(0.2, null), 6);
  assert.equal(phMlPer100L(null, undefined), null);
  assert.equal(phMlPer100L(0, -1), null);
});

test('uji lab EC web (per mL total A+B) dikonversi ke per pasang A+B sebelum dikirim ke firmware', () => {
  const { ppmPerPasangAb } = require('../src/konfigurasiAlat');
  const { hitungUjiLabEc } = require('../src/iotV41');
  const ec = hitungUjiLabEc({ awal: 100, akhir: 1000, volume: 1, ml_a: 5, ml_b: 5 }); // 90 ppm per mL total
  assert.equal(ppmPerPasangAb(ec.ppm_per_ml), 180); // 1 mL A + 1 mL B per liter = +180 ppm
  // firmware: mL A = target ppm × volume ÷ nilai ini; 100 ppm di 10 L → 5,56 mL A + 5,56 mL B = total 11,1 mL = 100×10÷90
  const mlA = (100 * 10) / ppmPerPasangAb(ec.ppm_per_ml);
  assert.ok(Math.abs(mlA * 2 - (100 * 10) / ec.ppm_per_ml) < 0.01);
});
