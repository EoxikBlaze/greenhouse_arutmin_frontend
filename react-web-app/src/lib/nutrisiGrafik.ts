/** Data & helper grafik "Nutrisi: target vs aktual" — GET /monitoring/nutrisi (backend/src/nutrisiGrafik.js). */

export type TitikPpm = { t: number; ppm: number }
export type JenisDosing = 'AB' | 'PH' | 'ENCER'
export type KejadianDosing = { t: number; jenis: JenisDosing }

export type DataNutrisi = {
  batch: { id_meja: number | string; tanaman: string | null; tahap: string; hari_semai: number | null; cara: 'harian' | 'tahap' | null } | null
  alat: { kode: string; nama: string } | null
  dari: number
  sampai: number
  sekarang: number
  /** ppm rata-rata per jam dari sensor (tds = ppm = EC × 500) */
  aktual: TitikPpm[]
  /** target yang benar-benar dikirim ke alat (SEMAI / TARGET yang dikonfirmasi alat) */
  target_alat: TitikPpm[]
  /** target kurva batch ke depan; per siklus tetap sampai tahap dikonfirmasi pindah */
  rencana: TitikPpm[]
  dosing: KejadianDosing[]
  hari_ini: {
    target_batch: number | null
    target_alat: number | null
    ppm_aktual: number | null
    ppm_segar: boolean
    dosing: Record<JenisDosing, number>
  }
}

export const NAMA_DOSING: Record<JenisDosing, string> = { AB: 'Nutrisi A+B', PH: 'Koreksi pH', ENCER: 'Pengenceran' }

/** Sudut-sudut garis bertangga: target bertahan di nilainya sampai ada target baru, lalu sampai `akhir`. */
export function langkahTarget(titik: TitikPpm[], akhir: number): Array<[number, number]> {
  const urut = [...titik].sort((a, b) => a.t - b.t)
  const sudut: Array<[number, number]> = []
  urut.forEach((p, i) => {
    if (i > 0) sudut.push([p.t, urut[i - 1].ppm])
    sudut.push([p.t, p.ppm])
  })
  if (urut.length > 0) sudut.push([Math.max(akhir, urut[urut.length - 1].t), urut[urut.length - 1].ppm])
  return sudut
}

/** Target yang berlaku pada waktu t (nilai terakhir yang sudah dikirim pada/sebelum t), atau null. */
export function targetPada(titik: TitikPpm[], t: number): number | null {
  let hasil: number | null = null
  let waktu = -Infinity
  for (const p of titik) {
    if (p.t <= t && p.t >= waktu) {
      hasil = p.ppm
      waktu = p.t
    }
  }
  return hasil
}

/** Rentang (ms) sampai batas ini memakai label jam; lebih panjang memakai tanggal. */
export const BATAS_LABEL_JAM = 48 * 3_600_000

/** Penanda sumbu waktu: tiap 6 jam untuk rentang ≤ 48 jam, selainnya tiap tengah malam lokal. */
export function tickWaktu(dari: number, sampai: number): number[] {
  const langkah = sampai - dari <= BATAS_LABEL_JAM ? 6 : 24
  const d = new Date(dari)
  d.setMinutes(0, 0, 0)
  d.setHours(langkah === 24 ? 0 : Math.floor(d.getHours() / 6) * 6)
  const hasil: number[] = []
  let guard = 0
  while (d.getTime() <= sampai && guard < 400) {
    if (d.getTime() >= dari) hasil.push(d.getTime())
    d.setHours(d.getHours() + langkah)
    guard += 1
  }
  return hasil
}
