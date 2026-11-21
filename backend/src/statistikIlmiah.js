'use strict';
/**
 * STATISTIK ILMIAH — fungsi murni tanpa dependensi, untuk menu Analisis. Metode dipilih yang TIDAK mengandalkan sebaran normal
 * (data sensor jarang normal) dan memperhitungkan bahwa deret waktu berautokorelasi (titik berdekatan tidak independen).
 *
 *   kuantil / median / IQR            interpolasi linear (tipe 7, seperti R dan NumPy)
 *   ciMedian                          selang kepercayaan median tanpa asumsi sebaran (urutan peringkat, hampiran normal)
 *   ciRata                            selang kepercayaan rata-rata (distribusi t Student)
 *   spearman + nEfektif               korelasi peringkat; ukuran sampel efektif memperhitungkan autokorelasi lag-1
 *   wilcoxonBerpasangan               uji peringkat bertanda: eksak (n ≤ 25 tanpa nilai kembar), selain itu hampiran normal
 *   mannKendall + theilSen            uji kecenderungan monoton dan kemiringan yang kokoh terhadap pencilan
 *   deteksiLonjakan                   lonjakan beda-pertama dengan skala kokoh (MAD)
 */

const sah = (v) => typeof v === 'number' && Number.isFinite(v);
const bersih = (a) => (a || []).map(Number).filter(sah);

/** Kuantil p (0–1) dengan interpolasi linear (tipe 7). NaN bila kosong. */
function kuantil(nilai, p) {
  const x = bersih(nilai).sort((a, b) => a - b);
  if (!x.length) return NaN;
  const h = (x.length - 1) * p;
  const lo = Math.floor(h);
  const hi = Math.ceil(h);
  return x[lo] + (h - lo) * (x[hi] - x[lo]);
}
const median = (n) => kuantil(n, 0.5);

/** Ringkasan sebaran: n, median, Q1, Q3, IQR, min, maks. null bila kosong. */
function ringkasSebaran(nilai) {
  const x = bersih(nilai);
  if (!x.length) return null;
  const q1 = kuantil(x, 0.25);
  const q3 = kuantil(x, 0.75);
  return { n: x.length, median: median(x), q1, q3, iqr: q3 - q1, min: Math.min(...x), maks: Math.max(...x) };
}

/* ── distribusi t Student ─────────────────────────────────────────── */
function lnGamma(x) {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x;
  let t = x + 5.5;
  t -= (x + 0.5) * Math.log(t);
  let s = 1.000000000190015;
  for (const k of c) { y += 1; s += k / y; }
  return -t + Math.log((2.5066282746310005 * s) / x);
}
function betaCf(a, b, x) {
  const TINY = 1e-30;
  let qab = a + b; let qap = a + 1; let qam = a - 1;
  let c = 1; let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < TINY) d = TINY;
  d = 1 / d; let h = d;
  for (let m = 1; m <= 200; m += 1) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < TINY) d = TINY;
    c = 1 + aa / c; if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d; h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < TINY) d = TINY;
    c = 1 + aa / c; if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    const del = d * c; h *= del;
    if (Math.abs(del - 1) < 3e-12) break;
  }
  return h;
}
/** Beta tak-lengkap terregularisasi I_x(a, b). */
function betaI(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(lnGamma(a + b) - lnGamma(a) - lnGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? (bt * betaCf(a, b, x)) / a : 1 - (bt * betaCf(b, a, 1 - x)) / b;
}
/** P(T ≤ t) untuk t Student dengan df derajat bebas. */
function cdfT(t, df) {
  if (!sah(t) || !(df > 0)) return NaN;
  const x = df / (df + t * t);
  const tail = 0.5 * betaI(x, df / 2, 0.5);
  return t >= 0 ? 1 - tail : tail;
}
/** p dua sisi untuk statistik t. */
const pDuaSisiT = (t, df) => 2 * (1 - cdfT(Math.abs(t), df));
/** Kuantil t (p tunggal, mis. 0,975) dengan pencarian bagi dua. */
function kuantilT(p, df) {
  if (!(df > 0)) return NaN;
  let lo = 0; let hi = 1000;
  for (let i = 0; i < 200; i += 1) {
    const mid = (lo + hi) / 2;
    if (cdfT(mid, df) < p) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}
/** Fungsi sebaran normal baku (hampiran Abramowitz–Stegun 26.2.17, galat < 7,5e-8). */
function cdfNormal(z) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp((-z * z) / 2);
  const p = d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return z >= 0 ? 1 - p : p;
}

/** Selang kepercayaan 95% rata-rata (t Student). null bila n < 2. */
function ciRata(nilai, tingkat = 0.95) {
  const x = bersih(nilai);
  if (x.length < 2) return null;
  const n = x.length;
  const rata = x.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(x.reduce((a, b) => a + (b - rata) ** 2, 0) / (n - 1));
  const m = kuantilT(1 - (1 - tingkat) / 2, n - 1) * (sd / Math.sqrt(n));
  return { n, rata, sd, bawah: rata - m, atas: rata + m };
}

/** Selang kepercayaan median tanpa asumsi sebaran (peringkat order statistik, hampiran normal). null bila n < 6. */
function ciMedian(nilai, tingkat = 0.95) {
  const x = bersih(nilai).sort((a, b) => a - b);
  const n = x.length;
  if (n < 6) return null;
  const z = tingkat === 0.95 ? 1.959964 : Math.abs(kuantilNormal(1 - (1 - tingkat) / 2));
  const j = Math.max(1, Math.floor(n / 2 - (z * Math.sqrt(n)) / 2));
  const k = Math.min(n, Math.ceil(1 + n / 2 + (z * Math.sqrt(n)) / 2));
  return { n, bawah: x[j - 1], atas: x[k - 1] };
}
function kuantilNormal(p) {
  let lo = -10; let hi = 10;
  for (let i = 0; i < 100; i += 1) {
    const mid = (lo + hi) / 2;
    if (cdfNormal(mid) < p) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

/* ── peringkat & korelasi ─────────────────────────────────────────── */
/** Peringkat rata-rata untuk nilai kembar (mulai dari 1). */
function peringkat(x) {
  const idx = x.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]);
  const r = new Array(x.length);
  for (let i = 0; i < idx.length;) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j += 1;
    const rata = (i + j) / 2 + 1;
    for (let k = i; k <= j; k += 1) r[idx[k][1]] = rata;
    i = j + 1;
  }
  return r;
}
function pearson(a, b) {
  const n = a.length;
  if (n < 2) return NaN;
  const ma = a.reduce((x, y) => x + y, 0) / n;
  const mb = b.reduce((x, y) => x + y, 0) / n;
  let sab = 0; let saa = 0; let sbb = 0;
  for (let i = 0; i < n; i += 1) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2; }
  return saa === 0 || sbb === 0 ? NaN : sab / Math.sqrt(saa * sbb);
}
/** Autokorelasi lag-1 (Pearson antara x[0..n-2] dan x[1..n-1]). */
function autokorelasi1(x) {
  const v = bersih(x);
  return v.length < 3 ? NaN : pearson(v.slice(0, -1), v.slice(1));
}
/** Ukuran sampel efektif untuk dua deret: n (1 − r1x·r1y) / (1 + r1x·r1y), dibatasi [3, n]. */
function nEfektif(n, r1x, r1y) {
  if (!sah(r1x) || !sah(r1y)) return n;
  const g = r1x * r1y;
  return Math.max(3, Math.min(n, (n * (1 - g)) / (1 + g)));
}

/**
 * Korelasi peringkat Spearman dari pasangan (x, y). Nilai p dihitung dari t Student dengan n EFEKTIF (autokorelasi),
 * sehingga tidak berlebihan menyatakan signifikan. null bila pasangan < 5 atau salah satu konstan.
 */
function spearman(x, y) {
  const pasang = [];
  for (let i = 0; i < Math.min(x.length, y.length); i += 1) if (sah(x[i]) && sah(y[i])) pasang.push([x[i], y[i]]);
  const n = pasang.length;
  if (n < 5) return null;
  const a = pasang.map((p) => p[0]);
  const b = pasang.map((p) => p[1]);
  const rho = pearson(peringkat(a), peringkat(b));
  if (!sah(rho)) return null;
  const ne = nEfektif(n, autokorelasi1(a), autokorelasi1(b));
  const p = Math.abs(rho) >= 1 ? 0 : ne > 3 ? pDuaSisiT(rho * Math.sqrt((ne - 2) / (1 - rho * rho)), ne - 2) : 1;
  return { n, n_efektif: ne, rho, p };
}

/* ── uji peringkat bertanda Wilcoxon (berpasangan) ────────────────── */
/**
 * Uji peringkat bertanda untuk selisih berpasangan (a − b). Selisih nol dibuang. Eksak (penghitungan semua kemungkinan) bila
 * n ≤ 25 dan tanpa nilai kembar; selain itu hampiran normal dengan koreksi kembar dan kontinuitas. null bila n < 5.
 */
function wilcoxonBerpasangan(a, b) {
  const d = [];
  for (let i = 0; i < Math.min(a.length, b.length); i += 1) {
    if (sah(a[i]) && sah(b[i]) && a[i] - b[i] !== 0) d.push(a[i] - b[i]);
  }
  const n = d.length;
  if (n < 5) return null;
  const mutlak = d.map(Math.abs);
  const r = peringkat(mutlak);
  const wPlus = d.reduce((s, v, i) => s + (v > 0 ? r[i] : 0), 0);
  const adaKembar = new Set(mutlak).size !== n;
  const selisihMedian = median(d);
  if (!adaKembar && n <= 25) {
    // distribusi eksak jumlah peringkat positif: hitung banyaknya himpunan bagian {1..n} dengan jumlah w
    const maks = (n * (n + 1)) / 2;
    const cacah = new Array(maks + 1).fill(0);
    cacah[0] = 1;
    for (let k = 1; k <= n; k += 1) for (let w = maks; w >= k; w -= 1) cacah[w] += cacah[w - k];
    const total = 2 ** n;
    const w = Math.round(wPlus);
    let kiri = 0; for (let i = 0; i <= w; i += 1) kiri += cacah[i];
    let kanan = 0; for (let i = w; i <= maks; i += 1) kanan += cacah[i];
    return { n, w_plus: wPlus, p: Math.min(1, (2 * Math.min(kiri, kanan)) / total), metode: 'eksak', selisih_median: selisihMedian };
  }
  const rata = (n * (n + 1)) / 4;
  const hitung = new Map();
  for (const v of r) hitung.set(v, (hitung.get(v) || 0) + 1);
  const koreksiKembar = [...hitung.values()].reduce((s, t) => s + (t ** 3 - t), 0) / 48;
  const varian = (n * (n + 1) * (2 * n + 1)) / 24 - koreksiKembar;
  const z = (Math.abs(wPlus - rata) - 0.5) / Math.sqrt(varian);
  return { n, w_plus: wPlus, p: Math.min(1, 2 * (1 - cdfNormal(Math.max(0, z)))), metode: 'hampiran normal', selisih_median: selisihMedian };
}

/* ── kecenderungan: Mann–Kendall + Theil–Sen ───────────────────── */
/** Kemiringan Theil–Sen (median kemiringan semua pasangan titik) dari deret (x, y). null bila < 2 titik. */
function theilSen(x, y) {
  const lereng = [];
  for (let i = 0; i < x.length; i += 1) for (let j = i + 1; j < x.length; j += 1) if (x[j] !== x[i]) lereng.push((y[j] - y[i]) / (x[j] - x[i]));
  return lereng.length ? median(lereng) : null;
}
/** Uji Mann–Kendall (dua sisi, hampiran normal dengan koreksi kembar). Butuh minimal 5 titik. */
function mannKendall(y) {
  const v = bersih(y);
  const n = v.length;
  if (n < 5) return null;
  let s = 0;
  for (let i = 0; i < n - 1; i += 1) for (let j = i + 1; j < n; j += 1) s += Math.sign(v[j] - v[i]);
  const hitung = new Map();
  for (const t of v) hitung.set(t, (hitung.get(t) || 0) + 1);
  const koreksi = [...hitung.values()].reduce((a, t) => a + t * (t - 1) * (2 * t + 5), 0);
  const varS = (n * (n - 1) * (2 * n + 5) - koreksi) / 18;
  const z = s === 0 ? 0 : (s - Math.sign(s)) / Math.sqrt(varS);
  return { n, s, z, p: Math.min(1, 2 * (1 - cdfNormal(Math.abs(z)))), tau: s / ((n * (n - 1)) / 2) };
}
/** Kecenderungan harian: kemiringan Theil–Sen per hari + uji Mann–Kendall dari deret nilai harian [{hari, nilai}]. */
function kecenderungan(titikHarian) {
  const t = (titikHarian || []).filter((p) => sah(p.hari) && sah(p.nilai));
  if (t.length < 5) return null;
  const mk = mannKendall(t.map((p) => p.nilai));
  const lereng = theilSen(t.map((p) => p.hari), t.map((p) => p.nilai));
  return mk && lereng != null ? { n: t.length, kemiringan_per_hari: lereng, tau: mk.tau, p: mk.p } : null;
}

/* ── kualitas data ────────────────────────────────────────────────── */
/**
 * Lonjakan: beda antar titik berurutan yang melebihi `k` kali skala kokoh (1,4826 · MAD) beda-beda itu.
 * Skala minimum `lantai` mencegah deret hampir datar menandai noise kecil sebagai lonjakan.
 */
function deteksiLonjakan(nilai, k = 6, lantai = 0) {
  const v = bersih(nilai);
  if (v.length < 10) return { n: v.length, lonjakan: 0, persen: 0 };
  const d = [];
  for (let i = 1; i < v.length; i += 1) d.push(v[i] - v[i - 1]);
  const md = median(d);
  const sigma = Math.max(lantai, 1.4826 * median(d.map((x) => Math.abs(x - md))));
  if (!(sigma > 0)) return { n: v.length, lonjakan: 0, persen: 0 };
  const lonjakan = d.filter((x) => Math.abs(x - md) > k * sigma).length;
  return { n: v.length, lonjakan, persen: (lonjakan / d.length) * 100 };
}

module.exports = {
  kuantil, median, ringkasSebaran, cdfT, kuantilT, pDuaSisiT, cdfNormal, ciRata, ciMedian,
  peringkat, pearson, autokorelasi1, nEfektif, spearman, wilcoxonBerpasangan, theilSen, mannKendall, kecenderungan, deteksiLonjakan,
};
