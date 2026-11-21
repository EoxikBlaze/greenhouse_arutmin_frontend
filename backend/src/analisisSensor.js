'use strict';
/**
 * ANALISIS SENSOR — fungsi murni (tanpa DB) untuk menu Analisis. Semua masukan berupa titik { t: ms, v: angka }
 * dari bacaan yang sudah dirata-rata per 5 menit (lihat routes/analitik.js), jadi tiap titik mewakili waktu yang sama.
 *
 * Batas jujur: alat hanya melaporkan HITUNGAN dosing per hari, bukan mL. Karena itu "respons dosing" mengukur
 * kenaikan ppm SESUDAH suntikan (apa adanya), bukan kenaikan per mL.
 */
const { tren } = require('./analitik');

const MENIT = 60_000;
const JAM = 3_600_000;

const angka = (v) => (v == null || v === '' ? NaN : Number(v));
const sah = (v) => Number.isFinite(v);

/** Statistik dasar; null bila tidak ada nilai sah. Simpangan baku = populasi. */
function statistik(nilai) {
  const x = (nilai || []).map(angka).filter(sah);
  if (!x.length) return null;
  const rata = x.reduce((a, b) => a + b, 0) / x.length;
  const sd = Math.sqrt(x.reduce((a, b) => a + (b - rata) ** 2, 0) / x.length);
  return { n: x.length, min: Math.min(...x), maks: Math.max(...x), rata, sd };
}

/** Persen titik di dalam [min, maks]; null bila batas tidak sah (min >= maks) atau tidak ada nilai. */
function persenDalam(nilai, min, maks) {
  const lo = angka(min);
  const hi = angka(maks);
  if (!sah(lo) || !sah(hi) || !(lo < hi)) return null;
  const x = (nilai || []).map(angka).filter(sah);
  if (!x.length) return null;
  return (x.filter((v) => v >= lo && v <= hi).length / x.length) * 100;
}

/** Median; NaN bila kosong. */
function median(nilai) {
  const x = (nilai || []).filter(sah).sort((a, b) => a - b);
  if (!x.length) return NaN;
  const m = Math.floor(x.length / 2);
  return x.length % 2 ? x[m] : (x[m - 1] + x[m]) / 2;
}

/** Tekanan defisit uap (VPD, kPa) dari suhu udara °C dan kelembapan relatif %. null bila masukan tidak masuk akal. */
function vpdKpa(suhuC, rh) {
  const t = angka(suhuC);
  const h = angka(rh);
  if (!sah(t) || !sah(h) || t < -10 || t > 60 || h < 0 || h > 100) return null;
  const jenuh = 0.6108 * Math.exp((17.27 * t) / (t + 237.3));
  return Math.max(0, jenuh * (1 - h / 100));
}

const dua = (n) => String(n).padStart(2, '0');
/** "2026-11-21" menurut waktu lokal proses (sama dengan jam dinding kolom created_at). */
function tanggalLokal(ms) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${dua(d.getMonth() + 1)}-${dua(d.getDate())}`;
}

/**
 * Kestabilan satu sensor: persen waktu dalam batas aman (keseluruhan + per hari), simpangan baku, dan cakupan data.
 * @param {{t:number, v:number}[]} seri titik per 5 menit
 * @param {{min:any, max:any}|null} batas
 */
function kestabilan(seri, batas) {
  const titik = (seri || []).filter((p) => sah(angka(p.v)));
  const st = statistik(titik.map((p) => p.v));
  if (!st) return { ...kosongKestabilan(), ada_batas: !!batas };
  const lo = batas ? angka(batas.min) : NaN;
  const hi = batas ? angka(batas.max) : NaN;
  const adaBatas = sah(lo) && sah(hi) && lo < hi;
  const perHari = new Map();
  for (const p of titik) {
    const k = tanggalLokal(p.t);
    if (!perHari.has(k)) perHari.set(k, []);
    perHari.get(k).push(p.v);
  }
  return {
    n: st.n, rata: st.rata, sd: st.sd, min: st.min, maks: st.maks, ada_batas: adaBatas,
    dalam_batas_persen: adaBatas ? persenDalam(titik.map((p) => p.v), lo, hi) : null,
    per_hari: [...perHari.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([tgl, v]) => ({
      tanggal: tgl, n: v.length, rata: statistik(v).rata, dalam_batas_persen: adaBatas ? persenDalam(v, lo, hi) : null,
    })),
  };
}
function kosongKestabilan() {
  return { n: 0, rata: null, sd: null, min: null, maks: null, dalam_batas_persen: null, per_hari: [] };
}

/**
 * Respons ppm terhadap tiap dosing nutrisi A+B: median ppm SEBELUM (15 menit sebelum suntikan) dibanding SESUDAH
 * (10–40 menit sesudahnya, memberi waktu larutan tercampur). `bersih` = tidak ada dosing/isi/encer lain di sekitar jendela itu,
 * jadi kenaikannya tidak tercampur kejadian lain.
 * @param {{t:number, v:number}[]} ppm
 * @param {{t:number, jenis:string}[]} kejadian semua jenis (AB, PH, ENCER, ISI)
 */
function responsDosing(ppm, kejadian, opsi = {}) {
  const { sebelumMs = 15 * MENIT, tundaMs = 10 * MENIT, sesudahMs = 40 * MENIT } = opsi;
  const seri = (ppm || []).filter((p) => sah(angka(p.v))).sort((a, b) => a.t - b.t);
  const lain = (kejadian || []).filter((k) => k.jenis !== 'PH');
  const hasil = [];
  for (const k of (kejadian || []).filter((e) => e.jenis === 'AB')) {
    const sblm = seri.filter((p) => p.t >= k.t - sebelumMs && p.t < k.t).map((p) => p.v);
    const ssdh = seri.filter((p) => p.t >= k.t + tundaMs && p.t <= k.t + sesudahMs).map((p) => p.v);
    // jendela yang terpotong (awal rentang, alat sempat offline) menghasilkan kenaikan palsu → butuh data cukup di kedua sisi
    if (sblm.length < 2 || ssdh.length < 3) continue;
    const awal = median(sblm);
    const akhir = median(ssdh);
    // dosing sebelumnya masih bisa memengaruhi bacaan 'sebelum' (jendela sesudahnya) → ikut dihitung sebagai pengganggu
    const bersih = !lain.some((e) => e !== k && e.t >= k.t - sebelumMs - sesudahMs && e.t <= k.t + sesudahMs);
    hasil.push({ t: k.t, sebelum: awal, sesudah: akhir, naik: akhir - awal, bersih });
  }
  const bersih = hasil.filter((h) => h.bersih).map((h) => h.naik);
  const m = median(bersih);
  return {
    kejadian: hasil,
    jumlah_bersih: bersih.length,
    median_naik: sah(m) ? m : null,
    // dosing yang menaikkan ppm jauh di bawah kebiasaan (< 30% median) = curiga botol hampir habis / selang bermasalah
    rendah: sah(m) && m > 0 ? hasil.filter((h) => h.bersih && h.naik < m * 0.3).map((h) => h.t) : [],
  };
}

/**
 * Laju konsumsi nutrisi: lereng ppm pada rentang TANPA dosing A+B, pengenceran, atau isi air (minimal 3 jam, 6 titik).
 * Hasil positif = ppm turun per hari akibat diserap tanaman (dan penguapan air). Rata-rata berbobot lama rentang.
 */
function konsumsiNutrisi(ppm, kejadian, opsi = {}) {
  const { minDurasiMs = 3 * JAM, minTitik = 6 } = opsi;
  const seri = (ppm || []).filter((p) => sah(angka(p.v))).sort((a, b) => a.t - b.t);
  if (seri.length < minTitik) return { segmen: [], ppm_turun_per_hari: null, total_jam: 0 };
  const potong = (kejadian || []).filter((k) => ['AB', 'ENCER', 'ISI'].includes(k.jenis)).map((k) => k.t).sort((a, b) => a - b);
  const batas = [seri[0].t, ...potong.filter((t) => t > seri[0].t && t < seri[seri.length - 1].t), seri[seri.length - 1].t + 1];
  const segmen = [];
  for (let i = 0; i < batas.length - 1; i += 1) {
    // beri jeda 30 menit sesudah kejadian: larutan belum tercampur
    const mulai = i === 0 ? batas[i] : batas[i] + 30 * MENIT;
    const titik = seri.filter((p) => p.t >= mulai && p.t < batas[i + 1]);
    if (titik.length < minTitik) continue;
    const durasi = titik[titik.length - 1].t - titik[0].t;
    if (durasi < minDurasiMs) continue;
    const lereng = tren(titik.map((p) => ({ t: p.t, v: p.v })));
    if (lereng == null) continue;
    segmen.push({ dari: titik[0].t, sampai: titik[titik.length - 1].t, turun_per_jam: -lereng, jam: durasi / JAM });
  }
  const totalJam = segmen.reduce((a, s) => a + s.jam, 0);
  const rata = totalJam > 0 ? segmen.reduce((a, s) => a + s.turun_per_jam * s.jam, 0) / totalJam : null;
  return { segmen, ppm_turun_per_hari: rata == null ? null : rata * 24, total_jam: totalJam };
}

/**
 * Pola harian: rata-rata suhu udara, kelembapan, dan VPD per (tanggal, jam) serta rata-rata per jam seluruh rentang.
 * @param {{t:number, suhu:any, rh:any}[]} titik
 */
function polaHarian(titik) {
  const sel = new Map();
  for (const p of titik || []) {
    const suhu = angka(p.suhu);
    const rh = angka(p.rh);
    if (!sah(suhu) && !sah(rh)) continue;
    const d = new Date(p.t);
    const kunci = `${tanggalLokal(p.t)}|${d.getHours()}`;
    if (!sel.has(kunci)) sel.set(kunci, { suhu: [], rh: [], vpd: [] });
    const s = sel.get(kunci);
    if (sah(suhu)) s.suhu.push(suhu);
    if (sah(rh)) s.rh.push(rh);
    const v = vpdKpa(suhu, rh);
    if (v != null) s.vpd.push(v);
  }
  const rata = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
  const sel2 = [...sel.entries()].map(([k, s]) => {
    const [tanggal, jam] = k.split('|');
    return { tanggal, jam: Number(jam), suhu: rata(s.suhu), rh: rata(s.rh), vpd: rata(s.vpd) };
  }).sort((a, b) => a.tanggal.localeCompare(b.tanggal) || a.jam - b.jam);
  const perJam = Array.from({ length: 24 }, (_, jam) => {
    const di = sel2.filter((c) => c.jam === jam);
    return {
      jam,
      suhu: rata(di.map((c) => c.suhu).filter(sah)),
      rh: rata(di.map((c) => c.rh).filter(sah)),
      vpd: rata(di.map((c) => c.vpd).filter(sah)),
    };
  });
  return { sel: sel2, per_jam: perJam };
}

/** Status VPD untuk sayuran daun hidroponik: < 0,4 terlalu lembap, 0,4–1,2 baik, > 1,2 terlalu kering (kPa). */
function nilaiVpd(vpd) {
  if (vpd == null || !Number.isFinite(vpd)) return null;
  return vpd < 0.4 ? 'terlalu_lembap' : vpd > 1.2 ? 'terlalu_kering' : 'baik';
}

module.exports = { statistik, persenDalam, median, vpdKpa, kestabilan, responsDosing, konsumsiNutrisi, polaHarian, nilaiVpd, tanggalLokal };
