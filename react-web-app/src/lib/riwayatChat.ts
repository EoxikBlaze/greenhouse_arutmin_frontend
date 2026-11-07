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

export type GambarPanduan = { url: string; judul: string; kenapa?: string }

export type Pesan = {
  id: number
  peran: 'user' | 'ai'
  teks: string
  waktu: number
  sumber?: string
  status?: 'OK' | 'PERHATIAN' | 'KRITIS'
  tabel?: Tabel[]
  tautan?: Tautan[]
  gambar?: GambarPanduan[]
  saran_pertanyaan?: string[]
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


/* ── Riwayat chat: tetap ada saat pindah halaman atau refresh tab ── */
const AWALAN_CHAT = 'vsf-chat:'
const MAKS_SIMPAN = 50

/** Kunci per pengguna supaya akun lain tidak melihat riwayat akun lain. */
export const kunciChat = (username: string) => `${AWALAN_CHAT}${username || '-'}`

export function muatChat(username: string): Pesan[] {
  try {
    const k = kunciChat(username)
    const raw = localStorage.getItem(k) || sessionStorage.getItem(k)
    const data: unknown = raw ? JSON.parse(raw) : []
    if (!Array.isArray(data)) return []
    return data
      .filter(
        (p): p is Pesan =>
          !!p && typeof p === 'object' && (p.peran === 'user' || p.peran === 'ai') && typeof p.teks === 'string' &&
          typeof p.id === 'number' && typeof p.waktu === 'number',
      )
      .map((p) => ({ ...p, tautan: tautanAman(p.tautan) }))
      .slice(-MAKS_SIMPAN)
  } catch {
    return []
  }
}

export function simpanChat(username: string, pesan: Pesan[]): void {
  try {
    const k = kunciChat(username)
    if (pesan.length === 0) {
      localStorage.removeItem(k)
      sessionStorage.removeItem(k)
    } else {
      const val = JSON.stringify(pesan.slice(-MAKS_SIMPAN))
      localStorage.setItem(k, val)
      sessionStorage.setItem(k, val)
    }
  } catch {
    /* penyimpanan tidak tersedia (mode privat/penuh): chat tetap jalan, hanya tidak bertahan */
  }
}

/** Dipanggil saat keluar: hapus semua riwayat chat. */
export function hapusSemuaChat(): void {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i)
      if (k && k.startsWith(AWALAN_CHAT)) localStorage.removeItem(k)
    }
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const k = sessionStorage.key(i)
      if (k && k.startsWith(AWALAN_CHAT)) sessionStorage.removeItem(k)
    }
  } catch {
    /* abaikan */
  }
}
