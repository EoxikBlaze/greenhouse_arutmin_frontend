import { useState } from 'react'
import clsx from 'clsx'
import { Ikon } from './Ikon'
import { relatif } from '../lib/waktu'

/** Bagian /dashboard yang dipakai strip konteks Asisten AI. */
export type KonteksKebun = {
  iotStatus?: { online?: boolean; seconds_ago?: number | null; last_seen?: string | null } | null
  latest_sensor?: { ph?: number | null; tds?: number | null } | null
  water_control?: { valve_state?: string | null; mode?: string | null } | null
}

/** Data yang benar-benar dibaca asisten (routes/ai.js). */
const SUMBER_DATA = ['Sensor terakhir', 'Ambang sensor', 'Alert terbuka', 'Penampung & dosing', 'Tahap tanam', 'Panen terakhir']

function angka(v: number | null | undefined, digit: number): string {
  return typeof v === 'number' && Number.isFinite(v) ? v.toFixed(digit) : '—'
}

/**
 * Strip satu baris di atas chat: status alat, umur bacaan terakhir, pH/TDS, katup.
 * Tujuannya satu: pengguna tahu seberapa segar data yang dibaca asisten sebelum bertanya.
 */
export function StripKonteks({ data, memuat }: { data: KonteksKebun | null; memuat: boolean }) {
  const [info, setInfo] = useState(false)
  const iot = data?.iotStatus ?? null
  const online = iot?.online
  const umur = iot?.seconds_ago != null ? relatif(iot.seconds_ago * 1000) : null
  const sensor = data?.latest_sensor ?? null
  const katup = data?.water_control?.valve_state ?? null

  return (
    <section aria-label="Konteks data asisten" className="vsf-card px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px]">
        {memuat && !data ? (
          <div className="vsf-skeleton h-5 w-64 max-w-full" role="status" aria-label="Memuat konteks" />
        ) : (
          <>
            <span className="inline-flex items-center gap-2 font-semibold text-tinta">
              <span
                aria-hidden
                className={clsx('h-2.5 w-2.5 rounded-full', online ? 'bg-arutmin-moss vsf-dot' : 'bg-arutmin-error')}
              />
              {online == null ? 'Status alat —' : online ? 'Alat terhubung' : 'Alat terputus'}
            </span>
            <span className="text-abu">Data {umur ?? 'belum ada'}</span>
            <span className="text-abu">
              pH <b className="tabular-nums text-tinta">{angka(sensor?.ph, 2)}</b>
            </span>
            <span className="text-abu">
              TDS <b className="tabular-nums text-tinta">{angka(sensor?.tds, 0)}</b> ppm
            </span>
            {katup && (
              <span className="text-abu">
                Katup <b className="text-tinta">{katup}</b>
              </span>
            )}
          </>
        )}
        <button
          type="button"
          className="vsf-chrome-tautan ml-auto vsf-ikon-btn"
          aria-expanded={info}
          aria-controls="vsf-sumber-data"
          aria-label="Data yang dibaca asisten"
          onClick={() => setInfo((v) => !v)}
        >
          <Ikon nama="info" className="h-[18px] w-[18px]" />
        </button>
      </div>
      {info && (
        <div id="vsf-sumber-data" className="mt-3 border-t border-white/50 pt-3">
          <ul className="flex flex-wrap gap-1.5">
            {SUMBER_DATA.map((k) => (
              <li key={k} className="rounded-full bg-white/60 px-2.5 py-1 text-[12px] font-semibold text-tinta">
                {k}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[12px] leading-relaxed text-abu">
            Bila AI lokal mati, jawaban memakai aturan tetap dan alasannya ditampilkan apa adanya.
          </p>
        </div>
      )}
    </section>
  )
}
