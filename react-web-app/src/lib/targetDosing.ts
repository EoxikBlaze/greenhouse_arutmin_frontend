/**
 * Target dosing per jenis tanaman (target awal, target akhir, hari mencapai) — logika murni untuk halaman Jenis Tanaman.
 * Data: GET /dosing/naik-harian · PUT /dosing/naik-harian/:id_tanaman { ppm_awal, ppm_target, hari_capai } (routes/preset.js).
 * Aturan database (CHECK tanamen_naik_harian_cek): ketiganya terisi ATAU ketiganya kosong. Rentang (50–2500 ppm, 1–365 hari,
 * awal ≤ akhir) divalidasi server; klien hanya memeriksa bentuk. TIDAK ADA nilai bawaan: angka agronomi diisi pemilik.
 */

export type TargetDosingForm = { ppm_awal?: string; ppm_target?: string; hari_capai?: string }

export type NaikBaris = {
  id_tanaman: number | string
  ppm_awal: string | number | null
  ppm_target: string | number | null
  hari_capai: string | number | null
}

const KUNCI = ['ppm_awal', 'ppm_target', 'hari_capai'] as const
const kosong = (v?: string) => (v ?? '').trim() === ''

/** '' → null; koma dianggap desimal ('1200,5' → 1200.5); bukan angka → NaN. */
export function angkaOpsional(v?: string): number | null {
  const t = (v ?? '').trim().replace(',', '.')
  if (t === '') return null
  const n = Number(t)
  return Number.isFinite(n) ? n : Number.NaN
}

/** Galat per field (kosong = sah). Hanya bentuk; rentang agronomi tetap urusan server. */
export function validasiTargetDosing(f: TargetDosingForm): Record<string, string[]> {
  const err: Record<string, string[]> = {}
  if (KUNCI.every((k) => kosong(f[k]))) return err
  for (const k of KUNCI) {
    if (kosong(f[k])) err[k] = ['Isi ketiga kolom target nutrisi, atau kosongkan semuanya.']
    else if (Number.isNaN(angkaOpsional(f[k]))) err[k] = ['Harus berupa angka.']
  }
  return err
}

/** Body PUT: semua null = matikan target dosing tanaman ini (kembali ke preset per tahap). */
export function bodyTargetDosing(f: TargetDosingForm) {
  return { ppm_awal: angkaOpsional(f.ppm_awal), ppm_target: angkaOpsional(f.ppm_target), hari_capai: angkaOpsional(f.hari_capai) }
}

/** Nilai awal form dari data server (kosong bila belum diatur — tanpa angka bawaan). */
export function formDariNaik(n?: NaikBaris | null): Required<TargetDosingForm> {
  const s = (v: string | number | null | undefined) => (v == null || v === '' ? '' : String(Number(v)))
  return { ppm_awal: s(n?.ppm_awal), ppm_target: s(n?.ppm_target), hari_capai: s(n?.hari_capai) }
}

/** Apakah isian berbeda dari data server (supaya PUT hanya dikirim bila perlu). */
export function targetBerubah(f: TargetDosingForm, n?: NaikBaris | null): boolean {
  const baru = bodyTargetDosing(f)
  const lama = bodyTargetDosing(formDariNaik(n))
  return KUNCI.some((k) => baru[k] !== lama[k])
}
