import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { api } from '../lib/api'
import { useApiError } from '../lib/crudApi'
import { useAuth } from '../lib/authContext'
import { useApiObject, useFlashOnChange } from '../lib/useApiObject'
import { StatusBadge } from '../components/StatusBadge'

type Mode = 'AUTO' | 'MANUAL'

/* ── Ikon SVG inline (R3): pengganti emoji silang/centang/peringatan/titik — aria-hidden, 16px ── */
function IkonSalah({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6.1 6.1l3.8 3.8M9.9 6.1L6.1 9.9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IkonOk({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.3 8.3l1.9 1.9 3.5-4.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IkonPeringatan({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 2.4l5.6 10.2H2.4L8 2.4z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M8 6.4v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="8" cy="11.3" r="0.85" fill="currentColor" />
    </svg>
  )
}

/** Baris GET /watercontrol/status (tabel `water_controls`). */
type Status = {
  id?: string | number
  command?: string | null
  mode?: string | null
  valve_state?: string | null
  updated_at?: string | null
}

/** Satu baris riwayat perintah: baris server + perintah yang dikirim sesi ini. */
type Riwayat = {
  key: string
  waktu: string
  perintah: string
  sumber: string
  hasil: string
  ok: boolean
}

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

function tgl(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const jam = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()} ${jam}`
}

export default function WaterControlPage() {
  const { username } = useAuth()
  const handleApiError = useApiError()

  // Status live + polling senyap tiap 5 dtk (skeleton hanya saat muat pertama).
  const { data: status, loading, error, reload } = useApiObject<Status>('/watercontrol/status', { pollMs: 5_000 })
  // P4 — sorot kilat saat nilai polling 5 dtk berubah.
  const statusFlash = useFlashOnChange(JSON.stringify(status ?? null))

  const mode = (status?.mode === 'AUTO' ? 'AUTO' : status?.mode === 'MANUAL' ? 'MANUAL' : null) as Mode | null
  const terjangkau = !error

  const [busy, setBusy] = useState<null | 'fill' | 'stop' | 'mode'>(null)
  const [pesan, setPesan] = useState<{ teks: string; ok: boolean } | null>(null)
  const [riwayat, setRiwayat] = useState<Riwayat[]>([])

  // Auto-hilang (5 dtk) — sama dengan pola flash di halaman master.
  useEffect(() => {
    if (!pesan) return
    const id = setTimeout(() => setPesan(null), 5000)
    return () => clearTimeout(id)
  }, [pesan])

  function catat(perintah: string, hasil: string, ok: boolean) {
    setRiwayat((old) => [
      {
        key: `${Date.now()}-${old.length}`,
        waktu: new Date().toISOString(),
        perintah,
        sumber: username || 'sesi ini',
        hasil,
        ok,
      },
      ...old,
    ])
  }

  async function sendMode(next: Mode) {
    if (busy || next === mode) return
    setBusy('mode')
    try {
      const res = await api.post('/watercontrol/setMode', { mode: next })
      const msg = String((res.data as { message?: unknown })?.message ?? `Mode diubah ke ${next}.`)
      setPesan({ teks: msg, ok: true })
      catat(next, msg, true)
      reload()
    } catch (err) {
      const f = handleApiError(err)
      setPesan({ teks: f.message, ok: false })
      catat(next, f.message, false)
    } finally {
      setBusy(null)
    }
  }

  async function action(kind: 'fill' | 'stop') {
    if (busy || !terjangkau || mode !== 'MANUAL') return
    setBusy(kind)
    const path = kind === 'fill' ? '/watercontrol/fill' : '/watercontrol/stop'
    const label = kind === 'fill' ? 'FILL' : 'STOP'
    try {
      const res = await api.post(path)
      const msg = String((res.data as { message?: unknown })?.message ?? 'Perintah diterima.')
      setPesan({ teks: msg, ok: true })
      catat(label, msg, true)
      reload()
    } catch (err) {
      const f = handleApiError(err)
      setPesan({ teks: f.message, ok: false })
      catat(label, f.message, false)
    } finally {
      setBusy(null)
    }
  }

  const serverRow: Riwayat | null = status?.updated_at
    ? {
        key: 'server',
        waktu: String(status.updated_at),
        perintah: status.command ?? '—',
        sumber: 'server',
        hasil: `tersimpan • mode ${status.mode ?? '—'}`,
        ok: true,
      }
    : null
  const barisRiwayat: Riwayat[] = serverRow ? [serverRow, ...riwayat] : riwayat

  return (
    <div className="mx-auto max-w-[1180px] grid gap-4 vsf-stagger">
      {error && (
        <div
          role="alert"
          className="vsf-banner rounded-input border border-red-600/50 bg-red-50 px-3 py-2 text-[13px] text-red-700 flex flex-wrap items-center gap-3"
        >
          <span className="flex items-center gap-2">
            <IkonSalah className="shrink-0" />
            <span>{error}</span>
          </span>
          <button type="button" className="vsf-input rounded-full font-semibold" onClick={reload}>
            Coba lagi
          </button>
        </div>
      )}

      {pesan && (
        <div
          role={pesan.ok ? 'status' : 'alert'}
          className={clsx(
            'vsf-banner rounded-input border px-3 py-2 text-[13px] flex items-start gap-2',
            pesan.ok
              ? 'border-arutmin-moss bg-arutmin-mint/50 text-arutmin-forest'
              : 'border-red-600/50 bg-red-50 text-red-700',
          )}
        >
          {pesan.ok ? <IkonOk className="mt-[2px] shrink-0" /> : <IkonSalah className="mt-[2px] shrink-0" />}
          <span>{pesan.teks}</span>
        </div>
      )}

      {/* Status perangkat & tandon */}
      <section className="vsf-card p-4">
        <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">Status perangkat &amp; tandon</div>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 vsf-stagger">
          <div className="rounded-card border border-arutmin-border bg-white p-4 transition hover:border-arutmin-moss/60 hover:shadow-sm">
            <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">Status API</div>
            <div className="mt-2">
              {loading && !status ? (
                <span className="vsf-skeleton inline-block h-[24px] w-[130px]" />
              ) : (
                <StatusBadge
                  tone={terjangkau ? 'online' : 'offline'}
                  label={terjangkau ? 'Terhubung' : 'Terputus'}
                />
              )}
            </div>
            <div className="mt-1 text-[12px] text-slate-600">pembaruan terakhir {tgl(status?.updated_at)}</div>
          </div>
          <div className="rounded-card border border-arutmin-border bg-white p-4 transition hover:border-arutmin-moss/60 hover:shadow-sm">
            <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">Perintah Terakhir</div>
            <div className={`text-[15px] font-bold mt-1 tabular-nums ${statusFlash}`}>{status?.command ?? '—'}</div>
            <div className="text-[12px] text-slate-600">{tgl(status?.updated_at)}</div>
          </div>
          <div className="rounded-card border border-arutmin-border bg-white p-4 transition hover:border-arutmin-moss/60 hover:shadow-sm">
            <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">Katup</div>
            <div className={`text-[15px] font-bold mt-1 ${statusFlash}`}>{status?.valve_state ?? '—'}</div>
            <div className="text-[12px] text-slate-600">status katup tandon</div>
          </div>
          <div className="rounded-card border border-arutmin-border bg-white p-4 transition hover:border-arutmin-moss/60 hover:shadow-sm">
            <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">Mode</div>
            <div className={`text-[15px] font-bold mt-1 ${statusFlash}`}>{mode ?? '—'}</div>
            <div className="text-[12px] text-slate-600">berdasar ambang sensor</div>
          </div>
        </div>
      </section>

      {/* Pengaturan mode */}
      <section className="vsf-card p-4">
        <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">Pengaturan mode</div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {(['AUTO', 'MANUAL'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              disabled={busy !== null || !terjangkau || !mode}
              onClick={() => void sendMode(m)}
              className={clsx(
                'inline-flex items-center rounded-full border px-3 py-1 text-[12px] font-semibold transition disabled:opacity-60',
                mode === m
                  ? 'border-arutmin-moss bg-activePill text-white'
                  : 'border-arutmin-border bg-white text-slate-700 hover:border-arutmin-moss/60 hover:shadow-sm',
              )}
            >
              {busy === 'mode' && mode !== m && <span className="vsf-spinner vsf-spinner-dark mr-2" />}
              {m === 'AUTO' ? 'AUTO (otomatis)' : 'MANUAL'}
            </button>
          ))}
          <span className="text-[12px] text-slate-500">balik ke AUTO = kontrol kembali ke sistem sesuai ambang</span>
        </div>
      </section>

      {/* Aksi manual */}
      <section className="vsf-card p-4">
        <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">Aksi manual (hanya mode MANUAL)</div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={busy !== null || !terjangkau || mode !== 'MANUAL'}
            onClick={() => void action('fill')}
            className="vsf-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy === 'fill' && <span className="vsf-spinner" />}
            {busy === 'fill' ? 'Mengirim…' : 'Isi Air (Fill)'}
          </button>
          <button
            type="button"
            disabled={busy !== null || !terjangkau || mode !== 'MANUAL'}
            onClick={() => void action('stop')}
            className="vsf-input rounded-full font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy === 'stop' && <span className="vsf-spinner vsf-spinner-dark" />}
            {busy === 'stop' ? 'Mengirim…' : 'Stop'}
          </button>
          <span className="text-[12px] text-slate-500">status polling tiap 5 dtk, tombol nonaktif saat perintah diproses</span>
        </div>
        {mode === 'MANUAL' && (
          <div className="mt-2 flex items-start gap-2 text-[12px] text-amber-800 bg-amber-50 border border-amber-500/40 rounded-input px-3 py-2">
            <IkonPeringatan className="mt-[1px] shrink-0" />
            <span>Mode MANUAL aktif — sistem tidak akan mengisi air otomatis.</span>
          </div>
        )}
        {!terjangkau && (
          <div className="mt-2 flex items-start gap-2 text-[12px] text-red-700 bg-red-50 border border-red-600/40 rounded-input px-3 py-2">
            <IkonSalah className="mt-[1px] shrink-0" />
            <span>Status tidak terjangkau — aksi dinonaktifkan sampai koneksi pulih.</span>
          </div>
        )}
      </section>

      {/* Riwayat perintah */}
      <section className="vsf-card p-4">
        <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">Riwayat perintah</div>
        <div className="mt-3 overflow-auto rounded-card border border-arutmin-border bg-white vsf-table">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-navy/[.055]">
                {['Waktu', 'Perintah', 'Sumber', 'Hasil'].map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className="border-b border-navy/25 px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[.14em] text-navy"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {barisRiwayat.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-slate-500">
                    Belum ada perintah — perintah terakhir dari server akan tampil di sini.
                  </td>
                </tr>
              ) : (
                barisRiwayat.map((r) => (
                  <tr key={r.key} className="even:bg-navy/[.03] hover:bg-navy/[.06] transition-colors">
                    <td className="px-4 py-2.5 font-semibold text-slate-900 tabular-nums">{tgl(r.waktu)}</td>
                    <td className="px-4 py-2.5 text-slate-700">{r.perintah}</td>
                    <td className="px-4 py-2.5 text-slate-700">{r.sumber}</td>
                    <td className={clsx('px-4 py-2.5', r.ok ? 'text-arutmin-forest' : 'text-red-700')}>
                      <span className="flex items-start gap-2">
                        {r.ok ? <IkonOk className="mt-[2px] shrink-0" /> : <IkonSalah className="mt-[2px] shrink-0" />}
                        <span>{r.hasil}</span>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="vsf-card p-4">
        <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">Tentang layar ini</div>
        <ul className="mt-2 list-disc pl-5 text-[13px] text-slate-700 leading-relaxed">
          <li>
            Live: GET /watercontrol/status (polling 5 dtk) · POST /watercontrol/setMode · POST /watercontrol/fill|stop —
            Bearer JWT.
          </li>
          <li>Error kontrak aktif: 401 → redirect login · 403 mode demo → pesan ramah dari server · offline → banner +
            aksi dinonaktifkan.</li>
          <li>State: perintah terkirim → spinner di tombol sampai status terbaru masuk (polling).</li>
        </ul>
      </section>
    </div>
  )
}
