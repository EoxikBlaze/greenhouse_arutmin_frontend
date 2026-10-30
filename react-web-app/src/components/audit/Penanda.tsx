import { AKSI_INFO, labelAksi } from '../../lib/audit'
import { Ikon } from '../Ikon'

/** Lencana aksi: ikon + label Indonesia, warna per jenis (create/update/delete/login). */
export function LencanaAksi({ aksi }: { aksi: string }) {
  const info = AKSI_INFO[aksi]
  return (
    <span className={`vsf-aksi-lencana is-${info ? aksi : 'lain'}`}>
      {info && <Ikon nama={info.ikon} className="h-3.5 w-3.5" />}
      {labelAksi(aksi)}
    </span>
  )
}
