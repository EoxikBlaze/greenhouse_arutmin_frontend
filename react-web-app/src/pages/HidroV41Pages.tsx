import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../lib/authContext'
import { useApiError } from '../lib/crudApi'
import { useApiObject } from '../lib/useApiObject'
import { tglJam } from '../lib/format'
import { useIotV41State } from '../lib/iotV41'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/StatusBadge'
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
        judul="Saklar & Mode"
        deskripsi="Izin jenis tindakan dan cara pengisian air pada penampung utama."
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

/* ── 8. Halaman Peringatan (peringatan.php) ────────────────────────────── */
type PeringatanItem = {
  id: string
  waktu: string
  level: 'merah' | 'kuning' | 'info'
  kode: string
  pesan: string
  aktif: boolean
}

/** Baris GET /alert-logs (tabel alert_logs) → item tampilan. */
type BarisAlert = { id: number | string; type: string; value: string; severity: string; acknowledged: boolean; created_at: string }
const LEVEL_ALERT: Record<string, PeringatanItem['level']> = { critical: 'merah', warning: 'kuning', info: 'info' }
function dariBarisAlert(r: BarisAlert): PeringatanItem {
  return { id: `a-${r.id}`, waktu: r.created_at, level: LEVEL_ALERT[r.severity] ?? 'info', kode: r.type.toUpperCase(), pesan: r.value, aktif: !r.acknowledged }
}

export function PeringatanPage() {
  const { role } = useAuth()
  const bolehUbah = role === 'admin'
  const handleApiError = useApiError()
  const iot = useIotV41State()

  const [daftar, setDaftar] = useState<PeringatanItem[]>([])
  const [sibuk, setSibuk] = useState(false)
  const [pesan, setPesan] = useState<string | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [waktuAwal] = useState(() => new Date().toISOString())

  const galatRef = useRef(handleApiError)
  useEffect(() => {
    galatRef.current = handleApiError
  }, [handleApiError])

  const muat = useCallback(async () => {
    try {
      const res = await api.get('/alert-logs', { params: { limit: 100 } })
      const baris = Array.isArray(res.data?.data) ? (res.data.data as BarisAlert[]) : []
      setDaftar(baris.map(dariBarisAlert))
    } catch (err) {
      setGalat(galatRef.current(err).message)
    }
  }, [])

  useEffect(() => {
    // setState terjadi SETELAH await (asinkron) — bukan setState sinkron di dalam effect.
    // eslint-disable-next-line react/set-state-in-effect
    void muat()
  }, [muat])

  const p = iot.data?.params
  const waktuAcuan = iot.data?.kondisi?.updated_at ?? waktuAwal
  // kondisi saat ini dari status alat (bukan data tetap): hanya tampil selama kondisinya benar
  const semuaPeringatan: PeringatanItem[] = [
    ...(p?.tahan_dosing
      ? [{ id: 'kondisi-tahan', waktu: waktuAcuan, level: 'merah' as const, kode: 'AIR_DIGANTI', pesan: p.tahan_alasan ?? 'Pemberian nutrisi ditahan otomatis karena perubahan EC/pH yang drastis.', aktif: true }]
      : []),
    ...(p?.pemeliharaan
      ? [{ id: 'kondisi-pemeliharaan', waktu: waktuAcuan, level: 'kuning' as const, kode: 'MODE_PEMELIHARAAN', pesan: 'Mode pemeliharaan sedang aktif — semua pompa dimatikan dan hitungan dibekukan.', aktif: true }]
      : []),
    ...(p && p.ec_setpoint === 0
      ? [{ id: 'kondisi-tidur', waktu: waktuAcuan, level: 'kuning' as const, kode: 'TARGET_TIDUR', pesan: 'Target EC bernilai 0 ppm (mode tidur): alat memantau sensor tanpa menyuntik nutrisi.', aktif: true }]
      : []),
    ...daftar,
  ]

  const jmlAktif = semuaPeringatan.filter((a) => a.aktif).length

  async function kirimReset() {
    if (!bolehUbah || sibuk) return
    setSibuk(true)
    setGalat(null)
    setPesan(null)
    try {
      const res = await api.post('/iot-v41/reset-peringatan')
      const d = (res.data ?? {}) as { message?: string }
      setPesan(String(d.message ?? 'Permintaan reset dicatat. Belum dikirim ke alat.'))
    } catch (err) {
      setGalat(handleApiError(err).message)
    } finally {
      setSibuk(false)
    }
  }

  async function tandaiSelesai(id: string) {
    try {
      await api.post(`/alert-logs/${id.replace(/^a-/, '')}/ack`)
      setPesan('Peringatan ditandai selesai.')
      await muat()
    } catch (err) {
      setGalat(handleApiError(err).message)
    }
  }

  return (
    <div className="vsf-halaman vsf-stagger">
      <PageHeader
        judul="Peringatan"
        deskripsi="Kondisi yang perlu diperhatikan beserta tingkat keparahannya (merah mengalahkan kuning pada lampu pilot)."
      />

      {pesan && <Pesan jenis="ok">{pesan}</Pesan>}
      {galat && <Pesan jenis="galat" onTutup={() => setGalat(null)}>{galat}</Pesan>}

      <section className="vsf-card w-full min-w-0 p-4 sm:p-5" aria-label="Ringkasan peringatan">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="vsf-stat">
            <div className="vsf-label">Peringatan aktif</div>
            <div className="mt-0.5 text-[22px] font-bold tabular-nums text-tinta">{jmlAktif}</div>
            <div className="text-[12px] text-abu">Merah mengalahkan kuning pada lampu pilot</div>
          </div>
          <div className="vsf-stat">
            <div className="vsf-label">Total tercatat</div>
            <div className="mt-0.5 text-[22px] font-bold tabular-nums text-tinta">{semuaPeringatan.length}</div>
            <div className="text-[12px] text-abu">100 terbaru ditampilkan</div>
          </div>
          <div className="vsf-blok flex flex-col justify-between p-3.5">
            <div className="text-[13px] font-bold text-tinta">Aksi</div>
            {bolehUbah && (
              <button
                type="button"
                className="vsf-btn-secondary mt-2 w-full sm:w-auto"
                disabled={sibuk}
                onClick={() => void kirimReset()}
              >
                {sibuk && <span className="vsf-spinner vsf-spinner-dark" aria-hidden />}
                Catat permintaan RESET
              </button>
            )}
            <div className="mt-1.5 text-[11.5px] text-abu">
              RESET hanya dicatat di server dan tidak menghapus riwayat. "Tandai selesai" menandai peringatan sudah ditangani di database.
            </div>
          </div>
        </div>
      </section>

      <section className="vsf-card w-full min-w-0 p-4 sm:p-5" aria-label="Daftar peringatan">
        <div className="vsf-judul-bagian">Daftar peringatan</div>
        <div className="vsf-daftar mt-3">
          {semuaPeringatan.map((a) => (
            <div
              key={a.id}
              className="vsf-param"
              style={{ ['--kolom' as string]: '115px 85px 140px minmax(0,1fr) 90px auto' }}
            >
              <div className="vsf-param-sel font-mono text-[12px]">{tglJam(a.waktu)}</div>
              <div className="vsf-param-sel">
                <StatusBadge
                  tone={a.level === 'merah' ? 'offline' : a.level === 'kuning' ? 'warning' : 'online'}
                  label={a.level}
                />
              </div>
              <div className="vsf-param-sel font-mono text-[12px] font-bold text-tinta">{a.kode}</div>
              <div className="vsf-param-sel text-[13px] text-tinta">{a.pesan}</div>
              <div className="vsf-param-sel">
                <span className={`vsf-chip-nilai ${a.aktif ? 'is-kosong' : 'is-normal'}`}>
                  {a.aktif ? 'aktif' : 'selesai'}
                </span>
              </div>
              <div className="vsf-param-sel">
                {a.aktif && bolehUbah && a.id.startsWith('a-') && (
                  <button
                    type="button"
                    className="inline-flex min-h-[44px] items-center text-[12px] font-semibold text-arutmin-forest underline"
                    onClick={() => void tandaiSelesai(a.id)}
                  >
                    tandai selesai
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

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
        deskripsi="Pemantauan pelampung tandon dan status katup air. Pengisian air manual dari web dinonaktifkan demi keselamatan."
      />

      <Pesan jenis="ok">
        Perintah isi/hentikan air langsung dari web (<span className="font-mono">POST /watercontrol/*</span>) sengaja dinonaktifkan (HTTP 503) sampai alur konfirmasi alat disahkan. Gunakan katup/saklar fisik atau mode otomatis di ESP32.
      </Pesan>

      {role === 'admin' && <TombolStopPompa />}

      <section className="vsf-card w-full min-w-0 p-4 sm:p-5" aria-label="Status air dan pelampung">
        <div className="vsf-judul-bagian">Status Tandon &amp; Pelampung</div>
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
