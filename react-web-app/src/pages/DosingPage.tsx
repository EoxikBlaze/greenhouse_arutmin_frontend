import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/authContext'
import { useApiError, useApiList } from '../lib/crudApi'
import { useApiObject } from '../lib/useApiObject'
import { kalimatHasil, useHasilPerintah } from '../lib/useHasilPerintah'
import { type JadwalRow } from '../lib/dosing'
import { NaikHarian } from '../components/NaikHarian'
import { PageHeader } from '../components/PageHeader'
import { Pesan } from '../components/kaca/DialogKaca'
import { StatusBadge } from '../components/StatusBadge'
import { PanelPerawatan } from '../components/dosing/PanelPerawatan'
import { TargetPenampung, type TargetMeja } from '../components/dosing/PanelTarget'
import { Segmen } from '../components/sensor/FilterBar'

const TAB = ['Target Nutrisi', 'Perawatan'] as const
type Tab = (typeof TAB)[number]
const KUNCI: Record<Tab, string> = { 'Target Nutrisi': 'target', Perawatan: 'perawatan' }

type AktuatorMini = {
  perangkat?: Array<{ kode: string; online: boolean }>
  v6?: { mode?: string; target_ppm?: string; hari_semai?: string }
}

function Stat({ label, nilai, sub }: { label: string; nilai: string; sub: string }) {
  return (
    <div className="vsf-stat">
      <div className="vsf-label">{label}</div>
      <div className="mt-0.5 text-[20px] font-bold tabular-nums text-tinta">{nilai}</div>
      <div className="text-[12px] text-abu">{sub}</div>
    </div>
  )
}

function PanelSinkronTargetAlat({ targetUtama }: { targetUtama?: TargetMeja }) {
  const { role } = useAuth()
  const bolehUbah = role === 'admin'
  const handleApiError = useApiError()
  const { data: akt } = useApiObject<AktuatorMini>('/api/aktuator/status', { pollMs: 10_000 })
  const [ppm, setPpm] = useState('')
  const [phMin, setPhMin] = useState('')
  const [phMax, setPhMax] = useState('')
  const [sibuk, setSibuk] = useState(false)
  const [galat, setGalat] = useState<string | null>(null)
  const [idPerintah, setIdPerintah] = useState<number | string | null>(null)
  const hasil = useHasilPerintah(idPerintah)

  const alat = akt?.perangkat?.find((p) => p.kode === 'aktuator-01')
  const v6 = akt?.v6
  const saranPpm = targetUtama?.naik_harian?.target_hari_ini ?? (targetUtama?.target_ec_ppm != null ? Number(targetUtama.target_ec_ppm) : null)

  async function kirimTarget(e: React.FormEvent) {
    e.preventDefault()
    if (!bolehUbah || sibuk) return
    setSibuk(true)
    setGalat(null)
    try {
      const body: Record<string, number> = {}
      const nPpm = Number(ppm || saranPpm)
      if (Number.isFinite(nPpm) && nPpm > 0) body.target_ppm = Math.round(nPpm)
      if (phMin.trim() !== '' && phMax.trim() !== '') {
        body.ph_min = Number(phMin.replace(',', '.'))
        body.ph_max = Number(phMax.replace(',', '.'))
      }
      const res = await api.post('/api/aktuator/target', body)
      setIdPerintah(res.data?.id_perintah ?? null)
    } catch (err) {
      setGalat(handleApiError(err).message)
    } finally {
      setSibuk(false)
    }
  }

  return (
    <section className="vsf-card w-full min-w-0 p-4 sm:p-5" aria-label="Sinkronisasi target ke ESP32">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="vsf-judul-bagian">Sinkronisasi target ke ESP32 (Firmware v6)</div>
          <p className="mt-0.5 text-[13px] text-abu">
            Perubahan target di server hanya tersimpan di database sampai perintah <span className="font-mono">TARGET</span> dikonfirmasi alat. Dosing otomatis tetap mengikuti gerbang keselamatan server.
          </p>
        </div>
        <StatusBadge tone={alat?.online ? 'online' : 'offline'} label={alat?.online ? 'Alat online' : 'Alat offline'} />
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="vsf-stat">
          <dt className="vsf-label">Target di ESP32</dt>
          <dd className="mt-0.5 text-[18px] font-bold tabular-nums text-tinta">{v6?.target_ppm ? `${v6.target_ppm} ppm` : '—'}</dd>
        </div>
        <div className="vsf-stat">
          <dt className="vsf-label">Hari semai di alat</dt>
          <dd className="mt-0.5 text-[18px] font-bold tabular-nums text-tinta">{v6?.hari_semai ? `Hari ${v6.hari_semai}` : '—'}</dd>
        </div>
        <div className="vsf-stat">
          <dt className="vsf-label">Mode alat</dt>
          <dd className="mt-0.5 text-[18px] font-bold text-tinta">{v6?.mode || 'BELUM SIAP'}</dd>
        </div>
        <div className="vsf-stat">
          <dt className="vsf-label">Rekomendasi server hari ini</dt>
          <dd className="mt-0.5 text-[18px] font-bold tabular-nums text-tinta">{saranPpm != null ? `${Math.round(saranPpm)} ppm` : '—'}</dd>
        </div>
      </dl>

      {galat && <div className="mt-3"><Pesan jenis="galat" onTutup={() => setGalat(null)}>{galat}</Pesan></div>}
      {idPerintah && (
        <div className="mt-3">
          <Pesan jenis={hasil?.status === 'gagal' || hasil?.status === 'kedaluwarsa' ? 'galat' : 'ok'}>
            Kirim TARGET (#{idPerintah}): {kalimatHasil(hasil)}
          </Pesan>
        </div>
      )}

      {bolehUbah && (
        <form onSubmit={(e) => void kirimTarget(e)} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-4 sm:items-end">
          <label className="block">
            <span className="vsf-label vsf-label-tinta">Target PPM ke alat</span>
            <input
              type="number"
              min={50}
              max={2500}
              className="vsf-input mt-1 w-full"
              placeholder={saranPpm != null ? String(Math.round(saranPpm)) : 'mis. 800'}
              value={ppm}
              onChange={(e) => setPpm(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="vsf-label vsf-label-tinta">pH min (opsional)</span>
            <input type="number" step="0.1" min={3} max={9} className="vsf-input mt-1 w-full" placeholder="5.5" value={phMin} onChange={(e) => setPhMin(e.target.value)} />
          </label>
          <label className="block">
            <span className="vsf-label vsf-label-tinta">pH maks (opsional)</span>
            <input type="number" step="0.1" min={3} max={9} className="vsf-input mt-1 w-full" placeholder="6.5" value={phMax} onChange={(e) => setPhMax(e.target.value)} />
          </label>
          <button type="submit" className="vsf-btn-primary" disabled={sibuk}>
            {sibuk && <span className="vsf-spinner" aria-hidden />}
            Kirim TARGET ke alat
          </button>
        </form>
      )}
    </section>
  )
}

function KontenAdminDemo({ tab }: { tab: Tab }) {
  const [versiTarget, setVersiTarget] = useState(0)
  const target = useApiList<TargetMeja>(`/dosing/target?v=${versiTarget}`)
  const jadwal = useApiList<JadwalRow>('/jadwal-perawatan')
  const ring = useMemo(() => {
    const aktif = target.rows.filter((r) => r.batch || r.target_mode === 'manual' || r.target_ec_ppm != null)
    return {
      meja: aktif.length,
      terkunci: aktif.filter((r) => r.status_lock).length,
      otomatis: aktif.filter((r) => r.target_mode === 'otomatis').length,
      manual: aktif.filter((r) => r.target_mode === 'manual').length,
    }
  }, [target.rows])

  return (
    <>
      <section className="vsf-card w-full min-w-0 p-4 sm:p-5" aria-label="Ringkasan target nutrisi">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Penampung aktif" nilai={String(ring.meja)} sub={`${ring.terkunci} terkunci`} />
          <Stat label="Mode kendali" nilai={`${ring.otomatis} otomatis`} sub={`${ring.manual} manual`} />
          <Stat label="Target harian" nilai="Aktif" sub="Kurva kenaikan ppm" />
          <div className="vsf-stat flex flex-col justify-between">
            <div className="vsf-label">Pengaman & jadwal alat</div>
            <Link to="/parameter" className="mt-1 text-[13px] font-semibold text-arutmin-forest underline">
              Buka Parameter & Keamanan →
            </Link>
          </div>
        </div>
      </section>

      {tab === 'Target Nutrisi' && (
        <>
          <PanelSinkronTargetAlat targetUtama={target.rows[0]} />
          <NaikHarian />
          <TargetPenampung data={target} onUbah={() => setVersiTarget((v) => v + 1)} />
        </>
      )}
      {tab === 'Perawatan' && <PanelPerawatan data={jadwal} />}
    </>
  )
}

/**
 * Target Nutrisi — target naik harian per tanaman (admin, petani, demo read-only)
 * serta target penampung EC/pH, sinkronisasi TARGET ke ESP32 v6, dan jadwal perawatan (admin/demo).
 */
export default function DosingPage() {
  const { role } = useAuth()
  const [params, setParams] = useSearchParams()
  const tab = TAB.find((t) => KUNCI[t] === params.get('tab')) ?? TAB[0]
  const adalahPetani = role === 'petani'

  return (
    <div className="vsf-halaman vsf-stagger">
      <PageHeader
        judul="Target Nutrisi"
        deskripsi="Target nutrisi naik harian (ppm awal hingga target panen) dan batas target penampung EC/pH."
      />

      {!adalahPetani && (
        <section className="vsf-card w-full min-w-0 p-4 sm:p-5" aria-label="Bagian target nutrisi">
          <Segmen label="Bagian target nutrisi" pilihan={TAB} nilai={tab} onPilih={(t: Tab) => setParams({ tab: KUNCI[t] }, { replace: true })} />
        </section>
      )}

      {adalahPetani ? <NaikHarian /> : <KontenAdminDemo tab={tab} />}
    </div>
  )
}

