/**
 * Parameter penting sistem (halaman Parameter & Keamanan) — fungsi murni, tanpa angka SOP sendiri.
 *
 * Sumber data (tidak ada nilai pengganti/contoh):
 *  - Bacaan: GET /api/latest-sensor (tabel monitorings; ESP32 gabungan mengirim waterTemp, airTemp, humidity, ph, tds).
 *    ESP32 TIDAK mengukur EC terpisah: EC mS/cm = TDS ppm ÷ 500 (skala yang sama dengan LCD firmware).
 *    Tidak ada sensor "nutrisi" lain selain TDS/EC.
 *  - Batas peringatan: GET /ambang (tabel sensor_thresholds, menu Master Data → Ambang Sensor). Satu-satunya sumber.
 *  - Level tandon: dua pelampung (bawah/atas) dari laporan alat (perangkat.float_*), bukan sensor level kontinu.
 */

export type BacaanTerakhir = {
  is_online?: boolean
  seconds_ago?: number | null
  sensor?: Record<string, unknown> | null
} | null

export type BarisAmbang = { sensor: string; min: number | string | null; max: number | string | null; updated_at?: string | null }

export type StatusParam = 'normal' | 'di_luar_batas' | 'basi' | 'kosong' | 'batas_belum_diatur' | 'perhatian'

export type BarisParameter = {
  kunci: string
  label: string
  satuan: string
  /** Teks nilai siap tampil; null = tidak ada bacaan sah. */
  nilai: string | null
  /** Catatan asal nilai (mis. EC dihitung dari TDS). */
  catatan?: string
  batas: string | null
  batasDiubah: string | null
  status: StatusParam
}

const SENSOR: ReadonlyArray<{ kunci: string; label: string; satuan: string; desimal: number }> = [
  { kunci: 'tds', label: 'EC / TDS', satuan: 'ppm', desimal: 0 },
  { kunci: 'ph', label: 'pH', satuan: '', desimal: 2 },
  { kunci: 'waterTemp', label: 'Suhu air di penampung', satuan: '°C', desimal: 1 },
  { kunci: 'airTemp', label: 'Suhu udara', satuan: '°C', desimal: 1 },
  { kunci: 'humidity', label: 'Kelembapan udara', satuan: '%', desimal: 0 },
]

const angka = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

const teks = (n: number, d: number) => (d > 0 ? n.toFixed(d) : Math.round(n).toLocaleString('id-ID')).replace('.', ',')

function teksBatas(min: number | null, max: number | null, satuan: string, d: number): string | null {
  if (min == null && max == null) return null
  const s = satuan ? ` ${satuan}` : ''
  if (min != null && max != null) return `${teks(min, d)}–${teks(max, d)}${s}`
  return min != null ? `≥ ${teks(min, d)}${s}` : `≤ ${teks(max as number, d)}${s}`
}

/** Baris sensor: nilai hanya tampil bila bacaan segar; batas selalu dari Ambang Sensor (atau "belum diatur"). */
export function barisSensor(terakhir: BacaanTerakhir, ambang: BarisAmbang[]): BarisParameter[] {
  const segar = terakhir?.is_online === true
  const s = terakhir?.sensor ?? null
  return SENSOR.map(({ kunci, label, satuan, desimal }) => {
    const a = ambang.find((r) => r.sensor === kunci)
    const min = angka(a?.min)
    const max = angka(a?.max)
    const v = angka(s?.[kunci])
    const batas = teksBatas(min, max, satuan, kunci === 'ph' ? 1 : desimal)
    const catatan = kunci === 'tds' && v != null && segar ? `EC ≈ ${teks(v / 500, 2)} mS/cm (dihitung dari TDS ÷ 500)` : undefined
    let status: StatusParam
    if (!s || v == null) status = 'kosong'
    else if (!segar) status = 'basi'
    else if (!batas) status = 'batas_belum_diatur'
    else status = (min != null && v < min) || (max != null && v > max) ? 'di_luar_batas' : 'normal'
    return {
      kunci, label, satuan,
      nilai: v != null && segar ? teks(v, desimal) : null,
      catatan,
      batas,
      batasDiubah: a?.updated_at ?? null,
      status,
    }
  })
}

/** Level tandon dari dua pelampung. null = alat belum pernah melaporkan (firmware lama / belum tersambung). */
export function barisLevel(floatBawah: number | null | undefined, floatAtas: number | null | undefined): BarisParameter {
  const dasar = { kunci: 'level', label: 'Level penampung air', satuan: '', batas: 'Pelampung bawah & atas', batasDiubah: null }
  if (floatBawah == null && floatAtas == null) return { ...dasar, nilai: null, status: 'kosong' }
  if (floatBawah === 0) return { ...dasar, nilai: 'Kurang (pelampung bawah turun)', status: 'perhatian' }
  if (floatAtas === 1) return { ...dasar, nilai: 'Penuh (pelampung atas terangkat)', status: 'normal' }
  return { ...dasar, nilai: 'Cukup', status: 'normal' }
}

export const LABEL_STATUS: Record<StatusParam, string> = {
  normal: 'Dalam batas',
  di_luar_batas: 'Di luar batas',
  basi: 'Data basi',
  kosong: 'Belum ada data',
  batas_belum_diatur: 'Batas belum diatur',
  perhatian: 'Perlu perhatian',
}
