import type { MouseEvent, ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * Backdrop modal di-PORTAL ke document.body (QW3/QW6).
 *
 * Tanpa portal, `position: fixed` ikut terkunci oleh leluhur yang punya
 * `transform` — `.vsf-page` memakai animasi fill `both` sehingga backdrop
 * hanya menutupi kotak konten, BUKAN seluruh viewport (klik di luar kotak
 * konten tak kena backdrop, dan z-index tertahan di bawah header/sidebar).
 */
export function ModalBackdrop({
  onMouseDown,
  children,
  closing,
}: {
  onMouseDown: (e: MouseEvent<HTMLDivElement>) => void
  children: ReactNode
  /** P3 — true saat animasi keluar 180ms (dari useDialog.closing). */
  closing?: boolean
}) {
  return createPortal(
    <div
      className={`fixed inset-0 z-50 grid place-items-center px-4 vsf-modal-backdrop${closing ? ' is-closing' : ''}`}
      onMouseDown={onMouseDown}
    >
      {children}
    </div>,
    document.body,
  )
}
