import { useEffect, useMemo, useState, type PointerEvent as PointerReact } from 'react'
import { useApiObject } from '../../lib/useApiObject'
import { angkaId } from '../../lib/format'
import { formatJam, formatTanggal } from '../../lib/sensorLaporan'
import { BATAS_LABEL_JAM, NAMA_DOSING, langkahTarget, targetPada, tickWaktu, type DataNutrisi, type JenisDosing } from '../../lib/nutrisiGrafik'
import { Segmen } from './FilterBar'

const PILIHAN = ['24 Jam', '3 Hari', '7 Hari'] as const
type Pilihan = (typeof PILIHAN)[number]
const HARI: Record<Pilihan, number> = { '24 Jam': 1, '3 Hari': 3, '7 Hari': 7 }

const WARNA = { aktual: '#3F6B2F', target: '#1F5A99', rencana: '#B7791F' }
const WARNA_DOSING: Record<JenisDosing, string> = { AB: '#D69E2E', PH: '#6B46C1', ENCER: '#2B6CB0' }
const PL_KECIL = 44
const PL_BESAR = 56
const PR = 12
const PT = 14
const PB = 28
const LANE = 22 // jalur penanda dosing di dasar area grafik

const hhmm = (ms: number) => formatJam(ms).slice(0, 5)
const ddmm = (ms: number) => formatTanggal(ms).slice(0, 5)
const f0 = (v: number) => angkaId(v, 0)

/** Bentuk penanda dosing: bentuk berbeda per jenis (tidak mengandalkan warna saja). */
function Penanda({ jenis, x, y }: { jenis: JenisDosing; x: number; y: number }) {
  const w = WARNA_DOSING[jenis]
  if (jenis === 'AB') return <path d={`M${x},${y - 6} L${x + 6},${y + 5} L${x - 6},${y + 5} Z`} fill={w} stroke="#fff" strokeWidth={1.2} />
  if (jenis === 'PH') return <path d={`M${x},${y - 6} L${x + 6},${y} L${x},${y + 6} L${x - 6},${y} Z`} fill={w} stroke="#fff" strokeWidth={1.2} />
  return <circle cx={x} cy={y} r={5} fill={w} stroke="#fff" strokeWidth={1.2} />
}

/**
 * Grafik "Nutrisi: target vs aktual" di menu Sensor. Data hanya dari server: ppm sensor, target yang benar-benar dikirim ke alat,
 * rencana target ke depan, dan kapan alat menyuntik (dari hitungan harian yang dilaporkan alat; jumlah mL tidak dilaporkan alat).
 */
export function PanelNutrisi({ hari, ec }: { hari?: number; ec?: number | null } = {}) {
  const [rentang, setRentang] = useState<Pilihan>('3 Hari')
  // `hari` dari halaman Sensor (satu pengatur rentang): pilihan rentang milik panel ini disembunyikan
  const hariPakai = hari ?? HARI[rentang]
  const { data, loading, error } = useApiObject<DataNutrisi>(`/monitoring/nutrisi?hari=${hariPakai}`, { pollMs: 60_000 })
  const [wadah, setWadah] = useState<HTMLDivElement | null>(null)
  const [lebar, setLebar] = useState(720)
  const [sorot, setSorot] = useState<number | null>(null)

  useEffect(() => {
    if (!wadah) return
    const ro = new ResizeObserver(([e]) => setLebar(Math.max(260, Math.round(e.contentRect.width))))
    ro.observe(wadah)
    return () => ro.disconnect()
  }, [wadah])

  const kecil = lebar < 480
  const H = kecil ? 250 : 290
  const PL = kecil ? PL_KECIL : PL_BESAR

  const geo = useMemo(() => {
    if (!data) return null
    const nilai = [...data.aktual, ...data.target_alat, ...data.rencana].map((p) => p.ppm)
    if (!nilai.length) return null
    const min = Math.min(...nilai)
    const maks = Math.max(...nilai)
    const span = maks - min || Math.max(maks * 0.1, 50)
    const lo = Math.max(0, min - span * 0.12)
    const hi = maks + span * 0.12
    const dasar = H - PB - LANE
    const x = (t: number) => PL + ((t - data.dari) / (data.sampai - data.dari || 1)) * (lebar - PL - PR)
    const y = (v: number) => PT + (1 - (v - lo) / (hi - lo)) * (dasar - PT)
    return { lo, hi, dasar, x, y }
  }, [data, lebar, H, PL])

  function geser(e: PointerReact<SVGSVGElement>) {
    if (!data || !geo || !data.aktual.length) return
    const px = e.clientX - e.currentTarget.getBoundingClientRect().left
    let terdekat = 0
    let selisih = Infinity
    data.aktual.forEach((p, i) => {
      const d = Math.abs(geo.x(p.t) - px)
      if (d < selisih) {
        selisih = d
        terdekat = i
      }
    })
    setSorot(terdekat)
  }

  const hi = data?.hari_ini
  const titikSorot = data && sorot !== null ? data.aktual[sorot] ?? null : null

  return (
    <section className="vsf-card p-4 sm:p-5" aria-label="Grafik nutrisi: target dan aktual">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div>
          <div className="vsf-judul-bagian">
            Nutrisi: target dan aktual <span className="font-normal text-abu">(ppm)</span>
          </div>
          <p className="mt-0.5 text-[13px] text-abu">
            {data?.batch
              ? `${data.batch.tanaman ?? 'Tanaman'} · ${data.batch.tahap} · hari ke-${(data.batch.hari_semai ?? 0) + 1} sejak mulai semai · ${data.batch.cara === 'tahap' ? 'per siklus' : 'per hari'}`
              : 'Belum ada batch berjalan di Kebun Saya.'}
          </p>
          <p className="mt-0.5 text-[12px] text-abu">
            Sensor mengukur EC (daya hantar listrik); ppm = EC × 500, jadi grafik ini sudah mewakili EC
            {ec != null && Number.isFinite(ec) ? ` (sekarang ${angkaId(ec, 2)} mS/cm)` : ''}.
          </p>
        </div>
        {hari === undefined && <Segmen label="Rentang grafik nutrisi" pilihan={PILIHAN} nilai={rentang} onPilih={setRentang} />}
      </div>

      {hi && (
        <dl className="mt-3 flex flex-wrap gap-2 text-[12px]">
          <div className="vsf-chip-info">
            <dt className="text-abu">Target hari ini</dt>
            <dd className="font-bold tabular-nums text-tinta">{hi.target_batch != null ? `${f0(hi.target_batch)} ppm` : '—'}</dd>
          </div>
          <div className="vsf-chip-info">
            <dt className="text-abu">Di alat</dt>
            <dd className="font-bold tabular-nums text-tinta">
              {hi.target_alat != null ? `${f0(hi.target_alat)} ppm` : '—'}
              {hi.target_batch != null && hi.target_alat != null && hi.target_alat !== hi.target_batch && (
                <span className="ml-1 font-normal text-amber-800">(menunggu alat)</span>
              )}
            </dd>
          </div>
          <div className="vsf-chip-info">
            <dt className="text-abu">ppm sekarang</dt>
            <dd className="font-bold tabular-nums text-tinta">
              {hi.ppm_aktual != null ? f0(hi.ppm_aktual) : '—'}
              {hi.ppm_aktual != null && !hi.ppm_segar && <span className="ml-1 font-normal text-abu">(bacaan lama)</span>}
            </dd>
          </div>
          <div className="vsf-chip-info">
            <dt className="text-abu">Alat menyuntik hari ini</dt>
            <dd className="font-bold tabular-nums text-tinta">
              A+B {hi.dosing.AB}× · pH {hi.dosing.PH}× · encer {hi.dosing.ENCER}×
            </dd>
          </div>
        </dl>
      )}

      <div ref={setWadah} className="vsf-grafik-wrap mt-3">
        {loading && !data ? (
          <div className="vsf-skeleton h-[250px] rounded-card" role="status" aria-label="Memuat grafik nutrisi" />
        ) : error && !data ? (
          <p role="alert" className="rounded-card bg-white/55 px-4 py-8 text-center text-[13px] text-tinta">
            Grafik nutrisi belum bisa dimuat: {error}
          </p>
        ) : !data || !geo ? (
          <p className="rounded-card bg-white/55 px-4 py-8 text-center text-[13px] text-tinta">
            Belum ada data ppm pada rentang ini. Grafik muncul setelah alat mengirim bacaan nutrisi, dan target muncul setelah Mulai Semai.
          </p>
        ) : (
          <>
            <svg
              width={lebar}
              height={H}
              viewBox={`0 0 ${lebar} ${H}`}
              className="vsf-chart block max-w-full"
              style={{ touchAction: 'pan-y' }}
              role="img"
              aria-label={`Grafik nutrisi ${hariPakai} hari: ${data.aktual.length} bacaan ppm, ${data.target_alat.length} target terkirim ke alat, ${data.dosing.length} kali alat menyuntik`}
              onPointerMove={geser}
              onPointerDown={geser}
              onPointerLeave={() => setSorot(null)}
            >
              {Array.from({ length: 4 }, (_, i) => geo.lo + ((geo.hi - geo.lo) * i) / 3).map((v, i) => (
                <g key={i}>
                  <line x1={PL} x2={lebar - PR} y1={geo.y(v)} y2={geo.y(v)} stroke="rgba(30,45,61,0.14)" strokeWidth={1} />
                  <text x={PL - 8} y={geo.y(v) + 4} textAnchor="end" fontSize={12} fill="#27384c">
                    {f0(v)}
                  </text>
                </g>
              ))}

              {/* masa depan: rencana target */}
              <rect x={geo.x(data.sekarang)} y={PT} width={Math.max(0, lebar - PR - geo.x(data.sekarang))} height={geo.dasar - PT} fill="rgba(183,121,31,0.07)" />
              <line x1={geo.x(data.sekarang)} x2={geo.x(data.sekarang)} y1={PT} y2={geo.dasar} stroke="rgba(30,45,61,0.45)" strokeWidth={1} strokeDasharray="4 4" />
              <text x={geo.x(data.sekarang) + 4} y={PT + 11} fontSize={11} fill="#7a5a1c">
                rencana →
              </text>

              {data.rencana.length > 1 && (
                <polyline
                  points={data.rencana.map((p) => `${geo.x(p.t).toFixed(1)},${geo.y(p.ppm).toFixed(1)}`).join(' ')}
                  fill="none"
                  stroke={WARNA.rencana}
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  strokeLinecap="round"
                />
              )}
              {data.target_alat.length > 0 && (
                <polyline
                  points={langkahTarget(data.target_alat, data.sekarang)
                    .map(([t, v]) => `${geo.x(t).toFixed(1)},${geo.y(v).toFixed(1)}`)
                    .join(' ')}
                  fill="none"
                  stroke={WARNA.target}
                  strokeWidth={2}
                  strokeLinejoin="round"
                />
              )}
              {data.aktual.length > 0 && (
                <>
                  <polyline
                    points={data.aktual.map((p) => `${geo.x(p.t).toFixed(1)},${geo.y(p.ppm).toFixed(1)}`).join(' ')}
                    fill="none"
                    stroke={WARNA.aktual}
                    strokeWidth={2.25}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  <circle
                    cx={geo.x(data.aktual[data.aktual.length - 1].t)}
                    cy={geo.y(data.aktual[data.aktual.length - 1].ppm)}
                    r={5}
                    fill={WARNA.aktual}
                    stroke="#fff"
                    strokeWidth={2}
                  />
                </>
              )}

              {/* kapan alat menyuntik */}
              <line x1={PL} x2={lebar - PR} y1={geo.dasar + 1} y2={geo.dasar + 1} stroke="rgba(30,45,61,0.25)" strokeWidth={1} />
              {data.dosing.map((k, i) => (
                <g key={i}>
                  <title>{`${NAMA_DOSING[k.jenis]} · ${ddmm(k.t)} ${hhmm(k.t)}`}</title>
                  <Penanda jenis={k.jenis} x={geo.x(k.t)} y={geo.dasar + LANE / 2 + 1} />
                </g>
              ))}

              {tickWaktu(data.dari, data.sampai).map((t, i) => (
                <text key={i} x={geo.x(t)} y={H - 8} fontSize={12} fill="#27384c" textAnchor="middle">
                  {data.sampai - data.dari <= BATAS_LABEL_JAM && new Date(t).getHours() !== 0 ? hhmm(t) : ddmm(t)}
                </text>
              ))}

              {titikSorot && (
                <g pointerEvents="none">
                  <line x1={geo.x(titikSorot.t)} x2={geo.x(titikSorot.t)} y1={PT} y2={geo.dasar} stroke="rgba(30,45,61,0.45)" strokeWidth={1} />
                  <circle cx={geo.x(titikSorot.t)} cy={geo.y(titikSorot.ppm)} r={6} fill="#fff" stroke={WARNA.aktual} strokeWidth={2.5} />
                </g>
              )}
            </svg>

            {titikSorot && (
              <div className="vsf-tip" style={{ left: Math.min(Math.max(geo.x(titikSorot.t), 80), lebar - 80), top: 4 }} role="status">
                <b className="tabular-nums">{f0(titikSorot.ppm)} ppm</b>
                <span>
                  {ddmm(titikSorot.t)} {hhmm(titikSorot.t)}
                </span>
                {targetPada(data.target_alat, titikSorot.t) != null && <span>target {f0(targetPada(data.target_alat, titikSorot.t) as number)} ppm</span>}
              </div>
            )}
          </>
        )}
      </div>

      {data && geo && (
        <ul className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-abu" aria-label="Keterangan grafik">
          <li className="flex items-center gap-1.5">
            <svg width="22" height="8" aria-hidden><line x1="0" x2="22" y1="4" y2="4" stroke={WARNA.aktual} strokeWidth="2.5" /></svg>
            ppm sensor (rata-rata per jam)
          </li>
          <li className="flex items-center gap-1.5">
            <svg width="22" height="8" aria-hidden><polyline points="0,6 8,6 8,2 22,2" fill="none" stroke={WARNA.target} strokeWidth="2" /></svg>
            target di alat
          </li>
          <li className="flex items-center gap-1.5">
            <svg width="22" height="8" aria-hidden><line x1="0" x2="22" y1="4" y2="4" stroke={WARNA.rencana} strokeWidth="2" strokeDasharray="5 4" /></svg>
            rencana target
          </li>
          {(['AB', 'PH', 'ENCER'] as const).map((j) => (
            <li key={j} className="flex items-center gap-1.5">
              <svg width="14" height="14" aria-hidden><Penanda jenis={j} x={7} y={7} /></svg>
              {NAMA_DOSING[j]}
            </li>
          ))}
        </ul>
      )}
      {data && geo && data.target_alat.length === 0 && (
        <p className="mt-1 text-[12px] text-abu">Belum ada target yang dikirim ke alat pada rentang ini (muncul setelah Mulai Semai).</p>
      )}
      {data && geo && (
        <p className="mt-1 text-[12px] text-abu">Penanda hanya menunjukkan kapan alat menyuntik; jumlah mL per suntikan tidak dilaporkan alat.</p>
      )}
    </section>
  )
}
