import clsx from 'clsx'
import { Ikon, type NamaIkon } from '../Ikon'
import { relatif } from '../../lib/waktu'
import {
  PARAMS,
  angkaId,
  nilaiAngka,
  statusNilai,
  type Ambang,
  type KunciSensor,
  type StatusNilai,
  type TitikSeri,
} from '../../lib/sensorLaporan'

const IKON: Record<KunciSensor, NamaIkon> = {
  ph: 'ph',
  waterTemp: 'suhu',
  tds: 'kalibrasi',
  airTemp: 'matahari',
  humidity: 'tetes',
}

const CHIP: Record<StatusNilai, { kelas: string; teks: string }> = {
  normal: { kelas: 'is-normal', teks: 'Normal' },
  rendah: { kelas: 'is-luar', teks: 'Terlalu rendah' },
  tinggi: { kelas: 'is-luar', teks: 'Terlalu tinggi' },
  kosong: { kelas: 'is-kosong', teks: 'Belum ada data' },
}

/**
 * Lima nilai terbaru. Tiap kartu juga tombol pilih: yang aktif punya grafiknya sendiri di bawah.
 * Status memakai teks + warna (bukan warna saja).
 */
export function KartuNilai({
  terakhir,
  ambang,
  terpilih,
  onToggle,
  kini,
  memuat,
}: {
  terakhir: Record<KunciSensor, TitikSeri | null>
  ambang: Ambang
  terpilih: KunciSensor[]
  onToggle: (k: KunciSensor) => void
  kini: number
  memuat: boolean
}) {
  return (
    <div role="group" aria-label="Pilih sensor untuk grafik" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {PARAMS.map((p) => {
        if (memuat && !terakhir[p.kunci]) return <div key={p.kunci} className="vsf-skeleton h-[136px] rounded-card" />
        const t = terakhir[p.kunci]
        const batas = ambang?.[p.kunci]
        const s = statusNilai(t?.y ?? null, batas)
        const aktif = terpilih.includes(p.kunci)
        const min = nilaiAngka(batas?.min)
        const maks = nilaiAngka(batas?.max)
        return (
          <button
            key={p.kunci}
            type="button"
            aria-pressed={aktif}
            onClick={() => onToggle(p.kunci)}
            className={clsx('vsf-nilai vsf-kpi-kaca max-sm:last:col-span-2', aktif && 'is-aktif')}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="vsf-label flex items-center gap-1.5 !text-tinta">
                <Ikon nama={IKON[p.kunci]} className="h-4 w-4" />
                {p.label}
              </span>
              {aktif && <Ikon nama="centang" className="h-4 w-4 text-arutmin-forest" />}
            </span>
            <span className="mt-2 flex items-baseline gap-1">
              <span className="font-heading text-[28px] font-bold leading-none tabular-nums text-tinta">
                {t ? angkaId(t.y, p.digit) : '—'}
              </span>
              {p.satuan && <span className="text-[13px] text-abu">{p.satuan}</span>}
            </span>
            <span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className={clsx('vsf-chip-nilai', CHIP[s].kelas)}>{CHIP[s].teks}</span>
              {t && kini > 0 && <span className="text-[12px] text-abu">{relatif(Math.max(0, kini - t.t))}</span>}
            </span>
            {(min !== null || maks !== null) && (
              <span className="mt-1 text-[12px] text-abu">
                Aman {min !== null ? angkaId(min, p.digit) : '…'}–{maks !== null ? angkaId(maks, p.digit) : '…'}
                {p.satuan ? ` ${p.satuan}` : ''}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
