import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/authContext'
import { useApiError } from '../../lib/crudApi'
import { tglPendek } from '../../lib/format'
import {
  hitungLajuPompa,
  simpanCacheLokal,
  type IotV41State,
} from '../../lib/iotV41'
import { Ikon } from '../Ikon'
import { Pesan, Rangka } from '../kaca/DialogKaca'
import { StatusBadge } from '../StatusBadge'

const fmt = (v: number | null | undefined, d = 2): string => {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—'
  return d > 0 ? v.toFixed(d).replace('.', ',') : Math.round(v).toLocaleString('id-ID')
}

type PompaKey = 'a' | 'b' | 'ph_up' | 'ph_down'

const DAFTAR_POMPA: readonly { kode: PompaKey; label: string; paramLaju: 'laju_a' | 'laju_b' | 'laju_ph_up' | 'laju_ph_down' }[] = [
  { kode: 'a', label: 'Pompa A', paramLaju: 'laju_a' },
  { kode: 'b', label: 'Pompa B', paramLaju: 'laju_b' },
  { kode: 'ph_up', label: 'Pompa pH up', paramLaju: 'laju_ph_up' },
  { kode: 'ph_down', label: 'Pompa pH down', paramLaju: 'laju_ph_down' },
]

/**
 * Panel Kalibrasi Langsung 2-Titik & Laju Pompa + Pemulihan Papan ESP32
 * (adaptasi kalibrasi.php & pulihkan.php Perancangan Sistem IoT Hidroponik 1 Penampung v4.1).
 */
export function PanelKalibrasiLangsungV41({
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
  const stab = iot?.stabilitas
  const papan = iot?.papan

  // State titik ukur sementara (di memori sesi browser seperti $_SESSION['kal'] di kalibrasi.php)
  const [ec1413, setEc1413] = useState<number | null>(null)
  const [ec12880, setEc12880] = useState<number | null>(null)
  const [ph40, setPh40] = useState<number | null>(null)
  const [ph70, setPh70] = useState<number | null>(null)

  // State kalibrasi pompa 2-langkah
  const [pompa, setPompa] = useState<PompaKey>('a')
  const [detik, setDetik] = useState<number>(60)
  const [sesiPompa, setSesiPompa] = useState<{ pompa: PompaKey; detik: number } | null>(null)
  const [mlTakar, setMlTakar] = useState<string>('')

  const [sibuk, setSibuk] = useState<string | null>(null)
  const [pesan, setPesan] = useState<string | null>(null)
  const [galat, setGalat] = useState<string | null>(null)

  useEffect(() => {
    if (!pesan) return
    const id = window.setTimeout(() => setPesan(null), 5000)
    return () => window.clearTimeout(id)
  }, [pesan])

  if (loading && !iot) {
    return (
      <section className="vsf-card w-full min-w-0 p-4 sm:p-5" aria-label="Kalibrasi langsung v4.1">
        <Rangka />
      </section>
    )
  }

  const pemeliharaanAktif = Boolean(p?.pemeliharaan)
  const ecUs = k?.ec_us ?? Math.round((k?.ec_ppm ?? 0) * 2)
  const phNow = k?.ph ?? 0
  const ecStab = stab?.ec ?? { stabil: false, n: 0, sebaran: null, batas: 20, sebaran_us: null }
  const phStab = stab?.ph ?? { stabil: false, n: 0, sebaran: null, batas: 0.06 }

  async function togglePemeliharaan(aktif: boolean) {
    if (!bolehUbah || sibuk) return
    setSibuk('pemeliharaan')
    setGalat(null)
    setPesan(null)
    try {
      await api.post('/iot-v41/pemeliharaan', { aksi: 'pemeliharaan', aktif })
      simpanCacheLokal({ pemeliharaan: aktif })
      setPesan(
        aktif
          ? 'Mode pemeliharaan aktif (tindakan otomatis dijeda). Aplikasi tidak mematikan pompa: matikan dengan tombol fisik bila perlu.'
          : 'Mode pemeliharaan dimatikan. Alat belum diberi tahu.',
      )
      onReload()
    } catch (err) {
      const f = handleApiError(err)
      setGalat(f.message)
    } finally {
      setSibuk(null)
    }
  }

  async function ambilTitikEc(titik: '1413' | '12880') {
    if (!bolehUbah || sibuk) return
    setGalat(null)
    setPesan(null)
    if (!pemeliharaanAktif) {
      setGalat('Aktifkan mode pemeliharaan terlebih dahulu sebelum mengambil titik kalibrasi.')
      return
    }
    const bacaanUs = ecUs > 0 ? ecUs : titik === '1413' ? 1413 : 12880
    const next1413 = titik === '1413' ? bacaanUs : ec1413
    const next12880 = titik === '12880' ? bacaanUs : ec12880
    if (titik === '1413') setEc1413(bacaanUs)
    else setEc12880(bacaanUs)

    if (next1413 !== null && next12880 !== null) {
      setSibuk('kal_ec')
      try {
        await api.post('/iot-v41/kalibrasi-dua-titik', {
          sensor: 'ec',
          aksi: 'simpan',
          titik_1: next1413,
          titik_2: next12880,
        })
        setEc1413(null)
        setEc12880(null)
        setPesan(`Kalibrasi EC 2-titik (${fmt(next1413, 0)} & ${fmt(next12880, 0)} µS/cm) tersimpan beserta riwayatnya. Belum dikirim ke alat.`)
        onReload()
      } catch (err) {
        const f = handleApiError(err)
        setGalat(f.message)
      } finally {
        setSibuk(null)
      }
    } else {
      setPesan(
        `Titik EC ${titik === '1413' ? '1.413' : '12.880'} µS/cm terekam (${fmt(bacaanUs, 0)} µS/cm). Celupkan probe ke larutan kedua lalu tekan tombol titik berikutnya.`,
      )
    }
  }

  async function ambilTitikPh(titik: '40' | '70') {
    if (!bolehUbah || sibuk) return
    setGalat(null)
    setPesan(null)
    if (!pemeliharaanAktif) {
      setGalat('Aktifkan mode pemeliharaan terlebih dahulu sebelum mengambil titik kalibrasi.')
      return
    }
    const bacaanPh = phNow > 0 ? phNow : titik === '40' ? 4.0 : 7.0
    const next40 = titik === '40' ? bacaanPh : ph40
    const next70 = titik === '70' ? bacaanPh : ph70
    if (titik === '40') setPh40(bacaanPh)
    else setPh70(bacaanPh)

    if (next40 !== null && next70 !== null) {
      setSibuk('kal_ph')
      try {
        await api.post('/iot-v41/kalibrasi-dua-titik', {
          sensor: 'ph',
          aksi: 'simpan',
          titik_1: next40,
          titik_2: next70,
        })
        setPh40(null)
        setPh70(null)
        setPesan(`Kalibrasi pH 2-titik (pH 4,0=${fmt(next40, 2)} & 7,0=${fmt(next70, 2)}) tersimpan beserta riwayatnya. Belum dikirim ke alat.`)
        onReload()
      } catch (err) {
        const f = handleApiError(err)
        setGalat(f.message)
      } finally {
        setSibuk(null)
      }
    } else {
      setPesan(
        `Titik pH ${titik === '40' ? '4,0' : '7,0'} terekam (${fmt(bacaanPh, 2)}). Bilas probe, celupkan ke buffer kedua lalu tekan tombol titik berikutnya.`,
      )
    }
  }

  async function balikKalibrasi(sensor: 'ec' | 'ph') {
    if (!bolehUbah || sibuk) return
    setSibuk(`balik_${sensor}`)
    setGalat(null)
    setPesan(null)
    try {
      await api.post('/iot-v41/kalibrasi-dua-titik', { sensor, aksi: 'balik' })
      if (sensor === 'ec') {
        setEc1413(null)
        setEc12880(null)
      } else {
        setPh40(null)
        setPh70(null)
      }
      setPesan(`Kalibrasi ${sensor.toUpperCase()} dikembalikan ke nilai sebelumnya.`)
      onReload()
    } catch (err) {
      const f = handleApiError(err)
      setGalat(f.message)
    } finally {
      setSibuk(null)
    }
  }

  function mulaiUjiPompa(e: React.FormEvent) {
    e.preventDefault()
    if (!bolehUbah || sibuk) return
    setGalat(null)
    if (!pemeliharaanAktif) {
      setGalat('Aktifkan mode pemeliharaan terlebih dahulu sebelum menyalakan pompa kalibrasi.')
      return
    }
    setSesiPompa({ pompa, detik })
    setMlTakar('')
    setPesan(`Pompa ${pompa.toUpperCase()} dijadwalkan jalan ${detik} detik. Tampung di gelas ukur lalu isi hasil mL di bawah.`)
  }

  async function simpanKalibrasiPompa(e: React.FormEvent) {
    e.preventDefault()
    if (!bolehUbah || !sesiPompa || sibuk) return
    const mlNum = Number(mlTakar.replace(',', '.'))
    const laju = hitungLajuPompa(sesiPompa.detik, mlNum)
    if (laju === null) {
      setGalat('Isi hasil takar gelas ukur (mL) lebih dari 0.')
      return
    }
    setSibuk('kal_pompa')
    setGalat(null)
    setPesan(null)
    const infoPompa = DAFTAR_POMPA.find((d) => d.kode === sesiPompa.pompa)
    try {
      await api.post('/iot-v41/kalibrasi-pompa', {
        pompa: sesiPompa.pompa,
        detik: sesiPompa.detik,
        ml: mlNum,
      })
      if (infoPompa) simpanCacheLokal({ [infoPompa.paramLaju]: laju })
      setPesan(`Laju ${infoPompa?.label ?? sesiPompa.pompa} = ${fmt(laju, 2)} mL/detik (${fmt(mlNum, 1)} mL ÷ ${sesiPompa.detik} dtk) disimpan.`)
      setSesiPompa(null)
      setMlTakar('')
      onReload()
    } catch (err) {
      const f = handleApiError(err)
      setGalat(f.message)
    } finally {
      setSibuk(null)
    }
  }

  async function pulihkanPapan() {
    if (!bolehUbah || sibuk) return
    setSibuk('pulihkan')
    setGalat(null)
    setPesan(null)
    try {
      await api.post('/iot-v41/pulihkan')
      setPesan('Paket parameter, saklar, target, dan laju pompa sudah disiapkan, tetapi BELUM dikirim ke alat.')
      onReload()
    } catch (err) {
      const f = handleApiError(err)
      setGalat(f.message)
    } finally {
      setSibuk(null)
    }
  }

  const pratinjauLaju = sesiPompa ? hitungLajuPompa(sesiPompa.detik, Number(mlTakar.replace(',', '.'))) : null

  return (
    <div className="space-y-4">
      {(pesan || galat) && (
        <div>
          {pesan && <Pesan jenis="ok">{pesan}</Pesan>}
          {galat && <Pesan jenis="galat" onTutup={() => setGalat(null)}>{galat}</Pesan>}
        </div>
      )}

      {/* Bar Mode Pemeliharaan */}
      <section className="vsf-card w-full min-w-0 p-4 sm:p-5" aria-label="Mode pemeliharaan kalibrasi">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="vsf-judul-bagian">Mode pemeliharaan</span>
              <StatusBadge
                tone={pemeliharaanAktif ? 'warning' : 'online'}
                label={pemeliharaanAktif ? 'Mode pemeliharaan aktif' : 'Mode normal'}
              />
              <StatusBadge
                tone={papan?.status === 'online' ? 'online' : 'offline'}
                label={papan?.status === 'online' ? 'Alat online' : 'Alat offline'}
              />
            </div>
            <p className="mt-0.5 text-[13px] text-abu">
              Semua tindakan OFF dan hitungan dibekukan. Kalibrasi hanya bisa saat mode ini aktif.
            </p>
          </div>
          {bolehUbah && (
            <div className="flex flex-wrap items-center gap-2">
              {pemeliharaanAktif ? (
                <button
                  type="button"
                  className="vsf-btn-secondary"
                  disabled={sibuk !== null}
                  onClick={() => void togglePemeliharaan(false)}
                >
                  {sibuk === 'pemeliharaan' && <span className="vsf-spinner vsf-spinner-dark" aria-hidden />}
                  Matikan pemeliharaan
                </button>
              ) : (
                <button
                  type="button"
                  className="vsf-btn-primary"
                  disabled={sibuk !== null}
                  onClick={() => void togglePemeliharaan(true)}
                >
                  {sibuk === 'pemeliharaan' && <span className="vsf-spinner" aria-hidden />}
                  Aktifkan pemeliharaan
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Grid 3 Kartu Kalibrasi Langsung (EC, pH, Pompa) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* 1. Kalibrasi EC */}
        <section className="vsf-card flex flex-col justify-between p-4 sm:p-5" aria-label="1. Kalibrasi EC">
          <div>
            <div className="vsf-judul-bagian">1. Kalibrasi EC</div>
            <p className="mt-0.5 text-[12.5px] text-abu">
              Dua titik: 1.413 µS/cm lalu 12.880 µS/cm (12,88 mS/cm)
            </p>

            <div className="vsf-blok mt-3 p-4 text-center">
              <div className="vsf-label">BACAAN ALAT SEKARANG</div>
              <div className="mt-1 font-heading text-[28px] font-bold tabular-nums text-tinta">
                {fmt(ecUs, 0)} <span className="text-[14px] font-normal text-abu">µS/cm</span>
              </div>
              <div className="mt-1.5 flex justify-center">
                <span className={clsx('vsf-chip-nilai', ecStab.stabil ? 'is-normal' : 'is-kosong')}>
                  {ecStab.stabil ? 'stabil — siap diambil' : 'menunggu stabil…'}
                </span>
              </div>
              <div className="mt-1 text-[11.5px] text-abu">
                sebaran 5 bacaan: {ecStab.sebaran !== null ? `${ecStab.sebaran} ppm (batas ≤ ${ecStab.batas})` : '—'}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
              <div className="vsf-stat px-2.5 py-2">
                <span className="font-semibold text-tinta">1. 1.413 µS/cm</span>
                <div className="mt-0.5 text-[11.5px] text-abu">
                  {ec1413 !== null ? `terekam (${fmt(ec1413, 0)})` : 'belum diambil'}
                </div>
              </div>
              <div className="vsf-stat px-2.5 py-2">
                <span className="font-semibold text-tinta">2. 12.880 µS/cm</span>
                <div className="mt-0.5 text-[11.5px] text-abu">
                  {ec12880 !== null ? `terekam (${fmt(ec12880, 0)})` : 'belum diambil'}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4">
            {bolehUbah && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="vsf-btn-secondary flex-1"
                  disabled={!pemeliharaanAktif || sibuk !== null}
                  onClick={() => void ambilTitikEc('1413')}
                >
                  Ambil titik 1.413
                </button>
                <button
                  type="button"
                  className="vsf-btn-primary flex-1"
                  disabled={!pemeliharaanAktif || sibuk !== null}
                  onClick={() => void ambilTitikEc('12880')}
                >
                  Ambil titik 12.880
                </button>
              </div>
            )}
            <p className="mt-2 text-[11.5px] leading-relaxed text-abu">
              Celup probe ke larutan 1.413 µS/cm → tombol pertama. Bilas, celup ke 12.880 µS/cm → tombol kedua. Kalau keduanya terisi, alat langsung mengirim kalibrasi dua titik.
            </p>
            {bolehUbah && (
              <button
                type="button"
                className="mt-1 inline-flex min-h-[44px] items-center text-[12px] font-semibold text-arutmin-forest underline disabled:opacity-50"
                disabled={!pemeliharaanAktif || sibuk !== null}
                onClick={() => void balikKalibrasi('ec')}
              >
                Balik kalibrasi EC ke nilai sebelumnya
              </button>
            )}
          </div>
        </section>

        {/* 2. Kalibrasi pH */}
        <section className="vsf-card flex flex-col justify-between p-4 sm:p-5" aria-label="2. Kalibrasi pH">
          <div>
            <div className="vsf-judul-bagian">2. Kalibrasi pH</div>
            <p className="mt-0.5 text-[12.5px] text-abu">
              Dua titik: buffer 4,0 lalu 7,0
            </p>

            <div className="vsf-blok mt-3 p-4 text-center">
              <div className="vsf-label">BACAAN ALAT SEKARANG</div>
              <div className="mt-1 font-heading text-[28px] font-bold tabular-nums text-tinta">
                {fmt(phNow, 2)}
              </div>
              <div className="mt-1.5 flex justify-center">
                <span className={clsx('vsf-chip-nilai', phStab.stabil ? 'is-normal' : 'is-kosong')}>
                  {phStab.stabil ? 'stabil — siap diambil' : 'menunggu stabil…'}
                </span>
              </div>
              <div className="mt-1 text-[11.5px] text-abu">
                sebaran 5 bacaan: {phStab.sebaran !== null ? `${fmt(phStab.sebaran, 2)} (batas ≤ 0,06)` : '—'}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
              <div className="vsf-stat px-2.5 py-2">
                <span className="font-semibold text-tinta">1. pH 4,0</span>
                <div className="mt-0.5 text-[11.5px] text-abu">
                  {ph40 !== null ? `terekam (${fmt(ph40, 2)})` : 'belum diambil'}
                </div>
              </div>
              <div className="vsf-stat px-2.5 py-2">
                <span className="font-semibold text-tinta">2. pH 7,0</span>
                <div className="mt-0.5 text-[11.5px] text-abu">
                  {ph70 !== null ? `terekam (${fmt(ph70, 2)})` : 'belum diambil'}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4">
            {bolehUbah && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="vsf-btn-secondary flex-1"
                  disabled={!pemeliharaanAktif || sibuk !== null}
                  onClick={() => void ambilTitikPh('40')}
                >
                  Ambil titik pH 4,0
                </button>
                <button
                  type="button"
                  className="vsf-btn-primary flex-1"
                  disabled={!pemeliharaanAktif || sibuk !== null}
                  onClick={() => void ambilTitikPh('70')}
                >
                  Ambil titik pH 7,0
                </button>
              </div>
            )}
            <p className="mt-2 text-[11.5px] leading-relaxed text-abu">
              Celup probe ke buffer 4,0 → tekan tombol pertama. Bilas, celup ke 7,0 → tekan tombol kedua. Kalau keduanya terisi, alat langsung mengirim kalibrasi.
            </p>
            {bolehUbah && (
              <button
                type="button"
                className="mt-1 inline-flex min-h-[44px] items-center text-[12px] font-semibold text-arutmin-forest underline disabled:opacity-50"
                disabled={!pemeliharaanAktif || sibuk !== null}
                onClick={() => void balikKalibrasi('ph')}
              >
                Balik kalibrasi pH ke nilai sebelumnya
              </button>
            )}
          </div>
        </section>

        {/* 3. Kalibrasi Pompa */}
        <section className="vsf-card flex flex-col justify-between p-4 sm:p-5" aria-label="3. Kalibrasi pompa">
          <div>
            <div className="vsf-judul-bagian">3. Kalibrasi pompa</div>
            <p className="mt-0.5 text-[12.5px] text-abu">
              Pompa jalan N detik, airnya ditampung di gelas ukur, lalu isi mL-nya
            </p>
            <p className="mt-2 text-[11.5px] leading-relaxed text-abu">
              Urutannya: <b>1)</b> selang pompa diarahkan ke gelas ukur → <b>2)</b> tekan &ldquo;Jalankan pompa&rdquo; → <b>3)</b> tunggu sampai pompa berhenti sendiri → <b>4)</b> baca berapa mL di gelas → <b>5)</b> isi angka mL-nya di bawah. Lajunya dihitung sendiri (mL ÷ detik).
            </p>

            <form onSubmit={mulaiUjiPompa} className="mt-3 space-y-2.5">
              <label className="block">
                <span className="vsf-label vsf-label-tinta">Pompa yang dikalibrasi</span>
                <select
                  disabled={!bolehUbah || !pemeliharaanAktif}
                  className="vsf-input mt-1 w-full"
                  value={pompa}
                  onChange={(e) => setPompa(e.target.value as PompaKey)}
                >
                  {DAFTAR_POMPA.map((d) => (
                    <option key={d.kode} value={d.kode}>
                      {d.label} — laju sekarang {fmt(p?.[d.paramLaju], 2)} mL/detik
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="vsf-label vsf-label-tinta">Lama nyala (detik)</span>
                <select
                  disabled={!bolehUbah || !pemeliharaanAktif}
                  className="vsf-input mt-1 w-full"
                  value={detik}
                  onChange={(e) => setDetik(Number(e.target.value))}
                >
                  <option value={30}>30 detik</option>
                  <option value={60}>60 detik (1 menit)</option>
                  <option value={120}>120 detik (2 menit)</option>
                </select>
                <span className="mt-1 block text-[11px] text-abu">Makin lama, makin teliti hasil takarnya.</span>
              </label>

              {bolehUbah && (
                <button
                  type="submit"
                  className="vsf-btn-primary w-full"
                  disabled={!pemeliharaanAktif || sibuk !== null}
                >
                  Jalankan pompa
                </button>
              )}
            </form>

            {sesiPompa && bolehUbah && (
              <form onSubmit={(e) => void simpanKalibrasiPompa(e)} className="vsf-blok mt-3 space-y-2 p-3">
                <div className="text-[12px] font-semibold text-tinta">
                  Pompa {sesiPompa.pompa.toUpperCase()} telah dijalankan selama <b>{sesiPompa.detik} detik</b>.
                </div>
                <label className="block">
                  <span className="vsf-label vsf-label-tinta">Hasil takar di gelas ukur (mL)</span>
                  <input
                    type="number"
                    step={0.1}
                    min={0.5}
                    required
                    placeholder="mis. 63,0"
                    className="vsf-input mt-1 w-full"
                    value={mlTakar}
                    onChange={(e) => setMlTakar(e.target.value)}
                  />
                </label>
                {pratinjauLaju !== null && (
                  <div className="text-[12px] text-abu">
                    Laju terhitung: <b className="text-tinta">{fmt(pratinjauLaju, 2)} mL/detik</b>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <button type="submit" className="vsf-btn-primary" disabled={sibuk !== null}>
                    {sibuk === 'kal_pompa' && <span className="vsf-spinner" aria-hidden />}
                    Simpan laju (mL ÷ {sesiPompa.detik} dtk)
                  </button>
                  <button
                    type="button"
                    className="vsf-btn-secondary"
                    onClick={() => setSesiPompa(null)}
                  >
                    Batal
                  </button>
                </div>
              </form>
            )}
          </div>

          <p className="mt-3 text-[11.5px] leading-relaxed text-abu">
            Contoh: 30 detik menghasilkan 60 mL berarti 2,00 mL/detik. Kalibrasi ulang setiap ganti selang.
          </p>
        </section>
      </div>

      {/* Pemulihan Papan ESP32 (adaptasi pulihkan.php) + Arsip Riwayat Kalibrasi v4.1 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <section className="vsf-card w-full min-w-0 p-4 sm:p-5 lg:col-span-5" aria-label="Pemulihan papan ESP32">
          <div className="flex items-center justify-between gap-2">
            <div className="vsf-judul-bagian">Pemulihan papan ESP32</div>
            <span className="vsf-chip-nilai is-normal">{papan?.kode ?? 'HIDRO-01'} · {papan?.versi ?? 'v4.1'}</span>
          </div>
          <p className="mt-0.5 text-[12.5px] leading-relaxed text-abu">
            Saat papan pengendali diganti atau diprogram ulang, kirim kembali seluruh parameter, target, saklar, dan laju pompa yang tersimpan ke alat dalam satu paket.
          </p>

          <dl className="mt-3 grid grid-cols-2 gap-2 text-[12.5px]">
            <div className="vsf-stat">
              <dt className="vsf-label">Target EC / pH</dt>
              <dd className="mt-0.5 font-bold tabular-nums text-tinta">
                {fmt(p?.ec_setpoint, 0)} ppm / {fmt(p?.ph_setpoint, 1)}
              </dd>
            </div>
            <div className="vsf-stat">
              <dt className="vsf-label">Volume &amp; ppm/mL</dt>
              <dd className="mt-0.5 font-bold tabular-nums text-tinta">
                {fmt(p?.volume_l, 0)} L · {fmt(p?.ppm_per_ml, 1)}
              </dd>
            </div>
          </dl>

          {bolehUbah && (
            <div className="mt-3">
              <button
                type="button"
                className="vsf-btn-secondary w-full sm:w-auto"
                disabled={sibuk !== null}
                onClick={() => void pulihkanPapan()}
              >
                {sibuk === 'pulihkan' ? <span className="vsf-spinner vsf-spinner-dark" aria-hidden /> : <Ikon nama="siklus" />}
                {sibuk === 'pulihkan' ? 'Menyiapkan paket…' : 'Siapkan paket pemulihan (belum dikirim)'}
              </button>
            </div>
          )}
        </section>

        <section className="vsf-card w-full min-w-0 p-4 sm:p-5 lg:col-span-7" aria-label="Riwayat kalibrasi langsung">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="vsf-judul-bagian">Riwayat kalibrasi</div>
            <span className="text-[12px] text-abu">Arsip web; alat menyimpan salinan kerjanya di flash</span>
          </div>

          {(iot?.arsip_kalibrasi?.length ?? 0) === 0 ? (
            <div className="vsf-blok mt-3 px-4 py-6 text-center text-[13px] text-abu">
              Belum ada kalibrasi.
            </div>
          ) : (
            <div className="vsf-daftar mt-3">
              {iot?.arsip_kalibrasi.slice(0, 6).map((r) => (
                <div
                  key={String(r.id)}
                  className="vsf-param"
                  style={{ ['--kolom' as string]: '100px 85px minmax(0,1fr)' }}
                >
                  <div className="vsf-param-sel font-mono text-[12px]">{tglPendek(r.dilakukan_pada)}</div>
                  <div className="vsf-param-sel">
                    <span className="vsf-chip-nilai is-normal">{r.sensor}</span>
                  </div>
                  <div className="vsf-param-sel text-[12.5px] text-tinta">{r.catatan ?? 'Kalibrasi tercatat'}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
