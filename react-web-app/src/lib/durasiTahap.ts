/**
 * Durasi tiga tahap tanam (Semai → Peremajaan → Pendewasaan) dalam hari.
 * Petani sering hanya tahu TOTAL semai sampai panen, jadi total boleh diisi saja lalu dibagi otomatis.
 * Pembagian bawaan hanya perkiraan awal (20% / 35% / 45%); perkiraan tanggal panen hanya bergantung pada
 * total, sedangkan pengingat pindah tahap memakai pembagian ini, jadi angka per tahap boleh diubah.
 */
export type DurasiTahap = { semai: number; peremajaan: number; pendewasaan: number }

export const BAGI_DURASI = { semai: 0.2, peremajaan: 0.35 } as const
export const TOTAL_MIN = 3
export const TOTAL_MAKS = 365

/** Bilangan bulat 1–365 dari teks isian; selain itu null. */
export function hariBulat(v: string | number | null | undefined): number | null {
  const t = String(v ?? '').trim()
  return /^\d+$/.test(t) && Number(t) >= 1 && Number(t) <= 365 ? Number(t) : null
}

/** Total hari bulat TOTAL_MIN–TOTAL_MAKS dari teks isian; selain itu null. */
export function totalBulat(v: string | number | null | undefined): number | null {
  const t = String(v ?? '').trim()
  return /^\d+$/.test(t) && Number(t) >= TOTAL_MIN && Number(t) <= TOTAL_MAKS ? Number(t) : null
}

/** Bagi total ke tiga tahap; tiap tahap minimal 1 hari dan jumlahnya persis sama dengan total. */
export function bagiDurasi(total: number | null): DurasiTahap | null {
  if (total == null || !Number.isInteger(total) || total < TOTAL_MIN) return null
  const semai = Math.max(1, Math.round(total * BAGI_DURASI.semai))
  const peremajaan = Math.max(1, Math.round(total * BAGI_DURASI.peremajaan))
  const pendewasaan = total - semai - peremajaan
  return pendewasaan >= 1 ? { semai, peremajaan, pendewasaan } : { semai: 1, peremajaan: 1, pendewasaan: total - 2 }
}

export const jumlahTahap = (d: DurasiTahap | null): number | null => (d ? d.semai + d.peremajaan + d.pendewasaan : null)

/**
 * Durasi efektif dari isian form: ketiga tahap lengkap → dipakai apa adanya (total = jumlahnya);
 * selainnya total saja → dibagi otomatis. null = belum diisi / tidak sah.
 */
export function durasiDariIsian(total: string, semai: string, peremajaan: string, pendewasaan: string): DurasiTahap | null {
  const [a, b, c] = [hariBulat(semai), hariBulat(peremajaan), hariBulat(pendewasaan)]
  if (a != null && b != null && c != null) return { semai: a, peremajaan: b, pendewasaan: c }
  return bagiDurasi(totalBulat(total))
}

/** Isian form dari durasi tersimpan: total + tahap hanya bila berbeda dari pembagian otomatis total itu. */
export function isianDurasi(d: DurasiTahap | null): Record<'dur_total' | 'dur_semai' | 'dur_peremajaan' | 'dur_pendewasaan', string> {
  if (!d) return { dur_total: '', dur_semai: '', dur_peremajaan: '', dur_pendewasaan: '' }
  const total = jumlahTahap(d)
  const oto = bagiDurasi(total)
  const sama = !!oto && oto.semai === d.semai && oto.peremajaan === d.peremajaan && oto.pendewasaan === d.pendewasaan
  return {
    dur_total: String(total),
    dur_semai: sama ? '' : String(d.semai),
    dur_peremajaan: sama ? '' : String(d.peremajaan),
    dur_pendewasaan: sama ? '' : String(d.pendewasaan),
  }
}

/** Durasi tiga tahap dari angka mentah server (null/teks); null bila ada yang kosong. */
export function durasiDariServer(s: unknown, p: unknown, d: unknown): DurasiTahap | null {
  const [a, b, c] = [s, p, d].map((v) => (v == null || v === '' ? NaN : Number(v)))
  return [a, b, c].every((v) => Number.isInteger(v) && v >= 1) ? { semai: a, peremajaan: b, pendewasaan: c } : null
}

/** Isian kosong semua? */
export const kosongSemua = (...v: (string | undefined)[]) => v.every((x) => (x ?? '').trim() === '')

/** Teks ringkas "33 hari (7 + 12 + 14)" atau null. */
export function ringkasDurasi(d: DurasiTahap | null): string | null {
  const t = jumlahTahap(d)
  return d && t != null ? `${t} hari (${d.semai} + ${d.peremajaan} + ${d.pendewasaan})` : null
}
