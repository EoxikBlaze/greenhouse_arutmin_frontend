import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/authContext'
import { useApiObject, useFlashOnChange } from '../lib/useApiObject'
import { waktuBasi } from '../lib/waktu'

/**
 * Dashboard live — GET /dashboard (semua role).
 * Payload: 6 metrik sensor terbaru, pipeline 4 tahap, status IoT, water control.
 */
type SensorTerkini = {
  ph?: number | null
  waterTemp?: number | null
  tds?: number | null
  airTemp?: number | null
  humidity?: number | null
  created_at?: string | null
}

type IotStatus = {
  online?: boolean
  seconds_ago?: number | null
  diff_text?: string | null
  last_seen?: string | null
}

type WaterControl = {
  command?: string | null
  mode?: string | null
  valve_state?: string | null
  updated_at?: string | null
}

type DashboardData = {
  iotStatus?: IotStatus | null
  latest_sensor?: SensorTerkini | null
  water_control?: WaterControl | null
  total_semai?: number | null
  semai_aktif?: number | null
  total_peremajaan?: number | null
  peremajaan_aktif?: number | null
  total_pendewasaan?: number | null
  pendewasaan_aktif?: number | null
  total_panen?: number | null
  total_panen_qty?: number | null
  /** Batas aman per sensor dari tabel sensor_thresholds (halaman Ambang Sensor). */
  ambang?: Record<string, { min: number | string | null; max: number | string | null }> | null
}

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

function tgl(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const jam = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()} • ${jam}`
}

/** Angka → teks tampil; null/kosong → "—", bukan angka bohong. */
function angka(v: unknown, digit = 0): string {
  if (v === null || v === undefined || String(v).trim() === '') return '—'
  const n = Number(v)
  if (Number.isNaN(n)) return String(v)
  return digit > 0 ? n.toFixed(digit) : String(Math.round(n))
}

/* ── Ikon SVG inline (R3): menggantikan emoji supaya seragam & tak dibaca layar baca ── */
type IkonProps = { className?: string }

function IkonSalah({ className }: IkonProps) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6.1 6.1l3.8 3.8M9.9 6.1L6.1 9.9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

/** Ikon per metrik — 18px, garis tipis, warna ikut warna teks induk. */
function IkonMetrik({ kind }: { kind: string }) {
  const p: Record<string, ReactNode> = {
    // tetes air (pH)
    ph: <path d="M8 2.2s4 4.6 4 7.3a4 4 0 1 1-8 0C4 6.8 8 2.2 8 2.2z" />,
    // termometer (suhu)
    waterTemp: (
      <>
        <path d="M6.6 3.2a1.6 1.6 0 0 1 3.2 0v6.4a2.8 2.8 0 1 1-3.2 0V3.2z" />
        <path d="M8.2 6.6v4.6" strokeLinecap="round" />
      </>
    ),
    // labu ukur (TDS)
    tds: (
      <>
        <path d="M6.3 2.4h3.4M7.2 2.4v4.2L4.6 11.4A1.6 1.6 0 0 0 6 13.7h4a1.6 1.6 0 0 0 1.4-2.3L8.8 6.6V2.4" />
        <path d="M5.6 10.2h4.8" />
      </>
    ),
    // matahari (suhu udara)
    airTemp: (
      <>
        <circle cx="8" cy="8" r="3" />
        <path d="M8 1.6v1.6M8 12.8v1.6M1.6 8h1.6M12.8 8h1.6M3.5 3.5l1.1 1.1M11.4 11.4l1.1 1.1M12.5 3.5l-1.1 1.1M4.6 11.4l-1.1 1.1" strokeLinecap="round" />
      </>
    ),
    // tetes kembar (kelembapan)
    humidity: (
      <>
        <path d="M6.4 2.6s3 3.5 3 5.5a3 3 0 1 1-6 0c0-2 3-5.5 3-5.5z" />
        <path d="M11.6 7.4s1.8 2.1 1.8 3.3a1.8 1.8 0 1 1-3.6 0c0-1.2 1.8-3.3 1.8-3.3z" />
      </>
    ),
    // katup air
    level: (
      <>
        <rect x="3" y="3.2" width="10" height="9.6" rx="1.6" />
        <path d="M3.4 8.6c1.2 0 1.6-1.2 2.8-1.2s1.6 1.2 2.8 1.2 1.6-1.2 2.8-1.2" strokeLinecap="round" />
      </>
    ),
  }
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {p[kind] ?? p.ph}
    </svg>
  )
}

export default function DashboardPage() {
  const { role } = useAuth()
  const { data, loading, error, reload } = useApiObject<DashboardData>('/dashboard')
  // P4 — sorot kilat 0.5s saat data sensor terkini berubah (refresh senyap).
  const sensorFlash = useFlashOnChange(JSON.stringify(data?.latest_sensor ?? null))

  const kelola = role !== 'petani' // menu pengelola (semai/water control) tidak ditawarkan ke petani
  const s = data?.latest_sensor ?? null
  const wc = data?.water_control ?? null
  const iot = data?.iotStatus ?? null
  const online = !!iot?.online
  const statusKata = online ? 'perangkat online' : 'perangkat offline'

  // batas aman dari halaman Ambang Sensor (server) — dulu angka target ditulis tetap di kode
  const batas = (k: string) => {
    const a = data?.ambang?.[k]
    if (!a || a.min == null || a.max == null) return 'batas aman belum diatur'
    const f = (v: number | string) => String(Number(v)).replace('.', ',')
    return `batas aman ${f(a.min)}–${f(a.max)}`
  }
  const metrik = [
    { k: 'ph', label: 'pH (Asam-Basa)', nilai: angka(s?.ph, 2), target: batas('ph') },
    { k: 'waterTemp', label: 'Suhu Air Tandon', nilai: `${angka(s?.waterTemp, 1)} °C`, target: batas('waterTemp') },
    { k: 'tds', label: 'TDS Nutrisi', nilai: `${angka(s?.tds)} ppm`, target: batas('tds') },
    { k: 'airTemp', label: 'Suhu Udara', nilai: `${angka(s?.airTemp, 1)} °C`, target: batas('airTemp') },
    { k: 'humidity', label: 'Kelembapan', nilai: `${angka(s?.humidity)} %`, target: batas('humidity') },
    {
      k: 'level',
      label: 'Katup Air',
      nilai: wc?.valve_state ? String(wc.valve_state) : '—',
      target: `Mode ${wc?.mode ?? '—'}`,
    },
  ]

  const pipeline = [
    { k: 'semai', label: 'Semai', total: data?.total_semai, jalan: data?.semai_aktif, to: '/semai', ket: 'berjalan' },
    {
      k: 'peremajaan',
      label: 'Peremajaan',
      total: data?.total_peremajaan,
      jalan: data?.peremajaan_aktif,
      to: '/peremajaan',
      ket: 'berjalan',
    },
    {
      k: 'pendewasaan',
      label: 'Pendewasaan',
      total: data?.total_pendewasaan,
      jalan: data?.pendewasaan_aktif,
      to: '/pendewasaan',
      ket: 'berjalan',
    },
    { k: 'panen', label: 'Panen', total: data?.total_panen, jalan: data?.total_panen_qty, to: '/panen', ket: 'tanaman dipanen' },
  ]

  return (
    <div className="mx-auto w-full max-w-[1180px] grid grid-cols-[minmax(0,1fr)] gap-4 vsf-stagger">
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

      {/* Sambutan + aksi cepat (Link nyata, disesuaikan role) — gradasi navy halus */}
      <section className="overflow-hidden rounded-card border border-black/10 shadow-sm transition hover:shadow-md">
        <div className="bg-[linear-gradient(135deg,#1B2E4A_0%,#223A24_58%,#2D452F_100%)] p-5 sm:p-6">
          <div className="flex flex-wrap items-start gap-5">
            <div className="flex-1 min-w-[260px]">
              <div className="text-[11px] uppercase tracking-[.14em] text-white/70 font-bold">Selamat datang</div>
              <div className="mt-2 text-[20px] sm:text-[24px] font-extrabold text-white leading-snug">
                Selamat Datang di GARAP — PT Arutmin Indonesia
              </div>
              <div className="mt-1 text-[13px] text-white/75">
                Pantau kondisi air nutrisi, suhu tanaman, dan jadwal panen hidroponik.
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  to="/sensor-realtime"
                  className="rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-arutmin-forest transition hover:bg-arutmin-mint"
                >
                  Lihat Grafik Sensor
                </Link>
                {kelola ? (
                  <>
                    <Link
                      to="/tanam"
                      state={{ mulaiBaru: true }}
                      className="rounded-full border border-white/40 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-white/10"
                    >
                      Mulai Semai Baru
                    </Link>
                    <Link
                      to="/watercontrol"
                      className="rounded-full border border-white/40 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-white/10"
                    >
                      Water Control
                    </Link>
                  </>
                ) : (
                  <Link
                    to="/tanam"
                    className="rounded-full border border-white/40 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-white/10"
                  >
                    Tanam Saya
                  </Link>
                )}
              </div>
            </div>

            {/* Panel status IoT (mengganti kotak placeholder) */}
            <div className="w-full sm:w-[240px] rounded-card border border-white/60 bg-white p-4">
              <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">Bacaan IoT</div>
              <div className="mt-2 text-[12px] text-slate-600">
                {loading && !data ? (
                  <div className="vsf-skeleton h-[24px] w-[130px]" />
                ) : iot?.last_seen ? (
                  <>Bacaan terakhir: {iot.seconds_ago != null ? waktuBasi(iot.seconds_ago * 1000, iot.last_seen) : tgl(iot.last_seen)}</>
                ) : (
                  'Belum ada bacaan sensor.'
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Kondisi air & tanaman — enam kartu ringkas */}
      <section className="vsf-card p-4">
        <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">Kondisi Air &amp; Tanaman Terkini</div>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {loading && !data
            ? Array.from({ length: 6 }, (_, i) => <div key={i} className="vsf-skeleton h-[112px]" />)
            : metrik.map((m) => (
                <div
                  key={m.k}
                  className="group rounded-card border border-arutmin-border bg-white p-4 transition hover:border-arutmin-moss/60 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">{m.label}</div>
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-arutmin-mint/40 text-arutmin-olive transition group-hover:bg-arutmin-mint/70">
                      <IkonMetrik kind={m.k} />
                    </span>
                  </div>
                  <div className={`mt-1 text-[26px] leading-tight font-extrabold text-arutmin-forest tabular-nums ${sensorFlash}`}>{m.nilai}</div>
                  <div className="text-[12px] text-slate-600">
                    {m.target} • {statusKata}
                  </div>
                  <Link
                    to="/sensor-realtime"
                    className="mt-1 inline-block text-[12px] font-semibold text-arutmin-forest underline underline-offset-2 transition group-hover:text-arutmin-moss"
                  >
                    Lihat grafik →
                  </Link>
                </div>
              ))}
        </div>
        {s?.created_at && (
          <div className="mt-2 text-[12px] text-slate-500">Bacaan sensor terakhir: {tgl(s.created_at)}</div>
        )}
      </section>

      {/* Alur tanam 4 tahap */}
      <section className="vsf-card p-4">
        <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">Alur Tanam — 4 Tahap</div>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {loading && !data
            ? Array.from({ length: 4 }, (_, i) => <div key={i} className="vsf-skeleton h-[104px]" />)
            : pipeline.map((p, i) => (
                <div
                  key={p.k}
                  className="group rounded-card border border-arutmin-border bg-white p-4 transition hover:border-arutmin-moss/60 hover:shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">{p.label}</div>
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-arutmin-forest text-[11px] font-bold text-white tabular-nums">
                      {i + 1}
                    </span>
                  </div>
                  <div className="mt-1 text-[26px] leading-tight font-extrabold text-arutmin-forest tabular-nums">{angka(p.total)}</div>
                  <div className="text-[12px] text-slate-600">
                    {angka(p.jalan)} {p.ket}
                  </div>
                  {kelola && (
                    <Link
                      to={p.to}
                      className="mt-1 inline-block text-[12px] font-semibold text-arutmin-forest underline underline-offset-2 transition group-hover:text-arutmin-moss"
                    >
                      Buka {p.label} →
                    </Link>
                  )}
                </div>
              ))}
        </div>
      </section>
    </div>
  )
}
