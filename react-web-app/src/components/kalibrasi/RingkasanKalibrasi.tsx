import clsx from 'clsx'
import { Ikon } from '../Ikon'
import { n, STATUS, type Alat, type StatusAlat, type Terkini } from '../../lib/kalibrasi'

const TILE: StatusAlat[] = ['terlambat', 'segera', 'belum', 'aman']

/** Ringkasan di atas: angka status (klik = saring daftar) + chip bacaan sensor saat ini. */
export function RingkasanKalibrasi({
  rows,
  terkini,
  status,
  onStatus,
}: {
  rows: Alat[]
  terkini: Terkini | null
  status: StatusAlat | null
  onStatus: (s: StatusAlat | null) => void
}) {
  const s = terkini?.sensor ?? null
  const online = !!terkini?.is_online
  const bacaan: [string, string][] = [
    ['pH', n(s?.ph)],
    ['TDS', s?.tds != null ? `${n(s.tds, 0)} ppm` : '—'],
    ['EC', s?.ec_ms_cm != null ? `${n(s.ec_ms_cm)} mS/cm` : '—'],
    ['Suhu air', s?.waterTemp != null ? `${n(s.waterTemp, 1)} °C` : '—'],
    ['Suhu udara', s?.airTemp != null ? `${n(s.airTemp, 1)} °C` : '—'],
    ['Kelembapan', s?.humidity != null ? `${n(s.humidity, 0)} %` : '—'],
  ]
  const tile = TILE.concat(rows.some((r) => r.status === 'tanpa_jadwal') ? ['tanpa_jadwal'] : [])
  return (
    <section className="vsf-card w-full min-w-0 p-4 sm:p-5">
      <h2 className="font-display text-[20px] font-bold leading-tight text-tinta">Kalibrasi alat</h2>
      <p className="mt-1.5 max-w-[68ch] text-[13px] leading-relaxed text-slate-600">
        Sensor yang tidak dikalibrasi tetap mengirim angka yang tampak wajar tetapi salah, dan dosing otomatis mengikutinya.
        Ketuk satu status untuk menyaring daftar.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        {tile.map((k) => {
          const jml = rows.filter((r) => r.status === k).length
          return (
            <button key={k} type="button" className="vsf-stat" aria-pressed={status === k} onClick={() => onStatus(status === k ? null : k)}>
              <div className="vsf-label">{STATUS[k].label}</div>
              <div
                className={clsx(
                  'mt-0.5 text-[24px] font-bold tabular-nums',
                  jml > 0 && k === 'terlambat' ? 'text-red-700' : jml > 0 && k === 'segera' ? 'text-amber-800' : 'text-tinta',
                )}
              >
                {jml}
              </div>
            </button>
          )
        })}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="vsf-judul-bagian mr-1">Bacaan sensor saat ini</span>
        <span className={clsx('vsf-pill inline-flex items-center', online ? 'border-arutmin-moss bg-arutmin-mint/50 text-arutmin-forest' : 'vsf-tone-warn')}>
          <Ikon nama={online ? 'online' : 'offline'} className="mr-1 h-3.5 w-3.5" />
          {online ? 'Online · diperbarui tiap 5 detik' : 'Perangkat offline — bacaan bisa sudah lama'}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {bacaan.map(([k, v]) => (
          <span key={k} className="vsf-kal-chip">
            {k} <b>{v}</b>
          </span>
        ))}
      </div>
    </section>
  )
}
