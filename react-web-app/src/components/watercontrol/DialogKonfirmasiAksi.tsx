import { useDialog } from '../../lib/useDialog'
import { ModalBackdrop } from '../ModalBackdrop'

/** Konfirmasi sebelum Isi Air / Stop dikirim ke perangkat. */
export function DialogKonfirmasiAksi({
  aksi,
  onBatal,
  onYa,
}: {
  aksi: 'fill' | 'stop'
  onBatal: () => void
  onYa: () => void
}) {
  const { dialogRef, onKeyDown, backdropProps, closing, handleClose } = useDialog({ open: true, onClose: onBatal })
  const fill = aksi === 'fill'

  return (
    <ModalBackdrop onMouseDown={backdropProps.onMouseDown} closing={closing}>
      <div
        ref={dialogRef}
        onKeyDown={onKeyDown}
        role="dialog"
        aria-modal="true"
        aria-labelledby="vsf-aksi-air-title"
        className={`vsf-modal-card w-full max-w-[440px] rounded-lg border border-garis bg-white p-5${closing ? ' is-closing' : ''}`}
      >
        <div id="vsf-aksi-air-title" data-dialog-title tabIndex={-1} className="vsf-eyebrow outline-none">
          {fill ? 'Isi air sekarang?' : 'Hentikan pengisian air?'}
        </div>
        <p className="mt-3 text-[13px] text-slate-700 leading-relaxed">
          {fill
            ? 'Katup tandon akan dibuka dan air mulai mengalir sampai Anda menekan Stop.'
            : 'Katup tandon akan ditutup dan pengisian air berhenti.'}
        </p>
        <div className="mt-5 flex justify-end gap-2 border-t border-garis pt-4">
          <button type="button" className="vsf-btn-secondary" onClick={handleClose}>
            Batal
          </button>
          <button type="button" className="vsf-btn-primary" onClick={onYa}>
            {fill ? 'Ya, isi air' : 'Ya, hentikan'}
          </button>
        </div>
      </div>
    </ModalBackdrop>
  )
}
