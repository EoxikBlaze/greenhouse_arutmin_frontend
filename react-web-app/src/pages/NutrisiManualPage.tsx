import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/authContext'
import { useApiError } from '../lib/crudApi'
import { tglJam } from '../lib/format'
import { PageHeader } from '../components/PageHeader'
import { Pesan } from '../components/kaca/DialogKaca'
import {
  DAFTAR_ZAT,
  labelStatusManual,
  periksaIsian,
  type BatasManual,
  type KejadianManual,
  type ZatManual,
} from '../lib/nutrisiManual'

/**
 * Nutrisi Manual: pilih zat (Nutrisi A/B, pH Up/Down), isi volume ATAU durasi, tekan Dosing.
 * Tidak dipengaruhi saklar (override manual). Fail-safe + LOCK tetap berlaku di server.
 * Eksekusi pompa dari aplikasi masih DIKUNCI: permintaan dicatat sebagai "gagal (eksekusi dikunci)".
 */
export default function NutrisiManualPage() {
  const { role } = useAuth()
  const bolehUbah = role === 'admin'
  const handleApiError = useApiError()
  const [zat, setZat] = useState<ZatManual>('nutrisi_a')
  const [mode, setMode] = useState<'volume' | 'durasi'>('volume')
  const [nilai, setNilai] = useState('10')
  const [batas, setBatas] = useState<BatasManual | null>(null)
  const [riwayat, setRiwayat] = useState<KejadianManual[]>([])
  const [sibuk, setSibuk] = useState<'dosing' | 'stop' | null>(null)
  const [pesan, setPesan] = useState<string | null>(null)
  const [galat, setGalat] = useState<string | null>(null)

  const muat = useCallback(async () => {
    try {
      const r = await api.get('/iot-v41/dosing-manual/riwayat')
      setRiwayat((r.data?.data ?? []) as KejadianManual[])
      setBatas((r.data?.batas ?? null) as BatasManual | null)
    } catch (e) {
      setGalat(handleApiError(e).message)
    }
  }, [handleApiError])

  useEffect(() => {
    void muat()
    const id = window.setInterval(() => void muat(), 5000)
    return () => window.clearInterval(id)
  }, [muat])

  const b = batas?.zat[zat]
  const salah = periksaIsian(zat, mode, nilai, batas)
  const adaBerjalan = riwayat.some((k) => k.hasil === 'berjalan')

  async function dosing() {
    if (!bolehUbah || sibuk || salah) return
    setSibuk('dosing')
    setGalat(null)
    setPesan(null)
    try {
      const n = Number(nilai.replace(',', '.'))
      const res = await api.post('/iot-v41/dosing-manual', { zat, ...(mode === 'volume' ? { volume_ml: n } : { durasi_detik: n }) })
      setPesan(String(res.data?.message ?? 'Permintaan diterima.'))
    } catch (err) {
      const f = handleApiError(err)
      setGalat(f.message)
    } finally {
      setSibuk(null)
      void muat()
    }
  }

  async function stop() {
    if (!bolehUbah || sibuk) return
    setSibuk('stop')
    setGalat(null)
    try {
      const res = await api.post('/iot-v41/dosing-manual', { aksi: 'stop' })
      setPesan(String(res.data?.message ?? 'Perintah STOP diantre.'))
    } catch (err) {
      setGalat(handleApiError(err).message)
    } finally {
      setSibuk(null)
      void muat()
    }
  }

  return (
    <div className="vsf-halaman vsf-stagger">
      <PageHeader
        judul="Nutrisi Manual"
        deskripsi="Beri nutrisi atau koreksi pH sendiri. Halaman ini tidak terpengaruh saklar (override manual), tetapi batas per sekali dosing, jeda minimum, jatah harian, LOCK, dan E-STOP tetap berlaku. Saat ini pompa dari aplikasi masih DIKUNCI: permintaan yang lolos pemeriksaan dicatat gagal dan tidak ada pompa menyala."
      />
      {pesan && <Pesan jenis="ok">{pesan}</Pesan>}
      {galat && <Pesan jenis="galat" onTutup={() => setGalat(null)}>{galat}</Pesan>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <section className="vsf-card w-full min-w-0 p-4 sm:p-5 lg:col-span-6" aria-label="Form nutrisi manual">
          <div className="vsf-judul-bagian">Dosing manual</div>
          <form
            className="mt-3 space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              void dosing()
            }}
          >
            <label className="block">
              <span className="vsf-label vsf-label-tinta">Zat</span>
              <select className="vsf-input mt-1 w-full" disabled={!bolehUbah} value={zat} onChange={(e) => setZat(e.target.value as ZatManual)}>
                {DAFTAR_ZAT.map((z) => (
                  <option key={z.kode} value={z.kode}>{z.nama}</option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="vsf-label vsf-label-tinta">Takar berdasarkan</span>
                <select className="vsf-input mt-1 w-full" disabled={!bolehUbah} value={mode} onChange={(e) => setMode(e.target.value === 'durasi' ? 'durasi' : 'volume')}>
                  <option value="volume">Volume (mL)</option>
                  <option value="durasi">Durasi (detik)</option>
                </select>
              </label>
              <label className="block">
                <span className="vsf-label vsf-label-tinta">{mode === 'volume' ? 'Volume (mL)' : 'Durasi (detik)'}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  className="vsf-input mt-1 w-full"
                  disabled={!bolehUbah}
                  value={nilai}
                  onChange={(e) => setNilai(e.target.value)}
                  aria-invalid={salah ? true : undefined}
                />
              </label>
            </div>
            {salah && <p role="alert" className="text-[12.5px] font-semibold text-red-700">{salah}</p>}
            {b && (
              <p className="text-[12px] leading-relaxed text-abu">
                Batas {b.nama}: <b className="text-tinta">{b.maks_ml} mL</b> per sekali dosing · jatah harian {b.jatah_harian_ml} mL · laju pompa {b.laju_ml_per_detik} mL/detik · jeda minimum antar dosing <b className="text-tinta">{batas?.jeda_menit} menit</b>.
              </p>
            )}
            {bolehUbah ? (
              <div className="flex flex-wrap gap-2">
                <button type="submit" className="vsf-btn-primary" disabled={sibuk !== null || Boolean(salah)}>
                  {sibuk === 'dosing' && <span className="vsf-spinner" aria-hidden />}
                  Dosing
                </button>
                <button type="button" className="vsf-btn-danger" disabled={sibuk !== null} onClick={() => void stop()}>
                  {sibuk === 'stop' && <span className="vsf-spinner" aria-hidden />}
                  {adaBerjalan ? 'Batal / STOP darurat' : 'STOP darurat'}
                </button>
              </div>
            ) : (
              <p className="text-[12.5px] text-abu">Hanya admin yang dapat memberi dosis.</p>
            )}
            <p className="text-[11.5px] text-abu">
              STOP hanya mengantrekan perintah dan tidak menjamin pompa mati; gunakan tombol darurat fisik. Kalibrasi laju pompa ada di{' '}
              <Link to="/kalibrasi" className="font-semibold text-arutmin-forest underline">Kalibrasi</Link>.
            </p>
          </form>
        </section>

        <section className="vsf-card w-full min-w-0 p-4 sm:p-5 lg:col-span-6" aria-label="Riwayat dosing manual">
          <div className="vsf-judul-bagian">Riwayat dosing manual</div>
          {riwayat.length === 0 ? (
            <div className="vsf-blok mt-3 px-4 py-6 text-center text-[13px] text-abu">Belum ada dosing manual.</div>
          ) : (
            <ul className="mt-3 grid gap-2">
              {riwayat.slice(0, 10).map((k) => {
                const st = labelStatusManual(k.hasil)
                return (
                  <li key={String(k.id)} className="vsf-blok p-3 text-[12.5px]">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-tinta">{k.alasan ?? 'Dosing manual'}</span>
                      <span className={`vsf-chip-nilai ${st.kelas}`}>{st.teks}</span>
                    </div>
                    <div className="mt-1 text-abu">
                      {tglJam(k.mulai_pada)}{k.oleh ? ` · ${k.oleh}` : ''}
                      {k.alasan_akhir ? ` · ${k.alasan_akhir.replace(/_/g, ' ')}` : ''}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
