import type { FormEvent, ReactNode } from 'react'
import clsx from 'clsx'
import { useDialog } from '../../lib/useDialog'
import { Ikon } from '../Ikon'
import { ModalBackdrop } from '../ModalBackdrop'

/**
 * Cangkang popup layar Dosing: judul + tombol tutup, fokus & Escape lewat useDialog.
 * Render hanya saat terbuka (pemanggil memakai `{x && <DialogKaca …/>}`).
 */
export function DialogKaca({
  judul,
  sub,
  onTutup,
  sibuk = false,
  lebar = 440,
  onSubmit,
  children,
}: {
  judul: string
  sub?: ReactNode
  onTutup: () => void
  sibuk?: boolean
  lebar?: number
  onSubmit?: () => void
  children: ReactNode
}) {
  const { dialogRef, onKeyDown, backdropProps, closing, handleClose } = useDialog({
    open: true,
    onClose: onTutup,
    closeDisabled: sibuk,
  })
  const isi = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 data-dialog-title tabIndex={-1} className="font-heading text-[20px] font-bold text-tinta outline-none">
            {judul}
          </h2>
          {sub && <p className="mt-0.5 text-[13px] text-abu">{sub}</p>}
        </div>
        <button
          type="button"
          className="vsf-chrome-tautan shrink-0 vsf-ikon-btn"
          aria-label="Tutup"
          disabled={sibuk}
          onClick={handleClose}
        >
          <Ikon nama="tutup" />
        </button>
      </div>
      {children}
    </>
  )
  return (
    <ModalBackdrop onMouseDown={backdropProps.onMouseDown} closing={closing}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={judul}
        style={{ maxWidth: lebar }}
        className={clsx('vsf-modal-card max-h-[90vh] w-full overflow-auto rounded-card bg-white p-5 sm:p-6', closing && 'is-closing')}
        onKeyDown={onKeyDown}
      >
        {onSubmit ? (
          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault()
              onSubmit()
            }}
          >
            {isi}
          </form>
        ) : (
          isi
        )}
      </div>
    </ModalBackdrop>
  )
}

/**
 * Konfirmasi tindakan (menggantikan window.confirm): judul, penjelasan, Batal + Ya.
 * `bahaya` → tombol merah untuk tindakan yang tidak bisa dibatalkan.
 */
export function DialogKonfirmasi({
  judul,
  children,
  ya,
  sibukTeks = 'Memproses…',
  bahaya = false,
  sibuk = false,
  galat,
  onYa,
  onBatal,
}: {
  judul: string
  children: ReactNode
  ya: string
  sibukTeks?: string
  bahaya?: boolean
  sibuk?: boolean
  galat?: string
  onYa: () => void
  onBatal: () => void
}) {
  return (
    <DialogKaca judul={judul} onTutup={onBatal} sibuk={sibuk} lebar={420} onSubmit={onYa}>
      <div className="mt-3 text-[13px] leading-relaxed text-slate-700">{children}</div>
      {galat && <Pesan jenis="galat">{galat}</Pesan>}
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className="vsf-btn-secondary" onClick={onBatal} disabled={sibuk}>
          Batal
        </button>
        <button type="submit" className={bahaya ? 'vsf-btn-danger' : 'vsf-btn-primary'} disabled={sibuk}>
          {sibuk ? sibukTeks : ya}
        </button>
      </div>
    </DialogKaca>
  )
}

/** Banner galat/ok di dalam kartu (satu gaya untuk semua panel). */
export function Pesan({ jenis, children, onTutup }: { jenis: 'ok' | 'galat'; children: ReactNode; onTutup?: () => void }) {
  return (
    <div
      role={jenis === 'galat' ? 'alert' : 'status'}
      className={clsx(
        'vsf-banner mt-3 flex flex-wrap items-center gap-3 rounded-input border px-3 py-2 text-[13px]',
        jenis === 'galat' ? 'vsf-tone-error' : 'border-arutmin-moss/50 bg-arutmin-mint/40 text-arutmin-forest',
      )}
    >
      <Ikon nama={jenis === 'galat' ? 'peringatan' : 'ok'} className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1">{children}</span>
      {onTutup && (
        <button type="button" className="vsf-btn-secondary vsf-btn-kecil" onClick={onTutup}>
          Tutup
        </button>
      )}
    </div>
  )
}

/** Keadaan kosong (satu gaya untuk semua panel). */
export function Kosong({ children }: { children: ReactNode }) {
  return (
    <div className="mt-3 flex flex-col items-center gap-2 rounded-card bg-white/55 px-4 py-8 text-center text-[13px] text-tinta">
      <Ikon nama="kosong" className="h-8 w-8 text-arutmin-olive" />
      {children}
    </div>
  )
}

export function Rangka() {
  return (
    <div className="mt-3 grid gap-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="vsf-skeleton h-[56px] rounded-card" />
      ))}
    </div>
  )
}
