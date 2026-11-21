'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../src/statistikIlmiah');

const dekat = (a, b, toleransi, pesan) => assert.ok(Math.abs(a - b) <= toleransi, `${pesan ?? ''} diharapkan ${b} ± ${toleransi}, dapat ${a}`);

test('kuantil tipe 7 dan ringkasan sebaran (nilai acuan R: quantile(1:10, c(.25,.5,.75)) = 3.25, 5.5, 7.75)', () => {
  const x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  dekat(S.kuantil(x, 0.25), 3.25, 1e-12);
  dekat(S.median(x), 5.5, 1e-12);
  dekat(S.kuantil(x, 0.75), 7.75, 1e-12);
  const r = S.ringkasSebaran(x);
  assert.equal(r.n, 10);
  dekat(r.iqr, 4.5, 1e-12);
  assert.equal(S.ringkasSebaran([]), null);
  assert.ok(Number.isNaN(S.median([])));
});

test('distribusi t Student: nilai tabel baku', () => {
  dekat(S.kuantilT(0.975, 10), 2.2281, 1e-3, 't(0,975; 10)');
  dekat(S.kuantilT(0.975, 30), 2.0423, 1e-3, 't(0,975; 30)');
  dekat(S.kuantilT(0.975, 2), 4.3027, 1e-3, 't(0,975; 2)');
  dekat(S.pDuaSisiT(2.0, 10), 0.0734, 1e-3, 'p dua sisi t=2, df=10');
  dekat(S.cdfT(0, 5), 0.5, 1e-9);
  dekat(S.cdfNormal(1.96), 0.975, 1e-3);
});

test('ciRata: selang 95% rata-rata (acuan: x = 1..10 → 5,5 ± 2,306 · 3,0277/√10 = [3,334; 7,666])', () => {
  const c = S.ciRata([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  dekat(c.rata, 5.5, 1e-12);
  dekat(c.bawah, 3.334, 5e-3);
  dekat(c.atas, 7.666, 5e-3);
  assert.equal(S.ciRata([1]), null);
});

test('ciMedian: butuh minimal 6 titik; selang memuat median', () => {
  assert.equal(S.ciMedian([1, 2, 3, 4, 5]), null);
  const x = Array.from({ length: 30 }, (_, i) => i + 1);
  const c = S.ciMedian(x);
  assert.ok(c.bawah <= 15.5 && c.atas >= 15.5);
  assert.ok(c.atas - c.bawah < 15, 'selang tidak boleh selebar seluruh data');
});

test('Spearman: monoton → rho 1; contoh buku (rho = −0,1758, p ≈ 0,627)', () => {
  const m = S.spearman([1, 2, 3, 4, 5, 6], [2, 4, 6, 8, 10, 12]);
  dekat(m.rho, 1, 1e-12);
  assert.equal(m.p, 0);
  const x = [106, 86, 100, 101, 99, 103, 97, 113, 112, 110];
  const y = [7, 0, 27, 50, 28, 29, 20, 12, 6, 17];
  const r = S.spearman(x, y);
  dekat(r.rho, -0.1757576, 1e-6);
  dekat(r.p, 0.627, 0.06, 'p-value dengan n efektif ≤ n');
  assert.equal(S.spearman([1, 2, 3], [1, 2, 3]), null, 'terlalu sedikit');
  assert.equal(S.spearman([1, 1, 1, 1, 1], [1, 2, 3, 4, 5]), null, 'konstan');
});

test('n efektif: autokorelasi tinggi mengecilkan ukuran sampel', () => {
  assert.equal(S.nEfektif(100, 0, 0), 100);
  assert.ok(S.nEfektif(100, 0.9, 0.9) < 15);
  assert.ok(S.nEfektif(100, 0.9, 0.9) >= 3);
  // deret acak ≈ tak berautokorelasi; deret halus ≈ 1
  const halus = Array.from({ length: 200 }, (_, i) => Math.sin(i / 20));
  assert.ok(S.autokorelasi1(halus) > 0.95);
});

test('Wilcoxon berpasangan: data Hollander & Wolfe (V = 40, p eksak = 0,03906)', () => {
  const x = [1.83, 0.50, 1.62, 2.48, 1.68, 1.88, 1.55, 3.06, 1.30];
  const y = [0.878, 0.647, 0.598, 2.05, 1.06, 1.29, 1.06, 3.14, 1.29];
  const w = S.wilcoxonBerpasangan(x, y);
  assert.equal(w.n, 9);
  assert.equal(w.w_plus, 40);
  assert.equal(w.metode, 'eksak');
  dekat(w.p, 0.03906, 1e-5);
  // tanpa perbedaan → p = 1; terlalu sedikit → null
  assert.equal(S.wilcoxonBerpasangan([1, 2, 3, 4], [1, 2, 3, 4]), null);
  const sama = S.wilcoxonBerpasangan([1, 2, 3, 4, 5, 6], [2, 1, 4, 3, 6, 5]);
  assert.ok(sama.p > 0.5, 'selisih bolak-balik tidak signifikan');
});

test('Wilcoxon: sampel besar memakai hampiran normal dan mendeteksi pergeseran jelas', () => {
  const a = Array.from({ length: 40 }, (_, i) => 10 + (i % 7) * 0.1);
  const b = a.map((v, i) => v + 1 + (i % 5) * 0.01);
  const w = S.wilcoxonBerpasangan(a, b);
  assert.equal(w.metode, 'hampiran normal');
  assert.ok(w.p < 0.001);
  dekat(w.selisih_median, -1.02, 0.05);
});

test('Theil–Sen dan Mann–Kendall', () => {
  dekat(S.theilSen([0, 1, 2, 3, 4], [1, 3, 5, 7, 9]), 2, 1e-12);
  dekat(S.theilSen([0, 1, 2, 3, 4, 5], [1, 3, 5, 7, 9, 100]), 2, 1e-12); // kokoh terhadap pencilan
  const naik = S.mannKendall([1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(naik.tau, 1);
  assert.ok(naik.p < 0.01);
  const datar = S.mannKendall([5, 6, 5, 6, 5, 6, 5, 6]);
  assert.ok(datar.p > 0.3);
  assert.equal(S.mannKendall([1, 2, 3]), null);
  const k = S.kecenderungan([0, 1, 2, 3, 4, 5].map((h) => ({ hari: h, nilai: 6 + 0.1 * h })));
  dekat(k.kemiringan_per_hari, 0.1, 1e-9);
  assert.ok(k.p < 0.05);
});

test('deteksi lonjakan: satu loncatan besar pada deret tenang ditandai', () => {
  const tenang = Array.from({ length: 100 }, (_, i) => 6.5 + 0.01 * Math.sin(i));
  assert.equal(S.deteksiLonjakan(tenang).lonjakan, 0);
  const dengan = [...tenang];
  dengan[50] = 9.5;
  const d = S.deteksiLonjakan(dengan);
  assert.ok(d.lonjakan >= 1 && d.lonjakan <= 2, `lonjakan=${d.lonjakan}`);
  assert.equal(S.deteksiLonjakan([1, 2, 3]).lonjakan, 0);
});
