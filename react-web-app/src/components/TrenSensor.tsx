import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { PARAMS, nilaiAngka, seriParam, type Ambang, type DefParam, type KunciSensor, type Titik } from '../lib/sensorLaporan'
import { HARI_BAWAAN, TAB_TREN, type TabGrafik } from '../lib/tabSensor'
import { PanelGrafik } from './sensor/PanelGrafik'
import { PanelNutrisiSensor } from './sensor/PanelNutrisiSensor'
import { Segmen } from './sensor/FilterBar'

const HARI = 86_400_000
const SENSOR: Record<Exclude<TabGrafik, 'semua' | 'nutrisi'>, KunciSensor> = { ph: 'ph', waterTemp: 'waterTemp', airTemp: 'airTemp', humidity: 'humidity' }

/**
 * Kartu "Tren sensor" di Dashboard — grafik yang SAMA dengan halaman Sensor (data /monitoring/riwayat, tab, batas aman,
 * garis target nutrisi), hanya satu sensor sekali tampil. "Lihat selengkapnya" membuka Sensor pada tab yang sedang dipilih.
 */
export function TrenSensor({ ambang }: { ambang: Ambang }) {
  const [tab, setTab] = useState<Exclude<TabGrafik, 'semua'>>('ph')
  const [titik, setTitik] = useState<Titik[] | null>(null)
  const [galat, setGalat] = useState<string | null>(null)

  useEffect(() => {
    let batal = false
    const ambil = () => {
      const sampai = Date.now()
      api
        .get('/monitoring/riwayat', { params: { dari: new Date(sampai - HARI_BAWAAN * HARI).toISOString(), sampai: new Date(sampai).toISOString() } })
        .then((res) => {
          if (batal) return
          setTitik(((res.data as { titik?: Titik[] })?.titik ?? []) as Titik[])
          setGalat(null)
        })
        .catch(() => {
          if (!batal) setGalat('Grafik belum bisa dimuat.')
        })
    }
    ambil()
    const id = setInterval(ambil, 60_000)
    return () => {
      batal = true
      clearInterval(id)
    }
  }, [])

  const seri = useMemo(
    () => Object.fromEntries(PARAMS.map((p) => [p.kunci, seriParam(titik ?? [], p.kunci)])) as Record<KunciSensor, ReturnType<typeof seriParam>>,
    [titik],
  )

  const sensor = tab !== 'nutrisi' ? SENSOR[tab] : null
  const def = sensor ? (PARAMS.find((p) => p.kunci === sensor) as DefParam) : null

  return (
    <section className="vsf-card flex h-full flex-col p-4 sm:p-5" aria-label="Tren sensor">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="vsf-judul-bagian">Tren Sensor</div>
          <div className="text-[12px] text-abu">{HARI_BAWAAN} hari terakhir · sama dengan halaman Sensor</div>
        </div>
        <Link
          to={`/sensor-realtime?tab=${tab}`}
          className="inline-flex min-h-[32px] items-center px-1 text-[13px] font-semibold text-arutmin-forest underline underline-offset-2 hover:text-arutmin-moss"
        >
          Lihat selengkapnya →
        </Link>
      </div>

      <div className="mt-3 max-w-full overflow-x-auto">
        <Segmen label="Sensor yang ditampilkan" pilihan={TAB_TREN.map((t) => t.label)} nilai={TAB_TREN.find((t) => t.id === tab)?.label ?? 'pH'} onPilih={(lbl) => setTab((TAB_TREN.find((t) => t.label === lbl)?.id ?? 'ph') as Exclude<TabGrafik, 'semua'>)} />
      </div>

      <div className="mt-3 flex-1">
        {titik === null && !galat ? (
          <div className="vsf-skeleton h-[250px] rounded-card" role="status" aria-label="Memuat grafik" />
        ) : galat ? (
          <p className="grid min-h-[200px] place-items-center rounded-card bg-white/50 text-[13px] text-abu">{galat}</p>
        ) : tab === 'nutrisi' ? (
          <PanelNutrisiSensor seriPpm={seri.tds} seriEc={seri.ec_ms_cm} polos />
        ) : def && sensor ? (
          <PanelGrafik def={def} seri={seri[sensor]} batas={{ min: nilaiAngka(ambang?.[sensor]?.min), max: nilaiAngka(ambang?.[sensor]?.max) }} polos />
        ) : null}
      </div>
    </section>
  )
}
