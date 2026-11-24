import { useId } from 'react'
import { angkaId } from '../../lib/format'
import type { SelPola } from '../../lib/analisis'

const f = (v: number, d: number) => angkaId(v, d)

/** Batang persen per hari (0–100). Batang kosong = tidak ada batas aman / data. */
export function BatangHarian({ data, tinggi = 64 }: { data: { label: string; nilai: number | null }[]; tinggi?: number }) {
  if (!data.length) return null
  const lebar = Math.max(160, data.length * 26)
  const lebarBatang = Math.min(18, (lebar / data.length) * 0.7)
  return (
    <svg viewBox={`0 0 ${lebar} ${tinggi + 18}`} className="block w-full" role="img" aria-label={`Persen waktu dalam batas aman per hari, ${data.length} hari`}>
      <line x1={0} x2={lebar} y1={tinggi} y2={tinggi} stroke="rgba(30,45,61,0.25)" />
      {data.map((d, i) => {
        const x = (lebar / data.length) * (i + 0.5)
        const h = d.nilai == null ? 0 : (Math.max(0, Math.min(100, d.nilai)) / 100) * tinggi
        const baik = d.nilai != null && d.nilai >= 80
        return (
          <g key={d.label}>
            <title>{`${d.label}: ${d.nilai == null ? 'tanpa batas / data' : `${f(d.nilai, 0)}% dalam batas aman`}`}</title>
            <rect x={x - lebarBatang / 2} y={tinggi - h} width={lebarBatang} height={h} rx={2} fill={d.nilai == null ? 'transparent' : baik ? '#4E7733' : d.nilai >= 50 ? '#B7791F' : '#C0392B'} />
            <text x={x} y={tinggi + 13} textAnchor="middle" fontSize={10} fill="#27384c">{d.label.slice(8)}</text>
          </g>
        )
      })}
    </svg>
  )
}

/** Batang kenaikan ppm tiap dosing A+B; merah = jauh di bawah kebiasaan (curiga botol hampir habis). */
export function BatangRespons({ data }: { data: { t: number; naik: number; rendah: boolean; bersih: boolean }[] }) {
  if (!data.length) return null
  const lebar = Math.max(240, data.length * 22)
  const tinggi = 110
  const maks = Math.max(1, ...data.map((d) => Math.abs(d.naik)))
  const nol = tinggi * 0.78
  return (
    <svg viewBox={`0 0 ${lebar} ${tinggi + 24}`} className="block w-full" role="img" aria-label={`Kenaikan ppm sesudah ${data.length} dosing nutrisi`}>
      <line x1={0} x2={lebar} y1={nol} y2={nol} stroke="rgba(30,45,61,0.3)" />
      {data.map((d, i) => {
        const x = (lebar / data.length) * (i + 0.5)
        const h = (Math.abs(d.naik) / maks) * (nol - 8)
        const waktu = new Date(d.t)
        const teks = `${String(waktu.getDate()).padStart(2, '0')}/${String(waktu.getMonth() + 1).padStart(2, '0')} ${String(waktu.getHours()).padStart(2, '0')}:${String(waktu.getMinutes()).padStart(2, '0')}`
        return (
          <g key={d.t}>
            <title>{`${teks}: ${d.naik >= 0 ? '+' : ''}${f(d.naik, 0)} ppm${d.bersih ? '' : ' (ada kegiatan lain di dekatnya)'}`}</title>
            <rect x={x - 7} y={d.naik >= 0 ? nol - h : nol} width={14} height={h} rx={2} fill={d.rendah ? '#C0392B' : d.bersih ? '#4E7733' : '#9AA5B1'} />
            {i % Math.ceil(data.length / 8) === 0 && <text x={x} y={tinggi + 14} textAnchor="middle" fontSize={10} fill="#27384c">{teks.slice(0, 5)}</text>}
          </g>
        )
      })}
    </svg>
  )
}

export type Metrik = 'vpd' | 'suhu' | 'rh'

function lerp(a: number, b: number, t: number) {
  return Math.round(a + (b - a) * Math.max(0, Math.min(1, t)))
}
function campur(c1: [number, number, number], c2: [number, number, number], t: number) {
  return `rgb(${lerp(c1[0], c2[0], t)},${lerp(c1[1], c2[1], t)},${lerp(c1[2], c2[2], t)})`
}
/** VPD: < 0,4 biru (terlalu lembap), 0,4–1,2 hijau (baik), > 1,2 jingga → merah (terlalu kering). */
export function warnaSel(metrik: Metrik, v: number | null): string {
  if (v == null) return 'rgba(30,45,61,0.06)'
  if (metrik === 'vpd') {
    if (v < 0.4) return campur([186, 214, 245], [96, 150, 220], 1 - v / 0.4)
    if (v <= 1.2) return campur([196, 224, 160], [120, 175, 90], 1 - Math.abs(v - 0.8) / 0.4)
    return campur([245, 190, 110], [192, 57, 43], (v - 1.2) / 1.2)
  }
  if (metrik === 'suhu') return campur([160, 200, 240], [220, 80, 60], (v - 20) / 16)
  return campur([250, 232, 160], [70, 130, 200], (v - 30) / 65)
}

/** Peta panas tanggal × jam (jam dinding lokal). */
export function PetaPanas({ sel, metrik }: { sel: SelPola[]; metrik: Metrik }) {
  const gid = useId()
  const tanggal = [...new Set(sel.map((s) => s.tanggal))].sort().slice(-14)
  if (!tanggal.length) return null
  const peta = new Map(sel.map((s) => [`${s.tanggal}|${s.jam}`, s]))
  const w = 24
  const h = 20
  const kiri = 46
  const lebar = kiri + 24 * w
  return (
    <svg viewBox={`0 0 ${lebar} ${tanggal.length * h + 26}`} className="block w-full" role="img" aria-label={`Peta panas ${metrik} menurut tanggal dan jam`} id={gid}>
      {Array.from({ length: 24 }, (_, j) => (j % 3 === 0 ? <text key={j} x={kiri + j * w + w / 2} y={11} textAnchor="middle" fontSize={10} fill="#27384c">{String(j).padStart(2, '0')}</text> : null))}
      {tanggal.map((t, r) => (
        <g key={t}>
          <text x={kiri - 6} y={22 + r * h + h / 2 - 2} textAnchor="end" fontSize={10} fill="#27384c">{`${t.slice(8)}/${t.slice(5, 7)}`}</text>
          {Array.from({ length: 24 }, (_, j) => {
            const c = peta.get(`${t}|${j}`)
            const v = c ? (metrik === 'vpd' ? c.vpd : metrik === 'suhu' ? c.suhu : c.rh) : null
            return (
              <rect key={j} x={kiri + j * w} y={18 + r * h} width={w - 1} height={h - 1} rx={2} fill={warnaSel(metrik, v)}>
                <title>{`${t} ${String(j).padStart(2, '0')}:00 — ${v == null ? 'tanpa data' : f(v, metrik === 'vpd' ? 2 : metrik === 'suhu' ? 1 : 0)}`}</title>
              </rect>
            )
          })}
        </g>
      ))}
    </svg>
  )
}

/** Dua garis menurut hari sejak semai. */
export function GarisBanding({ a, b, namaA, namaB, satuan, digit }: {
  a: { n: number; v: number | null }[]
  b: { n: number; v: number | null }[]
  namaA: string
  namaB: string
  satuan: string
  digit: number
}) {
  const A = a.filter((p) => p.v != null) as { n: number; v: number }[]
  const B = b.filter((p) => p.v != null) as { n: number; v: number }[]
  if (!A.length && !B.length) return <p className="grid min-h-[160px] place-items-center rounded-card bg-white/50 text-[13px] text-abu">Belum ada data untuk dibandingkan.</p>
  const semua = [...A, ...B]
  const lo = Math.min(...semua.map((p) => p.v))
  const hi = Math.max(...semua.map((p) => p.v))
  const span = hi - lo || Math.abs(hi) * 0.1 || 1
  const nMaks = Math.max(1, ...semua.map((p) => p.n))
  const W = 640
  const H = 240
  const PL = 54
  const PR = 12
  const PT = 12
  const PB = 28
  const x = (n: number) => PL + (n / nMaks) * (W - PL - PR)
  const y = (v: number) => PT + (1 - (v - (lo - span * 0.1)) / (span * 1.2)) * (H - PT - PB)
  const garis = (d: { n: number; v: number }[]) => d.map((p) => `${x(p.n).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ')
  const ticks = [0, 1, 2, 3].map((i) => lo - span * 0.1 + (span * 1.2 * i) / 3)
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label={`Perbandingan ${namaA} dan ${namaB} menurut hari sejak semai`}>
        {ticks.map((v, i) => (
          <g key={i}>
            <line x1={PL} x2={W - PR} y1={y(v)} y2={y(v)} stroke="rgba(30,45,61,0.14)" />
            <text x={PL - 8} y={y(v) + 4} textAnchor="end" fontSize={12} fill="#27384c">{f(v, digit)}</text>
          </g>
        ))}
        {[0, 0.25, 0.5, 0.75, 1].map((p) => (
          <text key={p} x={x(nMaks * p)} y={H - 8} textAnchor="middle" fontSize={12} fill="#27384c">{Math.round(nMaks * p)}</text>
        ))}
        {A.length > 0 && <polyline points={garis(A)} fill="none" stroke="#3F6B2F" strokeWidth={2.4} strokeLinejoin="round" />}
        {B.length > 0 && <polyline points={garis(B)} fill="none" stroke="#B7791F" strokeWidth={2.4} strokeDasharray="7 4" strokeLinejoin="round" />}
        {A.map((p) => <circle key={`a${p.n}`} cx={x(p.n)} cy={y(p.v)} r={3} fill="#3F6B2F"><title>{`${namaA}, hari ke-${p.n}: ${f(p.v, digit)} ${satuan}`}</title></circle>)}
        {B.map((p) => <circle key={`b${p.n}`} cx={x(p.n)} cy={y(p.v)} r={3} fill="#B7791F"><title>{`${namaB}, hari ke-${p.n}: ${f(p.v, digit)} ${satuan}`}</title></circle>)}
      </svg>
      <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-abu">
        <span className="inline-flex items-center gap-1.5"><span className="inline-block h-0.5 w-5 bg-[#3F6B2F]" aria-hidden />{namaA}</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block h-0.5 w-5 border-t-2 border-dashed border-[#B7791F]" aria-hidden />{namaB}</span>
        <span>sumbu mendatar: hari sejak mulai semai · satuan {satuan || '—'}</span>
      </p>
    </div>
  )
}
