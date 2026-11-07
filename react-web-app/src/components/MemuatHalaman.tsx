/**
 * Pemuat halaman (Suspense fallback): logo KKN di tengah dengan cincin kaca berputar.
 * Muncul setelah jeda singkat (CSS animation-delay) supaya pindah halaman yang cepat tidak berkedip.
 * Hanya transform/opacity yang beranimasi (murah); mode ringan & reduced-motion = diam.
 */
export function MemuatHalaman() {
  return (
    <div className="vsf-memuat" role="status" aria-live="polite">
      <div className="vsf-memuat-logo">
        <span aria-hidden className="vsf-memuat-cincin" />
        <img src="/logo/kkn.webp" alt="" width={56} height={56} decoding="async" />
      </div>
      <span className="vsf-memuat-teks">Memuat halaman…</span>
    </div>
  )
}
