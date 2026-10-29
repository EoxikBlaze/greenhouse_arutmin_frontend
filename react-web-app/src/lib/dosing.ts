/**
 * Data & helper layar Dosing Otomatis. Endpoint (routes/konfigurasi.js, routes/preset.js):
 *   GET/PUT /konfigurasi-dosis/:param · GET/PUT /timing-operasi/:param (PUT admin)
 *   GET /aturan-fail-safe · GET /jadwal-perawatan (baca saja)
 */
import { angkaMaks } from './format'

/** Baris GET /konfigurasi-dosis & /timing-operasi — PK `param`, `nilai` numeric dari pg (string). */
export type ParameterRow = {
  param: string
  nilai: string | number | null
  satuan: string | null
  keterangan: string | null
  sumber?: string | null
  diubah_pada?: string | null
}

export type FailSafeRow = {
  kode: string
  kondisi: string
  aksi: string
  ambang: string | number | null
  satuan: string | null
  aktif: boolean | null
  sumber?: string | null
}

export type JadwalRow = {
  kode: string
  periode: string
  periode_hari: number | null
  kegiatan: string
  lama_menit: number | null
  sumber?: string | null
}

/** Bentuk hasil useApiList yang diteruskan ke panel. */
export type Daftar<T> = { rows: T[]; loading: boolean; error: string | null; reload: () => void }

/** numeric pg datang sebagai string ("20.0000") → tampil ringkas, tetap jujur. */
export function tampilNilai(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === '') return '—'
  const n = Number(v)
  return Number.isFinite(n) ? angkaMaks(n, 4) : String(v)
}

export const belumDiatur = (v: ParameterRow['nilai']) => v === null || v === undefined || v === ''

/** Kode parameter → [judul ramah, kelompok]. Kode yang belum terpetakan tampil apa adanya di kelompok "Lainnya". */
const PARAM: Record<string, [string, string]> = {
  // ── Parameter dosing
  maks_ppm_per_suntikan: ['Batas kenaikan per suntikan', 'Batas dosis'],
  maks_ms_per_suntikan: ['Batas kenaikan EC per suntikan', 'Batas dosis'],
  maks_ml_per_suntikan: ['Batas volume per suntikan', 'Batas dosis'],
  maks_ml_ph_per_suntikan: ['Batas volume pH per suntikan', 'Batas dosis'],
  maks_ml_bilas_per_perintah: ['Batas volume bilas', 'Batas dosis'],
  ml_ph_per_langkah: ['Langkah dosis pH', 'Batas dosis'],
  persen_ronde_dosis: ['Porsi dosis per ronde', 'Batas dosis'],
  maks_lampau_persen: ['Batas lampaui target', 'Batas dosis'],
  min_progres_persen: ['Progres minimal per percobaan', 'Batas dosis'],
  maks_volume_ab_hari_ml: ['Batas volume nutrisi A+B per hari', 'Batas harian'],
  maks_volume_ph_hari_ml: ['Batas volume pH per hari', 'Batas harian'],
  maks_kejadian_per_hari: ['Batas kejadian dosing per hari', 'Batas harian'],
  peringatan_dini_kejadian: ['Peringatan dini kejadian', 'Batas harian'],
  maks_suntikan_per_kejadian: ['Batas suntikan per kejadian', 'Batas harian'],
  maks_retry_ec: ['Batas ulang koreksi EC', 'Percobaan ulang'],
  maks_retry_ph: ['Batas ulang koreksi pH', 'Percobaan ulang'],
  maks_gagal_berturut: ['Batas gagal berturut-turut', 'Percobaan ulang'],
  deadband_ec_ms: ['Pita mati EC (mS/cm)', 'Pita mati & kestabilan'],
  deadband_ec_ppm: ['Pita mati EC (ppm)', 'Pita mati & kestabilan'],
  deadband_ph: ['Pita mati pH', 'Pita mati & kestabilan'],
  stabil_toleransi_ph: ['Toleransi stabil pH', 'Pita mati & kestabilan'],
  stabil_toleransi_tds_ppm: ['Toleransi stabil TDS', 'Pita mati & kestabilan'],
  faktor_ppm_per_ec: ['Konversi EC ke ppm', 'Kalibrasi & konversi'],
  faktor_skala_dosis_dft: ['Skala dosis penampung DFT', 'Kalibrasi & konversi'],
  k_faktor: ['Faktor sel EC (K)', 'Kalibrasi & konversi'],
  ppm_per_detik_pulsa: ['Laju pompa per detik', 'Kalibrasi & konversi'],
  antrian_alert_maks: ['Antrean alert saat WiFi mati', 'Sistem'],
  maks_masa_persetujuan_menit: ['Masa berlaku persetujuan dosing', 'Sistem'],
  wajib_firmware_v03: ['Wajib firmware 0.3', 'Sistem'],
  // ── Timing operasi
  baca_stabil_timeout_detik: ['Batas waktu bacaan stabil', 'Pembacaan sensor'],
  median_pembacaan_n: ['Jumlah bacaan untuk median', 'Pembacaan sensor'],
  stabil_menit: ['Jendela bacaan stabil', 'Pembacaan sensor'],
  stabil_n_bacaan: ['Jumlah bacaan stabil', 'Pembacaan sensor'],
  ronde_dosing_menit: ['Lama satu ronde dosing', 'Ronde & jeda dosing'],
  mixing_menit: ['Waktu pencampuran', 'Ronde & jeda dosing'],
  monitoring_menit: ['Masa istirahat setelah target', 'Ronde & jeda dosing'],
  gap_besar_menit: ['Perkiraan gap besar', 'Ronde & jeda dosing'],
  jeda_ab_menit: ['Jeda nutrisi A ke B', 'Ronde & jeda dosing'],
  jeda_a_ke_bilas_detik: ['Jeda A ke bilas', 'Ronde & jeda dosing'],
  jeda_pasca_bilas_detik: ['Jeda setelah bilas', 'Ronde & jeda dosing'],
  volume_bilas_ml: ['Volume bilas', 'Ronde & jeda dosing'],
  isi_air_timeout_menit: ['Batas waktu isi air', 'Pengisian air'],
  isi_botol_normal_detik: ['Waktu isi botol normal', 'Pengisian air'],
  isi_botol_timeout_detik: ['Batas waktu isi botol', 'Pengisian air'],
  jeda_pasca_isi_air_menit: ['Jeda setelah isi air', 'Pengisian air'],
  limit_batas_ons_pompa: ['Batas waktu nyala pompa', 'Pengisian air'],
  konfirmasi_peremajaan_batas_jam: ['Batas jawab konfirmasi peremajaan', 'Konfirmasi'],
  konfirmasi_peremajaan_jam_ke: ['Mulai konfirmasi peremajaan', 'Konfirmasi'],
  konfirmasi_tandon_jam: ['Batas jawab konfirmasi tandon', 'Konfirmasi'],
  pengingat_konfirmasi_jam: ['Pengingat konfirmasi', 'Konfirmasi'],
  ulang_konfirmasi_jam: ['Jeda konfirmasi ulang', 'Konfirmasi'],
  reset_counter_jam: ['Jam reset counter harian', 'Sistem'],
}

export const judulParam = (kode: string) => PARAM[kode]?.[0] ?? kode
export const kelompokParam = (kode: string) => PARAM[kode]?.[1] ?? 'Lainnya'

/** Kelompok fail-safe menurut kode FS-… */
export function kelompokFailSafe(kode: string): string {
  if (/SANITY|SENSOR|TIMEOUT-BACA|LONJAKAN|EC-TINGGI/.test(kode)) return 'Sensor & bacaan'
  if (/JATAH|INFO-DINI|RETRY|RESET/.test(kode)) return 'Dosing & jatah harian'
  if (/DEAD-HEAD|TIMEOUT-ISI/.test(kode)) return 'Air & pompa'
  return 'Sistem'
}
export const URUT_FAILSAFE = ['Sensor & bacaan', 'Dosing & jatah harian', 'Air & pompa', 'Sistem']

/** Kelompokkan baris; urutan kelompok mengikuti kemunculan pertama, "Lainnya" terakhir. */
export function kelompokkan<T>(rows: T[], kelompok: (r: T) => string, urut?: string[]): Array<[string, T[]]> {
  const peta = new Map<string, T[]>()
  for (const r of rows) {
    const k = kelompok(r)
    peta.set(k, [...(peta.get(k) ?? []), r])
  }
  const bobot = (k: string) => (k === 'Lainnya' ? 9999 : urut ? (urut.indexOf(k) < 0 ? 999 : urut.indexOf(k)) : 0)
  return [...peta.entries()].sort((a, b) => bobot(a[0]) - bobot(b[0]))
}

/** Cocokkan teks cari (tanpa peduli huruf besar) ke beberapa kolom. */
export const cocok = (cari: string, ...kolom: Array<string | null | undefined>) => {
  const q = cari.trim().toLowerCase()
  return !q || kolom.some((k) => (k ?? '').toLowerCase().includes(q))
}
