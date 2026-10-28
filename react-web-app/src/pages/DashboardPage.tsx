import { Link } from 'react-router-dom'
import { useAuth } from '../lib/authContext'
import { useApiObject, useFlashOnChange } from '../lib/useApiObject'
import { waktuBasi } from '../lib/waktu'
import { Ikon, type NamaIkon } from '../components/Ikon'
import { AngkaHidup } from '../components/AngkaHidup'
import { TrenBatang } from '../components/TrenBatang'

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
function adaAngka(v: unknown): boolean {
  return v !== null && v !== undefined && String(v).trim() !== '' && Number.isFinite(Number(v))
}

function angka(v: unknown, digit = 0): string {
  if (v === null || v === undefined || String(v).trim() === '') return '—'
  const n = Number(v)
  if (Number.isNaN(n)) return String(v)
  return digit > 0 ? n.toFixed(digit) : String(Math.round(n))
}
/** Ikon per metrik (Lucide) — warna ikut warna teks induk. */
const IKON_METRIK: Record<string, NamaIkon> = {
  ph: 'ph',
  waterTemp: 'suhu',
  tds: 'dosing',
  airTemp: 'matahari',
  humidity: 'tetes',
  level: 'air',
}

function IkonMetrik({ kind }: { kind: string }) {
  return <Ikon nama={IKON_METRIK[kind] ?? 'ph'} className="h-[18px] w-[18px]" />
}

export default function DashboardPage() {
  const { role, username } = useAuth()
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
    { k: 'ph', label: 'pH (Asam-Basa)', nilai: angka(s?.ph, 2), num: s?.ph, digit: 2, akhiran: '', target: batas('ph') },
    { k: 'waterTemp', label: 'Suhu Air Tandon', nilai: `${angka(s?.waterTemp, 1)} °C`, num: s?.waterTemp, digit: 1, akhiran: ' °C', target: batas('waterTemp') },
    { k: 'tds', label: 'TDS Nutrisi', nilai: `${angka(s?.tds)} ppm`, num: s?.tds, digit: 0, akhiran: ' ppm', target: batas('tds') },
    { k: 'airTemp', label: 'Suhu Udara', nilai: `${angka(s?.airTemp, 1)} °C`, num: s?.airTemp, digit: 1, akhiran: ' °C', target: batas('airTemp') },
    { k: 'humidity', label: 'Kelembapan', nilai: `${angka(s?.humidity)} %`, num: s?.humidity, digit: 0, akhiran: ' %', target: batas('humidity') },
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

  const batchAktif = (data?.semai_aktif ?? 0) + (data?.peremajaan_aktif ?? 0) + (data?.pendewasaan_aktif ?? 0)
  const jamSekarang = new Date().getHours()
  const sapaan = jamSekarang < 11 ? 'pagi' : jamSekarang < 15 ? 'siang' : jamSekarang < 18 ? 'sore' : 'malam'
  const nama = (username || role || '').trim()

  return (
    <div className="vsf-halaman vsf-stagger">
      {error && (
        <div
          role="alert"
          className="vsf-banner rounded-input vsf-tone-error px-3 py-2 text-[13px] flex flex-wrap items-center gap-3"
        >
          <span className="flex items-center gap-2">
            <Ikon nama="salah" className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </span>
          <button type="button" className="vsf-input rounded-full font-semibold" onClick={reload}>
            Coba lagi
          </button>
        </div>
      )}

      {/* Sapaan */}
      <header>
        <div className="glass-card inline-flex max-w-full flex-col gap-1 px-5 py-4 sm:px-6">
          <h1 className="font-display text-[26px] font-bold leading-tight text-tinta sm:text-[32px]">
            Selamat {sapaan}, <span className="capitalize">{nama}</span>
          </h1>
          <p className="text-[13px] text-abu sm:text-[14px]">Pantau kondisi air nutrisi, suhu tanaman, dan jadwal panen hidroponik.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 md:gap-6 xl:grid-cols-12">
        {/* Hero: status greenhouse + aksi cepat (padanan kartu saldo di referensi) */}
        <section className="glass-hero flex flex-col p-5 sm:p-6 xl:col-span-5" aria-label="Status greenhouse">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[12px] font-bold uppercase tracking-[.14em] text-arutmin-forest/75">Status greenhouse</div>
            <span className="vsf-chip-terang" role="status">
              <span className={`h-2 w-2 rounded-full ${online ? 'bg-moss' : 'bg-arutmin-error'}`} aria-hidden />
              {online ? 'Alat terhubung' : 'Alat terputus'}
            </span>
          </div>
          <div className="mt-5">
            <div className="text-[13px] text-abu">Batch tanam berjalan</div>
            <div className="font-display text-[48px] font-bold leading-none tabular-nums text-tinta sm:text-[56px]">
              {loading && !data ? <span className="vsf-skeleton inline-block h-[52px] w-[120px] align-middle" /> : <AngkaHidup nilai={batchAktif} />}
            </div>
            <div className="mt-2 text-[12px] text-abu">
              {loading && !data ? (
                <span className="vsf-skeleton inline-block h-[16px] w-[200px]" />
              ) : iot?.last_seen ? (
                <>Bacaan terakhir: {iot.seconds_ago != null ? waktuBasi(iot.seconds_ago * 1000, iot.last_seen) : tgl(iot.last_seen)}</>
              ) : (
                'Belum ada bacaan sensor.'
              )}
            </div>
          </div>
          <div className="mt-auto flex flex-wrap gap-2 pt-6">
            <Link
              to="/sensor-realtime"
              className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-full bg-activePill px-4 py-2 text-[13px] font-semibold text-white shadow-[0_10px_20px_-10px_rgba(78,119,51,.95),inset_0_1px_0_rgba(255,255,255,.3)] transition hover:brightness-110 sm:flex-none"
            >
              <Ikon nama="sensor" className="h-4 w-4" />
              Lihat Grafik Sensor
            </Link>
            {kelola ? (
              <>
                <Link
                  to="/tanam"
                  state={{ mulaiBaru: true }}
                  className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full border border-white/90 bg-white/60 px-4 py-2 text-[13px] font-semibold text-tinta shadow-[inset_0_1px_0_#fff] transition hover:bg-white/85 sm:flex-none"
                >
                  Mulai Semai Baru
                </Link>
                <Link
                  to="/watercontrol"
                  className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full border border-white/90 bg-white/60 px-4 py-2 text-[13px] font-semibold text-tinta shadow-[inset_0_1px_0_#fff] transition hover:bg-white/85 sm:flex-none"
                >
                  Water Control
                </Link>
              </>
            ) : (
              <Link
                to="/tanam"
                className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full border border-white/90 bg-white/60 px-4 py-2 text-[13px] font-semibold text-tinta shadow-[inset_0_1px_0_#fff] transition hover:bg-white/85 sm:flex-none"
              >
                Tanam Saya
              </Link>
            )}
          </div>
        </section>

        {/* KPI: enam metrik; pH dan TDS disorot (hijau dan emas) */}
        <section className="xl:col-span-7" aria-label="Kondisi air dan tanaman">
          <div className="grid h-full grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
            {loading && !data
              ? Array.from({ length: 6 }, (_, i) => <div key={i} className="vsf-skeleton min-h-[132px]" />)
              : metrik.map((m) => {
                  const sorot = m.k === 'ph' ? 'vsf-kpi-hijau' : m.k === 'tds' ? 'vsf-kpi-emas' : 'vsf-kpi-kaca'
                  return (
                    <Link
                      key={m.k}
                      to="/sensor-realtime"
                      className={`vsf-kpi ${sorot} group flex min-h-[132px] flex-col justify-between p-4 sm:p-5`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-[13px] font-semibold opacity-80">{m.label}</div>
                        <span className="vsf-kpi-ikon grid h-9 w-9 shrink-0 place-items-center rounded-full">
                          <IkonMetrik kind={m.k} />
                        </span>
                      </div>
                      <div>
                        <div className={`font-display text-[28px] font-bold leading-tight tabular-nums sm:text-[32px] ${sensorFlash}`}>
                          {adaAngka(m.num) ? <AngkaHidup nilai={Number(m.num)} digit={m.digit} akhiran={m.akhiran} /> : m.nilai}
                        </div>
                        <div className="mt-0.5 text-[12px] opacity-75">
                          {m.target} • {statusKata}
                        </div>
                      </div>
                    </Link>
                  )
                })}
          </div>
          {s?.created_at && <div className="mt-2 px-1 text-[12px] text-tinta/80 [text-shadow:0_1px_8px_rgba(255,255,255,.9)]">Bacaan sensor terakhir: {tgl(s.created_at)}</div>}
        </section>

        {/* Grafik batang tren sensor */}
        <div className="xl:col-span-7">
          <TrenBatang />
        </div>

        {/* Daftar tahap tanam (padanan "Recent Activities") */}
        <section className="vsf-card flex flex-col p-4 sm:p-5 xl:col-span-5" aria-label="Alur tanam">
          <div className="vsf-judul-bagian">Alur Tanam — 4 Tahap</div>
          <ul className="mt-3 grid flex-1 content-start gap-2">
            {loading && !data
              ? Array.from({ length: 4 }, (_, i) => <li key={i} className="vsf-skeleton h-[64px]" />)
              : pipeline.map((p, i) => {
                  const total = Number(p.total ?? 0)
                  const jalan = Number(p.jalan ?? 0)
                  const persen = p.k === 'panen' || total <= 0 ? (total > 0 ? 100 : 0) : Math.min(100, Math.round((jalan / total) * 100))
                  return (
                    <li key={p.k} className="vsf-baris rounded-card border border-arutmin-border bg-white/85 p-3 transition hover:border-arutmin-moss/60 hover:bg-white">
                      <div className="flex items-center gap-3">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-arutmin-forest text-[13px] font-bold tabular-nums text-white">{i + 1}</span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[14px] font-semibold text-tinta">{p.label}</div>
                          <div className="text-[12px] text-abu">
                            {angka(p.jalan)} {p.ket}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-display text-[20px] font-bold leading-none tabular-nums text-arutmin-forest">
                            <AngkaHidup nilai={total} />
                          </div>
                          {kelola && (
                            <Link to={p.to} className="text-[12px] font-semibold text-arutmin-forest underline underline-offset-2 hover:text-arutmin-moss">
                              Buka →
                            </Link>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-arutmin-mint/60" aria-hidden>
                        <div className="vsf-progres h-full rounded-full bg-[linear-gradient(90deg,#6b9d4a,#e9cd53)]" style={{ width: `${persen}%`, animationDelay: `${i * 80}ms` }} />
                      </div>
                    </li>
                  )
                })}
          </ul>
        </section>
      </div>
    </div>
  )
}
