import { api } from './api'

/**
 * Analitik (read-only, semua role) — backend: GET /api/analitik/*
 *   prediksi-panen · saran-dosis?jam=6 · ekspor/{sensor|peringatan|panen}.csv?dari&sampai
 */

export type StatusPrediksi = 'sesuai' | 'segera' | 'terlambat'
export type ItemPrediksi = {
  tipe: 'semai' | 'peremajaan' | 'pendewasaan'
  id: number
  varietas: string | null
  meja: string | null
  mulai: string
  prediksi: null | { tgl_prediksi: string; sisa_hari: number; status: StatusPrediksi }
}
export type ResponPrediksi = { status: boolean; list: ItemPrediksi[]; tanpa_prediksi: number }

export type StatusSaran = 'aman' | 'perhatian' | 'di_luar' | 'data_kurang'
export type ItemSaran = {
  sensor: 'ph' | 'tds'
  status: StatusSaran
  nilai?: number
  saran: string
  perkiraan_jam_ke_batas?: number
}
export type ResponSaran = {
  status: boolean
  jendela_jam: number
  jumlah_bacaan: number
  saran: ItemSaran[]
  catatan: string
}

export type JenisEkspor = 'sensor' | 'peringatan' | 'panen'

/** URL ekspor CSV; tanggal kosong tidak dikirim (backend memakai default). */
export function urlEkspor(jenis: JenisEkspor, dari: string, sampai: string): string {
  const q = new URLSearchParams()
  if (dari) q.set('dari', dari)
  if (sampai) q.set('sampai', sampai)
  const qs = q.toString()
  return `/api/analitik/ekspor/${jenis}.csv${qs ? `?${qs}` : ''}`
}

/** Unduh CSV lewat axios (Bearer + cookie ikut) lalu simpan via tautan sementara. Melempar Error berpesan ramah. */
export async function unduhCsv(jenis: JenisEkspor, dari: string, sampai: string): Promise<void> {
  try {
    const res = await api.get(urlEkspor(jenis, dari, sampai), { responseType: 'blob' })
    const url = URL.createObjectURL(res.data as Blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${jenis}${dari ? `_${dari}` : ''}${sampai ? `_${sampai}` : ''}.csv`
    a.click()
    URL.revokeObjectURL(url)
  } catch (err) {
    const status = (err as { response?: { status?: number } })?.response?.status
    throw new Error(
      status === 422
        ? 'Tanggal tidak valid. Gunakan format YYYY-MM-DD dan pastikan "dari" tidak melewati "sampai".'
        : 'Gagal mengunduh CSV. Periksa koneksi lalu coba lagi.',
    )
  }
}
