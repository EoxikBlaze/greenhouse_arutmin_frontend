import { useEffect, useId, useMemo, useState, type PointerEvent as PointerReact } from 'react'
import {
  formatJam,
  formatTanggal,
  statusNilai,
  type DefParam,
  type TitikSeri,
} from '../../lib/sensorLaporan'
import { angkaId } from '../../lib/format'

type Batas = { min: number | null; max: number | null }

const PR = 12
const PT = 12
const PB = 26

const hhmm = (ms: number) => formatJam(ms).slice(0, 5)
const ddmm = (ms: number) => formatTanggal(ms).slice(0, 5)

/**
 * Satu panel grafik per sensor: area halus + pita rentang aman, titik di luar batas berwarna merah,
 * crosshair + tooltip saat disentuh/ditunjuk. Lebar mengikuti kontainer (teks tetap 12 px di HP).
 */
export function PanelGrafik({ def, seri, batas }: { def: DefParam; seri: TitikSeri[]; batas: Batas }) {
  const gid = useId()
  // Callback ref (state): wadah baru ada setelah data tiba, jadi observer harus ikut terpasang saat itu.
  const [wadah, setWadah] = useState<HTMLDivElement | null>(null)
  const [lebar, setLebar] = useState(720)
  const [sorot, setSorot] = useState<number | null>(null)

  useEffect(() => {
    if (!wadah) return
    const ro = new ResizeObserver(([e]) => setLebar(Math.max(260, Math.round(e.contentRect.width))))
    ro.observe(wadah)
    return () => ro.disconnect()
  }, [wadah])

  const stat = useMemo(() => {
    if (!seri.length) return null
    const ys = seri.map((p) => p.y)
    return {
      min: Math.min(...ys),
      maks: Math.max(...ys),
      rata: ys.reduce((a, b) => a + b, 0) / ys.length,
      akhir: seri[seri.length - 1],
    }
  }, [seri])

  const kecil = lebar < 480
  const H = kecil ? 210 : 250
  const PL = kecil ? 44 : 56
  const f = (v: number) => angkaId(v, def.digit)

  const geo = useMemo(() => {
    if (!stat) return null
    const awal = Math.min(stat.min, batas.min ?? Infinity)
    const akhir = Math.max(stat.maks, batas.max ?? -Infinity)
    const span = akhir - awal || Math.abs(awal) * 0.1 || 1
    // Sensor tak pernah negatif: bantalan bawah tidak boleh menembus nol.
    const lo = awal >= 0 ? Math.max(0, awal - span * 0.1) : awal - span * 0.1
    const hi = akhir + span * 0.1
    const t0 = seri[0].t
    const t1 = seri[seri.length - 1].t
    const x = (t: number) => PL + (t1 === t0 ? 0.5 : (t - t0) / (t1 - t0)) * (lebar - PL - PR)
    const y = (v: number) => PT + (1 - (v - lo) / (hi - lo)) * (H - PT - PB)
    return { lo, hi, t0, t1, x, y }
  }, [stat, seri, batas.min, batas.max, lebar, H, PL])

  if (!stat || !geo) {
    return (
      <section className="vsf-card p-4 sm:p-5">
        <div className="vsf-judul-bagian">{def.label}</div>
        <p className="mt-3 rounded-card bg-white/55 px-4 py-8 text-center text-[13px] text-tinta">
          Belum ada nilai {def.label} pada rentang ini — alat belum mengirim sensor ini.
        </p>
      </section>
    )
  }

  const { lo, hi, t0, t1, x, y } = geo
  const garis = seri.map((p) => `${x(p.t).toFixed(1)},${y(p.y).toFixed(1)}`).join(' ')
  const dasar = H - PB
  const area = `${x(t0).toFixed(1)},${dasar} ${garis} ${x(t1).toFixed(1)},${dasar}`
  const yTicks = Array.from({ length: 4 }, (_, i) => lo + ((hi - lo) * i) / 3)
  const nX = kecil ? 3 : 5
  const xTicks = t1 === t0 ? [t0] : Array.from({ length: nX }, (_, i) => t0 + ((t1 - t0) * i) / (nX - 1))
  const pendek = t1 - t0 <= 36 * 3_600_000
  const bandAtas = batas.max !== null ? y(Math.min(batas.max, hi)) : PT
  const bandBawah = batas.min !== null ? y(Math.max(batas.min, lo)) : dasar
  const adaBand = batas.min !== null || batas.max !== null
  const luar = (v: number) => statusNilai(v, batas) !== 'normal' && statusNilai(v, batas) !== 'kosong'
  const titikSorot = sorot !== null ? seri[sorot] : null

  function geser(e: PointerReact<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - r.left
    let terdekat = 0
    let selisih = Infinity
    for (let i = 0; i < seri.length; i += 1) {
      const d = Math.abs(x(seri[i].t) - px)
      if (d < selisih) {
        selisih = d
        terdekat = i
      }
    }
    setSorot(terdekat)
  }

  return (
    <section className="vsf-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div>
          <div className="vsf-judul-bagian">
            {def.label}
            {def.satuan && <span className="ml-1 font-normal text-abu">({def.satuan})</span>}
          </div>
          <div className="mt-0.5 text-[13px] text-tinta">
            Terakhir{' '}
            <b className="tabular-nums">
              {f(stat.akhir.y)}
              {def.satuan ? ` ${def.satuan}` : ''}
            </b>
            <span className="text-abu">
              {' '}
              · {formatTanggal(stat.akhir.t)} {hhmm(stat.akhir.t)}
            </span>
          </div>
        </div>
        <dl className="flex flex-wrap gap-2 text-[12px]">
          {[
            ['Min', stat.min],
            ['Maks', stat.maks],
            ['Rata-rata', stat.rata],
          ].map(([k, v]) => (
            <div key={k as string} className="vsf-chip-info">
              <dt className="text-abu">{k}</dt>
              <dd className="font-bold tabular-nums text-tinta">{f(v as number)}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div ref={setWadah} className="vsf-grafik-wrap mt-3">
        <svg
          width={lebar}
          height={H}
          viewBox={`0 0 ${lebar} ${H}`}
          className="vsf-chart block max-w-full"
          style={{ touchAction: 'pan-y' }}
          role="img"
          aria-label={`Grafik ${def.label}: ${seri.length} titik, antara ${f(stat.min)} dan ${f(stat.maks)}${def.satuan ? ` ${def.satuan}` : ''}`}
          onPointerMove={geser}
          onPointerDown={geser}
          onPointerLeave={() => setSorot(null)}
        >
          <defs>
            <linearGradient id={`${gid}-area`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6B9D4A" stopOpacity="0.34" />
              <stop offset="100%" stopColor="#6B9D4A" stopOpacity="0.03" />
            </linearGradient>
          </defs>

          {yTicks.map((v, i) => (
            <g key={i}>
              <line x1={PL} x2={lebar - PR} y1={y(v)} y2={y(v)} stroke="rgba(30,45,61,0.14)" strokeWidth={1} />
              <text x={PL - 8} y={y(v) + 4} textAnchor="end" fontSize={12} fill="#27384c">
                {f(v)}
              </text>
            </g>
          ))}

          {adaBand && bandBawah > bandAtas && (
            <g>
              <rect x={PL} y={bandAtas} width={lebar - PL - PR} height={bandBawah - bandAtas} fill="rgba(107,157,74,0.16)" />
              {batas.max !== null && (
                <line x1={PL} x2={lebar - PR} y1={bandAtas} y2={bandAtas} stroke="#4E7733" strokeWidth={1} strokeDasharray="4 4" />
              )}
              {batas.min !== null && (
                <line x1={PL} x2={lebar - PR} y1={bandBawah} y2={bandBawah} stroke="#4E7733" strokeWidth={1} strokeDasharray="4 4" />
              )}
            </g>
          )}

          <polygon points={area} fill={`url(#${gid}-area)`} />
          <polyline points={garis} fill="none" stroke="#3F6B2F" strokeWidth={2.25} strokeLinejoin="round" strokeLinecap="round" />

          {seri.map((p, i) =>
            luar(p.y) ? (
              <circle key={i} cx={x(p.t)} cy={y(p.y)} r={4} fill="#C0392B" stroke="#fff" strokeWidth={1.5} />
            ) : seri.length <= 60 ? (
              <circle key={i} cx={x(p.t)} cy={y(p.y)} r={2.5} fill="#3F6B2F" />
            ) : null,
          )}
          <circle cx={x(stat.akhir.t)} cy={y(stat.akhir.y)} r={5} fill="#4E7733" stroke="#fff" strokeWidth={2} />

          {xTicks.map((t, i) => (
            <text
              key={i}
              x={x(t)}
              y={H - 8}
              fontSize={12}
              fill="#27384c"
              textAnchor={xTicks.length === 1 ? 'middle' : i === 0 ? 'start' : i === xTicks.length - 1 ? 'end' : 'middle'}
            >
              {pendek ? hhmm(t) : ddmm(t)}
            </text>
          ))}

          {titikSorot && (
            <g pointerEvents="none">
              <line x1={x(titikSorot.t)} x2={x(titikSorot.t)} y1={PT} y2={dasar} stroke="rgba(30,45,61,0.45)" strokeWidth={1} />
              <circle cx={x(titikSorot.t)} cy={y(titikSorot.y)} r={6} fill="#fff" stroke="#3F6B2F" strokeWidth={2.5} />
            </g>
          )}
        </svg>

        {titikSorot && (
          <div
            className="vsf-tip"
            style={{ left: Math.min(Math.max(x(titikSorot.t), 70), lebar - 70), top: 4 }}
            role="status"
          >
            <b className="tabular-nums">
              {f(titikSorot.y)}
              {def.satuan ? ` ${def.satuan}` : ''}
            </b>
            <span>
              {formatTanggal(titikSorot.t)} {hhmm(titikSorot.t)}
            </span>
            {luar(titikSorot.y) && <span className="vsf-lencana-luar">{statusNilai(titikSorot.y, batas)}</span>}
          </div>
        )}
      </div>

      {adaBand && (
        <p className="mt-2 flex items-center gap-2 text-[12px] text-abu">
          <span aria-hidden className="inline-block h-3 w-5 rounded-sm border border-dashed border-arutmin-olive bg-arutmin-moss/20" />
          Rentang aman {batas.min !== null ? f(batas.min) : '…'}–{batas.max !== null ? f(batas.max) : '…'}
          {def.satuan ? ` ${def.satuan}` : ''} · titik merah = di luar rentang
        </p>
      )}
    </section>
  )
}
