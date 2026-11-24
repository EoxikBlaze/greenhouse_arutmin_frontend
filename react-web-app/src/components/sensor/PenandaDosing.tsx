import { NAMA_PENANDA, WARNA_PENANDA, type JenisDosing, type Penanda } from '../../lib/analisis'

/** Bentuk berbeda per jenis (tidak mengandalkan warna saja): segitiga A+B, belah ketupat pH, lingkaran pengenceran, kotak isi air. */
export function BentukPenanda({ jenis, x, y }: { jenis: JenisDosing; x: number; y: number }) {
  const w = WARNA_PENANDA[jenis]
  if (jenis === 'AB') return <path d={`M${x},${y - 6} L${x + 6},${y + 5} L${x - 6},${y + 5} Z`} fill={w} stroke="#fff" strokeWidth={1.2} />
  if (jenis === 'PH') return <path d={`M${x},${y - 6} L${x + 6},${y} L${x},${y + 6} L${x - 6},${y} Z`} fill={w} stroke="#fff" strokeWidth={1.2} />
  if (jenis === 'ENCER') return <circle cx={x} cy={y} r={5} fill={w} stroke="#fff" strokeWidth={1.2} />
  return <rect x={x - 5} y={y - 5} width={10} height={10} rx={1.5} fill={w} stroke="#fff" strokeWidth={1.2} />
}

/** Lajur penanda di dasar grafik: tiap kejadian satu bentuk pada waktunya (x = fungsi waktu → piksel). */
export function LajurPenanda({ penanda, t0, t1, x, y }: { penanda: Penanda[]; t0: number; t1: number; x: (t: number) => number; y: number }) {
  return (
    <g pointerEvents="none">
      {penanda
        .filter((p) => p.t >= t0 && p.t <= t1)
        .map((p, i) => (
          <BentukPenanda key={`${p.jenis}-${p.t}-${i}`} jenis={p.jenis} x={x(p.t)} y={y} />
        ))}
    </g>
  )
}

/** Keterangan bentuk untuk jenis yang benar-benar ada pada rentang; catatan jujur soal data alat. */
export function LegendaPenanda({ penanda, t0, t1 }: { penanda: Penanda[]; t0: number; t1: number }) {
  const ada = (['AB', 'PH', 'ENCER', 'ISI'] as const).filter((j) => penanda.some((p) => p.jenis === j && p.t >= t0 && p.t <= t1))
  if (!ada.length) return null
  return (
    <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-abu">
      {ada.map((j) => (
        <span key={j} className="inline-flex items-center gap-1.5">
          <svg width={14} height={14} viewBox="0 0 14 14" aria-hidden>
            <BentukPenanda jenis={j} x={7} y={7} />
          </svg>
          {NAMA_PENANDA[j]}
        </span>
      ))}
      <span>· waktu kejadian, takaran (mL) tidak dilaporkan alat</span>
    </p>
  )
}
