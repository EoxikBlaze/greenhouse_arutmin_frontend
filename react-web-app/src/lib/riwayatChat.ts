/** Tipe dan aturan riwayat chat Asisten AI (dipisah dari komponen supaya bisa diuji). */

export type Tabel = { judul: string; kolom: string[]; baris: string[][] }

/** Tautan ke halaman aplikasi yang dipilih SERVER (bukan ditulis model). */
export type Tautan = { label: string; to: string }

/** Jalur internal sederhana saja: "/halaman" (huruf kecil, angka, strip). Tanpa host, query, atau "//". */
const JALUR_SAH = /^\/[a-z0-9-]{1,40}$/

/** Saring tautan dari server sebelum dirender: bentuk harus benar, label teks pendek, maksimal 5. */
export function tautanAman(data: unknown): Tautan[] {
  if (!Array.isArray(data)) return []
  const out: Tautan[] = []
  for (const t of data) {
    const to = (t as { to?: unknown } | null)?.to
    const label = (t as { label?: unknown } | null)?.label
    if (typeof to !== 'string' || typeof label !== 'string') continue
    if (!JALUR_SAH.test(to) || label.length === 0 || label.length > 40) continue
    if (out.some((o) => o.to === to)) continue
    out.push({ to, label })
    if (out.length >= 5) break
  }
  return out
}

export type Pesan = {
  id: number
  peran: 'user' | 'ai'
  teks: string
  waktu: number
  sumber?: string
  status?: 'OK' | 'PERHATIAN' | 'KRITIS'
  tabel?: Tabel[]
  tautan?: Tautan[]
  galat?: boolean
  /** Untuk pesan galat: teks pengguna yang gagal, dipakai tombol "Coba lagi". */
  ulang?: string
}

/**
 * Riwayat untuk server: pasangan tanya-jawab yang ditolak/galat dibuang UTUH.
 * Dulu hanya jawabannya yang dibuang → pertanyaan luar topik ikut terkirim dan
 * membuat pertanyaan sah berikutnya ditolak juga.
 */
export function riwayatUntukServer(pesan: Pesan[]) {
  const out: Pesan[] = []
  for (const p of pesan) {
    if (p.peran === 'ai' && (p.galat || p.sumber === 'tolak')) {
      if (out.length && out[out.length - 1].peran === 'user') out.pop()
      continue
    }
    out.push(p)
  }
  return out.slice(-8).map((p) => ({ peran: p.peran, teks: p.teks }))
}

