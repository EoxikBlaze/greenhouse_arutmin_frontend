import { labelTipe, type Kamera, type StatusKamera } from '../../lib/cctv'
import { Ikon } from '../Ikon'
import { Pratinjau } from './Pratinjau'

/** Satu kamera: pratinjau + nama/lokasi + aksi di baris bawah. Kartu tint (tanpa blur sendiri: sudah di dalam kartu kaca). */
export function KartuKamera({
  k,
  kelola,
  onStatus,
  onPerbesar,
  onUbah,
  onHapus,
}: {
  k: Kamera
  kelola: boolean
  onStatus: (id: Kamera['id'], s: StatusKamera) => void
  onPerbesar: (k: Kamera) => void
  onUbah: (k: Kamera) => void
  onHapus: (k: Kamera) => void
}) {
  return (
    <article className="vsf-batch flex min-w-0 flex-col overflow-hidden !p-0">
      <Pratinjau k={k} onStatus={onStatus} />
      <div className="p-3.5">
        <div className="truncate text-[15px] font-bold text-tinta">{k.nama}</div>
        <div className="mt-0.5 truncate text-[12.5px] text-abu">
          {k.lokasi || 'Tanpa lokasi'} · {labelTipe(k)}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 [&>button]:flex-1 [&>button]:justify-center">
          <button type="button" className="vsf-btn-secondary !min-h-[40px] !text-[12.5px]" disabled={!k.aktif} onClick={() => onPerbesar(k)}>
            <Ikon nama="mata" className="h-4 w-4" />
            Perbesar
          </button>
          {kelola && (
            <button type="button" className="vsf-btn-secondary !min-h-[40px] !text-[12.5px]" onClick={() => onUbah(k)}>
              <Ikon nama="ubah" className="h-4 w-4" />
              Ubah
            </button>
          )}
          {kelola && (
            <button type="button" className="vsf-btn-danger !min-h-[40px] !text-[12.5px]" onClick={() => onHapus(k)}>
              <Ikon nama="hapus" className="h-4 w-4" />
              Hapus
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
