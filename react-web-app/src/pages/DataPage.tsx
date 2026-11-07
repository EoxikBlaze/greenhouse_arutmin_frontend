import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { Pesan } from '../components/kaca/DialogKaca'
import { PanelUjiLab } from '../components/dosing/PanelUjiLab'
import { useIotV41State } from '../lib/iotV41'

const TAB = [
  { kode: 'tanaman', nama: 'Takaran Tanaman' },
  { kode: 'buah', nama: 'Takaran Buah' },
] as const

/** Halaman Data: takaran larutan (kalkulator ppm/mL & mL per pH) dipisah untuk fase Tanaman dan fase Buah. */
export default function DataPage() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'buah' ? 'buah' : 'tanaman'
  const iot = useIotV41State()
  return (
    <div className="vsf-halaman vsf-stagger">
      <PageHeader judul="Data" deskripsi="Takaran larutan hasil penakaran nyata, dipisah untuk tanaman dan buah." />
      <div role="tablist" aria-label="Data" className="flex gap-2">
        {TAB.map((t) => (
          <button key={t.kode} type="button" role="tab" aria-selected={tab === t.kode}
            className={tab === t.kode ? 'vsf-btn-primary' : 'vsf-btn-secondary'}
            onClick={() => setParams(t.kode === 'tanaman' ? {} : { tab: t.kode })}>{t.nama}</button>
        ))}
      </div>
      {iot.error && <Pesan jenis="galat">{iot.error}</Pesan>}
      <PanelUjiLab kategori={tab} iot={iot.data} loading={iot.loading} onReload={() => void iot.reload()} />
    </div>
  )
}
