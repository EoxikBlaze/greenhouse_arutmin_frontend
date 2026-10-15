import clsx from 'clsx'

export type StatusTone = 'online' | 'offline' | 'warning'

export function StatusBadge({ tone, label }: { tone: StatusTone; label: string }) {
  const styles = {
    online: 'border-arutmin-moss bg-arutmin-mint/30 text-arutmin-forest',
    offline: 'border-red-600/50 bg-red-50 text-red-700',
    warning: 'border-amber-500/60 bg-amber-50 text-amber-800',
  }[tone]

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[12px] font-semibold',
        styles,
      )}
    >
      <span className="text-[10px] vsf-dot">●</span>
      {label}
    </span>
  )
}
