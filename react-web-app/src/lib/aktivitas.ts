import { api } from './api'
import { angkaMaks, tglJam, tglPendek } from './format'

/** Satu baris linimasa Catatan Aktivitas — GET /audit-logs/aktivitas (backend/src/aktivitas.js). */
export type Aktivitas = {
  kunci: string
  waktu: string
  jenis: JenisAktivitas
  aksi: string
  pelaku: string
  objek: string | null
  ref: string | null
  status: string | null
  ringkas: string | null
  detail: Record<string, unknown> | null
}

export const JENIS_AKTIVITAS = ['data', 'pengaturan', 'login', 'perintah', 'peringatan', 'dosing', 'kalibrasi'] as const
export type JenisAktivitas = (typeof JENIS_AKTIVITAS)[number]

export const NAMA_JENIS: Record<JenisAktivitas, string> = {
  data: 'Data',
  pengaturan: 'Pengaturan',
  login: 'Login',
  perintah: 'Perintah alat',
  peringatan: 'Peringatan',
  dosing: 'Dosing & air',
  kalibrasi: 'Kalibrasi',
}

const AKSI: Record<string, string> = {
  create: 'Tambah', update: 'Ubah', delete: 'Hapus', login: 'Masuk', config_change: 'Ubah pengaturan',
  buka: 'Peringatan muncul', selesai: 'Peringatan selesai',
  AB: 'Nutrisi A+B', PH: 'Koreksi pH', ENCER: 'Pengenceran', ISI: 'Isi air',
  KONFIGURASI: 'Konfigurasi meja', SEMAI: 'Mulai semai', TARGET: 'Ubah target', PANEN: 'Panen', PEMELIHARAAN: 'Mode pemeliharaan',
  BUKA_KUNCI: 'Buka kunci', OTOMASI: 'Izin otomasi', KAL_SENSOR: 'Kalibrasi sensor', KALIBRASI: 'Simpan kalibrasi',
  BALIK_KALIBRASI: 'Kembalikan kalibrasi', UJI_POMPA: 'Tes pompa', STOP: 'STOP pompa', STOP_DARURAT: 'STOP darurat', ISI_AIR: 'Isi air', STATUS: 'Minta status',
  JADWAL: 'Jadwal alat', OTA: 'Pembaruan firmware', KONSOL: 'Perintah konsol alat', DOSIS: 'Dosis', ph: 'pH', ec: 'EC', pulsa_peristaltik: 'Laju pompa',
}
export const labelAktivitas = (a: string): string => AKSI[a] ?? a

const STATUS: Record<string, string> = {
  menunggu: 'Menunggu alat', dikirim: 'Dikirim ke alat', selesai: 'Selesai', gagal: 'Gagal', kedaluwarsa: 'Kedaluwarsa',
  lulus: 'Lulus', warning: 'Peringatan', critical: 'Kritis',
}
export const labelStatus = (s: string | null): string => (s ? STATUS[s] ?? s : '')
export const gagalAktivitas = (s: string | null): boolean => s === 'gagal' || s === 'kedaluwarsa' || s === 'critical'

/** Kalimat satu baris untuk tabel. */
export function ringkasAktivitas(a: Aktivitas): string {
  const aksi = labelAktivitas(a.aksi)
  switch (a.jenis) {
    case 'perintah': return `${aksi}${a.objek ? ` ke ${a.objek}` : ''}${a.ringkas ? ` — ${a.ringkas}` : ''}`
    case 'peringatan': return `${aksi}: ${a.ringkas ?? a.objek ?? ''}`
    case 'dosing': return `${aksi} ${a.ringkas ?? ''}`.trim()
    case 'kalibrasi': return `${labelAktivitas(a.objek ?? a.aksi)}: ${a.ringkas ?? ''}`
    case 'login': return `${a.pelaku} masuk ke sistem`
    default: return a.ringkas ? `${a.ringkas}${a.ref && !/^\d+$/.test(String(a.ref)) ? '' : a.ref ? ` #${a.ref}` : ''}` : `${aksi} ${a.objek ?? ''}${a.ref ? ` #${a.ref}` : ''}`.trim()
  }
}

export type FilterAktivitas = { jenis: string; dari: string; sampai: string; kata: string; page: number; perPage: number }

export type HasilAktivitas = { data: Aktivitas[]; total: number; per_jenis: Record<string, number>; page: number; per_page: number }

export async function unduhBerkas(url: string, params: Record<string, string | undefined>, nama: string): Promise<void> {
  try {
    const res = await api.get(url, { params, responseType: 'blob' })
    const href = URL.createObjectURL(res.data as Blob)
    const a = document.createElement('a')
    a.href = href
    a.download = nama
    a.click()
    URL.revokeObjectURL(href)
  } catch (err) {
    const status = (err as { response?: { status?: number } })?.response?.status
    throw new Error(status === 422 ? 'Tanggal tidak valid. Gunakan format YYYY-MM-DD.' : 'Gagal mengunduh CSV. Periksa koneksi lalu coba lagi.')
  }
}

/** Sel tabel laporan: tanggal, angka Indonesia, atau "—". */
export function formatSel(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'number') return angkaMaks(v, 2)
  if (typeof v === 'boolean') return v ? 'Ya' : 'Tidak'
  const s = String(v)
  if (/^\d{4}-\d{2}-\d{2}T00:00:00(\.000)?Z$/.test(s) || /^\d{4}-\d{2}-\d{2}$/.test(s)) return tglPendek(s)
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return tglJam(s)
  return s
}
