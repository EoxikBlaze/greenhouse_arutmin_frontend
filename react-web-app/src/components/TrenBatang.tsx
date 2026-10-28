import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApiList } from '../lib/crudApi'

type Titik = {
  created_at?: string | null
  waktu?: string | null
  ph?: number | null
  waterTemp?: number | null
  tds?: number | null
}

const PARAM = {
  pH: { field: 'ph', unit: '', digit: 2 },
  'Suhu Air': { field: 'waterTemp', unit: ' °C', digit: 1 },
  TDS: { field: 'tds', unit: ' ppm', digit: 0 },
} as const
type Param = keyof typeof PARAM

const JUMLAH = 14

function jam(iso: string): string {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`
}

/**
 * Grafik batang tren sensor (GET /monitoring/chart-data). Batang terbaru berwarna
 * emas-hijau, sisanya hijau tua; tinggi dinormalisasi ke rentang data supaya
 * perubahan kecil (pH) tetap terlihat.
 */
export function TrenBatang() {
  const [param, setParam] = useState<Param>('pH')
  const { rows, loading, error } = useApiList<Titik>('/monitoring/chart-data')
  const def = PARAM[param]

  const batang = useMemo(() => {
    const ada = rows
      .map((r) => ({ iso: r.waktu ?? r.created_at ?? '', y: r[def.field] }))
      .filter((r): r is { iso: string; y: number } => !!r.iso && typeof r.y === 'number' && Number.isFinite(r.y))
    return ada.slice(-JUMLAH)
  }, [rows, def.field])

  const min = Math.min(...batang.map((b) => b.y))
  const max = Math.max(...batang.map((b) => b.y))
  const span = max - min || 1
  const tinggi = (v: number) => 22 + ((v - min) / span) * 78

  return (
    <section className="vsf-card flex h-full flex-col p-4 sm:p-5" aria-label="Tren sensor">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="vsf-judul-bagian">Tren Sensor</div>
          <div className="text-[12px] text-abu">{JUMLAH} bacaan terakhir</div>
        </div>
        <div role="tablist" aria-label="Parameter sensor" className="inline-flex rounded-full bg-white/55 p-1 shadow-[inset_0_0_0_1px_rgba(255,255,255,.85)]">
          {(Object.keys(PARAM) as Param[]).map((p) => (
            <button
              key={p}
              role="tab"
              aria-selected={p === param}
              type="button"
              onClick={() => setParam(p)}
              className={`min-h-[36px] rounded-full px-3 text-[13px] font-semibold transition-colors duration-[var(--dur-normal)] ${
                p === param ? 'bg-activePill text-white shadow-[0_6px_14px_-8px_rgba(78,119,51,.9)]' : 'text-tinta/70 hover:bg-white/70'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {loading && rows.length === 0 ? (
        <div className="vsf-skeleton mt-4 h-[220px]" />
      ) : error || batang.length === 0 ? (
        <div className="mt-4 grid min-h-[220px] flex-1 place-items-center rounded-card bg-white/50 text-[13px] text-abu">
          {error ?? 'Belum ada bacaan untuk ditampilkan.'}
        </div>
      ) : (
        <>
          <div key={param} className="mt-4 flex h-[220px] items-end gap-1.5 sm:gap-2" role="img" aria-label={`Grafik batang ${param}`}>
            {batang.map((b, i) => {
              const akhir = i === batang.length - 1
              return (
                <div key={`${b.iso}-${i}`} className="group/bar flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
                  <span className="text-[11px] font-semibold tabular-nums text-tinta opacity-0 transition-opacity group-hover/bar:opacity-100">
                    {b.y.toFixed(def.digit)}
                  </span>
                  <div
                    title={`${jam(b.iso)} — ${b.y.toFixed(def.digit)}${def.unit}`}
                    className={`vsf-batang w-full rounded-t-[10px] rounded-b-[4px] ${akhir ? 'vsf-batang-sorot' : ''}`}
                    style={{ height: `${tinggi(b.y)}%`, animationDelay: `${i * 35}ms` }}
                  />
                </div>
              )
            })}
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-abu">
            <span>{jam(batang[0].iso)}</span>
            <span>{jam(batang[batang.length - 1].iso)}</span>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 text-[13px]">
            <span className="text-abu">
              Terbaru: <b className="tabular-nums text-tinta">{batang[batang.length - 1].y.toFixed(def.digit)}{def.unit}</b>
            </span>
            <Link to="/sensor-realtime" className="font-semibold text-arutmin-forest underline underline-offset-2 hover:text-arutmin-moss">
              Grafik lengkap →
            </Link>
          </div>
        </>
      )}
    </section>
  )
}
