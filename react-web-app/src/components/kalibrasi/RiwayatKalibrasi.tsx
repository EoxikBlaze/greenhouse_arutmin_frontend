import { tglJam } from '../../lib/format'
import type { ArsipKalibrasiRow } from '../../lib/iotV41'

const NAMA: Record<string, string> = { ph: 'pH', ec: 'EC', pulsa_peristaltik: 'Pompa' }

/** Satu riwayat untuk semua kalibrasi (pH, EC, laju pompa). */
export function RiwayatKalibrasi({ baris }: { baris: ArsipKalibrasiRow[] }) {
  const tampil = baris.filter((r) => NAMA[r.sensor])
  return (
    <section className="vsf-card w-full min-w-0 p-4 sm:p-5" aria-label="Riwayat kalibrasi">
      <div className="vsf-judul-bagian">Riwayat kalibrasi</div>
      {tampil.length === 0 ? (
        <p className="mt-2 text-[13px] text-abu">Belum ada kalibrasi tercatat.</p>
      ) : (
        <ul className="mt-2 divide-y divide-black/5 text-[13px]">
          {tampil.map((r) => (
            <li key={r.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2">
              <span className="w-[110px] shrink-0 tabular-nums text-abu">{tglJam(r.dilakukan_pada)}</span>
              <b className="w-[60px] shrink-0 text-tinta">{NAMA[r.sensor]}</b>
              <span className="min-w-0 flex-1 text-tinta">{r.catatan ?? '—'}</span>
              <span className="text-abu">{r.oleh_label ?? ''}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
