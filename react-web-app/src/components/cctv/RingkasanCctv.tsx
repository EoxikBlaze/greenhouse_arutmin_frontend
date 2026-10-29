import { Ikon } from '../Ikon'

/** Atas halaman CCTV: judul, tombol Tambah (admin), dan tiga angka. */
export function RingkasanCctv({
  total,
  aktif,
  terputus,
  memuat,
  kelola,
  onTambah,
}: {
  total: number
  aktif: number
  terputus: number
  memuat: boolean
  kelola: boolean
  onTambah: () => void
}) {
  const angka: Array<[string, number, string]> = [
    ['Total kamera', total, 'terdaftar'],
    ['Aktif', aktif, 'menayangkan feed'],
    ['Terputus', terputus, 'tidak merespons'],
  ]
  return (
    <section aria-label="Ringkasan CCTV" className="vsf-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0">
          <div className="vsf-judul-bagian">CCTV greenhouse</div>
          <p className="mt-0.5 text-[13px] text-abu">Pantau greenhouse, nursery, dan area tandon.</p>
        </div>
        {kelola && (
          <button type="button" className="vsf-btn-primary w-full sm:ml-auto sm:w-auto" onClick={onTambah}>
            <Ikon nama="tambah" />
            Tambah kamera
          </button>
        )}
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
        {angka.map(([label, nilai, ket]) => (
          <div key={label} className="vsf-stat">
            <dt className="vsf-label vsf-label-tinta">{label}</dt>
            <dd className="mt-1 font-heading text-[26px] font-bold leading-none tabular-nums text-tinta">{memuat ? '–' : nilai}</dd>
            <dd className="mt-1 text-[12px] text-abu">{ket}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
