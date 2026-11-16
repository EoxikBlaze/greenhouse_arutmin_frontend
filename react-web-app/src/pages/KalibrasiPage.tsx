import { useIotV41State } from '../lib/iotV41'
import { PageHeader } from '../components/PageHeader'
import { Pesan } from '../components/kaca/DialogKaca'
import { PanelKalibrasiLangsungV41 } from '../components/kalibrasi/PanelKalibrasiLangsungV41'

/**
 * Kalibrasi sensor pH/EC dan laju pompa lewat website + MQTT (titik larutan buffer: lihat AGENTS.md).
 * Pencatatan/riwayat kalibrasi, Stop Pompa, dan pemulihan papan ESP32 sengaja tidak ada di halaman ini.
 */
export default function KalibrasiPage() {
  const iot = useIotV41State()
  return (
    <div className="vsf-halaman vsf-stagger">
      <PageHeader judul="Kalibrasi" deskripsi="Kalibrasi probe pH, EC, dan laju pompa. Nilai kalibrasi disimpan di ESP32 (NVS)." />
      {iot.error && <Pesan jenis="galat">{iot.error}</Pesan>}
      <PanelKalibrasiLangsungV41 iot={iot.data} loading={iot.loading} onReload={() => void iot.reload()} />
    </div>
  )
}
