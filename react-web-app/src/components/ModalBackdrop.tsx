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
}: {
  onMouseDown: (e: MouseEvent<HTMLDivElement>) => void
  children: ReactNode
}) {
  return createPortal(
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4 vsf-modal-backdrop"
      onMouseDown={onMouseDown}
    >
      {children}
    </div>,
    document.body,
  )
}
