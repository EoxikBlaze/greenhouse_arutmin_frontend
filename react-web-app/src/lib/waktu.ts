const BULAN_PANJANG = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

/** "3 menit lalu" / "2 hari lalu" — untuk menandai bacaan yang basi. */
export function relatif(ms: number): string {
  const dtk = Math.max(0, Math.round(ms / 1000))
  if (dtk < 60) return `${dtk} detik lalu`
  const mnt = Math.round(dtk / 60)
  if (mnt < 60) return `${mnt} menit lalu`
  const jamLalu = Math.round(mnt / 60)
  if (jamLalu < 48) return `${jamLalu} jam lalu`
  return `${Math.round(jamLalu / 24)} hari lalu`
}

/** "7 hari lalu (11 Oktober 2026, 10:23)" — relatif + tanggal lengkap; "—" bila waktu tak valid. */
export function waktuBasi(ms: number, iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const jam = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return `${relatif(ms)} (${d.getDate()} ${BULAN_PANJANG[d.getMonth()]} ${d.getFullYear()}, ${jam})`
}
