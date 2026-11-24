import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApiObject } from '../../lib/useApiObject'
import { angkaId } from '../../lib/format'
import { PARAMS, type DefParam, type TitikSeri } from '../../lib/sensorLaporan'
import type { DataNutrisi } from '../../lib/nutrisiGrafik'
import type { Penanda } from '../../lib/analisis'
import { PanelGrafik } from './PanelGrafik'
import { Segmen } from './FilterBar'

const SATUAN = ['ppm', 'EC (mS/cm)'] as const
const DEF_PPM = PARAMS.find((p) => p.kunci === 'tds') as DefParam
const DEF_EC = PARAMS.find((p) => p.kunci === 'ec_ms_cm') as DefParam

/**
 * Tab Nutrisi di halaman Sensor: bacaan sensor saja, bentuknya sama dengan grafik lain. Satuan bisa ppm atau EC
 * (ppm = EC × 500, bacaan yang sama). Bila ada batch berjalan, SATU garis putus-putus menunjukkan target hari ini.
 * Target lengkap, rencana, dan penanda dosing ada di Kebun Saya.
 */
export function PanelNutrisiSensor({ seriPpm, seriEc, polos = false, penanda = [] }: { seriPpm: TitikSeri[]; seriEc: TitikSeri[]; polos?: boolean; penanda?: Penanda[] }) {
  const [satuan, setSatuan] = useState<(typeof SATUAN)[number]>('ppm')
  const { data } = useApiObject<DataNutrisi>('/monitoring/nutrisi?hari=1', { pollMs: 60_000 })
  const target = data?.hari_ini?.target_batch ?? null
  const ppm = satuan === 'ppm'
  const acuan =
    target != null && Number.isFinite(target)
      ? { nilai: ppm ? target : target / 500, teks: `Target hari ini ${ppm ? `${angkaId(target, 0)} ppm` : `${angkaId(target / 500, 2)} mS/cm`}` }
      : null
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Segmen label="Satuan nutrisi" pilihan={SATUAN} nilai={satuan} onPilih={setSatuan} />
        <span className="text-[12px] text-abu">ppm = EC × 500: dua satuan untuk bacaan yang sama.</span>
      </div>
      <PanelGrafik def={ppm ? DEF_PPM : DEF_EC} seri={ppm ? seriPpm : seriEc} batas={{ min: null, max: null }} acuan={acuan} polos={polos} penanda={penanda} />
      <p className="text-[12px] text-abu">
        Garis target muncul saat ada batch berjalan.{' '}
        <Link to="/tanam" className="font-semibold text-arutmin-forest underline underline-offset-2">
          Target, rencana, dan dosing lengkap di Kebun Saya →
        </Link>
      </p>
    </div>
  )
}
