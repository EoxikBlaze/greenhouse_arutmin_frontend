import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/authContext'
import { useApiError } from '../../lib/crudApi'
import {
  hitungBatasMlPh,
  hitungSirkulasi,
  simpanCacheLokal,
  type IotV41State,
} from '../../lib/iotV41'
import { Ikon } from '../Ikon'
import { Pesan, Rangka } from '../kaca/DialogKaca'

const fmt = (v: number | null | undefined, d = 2): string => {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—'
  return v.toFixed(d).replace('.', ',')
}

/**
 * Panel Pengaturan Alat (adaptasi pengaturan.php Perancangan Sistem IoT Hidroponik 1 Penampung v4.1):
 *  - Penampung dan meja: Volume efektif (L), Jumlah talang, Debit per talang (L/menit), Satu putaran larutan (otomatis)
 *  - Waktu kerja: Monitoring (menit) + saran otomatis (2 × T_putar), Jeda A→B (menit), Jeda antar tindakan (menit)
 *  - Dosis dan batas aman: Persen dosing (%), Maksimum per dosing (ppm), Batas aman EC bawah/atas, Batas pH bawah/atas,
 *    Batas mL per koreksi pH (0 = otomatis 0,2 × volume), Batas pemeliharaan (menit)
 *  - Laju pompa (hasil kalibrasi, baca saja + tautan ke Kalibrasi)
 */
export function PanelPengaturanAlat({
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

  const [draf, setDraf] = useState<Partial<{
    volume_l: string
    talang_jumlah: string
    talang_debit: string
    monitoring_menit: string
    jeda_ab_menit: string
    jeda_ec_menit: string
    persen_dosing: string
    max_ppm_dosing: string
    batas_ec_bawah: string
    batas_ec_atas: string
    batas_ph_bawah: string
    batas_ph_atas: string
    ph_maks_ml: string
    pemeliharaan_maks_menit: string
  }>>({})
  const [sibuk, setSibuk] = useState(false)
  const [pesan, setPesan] = useState<string | null>(null)
  const [galat, setGalat] = useState<string | null>(null)

  const f = {
    volume_l: draf.volume_l ?? String(p?.volume_l ?? 200),
    talang_jumlah: draf.talang_jumlah ?? String(p?.talang_jumlah ?? 5),
    talang_debit: draf.talang_debit ?? Number(p?.talang_debit ?? 1).toFixed(2),
    monitoring_menit: draf.monitoring_menit ?? String(p?.monitoring_menit ?? 45),
    jeda_ab_menit: draf.jeda_ab_menit ?? String(p?.jeda_ab_menit ?? 5),
    jeda_ec_menit: draf.jeda_ec_menit ?? String(p?.jeda_ec_menit ?? 20),
    persen_dosing: draf.persen_dosing ?? String(p?.persen_dosing ?? 65),
    max_ppm_dosing: draf.max_ppm_dosing ?? String(p?.max_ppm_dosing ?? 300),
    batas_ec_bawah: draf.batas_ec_bawah ?? String(p?.batas_ec_bawah ?? 900),
    batas_ec_atas: draf.batas_ec_atas ?? String(p?.batas_ec_atas ?? 1500),
    batas_ph_bawah: draf.batas_ph_bawah ?? Number(p?.batas_ph_bawah ?? 5.0).toFixed(1),
    batas_ph_atas: draf.batas_ph_atas ?? Number(p?.batas_ph_atas ?? 7.0).toFixed(1),
    ph_maks_ml: draf.ph_maks_ml ?? String(p?.ph_maks_ml ?? 0),
    pemeliharaan_maks_menit: draf.pemeliharaan_maks_menit ?? String(p?.pemeliharaan_maks_menit ?? 120),
  }

  useEffect(() => {
    if (!pesan) return
    const id = window.setTimeout(() => setPesan(null), 4000)
    return () => window.clearTimeout(id)
  }, [pesan])

  const ubah = (k: keyof typeof f) => (v: string) => setDraf((s) => ({ ...s, [k]: v }))

  const volNum = Math.max(0, Number(f.volume_l.replace(',', '.')) || 0)
  const talangNum = Math.max(0, Number(f.talang_jumlah.replace(',', '.')) || 0)
  const debitNum = Math.max(0, Number(f.talang_debit.replace(',', '.')) || 0)
  const sirkulasi = hitungSirkulasi(volNum, talangNum, debitNum)
  const monNum = Math.round(Number(f.monitoring_menit.replace(',', '.')) || 0)
  const phMaksNum = Math.max(0, Math.round(Number(f.ph_maks_ml.replace(',', '.')) || 0))
  const batasOtomatisPh = hitungBatasMlPh(0, volNum)

  function resetForm() {
    setDraf({})
    setGalat(null)
  }

  async function simpan(e: React.FormEvent) {
    e.preventDefault()
    if (!bolehUbah || sibuk) return
    setSibuk(true)
    setGalat(null)
    setPesan(null)

    const payload = {
      volume_l: Math.round(volNum),
      talang_jumlah: Math.round(talangNum),
      talang_debit: debitNum,
      monitoring_menit: Math.max(10, Math.min(120, monNum || 45)),
      jeda_ab_menit: Math.max(1, Math.min(10, Math.round(Number(f.jeda_ab_menit) || 5))),
      jeda_ec_menit: Math.max(1, Math.min(240, Math.round(Number(f.jeda_ec_menit) || 20))),
      persen_dosing: Math.max(50, Math.min(90, Math.round(Number(f.persen_dosing) || 65))),
      max_ppm_dosing: Math.max(50, Math.min(300, Math.round(Number(f.max_ppm_dosing) || 300))),
      batas_ec_bawah: Math.max(0, Math.round(Number(f.batas_ec_bawah) || 0)),
      batas_ec_atas: Math.max(0, Math.round(Number(f.batas_ec_atas) || 0)),
      batas_ph_bawah: Number(f.batas_ph_bawah.replace(',', '.')) || 5.0,
      batas_ph_atas: Number(f.batas_ph_atas.replace(',', '.')) || 7.0,
      ph_maks_ml: Math.max(0, Math.min(200, phMaksNum)),
      pemeliharaan_maks_menit: Math.max(5, Math.min(360, Math.round(Number(f.pemeliharaan_maks_menit) || 120))),
    }

    try {
      await api.put('/iot-v41/pengaturan', payload)
      simpanCacheLokal(payload)
      setDraf({})
      setPesan('Pengaturan alat disimpan di server. Belum dikirim ke alat.')
      onReload()
    } catch (err) {
      const g = handleApiError(err)
      if (g.status === 404) {
        simpanCacheLokal(payload)
        setDraf({})
        setPesan('Pengaturan alat disimpan pada konfigurasi lokal.')
        onReload()
      } else {
        setGalat(g.message)
      }
    } finally {
      setSibuk(false)
    }
  }

  if (loading && !iot) {
    return (
      <section className="vsf-card w-full min-w-0 p-4 sm:p-5" aria-label="Pengaturan Alat">
        <Rangka />
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

      {/* Kolom Kiri: Penampung dan Meja + Waktu Kerja */}
      <section className="vsf-card w-full min-w-0 p-4 sm:p-5 lg:col-span-6" aria-label="Penampung, meja, dan waktu kerja">
        <div className="vsf-judul-bagian">Penampung dan meja</div>
        <p className="mt-0.5 text-[13px] text-abu">Tanpa volume efektif (&gt; 0 L), alat menolak dosing.</p>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="vsf-label vsf-label-tinta">Volume efektif penampung (L)</span>
            <input
              type="number"
              min={0}
              step={5}
              disabled={!bolehUbah}
              className="vsf-input mt-1 w-full"
              value={f.volume_l}
              onChange={(e) => ubah('volume_l')(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="vsf-label vsf-label-tinta">Jumlah talang</span>
            <input
              type="number"
              min={0}
              disabled={!bolehUbah}
              className="vsf-input mt-1 w-full"
              value={f.talang_jumlah}
              onChange={(e) => ubah('talang_jumlah')(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="vsf-label vsf-label-tinta">Debit per talang (L/menit)</span>
            <input
              type="number"
              min={0}
              step={0.1}
              disabled={!bolehUbah}
              className="vsf-input mt-1 w-full"
              value={f.talang_debit}
              onChange={(e) => ubah('talang_debit')(e.target.value)}
            />
          </label>
          <div className="block">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="vsf-label vsf-label-tinta">Satu putaran larutan</span>
              <span className="vsf-chip-nilai is-normal">otomatis · tidak bisa diedit</span>
            </div>
            <input
              type="text"
              disabled
              className="vsf-input mt-1 w-full opacity-80"
              value={sirkulasi.putaran_menit > 0 ? `${fmt(sirkulasi.putaran_menit, 1)} menit` : '—'}
              aria-label="Satu putaran larutan"
            />
            <div className="mt-1 text-[11.5px] leading-relaxed text-abu">
              Dihitung dari volume ÷ (talang × debit). Ini patokan, bukan angka yang dikirim ke alat.
            </div>
          </div>
        </div>

        <hr className="my-4 border-garis" />

        <div className="vsf-judul-bagian">Waktu kerja</div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="block sm:col-span-1">
            <div className="flex flex-wrap items-center gap-1">
              <label htmlFor="vsf-monitoring-menit" className="vsf-label vsf-label-tinta">
                Monitoring (menit)
              </label>
              <span className="vsf-chip-nilai is-kosong">saran otomatis</span>
            </div>
            <input
              id="vsf-monitoring-menit"
              type="number"
              min={10}
              max={120}
              disabled={!bolehUbah}
              className="vsf-input mt-1 w-full"
              value={f.monitoring_menit}
              onChange={(e) => ubah('monitoring_menit')(e.target.value)}
            />
            <div className="mt-1.5 text-[11.5px] leading-relaxed text-abu">
              {sirkulasi.saran_monitoring_menit > 0 ? (
                <>
                  Saran dari putaran (2 × {fmt(sirkulasi.putaran_menit, 1)} mnt):{' '}
                  <b className="text-tinta">{sirkulasi.saran_monitoring_menit} menit</b>
                  {bolehUbah && (
                    <>
                      {' — '}
                      <button
                        type="button"
                        className="font-semibold text-arutmin-forest underline"
                        onClick={() => ubah('monitoring_menit')(String(sirkulasi.saran_monitoring_menit))}
                      >
                        pakai
                      </button>
                    </>
                  )}{' '}
                  <span className="vsf-chip-nilai is-normal">
                    {monNum === sirkulasi.saran_monitoring_menit ? 'mengikuti saran' : 'diubah manual'}
                  </span>
                </>
              ) : (
                'Isi volume, talang, dan debit dulu supaya saran muncul otomatis.'
              )}
            </div>
          </div>

          <label className="block">
            <span className="vsf-label vsf-label-tinta">Jeda A→B (menit)</span>
            <input
              type="number"
              min={1}
              max={10}
              disabled={!bolehUbah}
              className="vsf-input mt-1 w-full"
              value={f.jeda_ab_menit}
              onChange={(e) => ubah('jeda_ab_menit')(e.target.value)}
            />
            <span className="mt-1 block text-[11.5px] text-abu">Rentang 1–10 menit (bawaan 5 menit).</span>
          </label>

          <label className="block">
            <span className="vsf-label vsf-label-tinta">Jeda antar tindakan (menit)</span>
            <input
              type="number"
              min={1}
              max={240}
              disabled={!bolehUbah}
              className="vsf-input mt-1 w-full"
              value={f.jeda_ec_menit}
              onChange={(e) => ubah('jeda_ec_menit')(e.target.value)}
            />
            <span className="mt-1 block text-[11.5px] text-abu">Masa tenang setelah koreksi (bawaan 20 menit).</span>
          </label>
        </div>
      </section>

      {/* Kolom Kanan: Dosis dan Batas Aman + Laju Pompa */}
      <section className="vsf-card w-full min-w-0 p-4 sm:p-5 lg:col-span-6" aria-label="Dosis, batas aman, dan laju pompa">
        <div className="vsf-judul-bagian">Dosis dan batas aman</div>
        <p className="mt-0.5 text-[13px] text-abu">Batas aman menyesuaikan tanaman yang sedang ditanam.</p>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="vsf-label vsf-label-tinta">Persen dosing (%)</span>
            <input
              type="number"
              min={50}
              max={90}
              disabled={!bolehUbah}
              className="vsf-input mt-1 w-full"
              value={f.persen_dosing}
              onChange={(e) => ubah('persen_dosing')(e.target.value)}
            />
            <span className="mt-1 block text-[11.5px] text-abu">65% selama uji 3 hari; naikkan bila selisih nyata &lt; 5%.</span>
          </label>

          <label className="block">
            <span className="vsf-label vsf-label-tinta">Maksimum per dosing (ppm)</span>
            <input
              type="number"
              min={50}
              max={300}
              disabled={!bolehUbah}
              className="vsf-input mt-1 w-full"
              value={f.max_ppm_dosing}
              onChange={(e) => ubah('max_ppm_dosing')(e.target.value)}
            />
            <span className="mt-1 block text-[11.5px] text-abu">Batas keras per suntikan (50–300 ppm).</span>
          </label>

          <label className="block">
            <span className="vsf-label vsf-label-tinta">Batas aman EC bawah (ppm)</span>
            <input
              type="number"
              min={0}
              step={10}
              disabled={!bolehUbah}
              className="vsf-input mt-1 w-full"
              value={f.batas_ec_bawah}
              onChange={(e) => ubah('batas_ec_bawah')(e.target.value)}
            />
            <span className="mt-1 block text-[11.5px] text-abu">Kosongkan 0 saat tidur (air bersih tidak memicu alarm).</span>
          </label>

          <label className="block">
            <span className="vsf-label vsf-label-tinta">Batas aman EC atas (ppm)</span>
            <input
              type="number"
              min={0}
              step={10}
              disabled={!bolehUbah}
              className="vsf-input mt-1 w-full"
              value={f.batas_ec_atas}
              onChange={(e) => ubah('batas_ec_atas')(e.target.value)}
            />
          </label>

          <label className="block">
            <span className="vsf-label vsf-label-tinta">Batas pH bawah</span>
            <input
              type="number"
              min={3}
              max={9}
              step={0.1}
              disabled={!bolehUbah}
              className="vsf-input mt-1 w-full"
              value={f.batas_ph_bawah}
              onChange={(e) => ubah('batas_ph_bawah')(e.target.value)}
            />
          </label>

          <label className="block">
            <span className="vsf-label vsf-label-tinta">Batas pH atas</span>
            <input
              type="number"
              min={3}
              max={9}
              step={0.1}
              disabled={!bolehUbah}
              className="vsf-input mt-1 w-full"
              value={f.batas_ph_atas}
              onChange={(e) => ubah('batas_ph_atas')(e.target.value)}
            />
          </label>

          <label className="block">
            <span className="vsf-label vsf-label-tinta">Batas mL per koreksi pH</span>
            <input
              type="number"
              min={0}
              max={200}
              disabled={!bolehUbah}
              className="vsf-input mt-1 w-full"
              value={f.ph_maks_ml}
              onChange={(e) => ubah('ph_maks_ml')(e.target.value)}
            />
            <span className="mt-1 block text-[11.5px] leading-relaxed text-abu">
              Isi 0 = otomatis dari volume (0,2 × volume = <b className="text-tinta">{batasOtomatisPh} mL</b>). Batas 10 mL terlalu kecil untuk tandon besar.
            </span>
          </label>

          <label className="block">
            <span className="vsf-label vsf-label-tinta">Batas pemeliharaan (menit)</span>
            <input
              type="number"
              min={5}
              max={360}
              disabled={!bolehUbah}
              className="vsf-input mt-1 w-full"
              value={f.pemeliharaan_maks_menit}
              onChange={(e) => ubah('pemeliharaan_maks_menit')(e.target.value)}
            />
            <span className="mt-1 block text-[11.5px] leading-relaxed text-abu">
              Setelah lewat batas ini alat kembali bekerja sendiri. Maksimal 360 menit untuk ganti air.
            </span>
          </label>
        </div>

        <hr className="my-4 border-garis" />

        <div className="vsf-judul-bagian">Laju pompa (hasil kalibrasi)</div>
        <dl className="mt-2.5 grid grid-cols-2 gap-2 text-[13px] sm:grid-cols-4">
          {[
            ['Pompa A', p?.laju_a],
            ['Pompa B', p?.laju_b],
            ['Pompa pH up', p?.laju_ph_up],
            ['Pompa pH down', p?.laju_ph_down],
          ].map(([nama, laju]) => (
            <div key={String(nama)} className="vsf-stat">
              <dt className="vsf-label">{nama}</dt>
              <dd className="mt-0.5 font-bold tabular-nums text-tinta">{fmt(laju as number, 2)} mL/detik</dd>
            </div>
          ))}
        </dl>
        <p className="mt-2 text-[12px] text-abu">
          Angka ini hanya bisa diubah lewat{' '}
          <Link to="/kalibrasi" className="font-semibold text-arutmin-forest underline">
            halaman Kalibrasi
          </Link>
          , supaya tidak ada dua tempat yang saling menimpa.
        </p>
      </section>

      {bolehUbah && (
        <section className="vsf-card flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5 lg:col-span-12">
          <div className="flex flex-wrap items-center gap-2">
            <button type="submit" className="vsf-btn-primary" disabled={sibuk}>
              {sibuk && <span className="vsf-spinner" aria-hidden />}
              {sibuk ? 'Menyimpan…' : 'Simpan di server'}
            </button>
            <button type="button" className="vsf-btn-secondary" disabled={sibuk} onClick={resetForm}>
              Batalkan
            </button>
          </div>
          <div className="flex items-center gap-1.5 text-[12px] text-abu">
            <Ikon nama="info" className="h-4 w-4" />
            <span>Perubahan langsung memperbarui parameter operasi sistem.</span>
          </div>
        </section>
      )}
    </form>
  )
}
