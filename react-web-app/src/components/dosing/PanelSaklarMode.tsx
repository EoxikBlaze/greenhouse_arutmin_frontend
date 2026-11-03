import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/authContext'
import { useApiError } from '../../lib/crudApi'
import { simpanCacheLokal, type IotV41State } from '../../lib/iotV41'
import { Ikon } from '../Ikon'
import { Pesan, Rangka } from '../kaca/DialogKaca'
import { StatusBadge } from '../StatusBadge'

const fmt = (v: number | null | undefined, d = 0): string => {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—'
  return d > 0 ? v.toFixed(d).replace('.', ',') : Math.round(v).toLocaleString('id-ID')
}

type SaklarItem = {
  kunci: 'saklar_ab' | 'saklar_ph_up' | 'saklar_ph_down' | 'saklar_pengenceran' | 'mode_isi_otomatis'
  judul: string
  ket: string
}

const DAFTAR_SAKLAR: readonly SaklarItem[] = [
  {
    kunci: 'saklar_ab',
    judul: 'Nutrisi A + B',
    ket: 'Kalau mati: EC kurang hanya jadi peringatan, tanpa suntikan.',
  },
  {
    kunci: 'saklar_ph_up',
    judul: 'pH up',
    ket: 'Koreksi pH naik.',
  },
  {
    kunci: 'saklar_ph_down',
    judul: 'pH down',
    ket: 'Koreksi pH turun.',
  },
  {
    kunci: 'saklar_pengenceran',
    judul: 'Pengenceran',
    ket: 'Menambah air untuk menurunkan EC. Hanya jalan kalau isi air otomatis menyala.',
  },
  {
    kunci: 'mode_isi_otomatis',
    judul: 'Isi air otomatis',
    ket: 'Menyala: pompa isi jalan sendiri saat float bawah turun sampai float atas. Mati: alat hanya memberi peringatan, petani mengisi sendiri.',
  },
]

const ATURAN_SAKLAR = [
  'Saklar mati = alat tidak bertindak untuk jenis itu, hanya peringatan.',
  'Saklar berlaku sama di mode manual maupun otomatis, termasuk perintah dosing manual.',
  'Mode pemeliharaan mematikan semua tindakan dan membekukan hitungan.',
  'Saklar pH mati juga berfungsi sebagai tidur pH.',
]

/** Panel Saklar & Mode (adaptasi saklar.php Perancangan Sistem IoT Hidroponik 1 Penampung v4.1). */
export function PanelSaklarMode({
  iot,
  loading,
  onReload,
}: {
  iot: IotV41State | null
  loading: boolean
  onReload: () => void
}) {
  const { role } = useAuth()
  const bolehUbah = role === 'admin'
  const handleApiError = useApiError()

  const p = iot?.params
  const k = iot?.kondisi
  const pr = iot?.pratinjau_dosis

  const [draf, setDraf] = useState<Partial<{
    saklar_ab: boolean
    saklar_ph_up: boolean
    saklar_ph_down: boolean
    saklar_pengenceran: boolean
    mode_isi_otomatis: boolean
  }>>({})
  const [sibuk, setSibuk] = useState(false)
  const [pesan, setPesan] = useState<string | null>(null)
  const [galat, setGalat] = useState<string | null>(null)

  const form = {
    saklar_ab: draf.saklar_ab ?? Boolean(p?.saklar_ab ?? true),
    saklar_ph_up: draf.saklar_ph_up ?? Boolean(p?.saklar_ph_up ?? true),
    saklar_ph_down: draf.saklar_ph_down ?? Boolean(p?.saklar_ph_down ?? true),
    saklar_pengenceran: draf.saklar_pengenceran ?? Boolean(p?.saklar_pengenceran ?? true),
    mode_isi_otomatis: draf.mode_isi_otomatis ?? (p ? p.mode_isi === 'otomatis' : true),
  }

  useEffect(() => {
    if (!pesan) return
    const id = window.setTimeout(() => setPesan(null), 4000)
    return () => window.clearTimeout(id)
  }, [pesan])

  function resetForm() {
    setDraf({})
    setGalat(null)
  }

  async function simpan() {
    if (!bolehUbah || sibuk) return
    setSibuk(true)
    setGalat(null)
    setPesan(null)
    const payload = {
      saklar_ab: form.saklar_ab ? 1 : 0,
      saklar_ph_up: form.saklar_ph_up ? 1 : 0,
      saklar_ph_down: form.saklar_ph_down ? 1 : 0,
      saklar_pengenceran: form.saklar_pengenceran ? 1 : 0,
      mode_isi: form.mode_isi_otomatis ? ('otomatis' as const) : ('manual' as const),
    }
    try {
      await api.put('/iot-v41/saklar', payload)
      simpanCacheLokal(payload)
      setDraf({})
      setPesan('Saklar dan mode isi air tersimpan di sistem, tetapi alat belum diberi tahu.')
      onReload()
    } catch (err) {
      const f = handleApiError(err)
      setGalat(f.message)
    } finally {
      setSibuk(false)
    }
  }

  if (loading && !iot) {
    return (
      <section className="vsf-card w-full min-w-0 p-4 sm:p-5" aria-label="Saklar dan Mode">
        <Rangka />
      </section>
    )
  }

  const peringatanEncerManual = !form.mode_isi_otomatis && form.saklar_pengenceran

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      {/* Kolom Kiri: Perangkat Terpasang (5 Saklar) */}
      <section className="vsf-card w-full min-w-0 p-4 sm:p-5 lg:col-span-7" aria-label="Perangkat terpasang">
        <div className="vsf-judul-bagian">Perangkat terpasang</div>
        <p className="mt-0.5 text-[13px] text-abu">
          Saklar mematikan satu jenis tindakan. Alat tetap membaca dan melapor.
          {!bolehUbah && ' Hanya admin yang dapat mengubah saklar.'}
        </p>

        {pesan && <Pesan jenis="ok">{pesan}</Pesan>}
        {galat && <Pesan jenis="galat" onTutup={() => setGalat(null)}>{galat}</Pesan>}

        <div className="mt-4 grid gap-2.5">
          {DAFTAR_SAKLAR.map((item) => {
            const nyala = form[item.kunci]
            return (
              <div
                key={item.kunci}
                className="vsf-blok flex items-center justify-between gap-4 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-bold text-tinta">{item.judul}</div>
                  <div className="mt-0.5 text-[12.5px] leading-relaxed text-abu">{item.ket}</div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={nyala}
                  aria-label={item.judul}
                  disabled={!bolehUbah || sibuk}
                  onClick={() => setDraf((s) => ({ ...s, [item.kunci]: !form[item.kunci] }))}
                  className={clsx(
                    'relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arutmin-forest disabled:cursor-not-allowed disabled:opacity-60',
                    nyala
                      ? 'border-arutmin-forest bg-arutmin-forest'
                      : 'border-slate-300 bg-slate-200/80',
                  )}
                >
                  <span
                    aria-hidden
                    className={clsx(
                      'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200',
                      nyala ? 'translate-x-6' : 'translate-x-1',
                    )}
                  />
                </button>
              </div>
            )
          })}
        </div>

        {peringatanEncerManual && (
          <div role="status" className="vsf-tone-warn mt-3 flex items-start gap-2 rounded-input px-3 py-2.5 text-[12.5px] leading-relaxed">
            <Ikon nama="peringatan" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Pengenceran menyala tetapi isi air otomatis mati — EC tinggi hanya akan jadi peringatan, alat tidak menambah air. Ini sesuai rancangan: pompa isi tidak dinyalakan alat di mode manual.
            </span>
          </div>
        )}

        {bolehUbah && (
          <div className="mt-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="vsf-btn-primary"
                disabled={sibuk}
                onClick={() => void simpan()}
              >
                {sibuk && <span className="vsf-spinner" aria-hidden />}
                {sibuk ? 'Menyimpan…' : 'Simpan pengaturan'}
              </button>
              <button
                type="button"
                className="vsf-btn-secondary"
                disabled={sibuk}
                onClick={resetForm}
              >
                Batalkan
              </button>
            </div>
            <p className="mt-2 text-[12px] text-abu">
              Geser saklarnya dulu — belum ada yang disimpan sampai tombol di atas ditekan. Alat tidak diberi tahu.
            </p>
          </div>
        )}
      </section>

      {/* Kolom Kanan: Kondisi Saat Ini + Pratinjau Dosis + Aturan yang Berlaku */}
      <div className="grid content-start gap-4 lg:col-span-5">
        <section className="vsf-card w-full min-w-0 p-4 sm:p-5" aria-label="Kondisi saat ini">
          <div className="flex items-center justify-between gap-2">
            <div className="vsf-judul-bagian">Kondisi saat ini</div>
            <StatusBadge
              tone={k?.status === 'PERINGATAN' ? 'offline' : 'online'}
              label={k?.status ?? 'NORMAL'}
            />
          </div>

          <dl className="mt-3 grid grid-cols-1 gap-2 text-[13px] sm:grid-cols-2">
            <div className="vsf-stat">
              <dt className="vsf-label">Mode isi air</dt>
              <dd className="mt-0.5 font-bold text-tinta">
                {p?.mode_isi === 'otomatis' ? 'Otomatis' : 'Manual'}
              </dd>
            </div>
            <div className="vsf-stat">
              <dt className="vsf-label">Volume</dt>
              <dd className="mt-0.5 font-bold tabular-nums text-tinta">
                {fmt(p?.volume_l)} L
              </dd>
            </div>
            <div className="vsf-stat">
              <dt className="vsf-label">Float bawah</dt>
              <dd className="mt-0.5 font-semibold text-tinta">
                {k?.float_bawah === 0 ? 'turun (air kurang)' : 'mengambang (cukup)'}
              </dd>
            </div>
            <div className="vsf-stat">
              <dt className="vsf-label">Float atas</dt>
              <dd className="mt-0.5 font-semibold text-tinta">
                {k?.float_atas === 1 ? 'mengambang (penuh)' : 'turun (belum penuh)'}
              </dd>
            </div>
            <div className="vsf-stat">
              <dt className="vsf-label">Target EC</dt>
              <dd className="mt-0.5 font-bold tabular-nums text-tinta">
                {fmt(p?.ec_setpoint)} ppm {(p?.ec_setpoint ?? 0) === 0 ? '(tidur)' : ''}
              </dd>
            </div>
            <div className="vsf-stat">
              <dt className="vsf-label">Hitungan EC</dt>
              <dd className="mt-0.5 font-bold tabular-nums text-tinta">
                {k?.hit_ec ?? 0} / {p?.maks_ec_hari ?? 10} · encer {k?.hit_encer ?? 0} / {p?.maks_encer_hari ?? 3}
              </dd>
            </div>
            <div className="vsf-stat sm:col-span-2">
              <dt className="vsf-label">Hitungan pH</dt>
              <dd className="mt-0.5 font-bold tabular-nums text-tinta">
                {k?.hit_ph ?? 0} / {p?.maks_ph_hari ?? 5}
              </dd>
            </div>
          </dl>

          {pr && (
            <div className="vsf-blok mt-3 p-3">
              <div className="text-[12.5px] font-bold text-tinta">Pratinjau dosis (bila kurang dari target)</div>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[12.5px]">
                <dt className="text-abu">EC sekarang</dt>
                <dd className="text-right font-semibold tabular-nums text-tinta">{fmt(pr.ec_sekarang)} ppm</dd>
                <dt className="text-abu">Kekurangan</dt>
                <dd className="text-right font-semibold tabular-nums text-tinta">{fmt(pr.kurang_ppm)} ppm</dd>
                <dt className="text-abu">Dosis {pr.persen_dosing}%</dt>
                <dd className="text-right font-semibold tabular-nums text-tinta">{fmt(pr.dosis_ppm)} ppm</dd>
                <dt className="text-abu">Total A + B</dt>
                <dd className="text-right font-semibold tabular-nums text-tinta">{fmt(pr.total_ml)} mL</dd>
                <dt className="text-abu">Durasi pompa A / B</dt>
                <dd className="text-right font-semibold tabular-nums text-tinta">
                  {fmt(pr.durasi_a_detik)} dtk / {fmt(pr.durasi_b_detik)} dtk
                </dd>
              </dl>
            </div>
          )}
        </section>

        <section className="vsf-card w-full min-w-0 p-4 sm:p-5" aria-label="Aturan yang berlaku">
          <div className="vsf-judul-bagian">Aturan yang berlaku</div>
          <ul className="mt-2.5 list-disc space-y-1.5 pl-5 text-[13px] leading-relaxed text-abu">
            {ATURAN_SAKLAR.map((aturan) => (
              <li key={aturan}>{aturan}</li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
