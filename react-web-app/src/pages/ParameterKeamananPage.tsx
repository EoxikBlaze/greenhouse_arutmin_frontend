import { Link, useSearchParams } from 'react-router-dom'
import clsx from 'clsx'
import { useApiList } from '../lib/crudApi'
import { useApiObject } from '../lib/useApiObject'
import { tglJam } from '../lib/format'
import { useIotV41State } from '../lib/iotV41'
import { useKeselamatan } from '../lib/keselamatan'
import type { FailSafeRow, ParameterRow } from '../lib/dosing'
import { barisLevel, barisSensor, LABEL_STATUS, type BacaanTerakhir, type BarisAmbang, type BarisParameter } from '../lib/parameterPenting'
import { PageHeader } from '../components/PageHeader'
import { Segmen } from '../components/sensor/FilterBar'
import { Pesan, Rangka } from '../components/kaca/DialogKaca'
import { StatusBadge } from '../components/StatusBadge'
import { PanelFailSafe } from '../components/dosing/PanelFailSafe'
import { PanelParameter } from '../components/dosing/PanelParameter'
import { PanelJadwalAlat } from '../components/dosing/PanelJadwalAlat'

const TAB = ['Aturan pengaman', 'Pengaturan dosis & jadwal'] as const
type Tab = (typeof TAB)[number]
const KUNCI: Record<Tab, string> = { 'Aturan pengaman': 'pengaman', 'Pengaturan dosis & jadwal': 'pengaturan' }

const NADA: Record<BarisParameter['status'], string> = {
  normal: 'is-normal',
  di_luar_batas: 'is-kosong',
  basi: 'is-kosong',
  kosong: 'is-kosong',
  batas_belum_diatur: 'is-kosong',
  perhatian: 'is-kosong',
}

function TabelParameter({ baris }: { baris: BarisParameter[] }) {
  return (
    <div className="vsf-daftar mt-3">
      {baris.map((b) => (
        <div key={b.kunci} className="vsf-param" style={{ ['--kolom' as string]: 'minmax(0,1fr) minmax(0,1.3fr) minmax(0,1.1fr) 140px' }}>
          <div className="vsf-param-sel font-semibold text-tinta">{b.label}</div>
          <div className="vsf-param-sel">
            <span className="vsf-param-label">Bacaan sekarang</span>
            <b className="tabular-nums text-tinta">{b.nilai == null ? '—' : `${b.nilai}${b.satuan && b.kunci !== 'level' ? ` ${b.satuan}` : ''}`}</b>
            {b.catatan && <span className="block text-[11.5px] text-abu">{b.catatan}</span>}
          </div>
          <div className="vsf-param-sel">
            <span className="vsf-param-label">Batas peringatan</span>
            <span className="tabular-nums">{b.batas ?? 'Belum diatur'}</span>
            {b.batasDiubah && <span className="block text-[11.5px] text-abu">diubah {tglJam(b.batasDiubah)}</span>}
          </div>
          <div className="vsf-param-sel md:text-right">
            <span className={clsx('vsf-chip-nilai', NADA[b.status])}>{LABEL_STATUS[b.status]}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function YaTidak({ v, ya, tidak, kosong = 'Belum dilaporkan alat' }: { v: boolean | null | undefined; ya: string; tidak: string; kosong?: string }) {
  if (v == null) return <StatusBadge tone="warning" label={kosong} />
  return v ? <StatusBadge tone="offline" label={ya} /> : <StatusBadge tone="online" label={tidak} />
}

/**
 * Parameter & Keamanan — parameter penting, batas peringatan (satu sumber: Ambang Sensor), status keselamatan,
 * aturan fail-safe, serta pengaturan dosis/jadwal. Pengaturan dosis hanya rekomendasi: gerbang eksekusi tetap terkunci.
 */
export default function ParameterKeamananPage() {
  const [params, setParams] = useSearchParams()
  const tab = TAB.find((t) => KUNCI[t] === params.get('tab')) ?? TAB[0]

  const terakhir = useApiObject<NonNullable<BacaanTerakhir>>('/api/latest-sensor', { pollMs: 10_000 })
  const ambang = useApiList<BarisAmbang>('/ambang')
  const iot = useIotV41State()
  const aman = useKeselamatan()
  const failSafe = useApiList<FailSafeRow>('/aturan-fail-safe')
  const dosis = useApiList<ParameterRow>('/konfigurasi-dosis')
  const timing = useApiList<ParameterRow>('/timing-operasi')

  const baris = [...barisSensor(terakhir.data, ambang.rows), barisLevel(iot.data?.kondisi.float_bawah, iot.data?.kondisi.float_atas)]
  const waktuBacaan = (terakhir.data?.sensor?.updated_at ?? terakhir.data?.sensor?.created_at) as string | undefined
  const k = aman.data

  return (
    <div className="vsf-halaman vsf-stagger">
      <PageHeader
        judul="Parameter & Keamanan"
        deskripsi="Parameter yang dipakai sistem, batas peringatan, dan status keselamatan dalam satu tempat."
      />

      <section className="vsf-card w-full min-w-0 p-4 sm:p-5" aria-label="Parameter penting">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="vsf-judul-bagian">Parameter penting</div>
            <p className="mt-0.5 text-[13px] text-abu">
              Bacaan dari ESP32. Batas peringatan diambil dari{' '}
              <Link to="/ambang" className="py-[14px] font-semibold text-arutmin-forest underline">Master Data → Ambang Sensor</Link>
              {' '}dan bukan bacaan sensor.
            </p>
          </div>
          {terakhir.data && (
            <StatusBadge tone={terakhir.data.is_online ? 'online' : 'offline'} label={terakhir.data.is_online ? 'Data segar' : 'Data basi / alat terputus'} />
          )}
        </div>
        {(terakhir.error || ambang.error) && <Pesan jenis="galat">{terakhir.error ?? ambang.error}</Pesan>}
        {terakhir.loading && !terakhir.data ? <Rangka /> : <TabelParameter baris={baris} />}
        <p className="mt-2 text-[12px] text-abu">
          Bacaan terakhir: {waktuBacaan ? `${tglJam(waktuBacaan)}${terakhir.data?.seconds_ago != null ? ` (${terakhir.data.seconds_ago} detik lalu)` : ''}` : 'belum ada'}
          {' · '}Level tandon: {iot.data?.kondisi.level_diperbarui_pada ? tglJam(iot.data.kondisi.level_diperbarui_pada) : 'belum dilaporkan alat'}.
          {' '}ESP32 tidak punya sensor nutrisi terpisah; EC dihitung dari TDS.
        </p>
      </section>

      <section className="vsf-card w-full min-w-0 p-4 sm:p-5" aria-label="Status keselamatan">
        <div className="vsf-judul-bagian">Status keselamatan</div>
        {aman.error && <Pesan jenis="galat">{aman.error}</Pesan>}
        <dl className="mt-3 grid grid-cols-1 gap-3 text-[13px] sm:grid-cols-2 lg:grid-cols-4">
          <div className="vsf-stat">
            <dt className="vsf-label">E-STOP fisik (box panel)</dt>
            <dd className="mt-1"><YaTidak v={k?.estop_fisik} ya="Ditekan" tidak="Tidak ditekan" /></dd>
            {k?.estop_diperbarui_pada && <dd className="mt-1 text-[12px] text-abu">dilaporkan {tglJam(k.estop_diperbarui_pada)}</dd>}
          </div>
          <div className="vsf-stat">
            <dt className="vsf-label">E-STOP server</dt>
            <dd className="mt-1">{k ? <YaTidak v={k.estop_server} ya="Aktif" tidak="Tidak aktif" /> : '—'}</dd>
          </div>
          <div className="vsf-stat">
            <dt className="vsf-label">Tombol RESET fisik terakhir</dt>
            <dd className="mt-1 font-semibold text-tinta">{k?.reset_terakhir_pada ? tglJam(k.reset_terakhir_pada) : 'Belum pernah dilaporkan'}</dd>
          </div>
          <div className="vsf-stat">
            <dt className="vsf-label">Eksekusi dosing otomatis</dt>
            <dd className="mt-1">{k ? <StatusBadge tone={k.eksekusi_dosing_diizinkan ? 'warning' : 'online'} label={k.eksekusi_dosing_diizinkan ? 'Diizinkan' : 'Terkunci'} /> : '—'}</dd>
            <dd className="mt-1 text-[12px] text-abu">Diatur di kode server (gerbang dosis), tidak bisa diubah dari web.</dd>
          </div>
        </dl>
      </section>

      <section className="vsf-card w-full min-w-0 p-4 sm:p-5" aria-label="Bagian">
        <Segmen label="Bagian parameter & keamanan" pilihan={TAB} nilai={tab} onPilih={(t: Tab) => setParams({ tab: KUNCI[t] }, { replace: true })} />
      </section>

      {tab === 'Aturan pengaman' && <PanelFailSafe data={failSafe} />}
      {tab === 'Pengaturan dosis & jadwal' && (
        <>
          <Pesan jenis="ok">
            Pengaturan dosis EC, pH, dan pengenceran hanya tersimpan sebagai pengaturan/rekomendasi. Pompa dosing tidak dijalankan otomatis.
          </Pesan>
          <PanelParameter dosis={dosis} timing={timing} />
          <PanelJadwalAlat jadwal={iot.data?.jadwal_alat} onReload={() => void iot.reload()} />
        </>
      )}
    </div>
  )
}
