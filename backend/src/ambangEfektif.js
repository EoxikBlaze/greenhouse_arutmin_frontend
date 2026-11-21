'use strict';
/**
 * Batas aman yang BERLAKU sekarang. Saat alat menjaga batch (mode SEMAI), pH dan nutrisi (ppm) mengikuti target batch itu
 * (pH min/maks dan target ppm ± toleransi), sama dengan yang dinilai penilai peringatan (src/peringatan.js).
 * Tabel Ambang Sensor hanya berlaku di luar semai dan untuk sensor lain (suhu air, suhu udara, kelembapan).
 */
// shortcut: toleransi = bawaan firmware (Kontrak §6.4); sama dengan toleransi_bawah_ppm/toleransi_atas_ppm di alat.
const TOLERANSI_PPM = { bawah: 50, atas: 100 };

/**
 * @param {Record<string, {min: any, max: any}>|null} ambang hasil thresholdsMap()
 * @param {{mode?: string|null, ph_min?: number|null, ph_max?: number|null, target_ppm?: number|null}|null} alat keadaanAlat
 * @param {{toleransi_bawah_ppm?: number, toleransi_atas_ppm?: number}} [pengaturan] dari Pengaturan Alat (src/pengaturanAlat.js)
 * @returns {Record<string, {min: any, max: any, sumber?: string, target?: number}>}
 */
function ambangEfektif(ambang, alat, pengaturan) {
  const hasil = { ...(ambang || {}) };
  if (alat?.mode !== 'SEMAI') return hasil;
  if (alat.ph_min != null && alat.ph_max != null) {
    hasil.ph = { min: alat.ph_min, max: alat.ph_max, sumber: 'batch' };
  }
  if (alat.target_ppm != null) {
    const bawah = pengaturan?.toleransi_bawah_ppm ?? TOLERANSI_PPM.bawah;
    const atas = pengaturan?.toleransi_atas_ppm ?? TOLERANSI_PPM.atas;
    hasil.tds = { min: alat.target_ppm - bawah, max: alat.target_ppm + atas, sumber: 'batch', target: alat.target_ppm };
  }
  return hasil;
}

module.exports = { ambangEfektif, TOLERANSI_PPM };
