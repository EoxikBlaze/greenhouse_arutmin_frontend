import { useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import { api } from '../lib/api'
import { useApiError, useApiList } from '../lib/crudApi'
import { useAuth } from '../lib/authContext'
import { StatusBadge } from '../components/StatusBadge'

type Param = 'pH' | 'Suhu Air' | 'TDS' | 'Suhu Udara' | 'Kelembapan' | 'Level Air'
type Range = '6 Jam' | '24 Jam' | '7 Hari'

/** Satu titik GET /monitoring/chart-data (kolom tabel `monitorings`). */
type TitikData = {
  id?: string | number
  /** Waktu bacaan — nama kolom backend (alias `waktu` diterima bila ada). */
  created_at?: string | null
  waktu?: string | null
  ph?: number | null
  waterTemp?: number | null
  tds?: number | null
  airTemp?: number | null
  humidity?: number | null
  water_level?: string | null
}

const PARAM_DEFS: Record<Param, { field: keyof TitikData; unit: string; kategorikal?: boolean }> = {
  pH: { field: 'ph', unit: '' },
  'Suhu Air': { field: 'waterTemp', unit: '°C' },
  TDS: { field: 'tds', unit: 'ppm' },
  'Suhu Udara': { field: 'airTemp', unit: '°C' },
  Kelembapan: { field: 'humidity', unit: '%' },
  'Level Air': { field: 'water_level', unit: '', kategorikal: true },
}

const RANGE_MS: Record<Range, number> = {
  '6 Jam': 6 * 3_600_000,
  '24 Jam': 24 * 3_600_000,
  '7 Hari': 7 * 24 * 3_600_000,
}

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

function jam(iso: number): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function tgl(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()} ${jam(d.getTime())}`
}

function waktu(t: TitikData): string | null {
  return t.waktu ?? t.created_at ?? null
}

/** "3 menit lalu" / "2 hari lalu" — untuk menandai bacaan yang basi. */
function relatif(ms: number): string {
  const dtk = Math.max(0, Math.round(ms / 1000))
  if (dtk < 60) return `${dtk} detik lalu`
  const mnt = Math.round(dtk / 60)
  if (mnt < 60) return `${mnt} menit lalu`
  const jamLalu = Math.round(mnt / 60)
  if (jamLalu < 48) return `${jamLalu} jam lalu`
  return `${Math.round(jamLalu / 24)} hari lalu`
}

function Pill({ active, children, onClick }: { active?: boolean; children: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'inline-flex items-center rounded-full border px-3 py-1 text-[12px] font-semibold transition',
        active
          ? 'border-arutmin-moss bg-activePill text-white'
          : 'border-arutmin-border bg-white text-slate-700 hover:border-arutmin-moss/60',
      )}
    >
      {children}
    </button>
  )
}

/* ── Ikon SVG inline (R3): pengganti emoji ikon kotak/jam/peringatan — aria-hidden, 16px ── */
function IkonSalah({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6.1 6.1l3.8 3.8M9.9 6.1L6.1 9.9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
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

/** Ilustrasi kotak kosong — empty state "belum ada data" (44px). */
function IlustrasiKotakKosong() {
  return (
    <svg width="44" height="44" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect x="7" y="14" width="34" height="24" rx="4" stroke="#6B9D4A" strokeWidth="2" fill="#CFE2CE" fillOpacity="0.45" />
      <path d="M7 26h9l3 5h10l3-5h9" stroke="#6B9D4A" strokeWidth="2" strokeLinejoin="round" fill="none" />
      <path d="M17 10.5h14M20 6.5h8" stroke="#6B9D4A" strokeWidth="2" strokeLinecap="round" opacity="0.55" />
    </svg>
  )
}

/** Ilustrasi jam — empty state "rentang kosong" (44px). */
function IlustrasiJam() {
  return (
    <svg width="44" height="44" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <circle cx="24" cy="25" r="15" stroke="#6B9D4A" strokeWidth="2" fill="#CFE2CE" fillOpacity="0.45" />
      <path d="M24 17v8.5l5.5 3.5" stroke="#2D452F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 6.5h12" stroke="#6B9D4A" strokeWidth="2" strokeLinecap="round" opacity="0.55" />
    </svg>
  )
}

/* ── Grafik SVG (tanpa pustaka eksternal): garis + area + titik akhir ── */
const W = 800
const H = 260
const PL = 56
const PR = 14
const PT = 16
const PB = 30

function Grafik({ points, unit }: { points: Array<{ t: number; y: number; teks: string }>; unit: string }) {
  const min = Math.min(...points.map((p) => p.y))
  const max = Math.max(...points.map((p) => p.y))
  const span = max - min || 1
  const lo = min - span * 0.12
  const hi = max + span * 0.12
  const x = (t: number) => {
    const t0 = points[0].t
    const t1 = points[points.length - 1].t
    const r = t1 === t0 ? 0.5 : (t - t0) / (t1 - t0)
    return PL + r * (W - PL - PR)
  }
  const y = (v: number) => PT + (1 - (v - lo) / (hi - lo)) * (H - PT - PB)

  const garis = points.map((p) => `${x(p.t).toFixed(1)},${y(p.y).toFixed(1)}`).join(' ')
  const area = `${PL},${H - PB} ${garis} ${W - PR},${H - PB}`
  const ticks = Array.from({ length: 4 }, (_, i) => lo + ((hi - lo) * i) / 3)
  const digit = span >= 100 ? 0 : span >= 10 ? 1 : 2
  const akhir = points[points.length - 1]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="vsf-chart w-full h-auto" role="img" aria-label={`Grafik ${unit || 'nilai sensor'} terhadap waktu`}>
      {ticks.map((v, i) => (
        <g key={i}>
          <line x1={PL} x2={W - PR} y1={y(v)} y2={y(v)} stroke="#E2E8DD" strokeWidth={1} />
          <text x={PL - 8} y={y(v) + 4} textAnchor="end" fontSize={11} fill="#64748B">
            {v.toFixed(digit)}
          </text>
        </g>
      ))}
      <polygon points={area} fill="rgba(107,157,74,0.14)" />
      <polyline points={garis} fill="none" stroke="#6B9D4A" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {points.length <= 60 &&
        points.map((p, i) => (
          <circle key={i} cx={x(p.t)} cy={y(p.y)} r={2.5} fill="#4C6A4B">
            <title>{`${tgl(new Date(p.t).toISOString())} — ${p.teks}`}</title>
          </circle>
        ))}
      <circle cx={x(akhir.t)} cy={y(akhir.y)} r={5} fill="#6B9D4A" stroke="#fff" strokeWidth={2}>
        <title>{`${tgl(new Date(akhir.t).toISOString())} — ${akhir.teks}`}</title>
      </circle>

      <text x={PL} y={H - 8} fontSize={11} fill="#64748B">
        {tgl(new Date(points[0].t).toISOString())}
      </text>
      <text x={W - PR} y={H - 8} fontSize={11} fill="#64748B" textAnchor="end">
        {tgl(new Date(akhir.t).toISOString())}
      </text>
    </svg>
  )
}

export default function SensorRealtimePage() {
  const { role } = useAuth()
  const handleApiError = useApiError()
  const [param, setParam] = useState<Param>('pH')
  const [range, setRange] = useState<Range>('6 Jam')

  // Data live: GET /monitoring/chart-data → array titik (urut waktu naik).
  const { rows, loading, error, reload } = useApiList<TitikData>('/monitoring/chart-data')

  // Auto-refresh senyap tiap 15 dtk — tanpa reload halaman, tanpa kedip skeleton.
  // `kini` diisi lewat effect (bukan Date.now() di dalam render — aturan purity oxlint).
  const [kini, setKini] = useState(0)
  useEffect(() => {
    const tick = () => {
      setKini(Date.now())
      reload()
    }
    tick()
    const id = setInterval(tick, 15_000)
    return () => clearInterval(id)
  }, [reload])

  // Waktu bacaan paling baru → jangkauan rentang dihitung dari titik terakhir
  // (bukan jam sistem), supaya riwayat yang tersedia tetap terbaca apa adanya.
  const waktuTerbaru = useMemo(() => {
    const all = rows.map((r) => Date.parse(waktu(r) ?? '')).filter((n) => !Number.isNaN(n))
    return all.length ? Math.max(...all) : null
  }, [rows])

  const terlihat = useMemo(() => {
    if (waktuTerbaru === null) return []
    const batas = waktuTerbaru - RANGE_MS[range]
    return rows.filter((r) => {
      const t = Date.parse(waktu(r) ?? '')
      return !Number.isNaN(t) && t >= batas
    })
  }, [rows, waktuTerbaru, range])

  const basi = waktuTerbaru !== null && kini > 0 && kini - waktuTerbaru > 10 * 60_000

  const def = PARAM_DEFS[param]
  const kategori = useMemo(() => {
    if (!def.kategorikal) return []
    return Array.from(new Set(terlihat.map((r) => String(r[def.field] ?? '').trim()).filter(Boolean))).sort()
  }, [terlihat, def])

  const titik = useMemo(() => {
    const out: Array<{ t: number; y: number; teks: string }> = []
    for (const r of terlihat) {
      const t = Date.parse(waktu(r) ?? '')
      if (Number.isNaN(t)) continue
      const raw = r[def.field]
      if (def.kategorikal) {
        const s = raw === null || raw === undefined ? '' : String(raw).trim()
        const i = kategori.indexOf(s)
        if (i < 0) continue
        out.push({ t, y: i, teks: s || '—' })
      } else {
        if (raw === null || raw === undefined || String(raw).trim() === '') continue
        const n = Number(raw)
        if (Number.isNaN(n)) continue
        out.push({ t, y: n, teks: `${n}${def.unit ? ` ${def.unit}` : ''}` })
      }
    }
    return out
  }, [terlihat, def, kategori])

  const nilaiAkhir = titik.length ? titik[titik.length - 1] : null

  /* ── Riwayat manual (petani: tanpa tombol tarik — sesuai catatan mockup) ── */
  const [dari, setDari] = useState('')
  const [sampai, setSampai] = useState('')
  const [tarikRows, setTarikRows] = useState<TitikData[]>([])
  const [tarikLoading, setTarikLoading] = useState(false)
  const [tarikError, setTarikError] = useState<string | null>(null)
  const [tarikPernah, setTarikPernah] = useState(false)

  async function tarik() {
    if (tarikLoading) return
    setTarikLoading(true)
    setTarikError(null)
    try {
      const res = await api.get('/monitoring/tarik', {
        params: { dari: dari || undefined, sampai: sampai || undefined, per_page: 50 },
      })
      const d = (res.data ?? {}) as { data?: unknown }
      setTarikRows(Array.isArray(d.data) ? (d.data as TitikData[]) : [])
      setTarikPernah(true)
    } catch (err) {
      setTarikError(handleApiError(err).message)
    } finally {
      setTarikLoading(false)
    }
  }

  function unduhCsv() {
    const header = ['waktu', 'ph', 'suhu_air', 'tds', 'suhu_udara', 'kelembapan', 'level_air']
    const baris = terlihat.map((r) =>
      [waktu(r) ?? '', r.ph ?? '', r.waterTemp ?? '', r.tds ?? '', r.airTemp ?? '', r.humidity ?? '', r.water_level ?? ''].join(
        ',',
      ),
    )
    const blob = new Blob(['\uFEFF' + [header.join(','), ...baris].join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sensor-${range.toLowerCase().replace(/\s+/g, '-')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mx-auto max-w-[1180px] grid gap-4 vsf-stagger">
      {/* Kendali grafik: pilihan parameter & rentang */}
      <section className="vsf-card p-4">
        <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">Parameter &amp; Rentang</div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {(Object.keys(PARAM_DEFS) as Param[]).map((p) => (
            <Pill key={p} active={param === p} onClick={() => setParam(p)}>
              {p}
            </Pill>
          ))}

          <div className="w-px h-6 bg-arutmin-border mx-1" />

          {(Object.keys(RANGE_MS) as Range[]).map((r) => (
            <Pill key={r} active={range === r} onClick={() => setRange(r)}>
              {r}
            </Pill>
          ))}

          <span className="flex-1" />
          {role !== 'petani' && (
            <button
              type="button"
              className="vsf-input rounded-full font-semibold transition hover:border-arutmin-moss/60"
              disabled={terlihat.length === 0}
              onClick={unduhCsv}
            >
              Unduh CSV
            </button>
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-[12px] text-slate-500">
          <span>
            {rows.length} titik tersimpan
            {waktuTerbaru !== null && <> • terakhir {tgl(new Date(waktuTerbaru).toISOString())}</>}
          </span>
          {waktuTerbaru !== null && (
            <StatusBadge
              tone={basi ? 'warning' : 'online'}
              label={basi ? `Bacaan ${relatif(kini - waktuTerbaru)}` : 'Bacaan segar'}
            />
          )}
        </div>
        {basi && (
          <div
            role="status"
            className="mt-2 vsf-banner rounded-input border border-amber-500/40 bg-amber-50 px-3 py-2 text-[12px] text-amber-800 flex items-start gap-2"
          >
            <IkonPeringatan className="mt-[2px] shrink-0" />
            <span>
              Bacaan terakhir {relatif(kini - waktuTerbaru!)} — grafik menampilkan riwayat terakhir yang tersedia di server.
            </span>
          </div>
        )}
      </section>

      {/* Grafik sensor (chart live) */}
      <section className="vsf-card p-4">
        <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">Grafik Sensor</div>

        {error && (
          <div
            role="alert"
            className="mt-3 vsf-banner rounded-input border border-red-600/50 bg-red-50 px-3 py-2 text-[13px] text-red-700 flex flex-wrap items-center gap-3"
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

        <div className="mt-3 rounded-card border border-dashed border-arutmin-border bg-white/60 p-4">
          {loading && rows.length === 0 ? (
            <div className="vsf-skeleton h-[250px]" />
          ) : error && rows.length === 0 ? null : rows.length === 0 ? (
            <div className="h-[250px] flex flex-col items-center justify-center gap-2 text-center text-[13px] text-slate-600">
              <IlustrasiKotakKosong />
              <b className="text-slate-700">Belum ada data sensor</b>
              <span>Grafik akan terisi otomatis begitu perangkat mengirim bacaan.</span>
              <button
                type="button"
                className="vsf-input rounded-full font-semibold mt-1 transition hover:border-arutmin-moss/60"
                onClick={reload}
              >
                Muat ulang
              </button>
            </div>
          ) : terlihat.length === 0 ? (
            <div className="h-[250px] flex flex-col items-center justify-center gap-2 text-center text-[13px] text-slate-600">
              <IlustrasiJam />
              <b className="text-slate-700">Belum ada data pada rentang ini — coba pilih rentang lain.</b>
              {range !== '7 Hari' && (
                <button
                  type="button"
                  className="vsf-input rounded-full font-semibold mt-1 transition hover:border-arutmin-moss/60"
                  onClick={() => setRange('7 Hari')}
                >
                  Lihat 7 Hari
                </button>
              )}
            </div>
          ) : titik.length === 0 ? (
            <div className="h-[250px] flex flex-col items-center justify-center gap-2 text-center text-[13px] text-slate-600">
              <IlustrasiKotakKosong />
              <b className="text-slate-700">
                Belum ada nilai {param} pada rentang {range}.
              </b>
            </div>
          ) : (
            <div>
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                <div className="text-[13px] font-semibold text-slate-700">
                  {param} • rentang {range} • {titik.length} titik
                </div>
                <div className="text-[13px] text-arutmin-forest font-bold">
                  terakhir: {nilaiAkhir?.teks}{' '}
                  <span className="font-normal text-slate-500">({tgl(new Date(nilaiAkhir!.t).toISOString())})</span>
                </div>
              </div>
              {/* P5 — key: remount saat param/rentang berubah → fade-in 220ms. */}
              <Grafik key={`${param}|${range}`} points={titik} unit={param} />
            </div>
          )}
        </div>
      </section>

      {/* Riwayat data historis — hanya role pengelola (petani: lihat grafik saja) */}
      {role !== 'petani' && (
        <section className="vsf-card p-4">
          <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">Riwayat Data Historis</div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <input
              type="date"
              className="vsf-input w-[220px]"
              aria-label="Dari tanggal"
              value={dari}
              onChange={(e) => setDari(e.target.value)}
            />
            <input
              type="date"
              className="vsf-input w-[220px]"
              aria-label="Sampai tanggal"
              value={sampai}
              onChange={(e) => setSampai(e.target.value)}
            />
            <button
              type="button"
              className="vsf-input rounded-full font-semibold transition hover:border-arutmin-moss/60"
              disabled={tarikLoading}
              onClick={() => void tarik()}
            >
              {tarikLoading && <span className="vsf-spinner vsf-spinner-dark mr-2" />}
              {tarikLoading ? 'Menarik…' : 'Tarik'}
            </button>
            <span className="text-[12px] text-slate-500">Maksimal 50 baris per tarikan.</span>
          </div>

          {tarikError && (
            <div
              role="alert"
              className="mt-3 vsf-banner rounded-input border border-red-600/50 bg-red-50 px-3 py-2 text-[13px] text-red-700 flex items-start gap-2"
            >
              <IkonSalah className="mt-[2px] shrink-0" />
              <span>{tarikError}</span>
            </div>
          )}

          <div className="mt-3 overflow-auto rounded-card border border-arutmin-border bg-white vsf-table">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-navy/[.055]">
                  {[
                    { h: 'Waktu', right: false },
                    { h: 'pH', right: true },
                    { h: 'Suhu Air', right: true },
                    { h: 'TDS', right: true },
                    { h: 'Suhu Udara', right: true },
                    { h: 'Kelembapan', right: true },
                    { h: 'Level', right: true },
                  ].map((c) => (
                    <th
                      key={c.h}
                      scope="col"
                      className={`border-b border-navy/25 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[.14em] text-navy ${
                        c.right ? 'text-right' : 'text-left'
                      }`}
                    >
                      {c.h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tarikRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                      {tarikPernah
                        ? 'Tidak ada bacaan pada rentang tanggal itu — coba rentang lain.'
                        : 'Belum ada hasil — pilih rentang tanggal lalu tekan Tarik.'}
                    </td>
                  </tr>
                ) : (
                  tarikRows.map((r) => (
                    <tr
                      key={String(r.id ?? waktu(r))}
                      className="even:bg-navy/[.03] hover:bg-navy/[.06] transition-colors"
                    >
                      <td className="px-4 py-2.5 font-semibold text-slate-900">{tgl(waktu(r))}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{r.ph ?? '—'}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{r.waterTemp ?? '—'}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{r.tds ?? '—'}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{r.airTemp ?? '—'}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{r.humidity ?? '—'}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{r.water_level ?? '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="vsf-card p-4">
        <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">Tentang layar ini</div>
        <ul className="mt-2 list-disc pl-5 text-[13px] text-slate-700 leading-relaxed">
          <li>Live: GET /monitoring/chart-data (polling 15 dtk) · GET /monitoring/tarik (riwayat manual) — Bearer JWT.</li>
          <li>Rentang difilter di klien dari titik terakhir yang tersedia; bacaan basi ditandai banner peringatan.</li>
          <li>State kosong: “Belum ada data pada rentang ini” + tombol pindah rentang; error: pesan kontrak + Coba lagi.</li>
          <li>Akses petani: lihat grafik saja, tanpa tombol tarik data &amp; unduh CSV.</li>
        </ul>
      </section>
    </div>
  )
}
