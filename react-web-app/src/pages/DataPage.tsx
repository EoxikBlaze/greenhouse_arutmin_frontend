import { PageHeader } from '../components/PageHeader'
import { Pesan } from '../components/kaca/DialogKaca'
import { PanelUjiLab } from '../components/dosing/PanelUjiLab'
import { useIotV41State } from '../lib/iotV41'

/**
 * Uji Lab: takaran larutan hasil penakaran nyata. Satu takaran per alat (firmware v6): nutrisi AB (ppm per mL) dan pH.
 * Dikirim ke alat saat Mulai Semai.
 */
export default function DataPage() {
  const iot = useIotV41State()
  return (
    <div className="vsf-halaman vsf-stagger">
      <PageHeader judul="Uji Lab" deskripsi="Hasil penakaran nyata nutrisi A+B dan larutan pH. Dikirim ke alat saat Mulai Semai." />
      {iot.error && <Pesan jenis="galat">{iot.error}</Pesan>}
      <PanelUjiLab iot={iot.data} loading={iot.loading} onReload={() => void iot.reload()} />
    </div>
  )
}
