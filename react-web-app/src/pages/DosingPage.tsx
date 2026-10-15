import { useState, useEffect } from 'react'
import clsx from 'clsx'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../lib/authContext'

/* ── Types ─────────────────────────────────────────────────────────── */
type ModeDosing = 'AUTO' | 'MANUAL'
type StatusPompa = 'ON' | 'OFF'

interface DosingState {
  mode: ModeDosing
  pompa: StatusPompa
  tdsAktual: number
  tdsTarget: number
  tdsMin: number
  tdsMax: number
  injeksiBerjalan: boolean
  mlPerInjeksi: number
  totalHariIni: number
  batasHarian: number
  sisaBotol: number
  kapasitasBotol: number
  lastInject: string
}

interface LogDosing {
  waktu: string
  jenis: string
  jumlah: string
  tdsSebelum: string
  tdsSesudah: string
  status: string
}

/* ── Data dummy ─────────────────────────────────────────────────────── */
const LOG_AWAL: LogDosing[] = [
  { waktu: '14:28:02', jenis: 'Nutrisi A + B', jumlah: '45 ml', tdsSebelum: '980 ppm', tdsSesudah: '1120 ppm', status: 'sukses' },
  { waktu: '13:55:18', jenis: 'Nutrisi A + B', jumlah: '50 ml', tdsSebelum: '890 ppm', tdsSesudah: '1010 ppm', status: 'sukses' },
  { waktu: '13:22:40', jenis: 'Nutrisi A + B', jumlah: '50 ml', tdsSebelum: '780 ppm', tdsSesudah: '920 ppm', status: 'sukses' },
  { waktu: '12:50:11', jenis: 'Nutrisi A + B', jumlah: '40 ml', tdsSebelum: '690 ppm', tdsSesudah: '810 ppm', status: 'sukses' },
  { waktu: '12:15:33', jenis: 'pH Down', jumlah: '10 ml', tdsSebelum: '—', tdsSesudah: '6.3', status: 'sukses' },
  { waktu: '11:48:09', jenis: 'Nutrisi A + B', jumlah: '55 ml', tdsSebelum: '620 ppm', tdsSesudah: '780 ppm', status: 'sukses' },
  { waktu: '11:12:55', jenis: 'Nutrisi A + B', jumlah: '50 ml', tdsSebelum: '540 ppm', tdsSesudah: '680 ppm', status: 'cooldown' },
]

/* ── Page ──────────────────────────────────────────────────────────── */
export default function DosingPage() {
  const { role } = useAuth()
  const readOnly = role === 'petani' || role === 'demo'
  const [searchParams] = useSearchParams()
  const stateVariant = searchParams.get('state') ?? 'ok'
  const isLoading = stateVariant === 'loading'
  const isOffline = stateVariant === 'offline'
  const isEmpty = stateVariant === 'empty'

  const [st, setSt] = useState<DosingState>({
    mode: 'AUTO',
    pompa: 'OFF',
    tdsAktual: 1180,
    tdsTarget: 1150,
    tdsMin: 900,
    tdsMax: 1400,
    injeksiBerjalan: false,
    mlPerInjeksi: 50,
    totalHariIni: 340,
    batasHarian: 500,
    sisaBotol: 2800,
    kapasitasBotol: 5000,
    lastInject: '14:28:02',
  })
  const [busy, setBusy] = useState<'mode' | 'inject' | null>(null)
  const [logs, setLogs] = useState<LogDosing[]>(isEmpty ? [] : LOG_AWAL)
  const [flash, setFlash] = useState(false)

  // polling simulasi — TDS naik perlahan; flash dipicu dari event ini
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const id = setInterval(() => {
      setSt((s) => {
        const drift = Math.round((Math.random() - 0.45) * 30)
        return { ...s, tdsAktual: Math.max(200, Math.min(2200, s.tdsAktual + drift)) }
      })
      setFlash(true)
      clearTimeout(timer)
      timer = setTimeout(() => setFlash(false), 700)
    }, 4000)
    return () => {
      clearInterval(id)
      clearTimeout(timer)
    }
  }, [])

  function gantiMode(next: ModeDosing) {
    if (busy || readOnly) return
    setBusy('mode')
    setTimeout(() => {
      setSt((s) => ({ ...s, mode: next, pompa: next === 'MANUAL' ? 'OFF' : s.pompa }))
      setBusy(null)
    }, 500)
  }

  function injeksiManual() {
    if (busy || readOnly || st.mode !== 'MANUAL' || st.injeksiBerjalan) return
    setBusy('inject')
    setSt((s) => ({ ...s, injeksiBerjalan: true, pompa: 'ON' }))
    setTimeout(() => {
      const now = new Date().toLocaleTimeString('id-ID', { hour12: false })
      setSt((s) => ({
        ...s,
        injeksiBerjalan: false,
        pompa: 'OFF',
        totalHariIni: Math.min(s.batasHarian, s.totalHariIni + s.mlPerInjeksi),
        sisaBotol: Math.max(0, s.sisaBotol - s.mlPerInjeksi),
        lastInject: now,
      }))
      setLogs((l) => [
        {
          waktu: now,
          jenis: 'Nutrisi A + B',
          jumlah: `${st.mlPerInjeksi} ml`,
          tdsSebelum: `${st.tdsAktual} ppm`,
          tdsSesudah: `${st.tdsAktual + Math.round(st.mlPerInjeksi * 2.2)} ppm`,
          status: 'sukses',
        },
        ...l,
      ])
      setBusy(null)
    }, 1400)
  }

  function exportCSV() {
    const header = 'WAKTU,JENIS,JUMLAH,TDS SEBELUM,TDS SESUDAH,STATUS'
    const rows = logs.map((l) => `${l.waktu},${l.jenis},${l.jumlah},${l.tdsSebelum},${l.tdsSesudah},${l.status}`)
    const csv = [header, ...rows].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dosing-log-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  /* ── Derived ───────────────────────────────────────────────────── */
  const pctBotol = Math.round((st.sisaBotol / st.kapasitasBotol) * 100)
  const pctHarian = Math.round((st.totalHariIni / st.batasHarian) * 100)
  const tdsOutOfRange = st.tdsAktual < st.tdsMin || st.tdsAktual > st.tdsMax
  const isAutoInjecting = st.mode === 'AUTO' && tdsOutOfRange && !isOffline

  return (
    <div className="mx-auto max-w-[1180px] grid gap-4 vsf-stagger">

      {/* ── Hero status ────────────────────────────────────────────── */}
      <section className="vsf-card p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">
            Status Dosing Otomatis
          </div>
          <span className="flex-1" />
          <div className="flex gap-2">
            {(['AUTO', 'MANUAL'] as ModeDosing[]).map((m) => (
              <button
                key={m}
                type="button"
                disabled={busy === 'mode' || readOnly || isOffline}
                onClick={() => gantiMode(m)}
                className={clsx(
                  'vsf-pill disabled:opacity-50 disabled:cursor-not-allowed',
                  st.mode === m
                    ? 'border-arutmin-moss bg-activePill text-white'
                    : 'border-arutmin-border bg-white text-slate-700 hover:border-arutmin-moss/60',
                )}
              >
                {busy === 'mode' && m !== st.mode && <span className="vsf-spinner vsf-spinner-dark" />}
                {m === 'AUTO' ? 'AUTO (otomatis)' : 'MANUAL'}
              </button>
            ))}
          </div>
        </div>

        {isOffline && (
          <div className="vsf-banner mt-3 rounded-input border border-red-600/50 bg-red-50 px-3 py-2 text-[13px] text-red-700" role="alert">
            ✖ Perangkat dosing offline — injeksi dinonaktifkan sampai alat terhubung kembali.
          </div>
        )}
        {st.mode === 'MANUAL' && !isOffline && (
          <div className="mt-2 text-[12px] text-amber-800 bg-amber-50 border border-amber-500/40 rounded-input px-3 py-2">
            ⚠ Mode MANUAL aktif — injeksi otomatis nonaktif. Gunakan tombol manual di bawah.
          </div>
        )}

        {/* Metric cards */}
        <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3 vsf-stagger">
          {/* TDS Aktual */}
          <MetricCard
            label="TDS Aktual"
            value={`${st.tdsAktual} ppm`}
            sub={`target ${st.tdsMin}–${st.tdsMax}`}
            flash={flash}
            status={tdsOutOfRange ? 'warning' : 'ok'}
            isLoading={isLoading}
          />
          {/* Pompa */}
          <MetricCard
            label="Pompa Nutrisi"
            value={isOffline ? '—' : st.injeksiBerjalan ? 'INJEKSI…' : st.pompa}
            sub={isAutoInjecting ? 'injeksi otomatis berjalan' : `perintah terakhir: ${st.lastInject}`}
            status={isOffline ? 'error' : st.injeksiBerjalan ? 'warning' : st.pompa === 'ON' ? 'ok' : 'idle'}
            isLoading={isLoading}
          />
          {/* Botol Nutrisi */}
          <MetricCard
            label="Sisa Botol"
            value={`${st.sisaBotol} ml`}
            sub={`${pctBotol}% dari ${st.kapasitasBotol} ml`}
            status={pctBotol < 15 ? 'error' : pctBotol < 30 ? 'warning' : 'ok'}
            isLoading={isLoading}
          />
          {/* Total hari ini */}
          <MetricCard
            label="Total Injeksi Hari Ini"
            value={`${st.totalHariIni} ml`}
            sub={`batas ${st.batasHarian} ml · ${pctHarian}%`}
            status={pctHarian > 90 ? 'warning' : 'ok'}
            isLoading={isLoading}
          />
        </div>

        {/* progress bars */}
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <div className="flex justify-between text-[11px] text-slate-500 mb-1">
              <span>Botol nutrisi</span>
              <span>{pctBotol}%</span>
            </div>
            <div className="h-2 rounded-full bg-arutmin-mint/50 overflow-hidden">
              <div
                className={clsx('h-full rounded-full transition-all duration-700', pctBotol < 15 ? 'bg-red-600' : pctBotol < 30 ? 'bg-arutmin-warning' : 'bg-arutmin-moss')}
                style={{ width: `${pctBotol}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[11px] text-slate-500 mb-1">
              <span>Limit harian</span>
              <span>{pctHarian}%</span>
            </div>
            <div className="h-2 rounded-full bg-arutmin-mint/50 overflow-hidden">
              <div
                className={clsx('h-full rounded-full transition-all duration-700', pctHarian > 90 ? 'bg-arutmin-warning' : 'bg-arutmin-moss')}
                style={{ width: `${Math.min(100, pctHarian)}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Aksi manual ─────────────────────────────────────────────── */}
      <section className="vsf-card p-4">
        <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">
          Aksi Dosing (hanya mode MANUAL)
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={busy !== null || readOnly || isOffline || st.mode !== 'MANUAL' || st.injeksiBerjalan}
            onClick={injeksiManual}
            className="vsf-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy === 'inject' && <span className="vsf-spinner" />}
            {busy === 'inject' ? 'Menginjeksi…' : `Injeksi ${st.mlPerInjeksi} ml`}
          </button>
          <button type="button" disabled className="vsf-input rounded-full font-semibold disabled:opacity-50">
            Hentikan Injeksi
          </button>
          <div className="text-[12px] text-slate-500">
            injeksi berjalan ~2 dtk · pompa OFF setelah selesai · status polling tiap 4 dtk
          </div>
        </div>
        {readOnly && (
          <div className="mt-2 text-[12px] text-slate-500">
            Aksi dosing nonaktif untuk peran {role}.
          </div>
        )}
      </section>

      {/* ── Pengaturan ambang ────────────────────────────────────────── */}
      <section className="vsf-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">
            Pengaturan Ambang Dosing
          </div>
          <span className="flex-1" />
          <button type="button" disabled={readOnly} className="vsf-input rounded-full font-semibold disabled:opacity-50">
            Simpan Pengaturan
          </button>
        </div>
        <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Field label="TDS Minimum (ppm)">
            <input className="vsf-input w-full" value={st.tdsMin} disabled readOnly />
          </Field>
          <Field label="TDS Maksimum (ppm)">
            <input className="vsf-input w-full" value={st.tdsMax} disabled readOnly />
          </Field>
          <Field label="TDS Target (ppm)">
            <input className="vsf-input w-full" value={st.tdsTarget} disabled readOnly />
          </Field>
          <Field label="Injeksi per Aksi (ml)">
            <input className="vsf-input w-full" value={st.mlPerInjeksi} disabled readOnly />
          </Field>
        </div>
        <div className="mt-2 text-[12px] text-slate-500">
          Ambang TDS mengikuti <b>Ambang Sensor</b> — injeksi otomatis aktif saat TDS di luar rentang {st.tdsMin}–{st.tdsMax} ppm.
        </div>
      </section>

      {/* ── Log injeksi ─────────────────────────────────────────────── */}
      <section className="vsf-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">
            Log Injeksi
          </div>
          <span className="flex-1" />
          <button type="button" onClick={exportCSV} className="vsf-input rounded-full font-semibold">
            ⬇ Unduh CSV
          </button>
        </div>

        {logs.length === 0 ? (
          <div className="mt-3 rounded-card border border-dashed border-arutmin-border p-8 text-center">
            <div className="text-[28px]" aria-hidden>💉</div>
            <div className="mt-2 font-bold text-slate-700">Belum ada log injeksi</div>
            <div className="text-[13px] text-slate-500">Log injeksi akan muncul setelah dosing pertama berjalan.</div>
          </div>
        ) : (
          <div className="mt-3 overflow-auto rounded-card border border-arutmin-border bg-white vsf-table">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-arutmin-mint/25">
                  {['Waktu', 'Jenis', 'Jumlah', 'TDS Sebelum', 'TDS Sesudah', 'Status'].map((h) => (
                    <th
                      key={h}
                      className="text-left px-3 py-2 text-[11px] uppercase tracking-[.12em] text-arutmin-forest border-b-2 border-arutmin-moss"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((l, i) => (
                  <tr key={`${l.waktu}-${i}`} className="hover:bg-arutmin-mint/15">
                    <td className="px-3 py-2 font-semibold text-slate-900 font-mono">{l.waktu}</td>
                    <td className="px-3 py-2 text-slate-700">{l.jenis}</td>
                    <td className="px-3 py-2 text-slate-700">{l.jumlah}</td>
                    <td className="px-3 py-2 text-slate-700">{l.tdsSebelum}</td>
                    <td className="px-3 py-2 text-slate-700">{l.tdsSesudah}</td>
                    <td className="px-3 py-2">
                      <span
                        className={clsx(
                          'inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                          l.status === 'sukses'
                            ? 'border-arutmin-moss/50 bg-arutmin-mint/25 text-arutmin-forest'
                            : l.status === 'cooldown'
                              ? 'border-amber-500/60 bg-amber-50 text-amber-800'
                              : 'border-red-600/50 bg-red-50 text-red-700',
                        )}
                      >
                        {l.status === 'sukses' ? '✔' : l.status === 'cooldown' ? '⏳' : '✖'} {l.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Catatan state ──────────────────────────────────────────── */}
      <section className="vsf-card p-4">
        <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">
          Catatan Struktur & State
        </div>
        <ul className="mt-2 list-disc pl-5 text-[13px] text-slate-700 leading-relaxed">
          <li>State: perangkat offline → tombol aksi disabled + banner error + nilai freeze.</li>
          <li>State: injeksi berjalan → spinner di tombol + status pompa “INJEKSI…”. Tombol lain disabled.</li>
          <li>State: botol {'<'} 15% → badge merah + progress bar merah. {'<'} 30% → amber.</li>
          <li>State: total harian {'>'} 90% batas → progress amber + pesan peringatan.</li>
          <li>State: TDS di luar ambang → kartu TDS menyorot amber/merah + flash effect.</li>
          <li>Mode AUTO: injeksi berjalan otomatis saat TDS di luar rentang (dari endpoint `/api/save-sensor`).</li>
          <li>Mode MANUAL: injeksi hanya lewat tombol, sistem tidak mengisi sendiri.</li>
          <li>Akses petani: read-only — tombol injeksi, ganti mode, dan simpan pengaturan nonaktif.</li>
          <li>Export CSV mengikuti filter aktif, nama file berperiode tanggal.</li>
          <li>Polling status 4 detik (real-time tanpa reload). Flash highlight pada nilai TDS berubah.</li>
        </ul>
      </section>
    </div>
  )
}

/* ── Komponen bantu ─────────────────────────────────────────────────── */

function MetricCard({ label, value, sub, status = 'ok', flash = false, isLoading = false }: {
  label: string; value: string; sub: string; status?: 'ok' | 'warning' | 'error' | 'idle'; flash?: boolean; isLoading?: boolean
}) {
  return (
    <div
      className={clsx(
        'rounded-card border bg-white p-4 transition-all duration-200',
        status === 'error' ? 'border-red-600/50' : status === 'warning' ? 'border-amber-500/50' : 'border-arutmin-border',
        flash && 'vsf-flash',
      )}
    >
      <div className="text-[11px] uppercase tracking-[.12em] text-slate-500">{label}</div>
      {isLoading ? (
        <div className="vsf-skeleton h-[28px] w-[80%] mt-2" />
      ) : (
        <div
          className={clsx(
            'text-[20px] font-extrabold mt-1',
            status === 'error' ? 'text-red-700' : status === 'warning' ? 'text-amber-700' : status === 'idle' ? 'text-slate-400' : 'text-arutmin-forest',
          )}
        >
          {value}
        </div>
      )}
      <div className="text-[11px] text-slate-500 mt-0.5">{sub}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold text-slate-600">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  )
}
