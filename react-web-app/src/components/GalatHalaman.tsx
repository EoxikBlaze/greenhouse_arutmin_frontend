import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom'

/** Penangkap error render/rute — mencegah layar putih; beri jalan keluar. */
export function GalatHalaman() {
  const e = useRouteError()
  const pesan = isRouteErrorResponse(e) ? `${e.status} ${e.statusText}` : e instanceof Error ? e.message : 'Terjadi kesalahan tak terduga.'
  if (import.meta.env.DEV) console.error('[GalatHalaman]', e)
  return (
    <main className="grid min-h-dvh place-items-center bg-navy px-4 text-white">
      <div className="max-w-md text-center">
        <h1 className="font-display text-[24px] font-bold">Halaman bermasalah</h1>
        <p className="mt-2 text-[14px] text-white/75">{pesan}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={() => window.location.reload()} className="rounded-full bg-white px-5 py-2 text-[13px] font-bold text-navy">Muat ulang</button>
          <Link to="/" className="rounded-full border border-white/40 px-5 py-2 text-[13px] font-semibold">Ke beranda</Link>
        </div>
      </div>
    </main>
  )
}
