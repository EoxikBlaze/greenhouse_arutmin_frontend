import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import clsx from 'clsx'
import { Ikon } from '../Ikon'

/** Pilihan satu-dari-banyak bergaya kaca (pengganti <select> bawaan agar daftar bisa berujung bulat). */
export function Pilihan<T extends string>({
  label,
  nilai,
  opsi,
  onPilih,
}: {
  label: string
  nilai: T
  opsi: Array<{ nilai: T; teks: string }>
  onPilih: (v: T) => void
}) {
  const [buka, setBuka] = useState(false)
  const [aktif, setAktif] = useState(0)
  const kotak = useRef<HTMLDivElement>(null)
  const id = useId()
  const idx = Math.max(0, opsi.findIndex((o) => o.nilai === nilai))

  useEffect(() => {
    if (!buka) return
    const luar = (e: MouseEvent) => {
      if (!kotak.current?.contains(e.target as Node)) setBuka(false)
    }
    document.addEventListener('mousedown', luar)
    return () => document.removeEventListener('mousedown', luar)
  }, [buka])

  function pilih(i: number) {
    onPilih(opsi[i].nilai)
    setBuka(false)
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape' && buka) {
      e.stopPropagation() // jangan ikut menutup popup
      setBuka(false)
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const d = e.key === 'ArrowDown' ? 1 : -1
      if (!buka) {
        setAktif(idx)
        setBuka(true)
      } else setAktif((a) => (a + d + opsi.length) % opsi.length)
    } else if ((e.key === 'Enter' || e.key === ' ') && buka) {
      e.preventDefault()
      pilih(aktif)
    }
  }

  return (
    <div ref={kotak} className="relative" onKeyDown={onKey}>
      <button
        type="button"
        role="combobox"
        aria-label={label}
        aria-expanded={buka}
        aria-controls={id}
        className={clsx('vsf-input mt-1 flex w-full items-center justify-between gap-2 text-left', buka && '!rounded-b-none')}
        onClick={() => {
          setAktif(idx)
          setBuka((b) => !b)
        }}
      >
        <span className="min-w-0 truncate">{opsi[idx].teks}</span>
        <Ikon nama="bawah" className={clsx('h-4 w-4 shrink-0 transition-transform', buka && 'rotate-180')} />
      </button>
      {buka && (
        <ul
          id={id}
          role="listbox"
          className="absolute inset-x-0 top-full z-10 overflow-hidden rounded-b-[16px] border border-t-0 border-white/70 bg-white/95 py-1 shadow-[0_14px_30px_-16px_rgb(10_31_56/0.5)]"
        >
          {opsi.map((o, i) => (
            <li
              key={o.nilai}
              role="option"
              aria-selected={o.nilai === nilai}
              className={clsx(
                'cursor-pointer px-3 py-2 text-[13px] text-tinta',
                i === aktif && 'bg-arutmin-mint/50',
                o.nilai === nilai && 'font-bold',
              )}
              onMouseEnter={() => setAktif(i)}
              onClick={() => pilih(i)}
            >
              {o.teks}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
