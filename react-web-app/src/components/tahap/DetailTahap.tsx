import type { ReactNode } from 'react'
import { DialogKaca, Pesan } from '../kaca/DialogKaca'

/**
 * Popup detail satu batch tahap (Semai/Peremajaan/Pendewasaan/Panen): ringkasan angka di atas,
 * daftar isi, riwayat tahap berikutnya, lalu aksi & isian di bawah. Kaca netral lewat DialogKaca.
 */
export function DetailTahap({
  judul,
  sub,
  onTutup,
  sibuk = false,
  memuat = false,
  galat,
  ringkasan,
  isi,
  riwayat,
  children,
  aksi,
}: {
  judul: string
  sub?: ReactNode
  onTutup: () => void
  sibuk?: boolean
  memuat?: boolean
  galat?: string | null
  ringkasan?: Array<[string, ReactNode]>
  isi: Array<[string, ReactNode]>
  riwayat?: Array<[string, ReactNode]>
  children?: ReactNode
  aksi?: ReactNode
}) {
  return (
    <DialogKaca judul={judul} sub={sub} onTutup={onTutup} sibuk={sibuk || memuat} lebar={560}>
      {memuat && (
        <div className="mt-5 grid justify-items-center gap-2 py-6">
          <span className="vsf-spinner vsf-spinner-dark" aria-hidden />
          <span className="text-[13px] text-abu">Memuat detail…</span>
        </div>
      )}

      {!memuat && galat && <Pesan jenis="galat">{galat}</Pesan>}

      {!memuat && !galat && (
        <>
          {ringkasan && (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {ringkasan.map(([k, v]) => (
                <div key={k} className="vsf-batch px-3 py-2.5 text-center">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-abu">{k}</div>
                  <div className="mt-0.5 text-[20px] font-bold tabular-nums text-tinta">{v}</div>
                </div>
              ))}
            </div>
          )}

          <dl className="mt-4 grid gap-2 sm:grid-cols-2">
            {isi.map(([k, v]) => (
              <div key={k} className="vsf-batch px-3 py-2">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-abu">{k}</dt>
                <dd className="mt-0.5 text-[13.5px] font-semibold text-tinta">{v}</dd>
              </div>
            ))}
          </dl>

          {riwayat && (
            <div className="mt-4">
              <div className="vsf-label-tinta">Riwayat tahap berikutnya</div>
              <ol className="mt-2 grid gap-1.5 text-[13px]">
                {riwayat.map(([k, v]) => (
                  <li key={k} className="flex items-center justify-between gap-3 rounded-input bg-white/45 px-3 py-2 ring-1 ring-white/50">
                    <span className="font-semibold text-tinta">{k}</span>
                    <span className="text-right text-abu">{v}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {children}
        </>
      )}

      {aksi && <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-garis pt-4">{aksi}</div>}
    </DialogKaca>
  )
}
