import type { NamaIkon } from '../components/Ikon'
import { tglJam } from './format'

/** Riwayat Audit — data & fungsi murni. Sumber: GET /audit-logs (tabel audit_logs, ditulis src/audit.js backend). */

export type AuditRow = {
  id: number
  terjadi_pada: string
  actor_user_id: number | null
  actor_tipe: string
  actor_label: string | null
  aksi: string
  tabel: string | null
  row_id: string | null
  before_data: Record<string, unknown> | null
  after_data: Record<string, unknown> | null
  ip: string | null
  user_agent: string | null
  meta: { rute?: string; level?: string; perubahan?: string } | null
}

export const AKSI_INFO: Record<string, { label: string; ikon: NamaIkon }> = {
  create: { label: 'Tambah', ikon: 'tambah' },
  update: { label: 'Ubah', ikon: 'ubah' },
  delete: { label: 'Hapus', ikon: 'hapus' },
  login: { label: 'Masuk', ikon: 'kunci' },
}

export const URUTAN_AKSI = ['create', 'update', 'delete', 'login'] as const

export function labelAksi(aksi: string): string {
  return AKSI_INFO[aksi]?.label ?? String(aksi).toUpperCase()
}

/** Nama tabel database → istilah yang dipahami pengguna (kunci data tidak diubah). */
export const NAMA_TABEL: Record<string, string> = {
  mejas: 'Meja tanaman',
  tanamen: 'Jenis tanaman',
  sikluses: 'Siklus tanam',
  sensor_thresholds: 'Ambang sensor',
  semais: 'Semai',
  peremajaans: 'Peremajaan',
  pendewasaans: 'Pendewasaan',
  panens: 'Panen',
  users: 'Akun user',
  konfigurasi_dosis: 'Konfigurasi dosis',
  timing_operasi: 'Timing operasi',
  target_nutrisi: 'Target nutrisi',
  aturan_fail_safe: 'Aturan fail-safe',
  jadwal_perawatan: 'Jadwal perawatan',
  kalibrasi_sensor: 'Kalibrasi sensor',
  mapping_channel_esp32: 'Mapping channel ESP32',
  penampung_states: 'Status penampung',
}

export function namaTabel(tabel: string | null | undefined): string {
  if (!tabel) return '—'
  return NAMA_TABEL[tabel] ?? tabel
}

/** Aktor yang ditampilkan; permintaan tanpa akun diberi label jelas. */
export function namaAktor(r: Pick<AuditRow, 'actor_label' | 'actor_tipe'>): string {
  return r.actor_label ?? (r.actor_tipe === 'anonymous' ? 'Tanpa akun' : r.actor_tipe)
}

/** "baru saja", "5 menit lalu", "3 jam lalu", "kemarin"; lebih lama → tanggal pendek. */
export function waktuRelatif(iso: string, sekarang: number = Date.now()): string {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return String(iso)
  const detik = Math.round((sekarang - t) / 1000)
  if (detik < 0) return tglJam(t)
  if (detik < 45) return 'baru saja'
  const menit = Math.round(detik / 60)
  if (menit < 60) return `${menit} menit lalu`
  const jam = Math.round(menit / 60)
  if (jam < 24) return `${jam} jam lalu`
  const hari = Math.round(jam / 24)
  if (hari === 1) return 'kemarin'
  if (hari < 7) return `${hari} hari lalu`
  return tglJam(t)
}

export function waktuLengkap(iso: string): string {
  const t = new Date(iso).getTime()
  return Number.isNaN(t) ? String(iso) : tglJam(t)
}

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/
/** Kolom teknis yang tidak menambah makna (waktu sudah ada di kolom Waktu). */
const SKIP = new Set(['created_at', 'updated_at', 'expires_at'])

/** Nilai JSON → teks yang bisa dibaca; tanggal ISO diformat. */
export function nilaiTeks(v: unknown, maks = 120): string {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'string' && ISO_RE.test(v)) {
    const t = new Date(v).getTime()
    if (!Number.isNaN(t)) return tglJam(t)
  }
  if (typeof v === 'boolean') return v ? 'Ya' : 'Tidak'
  let s: string
  if (typeof v === 'string' || typeof v === 'number') s = String(v)
  else {
    try {
      s = JSON.stringify(v) ?? ''
    } catch {
      s = String(v)
    }
  }
  return s.length > maks ? `${s.slice(0, maks)}…` : s
}

/** jumlah_lubang → "Jumlah lubang". */
export function labelKunci(k: string): string {
  const t = k.split('_').join(' ')
  return t.charAt(0).toUpperCase() + t.slice(1)
}

export type Perubahan = { kunci: string; label: string; lama?: string; baru?: string }

/**
 * Daftar perubahan:
 *  - create : isi after (hanya `baru`)
 *  - update : hanya kunci yang benar-benar berbeda (lama → baru)
 *  - delete : isi before (hanya `lama`)
 *  - login / ganti password (meta.perubahan, nilai tidak direkam): kosong
 */
export function daftarPerubahan(r: AuditRow): Perubahan[] {
  if (r.aksi === 'login') return []
  const isi = (o: Record<string, unknown> | null) =>
    Object.entries(o ?? {}).filter(([k]) => !SKIP.has(k))
  // create/delete: kolom kosong tidak memberi informasi
  const terisi = (o: Record<string, unknown> | null) => isi(o).filter(([, v]) => v !== null && v !== undefined && v !== '')
  if (r.aksi === 'delete') {
    return terisi(r.before_data).map(([k, v]) => ({ kunci: k, label: labelKunci(k), lama: nilaiTeks(v) }))
  }
  if (r.aksi === 'update' && r.before_data) {
    const before = r.before_data
    return isi(r.after_data).flatMap(([k, v]) => {
      const sama = JSON.stringify(before[k] ?? null) === JSON.stringify(v ?? null)
      if (sama) return []
      return [
        k in before
          ? { kunci: k, label: labelKunci(k), lama: nilaiTeks(before[k]), baru: nilaiTeks(v) }
          : { kunci: k, label: labelKunci(k), baru: nilaiTeks(v) },
      ]
    })
  }
  return terisi(r.after_data).map(([k, v]) => ({ kunci: k, label: labelKunci(k), baru: nilaiTeks(v) }))
}

/** Catatan khusus bila nilai tidak direkam atau tidak ada yang berubah (null = tidak perlu). */
export function catatanPerubahan(r: AuditRow): string | null {
  if (r.aksi === 'login') {
    const nama = (r.after_data?.username as string | undefined) ?? r.actor_label ?? '—'
    const level = (r.after_data?.level as string | undefined) ?? r.meta?.level
    return `Masuk sebagai ${nama}${level ? ` (${level})` : ''}`
  }
  if (r.meta?.perubahan && !r.after_data && !r.before_data) return `${r.meta.perubahan} diubah (nilai tidak direkam)`
  if (r.aksi === 'update' && r.before_data && daftarPerubahan(r).length === 0) return 'Tidak ada nilai berubah'
  return null
}

/** Satu kalimat untuk kolom tabel. */
export function ringkasSingkat(r: AuditRow): string {
  const catatan = catatanPerubahan(r)
  if (catatan) return catatan
  const p = daftarPerubahan(r)
  if (p.length === 0) return '—'
  const teks = (x: Perubahan) =>
    x.lama !== undefined && x.baru !== undefined ? `${x.label}: ${x.lama} → ${x.baru}` : `${x.label}: ${x.baru ?? x.lama}`
  const dua = p.slice(0, 2).map(teks).join(' · ')
  return p.length > 2 ? `${dua} · +${p.length - 2} lainnya` : dua
}

/** Cari di aktor, tabel (nama ramah & asli), aksi, dan rute — tanpa beda huruf. */
export function saringAudit(rows: AuditRow[], kata: string): AuditRow[] {
  const k = kata.trim().toLowerCase()
  if (!k) return rows
  return rows.filter((r) =>
    [namaAktor(r), r.tabel ?? '', namaTabel(r.tabel), labelAksi(r.aksi), r.meta?.rute ?? '', r.ip ?? '']
      .join(' ')
      .toLowerCase()
      .includes(k),
  )
}

export function hitungPerAksi(rows: AuditRow[]): Record<string, number> {
  const h: Record<string, number> = { create: 0, update: 0, delete: 0, login: 0 }
  for (const r of rows) if (r.aksi in h) h[r.aksi] += 1
  return h
}

/** Deret nomor halaman dengan elipsis: [1, '…', 4, 5, 6, '…', 20]. */
export function nomorHalaman(sekarang: number, total: number): Array<number | '…'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const set = new Set([1, total, sekarang - 1, sekarang, sekarang + 1])
  const urut = [...set].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b)
  const hasil: Array<number | '…'> = []
  urut.forEach((n, i) => {
    if (i > 0 && n - urut[i - 1] > 1) hasil.push('…')
    hasil.push(n)
  })
  return hasil
}

/** Nama perangkat ringkas dari user agent: "Chrome · Windows". */
export function ringkasPerangkat(ua: string | null | undefined): string {
  if (!ua) return '—'
  const peramban = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : null
  const os = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : null
  const bagian = [peramban, os].filter(Boolean)
  return bagian.length ? bagian.join(' · ') : ua.slice(0, 40)
}
