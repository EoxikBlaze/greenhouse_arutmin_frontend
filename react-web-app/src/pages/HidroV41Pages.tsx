import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/authContext'
import { useApiError } from '../lib/crudApi'
import { tglJam, tglPendek } from '../lib/format'
import { simpanCacheLokal, useIotV41State } from '../lib/iotV41'
import { Ikon } from '../components/Ikon'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/StatusBadge'
import { Pesan, Rangka } from '../components/kaca/DialogKaca'
import { PanelPengaturanAlat } from '../components/dosing/PanelPengaturanAlat'
import { PanelSaklarMode } from '../components/dosing/PanelSaklarMode'
import { PanelUjiLab } from '../components/dosing/PanelUjiLab'

const fmt = (v: number | null | undefined, d = 0): string => {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—'
  return d > 0 ? v.toFixed(d).replace('.', ',') : Math.round(v).toLocaleString('id-ID')
}

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
        deskripsi="Volume efektif penampung, jumlah talang, waktu kerja sirkulasi, batas aman, dan laju pompa."
      />
      {iot.error && <Pesan jenis="galat">{iot.error}</Pesan>}
      <PanelPengaturanAlat iot={iot.data} loading={iot.loading} onReload={() => void iot.reload()} />
    </div>
  )
}

/* ── 3. Halaman Uji Lab (ujilab.php) ───────────────────────────────────── */
export function UjiLabPage() {
  const iot = useIotV41State()
  return (
    <div className="vsf-halaman vsf-stagger">
      <PageHeader
        judul="Uji Lab"
        deskripsi="Mengubah hasil penakaran nyata (ppm per mL dan mL per 1 pH per 1 L) menjadi angka yang dipakai alat."
      />
      {iot.error && <Pesan jenis="galat">{iot.error}</Pesan>}
      <PanelUjiLab iot={iot.data} loading={iot.loading} onReload={() => void iot.reload()} />
    </div>
  )
}

/* ── 4. Halaman Dosing Manual (pompa.php) ──────────────────────────────── */
type JejakPerintah = {
  id: string
  waktu: string
  cmd: string
  payload: string
  status: 'terkirim' | 'ok' | 'ditolak' | 'diantre' | 'dicatat'
  ack: string
}

const KUNCI_PERINTAH = 'vsf_iot_v41_cmds_v1'

function bacaJejakLokal(): JejakPerintah[] {
  try {
    const raw = window.localStorage.getItem(KUNCI_PERINTAH)
    return raw ? (JSON.parse(raw) as JejakPerintah[]) : []
  } catch {
    return []
  }
}

function tambahJejakLokal(item: Omit<JejakPerintah, 'id' | 'waktu'>): JejakPerintah[] {
  const baru: JejakPerintah = {
    ...item,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    waktu: new Date().toISOString(),
  }
  const daftar = [baru, ...bacaJejakLokal()].slice(0, 25)
  try {
    window.localStorage.setItem(KUNCI_PERINTAH, JSON.stringify(daftar))
  } catch {
    // abaikan
  }
  return daftar
}

export function DosingManualPage() {
  const { role } = useAuth()
  const bolehUbah = role === 'admin'
  const handleApiError = useApiError()
  const iot = useIotV41State()

  const p = iot.data?.params
  const k = iot.data?.kondisi
  const batasPh = p?.batas_ml_ph_efektif ?? 40

  const [ppm, setPpm] = useState('50')
  const [arah, setArah] = useState<'up' | 'down'>('up')
  const [ml, setMl] = useState('5')
  const [sibuk, setSibuk] = useState<string | null>(null)
  const [pesan, setPesan] = useState<string | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [cmds, setCmds] = useState<JejakPerintah[]>(() => bacaJejakLokal())

  useEffect(() => {
    if (!pesan) return
    const id = window.setTimeout(() => setPesan(null), 5000)
    return () => window.clearTimeout(id)
  }, [pesan])

  async function kirimPerintah(aksi: 'dosing_ab' | 'dosis_ph' | 'stop') {
    if (!bolehUbah || sibuk) return
    setSibuk(aksi)
    setGalat(null)
    setPesan(null)

    const body =
      aksi === 'dosing_ab'
        ? { aksi, ppm: Math.max(1, Math.min(300, Math.round(Number(ppm) || 50))) }
        : aksi === 'dosis_ph'
          ? { aksi, arah, ml: Math.max(1, Math.min(batasPh, Math.round(Number(ml) || 5))) }
          : { aksi: 'stop' }

    const cmdLabel = aksi === 'stop' ? 'stop' : 'dosing'
    const payloadStr =
      aksi === 'dosing_ab'
        ? JSON.stringify({ jenis: 'ab', ppm: body.ppm })
        : aksi === 'dosis_ph'
          ? JSON.stringify({ jenis: `ph_${arah}`, ml: body.ml })
          : '{}'

    try {
      const res = await api.post('/iot-v41/dosing-manual', body)
      const d = (res.data ?? {}) as { message?: string; antre?: boolean }
      setPesan(String(d.message ?? 'Permintaan diterima.'))
      // status jujur: STOP hanya DIANTRE (menunggu konfirmasi aktuator), bukan "terkirim"/"mati"
      setCmds(tambahJejakLokal({ cmd: cmdLabel, payload: payloadStr, status: d.antre ? 'diantre' : 'dicatat', ack: d.antre ? 'menunggu konfirmasi aktuator' : 'tanpa pengiriman' }))
      void iot.reload()
    } catch (err) {
      // 423 = dosing dikunci (gerbang keselamatan): tampilkan alasan server apa adanya; tidak ada "sukses" cadangan
      const f = handleApiError(err)
      setGalat(f.message)
      setCmds(tambahJejakLokal({ cmd: cmdLabel, payload: payloadStr, status: 'ditolak', ack: f.status === 423 ? 'dosis dikunci' : 'gagal' }))
    } finally {
      setSibuk(null)
    }
  }

  return (
    <div className="vsf-halaman vsf-stagger">
      <PageHeader
        judul="Nutrisi Manual"
        deskripsi="Pemberian nutrisi dari aplikasi DIKUNCI: aplikasi hanya memberi saran dan tombol dosis ditolak sistem. STOP hanya mengantrekan perintah dan tidak menjamin pompa mati; gunakan tombol darurat fisik."
      />

      {pesan && <Pesan jenis="ok">{pesan}</Pesan>}
      {galat && <Pesan jenis="galat" onTutup={() => setGalat(null)}>{galat}</Pesan>}

      <section className="vsf-card w-full min-w-0 p-4 sm:p-5" aria-label="Halaman ini untuk apa">
        <div className="vsf-judul-bagian">Halaman ini untuk apa</div>
        <p className="mt-0.5 text-[13px] text-abu">Halaman ini dikunci untuk pemberian nutrisi; hanya STOP yang bisa diantrekan.</p>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="vsf-blok p-3.5">
            <div className="text-[13.5px] font-bold text-tinta">Nutrisi manual</div>
            <p className="mt-1 text-[12.5px] leading-relaxed text-abu">
              Menyuntik nutrisi A+B atau pH up/down saat Anda memutuskan sendiri — misalnya setelah ganti air atau setelah membaca hasil uji lab. SAAT INI DIKUNCI: tombol dosis ditolak sistem dan tidak mengubah hitungan apa pun.
            </p>
          </div>
          <div className="vsf-blok p-3.5">
            <div className="text-[13.5px] font-bold text-tinta">Kalibrasi pompa ada di menu lain</div>
            <p className="mt-1 text-[12.5px] leading-relaxed text-abu">
              Untuk mengukur berapa mL per detik, buka menu{' '}
              <Link to="/kalibrasi" className="font-semibold text-arutmin-forest underline">
                Kalibrasi
              </Link>
              : pompa dijalankan, airnya ditakar di gelas ukur, hasilnya disimpan.
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Kolom Kiri: Form Dosing A+B, Koreksi pH, STOP */}
        <section className="vsf-card w-full min-w-0 p-4 sm:p-5 lg:col-span-7" aria-label="Form nutrisi manual">
          <div className="vsf-judul-bagian">Nutrisi A + B</div>
          <p className="mt-0.5 text-[13px] text-abu">Satu kali suntikan, A dulu lalu jeda lalu B.</p>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              void kirimPerintah('dosing_ab')
            }}
            className="mt-3 space-y-3"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="vsf-label vsf-label-tinta">Kenaikan EC yang diminta (ppm)</span>
                <input
                  type="number"
                  min={1}
                  max={300}
                  disabled={!bolehUbah}
                  className="vsf-input mt-1 w-full"
                  value={ppm}
                  onChange={(e) => setPpm(e.target.value)}
                />
                <span className="mt-1 block text-[11.5px] text-abu">Dibatasi 300 ppm per dosis oleh program alat.</span>
              </label>
              <div className="block">
                <span className="vsf-label vsf-label-tinta">Laju pompa A (hasil kalibrasi)</span>
                <input
                  type="text"
                  disabled
                  className="vsf-input mt-1 w-full opacity-80"
                  value={`${fmt(p?.laju_a, 2)} mL/detik`}
                  aria-label="Laju pompa A"
                />
              </div>
            </div>
            {bolehUbah && (
              <button type="submit" className="vsf-btn-primary" disabled={sibuk !== null}>
                {sibuk === 'dosing_ab' && <span className="vsf-spinner" aria-hidden />}
                Nutrisi A + B (dikunci)
              </button>
            )}
          </form>

          <hr className="my-4 border-garis" />

          <div className="vsf-judul-bagian">Koreksi pH</div>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void kirimPerintah('dosis_ph')
            }}
            className="mt-3 space-y-3"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="vsf-label vsf-label-tinta">Arah koreksi</span>
                <select
                  disabled={!bolehUbah}
                  className="vsf-input mt-1 w-full"
                  value={arah}
                  onChange={(e) => setArah(e.target.value === 'down' ? 'down' : 'up')}
                >
                  <option value="up">pH up (menaikkan)</option>
                  <option value="down">pH down (menurunkan)</option>
                </select>
              </label>
              <label className="block">
                <span className="vsf-label vsf-label-tinta">Jumlah (mL)</span>
                <input
                  type="number"
                  min={1}
                  max={batasPh}
                  disabled={!bolehUbah}
                  className="vsf-input mt-1 w-full"
                  value={ml}
                  onChange={(e) => setMl(e.target.value)}
                />
                <span className="mt-1 block text-[11.5px] leading-relaxed text-abu">
                  Batas per koreksi <b className="text-tinta">{batasPh} mL</b> (otomatis dari volume, bisa diatur di Pengaturan Alat). Jeda 120 menit, maks 5 per hari.
                </span>
              </label>
            </div>
            {bolehUbah && (
              <button type="submit" className="vsf-btn-primary" disabled={sibuk !== null}>
                {sibuk === 'dosis_ph' && <span className="vsf-spinner" aria-hidden />}
                Koreksi pH (dikunci)
              </button>
            )}
          </form>

          {bolehUbah && (
            <>
              <hr className="my-4 border-garis" />
              <button
                type="button"
                className="vsf-btn-danger"
                disabled={sibuk !== null}
                onClick={() => void kirimPerintah('stop')}
              >
                {sibuk === 'stop' && <span className="vsf-spinner" aria-hidden />}
                STOP — antre perintah berhenti
              </button>
            </>
          )}
        </section>

        {/* Kolom Kanan: Kondisi Sekarang & Perintah Terakhir */}
        <div className="grid content-start gap-4 lg:col-span-5">
          <section className="vsf-card w-full min-w-0 p-4 sm:p-5" aria-label="Kondisi sekarang">
            <div className="flex items-center justify-between gap-2">
              <div className="vsf-judul-bagian">Kondisi sekarang</div>
              <StatusBadge
                tone={k?.status === 'PERINGATAN' ? 'offline' : 'online'}
                label={k?.status ?? 'NORMAL'}
              />
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-2 text-[13px]">
              <div className="vsf-stat">
                <dt className="vsf-label">EC</dt>
                <dd className="mt-0.5 font-bold tabular-nums text-tinta">
                  {fmt(k?.ec_ppm)} ppm ({fmt(k?.ec_ms, 2)} mS/cm)
                </dd>
              </div>
              <div className="vsf-stat">
                <dt className="vsf-label">pH</dt>
                <dd className="mt-0.5 font-bold tabular-nums text-tinta">{fmt(k?.ph, 1)}</dd>
              </div>
              <div className="vsf-stat">
                <dt className="vsf-label">Target dijaga</dt>
                <dd className="mt-0.5 font-bold tabular-nums text-tinta">
                  {fmt(p?.ec_setpoint)} ppm · pH {fmt(p?.ph_setpoint, 1)}
                </dd>
              </div>
              <div className="vsf-stat">
                <dt className="vsf-label">Volume</dt>
                <dd className="mt-0.5 font-bold tabular-nums text-tinta">{fmt(p?.volume_l)} L</dd>
              </div>
              <div className="vsf-stat">
                <dt className="vsf-label">Hitungan EC</dt>
                <dd className="mt-0.5 font-semibold tabular-nums text-tinta">
                  {k?.hit_ec ?? 0} / {p?.maks_ec_hari ?? 10} (encer {k?.hit_encer ?? 0}/{p?.maks_encer_hari ?? 3})
                </dd>
              </div>
              <div className="vsf-stat">
                <dt className="vsf-label">Hitungan pH</dt>
                <dd className="mt-0.5 font-semibold tabular-nums text-tinta">
                  {k?.hit_ph ?? 0} / {p?.maks_ph_hari ?? 5}
                </dd>
              </div>
              <div className="vsf-stat">
                <dt className="vsf-label">Saklar A+B</dt>
                <dd className="mt-0.5 font-semibold text-tinta">
                  {p?.saklar_ab ? 'menyala' : 'mati (perintah ditolak)'}
                </dd>
              </div>
              <div className="vsf-stat">
                <dt className="vsf-label">Mode pemeliharaan</dt>
                <dd className="mt-0.5 font-semibold text-tinta">
                  {p?.pemeliharaan ? 'aktif (dosis ditolak)' : 'mati'}
                </dd>
              </div>
            </dl>
          </section>

          <section className="vsf-card w-full min-w-0 p-4 sm:p-5" aria-label="Perintah terakhir">
            <div className="flex items-center justify-between gap-2">
              <div className="vsf-judul-bagian">Perintah terakhir</div>
              <Link to="/mqtt-diagnostik" className="text-[12.5px] font-semibold text-arutmin-forest underline">
                semua
              </Link>
            </div>
            {cmds.length === 0 ? (
              <div className="vsf-blok mt-3 px-4 py-6 text-center text-[13px] text-abu">
                Belum ada perintah.
              </div>
            ) : (
              <div className="vsf-daftar mt-3">
                {cmds.slice(0, 6).map((c) => (
                  <div
                    key={c.id}
                    className="vsf-param"
                    style={{ ['--kolom' as string]: '110px 80px minmax(0,1fr)' }}
                  >
                    <div className="vsf-param-sel font-mono text-[12px]">{tglJam(c.waktu)}</div>
                    <div className="vsf-param-sel">
                      <span className="vsf-chip-nilai is-normal">{c.cmd}</span>
                    </div>
                    <div className="vsf-param-sel text-[12px] text-abu">{c.payload}</div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

/* ── 5. Halaman Kuras & Ganti Air (air.php) ────────────────────────────── */
export function KurasGantiAirPage() {
  const { role } = useAuth()
  const bolehUbah = role === 'admin'
  const handleApiError = useApiError()
  const iot = useIotV41State()

  const p = iot.data?.params
  const k = iot.data?.kondisi

  const [sibuk, setSibuk] = useState<string | null>(null)
  const [pesan, setPesan] = useState<string | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [riwayatKuras, setRiwayatKuras] = useState<Array<{ id: string; waktu: string; jenis: string; alasan: string }>>([])

  useEffect(() => {
    if (!pesan) return
    const id = window.setTimeout(() => setPesan(null), 5000)
    return () => window.clearTimeout(id)
  }, [pesan])

  async function jalankan(aksi: 'kuras_mulai' | 'air_diganti' | 'batal') {
    if (!bolehUbah || sibuk) return
    setSibuk(aksi)
    setGalat(null)
    setPesan(null)
    const body = aksi === 'batal' ? { aksi: 'pemeliharaan', aktif: false } : { aksi }
    try {
      await api.post('/iot-v41/pemeliharaan', body)
      simpanCacheLokal(
        aksi === 'kuras_mulai'
          ? { pemeliharaan: true }
          : { pemeliharaan: false, tahan_dosing: false, tahan_alasan: null },
      )
      const alasan =
        aksi === 'kuras_mulai'
          ? 'Kuras / ganti air dimulai dari web; semua tindakan dijeda'
          : aksi === 'air_diganti'
            ? 'Air diganti dikonfirmasi dari web; target dikirim ulang dan hitungan dimulai lagi'
            : 'Status kuras/pemeliharaan dibatalkan'
      setRiwayatKuras((lama) => [
        { id: `${Date.now()}`, waktu: new Date().toISOString(), jenis: aksi, alasan },
        ...lama,
      ])
      setPesan(
        aksi === 'kuras_mulai'
          ? 'Mode pemeliharaan dinyalakan (tindakan otomatis dijeda). Aplikasi TIDAK mematikan pompa: matikan dengan tombol fisik bila perlu. Tekan "Selesai & lanjutkan" setelah air baru terisi.'
          : aksi === 'air_diganti'
            ? 'Air baru sudah dikonfirmasi; hitungan harian mulai dari nol. Alat belum diberi tahu.'
            : 'Mode pemeliharaan dibatalkan.',
      )
      void iot.reload()
    } catch (err) {
      const f = handleApiError(err)
      setGalat(f.message)
    } finally {
      setSibuk(null)
    }
  }

  if (iot.loading && !iot.data) {
    return (
      <div className="vsf-halaman">
        <Rangka />
      </div>
    )
  }

  return (
    <div className="vsf-halaman vsf-stagger">
      <PageHeader
        judul="Kuras & Ganti Air"
        deskripsi="Tombol khusus untuk menguras penampung, mengisi air baru, lalu mengonfirmasi agar hitungan harian dimulai dari nol."
      />

      {pesan && <Pesan jenis="ok">{pesan}</Pesan>}
      {galat && <Pesan jenis="galat" onTutup={() => setGalat(null)}>{galat}</Pesan>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="grid content-start gap-4 lg:col-span-7">
          <section className="vsf-card w-full min-w-0 p-4 sm:p-5" aria-label="Status sekarang">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="vsf-judul-bagian">Status sekarang</div>
                <p className="mt-0.5 text-[13px] text-abu">Satu alur, dua tombol: mulai kuras, lalu selesai.</p>
              </div>
              <StatusBadge
                tone={p?.pemeliharaan ? 'warning' : 'online'}
                label={p?.pemeliharaan ? 'sedang kuras / pemeliharaan' : 'bekerja normal'}
              />
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-2 text-[13px] sm:grid-cols-3">
              <div className="vsf-stat">
                <dt className="vsf-label">EC sekarang</dt>
                <dd className="mt-0.5 font-bold tabular-nums text-tinta">{fmt(k?.ec_ppm)} ppm</dd>
              </div>
              <div className="vsf-stat">
                <dt className="vsf-label">pH sekarang</dt>
                <dd className="mt-0.5 font-bold tabular-nums text-tinta">{fmt(k?.ph, 1)}</dd>
              </div>
              <div className="vsf-stat">
                <dt className="vsf-label">Target dijaga</dt>
                <dd className="mt-0.5 font-bold tabular-nums text-tinta">
                  {fmt(p?.ec_setpoint)} ppm · pH {fmt(p?.ph_setpoint, 1)}
                </dd>
              </div>
              <div className="vsf-stat">
                <dt className="vsf-label">Volume penampung</dt>
                <dd className="mt-0.5 font-bold tabular-nums text-tinta">{fmt(p?.volume_l)} L</dd>
              </div>
              <div className="vsf-stat">
                <dt className="vsf-label">Dosis ditahan?</dt>
                <dd className="mt-0.5 font-semibold text-tinta">
                  {p?.tahan_dosing ? `ya — ${p?.tahan_alasan ?? 'ditahan'}` : 'tidak'}
                </dd>
              </div>
              <div className="vsf-stat">
                <dt className="vsf-label">Batas pemeliharaan</dt>
                <dd className="mt-0.5 font-semibold text-tinta">{p?.pemeliharaan_maks_menit ?? 120} menit</dd>
              </div>
            </dl>

            <hr className="my-4 border-garis" />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="vsf-blok flex flex-col justify-between p-4">
                <div>
                  <div className="text-[14px] font-bold text-tinta">1. Mulai kuras</div>
                  <div className="mt-1 rounded-input bg-white/60 px-3 py-1.5 text-[12.5px] font-semibold text-tinta">
                    Semua pompa OFF, dosing ditahan
                  </div>
                  <p className="mt-2 text-[12px] leading-relaxed text-abu">
                    Gunakan saat mau menguras penampung, bersihkan, atau ganti air total.
                  </p>
                </div>
                {bolehUbah && (
                  <button
                    type="button"
                    className="vsf-btn-secondary mt-3 w-full"
                    disabled={sibuk !== null}
                    onClick={() => void jalankan('kuras_mulai')}
                  >
                    {sibuk === 'kuras_mulai' && <span className="vsf-spinner vsf-spinner-dark" aria-hidden />}
                    Mulai kuras
                  </button>
                )}
              </div>

              <div className="vsf-blok flex flex-col justify-between p-4">
                <div>
                  <div className="text-[14px] font-bold text-tinta">2. Air sudah diganti</div>
                  <div className="mt-1 rounded-input bg-white/60 px-3 py-1.5 text-[12.5px] font-semibold text-tinta">
                    Pemeliharaan OFF, target dikirim ulang
                  </div>
                  <p className="mt-2 text-[12px] leading-relaxed text-abu">
                    Tekan setelah penampung terisi air baru dan nutrisi awal sudah dituang (kalau ada).
                  </p>
                </div>
                {bolehUbah && (
                  <button
                    type="button"
                    className="vsf-btn-primary mt-3 w-full"
                    disabled={sibuk !== null}
                    onClick={() => void jalankan('air_diganti')}
                  >
                    {sibuk === 'air_diganti' && <span className="vsf-spinner" aria-hidden />}
                    Selesai &amp; lanjutkan
                  </button>
                )}
              </div>
            </div>
          </section>

          <section className="vsf-card w-full min-w-0 p-4 sm:p-5" aria-label="Riwayat kuras dan ganti air">
            <div className="vsf-judul-bagian">Riwayat kuras &amp; ganti air</div>
            <p className="mt-0.5 text-[13px] text-abu">Semua kejadian, termasuk yang terdeteksi otomatis.</p>
            {riwayatKuras.length === 0 ? (
              <div className="vsf-blok mt-3 px-4 py-6 text-center text-[13px] text-abu">
                Belum ada riwayat pada sesi ini.
              </div>
            ) : (
              <div className="vsf-daftar mt-3">
                {riwayatKuras.map((r) => (
                  <div
                    key={r.id}
                    className="vsf-param"
                    style={{ ['--kolom' as string]: '110px 100px minmax(0,1fr) auto' }}
                  >
                    <div className="vsf-param-sel font-mono text-[12px]">{tglJam(r.waktu)}</div>
                    <div className="vsf-param-sel">
                      <span className="vsf-chip-nilai is-normal">{r.jenis}</span>
                    </div>
                    <div className="vsf-param-sel text-[12.5px] text-tinta">{r.alasan}</div>
                    {bolehUbah && (
                      <div className="vsf-param-sel">
                        <button
                          type="button"
                          className="text-[12px] font-semibold text-arutmin-forest underline"
                          onClick={() => void jalankan('batal')}
                        >
                          batalkan
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="grid content-start gap-4 lg:col-span-5">
          <section className="vsf-card w-full min-w-0 p-4 sm:p-5" aria-label="Hitungan hari ini">
            <div className="vsf-judul-bagian">Hitungan hari ini</div>
            <dl className="mt-3 grid grid-cols-1 gap-2 text-[13px] sm:grid-cols-2">
              <div className="vsf-stat">
                <dt className="vsf-label">Penjagaan EC</dt>
                <dd className="mt-0.5 font-bold tabular-nums text-tinta">
                  {k?.hit_ec ?? 0} / {p?.maks_ec_hari ?? 10} (encer {k?.hit_encer ?? 0}/{p?.maks_encer_hari ?? 3})
                </dd>
              </div>
              <div className="vsf-stat">
                <dt className="vsf-label">Koreksi pH</dt>
                <dd className="mt-0.5 font-bold tabular-nums text-tinta">
                  {k?.hit_ph ?? 0} / {p?.maks_ph_hari ?? 5}
                </dd>
              </div>
              <div className="vsf-stat">
                <dt className="vsf-label">Pengisian air</dt>
                <dd className="mt-0.5 font-bold tabular-nums text-tinta">{k?.hit_isi ?? 0} kali</dd>
              </div>
              <div className="vsf-stat">
                <dt className="vsf-label">Status pelampung</dt>
                <dd className="mt-0.5 font-semibold text-tinta">
                  Bawah {k?.float_bawah === 0 ? 'turun' : 'naik'} · Atas {k?.float_atas === 1 ? 'naik' : 'turun'}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-[12px] leading-relaxed text-abu">
              Hitungan dibuat dari catatan kejadian, jadi otomatis mulai dari nol pukul 00:00 — tidak perlu tombol reset.
            </p>
          </section>

          <section className="vsf-card w-full min-w-0 p-4 sm:p-5" aria-label="Kenapa perlu tombol khusus">
            <div className="vsf-judul-bagian">Kenapa perlu tombol khusus</div>
            <ul className="mt-2.5 list-disc space-y-1.5 pl-5 text-[13px] leading-relaxed text-abu">
              <li>Selama dikuras, alat tidak boleh menyuntik apa pun.</li>
              <li>Air baru hampir tanpa nutrisi; kalau target lama dipakai, alat akan menyuntik berlebihan.</li>
              <li>Setelah selesai, hitungan harian dimulai lagi supaya jatah tidak habis di hari yang sama.</li>
              <li>Alat juga mendeteksi sendiri (EC turun tajam), tapi tombol ini yang paling pasti.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}

/* ── 6. Halaman Pemulihan Papan (pulihkan.php) ─────────────────────────── */
export function PemulihanPapanPage() {
  const { role } = useAuth()
  const bolehUbah = role === 'admin'
  const handleApiError = useApiError()
  const iot = useIotV41State()

  const p = iot.data?.params
  const papan = iot.data?.papan
  const arsipKal = iot.data?.arsip_kalibrasi ?? []

  const [sibuk, setSibuk] = useState(false)
  const [pesan, setPesan] = useState<string | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [jejak, setJejak] = useState<Array<{ waktu: string; status: string; ack: string }>>([])

  async function kirimPemulihan() {
    if (!bolehUbah || sibuk) return
    setSibuk(true)
    setGalat(null)
    setPesan(null)
    try {
      const res = await api.post('/iot-v41/pulihkan')
      const d = (res.data ?? {}) as { message?: string }
      setPesan(String(d.message ?? 'Paket pemulihan sudah disiapkan, tetapi belum dikirim ke alat.'))
      setJejak((lama) => [
        { waktu: new Date().toISOString(), status: 'disiapkan', ack: 'BELUM dikirim ke papan' },
        ...lama,
      ])
      void iot.reload()
    } catch (err) {
      setGalat(handleApiError(err).message)
    } finally {
      setSibuk(false)
    }
  }

  return (
    <div className="vsf-halaman vsf-stagger">
      <PageHeader
        judul="Pemulihan Papan"
        deskripsi="Mengirim ulang parameter dan kalibrasi ke papan pengendali pengganti dalam satu paket."
      />

      {pesan && <Pesan jenis="ok">{pesan}</Pesan>}
      {galat && <Pesan jenis="galat" onTutup={() => setGalat(null)}>{galat}</Pesan>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="grid content-start gap-4 lg:col-span-7">
          <section className="vsf-card w-full min-w-0 p-4 sm:p-5" aria-label="Kondisi papan sekarang">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="vsf-judul-bagian">Kondisi papan sekarang</div>
                <p className="mt-0.5 text-[13px] text-abu">ID alat tetap sama; yang diganti hanya papannya.</p>
              </div>
              <StatusBadge
                tone={papan?.status === 'online' ? 'online' : papan?.status === 'BARU' ? 'warning' : 'offline'}
                label={papan?.status ?? 'offline'}
              />
            </div>

            <dl className="mt-3 grid grid-cols-1 gap-2 text-[13px] sm:grid-cols-2">
              <div className="vsf-stat">
                <dt className="vsf-label">ID alat</dt>
                <dd className="mt-0.5 font-bold text-tinta">{papan?.kode ?? 'HIDRO-01'}</dd>
              </div>
              <div className="vsf-stat">
                <dt className="vsf-label">Versi firmware</dt>
                <dd className="mt-0.5 font-bold text-tinta">{papan?.versi ?? 'v4.1'}</dd>
              </div>
              <div className="vsf-stat">
                <dt className="vsf-label">Terakhir terlihat</dt>
                <dd className="mt-0.5 font-semibold text-tinta">{tglJam(papan?.terakhir_terlihat)}</dd>
              </div>
              <div className="vsf-stat">
                <dt className="vsf-label">Papan baru?</dt>
                <dd className="mt-0.5 font-semibold text-tinta">
                  {papan?.status === 'BARU' ? 'ya, flash kosong — perlu pemulihan' : 'tidak'}
                </dd>
              </div>
              <div className="vsf-stat">
                <dt className="vsf-label">Target tersimpan di web</dt>
                <dd className="mt-0.5 font-bold tabular-nums text-tinta">
                  {fmt(p?.ec_setpoint)} ppm · pH {fmt(p?.ph_setpoint, 1)}
                </dd>
              </div>
              <div className="vsf-stat">
                <dt className="vsf-label">Volume</dt>
                <dd className="mt-0.5 font-bold tabular-nums text-tinta">{fmt(p?.volume_l)} L</dd>
              </div>
              <div className="vsf-stat sm:col-span-2">
                <dt className="vsf-label">Laju pompa (web)</dt>
                <dd className="mt-0.5 font-semibold tabular-nums text-tinta">
                  A {fmt(p?.laju_a, 2)} · B {fmt(p?.laju_b, 2)} · up {fmt(p?.laju_ph_up, 2)} · down {fmt(p?.laju_ph_down, 2)} mL/detik
                </dd>
              </div>
            </dl>

            {bolehUbah && (
              <div className="mt-4">
                <button
                  type="button"
                  className="vsf-btn-primary"
                  disabled={sibuk}
                  onClick={() => void kirimPemulihan()}
                >
                  {sibuk ? <span className="vsf-spinner" aria-hidden /> : <Ikon nama="siklus" />}
                  {sibuk ? 'Menyiapkan paket…' : 'Siapkan paket pemulihan (belum dikirim)'}
                </button>
                <p className="mt-2 text-[12px] leading-relaxed text-abu">
                  Yang dikirim: target, volume, persen dosing, waktu kerja, laju pompa, dan 6 catatan kalibrasi terakhir. Alat menandainya sebagai &ldquo;dipulihkan dari web&rdquo;.
                </p>
              </div>
            )}
          </section>

          <section className="vsf-card w-full min-w-0 p-4 sm:p-5" aria-label="Jejak pemulihan">
            <div className="vsf-judul-bagian">Jejak pemulihan</div>
            <p className="mt-0.5 text-[13px] text-abu">Status ack menunjukkan apakah alat menerima paketnya.</p>
            {jejak.length === 0 ? (
              <div className="vsf-blok mt-3 px-4 py-6 text-center text-[13px] text-abu">
                Belum pernah dipulihkan pada sesi ini.
              </div>
            ) : (
              <div className="vsf-daftar mt-3">
                {jejak.map((j, idx) => (
                  <div
                    key={idx}
                    className="vsf-param"
                    style={{ ['--kolom' as string]: '130px 90px minmax(0,1fr)' }}
                  >
                    <div className="vsf-param-sel font-mono text-[12px]">{tglJam(j.waktu)}</div>
                    <div className="vsf-param-sel">
                      <span className="vsf-chip-nilai is-normal">{j.status}</span>
                    </div>
                    <div className="vsf-param-sel text-[12.5px] text-tinta">{j.ack}</div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="grid content-start gap-4 lg:col-span-5">
          <section className="vsf-card w-full min-w-0 p-4 sm:p-5" aria-label="Arsip kalibrasi yang akan dikirim">
            <div className="vsf-judul-bagian">Arsip kalibrasi (yang akan dikirim)</div>
            {arsipKal.length === 0 ? (
              <div className="vsf-blok mt-3 px-4 py-6 text-center text-[13px] text-abu">
                Belum ada arsip.
              </div>
            ) : (
              <div className="vsf-daftar mt-3">
                {arsipKal.slice(0, 6).map((k) => (
                  <div
                    key={String(k.id)}
                    className="vsf-param"
                    style={{ ['--kolom' as string]: '100px 90px minmax(0,1fr)' }}
                  >
                    <div className="vsf-param-sel font-mono text-[12px]">{tglPendek(k.dilakukan_pada)}</div>
                    <div className="vsf-param-sel">
                      <span className="vsf-chip-nilai is-normal">{k.sensor}</span>
                    </div>
                    <div className="vsf-param-sel text-[12.5px] text-tinta">{k.catatan ?? '—'}</div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="vsf-card w-full min-w-0 p-4 sm:p-5" aria-label="Urutan yang benar saat ganti papan">
            <div className="vsf-judul-bagian">Urutan yang benar saat ganti papan</div>
            <ol className="mt-2.5 list-decimal space-y-1.5 pl-5 text-[13px] leading-relaxed text-abu">
              <li>Matikan alat dan lepas E-STOP.</li>
              <li>Ganti papan, lalu pasang program alat dengan ID alat yang sama.</li>
              <li>Nyalakan, buka halaman ini sampai status <b className="text-tinta">BARU</b> muncul.</li>
              <li>Tekan tombol pemulihan, tunggu ack <b className="text-tinta">ok</b>.</li>
              <li>Kalibrasi ulang probe yang ikut diganti (tidak bisa dipulihkan).</li>
              <li>Uji tiap pompa, angkat float atas, tekan E-STOP.</li>
              <li>Baru kirim target dari menu Kebun Saya / Pengaturan Nutrisi.</li>
            </ol>
            <p className="mt-3 text-[12px] text-abu">
              Satu hal yang tidak dipulihkan: kecocokan probe. Angka lama hanya berlaku untuk probe lama.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}

/* ── 7. Halaman MQTT & Diagnostik (mqtt.php) ───────────────────────────── */
const KONTRAK_TOPIK = [
  { topik: 'telemetri', arah: 'alat → web', isi: 'Bacaan dan status tiap 30 detik' },
  { topik: 'param', arah: 'alat → web (retained)', isi: 'Parameter dan target yang sedang dipakai' },
  { topik: 'kalibrasi', arah: 'alat → web (retained)', isi: 'Ringkasan kalibrasi sensor dan laju pompa' },
  { topik: 'log', arah: 'alat → web', isi: 'Kejadian, dengan antrian bila offline' },
  { topik: 'alert', arah: 'alat → web', isi: 'Peringatan' },
  { topik: 'ack', arah: 'alat → web', isi: 'Jawaban perintah: diterima atau ditolak + alasan' },
  { topik: 'status', arah: 'alat → web (retained)', isi: 'online / offline / BARU' },
  { topik: 'cmd', arah: 'web → alat', isi: 'Perintah kendali & konfigurasi' },
]

const CONTOH_PERINTAH = `{"cmd":"set_param","ec_setpoint":900,"ph_setpoint":6.0}
{"cmd":"set_saklar","saklar_ab":1,"saklar_pengenceran":0,"mode_isi":"otomatis"}
{"cmd":"dosing","jenis":"ab","ppm":50}
{"cmd":"dosing","jenis":"ph_up","ml":5}
{"cmd":"uji_pompa","pompa":"a","detik":3}
{"cmd":"pemeliharaan","aktif":true}
{"cmd":"kalibrasi","sensor":"ph","baca4":4.02,"baca7":7.03}
{"cmd":"pulihkan_kalibrasi"}
{"cmd":"reset"}
{"cmd":"stop"}`

export function MqttDiagnostikPage() {
  const { role } = useAuth()
  const bolehUbah = role === 'admin'
  const handleApiError = useApiError()
  const iot = useIotV41State()
  const papan = iot.data?.papan

  const [topic, setTopic] = useState('hidro/HIDRO-01/cmd')
  const [payload, setPayload] = useState('{"cmd":"status"}')
  const [sibuk, setSibuk] = useState(false)
  const [pesan, setPesan] = useState<string | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [cmds, setCmds] = useState<JejakPerintah[]>(() => bacaJejakLokal())

  async function kirimManual(e: React.FormEvent) {
    e.preventDefault()
    if (!bolehUbah || sibuk) return
    setSibuk(true)
    setGalat(null)
    setPesan(null)
    try {
      const res = await api.post('/iot-v41/mqtt-uji', { topic, pesan: payload })
      const d = (res.data ?? {}) as { message?: string }
      setCmds(
        tambahJejakLokal({
          cmd: 'publish_manual',
          payload: `${topic} → ${payload}`,
          status: 'dicatat',
          ack: 'TIDAK dikirim ke alat',
        }),
      )
      setPesan(String(d.message ?? `Pesan untuk ${topic} hanya dicatat; tidak diterbitkan.`))
    } catch (err) {
      setGalat(handleApiError(err).message)
    } finally {
      setSibuk(false)
    }
  }

  return (
    <div className="vsf-halaman vsf-stagger">
      <PageHeader
        judul="Koneksi Alat"
        deskripsi="Status jalur komunikasi alat, uji kirim pesan, dan jejak perintah."
      />

      {pesan && <Pesan jenis="ok">{pesan}</Pesan>}
      {galat && <Pesan jenis="galat" onTutup={() => setGalat(null)}>{galat}</Pesan>}

      <section className="vsf-card w-full min-w-0 p-4 sm:p-5" aria-label="Ringkasan koneksi alat">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="vsf-stat">
            <div className="vsf-label">Broker</div>
            <div className="mt-1">
              <StatusBadge tone="online" label="Siap (jalur komunikasi alat)" />
            </div>
            <div className="mt-1 text-[12px] text-abu">Aedes / Mosquitto lokal siap meneruskan topik</div>
          </div>
          <div className="vsf-stat">
            <div className="vsf-label">Alat</div>
            <div className="mt-0.5 text-[20px] font-bold text-tinta">{papan?.kode ?? 'HIDRO-01'}</div>
            <div className="text-[12px] text-abu">ID tertanam di firmware, tidak diubah dari web</div>
          </div>
          <div className="vsf-stat">
            <div className="vsf-label">Prefix topik</div>
            <div className="mt-0.5 font-mono text-[18px] font-bold text-tinta">hidro/&lt;ID&gt;/…</div>
            <div className="text-[12px] text-abu">Contoh: hidro/{papan?.kode ?? 'HIDRO-01'}/telemetri</div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <section className="vsf-card w-full min-w-0 p-4 sm:p-5 lg:col-span-7" aria-label="Kontrak topik dan uji kirim">
          <div className="vsf-judul-bagian">Kontrak topik</div>
          <p className="mt-0.5 text-[13px] text-abu">Daftar jalur pesan yang dipakai alat.</p>

          <div className="vsf-daftar mt-3">
            {KONTRAK_TOPIK.map((t) => (
              <div
                key={t.topik}
                className="vsf-param"
                style={{ ['--kolom' as string]: '105px 150px minmax(0,1fr)' }}
              >
                <div className="vsf-param-sel font-mono text-[12.5px] font-bold text-tinta">{t.topik}</div>
                <div className="vsf-param-sel text-[12px] text-abu">{t.arah}</div>
                <div className="vsf-param-sel text-[12.5px] text-tinta">{t.isi}</div>
              </div>
            ))}
          </div>

          {bolehUbah && (
            <>
              <hr className="my-4 border-garis" />
              <div className="vsf-judul-bagian">Uji kirim manual</div>
              <form onSubmit={(e) => void kirimManual(e)} className="mt-3 space-y-3">
                <label className="block">
                  <span className="vsf-label vsf-label-tinta">Topik</span>
                  <input
                    type="text"
                    className="vsf-input mt-1 w-full font-mono text-[13px]"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  />
                </label>
                <label className="block">
                  <span className="vsf-label vsf-label-tinta">Payload</span>
                  <input
                    type="text"
                    className="vsf-input mt-1 w-full font-mono text-[13px]"
                    value={payload}
                    onChange={(e) => setPayload(e.target.value)}
                  />
                </label>
                <button type="submit" className="vsf-btn-primary" disabled={sibuk}>
                  {sibuk && <span className="vsf-spinner" aria-hidden />}
                  Catat uji (tidak diterbitkan)
                </button>
              </form>
            </>
          )}
        </section>

        <div className="grid content-start gap-4 lg:col-span-5">
          <section className="vsf-card w-full min-w-0 p-4 sm:p-5" aria-label="Contoh perintah">
            <div className="vsf-judul-bagian">Contoh perintah</div>
            <pre className="vsf-blok mt-3 overflow-x-auto p-3 font-mono text-[11.5px] leading-relaxed text-tinta">
              {CONTOH_PERINTAH}
            </pre>
          </section>

          <section className="vsf-card w-full min-w-0 p-4 sm:p-5" aria-label="Jejak perintah">
            <div className="vsf-judul-bagian">Jejak perintah (terakhir)</div>
            <p className="mt-0.5 text-[12.5px] text-abu">
              Status: terkirim = sudah masuk jalur komunikasi, ok/ditolak = balasan dari alat.
            </p>
            {cmds.length === 0 ? (
              <div className="vsf-blok mt-3 px-4 py-6 text-center text-[13px] text-abu">
                Belum ada perintah.
              </div>
            ) : (
              <div className="vsf-daftar mt-3">
                {cmds.slice(0, 8).map((c) => (
                  <div
                    key={c.id}
                    className="vsf-param"
                    style={{ ['--kolom' as string]: '105px 95px minmax(0,1fr)' }}
                  >
                    <div className="vsf-param-sel font-mono text-[11.5px]">{tglJam(c.waktu)}</div>
                    <div className="vsf-param-sel">
                      <span className="vsf-chip-nilai is-normal">{c.cmd}</span>
                    </div>
                    <div className="vsf-param-sel truncate font-mono text-[11.5px] text-tinta">{c.payload}</div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
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

const BAWAAN_PERINGATAN: PeringatanItem[] = [
  {
    id: 'al-1',
    waktu: new Date().toISOString(),
    level: 'kuning',
    kode: 'TARGET_TIDUR',
    pesan: 'Target EC bernilai 0 ppm (mode tidur): alat memantau sensor tanpa menyuntik nutrisi.',
    aktif: true,
  },
]

export function PeringatanPage() {
  const { role } = useAuth()
  const bolehUbah = role === 'admin'
  const handleApiError = useApiError()
  const iot = useIotV41State()

  const [daftar, setDaftar] = useState<PeringatanItem[]>(BAWAAN_PERINGATAN)
  const [sibuk, setSibuk] = useState(false)
  const [pesan, setPesan] = useState<string | null>(null)
  const [galat, setGalat] = useState<string | null>(null)

  const p = iot.data?.params
  const waktuAcuan = iot.data?.kondisi.updated_at ?? BAWAAN_PERINGATAN[0].waktu
  const semuaPeringatan: PeringatanItem[] = [
    ...(p?.tahan_dosing
      ? [
          {
            id: 'al-tahan',
            waktu: waktuAcuan,
            level: 'merah' as const,
            kode: 'AIR_DIGANTI',
            pesan: p.tahan_alasan ?? 'Pemberian nutrisi ditahan otomatis karena perubahan EC/pH yang drastis.',
            aktif: true,
          },
        ]
      : []),
    ...(p?.pemeliharaan
      ? [
          {
            id: 'al-pemeliharaan',
            waktu: waktuAcuan,
            level: 'kuning' as const,
            kode: 'MODE_PEMELIHARAAN',
            pesan: 'Mode pemeliharaan sedang aktif — semua pompa dimatikan dan hitungan dibekukan.',
            aktif: true,
          },
        ]
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

  function tandaiSelesai(id: string) {
    setDaftar((lama) => lama.map((a) => (a.id === id ? { ...a, aktif: false } : a)))
    setPesan('Peringatan ditandai selesai.')
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
              RESET bukan pembersih riwayat: peringatan tetap tersimpan di web.
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
                {a.aktif && bolehUbah && a.id.startsWith('al-') && (
                  <button
                    type="button"
                    className="text-[12px] font-semibold text-arutmin-forest underline"
                    onClick={() => tandaiSelesai(a.id)}
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
