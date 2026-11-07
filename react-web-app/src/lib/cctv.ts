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

/** Port TCP yang diblokir Chrome/Firefox dengan net::ERR_UNSAFE_PORT (mis. 9 = discard pada kamera demo putus). */
const PORT_TIDAK_AMAN = new Set([1, 7, 9, 11, 13, 15, 17, 19, 20, 21, 22, 23, 25, 37, 42, 43, 53, 77, 79, 87, 95, 101, 102, 103, 104, 109, 110, 111, 113, 115, 117, 119, 123, 135, 139, 143, 179, 389, 465, 512, 513, 514, 515, 526, 530, 531, 532, 540, 556, 563, 587, 601, 636, 993, 995, 2049, 3659, 4045, 6000, 6665, 6666, 6667, 6668, 6669])

/** Pastikan URL kamera http(s) tidak memakai port terlarang browser sebelum dipasang ke <img src>. */
export function urlAmanBrowser(url: string | null | undefined): boolean {
  if (!url) return false
  try {
    const u = new URL(url, window.location.origin)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false
    if (u.port) {
      const p = Number(u.port)
      if (PORT_TIDAK_AMAN.has(p)) return false
    }
    return true
  } catch {
    return false
  }
}

export function labelTipe(k: Pick<Kamera, 'tipe' | 'interval_detik'>) {
  if (k.tipe === 'mjpeg') return 'Aliran MJPEG'
  if (k.tipe === 'rtsp') return `Aliran RTSP · tiap ${k.interval_detik} dtk`
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
