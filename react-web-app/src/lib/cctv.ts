export type Tipe = 'mjpeg' | 'snapshot' | 'rtsp'

export type Kamera = {
  id: number | string
  nama: string
  lokasi: string | null
  tipe: Tipe
  /** null untuk 'rtsp' bila bukan admin; admin menerima URL dengan sandi `***` */
  url: string | null
  interval_detik: number
  aktif: boolean
}

export type Form = { nama: string; lokasi: string; tipe: Tipe; url: string; interval_detik: string; aktif: boolean }

export type StatusKamera = 'tayang' | 'memuat' | 'terputus' | 'nonaktif'

export const CONTOH_URL: Record<Tipe, string> = {
  snapshot: 'http://192.168.1.50/capture',
  mjpeg: 'http://192.168.1.50:81/stream',
  rtsp: 'rtsp://admin:KODEVERIFIKASI@192.168.1.60:554/ch1/main',
}

const KOSONG: Form = { nama: '', lokasi: '', tipe: 'snapshot', url: '', interval_detik: '5', aktif: true }

export function sambung(url: string, t: number) {
  return `${url}${url.includes('?') ? '&' : '?'}_t=${t}`
}

export function labelTipe(k: Pick<Kamera, 'tipe' | 'interval_detik'>) {
  if (k.tipe === 'mjpeg') return 'Aliran MJPEG'
  if (k.tipe === 'rtsp') return `RTSP lewat server · tiap ${k.interval_detik} dtk`
  return `Snapshot tiap ${k.interval_detik} dtk`
}

export function formDari(k?: Kamera): Form {
  if (!k) return { ...KOSONG }
  return {
    nama: k.nama,
    lokasi: k.lokasi ?? '',
    tipe: k.tipe,
    url: k.url ?? '',
    interval_detik: String(k.interval_detik),
    aktif: k.aktif,
  }
}
