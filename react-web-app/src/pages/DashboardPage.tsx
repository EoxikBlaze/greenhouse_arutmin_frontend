import { Link } from 'react-router-dom'
import { StatusBadge } from '../components/StatusBadge'
import { useAuth } from '../lib/authContext'
import { useApiObject } from '../lib/useApiObject'

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
  water_level?: string | null
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

export default function DashboardPage() {
  const { role } = useAuth()
  const { data, loading, error, reload } = useApiObject<DashboardData>('/dashboard')

  const kelola = role !== 'petani' // menu pengelola (semai/water control) tidak ditawarkan ke petani
  const s = data?.latest_sensor ?? null
  const wc = data?.water_control ?? null
  const iot = data?.iotStatus ?? null
  const online = !!iot?.online
  const statusKata = online ? 'perangkat online' : 'perangkat offline'

  const metrik = [
    { k: 'ph', label: 'pH (Asam-Basa)', nilai: angka(s?.ph, 2), target: 'target 5.5–6.5' },
    { k: 'waterTemp', label: 'Suhu Air Tandon', nilai: `${angka(s?.waterTemp, 1)} °C`, target: 'target 24–28' },
    { k: 'tds', label: 'TDS Nutrisi', nilai: `${angka(s?.tds)} ppm`, target: 'target 900–1400' },
    { k: 'airTemp', label: 'Suhu Udara', nilai: `${angka(s?.airTemp, 1)} °C`, target: 'target 25–33' },
    { k: 'humidity', label: 'Kelembapan', nilai: `${angka(s?.humidity)} %`, target: 'target 60–80' },
    {
      k: 'level',
      label: 'Level Tandon',
      nilai: s?.water_level ? String(s.water_level) : '—',
      target: `Katup: ${wc?.valve_state ?? '—'} • Mode ${wc?.mode ?? '—'}`,
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
    { k: 'panen', label: 'Panen', total: data?.total_panen, jalan: data?.total_panen_qty, to: '/panen', ket: 'hasil (kg)' },
  ]

  return (
    <div className="mx-auto max-w-[1180px] grid gap-4 vsf-stagger">
      {error && (
        <div
          role="alert"
          className="vsf-banner rounded-input border border-red-600/50 bg-red-50 px-3 py-2 text-[13px] text-red-700 flex flex-wrap items-center gap-3"
        >
          <span>✖ {error}</span>
          <button type="button" className="vsf-input rounded-full font-semibold" onClick={reload}>
            Coba lagi
          </button>
        </div>
      )}

      {/* Hero sambutan + aksi cepat (Link sungguhan, disesuaikan role) */}
      <section className="vsf-card p-4">
        <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">Hero sambutan + aksi cepat</div>
        <div className="mt-3 flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[260px]">
            <div className="text-[18px] font-bold">Selamat Datang di GARAP — PT Arutmin Indonesia</div>
            <div className="text-[13px] text-slate-600 mt-1">
              Pantau kondisi air nutrisi, suhu tanaman, dan jadwal panen hidroponik.
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link to="/sensor-realtime" className="vsf-input rounded-full font-semibold">
                Lihat Grafik Sensor
              </Link>
              {kelola ? (
                <>
                  <Link to="/semai" className="vsf-input rounded-full font-semibold">
                    Mulai Semai Baru
                  </Link>
                  <Link to="/watercontrol" className="vsf-input rounded-full font-semibold">
                    Water Control
                  </Link>
                </>
              ) : (
                <Link to="/tanam" className="vsf-input rounded-full font-semibold">
                  Tanam Saya
                </Link>
              )}
            </div>
          </div>

          {/* Panel status IoT (mengganti kotak placeholder) */}
          <div className="w-[220px] rounded-card border border-arutmin-border bg-white p-4">
            <div className="text-[11px] uppercase tracking-[.14em] text-slate-500">Status IoT</div>
            <div className="mt-2">
              {loading && !data ? (
                <div className="vsf-skeleton h-[24px] w-[130px]" />
              ) : (
                <StatusBadge tone={online ? 'online' : 'offline'} label={online ? 'Alat Terhubung' : 'Alat Terputus'} />
              )}
            </div>
            <div className="mt-2 text-[12px] text-slate-600">
              {iot?.last_seen ? (
                <>
                  Bacaan terakhir: {tgl(iot.last_seen)}
                  <br />
                  {iot.diff_text ?? ''}
                </>
              ) : (
                'Belum ada bacaan sensor.'
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 6 kartu metrik live */}
      <section className="vsf-card p-4">
        <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">
          Kondisi Air &amp; Tanaman Terkini — 6 kartu metrik live
        </div>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {loading && !data
            ? Array.from({ length: 6 }, (_, i) => <div key={i} className="vsf-skeleton h-[104px]" />)
            : metrik.map((m) => (
                <div key={m.k} className="rounded-card border border-arutmin-border bg-white p-4">
                  <div className="text-[11px] uppercase tracking-[.14em] text-slate-500">{m.label}</div>
                  <div className="text-[22px] font-extrabold mt-1">{m.nilai}</div>
                  <div className="text-[12px] text-slate-600">
                    {m.target} • {statusKata}
                  </div>
                  <Link
                    to="/sensor-realtime"
                    className="mt-1 inline-block text-[12px] font-semibold text-arutmin-forest underline"
                  >
                    Detail Grafik →
                  </Link>
                </div>
              ))}
        </div>
        {s?.created_at && (
          <div className="mt-2 text-[12px] text-slate-500">Bacaan sensor terakhir: {tgl(s.created_at)}</div>
        )}
      </section>

      {/* Pipeline 4 tahap */}
      <section className="vsf-card p-4">
        <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">
          Pipeline 4 tahap — Semai → Peremajaan → Pendewasaan → Panen
        </div>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {loading && !data
            ? Array.from({ length: 4 }, (_, i) => <div key={i} className="vsf-skeleton h-[96px]" />)
            : pipeline.map((p) => (
                <div key={p.k} className="rounded-card border border-arutmin-border bg-white p-4">
                  <div className="text-[11px] uppercase tracking-[.14em] text-slate-500">{p.label}</div>
                  <div className="text-[22px] font-extrabold mt-1">{angka(p.total)}</div>
                  <div className="text-[12px] text-slate-600">
                    {angka(p.jalan)} {p.ket}
                  </div>
                  {kelola && (
                    <Link to={p.to} className="mt-1 inline-block text-[12px] font-semibold text-arutmin-forest underline">
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
