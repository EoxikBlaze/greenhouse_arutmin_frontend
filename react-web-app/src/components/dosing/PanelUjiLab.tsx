import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/authContext'
import { useApiError } from '../../lib/crudApi'
import { tglPendek } from '../../lib/format'
import {
  hitungUjiLabEc,
  hitungUjiLabPh,
  simpanCacheLokal,
  type IotV41State,
} from '../../lib/iotV41'
import { Pesan, Rangka } from '../kaca/DialogKaca'

const fmt = (v: number | null | undefined, d = 2): string => {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—'
  return v.toFixed(d).replace('.', ',')
}

/**
 * Panel Uji Lab (adaptasi ujilab.php Perancangan Sistem IoT Hidroponik 1 Penampung v4.1):
 *  - Uji lab EC: ppm awal, ppm akhir, Volume air (L), A (mL), B (mL) -> kenaikan ppm per mL
 *  - Uji lab pH: Jenis larutan (pH up / pH down), Volume air (L), Perubahan pH, Larutan dipakai (mL) -> mL/pH/L
 *  - Angka yang sedang dipakai alat (ppm per mL, pH up, pH down, Volume penampung, Laju pompa A / B)
 *  - Arsip hasil uji lab
 */
export function PanelUjiLab({
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

  // Form Uji Lab EC
  const [awal, setAwal] = useState('100')
  const [akhir, setAkhir] = useState('1000')
  const [volEc, setVolEc] = useState('1')
  const [mlA, setMlA] = useState('5')
  const [mlB, setMlB] = useState('5')

  // Form Uji Lab pH
  const [arah, setArah] = useState<'up' | 'down'>('up')
  const [volPh, setVolPh] = useState('1')
  const [deltaPh, setDeltaPh] = useState('0.5')
  const [mlPh, setMlPh] = useState('0.5')

  const [sibuk, setSibuk] = useState<null | 'ec' | 'ph'>(null)
  const [pesan, setPesan] = useState<string | null>(null)
  const [galat, setGalat] = useState<string | null>(null)

  useEffect(() => {
    if (!pesan) return
    const id = window.setTimeout(() => setPesan(null), 4000)
    return () => window.clearTimeout(id)
  }, [pesan])

  const pratinjauEc = hitungUjiLabEc(
    Number(awal.replace(',', '.')),
    Number(akhir.replace(',', '.')),
    Number(volEc.replace(',', '.')),
    Number(mlA.replace(',', '.')),
    Number(mlB.replace(',', '.')),
  )

  const pratinjauPh = hitungUjiLabPh(
    Number(volPh.replace(',', '.')),
    Number(deltaPh.replace(',', '.')),
    Number(mlPh.replace(',', '.')),
  )

  async function simpanEc(e: React.FormEvent) {
    e.preventDefault()
    if (!bolehUbah || sibuk) return
    if (pratinjauEc === null) {
      setGalat('Bacaan ppm akhir harus lebih tinggi dari ppm awal, dan volume serta mL harus > 0.')
      return
    }
    setSibuk('ec')
    setGalat(null)
    setPesan(null)
    try {
      await api.post('/iot-v41/ujilab', {
        aksi: 'ec',
        awal: Number(awal.replace(',', '.')),
        akhir: Number(akhir.replace(',', '.')),
        volume: Number(volEc.replace(',', '.')),
        ml_a: Number(mlA.replace(',', '.')),
        ml_b: Number(mlB.replace(',', '.')),
      })
      simpanCacheLokal({ ppm_per_ml: pratinjauEc })
      setPesan(`ppm per mL = ${fmt(pratinjauEc, 2)} tersimpan di alat dan arsip web.`)
      onReload()
    } catch (err) {
      const f = handleApiError(err)
      if (f.status === 404) {
        simpanCacheLokal({ ppm_per_ml: pratinjauEc })
        setPesan(`ppm per mL = ${fmt(pratinjauEc, 2)} disimpan pada konfigurasi lokal.`)
        onReload()
      } else {
        setGalat(f.message)
      }
    } finally {
      setSibuk(null)
    }
  }

  async function simpanPh(e: React.FormEvent) {
    e.preventDefault()
    if (!bolehUbah || sibuk) return
    if (pratinjauPh === null) {
      setGalat('Isi perubahan pH dan jumlah mL lebih dari nol.')
      return
    }
    setSibuk('ph')
    setGalat(null)
    setPesan(null)
    try {
      await api.post('/iot-v41/ujilab', {
        aksi: 'ph',
        arah,
        volume: Number(volPh.replace(',', '.')),
        delta_ph: Number(deltaPh.replace(',', '.')),
        ml: Number(mlPh.replace(',', '.')),
      })
      simpanCacheLokal(arah === 'up' ? { ph_up_ml: pratinjauPh } : { ph_down_ml: pratinjauPh })
      setPesan(`pH ${arah} = ${fmt(pratinjauPh, 3)} mL per 1 pH per 1 L tersimpan.`)
      onReload()
    } catch (err) {
      const f = handleApiError(err)
      if (f.status === 404) {
        simpanCacheLokal(arah === 'up' ? { ph_up_ml: pratinjauPh } : { ph_down_ml: pratinjauPh })
        setPesan(`pH ${arah} = ${fmt(pratinjauPh, 3)} mL/pH/L disimpan pada konfigurasi lokal.`)
        onReload()
      } else {
        setGalat(f.message)
      }
    } finally {
      setSibuk(null)
    }
  }

  if (loading && !iot) {
    return (
      <section className="vsf-card w-full min-w-0 p-4 sm:p-5" aria-label="Uji Lab">
        <Rangka />
      </section>
    )
  }

  const arsip = iot?.arsip_ujilab ?? []

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      {(pesan || galat) && (
        <div className="lg:col-span-12">
          {pesan && <Pesan jenis="ok">{pesan}</Pesan>}
          {galat && <Pesan jenis="galat" onTutup={() => setGalat(null)}>{galat}</Pesan>}
        </div>
      )}

      {/* Kartu 1: Uji Lab EC */}
      <section className="vsf-card w-full min-w-0 p-4 sm:p-5 lg:col-span-6" aria-label="Uji lab EC">
        <div className="vsf-judul-bagian">Uji lab EC</div>
        <p className="mt-0.5 text-[13px] text-abu">
          Air 1 liter, ukur ppm awal, tambah A lalu jeda lalu B, ukur ppm akhir.
        </p>

        <form onSubmit={(e) => void simpanEc(e)} className="mt-3 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="vsf-label vsf-label-tinta">ppm awal</span>
              <input
                type="number"
                step={1}
                disabled={!bolehUbah}
                className="vsf-input mt-1 w-full"
                value={awal}
                onChange={(e) => setAwal(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="vsf-label vsf-label-tinta">ppm akhir</span>
              <input
                type="number"
                step={1}
                disabled={!bolehUbah}
                className="vsf-input mt-1 w-full"
                value={akhir}
                onChange={(e) => setAkhir(e.target.value)}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="vsf-label vsf-label-tinta">Volume air (L)</span>
              <input
                type="number"
                step={0.1}
                min={0.1}
                disabled={!bolehUbah}
                className="vsf-input mt-1 w-full"
                value={volEc}
                onChange={(e) => setVolEc(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="vsf-label vsf-label-tinta">A (mL)</span>
              <input
                type="number"
                step={0.1}
                min={0.1}
                disabled={!bolehUbah}
                className="vsf-input mt-1 w-full"
                value={mlA}
                onChange={(e) => setMlA(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="vsf-label vsf-label-tinta">B (mL)</span>
              <input
                type="number"
                step={0.1}
                min={0.1}
                disabled={!bolehUbah}
                className="vsf-input mt-1 w-full"
                value={mlB}
                onChange={(e) => setMlB(e.target.value)}
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            {bolehUbah && (
              <button type="submit" className="vsf-btn-primary" disabled={sibuk !== null}>
                {sibuk === 'ec' && <span className="vsf-spinner" aria-hidden />}
                {sibuk === 'ec' ? 'Menyimpan…' : 'Hitung & simpan'}
              </button>
            )}
            {pratinjauEc !== null && (
              <span className="vsf-chip-nilai is-normal">
                Hasil: {fmt(pratinjauEc, 2)} ppm/mL
              </span>
            )}
          </div>

          <p className="text-[12px] leading-relaxed text-abu">
            Yang disimpan adalah <b className="text-tinta">kenaikan per mL</b>: (akhir − awal) ÷ (A + B). Contoh di atas: (1000 − 100) ÷ 10 = 90 ppm/mL.
          </p>
        </form>
      </section>

      {/* Kartu 2: Uji Lab pH */}
      <section className="vsf-card w-full min-w-0 p-4 sm:p-5 lg:col-span-6" aria-label="Uji lab pH">
        <div className="vsf-judul-bagian">Uji lab pH</div>
        <p className="mt-0.5 text-[13px] text-abu">
          Satu angka untuk pH up, satu angka terpisah untuk pH down.
        </p>

        <form onSubmit={(e) => void simpanPh(e)} className="mt-3 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="vsf-label vsf-label-tinta">Jenis larutan</span>
              <select
                disabled={!bolehUbah}
                className="vsf-input mt-1 w-full"
                value={arah}
                onChange={(e) => setArah(e.target.value === 'down' ? 'down' : 'up')}
              >
                <option value="up">pH up</option>
                <option value="down">pH down</option>
              </select>
            </label>
            <label className="block">
              <span className="vsf-label vsf-label-tinta">Volume air (L)</span>
              <input
                type="number"
                step={0.1}
                min={0.1}
                disabled={!bolehUbah}
                className="vsf-input mt-1 w-full"
                value={volPh}
                onChange={(e) => setVolPh(e.target.value)}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="vsf-label vsf-label-tinta">Perubahan pH yang terjadi</span>
              <input
                type="number"
                step={0.01}
                min={0.01}
                disabled={!bolehUbah}
                className="vsf-input mt-1 w-full"
                value={deltaPh}
                onChange={(e) => setDeltaPh(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="vsf-label vsf-label-tinta">Larutan yang dipakai (mL)</span>
              <input
                type="number"
                step={0.01}
                min={0.01}
                disabled={!bolehUbah}
                className="vsf-input mt-1 w-full"
                value={mlPh}
                onChange={(e) => setMlPh(e.target.value)}
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            {bolehUbah && (
              <button type="submit" className="vsf-btn-primary" disabled={sibuk !== null}>
                {sibuk === 'ph' && <span className="vsf-spinner" aria-hidden />}
                {sibuk === 'ph' ? 'Menyimpan…' : 'Hitung & simpan'}
              </button>
            )}
            {pratinjauPh !== null && (
              <span className="vsf-chip-nilai is-normal">
                Hasil: {fmt(pratinjauPh, 3)} mL/pH/L
              </span>
            )}
          </div>

          <p className="text-[12px] leading-relaxed text-abu">
            Hasilnya mL per 1 satuan pH per 1 liter: mL ÷ (ΔpH × volume). Nilai ini yang dipakai menghitung takaran koreksi pH.
          </p>
        </form>
      </section>

      {/* Kartu 3: Angka yang Sedang Dipakai Alat */}
      <section className="vsf-card w-full min-w-0 p-4 sm:p-5 lg:col-span-6" aria-label="Angka yang sedang dipakai alat">
        <div className="vsf-judul-bagian">Angka yang sedang dipakai alat</div>
        <dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="vsf-stat">
            <dt className="vsf-label">ppm per mL</dt>
            <dd className="mt-0.5 text-[18px] font-bold tabular-nums text-tinta">{fmt(p?.ppm_per_ml, 2)}</dd>
          </div>
          <div className="vsf-stat">
            <dt className="vsf-label">Volume penampung</dt>
            <dd className="mt-0.5 text-[18px] font-bold tabular-nums text-tinta">{p?.volume_l ?? 0} L</dd>
          </div>
          <div className="vsf-stat">
            <dt className="vsf-label">pH up (mL/pH/L)</dt>
            <dd className="mt-0.5 text-[18px] font-bold tabular-nums text-tinta">{fmt(p?.ph_up_ml, 3)}</dd>
          </div>
          <div className="vsf-stat">
            <dt className="vsf-label">pH down (mL/pH/L)</dt>
            <dd className="mt-0.5 text-[18px] font-bold tabular-nums text-tinta">{fmt(p?.ph_down_ml, 3)}</dd>
          </div>
          <div className="vsf-stat sm:col-span-2">
            <dt className="vsf-label">Laju pompa A / B</dt>
            <dd className="mt-0.5 text-[16px] font-bold tabular-nums text-tinta">
              {fmt(p?.laju_a, 2)} / {fmt(p?.laju_b, 2)} mL/detik
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-[12px] leading-relaxed text-abu">
          Sebelum uji lab pH selesai, matikan saklar pH up/down atau kecilkan batas mL per koreksi. Angka bawaan bukan hasil pengukuran.
        </p>
      </section>

      {/* Kartu 4: Arsip Hasil Uji Lab */}
      <section className="vsf-card w-full min-w-0 p-4 sm:p-5 lg:col-span-6" aria-label="Arsip hasil uji lab">
        <div className="vsf-judul-bagian">Arsip hasil uji lab</div>
        {arsip.length === 0 ? (
          <div className="vsf-blok mt-3 px-4 py-6 text-center text-[13px] text-abu">
            Belum ada hasil uji lab.
          </div>
        ) : (
          <div className="vsf-daftar mt-3">
            {arsip.map((a) => (
              <div
                key={String(a.id)}
                className="vsf-param"
                style={{ ['--kolom' as string]: '100px 90px minmax(0,1fr)' }}
              >
                <div className="vsf-param-sel font-mono text-[12.5px]">{tglPendek(a.dilakukan_pada)}</div>
                <div className="vsf-param-sel">
                  <span className="vsf-chip-nilai is-normal">
                    {a.sensor === 'ec' ? 'ujilab_ec' : 'ujilab_ph'}
                  </span>
                </div>
                <div className="vsf-param-sel text-[12.5px] text-tinta">{a.catatan ?? '—'}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

