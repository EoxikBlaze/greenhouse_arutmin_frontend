import { type ReactNode } from 'react'

/**
 * FOOTER APLIKASI — 'About Us' + 7 kartu pendiri (bagian bawah tiap halaman
 * dalam AppShell). Nama 4 slot terakhir sengaja '(nama)' — placeholder sampai
 * pemilik data melengkapi; komponen ini TIDAK mengarang nama orang.
 */

type Pendiri = { nama: string; jabatan: string }

const PENDIRI: Pendiri[] = [
  { nama: 'Rivi Ramdani', jabatan: 'Project Manager' },
  { nama: 'Nova Atika Angelia', jabatan: 'Finance' },
  { nama: 'Putri Nadilatu Zahra', jabatan: 'Secretary' },
  { nama: '(nama)', jabatan: 'Creative & Public Relations' },
  { nama: '(nama)', jabatan: 'Backend Engineering' },
  { nama: '(nama)', jabatan: 'IoT Engineer' },
  { nama: '(nama)', jabatan: 'Web & Application Developer' },
]

function inisial(nama: string): ReactNode {
  if (nama === '(nama)') return '?'
  return nama.trim().charAt(0).toUpperCase()
}

export function FooterPendiri() {
  return (
    <footer
      aria-labelledby="vsf-about-title"
      className="mt-8 rounded-card bg-navy px-4 py-7 text-white sm:px-6"
    >
      <div className="mx-auto max-w-[1180px]">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2
            id="vsf-about-title"
            className="text-[15px] font-bold tracking-[0.14em] text-emas"
          >
            ABOUT US
          </h2>
          <p className="text-[13px] leading-relaxed text-white/75">
            Vertonik Smart Farm (GARAP) — sistem greenhouse hidroponik; dikembangkan oleh tim berikut.
          </p>
        </div>

        <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PENDIRI.map((p) => (
            <li
              key={p.jabatan}
              className="flex items-center gap-3 rounded-std border border-white/12 bg-white/[.06] px-3 py-2.5"
            >
              <span
                aria-hidden
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-emas/45 bg-emas/15 text-sm font-bold text-emas"
              >
                {inisial(p.nama)}
              </span>
              <span className="min-w-0">
                <span
                  className={`block truncate text-[13.5px] font-semibold text-white${
                    p.nama === '(nama)' ? ' italic opacity-70' : ''
                  }`}
                >
                  {p.nama}
                </span>
                <span className="block text-[11.5px] font-medium leading-snug text-emas">{p.jabatan}</span>
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-4 text-[12px] text-white/70">
          <span>© 2026 PT Arutmin Indonesia — Vertonik Smart Farm</span>
          <span className="text-white/60">7 pendiri · 1 tim</span>
        </div>
      </div>
    </footer>
  )
}
