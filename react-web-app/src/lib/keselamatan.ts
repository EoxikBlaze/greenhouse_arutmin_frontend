import { useApiObject } from './useApiObject'

/** GET /dashboard/keselamatan — null pada field = alat belum pernah melaporkannya (bukan "aman"). */
export type StatusKeselamatan = {
  estop_server: boolean
  estop_server_sejak: string | null
  perangkat: string | null
  estop_alat: boolean | null
  estop_fisik: boolean | null
  estop_diperbarui_pada: string | null
  reset_terakhir_pada: string | null
  reset_baru: boolean
  terakhir_terlihat: string | null
  eksekusi_dosing_diizinkan: boolean
}

export type PeringatanKeselamatan = { kode: 'estop_fisik' | 'estop' | 'reset'; tingkat: 'merah' | 'kuning'; teks: string }

/** Peringatan yang wajib tampil di semua halaman. E-STOP mengalahkan RESET. */
export function peringatanKeselamatan(s: StatusKeselamatan | null): PeringatanKeselamatan[] {
  if (!s) return []
  const out: PeringatanKeselamatan[] = []
  if (s.estop_fisik) {
    out.push({ kode: 'estop_fisik', tingkat: 'merah', teks: 'Tombol E-STOP fisik di box panel ditekan. Semua pompa dimatikan alat. Lepas tombol setelah area aman.' })
  } else if (s.estop_server || s.estop_alat) {
    out.push({ kode: 'estop', tingkat: 'merah', teks: 'E-STOP aktif. Semua pompa terkunci sampai admin mereset E-STOP.' })
  }
  if (s.reset_baru) out.push({ kode: 'reset', tingkat: 'kuning', teks: 'Tombol RESET fisik ESP32 baru saja ditekan. Periksa kondisi alat di box panel.' })
  return out
}

/** Dipoll 10 dtk: E-STOP harus terlihat cepat, tetapi endpoint ini hanya 2 query ringan. */
export function useKeselamatan() {
  return useApiObject<StatusKeselamatan>('/dashboard/keselamatan', { pollMs: 10_000 })
}
