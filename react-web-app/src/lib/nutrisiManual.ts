/** Kontrak Nutrisi Manual (POST /iot-v41/dosing-manual + GET /iot-v41/dosing-manual/riwayat). */
export type ZatManual = 'nutrisi_a' | 'nutrisi_b' | 'ph_up' | 'ph_down'

export const DAFTAR_ZAT: ReadonlyArray<{ kode: ZatManual; nama: string }> = [
  { kode: 'nutrisi_a', nama: 'Nutrisi A' },
  { kode: 'nutrisi_b', nama: 'Nutrisi B' },
  { kode: 'ph_up', nama: 'pH Up' },
  { kode: 'ph_down', nama: 'pH Down' },
]

export type BatasManual = {
  zat: Record<ZatManual, { nama: string; maks_ml: number; laju_ml_per_detik: number; jatah_harian_ml: number }>
  jeda_menit: number
  durasi_maks_detik: number
}

export type RondeManual = { ronde_ke: number; jenis: string; volume_ml: number | string; ml_nyata: number | string | null; hasil: string; catatan: string | null }
export type KejadianManual = {
  id: number | string
  mulai_pada: string
  selesai_pada: string | null
  hasil: 'berjalan' | 'sukses' | 'gagal' | 'lock' | 'timeout' | 'dibatalkan'
  alasan: string | null
  alasan_akhir: string | null
  oleh: string | null
  ronde: RondeManual[]
}

/** Label status untuk petani: berjalan / selesai / gagal / dibatalkan. */
export function labelStatusManual(h: KejadianManual['hasil']): { teks: string; kelas: string } {
  if (h === 'berjalan') return { teks: 'berjalan', kelas: 'is-normal' }
  if (h === 'sukses') return { teks: 'selesai', kelas: 'is-normal' }
  if (h === 'dibatalkan') return { teks: 'dibatalkan', kelas: 'is-kosong' }
  return { teks: 'gagal', kelas: 'is-luar' }
}

/** Validasi sisi klien (server tetap memeriksa ulang). Mengembalikan pesan galat atau null. */
export function periksaIsian(
  zat: ZatManual,
  mode: 'volume' | 'durasi',
  nilai: string,
  batas: BatasManual | null,
): string | null {
  const n = Number(nilai.replace(',', '.'))
  if (!Number.isFinite(n) || n <= 0) return 'Isi angka lebih dari 0.'
  if (!batas) return null
  const b = batas.zat[zat]
  const ml = mode === 'volume' ? n : n * b.laju_ml_per_detik
  if (mode === 'durasi' && n > batas.durasi_maks_detik) return `Durasi maksimal ${batas.durasi_maks_detik} detik.`
  if (ml > b.maks_ml) return `Melebihi batas ${b.maks_ml} mL per sekali dosing.`
  return null
}
