import { useEffect, useRef, useState, type ReactNode } from 'react'
import { api } from '../lib/api'
import { useApiError } from '../lib/crudApi'

/**
 * 17 · RIWAYAT AUDIT (/audit) — GET /audit-logs (admin + demo).
 *
 * Sumber: tabel `audit_logs` yang diisi middleware src/audit.js (backend).
 * Balasan kontrak { data, total, page, per_page } — filter tabel & aksi serta
 * pagination dikirim sebagai query (?page, ?per_page, ?tabel, ?aksi).
 * Satu state per layar (QW1): loading → error → empty → data.
 */
type AuditRow = {
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

type Kueri = { page: number; perPage: number; tabel: string; aksi: string }

/** Tabel yang pernah ditulis aplikasi (peta sama dgn src/audit.js). */
const OPSI_TABEL = [
  ['', 'Semua tabel'],
  ['mejas', 'mejas'],
  ['tanamen', 'tanamen'],
  ['sikluses', 'sikluses'],
  ['sensor_thresholds', 'sensor_thresholds'],
  ['semais', 'semais'],
  ['peremajaans', 'peremajaans'],
  ['pendewasaans', 'pendewasaans'],
  ['panens', 'panens'],
  ['users', 'users'],
  ['konfigurasi_dosis', 'konfigurasi_dosis'],
  ['timing_operasi', 'timing_operasi'],
  ['target_nutrisi', 'target_nutrisi'],
  ['aturan_fail_safe', 'aturan_fail_safe'],
  ['jadwal_perawatan', 'jadwal_perawatan'],
  ['kalibrasi_sensor', 'kalibrasi_sensor'],
  ['mapping_channel_esp32', 'mapping_channel_esp32'],
  ['penampung_states', 'penampung_states'],
] as const

/** Nilai tersimpan huruf kecil (CHECK enum kolom aksi) → label besar di layar. */
const OPSI_AKSI = [
  ['', 'Semua aksi'],
  ['create', 'CREATE'],
  ['update', 'UPDATE'],
  ['delete', 'DELETE'],
  ['login', 'LOGIN'],
] as const

const TONE_AKSI: Record<string, string> = {
  create: 'border-arutmin-moss/45 bg-arutmin-mint/60 text-arutmin-forest',
  update: 'border-navy/30 bg-navy/[.07] text-navy',
  delete: 'vsf-tone-error',
  login: 'border-emas/70 bg-emas/20 text-[#7A6410]',
}

const LABEL_AKSI: Record<string, string> = {
  create: 'CREATE',
  update: 'UPDATE',
  delete: 'DELETE',
  login: 'LOGIN',
}

/** Waktu lokal (id-ID) — kolom "Waktu" selalu nowrap agar rapat di 390px. */
function fmtWaktu(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(d)
}

/** Timestamp ISO → tanggal lokal yang enak dibaca (bukan string mentah). */
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/

/** Kolom teknis yang tidak menambah makna di ringkasan (sudah ada di kolom Waktu). */
const SKIP_RINGKASAN = new Set(['created_at', 'updated_at', 'expires_at'])

/** nilai JSON → teks pendek untuk chip ringkasan. */
function nilaiTeks(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'string' && ISO_RE.test(v)) {
    const d = new Date(v)
    if (!Number.isNaN(d.getTime())) {
      try {
        return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(d)
      } catch { /* format gagal → pakai teks apa adanya di bawah */ }
    }
  }
  if (typeof v === 'string') return v.length > 60 ? `${v.slice(0, 60)}…` : v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  let s = ''
  try {
    s = JSON.stringify(v) ?? ''
  } catch {
    s = String(v)
  }
  return s.length > 60 ? `${s.slice(0, 60)}…` : s
}

/** jumlah_lubang → "Jumlah lubang". */
function labelKunci(k: string): string {
  const t = k.split('_').join(' ')
  return t.charAt(0).toUpperCase() + t.slice(1)
}

/**
 * Ringkasan before/after → daftar chip.
 *  - CREATE : isi after_data
 *  - UPDATE : tiap kunci after → "lama → baru" (atau "baru" bila before absen)
 *  - DELETE : isi before_data (baris terakhir sebelum dihapus)
 *  - LOGIN  : "Masuk sebagai …"
 *  - ganti password dsb.: meta.perubahan (nilai TIDAK PERNAH direkam)
 */
function daftarRingkasan(r: AuditRow): string[] {
  if (r.aksi === 'login') {
    const nama = (r.after_data?.username as string | undefined) ?? r.actor_label ?? '—'
    const level = (r.after_data?.level as string | undefined) ?? r.meta?.level
    return [`Masuk sebagai ${nama}${level ? ` (${level})` : ''}`]
  }
  if (r.meta?.perubahan && !r.after_data && !r.before_data) {
    return [`${r.meta.perubahan} diubah (nilai tidak direkam)`]
  }
  const before = r.before_data
  const after = r.after_data
  const isi = (obj: Record<string, unknown> | null) =>
    Object.entries(obj ?? {}).filter(([k]) => !SKIP_RINGKASAN.has(k))
  if (r.aksi === 'delete') {
    return isi(before).map(([k, v]) => `${labelKunci(k)}: ${nilaiTeks(v)}`)
  }
  if (r.aksi === 'update' && before) {
    // Hanya kunci yang BENAR-BENAR berubah — baris "PUT nilai sama" tidak
    // dipenuhi pasangan "120 → 120" yang tidak memberi informasi.
    const beda = isi(after).flatMap(([k, v]) => {
      const lama = before[k]
      const sama = JSON.stringify(lama ?? null) === JSON.stringify(v ?? null)
      if (sama) return []
      return [k in before
        ? `${labelKunci(k)}: ${nilaiTeks(lama)} → ${nilaiTeks(v)}`
        : `${labelKunci(k)}: ${nilaiTeks(v)}`]
    })
    return beda.length ? beda : ['Tidak ada nilai berubah']
  }
  return isi(after).map(([k, v]) => `${labelKunci(k)}: ${nilaiTeks(v)}`)
}

/** Chip ringkasan (maks 4 + sisa) — dipakai kolom terakhir. */
function Ringkasan({ row }: { row: AuditRow }): ReactNode {
  const items = daftarRingkasan(row)
  if (items.length === 0) return <span className="text-slate-400">—</span>
  const utama = items.slice(0, 4)
  const sisa = items.length - utama.length
  return (
    <div className="flex flex-wrap gap-1.5">
      {utama.map((t) => (
        <span
          key={t}
          title={t}
          className="inline-block max-w-[260px] truncate rounded-full bg-navy/[.06] px-2 py-0.5 text-[11px] text-navy"
        >
          {t}
        </span>
      ))}
      {sisa > 0 && (
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
          +{sisa} lainnya
        </span>
      )}
    </div>
  )
}

export function AuditPage() {
  const handleApiError = useApiError()
  const [kueri, setKueri] = useState<Kueri>({ page: 1, perPage: 20, tabel: '', aksi: '' })
  const [rows, setRows] = useState<AuditRow[]>([])
  const [total, setTotal] = useState(0)
  // true hanya untuk muat pertama (isi awal state — bukan setState sinkron di effect).
  const [loading, setLoading] = useState(true)
  const [failure, setFailure] = useState<string | null>(null)
  const seq = useRef(0)

  useEffect(() => {
    const id = ++seq.current
    let batal = false
    void (async () => {
      try {
        const res = await api.get('/audit-logs', {
          params: {
            page: kueri.page,
            per_page: kueri.perPage,
            tabel: kueri.tabel || undefined,
            aksi: kueri.aksi || undefined,
          },
        })
        if (batal || id !== seq.current) return
        const d = (res.data ?? {}) as { data?: AuditRow[]; total?: number }
        setRows(Array.isArray(d.data) ? d.data : [])
        setTotal(typeof d.total === 'number' ? d.total : 0)
        setFailure(null)
      } catch (err) {
        if (batal || id !== seq.current) return
        setFailure(handleApiError(err).message)
      } finally {
        if (!batal && id === seq.current) setLoading(false)
      }
    })()
    return () => {
      batal = true
      seq.current += 1 // batalkan hasil yang masih mendarat setelah unmount
    }
  }, [kueri, handleApiError])

  function ubahFilter(k: 'tabel' | 'aksi', v: string) {
    setLoading(true)
    setKueri((q) => ({ ...q, [k]: v, page: 1 }))
  }
  function ubahPerHal(v: number) {
    setLoading(true)
    setKueri((q) => ({ ...q, perPage: v, page: 1 }))
  }
  function keHalaman(p: number) {
    setLoading(true)
    setKueri((q) => ({ ...q, page: p }))
  }
  function muatUlang() {
    setLoading(true)
    setKueri((q) => ({ ...q })) // objek baru → effect jalan ulang
  }

  const totalHal = Math.max(1, Math.ceil(total / kueri.perPage))
  const adaFilter = kueri.tabel !== '' || kueri.aksi !== ''
  const colSpan = 5

  return (
    <div className="mx-auto grid w-full max-w-[1180px] grid-cols-[minmax(0,1fr)] gap-4 vsf-stagger">
      {/* Filter — dua kontrol utama (tabel & aksi) + ukuran halaman */}
      <section className="vsf-card p-4">
        <div className="text-[11px] font-bold uppercase tracking-[.14em] text-slate-500">
          Filter riwayat
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="block text-[12px] font-bold text-slate-700">Tabel</span>
            <select
              className="vsf-input mt-1 min-h-[44px] min-w-[170px]"
              value={kueri.tabel}
              onChange={(e) => ubahFilter('tabel', e.target.value)}
            >
              {OPSI_TABEL.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block text-[12px] font-bold text-slate-700">Aksi</span>
            <select
              className="vsf-input mt-1 min-h-[44px] min-w-[150px]"
              value={kueri.aksi}
              onChange={(e) => ubahFilter('aksi', e.target.value)}
            >
              {OPSI_AKSI.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block text-[12px] font-bold text-slate-700">Per halaman</span>
            <select
              className="vsf-input mt-1 min-h-[44px] min-w-[110px]"
              value={String(kueri.perPage)}
              onChange={(e) => ubahPerHal(Number(e.target.value))}
            >
              {[10, 20, 50].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
          <span className="flex-1" />
          <button type="button" className="vsf-btn-secondary" onClick={muatUlang} disabled={loading}>
            Muat ulang
          </button>
        </div>
        <div className="mt-2 text-[12px] text-slate-500">
          {adaFilter
            ? 'Filter aktif — hanya baris yang cocok yang ditampilkan.'
            : 'Seluruh aksi tulis (tambah, ubah, hapus, login) tercatat otomatis oleh sistem.'}
        </div>
      </section>

      {/* Tabel — satu state per layar: loading → error → empty → data */}
      <section className="vsf-card p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="flex min-w-0 items-center gap-2.5 font-display text-[18px] font-bold leading-tight text-navy">
            <span aria-hidden className="h-4 w-1 shrink-0 rounded-full bg-emas" />
            <span className="truncate">Riwayat Audit</span>
          </h2>
          <span className="flex-1" />
          <span className="text-[12px] text-slate-500 tabular-nums">{total} aktivitas</span>
        </div>

        <div className="mt-4 min-w-0 overflow-auto rounded-std border border-garis bg-white vsf-table">
          <table aria-label="Riwayat audit" className="w-full text-[13px]">
            <thead>
              <tr className="bg-navy/[.055]">
                {['Waktu', 'Aktor', 'Aksi', 'Tabel', 'Ringkasan perubahan'].map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className="vsf-eyebrow vsf-eyebrow-navy border-b border-navy/25 px-4 py-2.5 text-left"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={colSpan} className="px-4 py-10 text-center text-slate-500">
                    <div className="grid justify-items-center gap-2 py-4">
                      <span className="vsf-spinner vsf-spinner-dark" aria-hidden />
                      <span className="text-[13px]">Memuat riwayat…</span>
                    </div>
                  </td>
                </tr>
              ) : failure ? (
                <tr>
                  <td colSpan={colSpan} className="px-4 py-10 text-center">
                    <div role="alert" className="grid justify-items-center gap-2 py-4">
                      <span className="grid h-12 w-12 place-items-center rounded-full bg-red-50 text-red-600">
                        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                          <path d="M12 3 1.8 20.5h20.4z" />
                          <path d="M12 9.5v4.5M12 17.2v.2" />
                        </svg>
                      </span>
                      <b className="text-red-700">Gagal memuat riwayat audit</b>
                      <span className="max-w-[420px] text-[13px] text-red-700">{failure}</span>
                      <button type="button" className="vsf-btn-secondary mt-1" onClick={muatUlang}>
                        Muat ulang
                      </button>
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="px-4 py-10 text-center text-slate-500">
                    <div className="grid justify-items-center gap-2 py-4">
                      <span className="grid h-12 w-12 place-items-center rounded-full bg-navy/[.06] text-navy">
                        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <circle cx="12" cy="12" r="9" />
                          <path d="M12 7v5l3.2 2" />
                        </svg>
                      </span>
                      <b className="text-slate-700">Belum ada aktivitas tercatat</b>
                      <span className="max-w-[420px] text-[13px]">
                        {adaFilter
                          ? 'Tidak ada aktivitas yang cocok dengan filter ini — coba ganti tabel atau aksi.'
                          : 'Setiap aksi tulis (tambah, ubah, hapus) dan login yang berhasil akan muncul di sini.'}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-garis/70 last:border-0 transition-colors hover:bg-navy/[.04]"
                  >
                    <td className="whitespace-nowrap px-4 py-2.5 align-top text-[12px] text-slate-600 tabular-nums">
                      {fmtWaktu(r.terjadi_pada)}
                    </td>
                    <td className="px-4 py-2.5 align-top">
                      <div className="font-semibold text-slate-800">
                        {r.actor_label ?? (r.actor_tipe === 'anonymous' ? 'Tanpa akun' : r.actor_tipe)}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                        {r.meta?.level && (
                          <span className="rounded-full bg-navy/[.07] px-1.5 py-0.5 font-semibold text-navy">
                            {r.meta.level}
                          </span>
                        )}
                        {r.ip && <span className="font-mono">{r.ip}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 align-top">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold tracking-[.08em] ${TONE_AKSI[r.aksi] ?? 'border-slate-300 bg-slate-50 text-slate-600'}`}
                      >
                        {LABEL_AKSI[r.aksi] ?? String(r.aksi).toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 align-top">
                      <div className="font-mono text-[12px] text-navy">{r.tabel ?? '—'}</div>
                      {r.row_id && (
                        <div className="text-[11px] text-slate-500">#{r.row_id}</div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 align-top">
                      <Ringkasan row={r} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination — selalu tampil (bukan hanya saat ada data) */}
        <div className="mt-4 flex flex-wrap items-center gap-3 text-[13px] text-slate-600">
          <span className="tabular-nums">
            Menampilkan {rows.length} dari {total} aktivitas
          </span>
          <span className="flex-1" />
          <button
            type="button"
            className="vsf-btn-secondary"
            disabled={loading || kueri.page <= 1}
            onClick={() => keHalaman(kueri.page - 1)}
          >
            Sebelumnya
          </button>
          <span className="min-w-[92px] text-center tabular-nums">
            Halaman {kueri.page} / {totalHal}
          </span>
          <button
            type="button"
            className="vsf-btn-secondary"
            disabled={loading || kueri.page >= totalHal}
            onClick={() => keHalaman(kueri.page + 1)}
          >
            Berikutnya
          </button>
        </div>
      </section>
    </div>
  )
}

export default AuditPage
