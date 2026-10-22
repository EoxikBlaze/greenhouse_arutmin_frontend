import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Monogram } from '../layouts/AppShell'
import { useAuth } from '../lib/authContext'

/**
 * TENTANG KAMI (/tentang) — halaman publik, TANPA login (rute berdiri sendiri
 * di luar RequireAuth, seperti /login). Berisi 7 kartu peran tim proyek
 * Vertonik Smart Farm (GARAP — greenhouse hidroponik).
 * Nama anggota sengaja DIKOSONGKAN dengan placeholder '(nama)' — halaman ini
 * tidak mengarang nama orang.
 */

type Peran = {
  jabatan: string
  nama: string
  deskripsi: string
  ikon: ReactNode
}

/** Ikon garis minimalis (24×24, stroke currentColor) — senada monogram Vertonik. */
function Ikon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  )
}

const PERAN: Peran[] = [
  {
    jabatan: 'Project Manager',
    nama: 'Rivi Ramdani',
    deskripsi:
      'Memimpin arah proyek Vertonik Smart Farm: menyusun rencana kerja, membagi tugas, dan memastikan seluruh tim bergerak menuju tujuan yang sama.',
    ikon: <Ikon><path d="m12 3 2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.4 6.8 19.2l1-5.9L3.5 9.2l5.9-.8z" /></Ikon>,
  },
  {
    jabatan: 'Finance',
    nama: 'Nova Atika Angelia',
    deskripsi:
      'Mengelola anggaran proyek dan mencatat setiap pengeluaran — dari pengadaan sensor, perangkat IoT, sampai kebutuhan operasional greenhouse.',
    ikon: <Ikon><rect x="2.5" y="6" width="19" height="12" rx="2.5" /><circle cx="12" cy="12" r="2.6" /><path d="M6 10v4M18 10v4" /></Ikon>,
  },
  {
    jabatan: 'Secretary',
    nama: 'Putri Nadilatu Zahra',
    deskripsi:
      'Menata dokumentasi proyek, menyusun notulen rapat, dan menjaga komunikasi antaranggota tim tetap teratur dan mudah ditemukan.',
    ikon: <Ikon><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></Ikon>,
  },
  {
    jabatan: 'Creative & Public Relations',
    nama: '(nama)',
    deskripsi:
      'Merancang identitas visual dan kabar terbaru proyek, serta menjaga hubungan baik dengan pengguna dan mitra Vertonik Smart Farm.',
    ikon: <Ikon><path d="M4 10v4a1 1 0 0 0 1 1h2l6 4V5L7 9H5a1 1 0 0 0-1 1z" /><path d="M17.5 9.5a4 4 0 0 1 0 5" /></Ikon>,
  },
  {
    jabatan: 'Backend Engineering',
    nama: '(nama)',
    deskripsi:
      'Membangun dan merawat API GARAP beserta basis data greenhouse, agar data sensor dan budidaya tersimpan aman, konsisten, dan andal.',
    ikon: <Ikon><ellipse cx="12" cy="6" rx="7.5" ry="3" /><path d="M4.5 6v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V6" /><path d="M4.5 12v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6" /></Ikon>,
  },
  {
    jabatan: 'IoT Engineer',
    nama: '(nama)',
    deskripsi:
      'Merancang perangkat ESP32 dan rangkaian sensor hidroponik yang mengirim suhu, pH, dan TDS greenhouse secara real-time ke sistem.',
    ikon: <Ikon><rect x="7" y="7" width="10" height="10" rx="2" /><path d="M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4" /></Ikon>,
  },
  {
    jabatan: 'Web & Application Developer',
    nama: '(nama)',
    deskripsi:
      'Mengembangkan antarmuka web dan aplikasi yang membuat petani mudah memantau kondisi serta mengatur tanam dari mana saja.',
    ikon: <Ikon><rect x="2.5" y="4.5" width="19" height="13" rx="2" /><path d="M8 21h8M12 17.5V21" /><path d="m10 9-2 2 2 2M14 9l2 2-2 2" /></Ikon>,
  },
]

export function TentangPage() {
  const { isAuthenticated } = useAuth()

  return (
    <div className="min-h-dvh bg-sidebar text-white">
      {/* Header ringkas — monogram + identitas + pintu masuk aplikasi */}
      <header className="border-b border-white/10">
        <div className="mx-auto flex min-h-[64px] max-w-[1180px] flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-3" aria-label="Vertonik Smart Farm">
            <Monogram className="h-9 w-9 shrink-0" />
            <span className="min-w-0">
              <span className="block truncate font-display text-[16px] font-bold leading-tight text-white">
                Vertonik
              </span>
              <span className="vsf-eyebrow vsf-eyebrow-emas block truncate">Smart Farm</span>
            </span>
          </Link>
          <span className="flex-1" />
          <Link to={isAuthenticated ? '/dashboard' : '/login'} className="vsf-btn-secondary">
            {isAuthenticated ? 'Buka aplikasi' : 'Masuk'}
          </Link>
        </div>
      </header>

      <main className="vsf-page">
        {/* Hero — judul halaman + kalimat singkat tentang tim proyek */}
        <section className="mx-auto max-w-[1180px] px-4 pb-2 pt-9 sm:px-6 lg:pt-14">
          <div className="vsf-eyebrow vsf-eyebrow-emas">Tentang Kami</div>
          <h1 className="mt-3 max-w-[820px] font-display text-[28px] font-bold leading-[1.15] text-white sm:text-[38px]">
            Tim di Balik Vertonik Smart Farm
          </h1>
          <p className="mt-4 max-w-[760px] text-[15px] leading-relaxed text-white/75">
            Kami tim proyek GARAP yang merancang greenhouse hidroponik Vertonik — memadukan
            perangkat IoT, data sensor, dan aplikasi agar budidaya tanaman lebih mudah dipantau.
            Tujuh peran berikut bekerja bersama, dari perencanaan sampai aplikasi yang dipakai petani.
          </p>
        </section>

        {/* Grid 7 kartu peran — 1 kolom di 390px, 2–3 kolom di layar lebar */}
        <section className="mx-auto max-w-[1180px] px-4 py-7 sm:px-6" aria-labelledby="vsf-peran-title">
          <h2 id="vsf-peran-title" className="vsf-eyebrow vsf-eyebrow-light mb-4">
            Peran Tim
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 vsf-stagger">
            {PERAN.map((p) => (
              <article
                key={p.jabatan}
                className="group flex flex-col rounded-card border border-white/12 bg-white/[.06] p-5 transition-all duration-[150ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:border-emas/60 hover:bg-white/[.09]"
              >
                <div className="flex items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-std border border-emas/45 bg-emas/15 text-emas">
                    {p.ikon}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-[15px] font-bold leading-snug text-white">{p.jabatan}</h3>
                    <div className="vsf-eyebrow vsf-eyebrow-light mt-1">Peran tim</div>
                  </div>
                </div>

                <p className="mt-3 flex-1 text-[13.5px] leading-relaxed text-white/75">{p.deskripsi}</p>

                {/* Slot nama — sengaja kosong, diisi '(nama)' (tanpa mengarang nama) */}
                <div className="mt-4 flex items-center gap-2.5 border-t border-white/10 pt-3.5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-dashed border-white/35 text-white/60">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <circle cx="12" cy="8.5" r="3.5" />
                      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
                    </svg>
                  </span>
                  <span className="min-w-0">
                    <span className="vsf-eyebrow vsf-eyebrow-light block">Nama anggota</span>
                    <span className={`block truncate text-[13px] font-semibold text-white/85${p.nama === '(nama)' ? ' italic opacity-70' : ''}`}>{p.nama}</span>
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      {/* Footer kecil */}
      <footer className="mx-auto max-w-[1180px] px-4 pb-9 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-5 text-[12px] text-white/55">
          <span>Vertonik Smart Farm · 2026</span>
          <span>GARAP — greenhouse hidroponik</span>
        </div>
      </footer>
    </div>
  )
}

export default TentangPage
