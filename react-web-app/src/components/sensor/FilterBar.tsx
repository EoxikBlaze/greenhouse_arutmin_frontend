import type { ReactNode } from 'react'
import { Ikon } from '../Ikon'

export type Rentang = '6 Jam' | '24 Jam' | '7 Hari' | 'Kustom'

const PRESET: Rentang[] = ['6 Jam', '24 Jam', '7 Hari']

/** Kontrol segmen: satu pilihan aktif, bisa dioperasikan panah/tab (radiogroup). */
export function Segmen<T extends string>({
  label,
  pilihan,
  nilai,
  onPilih,
}: {
  label: string
  pilihan: readonly T[]
  nilai: T
  onPilih: (v: T) => void
}) {
  return (
    <div role="radiogroup" aria-label={label} className="vsf-segmen">
      {pilihan.map((p) => (
        <button key={p} type="button" role="radio" aria-checked={nilai === p} onClick={() => onPilih(p)}>
          {p}
        </button>
      ))}
    </div>
  )
}

/** Filter rentang waktu + tombol Unduh Laporan. Rentang yang dipilih berlaku untuk grafik, tabel, dan laporan. */
export function FilterBar({
  rentang,
  onRentang,
  bolehKustom,
  dari,
  sampai,
  onDari,
  onSampai,
  onTerapkan,
  memuatKustom,
  galatKustom,
  bolehUnduh,
  bisaUnduh,
  mengunduh,
  onUnduh,
  galatUnduh,
  meta,
}: {
  rentang: Rentang
  onRentang: (r: Rentang) => void
  bolehKustom: boolean
  dari: string
  sampai: string
  onDari: (v: string) => void
  onSampai: (v: string) => void
  onTerapkan: () => void
  memuatKustom: boolean
  galatKustom: string | null
  bolehUnduh: boolean
  bisaUnduh: boolean
  mengunduh: boolean
  onUnduh: () => void
  galatUnduh: string | null
  meta?: ReactNode
}) {
  return (
    <section aria-label="Filter data" className="vsf-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="vsf-judul-bagian mr-1">Rentang waktu</div>
        <Segmen
          label="Rentang waktu"
          pilihan={bolehKustom ? [...PRESET, 'Kustom'] : PRESET}
          nilai={rentang}
          onPilih={onRentang}
        />
        {bolehUnduh && (
          <button
            type="button"
            className="vsf-btn-primary ml-auto"
            disabled={!bisaUnduh || mengunduh}
            onClick={onUnduh}
          >
            {mengunduh ? <span className="vsf-spinner" /> : <Ikon nama="unduh" />}
            {mengunduh ? 'Menyiapkan…' : 'Unduh Laporan'}
          </button>
        )}
      </div>

      {rentang === 'Kustom' && (
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="grid gap-1">
            <span className="vsf-label">Dari tanggal</span>
            <input
              type="date"
              className="vsf-input w-[180px]"
              value={dari}
              max={sampai || undefined}
              onChange={(e) => onDari(e.target.value)}
            />
          </label>
          <label className="grid gap-1">
            <span className="vsf-label">Sampai tanggal</span>
            <input
              type="date"
              className="vsf-input w-[180px]"
              value={sampai}
              min={dari || undefined}
              onChange={(e) => onSampai(e.target.value)}
            />
          </label>
          <button type="button" className="vsf-btn-secondary" disabled={memuatKustom} onClick={onTerapkan}>
            {memuatKustom && <span className="vsf-spinner vsf-spinner-dark" />}
            {memuatKustom ? 'Memuat…' : 'Terapkan'}
          </button>
        </div>
      )}

      {galatKustom && (
        <div role="alert" className="vsf-banner vsf-tone-error mt-3 flex items-start gap-2 rounded-input px-3 py-2 text-[13px]">
          <Ikon nama="salah" className="mt-[2px] h-4 w-4" />
          <span>{galatKustom}</span>
        </div>
      )}
      {galatUnduh && (
        <div role="alert" className="vsf-banner vsf-tone-error mt-3 flex items-start gap-2 rounded-input px-3 py-2 text-[13px]">
          <Ikon nama="salah" className="mt-[2px] h-4 w-4" />
          <span>{galatUnduh}</span>
        </div>
      )}
      {meta && <div className="mt-3 text-[12px] text-abu">{meta}</div>}
    </section>
  )
}
