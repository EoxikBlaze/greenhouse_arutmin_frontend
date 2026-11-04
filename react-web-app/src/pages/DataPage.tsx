import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { Pesan } from '../components/kaca/DialogKaca'
import { PanelUjiLab } from '../components/dosing/PanelUjiLab'
import { PanelUjiLabHasil } from '../components/data/PanelUjiLabHasil'
import { useIotV41State } from '../lib/iotV41'

const TAB = [
  { kode: 'uji-lab', nama: 'Uji Lab' },
  { kode: 'takaran', nama: 'Takaran Larutan' },
] as const

/** Halaman Data: tab Uji Lab (hasil lab Buah/Sayur) dan Takaran Larutan (kalkulator ppm/mL & mL per pH). */
export default function DataPage() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'takaran' ? 'takaran' : 'uji-lab'
  return (
    <div className="vsf-halaman vsf-stagger">
      <PageHeader judul="Data" deskripsi="Hasil uji laboratorium hasil panen (Buah atau Sayur) dan takaran larutan hasil penakaran nyata." />
      <div role="tablist" aria-label="Data" className="flex gap-2">
        {TAB.map((t) => (
          <button key={t.kode} type="button" role="tab" aria-selected={tab === t.kode}
            className={tab === t.kode ? 'vsf-btn-primary' : 'vsf-btn-secondary'}
            onClick={() => setParams(t.kode === 'uji-lab' ? {} : { tab: t.kode })}>{t.nama}</button>
        ))}
      </div>
      {tab === 'uji-lab' ? <PanelUjiLabHasil /> : <TabTakaran />}
    </div>
  )
}

function TabTakaran() {
  const iot = useIotV41State()
  return (
    <>
      {iot.error && <Pesan jenis="galat">{iot.error}</Pesan>}
      <PanelUjiLab iot={iot.data} loading={iot.loading} onReload={() => void iot.reload()} />
    </>
  )
}
