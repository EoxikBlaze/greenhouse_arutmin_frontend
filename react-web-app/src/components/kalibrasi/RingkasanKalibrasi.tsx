import clsx from 'clsx'
import { Ikon } from '../Ikon'
import { tglJam } from '../../lib/format'
import { n, STATUS, type Alat, type Terkini } from '../../lib/kalibrasi'

/** Yang benar-benar dikalibrasi lewat alat (firmware v6). Sensor suhu dan perangkat lama tidak ditampilkan. */
export const KALIBRASI_AKTIF = ['ph', 'ec', 'pulsa_peristaltik'] as const
const NAMA: Record<string, string> = { ph: 'Sensor pH', ec: 'Sensor EC', pulsa_peristaltik: 'Laju 4 pompa (A, B, pH up, pH down)' }

/** Ringkasan di atas: status jadwal kalibrasi (terlambat jadi peringatan) + bacaan sensor saat ini. */
export function RingkasanKalibrasi({ rows, terkini }: { rows: Alat[]; terkini: Terkini | null }) {
  const s = terkini?.sensor ?? null
  const online = !!terkini?.is_online
  const aktif = KALIBRASI_AKTIF.map((k) => rows.find((r) => r.sensor === k)).filter((r): r is Alat => Boolean(r))
  const bacaan: [string, string][] = [
    ['pH', n(s?.ph)],
    ['ppm', s?.tds != null ? `${n(s.tds, 0)}` : '—'],
    ['EC', s?.ec_ms_cm != null ? `${n(s.ec_ms_cm)} mS/cm` : '—'],
  ]
  return (
    <section className="vsf-card w-full min-w-0 p-4 sm:p-5">
      <h2 className="font-display text-[20px] font-bold leading-tight text-tinta">Kalibrasi alat</h2>
      <p className="mt-1.5 max-w-[68ch] text-[13px] leading-relaxed text-slate-600">
        Sensor yang tidak dikalibrasi dapat mengirim angka yang tampak wajar tetapi salah. Kalibrasi yang lewat jatuh tempo muncul di menu Peringatan.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {aktif.map((r) => (
          <div key={r.sensor} className="vsf-stat">
            <div className="vsf-label">{NAMA[r.sensor] ?? r.label}</div>
            <span className={clsx('vsf-pill mt-1 inline-flex', STATUS[r.status].kelas)}>{STATUS[r.status].label}</span>
            <div className="mt-1 text-[12px] text-abu">
              Terakhir: {r.terakhir_dikalibrasi ? tglJam(r.terakhir_dikalibrasi) : 'belum pernah'}
              {r.jatuh_tempo && <> · jatuh tempo {tglJam(r.jatuh_tempo)}</>}
            </div>
          </div>
        ))}
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
