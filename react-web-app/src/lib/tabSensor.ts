/**
 * Tab grafik sensor — SATU definisi untuk halaman Sensor dan kartu "Tren sensor" di Dashboard,
 * supaya nama, urutan, dan isinya selalu sama. "Nutrisi" = ppm (atau EC, ppm = EC × 500) dengan garis target.
 */
export type TabGrafik = 'semua' | 'nutrisi' | 'ph' | 'waterTemp' | 'airTemp' | 'humidity'

export const TAB_GRAFIK: readonly { id: TabGrafik; label: string }[] = [
  { id: 'semua', label: 'Semua' },
  { id: 'ph', label: 'pH' },
  { id: 'nutrisi', label: 'Nutrisi' },
  { id: 'waterTemp', label: 'Suhu Air' },
  { id: 'airTemp', label: 'Suhu Udara' },
  { id: 'humidity', label: 'Kelembapan' },
]

/** Tab untuk kartu ringkas di Dashboard: tanpa "Semua" (Sensor sudah menampilkan semuanya). */
export const TAB_TREN = TAB_GRAFIK.filter((t) => t.id !== 'semua')

/** Nilai ?tab= pada alamat halaman Sensor → tab sah, atau null. */
export function tabDariQuery(v: string | null | undefined): TabGrafik | null {
  return TAB_GRAFIK.find((t) => t.id === v)?.id ?? null
}

/** Rentang grafik bawaan (hari) — sama di Sensor dan Dashboard. */
export const HARI_BAWAAN = 3
