import { AKSI_INFO, URUTAN_AKSI } from '../../lib/audit'

/**
 * Chip filter aksi (filter server). Angka: tanpa filter = isi halaman ini;
 * dengan filter, chip aktif menampilkan total dari server.
 */
export function RingkasanAudit({
  aksi,
  onAksi,
  perAksi,
  total,
}: {
  aksi: string
  onAksi: (a: string) => void
  perAksi: Record<string, number>
  total: number
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2" role="group" aria-label="Filter aksi">
      <button type="button" className="vsf-chip-ringkas" aria-pressed={aksi === ''} onClick={() => onAksi('')}>
        {aksi === '' && <b>{total}</b>} Semua
      </button>
      {URUTAN_AKSI.map((a) => (
        <button
          key={a}
          type="button"
          className="vsf-chip-ringkas"
          aria-pressed={aksi === a}
          onClick={() => onAksi(aksi === a ? '' : a)}
        >
          <b>{aksi === '' ? perAksi[a] : aksi === a ? total : ''}</b> {AKSI_INFO[a].label}
        </button>
      ))}
      {aksi === '' && <span className="text-[12px] text-abu">jumlah per aksi: halaman ini saja</span>}
    </div>
  )
}
