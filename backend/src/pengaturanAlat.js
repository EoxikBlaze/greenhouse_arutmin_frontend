'use strict';
/**
 * Pengaturan Alat: parameter firmware v6 yang bisa diubah dari web (perintah KONFIGURASI).
 * Rentang dan bawaan MENGIKUTI tabel parameter di firmware (Parameter.cpp); firmware menolak nilai di luar rentang itu,
 * jadi web memeriksa lebih dulu dan tidak pernah mengirim nilai yang pasti ditolak.
 * Yang diatur di menu lain tidak ada di sini: volume/monitoring/jeda (Master Meja), ppm per mL dan takaran pH (Uji Lab),
 * laju pompa dan faktor EC (Kalibrasi).
 * Sumber tunggal: nilai tersimpan di tabel pengaturan_alat; penilai peringatan dan batas efektif membacanya (efektif()).
 */
const { q } = require('./db');

const KELOMPOK = {
  nutrisi: 'Dosis nutrisi (A+B)',
  ph: 'Koreksi pH',
  air: 'Air dan pengenceran',
  sistem: 'Sistem alat',
};

/** penting = parameter keselamatan: web meminta konfirmasi sebelum mengirim. bulat = firmware menyimpannya sebagai bilangan bulat. */
const DEF = [
  { param: 'persen_dosis', kelompok: 'nutrisi', label: 'Persen kekurangan yang didosis', satuan: '%', min: 30, max: 100, bawaan: 80, penting: true,
    ket: 'Tiap dosis menambah segini persen dari kekurangan ppm. Makin kecil makin hati-hati, tetapi makin banyak putaran.' },
  { param: 'maks_ppm_sekali', kelompok: 'nutrisi', label: 'Maksimum kenaikan ppm sekali dosis', satuan: 'ppm', min: 20, max: 400, bawaan: 150, penting: true,
    ket: 'Batas atas satu dosis nutrisi, walau kekurangannya lebih besar.' },
  { param: 'toleransi_bawah_ppm', kelompok: 'nutrisi', label: 'Toleransi ppm di bawah target', satuan: 'ppm', min: 10, max: 500, bawaan: 50,
    ket: 'Alat mulai mendosis bila ppm lebih rendah dari target dikurangi angka ini. Peringatan di web memakai angka yang sama.' },
  { param: 'toleransi_atas_ppm', kelompok: 'nutrisi', label: 'Toleransi ppm di atas target', satuan: 'ppm', min: 20, max: 1000, bawaan: 100,
    ket: 'Alat mengencerkan bila ppm melewati target ditambah angka ini. Peringatan di web memakai angka yang sama.' },
  { param: 'ppm_min_dosing', kelompok: 'nutrisi', label: 'ppm minimum agar dosing jalan', satuan: 'ppm', min: 0, max: 500, bawaan: 20,
    ket: 'Pengaman probe terangkat: bila ppm sudah pernah naik lalu jatuh di bawah angka ini, dosing ditahan.' },
  { param: 'maks_ab_hari', kelompok: 'nutrisi', label: 'Maksimum dosing nutrisi per hari', satuan: 'kali', min: 1, max: 20, bawaan: 6, bulat: true, penting: true,
    ket: 'Setelah batas ini alat menunggu besok. Reset pukul 00:00.' },

  { param: 'ph_toleransi', kelompok: 'ph', label: 'Toleransi pH di luar rentang', satuan: 'pH', min: 0, max: 1, bawaan: 0.2,
    ket: 'pH baru dikoreksi bila keluar dari rentang batch lebih dari angka ini.' },
  { param: 'ph_jeda_menit', kelompok: 'ph', label: 'Jeda antar koreksi pH', satuan: 'menit', min: 15, max: 1440, bawaan: 120, bulat: true,
    ket: 'Waktu tunggu setelah satu koreksi pH sebelum koreksi berikutnya, supaya larutan sempat bercampur.' },
  { param: 'ph_ml_maks', kelompok: 'ph', label: 'Maksimum larutan pH sekali suntik', satuan: 'mL', min: 0.5, max: 50, bawaan: 10, penting: true,
    ket: 'Batas atas satu suntikan pH up atau down.' },
  { param: 'maks_ph_hari', kelompok: 'ph', label: 'Maksimum koreksi pH per hari', satuan: 'kali', min: 1, max: 20, bawaan: 5, bulat: true, penting: true,
    ket: 'Setelah batas ini alat menunggu besok. Reset pukul 00:00.' },

  { param: 'maks_encer_hari', kelompok: 'air', label: 'Maksimum pengenceran per hari', satuan: 'kali', min: 0, max: 20, bawaan: 3, bulat: true,
    ket: 'Berapa kali sehari alat boleh menambah air untuk menurunkan ppm. 0 = tidak pernah mengencerkan.' },
  { param: 'maks_isi_hari', kelompok: 'air', label: 'Maksimum isi air per hari', satuan: 'kali', min: 1, max: 50, bawaan: 6, bulat: true, penting: true,
    ket: 'Terlalu sering isi air berarti curiga bocor: pompa isi dikunci sampai petani mereset.' },
  { param: 'timeout_isi_menit', kelompok: 'air', label: 'Batas waktu satu kali isi air', satuan: 'menit', min: 1, max: 40, bawaan: 15, bulat: true, penting: true,
    ket: 'Bila air belum penuh setelah waktu ini, pompa isi dimatikan dan dikunci (sumber air habis atau bocor).' },

  { param: 'pemeliharaan_maks_menit', kelompok: 'sistem', label: 'Batas waktu mode pemeliharaan', satuan: 'menit', min: 10, max: 480, bawaan: 120, bulat: true,
    ket: 'Mode pemeliharaan berakhir sendiri setelah waktu ini supaya alat tidak lupa kembali ke normal.' },
  { param: 'telemetri_dtk', kelompok: 'sistem', label: 'Interval kirim data sensor', satuan: 'detik', min: 2, max: 600, bawaan: 5, bulat: true,
    ket: 'Seberapa sering alat mengirim bacaan ke server. Makin kecil makin rapat, tetapi lebih banyak data.' },
  { param: 'tz_menit', kelompok: 'sistem', label: 'Zona waktu (selisih dari UTC)', satuan: 'menit', min: -720, max: 840, bawaan: 480, bulat: true,
    ket: 'WITA = 480. Menentukan pergantian hari (reset hitungan harian pukul 00:00) di alat.' },
];

const PETA = new Map(DEF.map((d) => [d.param, d]));
const DEFAULT = Object.fromEntries(DEF.map((d) => [d.param, d.bawaan]));

/** Nilai tersimpan (hanya yang diubah dari bawaan): {param: nilai}. */
async function tersimpan() {
  const rows = await q('SELECT param, nilai FROM pengaturan_alat').catch(() => []);
  const out = {};
  for (const r of rows) if (PETA.has(r.param)) out[r.param] = Number(r.nilai);
  return out;
}

/** Nilai yang berlaku: tersimpan atau bawaan firmware. Dipakai penilai peringatan dan batas efektif. */
async function efektif() {
  return { ...DEFAULT, ...(await tersimpan()) };
}

/**
 * Periksa {param: nilai}. Mengembalikan {nilai, errors}; errors kosong = sah.
 * Nilai di luar rentang firmware ditolak (tidak dijepit diam-diam).
 */
function validasi(body) {
  const nilai = {};
  const errors = {};
  const b = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  for (const [param, mentah] of Object.entries(b)) {
    const d = PETA.get(param);
    if (!d) { errors[param] = ['Parameter tidak dikenal.']; continue; }
    const v = typeof mentah === 'number' ? mentah : typeof mentah === 'string' && mentah.trim() !== '' ? Number(mentah.replace(',', '.')) : NaN;
    if (!Number.isFinite(v)) { errors[param] = ['Isi dengan angka.']; continue; }
    if (v < d.min || v > d.max) { errors[param] = [`${d.label} harus ${d.min} sampai ${d.max} ${d.satuan}.`]; continue; }
    if (d.bulat && !Number.isInteger(v)) { errors[param] = ['Harus bilangan bulat.']; continue; }
    nilai[param] = d.bulat ? v : Math.round(v * 1000) / 1000;
  }
  if (!Object.keys(nilai).length && !Object.keys(errors).length) errors.pengaturan = ['Tidak ada parameter yang diubah.'];
  return { nilai, errors };
}

module.exports = { KELOMPOK, DEF, PETA, DEFAULT, tersimpan, efektif, validasi };
