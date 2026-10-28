import { Link } from 'react-router-dom'
import { useAuth } from '../lib/authContext'
import { useApiObject, useFlashOnChange } from '../lib/useApiObject'
import { waktuBasi } from '../lib/waktu'
import { Ikon, type NamaIkon } from '../components/Ikon'
import { AngkaHidup } from '../components/AngkaHidup'

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

      {/* Sambutan + aksi cepat (Link nyata, disesuaikan role) — gradasi navy halus */}
      <section className="glass-hero overflow-hidden">
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start gap-5">
            <div className="flex-1 min-w-[260px]">
              <div className="text-[12px] uppercase tracking-[.14em] text-white/70 font-bold">Selamat datang</div>
              <div className="mt-2 text-[20px] sm:text-[24px] font-extrabold text-white leading-snug">
                Selamat Datang di GARAP — PT Arutmin Indonesia
              </div>
              <div className="mt-1 text-[13px] text-white/75">
                Pantau kondisi air nutrisi, suhu tanaman, dan jadwal panen hidroponik.
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  to="/sensor-realtime"
                  className="inline-flex min-h-[44px] basis-full items-center justify-center rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-arutmin-forest transition hover:bg-arutmin-mint sm:basis-auto"
                >
                  Lihat Grafik Sensor
                </Link>
                {kelola ? (
                  <>
                    <Link
                      to="/tanam"
                      state={{ mulaiBaru: true }}
                      className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full border border-white/40 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-white/10 sm:flex-none"
                    >
                      Mulai Semai Baru
                    </Link>
                    <Link
                      to="/watercontrol"
                      className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full border border-white/40 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-white/10 sm:flex-none"
                    >
                      Water Control
                    </Link>
                  </>
                ) : (
                  <Link
                    to="/tanam"
                    className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full border border-white/40 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-white/10 sm:flex-none"
                  >
                    Tanam Saya
                  </Link>
                )}
              </div>
            </div>

            {/* Panel status IoT (mengganti kotak placeholder) */}
            <div className="w-full sm:w-[240px] rounded-card border border-white/60 bg-white p-4">
              <div className="vsf-label">Bacaan IoT</div>
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
      <section className="vsf-card p-4 sm:p-5">
        <div className="vsf-judul-bagian">Kondisi Air &amp; Tanaman Terkini</div>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {loading && !data
            ? Array.from({ length: 6 }, (_, i) => <div key={i} className="vsf-skeleton h-[112px]" />)
            : metrik.map((m) => (
                <div
                  key={m.k}
                  className="group rounded-card border border-arutmin-border bg-white p-4 transition hover:border-arutmin-moss/60 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="vsf-label">{m.label}</div>
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-arutmin-mint/40 text-arutmin-olive transition group-hover:bg-arutmin-mint/70">
                      <IkonMetrik kind={m.k} />
                    </span>
                  </div>
                  <div className={`mt-1 text-[26px] leading-tight font-extrabold text-arutmin-forest tabular-nums ${sensorFlash}`}>{adaAngka(m.num) ? <AngkaHidup nilai={Number(m.num)} digit={m.digit} akhiran={m.akhiran} /> : m.nilai}</div>
                  <div className="text-[12px] text-slate-600">
                    {m.target} • {statusKata}
                  </div>
                  <Link
                    to="/sensor-realtime"
                    className="mt-1 inline-flex min-h-[44px] items-center text-[12px] sm:min-h-0 font-semibold text-arutmin-forest underline underline-offset-2 transition group-hover:text-arutmin-moss"
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
      <section className="vsf-card p-4 sm:p-5">
        <div className="vsf-judul-bagian">Alur Tanam — 4 Tahap</div>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {loading && !data
            ? Array.from({ length: 4 }, (_, i) => <div key={i} className="vsf-skeleton h-[104px]" />)
            : pipeline.map((p, i) => (
                <div
                  key={p.k}
                  className="group rounded-card border border-arutmin-border bg-white p-4 transition hover:border-arutmin-moss/60 hover:shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="vsf-label">{p.label}</div>
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-arutmin-forest text-[12px] font-bold text-white tabular-nums">
                      {i + 1}
                    </span>
                  </div>
                  <div className="mt-1 text-[26px] leading-tight font-extrabold text-arutmin-forest tabular-nums"><AngkaHidup nilai={Number(p.total ?? 0)} /></div>
                  <div className="text-[12px] text-slate-600">
                    {angka(p.jalan)} {p.ket}
                  </div>
                  {kelola && (
                    <Link
                      to={p.to}
                      className="mt-1 inline-flex min-h-[44px] items-center text-[12px] sm:min-h-0 font-semibold text-arutmin-forest underline underline-offset-2 transition group-hover:text-arutmin-moss"
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
