import { useAuth } from '../lib/authContext'
import { useApiObject } from '../lib/useApiObject'
import { useIotV41State } from '../lib/iotV41'
import { PageHeader } from '../components/PageHeader'
import { Pesan } from '../components/kaca/DialogKaca'
import { TombolStopPompa } from '../components/TombolStopPompa'
import { PanelPengaturanAlat } from '../components/dosing/PanelPengaturanAlat'
import { PanelSaklarMode } from '../components/dosing/PanelSaklarMode'

/* ── 1. Halaman Saklar & Mode (saklar.php) ─────────────────────────────── */
export function SaklarModePage() {
  const iot = useIotV41State()
  return (
    <div className="vsf-halaman vsf-stagger">
      <PageHeader
        judul="Saklar"
        deskripsi="Matikan otomasi alat per jenis tindakan, mis. saat pompa rusak atau pH tidak ingin dikoreksi otomatis."
      />
      {iot.error && <Pesan jenis="galat">{iot.error}</Pesan>}
      <PanelSaklarMode iot={iot.data} loading={iot.loading} onReload={() => void iot.reload()} />
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

/* ── 8. Halaman Status Kontrol Air (/watercontrol) ─────────────────────── */
type WaterControlRow = { command?: string | null; mode?: string | null; valve_state?: string | null; updated_at?: string | null }

export function WaterControlPage() {
  const { role } = useAuth()
  const wc = useApiObject<WaterControlRow>('/watercontrol/status', { pollMs: 10_000 })
  const iot = useIotV41State()
  const k = iot.data?.kondisi

  return (
    <div className="vsf-halaman vsf-stagger">
      <PageHeader
        judul="Status Kontrol Air"
        deskripsi="Pemantauan pelampung penampung air dan status katup air. Pengisian air manual dari web dinonaktifkan demi keselamatan."
      />

      <Pesan jenis="ok">
        Perintah isi/hentikan air langsung dari web (<span className="font-mono">POST /watercontrol/*</span>) sengaja dinonaktifkan (HTTP 503) sampai alur konfirmasi alat disahkan. Gunakan katup/saklar fisik atau mode otomatis di ESP32.
      </Pesan>

      {role === 'admin' && <TombolStopPompa />}

      <section className="vsf-card w-full min-w-0 p-4 sm:p-5" aria-label="Status air dan pelampung">
        <div className="vsf-judul-bagian">Status Penampung Air &amp; Pelampung</div>
        {(wc.error || iot.error) && <Pesan jenis="galat">{wc.error ?? iot.error}</Pesan>}
        <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="vsf-stat">
            <dt className="vsf-label">Pelampung bawah</dt>
            <dd className="mt-0.5 text-[16px] font-bold text-tinta">
              {k?.float_bawah == null ? 'Belum dilaporkan' : k.float_bawah === 0 ? 'RENDAH (Perlu isi)' : 'Cukup'}
            </dd>
          </div>
          <div className="vsf-stat">
            <dt className="vsf-label">Pelampung atas</dt>
            <dd className="mt-0.5 text-[16px] font-bold text-tinta">
              {k?.float_atas == null ? 'Belum dilaporkan' : k.float_atas === 1 ? 'PENUH' : 'Belum penuh'}
            </dd>
          </div>
          <div className="vsf-stat">
            <dt className="vsf-label">Status katup (DB)</dt>
            <dd className="mt-0.5 text-[16px] font-bold text-tinta">{wc.data?.valve_state ?? '—'}</dd>
          </div>
          <div className="vsf-stat">
            <dt className="vsf-label">Mode di DB</dt>
            <dd className="mt-0.5 text-[16px] font-bold text-tinta">{wc.data?.mode ?? '—'}</dd>
          </div>
        </dl>
      </section>
    </div>
  )
}
