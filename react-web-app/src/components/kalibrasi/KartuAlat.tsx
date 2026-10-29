import { useState } from 'react'
import clsx from 'clsx'
import { Ikon } from '../Ikon'
import { adalahSensor, jadwalTeks, n, STATUS, teksTenggat, tgl, urutKonstanta, type Alat, type Terkini } from '../../lib/kalibrasi'

function bacaanLive(a: Alat, t: Terkini | null): string | null {
  const s = t?.sensor
  if (!s) return null
  if (a.sensor === 'ph' && s.ph != null) return `pH ${n(s.ph)} sekarang`
  if (a.sensor === 'ec' && s.tds != null) return `TDS ${n(s.tds, 0)} ppm sekarang`
  if (a.sensor === 'suhu_air' && s.waterTemp != null) return `${n(s.waterTemp, 1)} °C sekarang`
  if (a.sensor === 'suhu_udara' && s.airTemp != null) return `${n(s.airTemp, 1)} °C sekarang`
  return null
}

/** Satu alat: status + tenggat di muka, metode/toleransi/firmware di blok Detail. Kartu tint (sudah di dalam halaman kaca). */
export function KartuAlat({
  a,
  terkini,
  bolehTulis,
  onCatat,
  onRiwayat,
  onAtur,
}: {
  a: Alat
  terkini: Terkini | null
  bolehTulis: boolean
  onCatat: () => void
  onRiwayat: () => void
  onAtur: () => void
}) {
  const [buka, setBuka] = useState(false)
  const live = bacaanLive(a, terkini)
  const tombol = 'min-h-[44px] sm:min-h-[38px] px-3 py-1 text-[13px]'
  return (
    <article className={clsx('vsf-batch', a.status === 'terlambat' && 'is-lock')}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[16px] font-bold text-tinta">{a.label ?? a.sensor}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-abu">
            <Ikon nama={adalahSensor(a) ? 'sensor' : 'dosing'} className="h-3.5 w-3.5" />
            {a.perangkat_kode ? (
              <span className="inline-flex items-center gap-1.5">
                <span className={clsx('h-2 w-2 rounded-full', a.perangkat_online ? 'bg-moss' : 'bg-slate-400')} aria-hidden />
                {a.perangkat_nama ?? a.perangkat_kode}
              </span>
            ) : (
              'Diukur manual'
            )}
            {live && <span className="font-semibold text-tinta">· {live}</span>}
          </div>
        </div>
        <span className={clsx('vsf-pill shrink-0', STATUS[a.status].kelas)}>{STATUS[a.status].label}</span>
      </div>

      <div className="mt-3 text-[14px] font-semibold text-tinta">{teksTenggat(a)}</div>
      <div className="text-[12px] text-abu">
        Terakhir {tgl(a.terakhir_dikalibrasi)}
        {a.log_terakhir?.oleh_label ? ` · ${a.log_terakhir.oleh_label}` : ''}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {bolehTulis && (
          <button type="button" className={clsx('vsf-btn-primary', tombol)} onClick={onCatat}>
            Catat kalibrasi
          </button>
        )}
        <button type="button" className={clsx('vsf-btn-secondary', tombol)} onClick={onRiwayat}>
          Riwayat
        </button>
        {bolehTulis && (
          <button type="button" className={clsx('vsf-btn-secondary', tombol)} onClick={onAtur}>
            Atur
          </button>
        )}
        <button
          type="button"
          className={clsx('vsf-btn-secondary ml-auto inline-flex items-center gap-1', tombol)}
          aria-expanded={buka}
          onClick={() => setBuka((b) => !b)}
        >
          Detail
          <Ikon nama="bawah" className={clsx('h-4 w-4 transition-transform', buka && 'rotate-180')} />
        </button>
      </div>

      {buka && (
        <dl className="vsf-kal-blok mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 p-3 text-[13px]">
          <dt className="text-abu">Metode</dt>
          <dd className="text-tinta">{a.metode}</dd>
          {a.larutan_ref && (
            <>
              <dt className="text-abu">Referensi</dt>
              <dd className="text-tinta">{a.larutan_ref}</dd>
            </>
          )}
          <dt className="text-abu">Jadwal</dt>
          <dd className="text-tinta">{jadwalTeks(a)}</dd>
          {a.toleransi != null && (
            <>
              <dt className="text-abu">Toleransi</dt>
              <dd className="text-tinta">± {n(a.toleransi)} {a.satuan ?? ''}</dd>
            </>
          )}
          {a.konstanta && (
            <>
              <dt className="text-abu">Firmware</dt>
              <dd className="font-mono text-[12px] text-tinta">{urutKonstanta(a.konstanta).map(([k, v]) => `${k} = ${v}`).join(' · ')}</dd>
            </>
          )}
        </dl>
      )}
    </article>
  )
}
