import clsx from 'clsx'
import { Ikon } from '../Ikon'
import { TAHAP_LABEL, labelSiap, perkiraanSelesai, progres, tglPendek, type TanamRow } from '../../lib/kebun'

function statusLabel(status?: string | null): string {
  const s = String(status ?? '').trim().toLowerCase()
  if (s === 'proses') return 'Berjalan'
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Tanpa status'
}

/** Satu batch tanam: tahap, progres hari, dan penanda siap pindah. Kartu tint (tanpa blur sendiri: sudah di dalam kartu kaca). */
export function KartuBatch({ r }: { r: TanamRow }) {
  const p = progres(r)
  const siap = labelSiap(r)
  const selesai = perkiraanSelesai(r.mulai, r.durasi_hari)
  const jumlah = r.tipe === 'semai' ? r.jumlah_benih : r.jumlah_masuk

  return (
    <article className={clsx('vsf-batch', siap && 'is-siap')}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-[16px] font-bold text-tinta">{r.varietas || 'Tanaman'}</div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[12px] text-abu">
            <Ikon nama="tanam" className="h-3.5 w-3.5" />
            {TAHAP_LABEL[r.tipe] ?? r.tipe} · #{r.id}
          </div>
        </div>
        <span className={clsx('vsf-chip-nilai shrink-0', siap ? 'is-siap' : 'is-normal')}>
          {siap ? 'Siap' : statusLabel(r.status)}
        </span>
      </div>

      <div className="mt-3">
        {p.durasi === null ? (
          <div className="text-[12px] text-abu">
            <b className="text-tinta">{p.label}</b> · durasi tahap belum diatur
          </div>
        ) : (
          <>
            <div className="flex items-baseline justify-between gap-2 text-[12px]">
              <b className="text-tinta">{p.label}</b>
              <span className="tabular-nums text-abu">{p.lewat > 0 ? `lewat ${p.lewat} hari` : `${p.persen}%`}</span>
            </div>
            <div
              className="vsf-bar mt-1"
              role="progressbar"
              aria-label={`Progres ${r.varietas ?? 'tanaman'}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={p.persen}
            >
              <span className={siap ? 'is-siap' : ''} style={{ width: `${p.persen}%` }} />
            </div>
          </>
        )}
      </div>

      {siap && (
        <div className="vsf-siap mt-3">
          <Ikon nama="ok" className="h-4 w-4" />
          {siap}
        </div>
      )}

      <dl className="mt-3 grid gap-1.5 text-[13px]">
        {[
          ['Meja', r.meja || 'belum dipilih'],
          ['Mulai', tglPendek(r.mulai)],
          ['Selesai ±', selesai === null ? '—' : tglPendek(selesai)],
          [r.tipe === 'semai' ? 'Jumlah benih' : 'Jumlah masuk', typeof jumlah === 'number' ? jumlah : 'belum dicatat'],
        ].map(([k, v]) => (
          <div key={k as string} className="flex items-center justify-between gap-2">
            <dt className="text-abu">{k}</dt>
            <dd className="font-semibold tabular-nums text-tinta">{v}</dd>
          </div>
        ))}
      </dl>
    </article>
  )
}
