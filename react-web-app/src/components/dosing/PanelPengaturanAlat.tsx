import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/authContext'
import { useApiError, useApiList } from '../../lib/crudApi'
import { tglJam } from '../../lib/format'
import type { ParameterRow } from '../../lib/dosing'
import { hitungSirkulasi, type IotV41Params, type IotV41State } from '../../lib/iotV41'
import { Ikon } from '../Ikon'
import { Pesan, Rangka } from '../kaca/DialogKaca'

type Kunci = 'volume_l' | 'talang_jumlah' | 'talang_debit' | 'monitoring_menit' | 'jeda_ab_menit' | 'jeda_ec_menit' | 'pemeliharaan_maks_menit'

/** Field form → baris database (sumber kebenaran: konfigurasi_dosis / timing_operasi lewat PUT /iot-v41/pengaturan). */
const FIELD: ReadonlyArray<{ kunci: Kunci; label: string; param: string; min: number; max: number; step: number; bulat: boolean; info?: string }> = [
  { kunci: 'volume_l', label: 'Volume efektif penampung (L)', param: 'volume_efektif_l', min: 0, max: 50000, step: 5, bulat: true, info: 'Tanpa volume (> 0 L) alat menolak dosing.' },
  { kunci: 'talang_jumlah', label: 'Jumlah talang', param: 'jumlah_talang', min: 0, max: 500, step: 1, bulat: true },
  { kunci: 'talang_debit', label: 'Debit per talang (L/menit)', param: 'debit_per_talang_lpm', min: 0, max: 100, step: 0.1, bulat: false },
  { kunci: 'monitoring_menit', label: 'Monitoring (menit)', param: 'monitoring_menit', min: 10, max: 120, step: 1, bulat: true, info: 'Waktu larutan berputar merata sebelum dibaca ulang.' },
  { kunci: 'jeda_ab_menit', label: 'Jeda A→B (menit)', param: 'jeda_ab_menit', min: 1, max: 10, step: 1, bulat: true },
  { kunci: 'jeda_ec_menit', label: 'Jeda antar tindakan (menit)', param: 'jeda_ec_menit', min: 1, max: 240, step: 1, bulat: true },
  { kunci: 'pemeliharaan_maks_menit', label: 'Batas mode pemeliharaan (menit)', param: 'pemeliharaan_maks_menit', min: 5, max: 360, step: 5, bulat: true },
]

const LAJU: ReadonlyArray<[keyof IotV41Params, string, string]> = [
  ['laju_a', 'Pompa A', 'laju_pompa_a_mls'],
  ['laju_b', 'Pompa B', 'laju_pompa_b_mls'],
  ['laju_ph_up', 'Pompa pH up', 'laju_pompa_ph_up_mls'],
  ['laju_ph_down', 'Pompa pH down', 'laju_pompa_ph_down_mls'],
]

const angkaId = (v: number, d: number) => v.toFixed(d).replace('.', ',')

/**
 * Pengaturan Alat (bagian Data): penampung, waktu kerja, dan laju pompa yang TERSIMPAN di server.
 * Nilai yang tidak ada di database ditandai "belum diatur" (input kosong) — tidak diisi angka bawaan.
 * Batas peringatan & pengaturan dosis tidak di sini: lihat Parameter & Keamanan (satu sumber batas: Ambang Sensor).
 */
export function PanelPengaturanAlat({ iot, loading, onReload }: { iot: IotV41State | null; loading: boolean; onReload: () => void }) {
  const { role } = useAuth()
  const bolehUbah = role === 'admin'
  const handleApiError = useApiError()
  const dosis = useApiList<ParameterRow>('/konfigurasi-dosis')
  const timing = useApiList<ParameterRow>('/timing-operasi')
  const p = iot?.params
  const belum = new Set(iot?.params_belum_diatur ?? [])

  const [draf, setDraf] = useState<Partial<Record<Kunci, string>>>({})
  const [sibuk, setSibuk] = useState(false)
  const [pesan, setPesan] = useState<string | null>(null)
  const [galat, setGalat] = useState<string | null>(null)

  useEffect(() => {
    if (!pesan) return
    const id = window.setTimeout(() => setPesan(null), 4000)
    return () => window.clearTimeout(id)
  }, [pesan])

  const baris = (param: string) => [...dosis.rows, ...timing.rows].find((r) => r.param === param)
  const nilaiForm = (k: Kunci) => draf[k] ?? (p && !belum.has(k) ? String(p[k]) : '')
  const num = (k: Kunci) => Number(nilaiForm(k).replace(',', '.'))
  const sirkulasi = hitungSirkulasi(num('volume_l') || 0, num('talang_jumlah') || 0, num('talang_debit') || 0)

  async function simpan(e: React.FormEvent) {
    e.preventDefault()
    if (!bolehUbah || sibuk) return
    // Hanya field yang diubah pengguna yang dikirim: nilai yang belum diatur tidak ikut tersimpan sebagai bawaan.
    const payload: Partial<Record<Kunci, number>> = {}
    for (const f of FIELD) {
      if (draf[f.kunci] === undefined) continue
      const v = Number(String(draf[f.kunci]).replace(',', '.'))
      if (!Number.isFinite(v) || draf[f.kunci]?.trim() === '' || v < f.min || v > f.max || (f.bulat && !Number.isInteger(v))) {
        setGalat(`${f.label}: isi angka ${f.bulat ? 'bulat ' : ''}${f.min}–${f.max}.`)
        return
      }
      payload[f.kunci] = v
    }
    if (!Object.keys(payload).length) return setGalat('Belum ada nilai yang diubah.')
    setSibuk(true)
    setGalat(null)
    setPesan(null)
    try {
      await api.put('/iot-v41/pengaturan', payload)
      setDraf({})
      setPesan('Pengaturan tersimpan di server.')
      onReload()
      dosis.reload()
      timing.reload()
    } catch (err) {
      setGalat(handleApiError(err).message)
    } finally {
      setSibuk(false)
    }
  }

  if (!iot) {
    return (
      <section className="vsf-card w-full min-w-0 p-4 sm:p-5" aria-label="Pengaturan Alat">
        {loading ? <Rangka /> : <Pesan jenis="galat">Pengaturan alat belum bisa dimuat dari server.</Pesan>}
      </section>
    )
  }

  return (
    <form onSubmit={(e) => void simpan(e)} className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      {(pesan || galat) && (
        <div className="lg:col-span-12">
          {pesan && <Pesan jenis="ok">{pesan}</Pesan>}
          {galat && <Pesan jenis="galat" onTutup={() => setGalat(null)}>{galat}</Pesan>}
        </div>
      )}

      <section className="vsf-card w-full min-w-0 p-4 sm:p-5 lg:col-span-7" aria-label="Penampung dan waktu kerja">
        <div className="vsf-judul-bagian">Penampung dan waktu kerja</div>
        <p className="mt-0.5 text-[13px] text-abu">Sumber: tabel konfigurasi_dosis &amp; timing_operasi di server.</p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {FIELD.map((f) => {
            const r = baris(f.param)
            return (
              <label key={f.kunci} className="block">
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="vsf-label vsf-label-tinta">{f.label}</span>
                  {belum.has(f.kunci) && <span className="vsf-chip-nilai is-kosong">belum diatur</span>}
                </span>
                <input
                  type="number"
                  min={f.min}
                  max={f.max}
                  step={f.step}
                  disabled={!bolehUbah}
                  placeholder={belum.has(f.kunci) ? 'belum diatur' : undefined}
                  className="vsf-input mt-1 w-full"
                  value={nilaiForm(f.kunci)}
                  onChange={(e) => setDraf((s) => ({ ...s, [f.kunci]: e.target.value }))}
                />
                <span className="mt-1 block text-[11.5px] text-abu">
                  {f.info ? `${f.info} ` : ''}
                  {r?.diubah_pada ? `Diubah ${tglJam(r.diubah_pada)}${r.sumber ? ` · ${r.sumber}` : ''}.` : 'Belum pernah diubah dari web.'}
                </span>
              </label>
            )
          })}
          <div className="block">
            <span className="vsf-label vsf-label-tinta">Satu putaran larutan (dihitung)</span>
            <input type="text" disabled className="vsf-input mt-1 w-full opacity-80" aria-label="Satu putaran larutan"
              value={sirkulasi.putaran_menit > 0 ? `${angkaId(sirkulasi.putaran_menit, 1)} menit` : '—'} />
            <span className="mt-1 block text-[11.5px] text-abu">
              Volume ÷ (talang × debit). {sirkulasi.saran_monitoring_menit > 0 && <>Saran monitoring: <b className="text-tinta">{sirkulasi.saran_monitoring_menit} menit</b>{bolehUbah && <> — <button type="button" className="font-semibold text-arutmin-forest underline" onClick={() => setDraf((s) => ({ ...s, monitoring_menit: String(sirkulasi.saran_monitoring_menit) }))}>pakai</button></>}</>}
            </span>
          </div>
        </div>
      </section>

      <section className="vsf-card w-full min-w-0 p-4 sm:p-5 lg:col-span-5" aria-label="Laju pompa">
        <div className="vsf-judul-bagian">Laju pompa (hasil kalibrasi)</div>
        <dl className="mt-2.5 grid grid-cols-2 gap-2 text-[13px]">
          {LAJU.map(([k, nama, param]) => {
            const r = baris(param)
            return (
              <div key={k} className="vsf-stat">
                <dt className="vsf-label">{nama}</dt>
                <dd className="mt-0.5 font-bold tabular-nums text-tinta">
                  {belum.has(k) ? 'Belum dikalibrasi' : `${angkaId(Number(p?.[k] ?? 0), 2)} mL/detik`}
                </dd>
                {r?.diubah_pada && <dd className="text-[11.5px] text-abu">{tglJam(r.diubah_pada)}</dd>}
              </div>
            )
          })}
        </dl>
        <p className="mt-2 text-[12px] text-abu">
          Diubah hanya lewat <Link to="/kalibrasi" className="font-semibold text-arutmin-forest underline">Kalibrasi</Link>. Batas peringatan &amp; dosis ada di{' '}
          <Link to="/parameter" className="font-semibold text-arutmin-forest underline">Parameter &amp; Keamanan</Link>.
        </p>
      </section>

      {bolehUbah && (
        <section className="vsf-card flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5 lg:col-span-12">
          <div className="flex flex-wrap items-center gap-2">
            <button type="submit" className="vsf-btn-primary" disabled={sibuk}>
              {sibuk && <span className="vsf-spinner" aria-hidden />}
              {sibuk ? 'Menyimpan…' : 'Simpan pengaturan'}
            </button>
            <button type="button" className="vsf-btn-secondary" disabled={sibuk} onClick={() => { setDraf({}); setGalat(null) }}>
              Batalkan
            </button>
          </div>
          <div className="flex items-center gap-1.5 text-[12px] text-abu">
            <Ikon nama="info" className="h-4 w-4" />
            <span>Hanya nilai yang diubah yang dikirim. Tersimpan di server; ESP32 memakai jadwalnya sendiri (lihat Parameter &amp; Keamanan).</span>
          </div>
        </section>
      )}
    </form>
  )
}
