import { useAuth } from '../lib/authContext'
import { useIotV41State } from '../lib/iotV41'
import { TombolStopPompa } from '../components/TombolStopPompa'
import { PageHeader } from '../components/PageHeader'
import { Pesan } from '../components/kaca/DialogKaca'
import { PanelPengaturanAlat } from '../components/dosing/PanelPengaturanAlat'
import { PanelSaklarMode } from '../components/dosing/PanelSaklarMode'

/* ── 1. Halaman Otomasi Alat ─────────────────────────────── */
export function SaklarModePage() {
  const { role } = useAuth()
  const iot = useIotV41State()
  return (
    <div className="vsf-halaman vsf-stagger">
      <PageHeader
        judul="Otomasi Alat"
        deskripsi="Matikan otomasi alat per jenis tindakan, mis. saat pompa rusak atau pH tidak ingin dikoreksi otomatis."
      />
      {iot.error && <Pesan jenis="galat">{iot.error}</Pesan>}
      <PanelSaklarMode iot={iot.data} loading={iot.loading} onReload={() => void iot.reload()} />
      {role === 'admin' && <TombolStopPompa />}
    </div>
  )
}

/* ── 2. Halaman Pengaturan Alat (pengaturan.php) ───────────────────────── */
export function PengaturanAlatPage() {
  const iot = useIotV41State()
  return (
    <div className="vsf-halaman vsf-stagger">
      <PageHeader
        judul="Pengaturan Alat"
        deskripsi="Volume penampung, talang, dan waktu kerja yang tersimpan di server. Batas peringatan ada di Parameter & Keamanan."
      />
      {iot.error && <Pesan jenis="galat">{iot.error}</Pesan>}
      <PanelPengaturanAlat iot={iot.data} loading={iot.loading} onReload={() => void iot.reload()} />
    </div>
  )
}

/* ── 8. Halaman Peringatan — dipindah ke PeringatanPage.tsx (penilai server, firmware v6) ── */
export { PeringatanPage } from './PeringatanPage'
