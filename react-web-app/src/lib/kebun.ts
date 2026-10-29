/** Satu baris `list` dari GET /tanam (routes/tanam.js — UNION semai/peremajaan/pendewasaan + hitungan server). */
export type TanamRow = {
  id: string | number
  tipe: string
  status?: string | null
  mulai?: string | null
  varietas?: string | null
  meja?: string | null
  jumlah_benih?: number | null
  jumlah_masuk?: number | null
  /** Lama tahap (hari) dari tabel sikluses; null bila admin belum mengisinya. */
  durasi_hari?: number | null
  hari_ke?: number | null
  siap?: boolean
  tahap_berikut?: string | null
}

export const TAHAP_LABEL: Record<string, string> = {
  semai: 'Penyemaian',
  peremajaan: 'Peremajaan',
  pendewasaan: 'Pendewasaan',
  panen: 'Panen',
}

export const FILTER_TAHAP = ['Semua', 'Semai', 'Peremajaan', 'Pendewasaan'] as const
export type FilterTahap = (typeof FILTER_TAHAP)[number]

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

/** "19 Agu 2026"; "—" bila tanggal tak valid. */
export function tglPendek(ms: number | string | null | undefined): string {
  if (ms === null || ms === undefined || ms === '') return '—'
  const d = new Date(ms)
  if (Number.isNaN(d.getTime())) return '—'
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`
}

/** `lewat` = berapa hari melampaui durasi tahap (0 bila belum). */
export type Progres = { hari: number; durasi: number | null; persen: number; label: string; lewat: number }

export function progres(r: TanamRow): Progres {
  const hari = r.hari_ke ?? 1
  const durasi = r.durasi_hari ?? null
  if (durasi === null || durasi <= 0) return { hari, durasi: null, persen: 0, label: `Hari ke-${hari}`, lewat: 0 }
  return {
    hari,
    durasi,
    persen: Math.min(100, Math.round((hari / durasi) * 100)),
    label: `Hari ke-${hari} dari ${durasi}`,
    lewat: Math.max(0, hari - durasi),
  }
}

/** Lencana "siap" bila server menandai tahap ini cukup umur; null bila belum. */
export function labelSiap(r: TanamRow): string | null {
  if (!r.siap) return null
  return r.tahap_berikut === 'panen' ? 'Siap panen' : `Siap pindah ke ${TAHAP_LABEL[r.tahap_berikut ?? ''] ?? 'tahap berikutnya'}`
}

export function ringkasBatch(rows: TanamRow[]): { aktif: number; siap: number; meja: number } {
  return {
    aktif: rows.length,
    siap: rows.filter((r) => r.siap).length,
    meja: new Set(rows.map((r) => (r.meja ?? '').trim()).filter(Boolean)).size,
  }
}

export function saring(rows: TanamRow[], q: string, tahap: FilterTahap): TanamRow[] {
  const kata = q.trim().toLowerCase()
  const kunci = tahap === 'Semua' ? null : tahap.toLowerCase()
  return rows.filter((r) => {
    if (kunci && r.tipe !== kunci) return false
    if (!kata) return true
    return `${r.varietas ?? ''} ${r.meja ?? ''} ${TAHAP_LABEL[r.tipe] ?? r.tipe} ${r.status ?? ''}`.toLowerCase().includes(kata)
  })
}

/** Tanggal mulai + durasi hari (ms); null bila salah satunya tak ada/tak valid. */
export function perkiraanSelesai(mulai: string | null | undefined, durasi: number | null | undefined): number | null {
  if (!mulai || durasi == null || durasi <= 0) return null
  const d = new Date(mulai)
  if (Number.isNaN(d.getTime())) return null
  d.setDate(d.getDate() + durasi)
  return d.getTime()
}

/** Kenaikan ppm per hari = (target − awal) / hari; null bila belum lengkap atau target di bawah awal. */
export function kenaikanPerHari(awal: number | null, target: number | null, hari: number | null): number | null {
  if (awal == null || target == null || !hari || hari <= 0 || target < awal) return null
  return (target - awal) / hari
}
