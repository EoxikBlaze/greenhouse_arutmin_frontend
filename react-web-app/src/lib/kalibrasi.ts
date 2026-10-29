/**
 * Kalibrasi alat IoT — tipe, teks, dan urutan (routes/kalibrasi.js):
 *   GET /kalibrasi · GET /kalibrasi/:sensor/riwayat · POST /kalibrasi/:sensor · PUT /kalibrasi/:sensor
 * Konstanta pH/EC mengikuti deploy-pi/firmware/sensor/sensor.ino (PH_V7 / PH_V4 / TDS_FAKTOR_KOREKSI).
 */

export type StatusAlat = 'terlambat' | 'segera' | 'aman' | 'belum' | 'tanpa_jadwal'

export type Alat = {
  sensor: string
  label: string | null
  metode: string
  larutan_ref: string | null
  nilai_ref: string | number | null
  satuan: string | null
  periode_hari_min: number | null
  periode_hari_max: number | null
  penyimpanan: string | null
  hasil_ukur: string | number | null
  terakhir_dikalibrasi: string | null
  keterangan: string | null
  toleransi: string | number | null
  konstanta: Record<string, number> | null
  perangkat_kode: string | null
  perangkat_nama: string | null
  perangkat_online: boolean | null
  log_terakhir: { dilakukan_pada: string; lulus: boolean | null; oleh_label: string | null } | null
  status: StatusAlat
  jatuh_tempo: string | null
}

export type Log = {
  id: number | string
  dilakukan_pada: string
  nilai_ref: string | number | null
  bacaan_sebelum: string | number | null
  bacaan_sesudah: string | number | null
  lulus: boolean | null
  konstanta_lama: Record<string, number> | null
  konstanta_baru: Record<string, number> | null
  catatan: string | null
  oleh_label: string | null
}

export type Terkini = {
  is_online?: boolean
  seconds_ago?: number | null
  sensor?: { ph?: number | null; tds?: number | null; ec_ms_cm?: number | null; waterTemp?: number | null; airTemp?: number | null; humidity?: number | null } | null
}

export const STATUS: Record<StatusAlat, { label: string; kelas: string }> = {
  terlambat: { label: 'Terlambat', kelas: 'vsf-tone-error' },
  segera: { label: 'Segera', kelas: 'vsf-tone-warn' },
  aman: { label: 'Aman', kelas: 'border-arutmin-moss bg-arutmin-mint/50 text-arutmin-forest' },
  belum: { label: 'Belum pernah', kelas: 'border-navy/25 bg-navy/[.05] text-navy' },
  tanpa_jadwal: { label: 'Sesuai kebutuhan', kelas: 'border-slate-300 bg-slate-50 text-slate-600' },
}

/** Urutan urgensi: yang perlu tindakan paling atas. */
export const URUT_STATUS: StatusAlat[] = ['terlambat', 'segera', 'belum', 'aman', 'tanpa_jadwal']

/** Langkah kerja per alat (pH/EC mengikuti cara kalibrasi di firmware sensor.ino). */
export const LANGKAH: Record<string, string[]> = {
  ph: [
    'Bilas probe dengan air suling, tiriskan dengan tisu (jangan digosok).',
    'Celup ke buffer pH 6,86. Tunggu bacaan stabil ±1 menit, lalu isi "Bacaan di buffer 1".',
    'Bilas lagi, celup ke buffer pH 4,00. Tunggu stabil, isi "Bacaan di buffer 2".',
    'Simpan → salin PH_V7 dan PH_V4 baru ke sensor.ino, unggah ulang firmware.',
    'Cek ulang di buffer 6,86: selisih harus ≤ toleransi. Simpan probe terendam larutan KCl.',
  ],
  ec: [
    'Bilas probe dengan air suling dan tiriskan.',
    'Celup ke larutan standar 1413 µS/cm (suhu ±25 °C). Tunggu bacaan stabil.',
    'Isi bacaan TDS (ppm) yang tampil di sistem.',
    'Simpan → salin TDS_FAKTOR_KOREKSI baru ke sensor.ino, unggah ulang firmware.',
    'Cek ulang: larutan 1413 µS/cm harus terbaca ±706 ppm.',
  ],
  suhu_air: [
    'Celup termometer referensi dan probe suhu di air yang sama selama 5 menit.',
    'Isi suhu referensi dan bacaan sistem. Lulus bila selisih ≤ toleransi.',
  ],
  suhu_udara: [
    'Letakkan termo-higrometer referensi tepat di samping sensor, terlindung sinar matahari langsung, 15 menit.',
    'Isi suhu referensi dan bacaan sistem; catat juga selisih kelembapan di catatan.',
  ],
  pulsa_peristaltik: [
    'Jalankan pompa 10 detik ke gelas ukur (atau timbang airnya, 1 g ≈ 1 mL).',
    'Ulangi 3 kali, isi rata-rata mL/detik sebagai hasil. Lakukan untuk tiap pompa (A, B, pH Up, pH Down) dan tulis di catatan.',
  ],
}

export const n = (v: unknown, d = 2): string => {
  if (v === null || v === undefined || v === '') return '—'
  const x = Number(v)
  return Number.isFinite(x) ? String(Math.round(x * 10 ** d) / 10 ** d).replace('.', ',') : String(v)
}
const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
export const tgl = (iso?: string | null): string => {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`
}
export const angkaIsian = (s: string): number | null => (s.trim() === '' ? null : Number(s.replace(',', '.')))

/** Konstanta urut seperti di sensor.ino (PH_V7 sebelum PH_V4); jsonb mengurutkan kunci sendiri. */
const URUT_KONSTANTA = ['PH_V7', 'PH_V4', 'TDS_FAKTOR_KOREKSI']
export const urutKonstanta = (k: Record<string, number>) =>
  Object.entries(k).sort(([a], [b]) => (URUT_KONSTANTA.indexOf(a) + 1 || 99) - (URUT_KONSTANTA.indexOf(b) + 1 || 99))
/** Potongan kode firmware siap tempel. */
export const potongan = (k: Record<string, number>) =>
  urutKonstanta(k).map(([nama, v]) => `const float ${nama} = ${v}f;`).join('\n')

export type Kelompok = 'Semua' | 'Perlu tindakan' | 'Sensor' | 'Aktuator'
export const KELOMPOK: readonly Kelompok[] = ['Semua', 'Perlu tindakan', 'Sensor', 'Aktuator']
const SENSOR = new Set(['ph', 'ec', 'suhu_air', 'suhu_udara'])
export const adalahSensor = (a: Pick<Alat, 'sensor'>) => SENSOR.has(a.sensor)
export const perluTindakan = (a: Pick<Alat, 'status'>) => a.status === 'terlambat' || a.status === 'segera' || a.status === 'belum'

/** Urut urgensi (stabil: nama alat asli dipertahankan di dalam status yang sama). */
export function urutUrgensi<T extends Pick<Alat, 'status'>>(rows: T[]): T[] {
  return rows
    .map((r, i) => [r, i] as const)
    .sort(([a, i], [b, j]) => URUT_STATUS.indexOf(a.status) - URUT_STATUS.indexOf(b.status) || i - j)
    .map(([r]) => r)
}

/** Saring: kelompok (segmen) DAN status (tile ringkasan, null = semua). */
export function saring<T extends Pick<Alat, 'status' | 'sensor'>>(rows: T[], kelompok: Kelompok, status: StatusAlat | null): T[] {
  return rows.filter((a) => {
    if (status && a.status !== status) return false
    if (kelompok === 'Perlu tindakan') return perluTindakan(a)
    if (kelompok === 'Sensor') return adalahSensor(a)
    if (kelompok === 'Aktuator') return !adalahSensor(a)
    return true
  })
}

const HARI = 86_400_000
/** Kalimat tindakan singkat untuk kartu. */
export function teksTenggat(a: Pick<Alat, 'status' | 'jatuh_tempo'>, sekarang: Date = new Date()): string {
  if (a.status === 'belum') return 'Belum pernah dikalibrasi'
  if (a.status === 'tanpa_jadwal') return 'Sesuai kebutuhan'
  if (!a.jatuh_tempo) return '—'
  const sisa = Math.ceil((new Date(a.jatuh_tempo).getTime() - sekarang.getTime()) / HARI)
  if (sisa < 0) return `Terlambat ${-sisa} hari`
  if (sisa === 0) return 'Jatuh tempo hari ini'
  return `${a.status === 'segera' ? 'Segera · ' : ''}Jatuh tempo ${tgl(a.jatuh_tempo)} (${sisa} hari lagi)`
}

export const jadwalTeks = (a: Pick<Alat, 'periode_hari_min' | 'periode_hari_max'>): string =>
  a.periode_hari_max
    ? `tiap ${a.periode_hari_min && a.periode_hari_min !== a.periode_hari_max ? `${a.periode_hari_min}–` : ''}${a.periode_hari_max} hari`
    : 'sesuai kebutuhan'
