import { tanggalIso } from './format'
import type { Titik } from './sensorLaporan'

/** Pilihan rentang waktu riwayat sensor (satu pengatur untuk grafik, tabel, dan unduhan). */
export type Rentang = 'Hari ini' | '3 Hari' | '7 Hari' | 'Pilih tanggal'
export const DAFTAR_RENTANG: readonly Rentang[] = ['Hari ini', '3 Hari', '7 Hari', 'Pilih tanggal']

export const TGL_MAKS_HARI = 92
const JAM = 3_600_000
const HARI = 24 * JAM

export type RentangMs = { dari: number; sampai: number; live: boolean }
export type RentangTanggal = { dari: string; sampai: string }

function awalHari(ms: number): number {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Pesan galat untuk pasangan tanggal (YYYY-MM-DD); null bila sah. */
export function galatTanggal(dari: string, sampai: string): string | null {
  const a = Date.parse(`${dari}T00:00:00`)
  const b = Date.parse(`${sampai}T23:59:59`)
  if (Number.isNaN(a) || Number.isNaN(b)) return 'Isi tanggal "dari" dan "sampai".'
  if (a > b) return 'Tanggal "dari" harus sebelum atau sama dengan "sampai".'
  if (b - a > TGL_MAKS_HARI * HARI) return `Rentang maksimal ${TGL_MAKS_HARI} hari.`
  return null
}

/**
 * Rentang dalam milidetik. `live` = berakhir sekarang (ikut diperbarui otomatis); rentang tanggal yang sudah lewat tidak.
 * `sekarang` berasal dari state (render harus murni); 0 = belum siap.
 */
export function hitungRentang(rentang: Rentang, tgl: RentangTanggal | null, sekarang: number): RentangMs | null {
  if (!sekarang) return null
  switch (rentang) {
    case 'Hari ini':
      return { dari: awalHari(sekarang), sampai: sekarang, live: true }
    case '3 Hari':
      return { dari: sekarang - 3 * HARI, sampai: sekarang, live: true }
    case '7 Hari':
      return { dari: sekarang - 7 * HARI, sampai: sekarang, live: true }
    case 'Pilih tanggal': {
      if (!tgl || galatTanggal(tgl.dari, tgl.sampai)) return null
      const a = Date.parse(`${tgl.dari}T00:00:00`)
      const b = Date.parse(`${tgl.sampai}T23:59:59`)
      return b >= sekarang ? { dari: a, sampai: sekarang, live: true } : { dari: a, sampai: b, live: false }
    }
  }
}

/** Geser rentang tanggal sebesar panjangnya sendiri (arah −1 = sebelumnya, +1 = berikutnya). */
export function geserTanggal(tgl: RentangTanggal, arah: -1 | 1): RentangTanggal {
  const a = Date.parse(`${tgl.dari}T12:00:00`)
  const b = Date.parse(`${tgl.sampai}T12:00:00`)
  const n = Math.max(1, Math.round((b - a) / HARI) + 1)
  return { dari: tanggalIso(a + arah * n * HARI), sampai: tanggalIso(b + arah * n * HARI) }
}

/** Jumlah hari untuk grafik Nutrisi (server menerima 1–14). */
export function hariUntukNutrisi(r: RentangMs): number {
  return Math.min(14, Math.max(1, Math.ceil((r.sampai - r.dari) / HARI)))
}

/** "5 menit", "1 jam", … dari interval detik yang dipilih server. */
export function labelInterval(detik: number): string {
  if (detik < 60) return `${detik} detik`
  if (detik < 3600) return `${Math.round(detik / 60)} menit`
  if (detik < 86400) return `${Math.round(detik / 3600)} jam`
  return `${Math.round(detik / 86400)} hari`
}

const dua = (n: number) => String(n).padStart(2, '0')
/** "21/11/2026 08:00" (waktu lokal). */
export function tglJamPendek(ms: number): string {
  const d = new Date(ms)
  return `${dua(d.getDate())}/${dua(d.getMonth() + 1)}/${d.getFullYear()} ${dua(d.getHours())}:${dua(d.getMinutes())}`
}

/**
 * Ubah isi /monitoring/tarik/csv (WAKTU,SUHU AIR,PH,NUTRISI,EC,SUHU UDARA,KELEMBAPAN) menjadi bacaan.
 * Baris komentar (#) dan baris tanpa waktu sah dilewati; sel kosong = null. Waktu "YYYY-MM-DD HH:MM:SS" = waktu lokal.
 */
export function bacaCsvSensor(teks: string): Titik[] {
  const hasil: Titik[] = []
  for (const baris of teks.replace(/^\uFEFF/, '').split(/\r?\n/).slice(1)) {
    if (!baris || baris.startsWith('#')) continue
    const [waktu, air, ph, tds, ec, udara, lembap] = baris.split(',')
    const iso = (waktu ?? '').trim().replace(' ', 'T')
    if (Number.isNaN(Date.parse(iso))) continue
    const n = (v: string | undefined) => (v === undefined || v.trim() === '' || !Number.isFinite(Number(v)) ? null : Number(v))
    hasil.push({ waktu: iso, waterTemp: n(air), ph: n(ph), tds: n(tds), ec_ms_cm: n(ec), airTemp: n(udara), humidity: n(lembap) })
  }
  return hasil
}
