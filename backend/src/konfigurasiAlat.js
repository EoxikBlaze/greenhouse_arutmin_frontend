'use strict';
/**
 * Isi perintah KONFIGURASI (Kontrak MQTT v2.0 §6.2 & §6.4) dari Master Meja + hasil uji lab & kalibrasi laju pompa.
 * Dikirim saat Mulai Semai sebelum SEMAI, supaya alat langsung berstatus siap (Firmware v6 §4.1).
 * Nilai yang belum pernah diisi di web TIDAK dikirim: alat memakai nilai yang sudah tersimpan di flash-nya.
 */
const { q, one } = require('./db');
const { hitungSirkulasi } = require('./iotV41');

/** Rentang yang diterima firmware (Kontrak §6.4); satu nilai di luar rentang = seluruh KONFIGURASI ditolak alat. */
const RENTANG = {
  volume_l: [5, 5000], monitoring_menit: [5, 720], jeda_ab_dtk: [10, 900], ppm_per_ml_ab: [1, 3000],
  laju_a: [0.05, 50], laju_b: [0.05, 50], laju_ph_up: [0.05, 50], laju_ph_down: [0.05, 50],
};
/** konfigurasi_dosis.param (diisi menu Kalibrasi / Uji Lab) → nama parameter firmware. */
const DARI_KALIBRASI = {
  ppm_per_ml: 'ppm_per_ml_ab', laju_pompa_a_mls: 'laju_a', laju_pompa_b_mls: 'laju_b',
  laju_pompa_ph_up_mls: 'laju_ph_up', laju_pompa_ph_down_mls: 'laju_ph_down',
};

/** Nama untuk petani (pesan Mulai Semai). */
const LABEL = {
  volume_l: 'volume penampung (Master Meja)', monitoring_menit: 'waktu monitoring (Master Meja)', jeda_ab_dtk: 'jeda A→B (Master Meja)',
  ppm_per_ml_ab: 'uji lab nutrisi AB (Master Data → Uji Lab)', laju_a: 'laju pompa A (Kalibrasi)', laju_b: 'laju pompa B (Kalibrasi)',
  laju_ph_up: 'laju pompa pH up (Kalibrasi)', laju_ph_down: 'laju pompa pH down (Kalibrasi)',
};

/** Perubahan pH yang dituju tiap suntikan pH (firmware: satu nilai mL per 100 L untuk naik dan turun). */
const LANGKAH_PH = 0.3;
const RENTANG_PH_ML_100L = [0.1, 50];

/**
 * mL per suntikan per 100 L dari Uji Lab pH (mL per 1 pH per 1 L). Naik dan turun beda → pakai yang lebih kecil (lebih aman).
 * @returns {number|null}
 */
function phMlPer100L(up, down) {
  const ada = [up, down].map((v) => (v == null ? null : Number(v))).filter((v) => Number.isFinite(v) && v > 0);
  if (!ada.length) return null;
  return Math.round(Math.min(...ada) * 100 * LANGKAH_PH * 100) / 100;
}

/** ppm per mL total (A+B, hasil Uji Lab web) → ppm per pasang 1 mL A + 1 mL B per liter (ppm_per_ml_ab firmware). */
const ppmPerPasangAb = (perMlTotal) => Math.round(Number(perMlTotal) * 2 * 100) / 100;

const angka = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));

/**
 * Volume, waktu monitoring, dan jeda A→B satu meja. Monitoring/jeda kosong di master = dihitung dari
 * satu putaran larutan: volume ÷ (jumlah talang × laju per talang) (src/iotV41.js hitungSirkulasi).
 */
function konfigurasiMeja(m) {
  const volume = angka(m?.kapasitas_penampung_l);
  const s = hitungSirkulasi({ volume_l: volume ?? 0, talang_jumlah: m?.jumlah_talang ?? 0, talang_debit: m?.laju_per_talang_lpm ?? 0 });
  const adaPutaran = s.putaran_menit > 0;
  const monitoring = angka(m?.monitoring_menit) ?? (adaPutaran ? s.saran_monitoring_menit : null);
  const jeda = angka(m?.jeda_ab_dtk) ?? (adaPutaran ? s.saran_jeda_ab_menit * 60 : null);
  return {
    volume_l: volume == null ? null : Math.round(volume),
    putaran_menit: adaPutaran ? s.putaran_menit : null,
    monitoring_menit: monitoring, monitoring_otomatis: angka(m?.monitoring_menit) == null,
    jeda_ab_dtk: jeda, jeda_otomatis: angka(m?.jeda_ab_dtk) == null,
  };
}

/**
 * Parameter KONFIGURASI untuk meja. `kurang` = nilai yang belum bisa diisi dari web (dipakai pesan ke petani).
 * @returns {Promise<{parameter: Record<string, number>, kurang: string[]}>}
 */
async function parameterKonfigurasi(idMeja, kategori = 'sayur') {
  const sfx = kategori === 'buah' ? '_buah' : '';
  const meja = await one('SELECT * FROM mejas WHERE id_meja = $1', [idMeja]);
  const k = konfigurasiMeja(meja);
  const kal = await q('SELECT param, nilai, sumber FROM konfigurasi_dosis WHERE param = ANY($1::text[])',
    [[...Object.keys(DARI_KALIBRASI), `ppm_per_ml${sfx}`, `ph_up_ml_per_ph_l${sfx}`, `ph_down_ml_per_ph_l${sfx}`]]);
  // hanya hasil ukur nyata yang disimpan web (sumber 'Aplikasi Web v4.1'); nilai awal bawaan migrasi bukan hasil ukur dan
  // tidak boleh menimpa kalibrasi yang sudah ada di alat
  const nyata = (param) => angka(kal.find((r) => r.param === param && r.sumber === 'Aplikasi Web v4.1')?.nilai);
  const nilai = { volume_l: k.volume_l, monitoring_menit: k.monitoring_menit, jeda_ab_dtk: k.jeda_ab_dtk };
  for (const [param, kunci] of Object.entries(DARI_KALIBRASI)) {
    const v = nyata(param === 'ppm_per_ml' ? `ppm_per_ml${sfx}` : param);
    if (v != null) nilai[kunci] = v;
  }
  // Uji Lab web menyimpan kenaikan ppm per mL TOTAL larutan (A + B); firmware v6 memakai kenaikan per PASANG (1 mL A + 1 mL B)
  // dan menyuntik A = B sama banyak. Tanpa konversi alat menyuntik dua kali lipat dari yang diperlukan.
  if (nilai.ppm_per_ml_ab != null) nilai.ppm_per_ml_ab = ppmPerPasangAb(nilai.ppm_per_ml_ab);
  const phMl = phMlPer100L(nyata(`ph_up_ml_per_ph_l${sfx}`), nyata(`ph_down_ml_per_ph_l${sfx}`));
  const parameter = { id_meja: Number(idMeja) };
  const kurang = [];
  for (const [kunci, [min, max]] of Object.entries(RENTANG)) {
    const v = nilai[kunci];
    if (v == null) { kurang.push(kunci === 'ppm_per_ml_ab' ? `uji lab nutrisi AB ${kategori} (Master Data → Uji Lab)` : LABEL[kunci]); continue; }
    if (v < min || v > max) { kurang.push(`${LABEL[kunci]}: ${v} di luar ${min}–${max}`); continue; }
    parameter[kunci] = kunci === 'volume_l' || kunci.endsWith('_menit') || kunci.endsWith('_dtk') ? Math.round(v) : v;
  }
  // opsional: tanpa uji lab pH alat memakai bawaan firmware (2 mL per 100 L, maks 10 mL)
  if (phMl != null) {
    if (phMl >= RENTANG_PH_ML_100L[0] && phMl <= RENTANG_PH_ML_100L[1]) parameter.ph_ml_per_100l = phMl;
    else kurang.push(`takaran pH dari Uji Lab: ${phMl} mL/100 L di luar ${RENTANG_PH_ML_100L.join('–')}; periksa hasil uji lab pH`);
  }
  // parameter firmware yang diatur dari Pengaturan Alat (hanya yang diubah dari bawaan) ikut dikirim agar alat sama dengan web
  Object.assign(parameter, await require('./pengaturanAlat').tersimpan());
  return { parameter, kurang, kategori };
}

module.exports = { konfigurasiMeja, parameterKonfigurasi, ppmPerPasangAb, phMlPer100L, LANGKAH_PH, RENTANG };
