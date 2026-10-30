/** Tipe dan aturan riwayat chat Asisten AI (dipisah dari komponen supaya bisa diuji). */

export type Tabel = { judul: string; kolom: string[]; baris: string[][] }

export type Pesan = {
  id: number
  peran: 'user' | 'ai'
  teks: string
  waktu: number
  sumber?: string
  status?: 'OK' | 'PERHATIAN' | 'KRITIS'
  tabel?: Tabel[]
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

