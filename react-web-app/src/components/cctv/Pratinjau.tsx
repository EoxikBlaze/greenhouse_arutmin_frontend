import { useEffect, useState } from 'react'
import clsx from 'clsx'
import type { Kamera, StatusKamera } from '../../lib/cctv'
import { useSumber } from './useSumber'

const LABEL: Record<StatusKamera, string> = { tayang: 'LIVE', memuat: 'MEMUAT', terputus: 'TERPUTUS', nonaktif: 'MATI' }

/** Tayangan satu kamera 16:9 dengan lencana status dan tombol Coba lagi; dipakai kartu dan popup Perbesar. */
export function Pratinjau({
  k,
  onStatus,
}: {
  k: Kamera
  onStatus?: (id: Kamera['id'], s: StatusKamera) => void
}) {
  const [galatImg, setGalat] = useState(false)
  const [muat, setMuat] = useState(true)
  const [coba, setCoba] = useState(0)
  // Snapshot/RTSP: muat ulang berkala. MJPEG: satu sambungan, coba lagi manual.
  const { src, gagal } = useSumber(k, coba)
  const galat = galatImg || gagal
  const status: StatusKamera = !k.aktif ? 'nonaktif' : galat ? 'terputus' : muat ? 'memuat' : 'tayang'

  useEffect(() => {
    onStatus?.(k.id, status)
  }, [onStatus, k.id, status])
  useEffect(() => () => onStatus?.(k.id, 'nonaktif'), [onStatus, k.id])

  return (
    <div className="relative aspect-video w-full overflow-hidden bg-navy">
      {k.aktif && src ? (
        <img
          key={k.tipe === 'mjpeg' ? coba : 'snap'}
          src={src}
          alt={`Tayangan kamera ${k.nama}`}
          className={clsx('h-full w-full object-cover', (galat || muat) && 'opacity-0')}
          onLoad={() => {
            setGalat(false)
            setMuat(false)
          }}
          onError={() => {
            setGalat(true)
            setMuat(false)
          }}
        />
      ) : null}
      {status !== 'tayang' && (
        <div className="absolute inset-0 grid place-items-center px-4 pt-8 text-center text-[12.5px] text-white/75">
          {status === 'memuat' && <span className="vsf-spinner" aria-label="Memuat tayangan" />}
          {status === 'terputus' && (
            <div>
              <div className="font-bold text-white">Feed terputus</div>
              <div className="mt-1">
                {k.tipe === 'rtsp'
                  ? 'Kamera tidak merespons ke server. Periksa kamera menyala dan URL RTSP-nya.'
                  : 'Periksa kamera dan URL-nya.'}
              </div>
              <button
                type="button"
                className="vsf-btn-secondary mt-3 !min-h-[34px] !text-[12px]"
                onClick={() => {
                  setGalat(false)
                  setMuat(true)
                  setCoba((n) => n + 1)
                }}
              >
                Coba lagi
              </button>
            </div>
          )}
          {status === 'nonaktif' && <div className="font-semibold">Kamera dinonaktifkan</div>}
        </div>
      )}
      <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[12px] font-bold text-white">
        <span
          className={clsx(
            'h-2 w-2 rounded-full',
            status === 'tayang' ? 'bg-red-500' : status === 'terputus' ? 'bg-amber-400' : 'bg-slate-400',
          )}
          aria-hidden
        />
        {LABEL[status]}
      </span>
    </div>
  )
}
