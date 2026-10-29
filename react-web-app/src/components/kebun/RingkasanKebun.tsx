import { Ikon } from '../Ikon'
import { Segmen } from '../sensor/FilterBar'
import { FILTER_TAHAP, type FilterTahap } from '../../lib/kebun'

/** Atas halaman Kebun Saya: tiga angka, filter tahap, pencarian, dan tombol utama. */
export function RingkasanKebun({
  ringkas,
  memuat,
  cari,
  onCari,
  tahap,
  onTahap,
  kelola,
  onMulai,
  onMuat,
}: {
  ringkas: { aktif: number; siap: number; meja: number }
  memuat: boolean
  cari: string
  onCari: (v: string) => void
  tahap: FilterTahap
  onTahap: (t: FilterTahap) => void
  kelola: boolean
  onMulai: () => void
  onMuat: () => void
}) {
  const angka: Array<[string, number, string]> = [
    ['Batch aktif', ringkas.aktif, 'sedang berjalan'],
    ['Siap pindah tahap', ringkas.siap, 'cukup umur'],
    ['Meja terpakai', ringkas.meja, 'meja berbeda'],
  ]
  return (
    <section aria-label="Ringkasan kebun" className="vsf-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0">
          <div className="vsf-judul-bagian">Batch tanam berjalan</div>
          <p className="mt-0.5 text-[13px] text-abu">Semai, peremajaan, dan pendewasaan yang sedang berjalan.</p>
        </div>
        {kelola && (
          <button type="button" className="vsf-btn-primary w-full sm:ml-auto sm:w-auto" onClick={onMulai}>
            <Ikon nama="tambah" />
            Mulai Semai Baru
          </button>
        )}
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
        {angka.map(([label, nilai, ket]) => (
          <div key={label} className="vsf-stat">
            <dt className="vsf-label !text-tinta">{label}</dt>
            <dd className="mt-1 font-heading text-[26px] font-bold leading-none tabular-nums text-tinta">
              {memuat ? '–' : nilai}
            </dd>
            <dd className="mt-1 text-[12px] text-abu">{ket}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Segmen label="Filter tahap" pilihan={FILTER_TAHAP} nilai={tahap} onPilih={onTahap} />
        <label className="relative block w-full sm:ml-auto sm:w-[260px]">
          <span className="sr-only">Cari tanam aktif</span>
          <Ikon nama="cari" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-abu" />
          <input
            type="search"
            className="vsf-input w-full pl-9"
            placeholder="Cari tanaman atau meja"
            value={cari}
            onChange={(e) => onCari(e.target.value)}
          />
        </label>
        <button type="button" className="vsf-btn-secondary" onClick={onMuat}>
          <Ikon nama="siklus" />
          Muat ulang
        </button>
      </div>
    </section>
  )
}
