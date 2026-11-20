import type { ReactNode } from 'react'
import { Ikon } from '../Ikon'
import { Segmen } from './FilterBar'
import { DAFTAR_RENTANG, type Rentang } from '../../lib/riwayatSensor'

/**
 * Satu-satunya pengatur waktu halaman Sensor: berlaku untuk grafik, riwayat bacaan, dan unduhan CSV.
 * "Pilih tanggal" = satu hari (dari = sampai) atau rentang, maks 92 hari; tombol ‹ › menggeser sepanjang rentangnya.
 */
export function RentangRiwayat({
  rentang, onRentang, dari, sampai, onDari, onSampai, onTerapkan, onGeser, bisaBerikutnya, galat, meta,
}: {
  rentang: Rentang
  onRentang: (r: Rentang) => void
  dari: string
  sampai: string
  onDari: (v: string) => void
  onSampai: (v: string) => void
  onTerapkan: () => void
  onGeser: (arah: -1 | 1) => void
  bisaBerikutnya: boolean
  galat: string | null
  meta?: ReactNode
}) {
  return (
    <section aria-label="Rentang waktu" className="vsf-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="vsf-judul-bagian mr-1">Rentang waktu</div>
        <Segmen label="Rentang waktu" pilihan={DAFTAR_RENTANG} nilai={rentang} onPilih={onRentang} />
      </div>

      {rentang === 'Pilih tanggal' && (
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <button type="button" className="vsf-btn-secondary" aria-label="Rentang sebelumnya" onClick={() => onGeser(-1)}>
            ‹ Sebelumnya
          </button>
          <label className="grid gap-1">
            <span className="vsf-label">Dari tanggal</span>
            <input type="date" className="vsf-input w-[170px]" value={dari} max={sampai || undefined} onChange={(e) => onDari(e.target.value)} />
          </label>
          <label className="grid gap-1">
            <span className="vsf-label">Sampai tanggal</span>
            <input type="date" className="vsf-input w-[170px]" value={sampai} min={dari || undefined} onChange={(e) => onSampai(e.target.value)} />
          </label>
          <button type="button" className="vsf-btn-secondary" onClick={onTerapkan}>
            Terapkan
          </button>
          <button type="button" className="vsf-btn-secondary" aria-label="Rentang berikutnya" disabled={!bisaBerikutnya} onClick={() => onGeser(1)}>
            Berikutnya ›
          </button>
        </div>
      )}

      {galat && (
        <div role="alert" className="vsf-banner vsf-tone-error mt-3 flex items-start gap-2 rounded-input px-3 py-2 text-[13px]">
          <Ikon nama="salah" className="mt-[2px] h-4 w-4" />
          <span>{galat}</span>
        </div>
      )}
      {meta && <div className="mt-3 text-[12px] text-abu">{meta}</div>}
    </section>
  )
}
