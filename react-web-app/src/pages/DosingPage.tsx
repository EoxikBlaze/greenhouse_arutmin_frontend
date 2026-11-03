import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useApiList } from '../lib/crudApi'
import { belumDiatur, type FailSafeRow, type JadwalRow, type ParameterRow } from '../lib/dosing'
import { useIotV41State } from '../lib/iotV41'
import { NaikHarian } from '../components/NaikHarian'
import { PageHeader } from '../components/PageHeader'
import { PanelFailSafe } from '../components/dosing/PanelFailSafe'
import { PanelParameter } from '../components/dosing/PanelParameter'
import { PanelPengaturanAlat } from '../components/dosing/PanelPengaturanAlat'
import { PanelPerawatan } from '../components/dosing/PanelPerawatan'
import { PanelSaklarMode } from '../components/dosing/PanelSaklarMode'
import { PresetNutrisi, TargetPenampung, type Preset, type TargetMeja } from '../components/dosing/PanelTarget'
import { PanelUjiLab } from '../components/dosing/PanelUjiLab'
import { Segmen } from '../components/sensor/FilterBar'

/**
 * Konfigurasi dosing — terhubung ke endpoint KONFIGURASI V2 riil (routes/konfigurasi.js, routes/preset.js, routes/iotV41.js).
 * Tujuh tab terpadu: Target & Nutrisi · Saklar & Mode · Pengaturan Alat · Uji Lab · Parameter · Keamanan · Perawatan.
 * Rute hanya untuk admin & demo (router.tsx); ubah/hapus/sinkron = admin saja.
 */

const TAB = [
  'Target & Nutrisi',
  'Saklar & Mode',
  'Pengaturan Alat',
  'Uji Lab',
  'Parameter',
  'Keamanan',
  'Perawatan',
] as const
type Tab = (typeof TAB)[number]
const KUNCI: Record<Tab, string> = {
  'Target & Nutrisi': 'target',
  'Saklar & Mode': 'saklar',
  'Pengaturan Alat': 'pengaturan',
  'Uji Lab': 'ujilab',
  Parameter: 'parameter',
  Keamanan: 'keamanan',
  Perawatan: 'perawatan',
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

export default function DosingPage() {
  const [params, setParams] = useSearchParams()
  const tab = TAB.find((t) => KUNCI[t] === params.get('tab')) ?? TAB[0]
  // naik setiap preset/target diubah → daftar target memuat ulang
  const [versiTarget, setVersiTarget] = useState(0)
  const ubahTarget = () => setVersiTarget((v) => v + 1)

  const target = useApiList<TargetMeja>(`/dosing/target?v=${versiTarget}`)
  const preset = useApiList<Preset>('/dosing/preset')
  const dosis = useApiList<ParameterRow>('/konfigurasi-dosis')
  const timing = useApiList<ParameterRow>('/timing-operasi')
  const failSafe = useApiList<FailSafeRow>('/aturan-fail-safe')
  const jadwal = useApiList<JadwalRow>('/jadwal-perawatan')
  const iotV41 = useIotV41State()

  const muatUlangV41 = () => {
    void iotV41.reload()
    dosis.reload()
    timing.reload()
  }

  const ring = useMemo(() => {
    const aktif = target.rows.filter((r) => r.batch || r.target_mode === 'manual' || r.target_ec_ppm != null)
    const semuaParam = [...dosis.rows, ...timing.rows]
    return {
      meja: aktif.length,
      terkunci: aktif.filter((r) => r.status_lock).length,
      otomatis: aktif.filter((r) => r.target_mode === 'otomatis').length,
      manual: aktif.filter((r) => r.target_mode === 'manual').length,
      presetAktif: preset.rows.filter((p) => p.status === 'aktif').length,
      param: semuaParam.length,
      kosong: semuaParam.filter((r) => belumDiatur(r.nilai)).length,
    }
  }, [target.rows, preset.rows, dosis.rows, timing.rows])

  return (
    <div className="vsf-halaman vsf-stagger">
      <PageHeader
        judul="Konfigurasi dosing"
        deskripsi="Target EC/pH tiap penampung diambil dari preset nutrisi sesuai tanaman, tahap, dan umur batch. Halaman ini hanya menyimpan konfigurasi: eksekusi dosis oleh pompa sedang dinonaktifkan sampai validasi keselamatan selesai, sehingga tidak ada injeksi nutrisi otomatis yang berjalan."
        aksi={
          <Link to="/watercontrol" className="vsf-btn-secondary">
            Buka Water Control
          </Link>
        }
      />

      <section className="vsf-card w-full min-w-0 p-4 sm:p-5" aria-label="Ringkasan dosing">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Penampung" nilai={String(ring.meja)} sub={`${ring.terkunci} terkunci`} />
          <Stat label="Mode target" nilai={`${ring.otomatis} otomatis`} sub={`${ring.manual} manual`} />
          <Stat label="Preset aktif" nilai={`${ring.presetAktif}/${preset.rows.length}`} sub="dipakai untuk target" />
          <Stat label="Parameter" nilai={String(ring.param)} sub={`${ring.kosong} belum diatur`} />
        </div>
        <div className="mt-4">
          <Segmen label="Bagian dosing" pilihan={TAB} nilai={tab} onPilih={(t: Tab) => setParams({ tab: KUNCI[t] }, { replace: true })} />
        </div>
      </section>

      {tab === 'Target & Nutrisi' && (
        <>
          <TargetPenampung data={target} onUbah={ubahTarget} />
          <NaikHarian />
          <PresetNutrisi data={preset} onUbah={ubahTarget} />
        </>
      )}
      {tab === 'Saklar & Mode' && (
        <PanelSaklarMode iot={iotV41.data} loading={iotV41.loading} onReload={muatUlangV41} />
      )}
      {tab === 'Pengaturan Alat' && (
        <PanelPengaturanAlat iot={iotV41.data} loading={iotV41.loading} onReload={muatUlangV41} />
      )}
      {tab === 'Uji Lab' && (
        <PanelUjiLab iot={iotV41.data} loading={iotV41.loading} onReload={muatUlangV41} />
      )}
      {tab === 'Parameter' && <PanelParameter dosis={dosis} timing={timing} />}
      {tab === 'Keamanan' && <PanelFailSafe data={failSafe} />}
      {tab === 'Perawatan' && <PanelPerawatan data={jadwal} />}
    </div>
  )
}
