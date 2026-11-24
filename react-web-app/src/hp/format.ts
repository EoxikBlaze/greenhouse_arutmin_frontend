import { nilaiAngka, type Ambang } from '../lib/sensorLaporan'

export type KunciHp = 'ph' | 'tds' | 'waterTemp' | 'airTemp' | 'humidity'
export const DEF: Record<KunciHp, { label: string; satuan: string; digit: number; judul: string }> = {
  ph: { label: 'pH', satuan: '', digit: 2, judul: 'pH air' },
  tds: { label: 'Nutrisi TDS ppm', satuan: ' ppm', digit: 0, judul: 'Nutrisi TDS' },
  waterTemp: { label: 'Suhu air', satuan: ' °C', digit: 1, judul: 'Suhu air' },
  airTemp: { label: 'Suhu udara', satuan: ' °C', digit: 1, judul: 'Suhu udara' },
  humidity: { label: 'Kelembapan', satuan: ' %', digit: 0, judul: 'Kelembapan' },
}

/** Angka koma Indonesia; kosong → "—" (bukan angka bohong). */
export function angkaId(v: unknown, digit: number): string {
  const n = nilaiAngka(v)
  return n === null ? '—' : n.toFixed(digit).replace('.', ',')
}

export type StatusHp = { teks: string; tone: 'ok' | 'bahaya' | '' }
/** Status kartu sensor: tanpa data / data lama / perlu dicek (luar batas) / aman. */
export function statusSensor(v: unknown, k: KunciHp, ambang: Ambang, segar: boolean, adaData: boolean): StatusHp {
  if (nilaiAngka(v) === null) return { teks: 'Menunggu data', tone: '' }
  if (!adaData || !segar) return { teks: 'Data lama', tone: '' }
  const a = ambang?.[k]
  const n = nilaiAngka(v) as number
  const lo = nilaiAngka(a?.min), hi = nilaiAngka(a?.max)
  if (lo !== null && hi !== null && lo < hi && (n < lo || n > hi)) return { teks: 'Perlu dicek', tone: 'bahaya' }
  return { teks: 'Aman', tone: 'ok' }
}

export const jamId = (iso?: string | null) => {
  const d = iso ? new Date(iso) : null
  return d && !Number.isNaN(d.getTime()) ? `${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')}` : '—'
}
