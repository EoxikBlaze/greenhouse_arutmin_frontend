/** Uji Lab hasil panen (GET/POST /uji-lab). Melon = Buah (bawaan). */
export type KategoriUji = 'buah' | 'sayur'
export type SpekParameter = { nama: string; satuan: string; min: number; max: number }
export type SpekUjiLab = Record<KategoriUji, Record<string, SpekParameter>>
export type HasilUjiLab = {
  id: number | string
  kategori: KategoriUji
  tanggal: string
  parameter: string
  nilai: number
  satuan: string | null
  catatan: string | null
  dicatat_oleh: string | null
}

export const KATEGORI_UJI: ReadonlyArray<{ kode: KategoriUji; nama: string }> = [
  { kode: 'buah', nama: 'Buah' },
  { kode: 'sayur', nama: 'Sayur' },
]
export const KATEGORI_BAWAAN: KategoriUji = 'buah'

/** Isian form → badan POST: hanya kolom yang terisi; null bila tak ada satupun / ada yang di luar rentang. */
export function susunHasil(
  spek: Record<string, SpekParameter>,
  isian: Record<string, string>,
): { hasil: Array<{ parameter: string; nilai: number }>; galat: string | null } {
  const hasil: Array<{ parameter: string; nilai: number }> = []
  for (const [kode, s] of Object.entries(spek)) {
    const mentah = (isian[kode] ?? '').trim()
    if (!mentah) continue
    const n = Number(mentah.replace(',', '.'))
    if (!Number.isFinite(n) || n < s.min || n > s.max) return { hasil: [], galat: `${s.nama} harus angka ${s.min}–${s.max}.` }
    hasil.push({ parameter: kode, nilai: n })
  }
  return { hasil, galat: hasil.length ? null : 'Isi minimal satu parameter.' }
}

/** Titik grafik satu parameter: urut tanggal naik. */
export function titikGrafik(daftar: HasilUjiLab[], parameter: string): Array<{ tanggal: string; nilai: number }> {
  return daftar
    .filter((h) => h.parameter === parameter)
    .map((h) => ({ tanggal: h.tanggal.slice(0, 10), nilai: Number(h.nilai) }))
    .sort((a, b) => a.tanggal.localeCompare(b.tanggal))
}
