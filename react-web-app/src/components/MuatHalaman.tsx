/** Cadangan ringan selama potongan kode halaman (lazy) diunduh. */
export function MuatHalaman() {
  return (
    <div className="vsf-halaman" role="status" aria-label="Memuat halaman">
      <div className="vsf-card p-4 sm:p-6">
        <div className="vsf-skeleton h-7 w-1/3" />
        <div className="vsf-skeleton mt-4 h-4 w-2/3" />
        <div className="vsf-skeleton mt-2 h-4 w-1/2" />
      </div>
    </div>
  )
}
