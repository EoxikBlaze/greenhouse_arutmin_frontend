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
  /** Akar batch (semais.id_semai) — kurva nutrisi disimpan per batch di sana. */
  id_semai?: string | number | null
  /** Resep nutrisi batch & target hari ini (null bila resep belum diatur). hari_semai: hari pertama = 0. */
  nutrisi?: {
    kurva:
      | { cara: 'harian'; ppm_awal: number; ppm_target: number; hari_capai: number; diubah_hari: number | null }
      | { cara: 'tahap'; ppm_semai: number; ppm_peremajaan: number; ppm_pendewasaan: number }
      | null
    hari_semai?: number | null
    hari_netpot: number | null
    target_hari_ini: number | null
    per_hari: number | null
    ph_min?: number | null
    ph_max?: number | null
  } | null
}

export const TAHAP_LABEL: Record<string, string> = {
  semai: 'Penyemaian',
  peremajaan: 'Peremajaan',
  pendewasaan: 'Pendewasaan',
  panen: 'Panen',
}

export const FILTER_TAHAP = ['Semua', 'Semai', 'Peremajaan', 'Pendewasaan'] as const
export type FilterTahap = (typeof FILTER_TAHAP)[number]

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

const KUNCI_PPM_TAHAP = { semai: 'ppm_semai', peremajaan: 'ppm_peremajaan', pendewasaan: 'ppm_pendewasaan' } as const

/**
 * Apa yang terjadi pada nutrisi bila petani mengonfirmasi pindah tahap. Per siklus: ppm tahap berikutnya BARU mulai
 * setelah konfirmasi; per hari: tidak berubah (naik tiap hari sejak Mulai Semai, tanpa menunggu klik).
 */
export function infoNutrisiPindah(r: TanamRow): string {
  const n = r.nutrisi
  const k = n?.kurva
  if (!k) return 'Target nutrisi batch ini belum diatur, jadi tidak ada perubahan ppm.'
  if (k.cara === 'harian') {
    const hariIni = n?.target_hari_ini != null ? ` (hari ini ${n.target_hari_ini} ppm)` : ''
    return `Target nutrisi tidak berubah: naik per hari${hariIni}, tidak menunggu pindah tahap.`
  }
  if (r.tahap_berikut === 'panen') {
    return 'Setelah panen dicatat, alat berhenti menjaga penampung ini bila tidak ada batch lain di mejanya.'
  }
  const sekarang = k[KUNCI_PPM_TAHAP[r.tipe as keyof typeof KUNCI_PPM_TAHAP]]
  const depan = k[KUNCI_PPM_TAHAP[(r.tahap_berikut ?? '') as keyof typeof KUNCI_PPM_TAHAP]]
  if (sekarang == null || depan == null) return 'Target nutrisi tahap berikutnya mengikuti resep batch.'
  return `Target nutrisi naik ${sekarang} → ${depan} ppm mulai setelah Anda menekan konfirmasi. Alat menaikkannya bertahap (maks 150 ppm sekali dosing), jadi butuh beberapa jam.`
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

/**
 * Contoh kurva naik harian — rumus SAMA dengan server (presetDosing.naikHarian):
 * target hari ke-h = min(target, awal + (target − awal) / hari × h), dibulatkan ke ppm.
 * Mengembalikan hari 0, 1, 2, 3, … (dipadatkan) sampai hari tercapai; null bila isian belum lengkap.
 */
export function kurvaNaikHarian(
  awal: number | null,
  target: number | null,
  hari: number | null,
  maksBaris = 8,
): Array<{ hari: number; ppm: number }> | null {
  if (awal == null || target == null || !hari || hari <= 0 || !Number.isInteger(hari) || target < awal) return null
  const per = (target - awal) / hari
  const nilai = (h: number) => ({ hari: h, ppm: Math.round(Math.min(target, awal + per * h)) })
  if (hari + 1 <= maksBaris) return Array.from({ length: hari + 1 }, (_, h) => nilai(h))
  const awalan = [0, 1, 2, 3].map(nilai)
  const sisa = maksBaris - awalan.length - 1
  const tengah = Array.from({ length: sisa }, (_, i) => nilai(Math.round(((i + 1) * hari) / (sisa + 1))))
  return [...awalan, ...tengah.filter((t) => t.hari > 3 && t.hari < hari), nilai(hari)]
}

/** Di menu mana kekurangan alat (kata firmware `kurang`) dilengkapi. */
export function petunjukKurang(kurang: string | null | undefined): string {
  const k = (kurang || '').toLowerCase()
  if (k.startsWith('kal') || k.startsWith('laju')) return 'menu Kalibrasi'
  if (k.startsWith('uji lab')) return 'menu Uji Lab'
  if (k.startsWith('volume') || k.startsWith('monitoring') || k.startsWith('jeda')) return 'Master Data → Meja Tanaman'
  if (k.startsWith('ads')) return 'cek sensor ADS1115 di alat'
  return 'menu Kalibrasi, Uji Lab, atau Meja Tanaman'
}
