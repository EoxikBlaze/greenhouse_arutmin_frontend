/**
 * Membaca keluaran perintah konsol `param` firmware v6 (HidroponikV6.ino CetakParameter):
 *   "  persen_dosis             = 80"
 *   "  volume_l                 = 0   <- WAJIB, belum diisi"
 * Keluaran konsol alat dibatasi ±900 karakter, jadi baris terakhir bisa terpotong (terutama saat nilai wajib
 * belum diisi): parameter yang tidak muncul ditandai "tidak terbaca", bukan dianggap beda.
 */
export function bacaKeluaranParam(teks: string | null | undefined): Map<string, number> {
  const hasil = new Map<string, number>()
  const isi = String(teks ?? '')
  const semua = isi.split(/\r?\n/)
  // baris terakhir tanpa ganti baris = mungkin terpotong di tengah angka ("80" terbaca "8"): diabaikan
  if (!isi.endsWith('\n')) semua.pop()
  for (const baris of semua) {
    const m = /^\s*([a-z_][a-z0-9_]*)\s*=\s*(-?\d+(?:\.\d+)?(?:e[-+]?\d+)?)\b/i.exec(baris)
    if (m) hasil.set(m[1], Number(m[2]))
  }
  return hasil
}

export type Banding = { param: string; web: number; alat: number | null; status: 'cocok' | 'beda' | 'tidak_terbaca' }

/** Bandingkan nilai web dengan nilai alat. Firmware mencetak dengan %g (6 digit bermakna), jadi selisih pembulatan kecil dianggap cocok. */
export function bandingkanParam(web: { param: string; nilai: number }[], alat: Map<string, number>): Banding[] {
  return web.map((p) => {
    const a = alat.get(p.param)
    if (a === undefined) return { param: p.param, web: p.nilai, alat: null, status: 'tidak_terbaca' }
    const toleransi = Math.max(1e-6, Math.abs(p.nilai) * 1e-5)
    return { param: p.param, web: p.nilai, alat: a, status: Math.abs(a - p.nilai) <= toleransi ? 'cocok' : 'beda' }
  })
}
