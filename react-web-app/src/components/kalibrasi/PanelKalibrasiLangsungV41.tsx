import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/authContext'
import { useApiError } from '../../lib/crudApi'
import { kalimatHasil, useHasilPerintah } from '../../lib/useHasilPerintah'
import {
  hitungLajuPompa,
  type IotV41State,
} from '../../lib/iotV41'
import { Pesan, Rangka } from '../kaca/DialogKaca'
import { StatusBadge } from '../StatusBadge'
import { KalibrasiSensorV6 } from './KalibrasiSensorV6'

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
 * Panel Kalibrasi Langsung 2-Titik & Laju Pompa (adaptasi kalibrasi.php Perancangan Sistem IoT Hidroponik v4.1).
 * Riwayat/pencatatan kalibrasi dan pemulihan papan sengaja tidak ditampilkan di sini.
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
  const papan = iot?.papan

  // State kalibrasi pompa 2-langkah
  const [pompa, setPompa] = useState<PompaKey>('a')
  const [detik, setDetik] = useState<number>(60)
  const [sesiPompa, setSesiPompa] = useState<{ pompa: PompaKey; detik: number } | null>(null)
  const [mlTakar, setMlTakar] = useState<string>('')

  const [detikIsi, setDetikIsi] = useState<number>(10)
  const [sibuk, setSibuk] = useState<string | null>(null)
  const [pesan, setPesan] = useState<string | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  // Perintah terakhir yang dikirim ke alat (uji pompa / laju pompa); statusnya dipantau sampai alat melapor.
  const [perintahAlat, setPerintahAlat] = useState<{ id: number | string; label: string } | null>(null)
  const hasilAlat = useHasilPerintah(perintahAlat?.id ?? null)

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
  // null = tidak ada bacaan segar (backend mengosongkan data basi) → tampil "—", bukan 0.
  const ecUs = k?.ec_us ?? null
  const phNow = k?.ph ?? null

  async function togglePemeliharaan(aktif: boolean) {
    if (!bolehUbah || sibuk) return
    setSibuk('pemeliharaan')
    setGalat(null)
    setPesan(null)
    try {
      const r = await api.post('/iot-v41/pemeliharaan', { aksi: 'pemeliharaan', aktif })
      setPerintahAlat(
        r.data?.id_perintah
          ? { id: r.data.id_perintah, label: aktif ? 'Mode pemeliharaan (MULAI) ke alat' : 'Mode pemeliharaan (SELESAI) ke alat' }
          : null,
      )
      setPesan(
        String(
          r.data?.message ??
            (aktif
              ? 'Mode pemeliharaan disimpan di server. Tunggu konfirmasi alat sebelum menyalakan uji pompa.'
              : 'Mode pemeliharaan dimatikan di server. Tunggu konfirmasi alat.'),
        ),
      )
      onReload()
    } catch (err) {
      const f = handleApiError(err)
      setGalat(f.message)
    } finally {
      setSibuk(null)
    }
  }

  async function balikKalibrasi(sensor: 'ec' | 'ph') {
    if (!bolehUbah || sibuk) return
    setSibuk(`balik_${sensor}`)
    setGalat(null)
    setPesan(null)
    try {
      const r = await api.post('/iot-v41/kalibrasi-dua-titik', { sensor, aksi: 'balik' })
      setPerintahAlat(r.data?.id_perintah ? { id: r.data.id_perintah, label: `Balik kalibrasi ${sensor.toUpperCase()} ke alat` } : null)
      setPesan(String(r.data?.message ?? `Kalibrasi ${sensor.toUpperCase()} dikembalikan ke nilai sebelumnya.`))
      onReload()
    } catch (err) {
      const f = handleApiError(err)
      setGalat(f.message)
    } finally {
      setSibuk(null)
    }
  }

  /** Kalibrasi pH/EC firmware v6: alat mengukur & menyimpan sendiri (UKUR lalu SIMPAN per titik). */
  async function kirimKalSensor(sensor: 'ph' | 'ec', titik: 0 | 1 | 2, aksi: 'UKUR' | 'SIMPAN' | 'BATAL', acuan?: number) {
    if (!bolehUbah || sibuk) return
    setSibuk(`kal_${sensor}`)
    setGalat(null)
    setPesan(null)
    try {
      const r = await api.post('/iot-v41/kal-sensor', { sensor, titik, aksi, ...(acuan !== undefined ? { acuan } : {}) })
      setPerintahAlat(r.data?.id_perintah ? { id: r.data.id_perintah, label: `Kalibrasi ${sensor.toUpperCase()} titik ${titik} (${aksi})` } : null)
    } catch (err) {
      setGalat(handleApiError(err).message)
    } finally {
      setSibuk(null)
    }
  }

  /** Tes pompa isi air: hanya menyalakan beberapa detik untuk memastikan pompa jalan (bukan kalibrasi laju). */
  async function tesPompaIsi() {
    if (!bolehUbah || sibuk) return
    setSibuk('tes_isi')
    setGalat(null)
    setPesan(null)
    try {
      const r = await api.post('/iot-v41/uji-pompa', { pompa: 'ISI', detik: detikIsi })
      setPerintahAlat({ id: r.data?.id_perintah, label: `Tes pompa isi air ${detikIsi} detik` })
    } catch (err) {
      setGalat(handleApiError(err).message)
    } finally {
      setSibuk(null)
    }
  }

  async function mulaiUjiPompa(e: React.FormEvent) {
    e.preventDefault()
    if (!bolehUbah || sibuk) return
    setGalat(null)
    if (!pemeliharaanAktif) {
      setGalat('Aktifkan mode pemeliharaan terlebih dahulu sebelum menyalakan pompa kalibrasi.')
      return
    }
    setSibuk('uji_pompa')
    setPesan(null)
    try {
      const r = await api.post('/iot-v41/uji-pompa', { pompa, detik })
      setPerintahAlat({ id: r.data?.id_perintah, label: `Uji pompa ${pompa.toUpperCase()} ${detik} detik` })
      setSesiPompa({ pompa, detik })
      setMlTakar('')
      setPesan(String(r.data?.message ?? 'Uji pompa masuk antrean.'))
    } catch (err) {
      setGalat(handleApiError(err).message)
    } finally {
      setSibuk(null)
    }
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
      const r = await api.post('/iot-v41/kalibrasi-pompa', {
        pompa: sesiPompa.pompa,
        detik: sesiPompa.detik,
        ml: mlNum,
      })
      setPerintahAlat(r.data?.id_perintah ? { id: r.data.id_perintah, label: `Laju ${infoPompa?.label ?? sesiPompa.pompa} ke alat` } : null)
      setPesan(String(r.data?.message ?? `Laju ${infoPompa?.label ?? sesiPompa.pompa} = ${fmt(laju, 2)} mL/detik disimpan.`))
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

  const pratinjauLaju = sesiPompa ? hitungLajuPompa(sesiPompa.detik, Number(mlTakar.replace(',', '.'))) : null

  return (
    <div className="space-y-4">
      {(pesan || galat || perintahAlat) && (
        <div>
          {pesan && <Pesan jenis="ok">{pesan}</Pesan>}
          {galat && <Pesan jenis="galat" onTutup={() => setGalat(null)}>{galat}</Pesan>}
          {perintahAlat && (
            <Pesan jenis={hasilAlat?.status === 'gagal' || hasilAlat?.status === 'kedaluwarsa' ? 'galat' : 'ok'}>
              {perintahAlat.label}: {kalimatHasil(hasilAlat)}
            </Pesan>
          )}
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
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <KalibrasiSensorV6
          sensor="ec" judul="1. Kalibrasi EC" bolehUbah={bolehUbah} pemeliharaanAktif={pemeliharaanAktif}
          bacaan={ecUs != null ? `${fmt(ecUs, 0)} µS/cm` : '—'}
          larutan={['Larutan standar 1,413 mS/cm', 'Larutan standar 12,88 mS/cm']}
          sibuk={sibuk} onKirim={kirimKalSensor} onBalik={() => void balikKalibrasi('ec')}
        />
        <KalibrasiSensorV6
          sensor="ph" judul="2. Kalibrasi pH" bolehUbah={bolehUbah} pemeliharaanAktif={pemeliharaanAktif}
          bacaan={phNow != null ? fmt(phNow, 2) : '—'}
          larutan={['Buffer pH 4,01', 'Buffer pH 6,86']}
          sibuk={sibuk} onKirim={kirimKalSensor} onBalik={() => void balikKalibrasi('ph')}
        />

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

            <form onSubmit={(e) => void mulaiUjiPompa(e)} className="mt-3 space-y-2.5">
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
                  Uji pompa {sesiPompa.pompa.toUpperCase()} <b>{sesiPompa.detik} detik</b> sudah diminta. Isi hasil takar setelah alat melapor selesai.
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

        {/* 4. Tes pompa isi air (bukan kalibrasi: laju tidak dipakai alat) */}
        <section className="vsf-card flex flex-col justify-between p-4 sm:p-5" aria-label="4. Tes pompa isi air">
          <div>
            <div className="vsf-judul-bagian">4. Tes pompa isi air</div>
            <p className="mt-0.5 text-[12.5px] text-abu">
              Menyalakan pompa isi beberapa detik untuk memastikan pompa dan selang berfungsi. Tidak ada angka yang disimpan.
            </p>
            <label className="mt-3 block">
              <span className="vsf-label vsf-label-tinta">Lama nyala (detik)</span>
              <select disabled={!bolehUbah || !pemeliharaanAktif} className="vsf-input mt-1 w-full"
                value={detikIsi} onChange={(e) => setDetikIsi(Number(e.target.value))}>
                <option value={5}>5 detik</option>
                <option value={10}>10 detik</option>
                <option value={30}>30 detik</option>
              </select>
            </label>
            {bolehUbah && (
              <button type="button" className="vsf-btn-primary mt-3 w-full"
                disabled={!pemeliharaanAktif || sibuk !== null} onClick={() => void tesPompaIsi()}>
                Nyalakan pompa isi
              </button>
            )}
          </div>
          <p className="mt-3 text-[11.5px] leading-relaxed text-abu">Alat menolak bila tandon sudah penuh. Perlu mode pemeliharaan aktif.</p>
        </section>
      </div>

    </div>
  )
}
