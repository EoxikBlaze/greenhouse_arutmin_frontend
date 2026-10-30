/** Manajemen User — data & fungsi murni (tanpa React). Kontrak GET /user: id, username, email, level, is_demo. */

export type UserRow = {
  id?: string | number
  username?: string
  email?: string | null
  level?: string | null
  is_demo?: boolean
}

export const LEVELS = ['admin', 'user', 'petani'] as const
export type Level = (typeof LEVELS)[number]

/**
 * Akses per level — mengikuti router.tsx: admin membuka semua menu; level lain
 * (user/petani) hanya menu ALL, dan backend menolak rute pengelola (403).
 */
export const LEVEL_INFO: Record<Level, { label: string; ringkas: string; akses: string[] }> = {
  admin: {
    label: 'Admin',
    ringkas: 'Kelola semua menu dan akun',
    akses: ['Semua menu kebun', 'Master Data & Siklus Tanam', 'Laporan, Riwayat Audit, Manajemen User'],
  },
  user: {
    label: 'User',
    ringkas: 'Memantau kebun, tanpa menu kelola',
    akses: ['Dashboard, Sensor, Kebun Saya', 'CCTV & Asisten AI', 'Profile sendiri'],
  },
  petani: {
    label: 'Petani',
    ringkas: 'Fokus pada kebun harian',
    akses: ['Dashboard, Sensor, Kebun Saya', 'CCTV & Asisten AI', 'Profile sendiri'],
  },
}

export function infoLevel(level?: string | null) {
  return LEVEL_INFO[String(level ?? '').toLowerCase() as Level]
}

/** Dua huruf awal untuk avatar: "budi_santoso" → "BS", "garap" → "GA". */
export function inisial(nama?: string | null): string {
  const bagian = String(nama ?? '')
    .trim()
    .split(/[\s._-]+/)
    .filter(Boolean)
  if (bagian.length === 0) return '?'
  if (bagian.length === 1) return bagian[0].slice(0, 2).toUpperCase()
  return (bagian[0][0] + bagian[1][0]).toUpperCase()
}

/** Cari di username/email (tanpa beda huruf) + filter level opsional. */
export function saring(rows: UserRow[], kata: string, level: string | null): UserRow[] {
  const k = kata.trim().toLowerCase()
  return rows.filter((r) => {
    if (level && String(r.level ?? '').toLowerCase() !== level) return false
    if (!k) return true
    return `${r.username ?? ''} ${r.email ?? ''}`.toLowerCase().includes(k)
  })
}

export function hitungPerLevel(rows: UserRow[]): Record<Level, number> {
  const hasil: Record<Level, number> = { admin: 0, user: 0, petani: 0 }
  for (const r of rows) {
    const l = String(r.level ?? '').toLowerCase() as Level
    if (l in hasil) hasil[l] += 1
  }
  return hasil
}

export type Kekuatan = { skor: 0 | 1 | 2 | 3; label: string }

/** Penilaian sederhana untuk meter: panjang + variasi huruf besar/kecil, angka, simbol. */
export function kekuatanPassword(pw: string): Kekuatan {
  if (!pw) return { skor: 0, label: '' }
  const variasi = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(pw)).length
  if (pw.length < 8) return { skor: 1, label: 'Terlalu pendek' }
  if (pw.length >= 12 && variasi >= 3) return { skor: 3, label: 'Kuat' }
  if (variasi >= 2) return { skor: 2, label: 'Cukup' }
  return { skor: 1, label: 'Lemah' }
}

const HURUF = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/** Password acak 12 karakter (tanpa karakter mirip: 0/O, 1/l/I), dijamin memuat huruf besar, kecil, dan angka. */
export function buatPassword(panjang = 12): string {
  const ambil = (set: string, n: number) => {
    const buf = new Uint32Array(n)
    crypto.getRandomValues(buf)
    return Array.from(buf, (v) => set[v % set.length])
  }
  const wajib = [...ambil('abcdefghjkmnpqrstuvwxyz', 1), ...ambil('ABCDEFGHJKLMNPQRSTUVWXYZ', 1), ...ambil('23456789', 1)]
  const sisa = ambil(HURUF, Math.max(0, panjang - wajib.length))
  const semua = [...wajib, ...sisa]
  const urut = new Uint32Array(semua.length)
  crypto.getRandomValues(urut)
  return semua
    .map((c, i) => ({ c, o: urut[i] }))
    .sort((a, b) => a.o - b.o)
    .map((x) => x.c)
    .join('')
}
