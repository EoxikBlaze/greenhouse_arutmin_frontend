import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../lib/api'
import { useApiError, useApiList } from '../lib/crudApi'
import { useApiObject } from '../lib/useApiObject'
import { useAuth } from '../lib/authContext'
import { Ikon } from '../components/Ikon'
import { StripStatus } from '../components/sensor/StripStatus'
import { PanelNutrisiSensor } from '../components/sensor/PanelNutrisiSensor'
import { KartuSaranDosis } from '../components/analitik/KartuSaranDosis'
import type { Penanda } from '../lib/analisis'
import { KartuNilai } from '../components/sensor/KartuNilai'
import { Segmen } from '../components/sensor/FilterBar'
import { RentangRiwayat } from '../components/sensor/RentangRiwayat'
import { PanelGrafik } from '../components/sensor/PanelGrafik'
import { RiwayatBacaan } from '../components/sensor/RiwayatBacaan'
import {
  PARAMS,
  hapusDuplikat,
  nilaiAngka,
  seriParam,
  terakhirPerParam,
  unduhLaporan,
  waktuMs,
  type Ambang,
  type DefParam,
  type KunciSensor,
  type Titik,
} from '../lib/sensorLaporan'
import {
  bacaCsvSensor,
  galatTanggal,
  geserTanggal,
  hitungRentang,
  labelInterval,
  tglJamPendek,
  type Rentang,
  type RentangTanggal,
} from '../lib/riwayatSensor'
import { tanggalIso } from '../lib/format'
import { TAB_GRAFIK, tabDariQuery, type TabGrafik } from '../lib/tabSensor'
import { Link, useSearchParams } from 'react-router-dom'

/** Urutan di tab "Semua"; nutrisi di posisi kedua (kunci khusus, bukan sensor mentah). */
const URUTAN_SEMUA: readonly (KunciSensor | 'nutrisi')[] = ['ph', 'nutrisi', 'waterTemp', 'airTemp', 'humidity']

const OPSI_HALAMAN = [50, 100] as const
const REFRESH_MS = 15_000

type RespRiwayat = { interval_detik: number; titik: Titik[] }
type RespTarik = { data?: Titik[]; total?: number }

function dariAxios(err: unknown): boolean {
  const e = err as { response?: unknown; request?: unknown } | null
  return Boolean(e?.response || e?.request)
}

export default function SensorRealtimePage() {
  const { role } = useAuth()
  const pengelola = role !== 'petani'
  const handleApiError = useApiError()

  // Batas aman per sensor & status alat — sumber yang sama dengan Dashboard.
  const { data: dash } = useApiObject<{ ambang?: Ambang; iotStatus?: { online?: boolean; data_segar?: boolean } | null }>(
    '/dashboard',
    { pollMs: REFRESH_MS },
  )
  const ambang: Ambang = dash?.ambang ?? null

  // Bacaan terbaru (kartu nilai + strip status): 288 titik terakhir, hanya untuk "nilai sekarang".
  const { rows: live, loading, error, reload } = useApiList<Titik>('/monitoring/chart-data')
  const [kini, setKini] = useState(0)
  useEffect(() => {
    const tick = () => {
      setKini(Date.now())
      reload()
    }
    tick()
    const id = setInterval(tick, REFRESH_MS)
    return () => clearInterval(id)
  }, [reload])
  const liveBersih = useMemo(() => hapusDuplikat(live), [live])
  const waktuTerbaru = useMemo(() => {
    const all = live.map(waktuMs).filter((n): n is number => n !== null)
    return all.length ? Math.max(...all) : null
  }, [live])
  const terakhir = useMemo(() => terakhirPerParam(live), [live])

  // Rentang waktu: SATU pengatur untuk grafik, tabel, dan unduhan.
  const [rentang, setRentang] = useState<Rentang>('3 Hari')
  const [dari, setDari] = useState(() => tanggalIso(Date.now()))
  const [sampai, setSampai] = useState(() => tanggalIso(Date.now()))
  const [tglAktif, setTglAktif] = useState<RentangTanggal | null>(null)
  const [galatRentang, setGalatRentang] = useState<string | null>(null)
  const [params] = useSearchParams()
  const [tab, setTab] = useState<TabGrafik>(() => tabDariQuery(params.get('tab')) ?? 'semua')

  const r = useMemo(() => hitungRentang(rentang, tglAktif, kini), [rentang, tglAktif, kini])
  const dariMs = r?.dari ?? null
  const sampaiMs = r?.sampai ?? null

  function pilihRentang(baru: Rentang) {
    setRentang(baru)
    setHalaman(1)
    setGalatRentang(null)
    if (baru === 'Pilih tanggal' && !tglAktif) setTglAktif({ dari, sampai })
  }
  function terapkan() {
    const g = galatTanggal(dari, sampai)
    setGalatRentang(g)
    if (g) return
    setTglAktif({ dari, sampai })
    setHalaman(1)
  }
  function geser(arah: -1 | 1) {
    const dasar = tglAktif ?? { dari, sampai }
    const baru = geserTanggal(dasar, arah)
    setDari(baru.dari)
    setSampai(baru.sampai)
    setGalatRentang(galatTanggal(baru.dari, baru.sampai))
    if (!galatTanggal(baru.dari, baru.sampai)) {
      setTglAktif(baru)
      setHalaman(1)
    }
  }
  const bisaBerikutnya = (tglAktif ?? { dari, sampai }).sampai < tanggalIso(kini || Date.now())

  // Grafik: rata-rata per interval dari server (bukan 288 bacaan terakhir).
  const [riwayat, setRiwayat] = useState<RespRiwayat | null>(null)
  const [galatRiwayat, setGalatRiwayat] = useState<string | null>(null)
  useEffect(() => {
    if (dariMs === null || sampaiMs === null) return
    let batal = false
    api
      .get('/monitoring/riwayat', { params: { dari: new Date(dariMs).toISOString(), sampai: new Date(sampaiMs).toISOString() } })
      .then((res) => {
        if (batal) return
        setRiwayat(res.data as RespRiwayat)
        setGalatRiwayat(null)
      })
      .catch((err) => {
        if (!batal) setGalatRiwayat(handleApiError(err).message)
      })
    return () => {
      batal = true
    }
  }, [dariMs, sampaiMs, handleApiError])

  const titik = useMemo(() => riwayat?.titik ?? [], [riwayat])
  const seri = useMemo(
    () => Object.fromEntries(PARAMS.map((p) => [p.kunci, seriParam(titik, p.kunci)])) as Record<KunciSensor, ReturnType<typeof seriParam>>,
    [titik],
  )

  // Penanda dosing (kapan alat menyuntik) untuk rentang yang sama; bisa disembunyikan.
  const [tampilDosing, setTampilDosing] = useState(true)
  const [kejadian, setKejadian] = useState<Penanda[]>([])
  useEffect(() => {
    if (dariMs === null || sampaiMs === null) return
    let batal = false
    api
      .get('/api/analisis/dosing-kejadian', { params: { dari: new Date(dariMs).toISOString(), sampai: new Date(sampaiMs).toISOString() } })
      .then((res) => {
        if (!batal) setKejadian(((res.data as { kejadian?: Penanda[] })?.kejadian ?? []) as Penanda[])
      })
      .catch(() => {
        if (!batal) setKejadian([])
      })
    return () => {
      batal = true
    }
  }, [dariMs, sampaiMs])
  const penanda = tampilDosing ? kejadian : []

  // Tabel riwayat (pengelola): halaman bernomor dari server, dengan jumlah total.
  const [halaman, setHalaman] = useState(1)
  const [perHal, setPerHal] = useState<number>(OPSI_HALAMAN[0])
  const [tabel, setTabel] = useState<{ rows: Titik[]; total: number } | null>(null)
  const [muatTabel, setMuatTabel] = useState(false)
  const [galatTabel, setGalatTabel] = useState<string | null>(null)
  // Rentang yang berakhir "sekarang" terus bergeser; di halaman > 1 batas akhirnya dibekukan agar baris tidak berpindah saat dibaca.
  const sampaiBeku = useRef<number | null>(null)
  useEffect(() => {
    if (!pengelola || dariMs === null || sampaiMs === null) return
    if (halaman === 1 || sampaiBeku.current === null) sampaiBeku.current = sampaiMs
    const akhir = sampaiBeku.current
    let batal = false
    setMuatTabel(true)
    api
      .get('/monitoring/tarik', { params: { dari: new Date(dariMs).toISOString(), sampai: new Date(akhir).toISOString(), per_page: perHal, page: halaman } })
      .then((res) => {
        if (batal) return
        const d = (res.data ?? {}) as RespTarik
        setTabel({ rows: Array.isArray(d.data) ? d.data : [], total: Number(d.total) || 0 })
        setGalatTabel(null)
      })
      .catch((err) => {
        if (!batal) setGalatTabel(handleApiError(err).message)
      })
      .finally(() => {
        if (!batal) setMuatTabel(false)
      })
    return () => {
      batal = true
    }
  }, [pengelola, dariMs, sampaiMs, halaman, perHal, handleApiError])

  // Unduh CSV (pengelola): server membatasi 5.000 bacaan terbaru dan memberi tanda bila terpotong.
  const [mengunduh, setMengunduh] = useState(false)
  const [mencetak, setMencetak] = useState(false)
  const [galatUnduh, setGalatUnduh] = useState<string | null>(null)
  const [infoUnduh, setInfoUnduh] = useState<string | null>(null)
  async function unduh() {
    if (mengunduh || dariMs === null || sampaiMs === null) return
    setMengunduh(true)
    setGalatUnduh(null)
    setInfoUnduh(null)
    try {
      const res = await api.get('/monitoring/tarik/csv', {
        params: { dari: new Date(dariMs).toISOString(), sampai: new Date(sampaiMs).toISOString() },
        responseType: 'blob',
      })
      const url = URL.createObjectURL(res.data as Blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `sensor_${tanggalIso(dariMs)}_${tanggalIso(sampaiMs)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      if (String(res.headers['x-terpotong']) === '1') {
        setInfoUnduh('Berkas hanya memuat 5.000 bacaan terbaru pada rentang ini. Persempit rentang untuk mengunduh data yang lebih lama.')
      }
    } catch (err) {
      setGalatUnduh(dariAxios(err) ? handleApiError(err).message : 'Unduhan gagal. Coba lagi.')
    } finally {
      setMengunduh(false)
    }
  }

  // Cetak laporan (xlsx berformat: ringkasan, statistik, bacaan): bacaan mentah dari endpoint CSV, maks 5.000 terbaru.
  async function cetak() {
    if (mencetak || mengunduh || dariMs === null || sampaiMs === null) return
    setMencetak(true)
    setGalatUnduh(null)
    setInfoUnduh(null)
    try {
      const res = await api.get('/monitoring/tarik/csv', {
        params: { dari: new Date(dariMs).toISOString(), sampai: new Date(sampaiMs).toISOString() },
        responseType: 'blob',
      })
      const rows = bacaCsvSensor(await (res.data as Blob).text())
      if (!rows.length) {
        setGalatUnduh('Tidak ada bacaan pada rentang ini, jadi belum ada yang bisa dilaporkan.')
        return
      }
      await unduhLaporan({
        rows,
        ambang,
        periode: `${rentang} (${tglJamPendek(dariMs)} – ${tglJamPendek(sampaiMs)})`,
        dibuat: Date.now(),
        terpotong: String(res.headers['x-terpotong']) === '1',
        dari: dariMs,
        sampai: sampaiMs,
      })
      if (String(res.headers['x-terpotong']) === '1') setInfoUnduh('Laporan hanya memuat 5.000 bacaan terbaru pada rentang ini. Persempit rentang untuk data yang lebih lama.')
    } catch (err) {
      setGalatUnduh(dariAxios(err) ? handleApiError(err).message : 'Laporan gagal dibuat. Coba lagi.')
    } finally {
      setMencetak(false)
    }
  }

  const tabAktif = TAB_GRAFIK.find((t) => t.id === tab) ?? TAB_GRAFIK[0]
  const kartuTerpilih: KunciSensor[] = tab === 'semua' ? [] : tab === 'nutrisi' ? ['tds', 'ec_ms_cm'] : [tab]

  const panelSensor = (p: DefParam) => (
    <PanelGrafik key={p.kunci} def={p} seri={seri[p.kunci]} batas={{ min: nilaiAngka(ambang?.[p.kunci]?.min), max: nilaiAngka(ambang?.[p.kunci]?.max) }} penanda={penanda} />
  )
  const tampilkan = (k: KunciSensor | 'nutrisi') =>
    k === 'nutrisi' ? <PanelNutrisiSensor key="nutrisi" seriPpm={seri.tds} seriEc={seri.ec_ms_cm} penanda={penanda} /> : panelSensor(PARAMS.find((p) => p.kunci === k) as DefParam)

  const adaGrafik = titik.length > 0
  const semuaKosong = !loading && live.length === 0
  const memuatGrafik = riwayat === null && !galatRiwayat

  return (
    <div className="vsf-halaman vsf-stagger">
      <StripStatus
        alatOnline={dash?.iotStatus?.online ?? null}
        dataSegar={dash?.iotStatus?.data_segar ?? null}
        waktuTerbaru={waktuTerbaru}
        kini={kini}
        memuat={loading}
        jumlah={liveBersih.rows.length}
        kembar={liveBersih.dibuang}
      />

      {error && live.length === 0 && (
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

      <KartuNilai
        waktuTerbaru={waktuTerbaru}
        terakhir={terakhir}
        ambang={ambang}
        terpilih={kartuTerpilih}
        onToggle={(k) => setTab(k === 'tds' || k === 'ec_ms_cm' ? 'nutrisi' : (k as TabGrafik))}
        kini={kini}
        memuat={loading}
      />

      <RentangRiwayat
        rentang={rentang}
        onRentang={pilihRentang}
        dari={dari}
        sampai={sampai}
        onDari={setDari}
        onSampai={setSampai}
        onTerapkan={terapkan}
        onGeser={geser}
        bisaBerikutnya={bisaBerikutnya}
        galat={galatRentang}
        meta={
          r
            ? `${tglJamPendek(r.dari)} – ${tglJamPendek(r.sampai)}${riwayat ? ` · grafik memakai rata-rata tiap ${labelInterval(riwayat.interval_detik)}` : ''}${r.live ? ' · diperbarui otomatis' : ''}`
            : rentang === 'Pilih tanggal' ? 'Pilih tanggal lalu tekan Terapkan.' : 'Memuat…'
        }
      />

      <p className="text-[13px] text-abu">
        Ingin tahu seberapa stabil kondisi, respons dosing, atau pola harian?{' '}
        <Link to="/asisten-ai?tab=analisis-data" className="font-semibold text-arutmin-forest underline underline-offset-2">Buka Analisis di Asisten AI →</Link>
      </p>

      <KartuSaranDosis />

      <section aria-label="Grafik sensor" className="grid gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Segmen label="Sensor yang ditampilkan" pilihan={TAB_GRAFIK.map((t) => t.label)} nilai={tabAktif.label} onPilih={(lbl) => setTab(TAB_GRAFIK.find((t) => t.label === lbl)?.id ?? 'semua')} />
          <label className="inline-flex min-h-[36px] cursor-pointer items-center gap-2 text-[13px] text-tinta">
            <input type="checkbox" checked={tampilDosing} onChange={(e) => setTampilDosing(e.target.checked)} />
            Tampilkan penanda dosing{kejadian.length > 0 ? ` (${kejadian.length})` : ''}
          </label>
        </div>

        {galatRiwayat && (
          <div role="alert" className="vsf-banner vsf-tone-error flex flex-wrap items-center gap-3 rounded-input px-4 py-3 text-[13px]">
            <span className="flex items-center gap-2">
              <Ikon nama="salah" className="h-4 w-4" />
              {galatRiwayat}
            </span>
          </div>
        )}

        {memuatGrafik ? (
          <div className="vsf-skeleton h-[320px] rounded-card" role="status" aria-label="Memuat grafik" />
        ) : semuaKosong && !adaGrafik ? (
          <section className="vsf-card flex flex-col items-center gap-2 p-8 text-center text-[13px] text-tinta">
            <Ikon nama="kosong" className="h-9 w-9 text-arutmin-olive" />
            <b className="text-[15px]">Belum ada data sensor</b>
            <span>Grafik akan terisi otomatis begitu perangkat mengirim bacaan.</span>
          </section>
        ) : !adaGrafik && tab !== 'nutrisi' && tab !== 'semua' ? (
          <section className="vsf-card flex flex-col items-center gap-2 p-8 text-center text-[13px] text-tinta">
            <Ikon nama="jam" className="h-9 w-9 text-arutmin-olive" />
            <b className="text-[15px]">Belum ada data pada rentang ini</b>
            {rentang !== '7 Hari' && (
              <button type="button" className="vsf-btn-secondary mt-1" onClick={() => pilihRentang('7 Hari')}>
                Lihat 7 Hari
              </button>
            )}
          </section>
        ) : tab === 'semua' ? (
          URUTAN_SEMUA.map((k) => tampilkan(k))
        ) : tab === 'nutrisi' ? (
          tampilkan('nutrisi')
        ) : (
          tampilkan(tab)
        )}
      </section>

      {pengelola && (
        <RiwayatBacaan
          rows={tabel?.rows ?? []}
          total={tabel?.total ?? 0}
          halaman={halaman}
          perHalaman={perHal}
          opsiPerHalaman={OPSI_HALAMAN}
          onPerHalaman={(n) => { setPerHal(n); setHalaman(1) }}
          memuat={muatTabel}
          galat={galatTabel}
          ambang={ambang}
          rentangTeks={r ? `${tglJamPendek(r.dari)} – ${tglJamPendek(r.sampai)} · terbaru di atas` : 'Memuat…'}
          onHalaman={setHalaman}
          bisaUnduh={(tabel?.total ?? 0) > 0}
          mengunduh={mengunduh}
          onUnduh={() => void unduh()}
          mencetak={mencetak}
          onCetak={() => void cetak()}
          galatUnduh={galatUnduh}
          infoUnduh={infoUnduh}
        />
      )}
    </div>
  )
}
