import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { api } from '../lib/api'
import { useApiError } from '../lib/crudApi'
import { useAuth } from '../lib/authContext'
import { simpanCacheLokal, useIotV41State } from '../lib/iotV41'
import { useApiObject, useFlashOnChange } from '../lib/useApiObject'
import { StatusBadge } from '../components/StatusBadge'
import { StatusPenampung } from '../components/StatusPenampung'
import { Ikon } from '../components/Ikon'
import { Segmen } from '../components/sensor/FilterBar'
import { RiwayatPerintah, type Riwayat } from '../components/watercontrol/RiwayatPerintah'
import { DialogKonfirmasiAksi } from '../components/watercontrol/DialogKonfirmasiAksi'
import { tglJam } from '../lib/format'

type Mode = 'AUTO' | 'MANUAL'

/* ── Ikon SVG inline (R3): pengganti emoji silang/centang/peringatan/titik — aria-hidden, 16px ── */
/** Baris GET /watercontrol/status (tabel `water_controls`). */
type Status = {
  id?: string | number
  command?: string | null
  mode?: string | null
  valve_state?: string | null
  updated_at?: string | null
}

/** Backend menolak semua perintah kontrol air (503 kontrol_air_nonaktif) sampai jalur antrean aktif. */
const KONTROL_AKTIF = false

export default function WaterControlPage() {
  const { username, role } = useAuth()
  const bolehUbah = role === 'admin'
  const handleApiError = useApiError()
  const iotV41 = useIotV41State()

  // Status live + polling senyap tiap 5 dtk (skeleton hanya saat muat pertama).
  const { data: status, loading, error, reload } = useApiObject<Status>('/watercontrol/status', { pollMs: 5_000 })
  // P4 — sorot kilat saat nilai polling 5 dtk berubah.
  const statusFlash = useFlashOnChange(JSON.stringify(status ?? null))

  const mode = (status?.mode === 'AUTO' ? 'AUTO' : status?.mode === 'MANUAL' ? 'MANUAL' : null) as Mode | null
  const terjangkau = !error

  const [busy, setBusy] = useState<null | 'fill' | 'stop' | 'mode' | 'kuras_mulai' | 'air_diganti'>(null)
  const [pesan, setPesan] = useState<{ teks: string; ok: boolean } | null>(null)
  const [riwayat, setRiwayat] = useState<Riwayat[]>([])
  const [konfirmasi, setKonfirmasi] = useState<null | 'fill' | 'stop'>(null)

  // Auto-hilang (5 dtk) — sama dengan pola flash di halaman master.
  useEffect(() => {
    if (!pesan) return
    const id = setTimeout(() => setPesan(null), 5000)
    return () => clearTimeout(id)
  }, [pesan])

  function catat(perintah: string, hasil: string, ok: boolean) {
    setRiwayat((old) => [
      {
        key: `${Date.now()}-${old.length}`,
        waktu: new Date().toISOString(),
        perintah,
        sumber: username || 'sesi ini',
        hasil,
        ok,
      },
      ...old,
    ])
  }

  async function sendMode(next: Mode) {
    if (!KONTROL_AKTIF || busy || next === mode) return
    setBusy('mode')
    try {
      const res = await api.post('/watercontrol/setMode', { mode: next })
      const msg = String((res.data as { message?: unknown })?.message ?? `Mode diubah ke ${next}.`)
      setPesan({ teks: msg, ok: true })
      catat(next, msg, true)
      reload()
    } catch (err) {
      const f = handleApiError(err)
      setPesan({ teks: f.message, ok: false })
      catat(next, f.message, false)
    } finally {
      setBusy(null)
    }
  }

  async function action(kind: 'fill' | 'stop') {
    if (!KONTROL_AKTIF || busy || !terjangkau || mode !== 'MANUAL') return
    setBusy(kind)
    const path = kind === 'fill' ? '/watercontrol/fill' : '/watercontrol/stop'
    const label = kind === 'fill' ? 'FILL' : 'STOP'
    try {
      const res = await api.post(path)
      const msg = String((res.data as { message?: unknown })?.message ?? 'Perintah diterima.')
      setPesan({ teks: msg, ok: true })
      catat(label, msg, true)
      reload()
    } catch (err) {
      const f = handleApiError(err)
      setPesan({ teks: f.message, ok: false })
      catat(label, f.message, false)
    } finally {
      setBusy(null)
    }
  }

  async function aksiKurasV41(aksi: 'kuras_mulai' | 'air_diganti') {
    if (!bolehUbah || busy) return
    setBusy(aksi)
    try {
      await api.post('/iot-v41/pemeliharaan', { aksi })
      simpanCacheLokal(
        aksi === 'kuras_mulai'
          ? { pemeliharaan: true }
          : { pemeliharaan: false, tahan_dosing: false, tahan_alasan: null },
      )
      const teks =
        aksi === 'kuras_mulai'
          ? 'Mode kuras aktif di server (pemeliharaan ON). Silakan kuras penampung, isi air bersih, lalu tekan "Air sudah diganti".'
          : 'Air baru dikonfirmasi. Hitungan harian EC, pH, dan pengenceran direset ke 0, mode pemeliharaan dimatikan.'
      setPesan({ teks, ok: true })
      catat(aksi === 'kuras_mulai' ? 'KURAS_MULAI' : 'AIR_DIGANTI', teks, true)
      reload()
      void iotV41.reload()
    } catch (err) {
      const f = handleApiError(err)
      if (f.status === 404) {
        simpanCacheLokal(
          aksi === 'kuras_mulai'
            ? { pemeliharaan: true }
            : { pemeliharaan: false, tahan_dosing: false, tahan_alasan: null },
        )
        const teks =
          aksi === 'kuras_mulai'
            ? 'Mode kuras diaktifkan (lokal).'
            : 'Air baru dikonfirmasi & hitungan direset (lokal).'
        setPesan({ teks, ok: true })
        catat(aksi === 'kuras_mulai' ? 'KURAS_MULAI' : 'AIR_DIGANTI', teks, true)
        void iotV41.reload()
      } else {
        setPesan({ teks: f.message, ok: false })
        catat(aksi, f.message, false)
      }
    } finally {
      setBusy(null)
    }
  }

  const serverRow: Riwayat | null = status?.updated_at
    ? {
        key: 'server',
        waktu: String(status.updated_at),
        perintah: status.command ?? '—',
        sumber: 'server',
        hasil: `tersimpan • mode ${status.mode ?? '—'}`,
        ok: true,
      }
    : null
  const barisRiwayat: Riwayat[] = serverRow ? [serverRow, ...riwayat] : riwayat

  const alasanNonaktif = !KONTROL_AKTIF
    ? 'Kontrol air nonaktif sementara.'
    : !terjangkau
      ? 'Status tidak terjangkau — aksi dinonaktifkan sampai koneksi pulih.'
      : mode !== 'MANUAL'
        ? 'Pindah ke mode MANUAL dulu untuk Isi Air atau Stop.'
        : null
  const aksiOff = alasanNonaktif !== null || busy !== null

  const stat: Array<{ label: string; nilai: string; ket: string; flash?: boolean }> = [
    { label: 'Perintah terakhir', nilai: status?.command ?? '—', ket: 'tercatat di server', flash: true },
    { label: 'Katup', nilai: status?.valve_state ?? '—', ket: 'status katup tandon', flash: true },
    {
      label: 'Mode',
      nilai: mode ?? '—',
      ket: mode === 'MANUAL' ? 'pengisian air dikendalikan manual' : 'sistem mengisi sesuai ambang sensor',
      flash: true,
    },
  ]

  return (
    <div className="vsf-halaman vsf-stagger">
      {error && (
        <div
          role="alert"
          className="vsf-banner rounded-input vsf-tone-error px-3 py-2 text-[13px] flex flex-wrap items-center gap-3"
        >
          <span className="flex items-center gap-2">
            <Ikon nama="salah" className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </span>
          <button type="button" className="vsf-btn-secondary" onClick={reload}>
            Coba lagi
          </button>
        </div>
      )}

      {pesan && (
        <div
          role={pesan.ok ? 'status' : 'alert'}
          className={clsx(
            'vsf-banner rounded-input border px-3 py-2 text-[13px] flex items-start gap-2',
            pesan.ok ? 'border-arutmin-moss bg-arutmin-mint/50 text-arutmin-forest' : 'vsf-tone-error',
          )}
        >
          <Ikon nama={pesan.ok ? 'ok' : 'salah'} className="h-4 w-4 mt-[2px] shrink-0" />
          <span>{pesan.teks}</span>
        </div>
      )}

      {/* Status perangkat */}
      <section aria-label="Status perangkat" className="vsf-card p-4 sm:p-5">
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0">
            <div className="vsf-judul-bagian">Status perangkat &amp; tandon</div>
            <p className="mt-0.5 text-[13px] text-abu">Diperbarui otomatis tiap 5 detik.</p>
          </div>
          <button type="button" className="vsf-btn-secondary w-full sm:ml-auto sm:w-auto" onClick={reload}>
            <Ikon nama="siklus" />
            Muat ulang
          </button>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          <div className="vsf-stat">
            <dt className="vsf-label vsf-label-tinta">Status API</dt>
            <dd className="mt-2">
              {loading && !status ? (
                <span className="vsf-skeleton inline-block h-[24px] w-[130px]" />
              ) : (
                <StatusBadge tone={terjangkau ? 'online' : 'offline'} label={terjangkau ? 'Terhubung' : 'Terputus'} />
              )}
            </dd>
            <dd className="mt-1 text-[12px] text-abu">terakhir {tglJam(status?.updated_at)}</dd>
          </div>
          {stat.map((s) => (
            <div key={s.label} className="vsf-stat">
              <dt className="vsf-label vsf-label-tinta">{s.label}</dt>
              <dd className={clsx('mt-1 font-heading text-[20px] font-bold leading-tight tabular-nums text-tinta', s.flash && statusFlash)}>
                {s.nilai}
              </dd>
              <dd className="mt-1 text-[12px] text-abu">{s.ket}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Kontrol air: mode + aksi manual */}
      <section aria-label="Kontrol air" className="vsf-card p-4 sm:p-5">
        <div className="vsf-judul-bagian">Kontrol air</div>

        {!KONTROL_AKTIF && (
          <div role="status" className="vsf-tone-warn mt-3 flex items-start gap-2 rounded-input px-3 py-2 text-[13px]">
            <Ikon nama="peringatan" className="mt-[1px] h-4 w-4 shrink-0" />
            <span>
              Kontrol air dinonaktifkan sementara. Perangkat belum menerima maupun mengonfirmasi perintah dari aplikasi.
              Gunakan katup atau saklar fisik. Status tetap ditampilkan.
            </span>
          </div>
        )}

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <div className="vsf-blok">
            <div className="vsf-label vsf-label-tinta">Mode</div>
            <div className="mt-2">
              <fieldset
                disabled={!KONTROL_AKTIF || busy !== null || !terjangkau || !mode}
                className="m-0 min-w-0 border-0 p-0 disabled:opacity-60"
              >
                <Segmen label="Mode kontrol air" pilihan={['AUTO', 'MANUAL'] as const} nilai={mode as Mode} onPilih={(m) => void sendMode(m)} />
              </fieldset>
            </div>
            <p className="mt-2 text-[12px] text-abu">
              AUTO: sistem mengisi air sesuai ambang sensor. MANUAL: Anda yang mengisi dan menghentikan air.
            </p>
            {mode === 'MANUAL' && (
              <div className="vsf-tone-warn mt-2 flex items-start gap-2 rounded-input px-3 py-2 text-[12px]">
                <Ikon nama="peringatan" className="mt-[1px] h-4 w-4 shrink-0" />
                <span>Mode MANUAL aktif — sistem tidak akan mengisi air otomatis.</span>
              </div>
            )}
          </div>

          <div className="vsf-blok">
            <div className="vsf-label vsf-label-tinta">Aksi manual</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" disabled={aksiOff} onClick={() => setKonfirmasi('fill')} className="vsf-btn-primary">
                {busy === 'fill' ? <span className="vsf-spinner" /> : <Ikon nama="tetes" />}
                {busy === 'fill' ? 'Mengirim…' : 'Isi Air (Fill)'}
              </button>
              <button type="button" disabled={aksiOff} onClick={() => setKonfirmasi('stop')} className="vsf-btn-secondary">
                {busy === 'stop' && <span className="vsf-spinner vsf-spinner-dark" />}
                {busy === 'stop' ? 'Mengirim…' : 'Stop'}
              </button>
            </div>
            <p className="mt-2 text-[12px] text-abu">{alasanNonaktif ?? 'Isi Air membuka katup tandon, Stop menutupnya.'}</p>
            {!terjangkau && (
              <div className="vsf-tone-error mt-2 flex items-start gap-2 rounded-input px-3 py-2 text-[12px]">
                <Ikon nama="salah" className="mt-[1px] h-4 w-4 shrink-0" />
                <span>Status tidak terjangkau — aksi dinonaktifkan sampai koneksi pulih.</span>
              </div>
            )}
          </div>
        </div>
      </section>

      <StatusPenampung onPesan={(teks, ok) => setPesan({ teks, ok })} />

      {/* Kuras & Ganti Air + Status Pelampung v4.1 (adaptasi air.php & saklar.php) */}
      <section aria-label="Kuras dan ganti air penampung" className="vsf-card p-4 sm:p-5">
        <div className="vsf-judul-bagian">Kuras &amp; ganti air penampung (Alur v4.1)</div>
        <p className="mt-0.5 text-[13px] text-abu">
          Dua langkah ganti air tandon: aktifkan mode kuras agar pompa nutrisi &amp; koreksi pH ditahan selama pengurasan, lalu konfirmasi setelah air bersih terisi agar hitungan harian (EC, pH, pengenceran) direset ke nol.
        </p>

        {iotV41.data?.params.tahan_dosing && (
          <div role="alert" className="vsf-tone-warn mt-3 flex items-start gap-2 rounded-input px-3 py-2.5 text-[13px]">
            <Ikon nama="peringatan" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <b>Dosing sedang ditahan otomatis:</b> {iotV41.data.params.tahan_alasan ?? 'Terdeteksi perubahan drastis EC/pH (kemungkinan air baru diganti).'} Tekan tombol <b>2. Air sudah diganti — Selesai &amp; lanjutkan</b> di bawah untuk membuka kunci dan mereset hitungan.
            </span>
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="vsf-blok p-4 lg:col-span-6">
            <div className="text-[14px] font-bold text-tinta">Langkah kuras &amp; ganti air</div>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-[12.5px] leading-relaxed text-abu">
              <li>Tekan <b>1. Mulai kuras</b> — sistem masuk <i>mode pemeliharaan</i> (batas {iotV41.data?.params.pemeliharaan_maks_menit ?? 120} menit), tindakan otomatis dijeda dan hitungan dibekukan (aplikasi tidak mematikan pompa fisik).</li>
              <li>Matikan pompa sirkulasi fisik, kuras tandon, bersihkan penampung, lalu isi air baku sampai pelampung bawah terangkat.</li>
              <li>Nyalakan kembali pompa sirkulasi, lalu tekan <b>2. Air sudah diganti</b> — hitungan harian direset ke 0 dan penjagaan kembali normal.</li>
            </ol>

            {bolehUbah && (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="vsf-btn-secondary"
                  disabled={busy !== null}
                  onClick={() => void aksiKurasV41('kuras_mulai')}
                >
                  {busy === 'kuras_mulai' && <span className="vsf-spinner vsf-spinner-dark" aria-hidden />}
                  1. Mulai kuras (aktifkan pemeliharaan)
                </button>
                <button
                  type="button"
                  className="vsf-btn-primary"
                  disabled={busy !== null}
                  onClick={() => void aksiKurasV41('air_diganti')}
                >
                  {busy === 'air_diganti' && <span className="vsf-spinner" aria-hidden />}
                  2. Air sudah diganti — Selesai &amp; lanjutkan
                </button>
              </div>
            )}
          </div>

          <div className="vsf-blok p-4 lg:col-span-6">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[14px] font-bold text-tinta">Kondisi air &amp; hitungan hari ini</span>
              <StatusBadge
                tone={iotV41.data?.params.pemeliharaan ? 'warning' : 'online'}
                label={iotV41.data?.params.pemeliharaan ? 'Mode kuras / pemeliharaan' : 'Normal'}
              />
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-2 text-[12.5px] sm:grid-cols-3">
              <div className="vsf-stat">
                <dt className="vsf-label">Float bawah</dt>
                <dd className="mt-0.5 font-semibold text-tinta">
                  {iotV41.data?.kondisi.float_bawah === 0 ? 'turun (air kurang)' : 'mengambang (cukup)'}
                </dd>
              </div>
              <div className="vsf-stat">
                <dt className="vsf-label">Float atas</dt>
                <dd className="mt-0.5 font-semibold text-tinta">
                  {iotV41.data?.kondisi.float_atas === 1 ? 'mengambang (penuh)' : 'turun (belum penuh)'}
                </dd>
              </div>
              <div className="vsf-stat">
                <dt className="vsf-label">Mode isi air</dt>
                <dd className="mt-0.5 font-semibold text-tinta">
                  {iotV41.data?.params.mode_isi === 'otomatis' ? 'Otomatis' : 'Manual'}
                </dd>
              </div>
              <div className="vsf-stat">
                <dt className="vsf-label">Penjagaan EC</dt>
                <dd className="mt-0.5 font-bold tabular-nums text-tinta">
                  {iotV41.data?.kondisi.hit_ec ?? 0} / {iotV41.data?.params.maks_ec_hari ?? 10}
                </dd>
              </div>
              <div className="vsf-stat">
                <dt className="vsf-label">Pengenceran</dt>
                <dd className="mt-0.5 font-bold tabular-nums text-tinta">
                  {iotV41.data?.kondisi.hit_encer ?? 0} / {iotV41.data?.params.maks_encer_hari ?? 3}
                </dd>
              </div>
              <div className="vsf-stat">
                <dt className="vsf-label">Koreksi pH</dt>
                <dd className="mt-0.5 font-bold tabular-nums text-tinta">
                  {iotV41.data?.kondisi.hit_ph ?? 0} / {iotV41.data?.params.maks_ph_hari ?? 5}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <RiwayatPerintah rows={barisRiwayat} />

      {konfirmasi && (
        <DialogKonfirmasiAksi
          aksi={konfirmasi}
          onBatal={() => setKonfirmasi(null)}
          onYa={() => {
            const k = konfirmasi
            setKonfirmasi(null)
            void action(k)
          }}
        />
      )}
    </div>
  )
}
