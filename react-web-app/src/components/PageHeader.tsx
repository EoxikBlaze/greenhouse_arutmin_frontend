import type { ReactNode } from 'react'

/**
 * Blok pembuka halaman (desain v2): satu bentuk untuk semua halaman —
 * eyebrow kecil, judul opsional (h2), penjelasan, dan aksi/status di kanan.
 * Kartu glass ringan (.vsf-card), padding 16 (HP) / 20 (desktop).
 */
export function PageHeader({
  eyebrow,
  judul,
  deskripsi,
  aksi,
}: {
  eyebrow?: string
  judul?: string
  deskripsi?: ReactNode
  aksi?: ReactNode
}) {
  return (
    <section className="vsf-card flex flex-wrap items-start justify-between gap-x-6 gap-y-3 p-4 sm:p-5">
      <div className="min-w-0 flex-1 basis-[280px]">
        {eyebrow && <div className="vsf-eyebrow">{eyebrow}</div>}
        {judul && <h2 className="font-display text-[20px] font-bold leading-tight text-tinta">{judul}</h2>}
        {deskripsi && <p className="mt-1.5 max-w-[68ch] text-[13px] leading-relaxed text-slate-600">{deskripsi}</p>}
      </div>
      {aksi && <div className="flex shrink-0 flex-wrap items-center gap-2">{aksi}</div>}
    </section>
  )
}
