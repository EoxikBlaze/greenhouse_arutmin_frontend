import clsx from 'clsx'
import { Ikon } from '../Ikon'
import { tglJam } from '../../lib/format'

/** Satu baris riwayat perintah: baris server + perintah yang dikirim sesi ini. */
export type Riwayat = {
  key: string
  waktu: string
  perintah: string
  sumber: string
  hasil: string
  ok: boolean
}

/** Riwayat perintah sebagai deretan kartu kaca tipis. Desktop: kolom sejajar + header; HP: satu kartu per baris. */
export function RiwayatPerintah({ rows }: { rows: Riwayat[] }) {
  return (
    <section className="vsf-card p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="vsf-judul-bagian">Riwayat perintah</div>
        <span className="text-[12px] text-abu">{rows.length} perintah</span>
      </div>

      {rows.length === 0 ? (
        <div className="mt-3 flex flex-col items-center gap-2 rounded-card bg-white/55 px-4 py-8 text-center text-[13px] text-tinta">
          <Ikon nama="kosong" className="h-8 w-8 text-arutmin-olive" />
          Belum ada perintah — perintah terakhir dari server akan tampil di sini.
        </div>
      ) : (
        <div role="table" aria-label="Riwayat perintah" className="vsf-riwayat-air mt-3">
          <div role="row" className="vsf-riwayat-air-kepala">
            {['Waktu', 'Perintah', 'Sumber', 'Hasil'].map((h) => (
              <div key={h} role="columnheader">
                {h}
              </div>
            ))}
          </div>
          {rows.map((r) => (
            <div role="row" key={r.key} className="vsf-riwayat-air-baris">
              <div role="cell" className="font-semibold tabular-nums text-tinta">
                {tglJam(r.waktu)}
              </div>
              <div role="cell" className="justify-self-end sm:justify-self-start">
                <span className={clsx('vsf-chip-nilai', r.ok ? 'is-normal' : 'is-luar')}>{r.perintah}</span>
              </div>
              <div role="cell" className="text-abu">
                <span className="sm:hidden">oleh </span>
                {r.sumber}
              </div>
              <div role="cell" className={clsx('sel-hasil flex items-start gap-2', r.ok ? 'text-arutmin-forest' : 'text-red-700')}>
                <Ikon nama={r.ok ? 'ok' : 'salah'} className="mt-[2px] h-4 w-4 shrink-0" />
                <span>{r.hasil}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
