import clsx from 'clsx'

export type StatusTone = 'online' | 'offline' | 'warning'

/**
 * Badge status — dot HIDUP (denyut via .vsf-dot) + shadow halus.
 * Warna mengikuti token: moss untuk sukses/aktif, merah untuk offline.
 */
export function StatusBadge({ tone, label }: { tone: StatusTone; label: string }) {
  const styles = {
    online: 'border-arutmin-moss bg-arutmin-mint/40 text-arutmin-forest',
    offline: 'vsf-tone-error',
    warning: 'vsf-tone-warn',
  }[tone]

  const dot = {
    online: 'bg-arutmin-moss shadow-[0_0_0_3px_rgba(107,157,74,.28)]',
    offline: 'bg-arutmin-error shadow-[0_0_0_3px_rgba(192,57,43,.22)]',
    warning: 'bg-arutmin-warning shadow-[0_0_0_3px_rgba(224,164,43,.25)]',
  }[tone]

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[12px] font-semibold leading-none shadow-[0_1px_2px_rgba(10,31,56,.10)]',
        styles,
      )}
    >
      <span aria-hidden className={clsx('vsf-dot h-[7px] w-[7px] rounded-full', dot)} />
      {label}
    </span>
  )
}
