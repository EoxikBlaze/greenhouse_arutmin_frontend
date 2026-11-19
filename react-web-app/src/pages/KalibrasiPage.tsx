import { useApiList } from '../lib/crudApi'
import { useIotV41State } from '../lib/iotV41'
import { useApiObject } from '../lib/useApiObject'
import type { Alat, Terkini } from '../lib/kalibrasi'
import { PageHeader } from '../components/PageHeader'
import { Pesan } from '../components/kaca/DialogKaca'
import { PanelKalibrasiLangsungV41 } from '../components/kalibrasi/PanelKalibrasiLangsungV41'
import { RingkasanKalibrasi } from '../components/kalibrasi/RingkasanKalibrasi'
import { RiwayatKalibrasi } from '../components/kalibrasi/RiwayatKalibrasi'

/**
 * Kalibrasi alat (firmware v6): pH & EC dua titik (KAL_SENSOR), laju 4 pompa, tes pompa isi air.
 * Jadwal jatuh tempo dari /kalibrasi; kalibrasi yang terlambat jadi peringatan (src/peringatan.js).
 */
export default function KalibrasiPage() {
  const { rows, reload } = useApiList<Alat>('/kalibrasi')
  const { data: terkini } = useApiObject<Terkini>('/api/latest-sensor', { pollMs: 5_000 })
  const iotV41 = useIotV41State()

  const muatSemua = () => {
    reload()
    void iotV41.reload()
  }

  return (
    <div className="vsf-halaman vsf-stagger">
      <PageHeader judul="Kalibrasi" deskripsi="Kalibrasi probe pH dan EC, laju empat pompa, dan tes pompa isi air." />

      <RingkasanKalibrasi rows={rows} terkini={terkini ?? null} />

      {iotV41.error && <Pesan jenis="galat">{iotV41.error}</Pesan>}
      <PanelKalibrasiLangsungV41 iot={iotV41.data} loading={iotV41.loading} onReload={muatSemua} />

      <RiwayatKalibrasi baris={iotV41.data?.arsip_kalibrasi ?? []} />
    </div>
  )
}
