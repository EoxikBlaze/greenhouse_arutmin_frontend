import { Link } from 'react-router-dom'
import { peringatanKeselamatan, useKeselamatan } from '../lib/keselamatan'
import { tglJam } from '../lib/format'
import { Ikon } from './Ikon'

/** Banner E-STOP / RESET fisik di atas setiap halaman aplikasi (semua role). Tidak tampil bila tidak ada kejadian. */
export function BannerKeselamatan() {
  const { data } = useKeselamatan()
  const daftar = peringatanKeselamatan(data)
  if (daftar.length === 0) return null
  return (
    <div className="mb-4 grid gap-2">
      {daftar.map((p) => (
        <div
          key={p.kode}
          role={p.tingkat === 'merah' ? 'alert' : 'status'}
          className={`vsf-banner flex flex-wrap items-center gap-3 rounded-std px-3 py-2.5 text-[13.5px] font-semibold ${p.tingkat === 'merah' ? 'vsf-tone-error' : 'vsf-tone-warn'}`}
        >
          <Ikon nama="peringatan" className="h-5 w-5 shrink-0" />
          <span className="min-w-0 flex-1">
            {p.teks}
            {p.kode === 'reset' && data?.reset_terakhir_pada && (
              <span className="font-normal"> ({tglJam(data.reset_terakhir_pada)})</span>
            )}
          </span>
          <Link to="/peringatan" className="inline-flex min-h-[44px] items-center underline">
            Lihat peringatan
          </Link>
        </div>
      ))}
    </div>
  )
}
