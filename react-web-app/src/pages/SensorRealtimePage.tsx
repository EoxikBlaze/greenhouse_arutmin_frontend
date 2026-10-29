import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import { useApiError, useApiList } from '../lib/crudApi'
import { useApiObject } from '../lib/useApiObject'
import { useAuth } from '../lib/authContext'
import { Ikon } from '../components/Ikon'
import { StripStatus } from '../components/sensor/StripStatus'
import { KartuNilai } from '../components/sensor/KartuNilai'
import { FilterBar, type Rentang } from '../components/sensor/FilterBar'
import { PanelGrafik } from '../components/sensor/PanelGrafik'
import { TabelRiwayat } from '../components/sensor/TabelRiwayat'
import {
  PARAMS,
  formatJam,
  formatTanggal,
  hapusDuplikat,
  nilaiAngka,
  seriParam,
  terakhirPerParam,
  unduhLaporan,
  waktuMs,
  type Ambang,
  type KunciSensor,
  type Titik,
} from '../lib/sensorLaporan'
import { tanggalIso } from '../lib/format'

const RANGE_MS: Record<Exclude<Rentang, 'Kustom'>, number> = {
  '6 Jam': 6 * 3_600_000,
  '24 Jam': 24 * 3_600_000,
  '7 Hari': 7 * 24 * 3_600_000,
}

const HALAMAN = 100
const BATAS_UNDUH = 1000
const TAMBAH_BARIS = 50

type Kustom = { rows: Titik[]; total: number; page: number }

const rentangTeks = (a: number, b: number) =>
  `${formatTanggal(a)} ${formatJam(a).slice(0, 5)} – ${formatTanggal(b)} ${formatJam(b).slice(0, 5)}`

function dariAxios(err: unknown): boolean {
  const e = err as { response?: unknown; request?: unknown } | null
  return Boolean(e?.response || e?.request)
}

export default function SensorRealtimePage() {
  const { role } = useAuth()
  const pengelola = role !== 'petani'
  const handleApiError = useApiError()

  // Batas aman per sensor — sumber yang sama dengan Dashboard (tabel sensor_thresholds).
  const { data: dash } = useApiObject<{ ambang?: Ambang }>('/dashboard', { pollMs: 60_000 })
  const ambang: Ambang = dash?.ambang ?? null

  const [rentang, setRentang] = useState<Rentang>('6 Jam')
  const [terpilih, setTerpilih] = useState<KunciSensor[]>(['ph'])
  const [batasTabel, setBatasTabel] = useState(TAMBAH_BARIS)

  // Data live: GET /monitoring/chart-data → 288 titik terakhir (urut waktu naik).
  const { rows: live, loading, error, reload } = useApiList<Titik>('/monitoring/chart-data')

  // Refresh senyap tiap 15 dtk. `kini` diisi lewat effect (bukan Date.now() di render — aturan purity oxlint).
  const [kini, setKini] = useState(0)
  useEffect(() => {
    const tick = () => {
      setKini(Date.now())
      reload()
    }
    tick()
    const id = setInterval(tick, 15_000)
    return () => clearInterval(id)
  }, [reload])

  // Rentang kustom: GET /monitoring/tarik per halaman.
  const [dari, setDari] = useState('')
  const [sampai, setSampai] = useState('')
  const [kustom, setKustom] = useState<Kustom | null>(null)
  const [kustomMuat, setKustomMuat] = useState(false)
  const [kustomGalat, setKustomGalat] = useState<string | null>(null)

  const [mengunduh, setMengunduh] = useState(false)
  const [galatUnduh, setGalatUnduh] = useState<string | null>(null)

  const liveBersih = useMemo(() => hapusDuplikat(live), [live])
  const kustomBersih = useMemo(() => hapusDuplikat(kustom?.rows ?? []), [kustom])
  const bersih = rentang === 'Kustom' ? kustomBersih.rows : liveBersih.rows

  // Jangkauan rentang dihitung dari bacaan terakhir (bukan jam sistem) agar riwayat yang tersedia tetap terbaca.
  const waktuTerbaru = useMemo(() => {
    const all = live.map(waktuMs).filter((n): n is number => n !== null)
    return all.length ? Math.max(...all) : null
  }, [live])

  const terlihat = useMemo(() => {
    if (rentang === 'Kustom') return bersih
    if (waktuTerbaru === null) return []
    const batas = waktuTerbaru - RANGE_MS[rentang]
    return bersih.filter((r) => {
      const t = waktuMs(r)
      return t !== null && t >= batas
    })
  }, [rentang, bersih, waktuTerbaru])

  const terakhir = useMemo(() => terakhirPerParam(live), [live])
  const seri = useMemo(
    () => Object.fromEntries(PARAMS.map((p) => [p.kunci, seriParam(terlihat, p.kunci)])) as Record<KunciSensor, ReturnType<typeof seriParam>>,
    [terlihat],
  )

  const turun = useMemo(() => [...terlihat].sort((a, b) => (waktuMs(b) ?? 0) - (waktuMs(a) ?? 0)), [terlihat])
  const barisTabel = rentang === 'Kustom' ? turun : turun.slice(0, batasTabel)
  const adaLagi = rentang === 'Kustom' ? (kustom ? kustom.rows.length < kustom.total : false) : batasTabel < turun.length

  function toggle(k: KunciSensor) {
    setTerpilih((t) => (t.includes(k) ? (t.length > 1 ? t.filter((x) => x !== k) : t) : [...t, k]))
  }

  async function tarik(halaman: number, dr = dari, sp = sampai) {
    if (kustomMuat) return
    if (dr && sp && dr > sp) {
      setKustomGalat('Tanggal "dari" harus sebelum atau sama dengan tanggal "sampai".')
      return
    }
    setKustomMuat(true)
    setKustomGalat(null)
    try {
      const res = await api.get('/monitoring/tarik', { params: paramKustom(dr, sp, HALAMAN, halaman) })
      const d = (res.data ?? {}) as { data?: Titik[]; total?: number }
      const baru = Array.isArray(d.data) ? d.data : []
      setKustom((k) => ({
        rows: halaman === 1 ? baru : [...(k?.rows ?? []), ...baru],
        total: Number(d.total) || baru.length,
        page: halaman,
      }))
    } catch (err) {
      setKustomGalat(handleApiError(err).message)
    } finally {
      setKustomMuat(false)
    }
  }

  function pilihRentang(r: Rentang) {
    setRentang(r)
    setBatasTabel(TAMBAH_BARIS)
    // Pertama kali masuk Kustom: isi 7 hari terakhir dan langsung muat, supaya tidak mulai dari layar kosong.
    if (r === 'Kustom' && !kustom && !kustomMuat) {
      const sp = tanggalIso(Date.now())
      const dr = tanggalIso(Date.now() - 6 * 24 * 3_600_000)
      setDari(dr)
      setSampai(sp)
      void tarik(1, dr, sp)
    }
  }

  function muatLagi() {
    if (rentang === 'Kustom') {
      if (kustom) void tarik(kustom.page + 1)
    } else {
      setBatasTabel((b) => b + TAMBAH_BARIS)
    }
  }

  async function unduh() {
    if (mengunduh) return
    setMengunduh(true)
    setGalatUnduh(null)
    try {
      let rows: Titik[] = terlihat
      let terpotong = false
      if (rentang === 'Kustom') {
        const res = await api.get('/monitoring/tarik', { params: paramKustom(dari, sampai, BATAS_UNDUH, 1) })
        const d = (res.data ?? {}) as { data?: Titik[]; total?: number }
        rows = Array.isArray(d.data) ? d.data : []
        terpotong = (Number(d.total) || 0) > rows.length
      }
      const waktu = rows.map(waktuMs).filter((n): n is number => n !== null)
      if (!waktu.length) {
        setGalatUnduh('Tidak ada bacaan pada rentang ini, jadi belum ada yang bisa dilaporkan.')
        return
      }
      const awal = rentang === 'Kustom' && dari ? Date.parse(`${dari}T00:00:00`) : Math.min(...waktu)
      const akhir = rentang === 'Kustom' && sampai ? Date.parse(`${sampai}T23:59:59`) : Math.max(...waktu)
      await unduhLaporan({
        rows,
        ambang,
        periode: rentang === 'Kustom' ? rentangTeks(awal, akhir) : `${rentang} terakhir (${rentangTeks(awal, akhir)})`,
        dibuat: Date.now(),
        terpotong,
        dari: awal,
        sampai: akhir,
      })
    } catch (err) {
      setGalatUnduh(dariAxios(err) ? handleApiError(err).message : 'Laporan gagal dibuat. Coba lagi.')
    } finally {
      setMengunduh(false)
    }
  }

  const bisaUnduh = rentang === 'Kustom' ? Boolean(kustom?.rows.length) : terlihat.length > 0
  const semuaKosong = !loading && live.length === 0 && rentang !== 'Kustom'
  const rentangKosong = rentang !== 'Kustom' ? !semuaKosong && !loading && terlihat.length === 0 : false

  return (
    <div className="vsf-halaman vsf-stagger">
      <StripStatus
        waktuTerbaru={waktuTerbaru}
        kini={kini}
        memuat={loading}
        jumlah={liveBersih.rows.length}
        kembar={liveBersih.dibuang}
      />

      <KartuNilai terakhir={terakhir} ambang={ambang} terpilih={terpilih} onToggle={toggle} kini={kini} memuat={loading} />

      <FilterBar
        rentang={rentang}
        onRentang={pilihRentang}
        bolehKustom={pengelola}
        dari={dari}
        sampai={sampai}
        onDari={setDari}
        onSampai={setSampai}
        onTerapkan={() => void tarik(1)}
        memuatKustom={kustomMuat}
        galatKustom={kustomGalat}
        bolehUnduh={pengelola}
        bisaUnduh={bisaUnduh}
        mengunduh={mengunduh}
        onUnduh={() => void unduh()}
        galatUnduh={galatUnduh}
        meta={
          rentang === 'Kustom'
            ? kustom && `${kustom.rows.length} dari ${kustom.total} bacaan dimuat`
            : `${terlihat.length} titik pada rentang ini · diperbarui otomatis tiap 15 detik`
        }
      />

      {error && rentang !== 'Kustom' && (
        <div role="alert" className="vsf-banner vsf-tone-error flex flex-wrap items-center gap-3 rounded-input px-4 py-3 text-[13px]">
          <span className="flex items-center gap-2">
            <Ikon nama="salah" className="h-4 w-4" />
            {error}
          </span>
          <button type="button" className="vsf-btn-secondary vsf-btn-kecil" onClick={reload}>
            Coba lagi
          </button>
        </div>
      )}

      {loading && live.length === 0 && rentang !== 'Kustom' ? (
        <div className="vsf-skeleton h-[320px] rounded-card" role="status" aria-label="Memuat grafik" />
      ) : semuaKosong && !error ? (
        <section className="vsf-card flex flex-col items-center gap-2 p-8 text-center text-[13px] text-tinta">
          <Ikon nama="kosong" className="h-9 w-9 text-arutmin-olive" />
          <b className="text-[15px]">Belum ada data sensor</b>
          <span>Grafik akan terisi otomatis begitu perangkat mengirim bacaan.</span>
          <button type="button" className="vsf-btn-secondary mt-1" onClick={reload}>
            Muat ulang
          </button>
        </section>
      ) : rentangKosong ? (
        <section className="vsf-card flex flex-col items-center gap-2 p-8 text-center text-[13px] text-tinta">
          <Ikon nama="jam" className="h-9 w-9 text-arutmin-olive" />
          <b className="text-[15px]">Belum ada data pada rentang ini</b>
          {rentang !== '7 Hari' && (
            <button type="button" className="vsf-btn-secondary mt-1" onClick={() => pilihRentang('7 Hari')}>
              Lihat 7 Hari
            </button>
          )}
        </section>
      ) : (
        PARAMS.filter((p) => terpilih.includes(p.kunci)).map((p) => (
          <PanelGrafik
            key={p.kunci}
            def={p}
            seri={seri[p.kunci]}
            batas={{ min: nilaiAngka(ambang?.[p.kunci]?.min), max: nilaiAngka(ambang?.[p.kunci]?.max) }}
          />
        ))
      )}

      {pengelola && (
        <TabelRiwayat
          rows={barisTabel}
          ambang={ambang}
          memuat={rentang === 'Kustom' ? kustomMuat && !kustom : loading}
          kosong={
            rentang === 'Kustom'
              ? 'Tidak ada bacaan pada rentang tanggal itu — coba rentang lain.'
              : 'Belum ada bacaan pada rentang ini.'
          }
          adaLagi={adaLagi}
          memuatLagi={kustomMuat}
          onLagi={muatLagi}
        />
      )}
    </div>
  )
}

/** Tanggal <input type=date> → batas inklusif hari itu (awal 00:00, akhir 23:59:59 waktu lokal), dikirim sebagai ISO. */
function paramKustom(dr: string, sp: string, perPage: number, page: number) {
  return {
    dari: dr ? new Date(`${dr}T00:00:00`).toISOString() : undefined,
    sampai: sp ? new Date(`${sp}T23:59:59`).toISOString() : undefined,
    per_page: perPage,
    page,
  }
}
