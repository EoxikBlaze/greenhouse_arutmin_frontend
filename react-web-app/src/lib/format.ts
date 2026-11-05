/** Format tanggal/angka gaya Indonesia — satu sumber untuk semua halaman (dulu `tgl()` ditulis ulang di 7 file). */

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const dua = (n: number) => String(n).padStart(2, '0')

function tanggalDari(v: number | string | null | undefined): Date | null {
  if (v === null || v === undefined || v === '') return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

/** "19 Agu 2026" (waktu lokal); "—" bila kosong atau tak valid. */
export function tglPendek(v: number | string | null | undefined): string {
  const d = tanggalDari(v)
  return d ? `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}` : '—'
}

/** "19 Agu 2026 · 14:05"; `tahun: false` → "19 Agu · 14:05". "—" bila kosong atau tak valid. */
export function tglJam(v: number | string | null | undefined, { tahun = true } = {}): string {
  const d = tanggalDari(v)
  if (!d) return '—'
  const hari = `${d.getDate()} ${BULAN[d.getMonth()]}${tahun ? ` ${d.getFullYear()}` : ''}`
  return `${hari} · ${dua(d.getHours())}:${dua(d.getMinutes())}`
}

/** "2026-10-21" (tanggal lokal) — format nilai <input type="date">. */
export function tanggalIso(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${dua(d.getMonth() + 1)}-${dua(d.getDate())}`
}

/** Angka gaya Indonesia dengan jumlah desimal tetap: 6,20 · 1.250 */
export function angkaId(v: number, digit: number): string {
  return v.toLocaleString('id-ID', { minimumFractionDigits: digit, maximumFractionDigits: digit })
}

/** Angka gaya Indonesia, desimal secukupnya sampai `maks`: 2.400 · 33,3 */
export function angkaMaks(v: number, maks: number): string {
  return v.toLocaleString('id-ID', { maximumFractionDigits: maks })
}
