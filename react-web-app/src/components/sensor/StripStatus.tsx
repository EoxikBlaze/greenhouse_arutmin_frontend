import { StatusBadge } from '../StatusBadge'
import { Ikon } from '../Ikon'
import { relatif } from '../../lib/waktu'
import { formatJam, formatTanggal } from '../../lib/sensorLaporan'

const BASI_MS = 10 * 60_000

/** Satu baris: apakah alat masih mengirim data, kapan bacaan terakhir, dan berapa titik tersimpan. */
export function StripStatus({
  waktuTerbaru,
  kini,
  memuat,
  jumlah,
  kembar,
}: {
  waktuTerbaru: number | null
  kini: number
  memuat: boolean
  jumlah: number
  kembar: number
}) {
  if (memuat && waktuTerbaru === null) {
    return <div className="vsf-skeleton h-[68px] rounded-card" role="status" aria-label="Memuat status alat" />
  }

  const ada = waktuTerbaru !== null
  const basi = ada && kini > 0 && kini - waktuTerbaru > BASI_MS

  return (
    <section aria-label="Status alat" className="vsf-card px-4 py-3 sm:px-5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2" role="status">
        <StatusBadge
          tone={!ada ? 'offline' : basi ? 'warning' : 'online'}
          label={!ada ? 'Belum ada data' : basi ? 'Alat tidak mengirim data' : 'Alat mengirim data'}
        />
        {ada && (
          <span className="text-[13px] text-tinta">
            Bacaan terakhir{' '}
            <b className="tabular-nums">
              {formatTanggal(waktuTerbaru)} {formatJam(waktuTerbaru).slice(0, 5)}
            </b>
            {kini > 0 && <span className="text-abu"> · {relatif(Math.max(0, kini - waktuTerbaru))}</span>}
          </span>
        )}
        <span className="w-full text-[12px] text-abu sm:ml-auto sm:w-auto">
          {jumlah} titik tersimpan
          {kembar > 0 && ` · ${kembar} bacaan kembar disembunyikan`}
        </span>
      </div>
      {basi && (
        <p className="mt-2 flex items-start gap-2 text-[12px] text-amber-900">
          <Ikon nama="peringatan" className="mt-[1px] h-4 w-4" />
          <span>Grafik dan tabel menampilkan riwayat terakhir yang tersedia di server.</span>
        </p>
      )}
    </section>
  )
}
