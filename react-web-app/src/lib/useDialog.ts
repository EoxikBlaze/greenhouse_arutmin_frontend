import { useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent } from 'react'

/** Selektor elemen yang bisa difokus (focus trap). */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

type Opts = {
  /** Modal sedang terbuka. */
  open: boolean
  /** Tutup modal (Escape / klik backdrop). */
  onClose: () => void
  /** true → Escape & backdrop click DIABAIKAN (mis. saat submitting/deleting). */
  closeDisabled?: boolean
}

/**
 * Aksesibilitas modal (QW3):
 * - Saat buka: simpan pemicu (`document.activeElement`), fokus ke judul
 *   (elemen `[data-dialog-title]`, wajib `tabIndex={-1}`).
 * - Saat tutup (cleanup): kembalikan fokus ke pemicu.
 * - Keyboard: Escape menutup (diblokir bila `closeDisabled`), Tab terkunci
 *   berputar di dalam dialog (focus trap), Shift+Tab dari awal → akhir.
 *
 * Pakai: pasang `ref` + `onKeyDown` pada ELEMEN DIALOG (bukan backdrop),
 * dan `backdropProps.onMouseDown` pada backdrop.
 */
export function useDialog({ open, onClose, closeDisabled = false }: Opts) {
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    // Pemicu = elemen fokus saat ini (tombol yang membuka modal).
    triggerRef.current = (document.activeElement as HTMLElement) ?? null
    const t = window.setTimeout(() => {
      const dialog = dialogRef.current
      if (!dialog) return
      const title = dialog.querySelector<HTMLElement>('[data-dialog-title]')
      ;(title ?? dialog).focus()
    }, 0)
    return () => {
      window.clearTimeout(t)
      const trigger = triggerRef.current
      if (trigger && document.contains(trigger)) trigger.focus()
    }
  }, [open])

  function onKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      // Blokir Escape saat proses berjalan (submitting/deleting).
      if (!closeDisabled) {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
      return
    }
    if (e.key !== 'Tab') return
    const dialog = dialogRef.current
    if (!dialog) return
    const items = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE))
    if (items.length === 0) {
      e.preventDefault()
      return
    }
    const first = items[0]
    const last = items[items.length - 1]
    const active = document.activeElement as HTMLElement | null
    const inside = active !== null && dialog.contains(active)
    if (e.shiftKey) {
      if (!inside || active === first) {
        e.preventDefault()
        last.focus()
      }
    } else if (!inside || active === last) {
      e.preventDefault()
      first.focus()
    }
  }

  /** Klik tepat di backdrop (bukan kartu modal) → tutup. */
  const backdropProps = {
    onMouseDown: (e: ReactMouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget && !closeDisabled) onClose()
    },
  }

  return { dialogRef, onKeyDown, backdropProps }
}
